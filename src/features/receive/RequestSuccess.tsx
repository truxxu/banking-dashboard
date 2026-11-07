import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePaymentRequests, useTransaction } from '@/api/queries'
import type { Account, PaymentRequest } from '@/api/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatDayKey } from '@/lib/date'
import { formatMoney } from '@/lib/money'
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
    ? `Deposited to ${to?.name ?? 'your account'}${to ? ` ••${to.mask}` : ''}.`
    : req.status === 'paid'
      ? `${req.payerName} paid. The deposit is pending and will post shortly.`
      : req.status === 'cancelled'
        ? 'This request was cancelled.'
        : `We emailed ${req.payerEmail}. Due ${formatDayKey(req.dueDate)}.`

  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <CheckCircle2 className="text-positive size-10" aria-hidden />
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
        {heading}
      </h2>
      <p className="tabular text-3xl font-semibold">{formatMoney(req.amountCents)}</p>
      <div aria-live="polite" className="flex flex-col items-center gap-1 text-sm">
        <span className="flex items-center gap-2">
          {req.payerName} {tx ? <StatusBadge status={tx.status} /> : <RequestStatusBadge request={req} />}
        </span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <div className="mt-3 flex gap-2">
        {req.transactionId && (
          <Button asChild variant="outline">
            <Link to={`/transactions?tx=${req.transactionId}`}>View transaction</Link>
          </Button>
        )}
        <Button onClick={onReset}>Request another</Button>
      </div>
    </div>
  )
}
