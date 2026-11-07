import { cn } from '@/lib/utils'
import { type StatusTone, TONE_DOT } from './statusTone'

export type { StatusTone }

const INK: Record<StatusTone, string> = {
  neutral: 'text-muted-foreground',
  warning: 'text-warning-ink',
  positive: 'text-positive',
  destructive: 'text-destructive',
}

/** Small colored dot followed by a label, used for transaction and request statuses. */
export function StatusDot({ tone, children, className }: { tone: StatusTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap', INK[tone], className)}>
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />
      {children}
    </span>
  )
}
