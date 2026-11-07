import { Link } from 'react-router-dom'
import { useSummary } from '@/api/queries'
import { EmptyState, ErrorState } from '@/components/shared/States'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { transactionsHref } from '@/features/transactions/useTransactionFilters'
import { formatMoney, formatMoneyCompact } from '@/lib/money'
import { cn } from '@/lib/utils'
import { buildCategoryTotals, type FlowDirection } from './categoryTotals'

/**
 * Horizontal bar chart: one bar per category, length = total over the selected period, value labeled at the bar end.
 * Follows Overview's period switcher (shares its `useSummary(days)` query).
 */
export function CategoryFlowCard({ direction, days, periodLabel }: { direction: FlowDirection; days: number; periodLabel: string }) {
  const summary = useSummary(days)
  const title = direction === 'in' ? 'Money in' : 'Money out'
  const series = summary.data?.cashFlowSeries
  const rows = series && buildCategoryTotals(series, direction)
  const max = rows?.reduce((m, r) => Math.max(m, r.totalCents), 0) ?? 0

  const from = series?.[0]?.date
  const to = series?.at(-1)?.date
  const total = summary.data && (direction === 'in' ? summary.data.moneyInCents : summary.data.moneyOutCents)

  return (
    <Card>
      <CardHeader>
        <CardDescription>{title} · last {periodLabel}</CardDescription>
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
          <EmptyState title={`No ${title.toLowerCase()}`} description={`Nothing posted in the last ${periodLabel}.`} />
        ) : (
          <ul aria-label={`${title} by category`} className="flex flex-col gap-1">
            {rows.map((r) => {
              const pct = max > 0 ? (r.totalCents / max) * 100 : 0
              const content = (
                <>
                  <span className="text-muted-foreground w-20 shrink-0 truncate text-sm sm:w-24">{r.label}</span>
                  <span aria-hidden className="min-w-0 flex-1">
                    <span
                      className={cn('block h-5 rounded-r-[4px]', r.category ? 'bg-chart-1' : 'bg-muted-foreground/50')}
                      style={{ width: `max(2px, ${pct}%)` }}
                    />
                  </span>
                  <span className="tabular shrink-0 text-right text-sm font-medium whitespace-nowrap sm:w-28">
                    <span className="sm:hidden">{formatMoneyCompact(r.totalCents)}</span>
                    <span className="max-sm:hidden">{formatMoney(r.totalCents)}</span>
                  </span>
                </>
              )
              const cls = '-mx-2 flex items-center gap-3 rounded-md px-2 py-1'
              return (
                <li key={r.label}>
                  {r.category ? (
                    <Link
                      to={transactionsHref({ category: r.category, direction, status: 'posted', from, to })}
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
