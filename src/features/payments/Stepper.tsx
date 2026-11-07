import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stepper({ steps, current, label = 'Transfer progress' }: { steps: string[]; current: number; label?: string }) {
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center gap-2">
            <span
              className={cn(
                'tabular flex size-6 items-center justify-center rounded-full border text-xs',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary font-medium',
                !done && !active && 'text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn(active ? 'font-medium' : 'text-muted-foreground', !active && 'max-sm:sr-only')}>
              {label}
              {done && <span className="sr-only"> (completed)</span>}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="bg-border h-px w-4 sm:w-6" />}
          </li>
        )
      })}
    </ol>
  )
}
