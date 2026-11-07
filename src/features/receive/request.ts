import type { PaymentRequest } from '@/api/types'
import { todayKey } from '@/lib/date'

export const isOverdue = (r: PaymentRequest) => r.status === 'open' && r.dueDate < todayKey()
