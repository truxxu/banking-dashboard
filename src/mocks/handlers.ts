import { delay, http, HttpResponse, type HttpResponseResolver } from 'msw'
import type { z } from 'zod'
import {
  available,
  METHOD_LABEL,
  paymentRequestSchema,
  REQUEST_PAY_MS,
  SETTLE_MS,
  totalDebit,
  transactionQuerySchema,
  transferRequestSchema,
  TRANSFER_FEES,
  updateMemoSchema,
} from '@/api/schemas'
import type { ApiError, CashFlowPoint, Paginated, PaymentRequest, Summary, Transaction } from '@/api/types'
import { accountLabel } from '@/lib/account'
import { dayKey } from '@/lib/date'
import { formatMoney } from '@/lib/money'
import { getDb, resetDb, updateDb } from './db'
import type { Database } from './types'

/** Simulated network latency + optional random failures (VITE_MOCK_ERROR_RATE=0.1). */
const ERROR_RATE = Number(import.meta.env.VITE_MOCK_ERROR_RATE ?? 0)

async function network() {
  await delay(Math.round(250 + Math.random() * 450))
  processScheduled()
  if (Math.random() < ERROR_RATE) {
    return error(503, 'service_unavailable', 'The bank is temporarily unavailable. Please try again.')
  }
  return null
}

/** Wraps a resolver with simulated latency, scheduled-job processing and random failures. */
const withNetwork =
  (resolver: HttpResponseResolver): HttpResponseResolver =>
  async (info) =>
    (await network()) ?? resolver(info)

function error(status: number, code: string, message: string) {
  return HttpResponse.json<ApiError>({ code, message }, { status })
}

const badRequest = (code: string, err: z.ZodError, fallback: string) => error(400, code, err.issues[0]?.message ?? fallback)

const newTxId = () => `txn_${crypto.randomUUID().slice(0, 12)}`
const pendingTimeline = (at: string): Transaction['timeline'] => [{ status: 'initiated', at }, { status: 'pending', at }]

function postTx(tx: Transaction, at: string) {
  tx.status = 'posted'
  tx.timeline.push({ status: 'posted', at })
}

