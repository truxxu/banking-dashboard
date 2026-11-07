import type { PaymentRequest } from '@/api/types'
import { StatusDot } from '@/components/shared/StatusDot'
import { isOverdue } from './request'

export function RequestStatusBadge({ request }: { request: PaymentRequest }) {
  if (isOverdue(request)) return <StatusDot tone="destructive">Overdue</StatusDot>
  if (request.status === 'open') return <StatusDot tone="warning">Open</StatusDot>
  if (request.status === 'paid') return <StatusDot tone="positive">Paid</StatusDot>
  return <StatusDot tone="neutral">Cancelled</StatusDot>
}
