import { useSummary } from '@/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/money'

/**
 * TODO:
 * - Spending by category (donut/bar) from summary.spendByCategory;
 *   clicking a slice → navigate(`/transactions?category=${c}&direction=out`)
 * - Monthly cash flow (in/out bars + net line) from summary.cashFlowSeries (bucket by month)
 * - Shared period selector (reuse the one on Overview)
 */
export function InsightsPage() {
  const summary = useSummary(90)
  return (
    <>
      <PageHeader title="Insights" description="Where money comes from and where it goes." />
      <Card>
        <CardHeader><CardTitle>Spend by category · last 90 days</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm">
            {summary.data?.spendByCategory.map((s) => (
              <li key={s.category} className="flex justify-between border-b py-1.5 last:border-0">
                <span>{s.category}</span>
                <span className="tabular">{formatMoney(s.cents)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
