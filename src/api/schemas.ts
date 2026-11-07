import { z } from 'zod'
import { todayKey } from '@/lib/date'
import type { Cents } from '@/lib/money'
import { CATEGORIES, TRANSACTION_STATUSES, type Account, type TransactionMethod, type TransactionStatus } from './types'

export const amountCentsSchema = z
  .number({ error: 'Enter a valid amount' })
  .int()
  .positive('Amount must be greater than $0')
  .max(1_000_000_00, 'Amounts over $1,000,000 need to be scheduled with support')

export const MEMO_MAX = 140
const memoSchema = z.string().max(MEMO_MAX, `Memo must be ${MEMO_MAX} characters or fewer`)

/** PATCH /transactions/:id body. */
export const updateMemoSchema = z.object({ memo: memoSchema })

/**
 * Shared between the transfer form (client validation) and the MSW handler
 * (server validation), the same way a real app might share a contract package.
 */
export const transferRequestSchema = z
  .object({
    fromAccountId: z.string().min(1, 'Choose an account to send from'),
    /** Either an external recipient or one of your own accounts. */
    recipientId: z.string().optional(),
    toAccountId: z.string().optional(),
    amountCents: amountCentsSchema,
    method: z.enum(['ach', 'wire', 'transfer']),
    memo: memoSchema.default(''),
  })
  .refine((v) => Boolean(v.recipientId) !== Boolean(v.toAccountId), {
    message: 'Choose exactly one destination',
    path: ['recipientId'],
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: 'Source and destination must differ',
    path: ['toAccountId'],
  })

export type TransferRequest = z.input<typeof transferRequestSchema>
export type TransferRequestOutput = z.output<typeof transferRequestSchema>

/** Shared between the request-payment form and the MSW handler. */
export const paymentRequestSchema = z.object({
  toAccountId: z.string().min(1, 'Choose an account to deposit into'),
  payerName: z.string().trim().min(1, 'Enter who is paying').max(80, 'Keep the name under 80 characters'),
  payerEmail: z.email('Enter a valid email address'),
  amountCents: amountCentsSchema,
  method: z.enum(['ach', 'wire']),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a due date')
    .refine((d) => d >= todayKey(), "Due date can't be in the past"),
  memo: memoSchema.default(''),
})

export type PaymentRequestInput = z.input<typeof paymentRequestSchema>
export type PaymentRequestOutput = z.output<typeof paymentRequestSchema>

const dayKeyParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined)

export const transactionQuerySchema = z.object({
  q: z.string().optional(),
  accountId: z.string().optional(),
  // Malformed values are dropped (.catch) rather than failing the whole query.
  category: z.enum(CATEGORIES).optional().catch(undefined),
  status: z.enum(TRANSACTION_STATUSES).optional().catch(undefined),
  direction: z.enum(['in', 'out']).optional().catch(undefined),
  /** YYYY-MM-DD, inclusive. */
  from: dayKeyParam,
  to: dayKeyParam,
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25).catch(25),
})

/** Client-side query shape: every field optional, page/pageSize as numbers. */
export type TransactionQuery = Partial<z.output<typeof transactionQuerySchema>>

/** Fees in cents by method, used by both the form preview and the handler. */
export const TRANSFER_FEES: Record<TransferRequest['method'], number> = {
  ach: 0,
  wire: 15_00,
  transfer: 0,
}

export const TRANSFER_ETA: Record<TransferRequest['method'], string> = {
  ach: '1–3 business days',
  wire: 'Same day if sent before 4pm ET',
  transfer: 'Instant',
}

/** Compact delivery times, e.g. for the Review summary pill. */
export const TRANSFER_ETA_SHORT: Record<TransferRequest['method'], string> = { ach: '1–3 days', wire: 'Same day', transfer: 'Instant' }

export const STATUS_LABEL: Record<TransactionStatus, string> = { pending: 'Pending', posted: 'Posted', failed: 'Failed' }

export const METHOD_LABEL: Record<TransactionMethod, string> = { ach: 'ACH', wire: 'Wire', card: 'Card', transfer: 'Internal transfer' }

/** Funds not already held by pending outgoing transfers. */
export const available = (a: Account): Cents => a.balanceCents - a.pendingCents

/** What a transfer takes out of the source account, fee included. */
export const totalDebit = (amountCents: Cents, method: TransferRequest['method']): Cents => amountCents + TRANSFER_FEES[method]

/** How long the mock bank keeps a new transfer pending before it posts. */
export const SETTLE_MS = 6_000

/** How long the mock customer takes to pay a new payment request. */
export const REQUEST_PAY_MS = 8_000