export const handlers = [
  http.get('*/api/accounts', withNetwork(() => HttpResponse.json(getDb().accounts))),

  http.get('*/api/recipients', withNetwork(() => HttpResponse.json(getDb().recipients))),

  http.get(
    '*/api/transactions',
    withNetwork(({ request }) => {
      const parsed = transactionQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
      if (!parsed.success) return badRequest('invalid_query', parsed.error, 'Invalid query')
      const { q, accountId, category, status, direction, from, to, page, pageSize } = parsed.data

      const needle = q?.trim().toLowerCase()
      const rows = getDb().transactions.filter((tx) => {
        if (accountId && tx.accountId !== accountId) return false
        if (category && tx.category !== category) return false
        if (status && tx.status !== status) return false
        if (direction === 'in' && tx.amountCents <= 0) return false
        if (direction === 'out' && tx.amountCents >= 0) return false
        if (from || to) {
          const day = dayKey(tx.date)
          if (from && day < from) return false
          if (to && day > to) return false
        }
        if (needle && !`${tx.counterparty} ${tx.memo}`.toLowerCase().includes(needle)) return false
        return true
      })

      const body: Paginated<Transaction> = {
        items: rows.slice((page - 1) * pageSize, page * pageSize),
        total: rows.length,
        page,
        pageSize,
      }
      return HttpResponse.json(body)
    }),
  ),

  http.get(
    '*/api/transactions/:id',
    withNetwork(({ params }) => {
      const tx = getDb().transactions.find((t) => t.id === params.id)
      return tx ? HttpResponse.json(tx) : error(404, 'not_found', 'Transaction not found')
    }),
  ),

  http.patch(
    '*/api/transactions/:id',
    withNetwork(async ({ params, request }) => {
      const parsed = updateMemoSchema.safeParse(await request.json())
      if (!parsed.success) return badRequest('invalid_memo', parsed.error, 'Invalid memo')
      const updated = updateDb((db) => {
        const tx = db.transactions.find((t) => t.id === params.id)
        if (tx) tx.memo = parsed.data.memo
        return tx
      })
      return updated ? HttpResponse.json(updated) : error(404, 'not_found', 'Transaction not found')
    }),
  ),

  http.get(
    '*/api/summary',
    withNetwork(({ request }) => {
      const days = Math.min(365, Math.max(7, Number(new URL(request.url).searchParams.get('days') ?? 30)))
      return HttpResponse.json(buildSummary(days))
    }),
  ),

  http.post(
    '*/api/transfers',
    withNetwork(async ({ request }) => {
      const parsed = transferRequestSchema.safeParse(await request.json())
      if (!parsed.success) return badRequest('invalid_transfer', parsed.error, 'Invalid transfer')
      const req = parsed.data
      const db = getDb()

      const from = db.accounts.find((a) => a.id === req.fromAccountId)
      if (!from) return error(404, 'not_found', 'Source account not found')
      const toAccount = req.toAccountId ? db.accounts.find((a) => a.id === req.toAccountId) : undefined
      const recipient = req.recipientId ? db.recipients.find((r) => r.id === req.recipientId) : undefined
      if (!toAccount && !recipient) return error(404, 'not_found', 'Destination not found')
      if (recipient && !recipient.methods.includes(req.method as (typeof recipient.methods)[number])) {
        return error(400, 'invalid_method', `${recipient.name} doesn't accept ${METHOD_LABEL[req.method]} payments`)
      }
      if (toAccount && req.method !== 'transfer') return error(400, 'invalid_method', 'Internal transfers use the "transfer" method')

      const debit = totalDebit(req.amountCents, req.method)
      if (debit > available(from)) {
        return error(422, 'insufficient_funds', `Insufficient funds in ${from.name}. Available: ${formatMoney(available(from))}`)
      }

      const now = new Date().toISOString()
      const outgoing: Transaction = {
        id: newTxId(),
        accountId: from.id,
        date: now,
        counterparty: toAccount ? `Transfer to ${accountLabel(toAccount)}` : recipient!.name,
        category: toAccount ? 'Transfer' : 'Contractors',
        amountCents: -req.amountCents,
        status: 'pending',
        method: req.method,
        memo: req.memo ?? '',
        timeline: pendingTimeline(now),
      }

      updateDb((db) => {
        db.transactions.unshift(outgoing)
        from.pendingCents += debit // hold the fee too, so available() isn't overstated
        // The "bank" settles it a few seconds later (see processScheduled).
        db.scheduled.push({
          kind: 'transfer',
          txId: outgoing.id,
          amountCents: req.amountCents,
          feeCents: TRANSFER_FEES[req.method],
          toAccountId: toAccount?.id,
          settleAt: Date.now() + SETTLE_MS,
        })
      })

      return HttpResponse.json(outgoing, { status: 201 })
    }),
  ),

  http.get('*/api/customers', withNetwork(() => HttpResponse.json(getDb().customers))),

  http.get(
    '*/api/payment-requests',
    withNetwork(() => HttpResponse.json([...getDb().requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))),
  ),

  http.post(
    '*/api/payment-requests',
    withNetwork(async ({ request }) => {
      const parsed = paymentRequestSchema.safeParse(await request.json())
      if (!parsed.success) return badRequest('invalid_request', parsed.error, 'Invalid payment request')
      const req = parsed.data
      if (!getDb().accounts.some((a) => a.id === req.toAccountId)) return error(404, 'not_found', 'Deposit account not found')

      const created: PaymentRequest = { id: `req_${crypto.randomUUID().slice(0, 10)}`, ...req, status: 'open', createdAt: new Date().toISOString() }
      updateDb((db) => {
        db.requests.unshift(created)
        // The mock customer pays a few seconds later (see processScheduled).
        db.scheduled.push({ kind: 'request', requestId: created.id, settleAt: Date.now() + REQUEST_PAY_MS })
      })
      return HttpResponse.json(created, { status: 201 })
    }),
  ),

  http.post(
    '*/api/payment-requests/:id/cancel',
    withNetwork(({ params }) => {
      const existing = getDb().requests.find((r) => r.id === params.id)
      if (!existing) return error(404, 'not_found', 'Payment request not found')
      if (existing.status !== 'open') return error(409, 'not_open', `This request is already ${existing.status}`)
      updateDb((db) => {
        existing.status = 'cancelled'
        db.scheduled = db.scheduled.filter((s) => !(s.kind === 'request' && s.requestId === existing.id))
      })
      return HttpResponse.json(existing)
    }),
  ),

  http.post('*/api/demo/reset', async () => {
    await delay(300)
    await resetDb()
    return new HttpResponse(null, { status: 204 })
  }),
]

/** Runs any scheduled jobs (transfers posting, customers paying, deposits posting) whose time has passed. */
function processScheduled() {
  const now = Date.now()
  const due = getDb().scheduled.filter((s) => s.settleAt <= now)
  if (due.length === 0) return
  updateDb((db) => {
    db.scheduled = db.scheduled.filter((s) => s.settleAt > now)
    for (const s of due) {
      if (s.kind === 'transfer') settleTransfer(db, s.txId, s.amountCents, s.feeCents, s.toAccountId)
      else if (s.kind === 'request') payRequest(db, s.requestId)
      else postDeposit(db, s.txId)
    }
  })
}

