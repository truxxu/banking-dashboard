import type { PaymentRequest } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { isOverdue } from './request'

export function RequestStatusBadge({ request }: { request: PaymentRequest }) {
  if (isOverdue(request)) return <Badge variant="destructive">Overdue</Badge>
  if (request.status === 'open') return <Badge variant="warning">Open</Badge>
  if (request.status === 'paid') return <Badge variant="positive">Paid</Badge>
  return <Badge variant="secondary">Cancelled</Badge>
}
