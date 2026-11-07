import { STATUS_LABEL } from '@/api/schemas'
import type { TransactionStatus } from '@/api/types'
import { StatusDot, type StatusTone } from './StatusDot'

const STATUS_TONE: Record<TransactionStatus, StatusTone> = { pending: 'warning', posted: 'neutral', failed: 'destructive' }

export function StatusBadge({ status, className }: { status: TransactionStatus; className?: string }) {
  return (
    <StatusDot tone={STATUS_TONE[status]} className={className}>
      {STATUS_LABEL[status]}
    </StatusDot>
  )
}
