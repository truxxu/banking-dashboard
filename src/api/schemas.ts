import { z } from 'zod'
import { dayKey } from '@/lib/date'
import { CATEGORIES } from './types'

export const amountCentsSchema = z
  .number({ error: 'Enter a valid amount' })
  .int()
  .positive('Amount must be greater than $0')
  .max(1_000_000_00, 'Amounts over $1,000,000 need to be scheduled with support')

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
    memo: z.string().max(140).default(''),
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
    .refine((d) => d >= dayKey(new Date()), "Due date can't be in the past"),
  memo: z.string().max(140).default(''),
})

export type PaymentRequestInput = z.input<typeof paymentRequestSchema>
export type PaymentRequestOutput = z.output<typeof paymentRequestSchema>

const dayKeyParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined)

export const transactionQuerySchema = z.object({
  q: z.string().optional(),
  accountId: z.string().optional(),
  // Malformed values are dropped (.catch) rather than failing the whole query.
  category: z.enum(CATEGORIES).optional().catch(undefined),
  status: z.enum(['pending', 'posted', 'failed']).optional().catch(undefined),
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

/** How long the mock bank keeps a new transfer pending before it posts. */
export const SETTLE_MS = 6_000

/** How long the mock customer takes to pay a new payment request. */
export const REQUEST_PAY_MS = 8_000
