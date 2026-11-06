import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { dayKey, daysAgo, formatDate, formatShortDate, parseDayKey } from '@/lib/date'
import { cn } from '@/lib/utils'

type Range = { from?: string; to?: string }

function presets(today: Date): { label: string; range: Range }[] {
  const y = today.getFullYear()
  const m = today.getMonth()
  return [
    { label: 'Last 7 days', range: { from: dayKey(daysAgo(6, today)), to: dayKey(today) } },
    { label: 'Last 30 days', range: { from: dayKey(daysAgo(29, today)), to: dayKey(today) } },
    { label: 'Last 90 days', range: { from: dayKey(daysAgo(89, today)), to: dayKey(today) } },
    { label: 'This month', range: { from: dayKey(new Date(y, m, 1)), to: dayKey(today) } },
    { label: 'Last month', range: { from: dayKey(new Date(y, m - 1, 1)), to: dayKey(new Date(y, m, 0)) } },
    { label: 'Year to date', range: { from: dayKey(new Date(y, 0, 1)), to: dayKey(today) } },
  ]
}

function label(from?: Date, to?: Date) {
  if (from && to) {
    if (dayKey(from) === dayKey(to)) return formatDate(from.toISOString())
    const sameYear = from.getFullYear() === to.getFullYear()
    return `${sameYear ? formatShortDate(from.toISOString()) : formatDate(from.toISOString())} – ${formatDate(to.toISOString())}`
  }
  if (from) return `From ${formatDate(from.toISOString())}`
  if (to) return `Until ${formatDate(to.toISOString())}`
  return 'Any date'
}

/** Date range filter. Values are inclusive YYYY-MM-DD day keys, matching the URL and API. */
export function DateRangeFilter({ from, to, onChange }: Range & { onChange: (from?: string, to?: string) => void }) {
  const [open, setOpen] = useState(false)
  // Captured once per mount so render stays pure; refreshed when the popover opens.
  const [today, setToday] = useState(() => new Date())
  const fromDate = parseDayKey(from)
  const toDate = parseDayKey(to)
  const active = Boolean(fromDate || toDate)
  // Calendar clicks edit a draft; it's committed when the popover closes, so picking a range
  // is one URL update (one fetch) and the toolbar doesn't reflow mid-selection.
  const [draft, setDraft] = useState<DateRange | undefined>()

  const apply = (r: Range) => {
    onChange(r.from, r.to)
    setOpen(false)
  }

  const onOpenChange = (o: boolean) => {
    if (o) {
      setToday(() => new Date())
      setDraft(fromDate || toDate ? { from: fromDate, to: toDate } : undefined)
    } else {
      const end = draft?.to ?? draft?.from // a single clicked day means that one day
      const next = { from: draft?.from && dayKey(draft.from), to: end && dayKey(end) }
      if (next.from !== from || next.to !== to) onChange(next.from, next.to)
    }
    setOpen(o)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label="Date range" className={cn('font-normal', !active && 'text-muted-foreground')}>
          <CalendarDays />
          {label(fromDate, toDate)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-wrap gap-1 border-b p-2 sm:w-36 sm:flex-col sm:flex-nowrap sm:border-r sm:border-b-0">
            {presets(today).map((p) => {
              const isActive = p.range.from === from && p.range.to === to
              return (
                <Button
                  key={p.label}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start font-normal"
                  onClick={() => apply(p.range)}
                >
                  {p.label}
                </Button>
              )
            })}
          </div>
          <div className="flex flex-col">
            <Calendar
              mode="range"
              numberOfMonths={2}
              className="[&_.rdp-months]:flex-col sm:[&_.rdp-months]:flex-row"
              defaultMonth={fromDate ?? daysAgo(30, today)}
              selected={draft}
              disabled={{ after: today }}
              onSelect={setDraft}
            />
            <div className="flex items-center justify-end gap-2 border-t p-2">
              <Button variant="ghost" size="sm" disabled={!active && !draft} onClick={() => apply({})}>Clear</Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
