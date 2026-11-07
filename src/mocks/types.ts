import type { Account, Customer, PaymentRequest, Recipient, Transaction } from '@/api/types'

// Kept apart from seed.ts so loading a stored database doesn't pull in faker.

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
export const DB_VERSION = 3
