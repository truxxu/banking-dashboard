import type { PaymentRequest } from '@/api/types'
import { dayKey } from '@/lib/date'

export const isOverdue = (r: PaymentRequest) => r.status === 'open' && r.dueDate < dayKey(new Date())
