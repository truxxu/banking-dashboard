import { faker } from '@faker-js/faker/locale/en'
import type { Account, Category, Customer, PaymentRequest, Recipient, Transaction, TransactionMethod } from '@/api/types'
import { DAY_MS, dayKey } from '@/lib/date'

export interface Database {
  version: number
  accounts: Account[]
  transactions: Transaction[]
  recipients: Recipient[]
  /** Saved payers, for quick-picking on a payment request. */
  customers: Customer[]
  requests: PaymentRequest[]
  /** Work the mock bank does later; processed lazily on the next API request. */
  scheduled: ScheduledJob[]
}

export type ScheduledJob =
  /** An outgoing transfer posts (debits the source, credits an internal destination). */
  | { kind: 'transfer'; txId: string; amountCents: number; feeCents: number; toAccountId?: string; settleAt: number }
  /** The payer pays an open payment request, creating a pending incoming transaction. */
  | { kind: 'request'; requestId: string; settleAt: number }
  /** A pending incoming transaction posts and credits its account. */
  | { kind: 'deposit'; txId: string; settleAt: number }

/** Bump when the seed shape changes so stale localStorage data is discarded. */
export const DB_VERSION = 2
const SEED = 20261106
const MONTHS = 12

const VENDORS: Record<Exclude<Category, 'Revenue' | 'Transfer' | 'Interest' | 'Fees'>, { names: string[]; range: [number, number]; method: TransactionMethod }> = {
  Payroll: { names: ['Gusto Payroll'], range: [0, 0], method: 'ach' },
  Rent: { names: ['WeWork'], range: [0, 0], method: 'ach' },
  Software: { names: ['AWS', 'Google Workspace', 'GitHub', 'Figma', 'Linear', 'Notion', 'Vercel', 'Datadog'], range: [40_00, 4_800_00], method: 'card' },
  Advertising: { names: ['Google Ads', 'Meta Ads', 'LinkedIn Ads'], range: [500_00, 9_000_00], method: 'card' },
  Travel: { names: ['Delta Air Lines', 'United Airlines', 'Airbnb', 'Uber', 'Marriott'], range: [25_00, 2_400_00], method: 'card' },
  Meals: { names: ['Sweetgreen', 'DoorDash', 'Blue Bottle Coffee', 'Starbucks'], range: [8_00, 320_00], method: 'card' },
  Contractors: { names: [], range: [2_000_00, 14_000_00], method: 'ach' },
  Taxes: { names: ['IRS — EFTPS', 'CA Franchise Tax Board'], range: [3_000_00, 22_000_00], method: 'ach' },
  Office: { names: ['Amazon Business', 'Staples', 'Apple Store'], range: [30_00, 3_500_00], method: 'card' },
}

const cents = (min: number, max: number) => faker.number.int({ min, max })

function makeTx(partial: Omit<Transaction, 'id' | 'timeline' | 'memo' | 'status'> & Partial<Pick<Transaction, 'status' | 'memo'>>): Transaction {
  const status = partial.status ?? 'posted'
  const initiated = new Date(new Date(partial.date).getTime() - faker.number.int({ min: 1, max: 36 }) * 3_600_000)
  const timeline: Transaction['timeline'] = [{ status: 'initiated', at: initiated.toISOString() }]
  if (status !== 'pending') timeline.push({ status: 'pending', at: initiated.toISOString() })
  timeline.push({ status, at: partial.date })
  return { id: `txn_${faker.string.alphanumeric(12)}`, memo: '', ...partial, status, timeline }
}

