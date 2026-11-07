import type { Cents } from '@/lib/money'

export type AccountType = 'checking' | 'savings' | 'treasury'

export interface Account {
  id: string
  name: string
  type: AccountType
  /** Last four digits shown in the UI, e.g. "4821". */
  mask: string
  balanceCents: Cents
  /** Funds held by pending outgoing transactions. */
  pendingCents: Cents
  currency: 'USD'
  /** ABA routing number, shared for ACH and wires. */
  routingNumber: string
  /** Full account number; ends in `mask`. */
  accountNumber: string
}

export const TRANSACTION_STATUSES = ['pending', 'posted', 'failed'] as const
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number]
export type TransactionMethod = 'ach' | 'wire' | 'card' | 'transfer'

export const CATEGORIES = [
  'Revenue',
  'Payroll',
  'Rent',
  'Software',
  'Advertising',
  'Travel',
  'Meals',
  'Contractors',
  'Taxes',
  'Office',
  'Interest',
  'Transfer',
  'Fees',
] as const
export type Category = (typeof CATEGORIES)[number]

export interface Transaction {
  id: string
  accountId: string
  /** ISO timestamp. */
  date: string
  counterparty: string
  category: Category
  /** Signed: positive = money in, negative = money out. */
  amountCents: Cents
  status: TransactionStatus
  method: TransactionMethod
  memo: string
  /** Status history for the detail drawer timeline. */
  timeline: { status: 'initiated' | TransactionStatus; at: string }[]
  /** Card transactions only. */
  cardLast4?: string
}

export interface Recipient {
  id: string
  name: string
  bankName: string
  mask: string
  /** Methods this recipient can receive. */
  methods: Exclude<TransactionMethod, 'card' | 'transfer'>[]
}

export interface Customer {
  id: string
  name: string
  email: string
}

export type PaymentRequestStatus = 'open' | 'paid' | 'cancelled'

export interface PaymentRequest {
  id: string
  /** Account the payment will be deposited into. */
  toAccountId: string
  payerName: string
  payerEmail: string
  amountCents: Cents
  method: 'ach' | 'wire'
  /** YYYY-MM-DD day key. */
  dueDate: string
  memo: string
  status: PaymentRequestStatus
  /** ISO timestamp. */
  createdAt: string
  paidAt?: string
  /** The incoming transaction, once the payer has paid. */
  transactionId?: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface CashFlowPoint {
  /** YYYY-MM-DD day key. */
  date: string
  inByCategory: Partial<Record<Category, Cents>>
  outByCategory: Partial<Record<Category, Cents>>
}

export interface Summary {
  totalCashCents: Cents
  /** Change in total cash over the period. */
  cashChangeCents: Cents
  moneyInCents: Cents
  moneyOutCents: Cents
  /** Daily total balance across all accounts for the period. */
  balanceSeries: { date: string; balanceCents: Cents }[]
  /** Daily in/out totals for the period, with per-category breakdowns (positive magnitudes). */
  cashFlowSeries: CashFlowPoint[]
}

export interface ApiError {
  code: string
  message: string
}
