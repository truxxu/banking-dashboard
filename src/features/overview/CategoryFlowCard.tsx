import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { UseQueryResult } from '@tanstack/react-query'
import type { Summary } from '@/api/types'
import { EmptyState, ErrorState } from '@/components/shared/States'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { buildCategoryTotals, type FlowDirection } from './categoryTotals'

interface Props {
  direction: FlowDirection
  /** Summary for the last 30 days. */
  summary: UseQueryResult<Summary>
}

/** Horizontal bar chart: one bar per category, length = 30-day total, value labeled at the bar end. */
export function CategoryFlowCard({ direction, summary }: Props) {
  const title = direction === 'in' ? 'Money in' : 'Money out'
  const series = summary.data?.cashFlowSeries
  const rows = useMemo(() => (series ? buildCategoryTotals(series, direction) : undefined), [series, direction])
  const max = rows?.reduce((m, r) => Math.max(m, r.totalCents), 0) ?? 0

  const from = series?.[0]?.date
  const to = series?.at(-1)?.date
  const total = summary.data && (direction === 'in' ? summary.data.moneyInCents : summary.data.moneyOutCents)

  return (
    <Card>
      <CardHeader>
        <CardDescription>{title} · last 30 days</CardDescription>
        {total !== undefined ? (
          <CardTitle className="tabular text-2xl font-semibold tracking-tight">{formatMoney(total)}</CardTitle>
        ) : (
          <Skeleton className="h-8 w-40" />
        )}
      </CardHeader>
      <CardContent>
        {summary.isError ? (
          <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
        ) : !rows ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-7" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={`No ${title.toLowerCase()}`} description="Nothing posted in the last 30 days." />
        ) : (
          <ul aria-label={`${title} by category`} className="flex flex-col gap-1">
            {rows.map((r) => {
              const pct = max > 0 ? (r.totalCents / max) * 100 : 0
              const content = (
                <>
                  <span className="text-muted-foreground w-24 shrink-0 truncate text-sm">{r.label}</span>
                  <span aria-hidden className="min-w-0 flex-1">
                    <span
                      className={cn('block h-5 rounded-r-[4px]', r.category ? 'bg-chart-1' : 'bg-muted-foreground/50')}
                      style={{ width: `max(2px, ${pct}%)` }}
                    />
                  </span>
                  <span className="tabular w-28 shrink-0 text-right text-sm font-medium whitespace-nowrap">{formatMoney(r.totalCents)}</span>
                </>
              )
              const cls = '-mx-2 flex items-center gap-3 rounded-md px-2 py-1'
              return (
                <li key={r.label}>
                  {r.category ? (
                    <Link
                      to={`/transactions?${new URLSearchParams({ category: r.category, direction, status: 'posted', ...(from && { from }), ...(to && { to }) })}`}
                      aria-label={`${r.label}: ${formatMoney(r.totalCents)} — view transactions`}
                      className={`${cls} hover:bg-muted/50 focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={cls}>{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