export function createSeedDatabase(now = new Date()): Database {
  faker.seed(SEED)

  const routingNumber = faker.finance.routingNumber()
  const account = (id: string, name: string, type: Account['type'], mask: string): Account => ({
    id, name, type, mask, balanceCents: 0, pendingCents: 0, currency: 'USD',
    routingNumber, accountNumber: `${faker.string.numeric({ length: 8, allowLeadingZeros: false })}${mask}`,
  })
  const accounts: Account[] = [
    account('acc_operating', 'Operating', 'checking', '4821'),
    account('acc_payroll', 'Payroll', 'checking', '7710'),
    account('acc_savings', 'Reserve', 'savings', '3394'),
    account('acc_treasury', 'Treasury', 'treasury', '9052'),
  ]
  const opening: Record<string, number> = {
    acc_operating: 1_150_000_00,
    acc_payroll: 180_000_00,
    acc_savings: 400_000_00,
    acc_treasury: 1_600_000_00,
  }

  const customerNames = Array.from({ length: 14 }, () => faker.company.name())
  const contractors = Array.from({ length: 5 }, () => faker.person.fullName())
  VENDORS.Contractors.names = contractors
  const cardLast4 = ['1029', '5567', '8843']

  const txs: Transaction[] = []
  const start = new Date(now.getFullYear(), now.getMonth() - MONTHS, now.getDate())
  const at = (d: Date, hour = faker.number.int({ min: 8, max: 19 })) => {
    const copy = new Date(d)
    copy.setHours(hour, faker.number.int({ min: 0, max: 59 }), 0, 0)
    return copy.toISOString()
  }

  for (let t = start.getTime(); t <= now.getTime(); t += DAY_MS) {
    const day = new Date(t)
    const dom = day.getDate()
    const weekday = day.getDay()
    const isWeekday = weekday > 0 && weekday < 6
    const monthIndex = (day.getFullYear() - start.getFullYear()) * 12 + day.getMonth() - start.getMonth()
    const growth = 1 + monthIndex * 0.03 // revenue grows ~3%/month — still burning, but improving

    // Revenue: a few customer payments most weekdays
    if (isWeekday) {
      const n = faker.number.int({ min: 0, max: 3 })
      for (let i = 0; i < n; i++) {
        txs.push(makeTx({
          accountId: 'acc_operating', date: at(day), counterparty: faker.helpers.arrayElement(customerNames),
          category: 'Revenue', amountCents: Math.round(cents(1_000_00, 12_000_00) * growth), method: faker.helpers.arrayElement(['ach', 'wire'] as const),
          memo: `Invoice INV-${faker.number.int({ min: 1000, max: 9999 })}`,
        }))
      }
    }

    // Payroll: 1st and 15th, funded from Operating → Payroll the day before
    if (dom === 1 || dom === 15) {
      const amount = Math.round(cents(118_000_00, 124_000_00) * (1 + monthIndex * 0.015))
      txs.push(makeTx({ accountId: 'acc_operating', date: at(new Date(t - DAY_MS), 10), counterparty: 'Transfer to Payroll ••7710', category: 'Transfer', amountCents: -amount, method: 'transfer' }))
      txs.push(makeTx({ accountId: 'acc_payroll', date: at(new Date(t - DAY_MS), 10), counterparty: 'Transfer from Operating ••4821', category: 'Transfer', amountCents: amount, method: 'transfer' }))
      txs.push(makeTx({ accountId: 'acc_payroll', date: at(day, 9), counterparty: 'Gusto Payroll', category: 'Payroll', amountCents: -amount, method: 'ach', memo: 'Semi-monthly payroll' }))
    }

    // Quarterly sweep from Treasury to keep Operating funded
    if (dom === 10 && monthIndex % 3 === 0) {
      const amount = 300_000_00
      txs.push(makeTx({ accountId: 'acc_treasury', date: at(day, 11), counterparty: 'Transfer to Operating ••4821', category: 'Transfer', amountCents: -amount, method: 'transfer', memo: 'Quarterly sweep' }))
      txs.push(makeTx({ accountId: 'acc_operating', date: at(day, 11), counterparty: 'Transfer from Treasury ••9052', category: 'Transfer', amountCents: amount, method: 'transfer', memo: 'Quarterly sweep' }))
    }

    if (dom === 1) {
      txs.push(makeTx({ accountId: 'acc_operating', date: at(day, 7), counterparty: 'WeWork', category: 'Rent', amountCents: -18_500_00, method: 'ach', memo: 'Monthly membership' }))
      txs.push(makeTx({ accountId: 'acc_treasury', date: at(day, 6), counterparty: 'Treasury yield', category: 'Interest', amountCents: cents(6_800_00, 7_600_00), method: 'ach' }))
      txs.push(makeTx({ accountId: 'acc_savings', date: at(day, 6), counterparty: 'Interest earned', category: 'Interest', amountCents: cents(1_200_00, 1_500_00), method: 'ach' }))
    }

    // Quarterly estimated taxes
    if (dom === 15 && [0, 3, 5, 8].includes(day.getMonth())) {
      const v = VENDORS.Taxes
      txs.push(makeTx({ accountId: 'acc_operating', date: at(day), counterparty: v.names[0], category: 'Taxes', amountCents: -cents(...v.range), method: v.method }))
    }

    // Contractors: monthly on the 5th
    if (dom === 5) {
      for (const name of faker.helpers.arrayElements(contractors, { min: 2, max: 4 })) {
        txs.push(makeTx({ accountId: 'acc_operating', date: at(day), counterparty: name, category: 'Contractors', amountCents: -cents(...VENDORS.Contractors.range), method: 'ach', memo: 'Monthly retainer' }))
      }
    }

    // Day-to-day card spend
    const spendCats = ['Software', 'Advertising', 'Travel', 'Meals', 'Office'] as const
    const n = faker.number.int({ min: 0, max: isWeekday ? 3 : 1 })
    for (let i = 0; i < n; i++) {
      const cat = faker.helpers.weightedArrayElement(spendCats.map((c, idx) => ({ value: c, weight: [5, 2, 2, 4, 1][idx] })))
      const v = VENDORS[cat]
      txs.push(makeTx({
        accountId: 'acc_operating', date: at(day), counterparty: faker.helpers.arrayElement(v.names), category: cat,
        amountCents: -cents(...v.range), method: 'card', cardLast4: faker.helpers.arrayElement(cardLast4),
        status: faker.datatype.boolean(0.01) ? 'failed' : 'posted',
      }))
    }
  }

  // Anything in the last 2 days that is still "settling" becomes pending.
  for (const tx of txs) {
    if (now.getTime() - new Date(tx.date).getTime() < 2 * DAY_MS && tx.status === 'posted' && faker.datatype.boolean(0.5)) {
      tx.status = 'pending'
      tx.timeline = tx.timeline.slice(0, 1).concat({ status: 'pending', at: tx.date })
    }
  }

  txs.sort((a, b) => b.date.localeCompare(a.date))

  for (const acc of accounts) {
    const mine = txs.filter((tx) => tx.accountId === acc.id && tx.status !== 'failed')
    acc.balanceCents = opening[acc.id] + mine.filter((tx) => tx.status === 'posted').reduce((s, tx) => s + tx.amountCents, 0)
    acc.pendingCents = mine.filter((tx) => tx.status === 'pending' && tx.amountCents < 0).reduce((s, tx) => s - tx.amountCents, 0)
  }

  const recipients: Recipient[] = [
    ...contractors.map((name) => ({ id: `rcp_${faker.string.alphanumeric(8)}`, name, bankName: faker.helpers.arrayElement(['Chase', 'Bank of America', 'Wells Fargo', 'Citi']), mask: faker.string.numeric(4), methods: ['ach', 'wire'] as Recipient['methods'] })),
    { id: 'rcp_wework', name: 'WeWork', bankName: 'JPMorgan Chase', mask: '0042', methods: ['ach', 'wire'] },
    { id: 'rcp_irs', name: 'IRS — EFTPS', bankName: 'U.S. Treasury', mask: '1040', methods: ['ach'] },
  ]

  const customers: Customer[] = customerNames.map((name) => ({
    id: `cus_${faker.string.alphanumeric(8)}`,
    name,
    email: `billing@${faker.internet.domainWord()}.com`,
  }))
  const emailFor = (name: string) => customers.find((c) => c.name === name)?.email ?? 'billing@example.com'

  // Recent revenue that arrived via a payment request, so the books stay consistent.
  const paid: PaymentRequest[] = txs
    .filter((tx) => tx.category === 'Revenue' && tx.status === 'posted')
    .slice(0, 4)
    .map((tx) => {
      const created = new Date(new Date(tx.date).getTime() - faker.number.int({ min: 3, max: 12 }) * DAY_MS)
      return {
        id: `req_${faker.string.alphanumeric(10)}`, toAccountId: tx.accountId, payerName: tx.counterparty, payerEmail: emailFor(tx.counterparty),
        amountCents: tx.amountCents, method: tx.method as PaymentRequest['method'], dueDate: dayKey(new Date(created.getTime() + 14 * DAY_MS)),
        memo: tx.memo, status: 'paid', createdAt: created.toISOString(), paidAt: tx.date, transactionId: tx.id,
      }
    })
  // Outstanding requests that the mock customers haven't paid yet (they never auto-pay).
  const open: PaymentRequest[] = faker.helpers.arrayElements(customers, 2).map((c, i) => {
    const created = new Date(now.getTime() - (i + 2) * DAY_MS)
    return {
      id: `req_${faker.string.alphanumeric(10)}`, toAccountId: 'acc_operating', payerName: c.name, payerEmail: c.email,
      amountCents: cents(2_500_00, 18_000_00), method: 'ach', dueDate: dayKey(new Date(created.getTime() + (i + 1) * 14 * DAY_MS)),
      memo: `Invoice INV-${faker.number.int({ min: 1000, max: 9999 })}`, status: 'open', createdAt: created.toISOString(),
    }
  })
  const requests = [...open, ...paid].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return { version: DB_VERSION, accounts, transactions: txs, recipients, customers, requests, scheduled: [] }
}
