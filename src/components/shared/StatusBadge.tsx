import type { TransactionStatus } from '@/api/types'
import { Badge } from '@/components/ui/badge'

const VARIANT = { pending: 'warning', posted: 'secondary', failed: 'destructive' } as const
const LABEL: Record<TransactionStatus, string> = { pending: 'Pending', posted: 'Posted', failed: 'Failed' }

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>
}
