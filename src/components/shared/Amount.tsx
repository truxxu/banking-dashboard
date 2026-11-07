import { formatMoney, type Cents } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Signed money with tabular digits; incoming amounts are tinted. */
export function Amount({ cents, className }: { cents: Cents; className?: string }) {
  return (
    <span className={cn('tabular', cents > 0 && 'text-positive', className)}>
      {formatMoney(cents, { signed: true })}
    </span>
  )
}
