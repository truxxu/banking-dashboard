import type { TransferRequest } from '@/api/schemas'
import type { Account } from '@/api/types'
import type { Cents } from '@/lib/money'

export type Method = TransferRequest['method']

export const METHOD_LABEL: Record<Method, string> = { ach: 'ACH', wire: 'Wire', transfer: 'Internal transfer' }

/** Funds not already held by pending outgoing transfers. */
export const available = (a: Account): Cents => a.balanceCents - a.pendingCents
