import { STATUS_LABEL } from '@/api/schemas'
import type { TransactionStatus } from '@/api/types'
import { Badge } from '@/components/ui/badge'

const VARIANT = { pending: 'warning', posted: 'secondary', failed: 'destructive' } as const

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