/** The payer pays: the request is marked paid and a pending deposit appears, posting SETTLE_MS later. */
function payRequest(db: Database, requestId: string) {
  const req = db.requests.find((r) => r.id === requestId)
  if (!req || req.status !== 'open') return
  const at = new Date().toISOString()
  const txId = newTxId()
  db.transactions.unshift({
    id: txId, accountId: req.toAccountId, date: at, counterparty: req.payerName, category: 'Revenue',
    amountCents: req.amountCents, status: 'pending', method: req.method, memo: req.memo || `Payment request ${req.id}`,
    timeline: pendingTimeline(at),
  })
  req.status = 'paid'
  req.paidAt = at
  req.transactionId = txId
  db.scheduled.push({ kind: 'deposit', txId, settleAt: Date.now() + SETTLE_MS })
}

/** Incoming funds post and credit the account. (pendingCents only tracks outgoing holds.) */
function postDeposit(db: Database, txId: string) {
  const tx = db.transactions.find((t) => t.id === txId)
  if (!tx || tx.status !== 'pending') return
  postTx(tx, new Date().toISOString())
  db.accounts.find((a) => a.id === tx.accountId)!.balanceCents += tx.amountCents
}

function settleTransfer(db: Database, id: string, amountCents: number, feeCents: number, toAccountId?: string) {
  const tx = db.transactions.find((t) => t.id === id)
  if (!tx || tx.status !== 'pending') return
  const postedAt = new Date().toISOString()
  postTx(tx, postedAt)

  const src = db.accounts.find((a) => a.id === tx.accountId)!
  src.pendingCents -= amountCents + feeCents
  src.balanceCents -= amountCents + feeCents

  if (feeCents > 0) {
    db.transactions.unshift({
      id: newTxId(), accountId: src.id, date: postedAt, counterparty: 'Wire fee',
      category: 'Fees', amountCents: -feeCents, status: 'posted', method: 'ach', memo: `Fee for ${id}`,
      timeline: [{ status: 'posted', at: postedAt }],
    })
  }

  if (toAccountId) {
    const dest = db.accounts.find((a) => a.id === toAccountId)!
    dest.balanceCents += amountCents
    db.transactions.unshift({
      id: newTxId(), accountId: dest.id, date: postedAt,
      counterparty: `Transfer from ${accountLabel(src)}`, category: 'Transfer', amountCents,
      status: 'posted', method: 'transfer', memo: tx.memo, timeline: [{ status: 'posted', at: postedAt }],
    })
  }
}

function buildSummary(periodDays: number): Summary {
  const { accounts, transactions } = getDb()
  // Calendar days (not fixed 24h steps) so DST changes never skip or repeat a day.
  const today = new Date()
  const dayOffset = (i: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
  // Start of the first series day, so totals cover exactly the days the series (and its links) show.
  const since = dayOffset(periodDays).getTime()
  const totalCashCents = accounts.reduce((s, a) => s + a.balanceCents, 0)

  type Flow = Omit<CashFlowPoint, 'date'>
  const emptyFlow = (): Flow => ({ inByCategory: {}, outByCategory: {} })
  const netByDay = new Map<string, number>()
  const flowByDay = new Map<string, Flow>()
  let moneyInCents = 0
  let moneyOutCents = 0

  // One pass over the period. The ledger is kept newest-first (seeded sorted; new rows are unshifted).
  for (const t of transactions) {
    const date = new Date(t.date)
    if (date.getTime() < since) break
    if (t.status !== 'posted') continue
    const k = dayKey(date)
    netByDay.set(k, (netByDay.get(k) ?? 0) + t.amountCents)
    // Internal transfers move money between your own accounts — exclude them from in/out totals.
    if (t.category === 'Transfer') continue
    let f = flowByDay.get(k)
    if (!f) flowByDay.set(k, (f = emptyFlow()))
    if (t.amountCents > 0) {
      moneyInCents += t.amountCents
      f.inByCategory[t.category] = (f.inByCategory[t.category] ?? 0) + t.amountCents
    } else if (t.amountCents < 0) {
      moneyOutCents -= t.amountCents
      f.outByCategory[t.category] = (f.outByCategory[t.category] ?? 0) - t.amountCents
    }
  }

  // Walk backwards from today's balance to build the daily balance series.
  const balanceSeries: Summary['balanceSeries'] = []
  const cashFlowSeries: Summary['cashFlowSeries'] = []
  let running = totalCashCents
  for (let i = 0; i <= periodDays; i++) {
    const k = dayKey(dayOffset(i))
    balanceSeries.push({ date: k, balanceCents: running })
    cashFlowSeries.push({ date: k, ...(flowByDay.get(k) ?? emptyFlow()) })
    running -= netByDay.get(k) ?? 0
  }
  balanceSeries.reverse()
  cashFlowSeries.reverse()

  const startBalance = balanceSeries[0]?.balanceCents ?? totalCashCents
  return {
    totalCashCents,
    cashChangeCents: totalCashCents - startBalance,
    moneyInCents,
    moneyOutCents,
    balanceSeries,
    cashFlowSeries,
  }
}
