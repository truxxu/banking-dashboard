import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTransaction } from '@/api/queries'
import { TRANSFER_ETA, type TransferRequest } from '@/api/schemas'
import type { Transaction } from '@/api/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/money'

export function TransferSuccess({
  created,
  onReset,
  headingRef,
}: {
  created: Transaction
  onReset: () => void
  headingRef: React.Ref<HTMLHeadingElement>
}) {
  // useCreateTransfer re-invalidates once the mock bank settles, so this flips pending → posted live.
  const { data: tx = created } = useTransaction(created.id)
  const eta = TRANSFER_ETA[created.method as TransferRequest['method']]

  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <CheckCircle2 className="text-positive size-10" aria-hidden />
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
        {tx.status === 'posted' ? 'Transfer complete' : 'Transfer sent'}
      </h2>
      <p className="tabular text-3xl font-semibold">{formatMoney(Math.abs(tx.amountCents))}</p>
      <div aria-live="polite" className="flex flex-col items-center gap-1 text-sm">
        <span className="flex items-center gap-2">
          {tx.counterparty} <StatusBadge status={tx.status} />
        </span>
        <span className="text-muted-foreground">
          {tx.status === 'pending' ? `${eta}. Funds are on hold until it posts.` : tx.status === 'posted' ? 'Posted to your account.' : 'This transfer failed.'}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <Button asChild variant="outline">
          <Link to={`/transactions?tx=${tx.id}`}>View transaction</Link>
        </Button>
        <Button onClick={onReset}>Send another</Button>
      </div>
    </div>
  )
}
