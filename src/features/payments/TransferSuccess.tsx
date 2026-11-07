import { useTransaction } from '@/api/queries'
import { TRANSFER_ETA, type TransferRequest } from '@/api/schemas'
import type { Transaction } from '@/api/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SuccessPanel } from './SuccessPanel'

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
    <SuccessPanel
      headingRef={headingRef}
      heading={tx.status === 'posted' ? 'Transfer complete' : 'Transfer sent'}
      amountCents={Math.abs(tx.amountCents)}
      party={tx.counterparty}
      badge={<StatusBadge status={tx.status} />}
      detail={tx.status === 'pending' ? `${eta}. Funds are on hold until it posts.` : tx.status === 'posted' ? 'Posted to your account.' : 'This transfer failed.'}
      txId={tx.id}
      resetLabel="Send another"
      onReset={onReset}
    />
  )
}
