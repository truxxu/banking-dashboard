import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stepper({ steps, current, label = 'Transfer progress' }: { steps: string[]; current: number; label?: string }) {
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-2 text-[13px]">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center gap-2">
            <span
              className={cn(
                'tabular grid size-[22px] shrink-0 place-items-center rounded-full text-[11px]',
                done && 'bg-primary text-primary-foreground',
                active && 'bg-primary/8 text-primary font-semibold shadow-[inset_0_0_0_1.5px_var(--primary)]',
                !done && !active && 'text-muted-foreground/80 shadow-[inset_0_0_0_1px_var(--border)]',
              )}
            >
              {done ? <Check className="size-[13px]" aria-hidden /> : i + 1}
            </span>
            <span className={cn(active ? 'font-semibold' : done ? 'text-muted-foreground' : 'text-muted-foreground/80', !active && 'max-sm:sr-only')}>
              {label}
              {done && <span className="sr-only"> (completed)</span>}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="bg-border h-px w-4 sm:w-5" />}
          </li>
        )
      })}
    </ol>
  )
}
