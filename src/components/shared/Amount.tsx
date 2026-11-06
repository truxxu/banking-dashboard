import { formatMoney, type Cents } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Signed money with tabular digits; incoming amounts are tinted. */
export function Amount({ cents, className, signed = true }: { cents: Cents; className?: string; signed?: boolean }) {
  return (
    <span className={cn('tabular', cents > 0 && signed && 'text-positive', className)}>
      {formatMoney(cents, { signed })}
    </span>
  )
}
