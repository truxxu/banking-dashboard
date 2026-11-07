import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { transactionsHref } from '@/features/transactions/useTransactionFilters'
import { formatMoney, type Cents } from '@/lib/money'

/** Confirmation view shared by the send and request flows; `party`, `badge` and `detail` update live. */
export function SuccessPanel({
  headingRef,
  heading,
  amountCents,
  party,
  badge,
  detail,
  txId,
  resetLabel,
  onReset,
}: {
  headingRef: React.Ref<HTMLHeadingElement>
  heading: string
  amountCents: Cents
  party: string
  badge: React.ReactNode
  detail: string
  /** Links to the transaction when set. */
  txId?: string
  resetLabel: string
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <CheckCircle2 className="text-positive size-10" aria-hidden />
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
        {heading}
      </h2>
      <p className="tabular text-3xl font-semibold">{formatMoney(amountCents)}</p>
      <div aria-live="polite" className="flex flex-col items-center gap-1 text-sm">
        <span className="flex items-center gap-2">
          {party} {badge}
        </span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {txId && (
          <Button asChild variant="outline">
            <Link to={transactionsHref({ tx: txId })}>View transaction</Link>
          </Button>
        )}
        <Button onClick={onReset}>{resetLabel}</Button>
      </div>
    </div>
  )
}
