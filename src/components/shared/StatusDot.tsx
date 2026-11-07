import { cn } from '@/lib/utils'

export type StatusTone = 'neutral' | 'warning' | 'positive' | 'destructive'

const DOT: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground/45',
  warning: 'bg-warning',
  positive: 'bg-positive',
  destructive: 'bg-destructive',
}
const INK: Record<StatusTone, string> = {
  neutral: 'text-muted-foreground',
  warning: 'text-[oklch(0.52_0.12_70)] dark:text-warning',
  positive: 'text-positive',
  destructive: 'text-destructive',
}

/** Small colored dot followed by a label, used for transaction and request statuses. */
export function StatusDot({ tone, children, className }: { tone: StatusTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap', INK[tone], className)}>
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', DOT[tone])} />
      {children}
    </span>
  )
}
