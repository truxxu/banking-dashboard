import { usePaymentRequests, useTransaction } from '@/api/queries'
import type { Account, PaymentRequest } from '@/api/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SuccessPanel } from '@/features/payments/SuccessPanel'
import { accountLabel } from '@/lib/account'
import { formatDayKey } from '@/lib/date'
import { RequestStatusBadge } from './RequestStatusBadge'

export function RequestSuccess({
  created,
  accounts,
  onReset,
  headingRef,
}: {
  created: PaymentRequest
  accounts: Account[]
  onReset: () => void
  headingRef: React.Ref<HTMLHeadingElement>
}) {
  // useCreatePaymentRequest re-invalidates when the mock customer pays and again when the deposit posts.
  const requests = usePaymentRequests()
  const req = requests.data?.find((r) => r.id === created.id) ?? created
  const tx = useTransaction(req.transactionId ?? null).data
  const to = accounts.find((a) => a.id === req.toAccountId)
  const deposited = tx?.status === 'posted'

  const heading = deposited ? 'Payment received' : req.status === 'paid' ? 'Payment on its way' : req.status === 'cancelled' ? 'Request cancelled' : 'Request sent'
  const detail = deposited
    ? `Deposited to ${to ? accountLabel(to) : 'your account'}.`
    : req.status === 'paid'
      ? `${req.payerName} paid. The deposit is pending and will post shortly.`
      : req.status === 'cancelled'
        ? 'This request was cancelled.'
        : `We emailed ${req.payerEmail}. Due ${formatDayKey(req.dueDate)}.`

  return (
    <SuccessPanel
      headingRef={headingRef}
      heading={heading}
      amountCents={req.amountCents}
      party={req.payerName}
      badge={tx ? <StatusBadge status={tx.status} /> : <RequestStatusBadge request={req} />}
      detail={detail}
      txId={req.transactionId}
      resetLabel="Request another"
      onReset={onReset}
    />
  )
}
