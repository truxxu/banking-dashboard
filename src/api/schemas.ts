import { z } from 'zod'
import { CATEGORIES } from './types'

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
    amountCents: z
      .number({ error: 'Enter a valid amount' })
      .int()
      .positive('Amount must be greater than $0')
      .max(1_000_000_00, 'Transfers over $1,000,000 need to be scheduled with support'),
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

const dayKeyParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined)

export const transactionQuerySchema = z.object({
  q: z.string().optional(),
  accountId: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(['pending', 'posted', 'failed']).optional(),
  direction: z.enum(['in', 'out']).optional(),
  /** YYYY-MM-DD, inclusive. Malformed values are dropped rather than failing the whole query. */
  from: dayKeyParam,
  to: dayKeyParam,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
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
