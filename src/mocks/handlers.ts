import { delay, http, HttpResponse } from 'msw'
import { SETTLE_MS, transactionQuerySchema, transferRequestSchema, TRANSFER_FEES } from '@/api/schemas'
import type { ApiError, CashFlowPoint, Category, Paginated, Summary, Transaction } from '@/api/types'
import { DAY_MS, dayKey } from '@/lib/date'
import { getDb, resetDb, updateDb } from './db'
import type { Database } from './seed'

/** Simulated network latency + optional random failures (VITE_MOCK_ERROR_RATE=0.1). */
const ERROR_RATE = Number(import.meta.env.VITE_MOCK_ERROR_RATE ?? 0)

async function network() {
  await delay(Math.round(250 + Math.random() * 450))
  settleDueTransfers()
  if (Math.random() < ERROR_RATE) {
    return error(503, 'service_unavailable', 'The bank is temporarily unavailable. Please try again.')
  }
  return null
}

function error(status: number, code: string, message: string) {
  return HttpResponse.json<ApiError>({ code, message }, { status })
}

export const handlers = [
  http.get('*/api/accounts', async () => {
    const fail = await network()
    if (fail) return fail
    return HttpResponse.json(getDb().accounts)
  }),

  http.get('*/api/accounts/:id', async ({ params }) => {
    const fail = await network()
    if (fail) return fail
    const account = getDb().accounts.find((a) => a.id === params.id)
    return account ? HttpResponse.json(account) : error(404, 'not_found', 'Account not found')
  }),

  http.get('*/api/recipients', async () => {
    const fail = await network()
    if (fail) return fail
    return HttpResponse.json(getDb().recipients)
  }),

  http.get('*/api/transactions', async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const parsed = transactionQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return error(400, 'invalid_query', parsed.error.issues[0]?.message ?? 'Invalid query')
    const { q, accountId, category, status, direction, from, to, page, pageSize } = parsed.data

    const needle = q?.trim().toLowerCase()
    const rows = getDb().transactions.filter((tx) => {
      if (accountId && tx.accountId !== accountId) return false
      if (category && tx.category !== category) return false
      if (status && tx.status !== status) return false
      if (direction === 'in' && tx.amountCents <= 0) return false
      if (direction === 'out' && tx.amountCents >= 0) return false
      const day = dayKey(tx.date)
      if (from && day < from) return false
      if (to && day > to) return false
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

  http.get('*/api/transactions/:id', async ({ params }) => {
    const fail = await network()
    if (fail) return fail
    const tx = getDb().transactions.find((t) => t.id === params.id)
    return tx ? HttpResponse.json(tx) : error(404, 'not_found', 'Transaction not found')
  }),

  http.patch('*/api/transactions/:id', async ({ params, request }) => {
    const fail = await network()
    if (fail) return fail
    const body = (await request.json()) as { memo?: unknown }
    if (typeof body.memo !== 'string' || body.memo.length > 140) {
      return error(400, 'invalid_memo', 'Memo must be 140 characters or fewer')
    }
    let updated: Transaction | undefined
    updateDb((db) => {
      updated = db.transactions.find((t) => t.id === params.id)
      if (updated) updated.memo = body.memo as string
    })
    return updated ? HttpResponse.json(updated) : error(404, 'not_found', 'Transaction not found')
  }),

  http.get('*/api/summary', async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const days = Math.min(365, Math.max(7, Number(new URL(request.url).searchParams.get('days') ?? 30)))
    return HttpResponse.json(buildSummary(days))
  }),

  http.post('*/api/transfers', async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const parsed = transferRequestSchema.safeParse(await request.json())
    if (!parsed.success) return error(400, 'invalid_transfer', parsed.error.issues[0]?.message ?? 'Invalid transfer')
    const req = parsed.data
    const db = getDb()

    const from = db.accounts.find((a) => a.id === req.fromAccountId)
    if (!from) return error(404, 'not_found', 'Source account not found')
    const toAccount = req.toAccountId ? db.accounts.find((a) => a.id === req.toAccountId) : undefined
    const recipient = req.recipientId ? db.recipients.find((r) => r.id === req.recipientId) : undefined
    if (!toAccount && !recipient) return error(404, 'not_found', 'Destination not found')
    if (recipient && req.method === 'transfer') return error(400, 'invalid_method', 'Use ACH or wire for external recipients')
    if (toAccount && req.method !== 'transfer') return error(400, 'invalid_method', 'Internal transfers use the "transfer" method')

    const fee = TRANSFER_FEES[req.method]
    const available = from.balanceCents - from.pendingCents
    if (req.amountCents + fee > available) {
      return error(422, 'insufficient_funds', `Insufficient funds in ${from.name}. Available: $${(available / 100).toFixed(2)}`)
    }

    const now = new Date().toISOString()
    const id = `txn_${crypto.randomUUID().slice(0, 12)}`
    const outgoing: Transaction = {
      id,
      accountId: from.id,
      date: now,
      counterparty: toAccount ? `Transfer to ${toAccount.name} ••${toAccount.mask}` : recipient!.name,
      category: toAccount ? 'Transfer' : 'Contractors',
      amountCents: -req.amountCents,
      status: 'pending',
      method: req.method,
      memo: req.memo ?? '',
      timeline: [{ status: 'initiated', at: now }, { status: 'pending', at: now }],
    }

    updateDb((draft) => {
      draft.transactions.unshift(outgoing)
      const src = draft.accounts.find((a) => a.id === from.id)!
      src.pendingCents += req.amountCents
      // The "bank" settles it a few seconds later (see settleDueTransfers).
      draft.scheduled.push({ txId: id, amountCents: req.amountCents, feeCents: fee, toAccountId: toAccount?.id, settleAt: Date.now() + SETTLE_MS })
    })

    return HttpResponse.json(outgoing, { status: 201 })
  }),

  http.post('*/api/demo/reset', async () => {
    await delay(300)
    resetDb()
    return new HttpResponse(null, { status: 204 })
  }),
]

/** Posts any scheduled transfers whose settle time has passed. */
function settleDueTransfers() {
  const due = getDb().scheduled.filter((s) => s.settleAt <= Date.now())
  if (due.length === 0) return
  updateDb((db) => {
    db.scheduled = db.scheduled.filter((s) => s.settleAt > Date.now())
    for (const s of due) settleTransfer(db, s.txId, s.amountCents, s.feeCents, s.toAccountId)
  })
}

function settleTransfer(db: Database, id: string, amountCents: number, feeCents: number, toAccountId?: string) {
  const tx = db.transactions.find((t) => t.id === id)
  if (!tx || tx.status !== 'pending') return
  const postedAt = new Date().toISOString()
  tx.status = 'posted'
  tx.timeline.push({ status: 'posted', at: postedAt })

  const src = db.accounts.find((a) => a.id === tx.accountId)!
  src.pendingCents -= amountCents
  src.balanceCents -= amountCents + feeCents

  if (feeCents > 0) {
    db.transactions.unshift({
      id: `txn_${crypto.randomUUID().slice(0, 12)}`, accountId: src.id, date: postedAt, counterparty: 'Wire fee',
      category: 'Fees', amountCents: -feeCents, status: 'posted', method: 'ach', memo: `Fee for ${id}`,
      timeline: [{ status: 'posted', at: postedAt }],
    })
  }

  if (toAccountId) {
    const dest = db.accounts.find((a) => a.id === toAccountId)!
    dest.balanceCents += amountCents
    db.transactions.unshift({
      id: `txn_${crypto.randomUUID().slice(0, 12)}`, accountId: dest.id, date: postedAt,
      counterparty: `Transfer from ${src.name} ••${src.mask}`, category: 'Transfer', amountCents,
      status: 'posted', method: 'transfer', memo: tx.memo, timeline: [{ status: 'posted', at: postedAt }],
    })
  }
}

function buildSummary(periodDays: number): Summary {
  const { accounts, transactions } = getDb()
  const now = Date.now()
  const since = now - periodDays * DAY_MS
  const posted = transactions.filter((t) => t.status === 'posted')
  // Internal transfers move money between your own accounts — exclude them from in/out totals.
  const external = posted.filter((t) => t.category !== 'Transfer')
  const inPeriod = external.filter((t) => new Date(t.date).getTime() >= since)

  const totalCashCents = accounts.reduce((s, a) => s + a.balanceCents, 0)
  const moneyInCents = inPeriod.filter((t) => t.amountCents > 0).reduce((s, t) => s + t.amountCents, 0)
  const moneyOutCents = inPeriod.filter((t) => t.amountCents < 0).reduce((s, t) => s - t.amountCents, 0)

  // Walk backwards from today's balance to build the daily balance series.
  const netByDay = new Map<string, number>()
  for (const t of posted) {
    if (new Date(t.date).getTime() < since) continue
    const k = dayKey(t.date)
    netByDay.set(k, (netByDay.get(k) ?? 0) + t.amountCents)
  }
  const balanceSeries: Summary['balanceSeries'] = []
  const cashFlowSeries: Summary['cashFlowSeries'] = []
  type Flow = Omit<CashFlowPoint, 'date'>
  const emptyFlow = (): Flow => ({ inCents: 0, outCents: 0, inByCategory: {}, outByCategory: {} })
  const flowByDay = new Map<string, Flow>()
  for (const t of inPeriod) {
    const k = dayKey(t.date)
    const f = flowByDay.get(k) ?? emptyFlow()
    if (t.amountCents > 0) {
      f.inCents += t.amountCents
      f.inByCategory[t.category] = (f.inByCategory[t.category] ?? 0) + t.amountCents
    } else {
      f.outCents -= t.amountCents
      f.outByCategory[t.category] = (f.outByCategory[t.category] ?? 0) - t.amountCents
    }
    flowByDay.set(k, f)
  }
  let running = totalCashCents
  for (let i = 0; i <= periodDays; i++) {
    const k = dayKey(new Date(now - i * DAY_MS))
    balanceSeries.push({ date: k, balanceCents: running })
    cashFlowSeries.push({ date: k, ...(flowByDay.get(k) ?? emptyFlow()) })
    running -= netByDay.get(k) ?? 0
  }
  balanceSeries.reverse()
  cashFlowSeries.reverse()

  const startBalance = balanceSeries[0]?.balanceCents ?? totalCashCents

  const spend = new Map<Category, number>()
  for (const t of inPeriod) {
    if (t.amountCents < 0) spend.set(t.category, (spend.get(t.category) ?? 0) + -t.amountCents)
  }

  return {
    periodDays,
    totalCashCents,
    cashChangeCents: totalCashCents - startBalance,
    moneyInCents,
    moneyOutCents,
    balanceSeries,
    cashFlowSeries,
    spendByCategory: [...spend.entries()].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents),
  }
}
