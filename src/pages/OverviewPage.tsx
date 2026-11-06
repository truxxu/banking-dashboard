import { Link, useSearchParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, Send } from 'lucide-react'
import { useAccounts, useSummary, useTransactions } from '@/api/queries'
import { Amount } from '@/components/shared/Amount'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState } from '@/components/shared/States'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { CategoryFlowCard } from '@/features/overview/CategoryFlowCard'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatShortDate } from '@/lib/date'
import { formatMoney, formatMoneyCompact } from '@/lib/money'
import { cn } from '@/lib/utils'

const PERIODS = [
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: 365, label: '12M' },
] as const

export function OverviewPage() {
  const [params, setParams] = useSearchParams()
  const days = Number(params.get('period') ?? 30)
  const summary = useSummary(days)
  // Money in/out cards are always the last 30 days, independent of the period switcher.
  const summary30 = useSummary(30)
  const accounts = useAccounts()
  const recent = useTransactions({ page: 1, pageSize: 6 })

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <Button asChild>
            <Link to="/payments"><Send /> Send money</Link>
          </Button>
        }
      />

      {summary.isError ? (
        <Card><ErrorState error={summary.error} onRetry={() => summary.refetch()} /></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardDescription>Total cash</CardDescription>
            {summary.data ? (
              <CardTitle className="tabular text-3xl font-semibold tracking-tight">{formatMoney(summary.data.totalCashCents)}</CardTitle>
            ) : (
              <Skeleton className="h-9 w-56" />
            )}
            {summary.data && (
              <p className="text-muted-foreground text-sm">
                <Amount cents={summary.data.cashChangeCents} /> in the last {PERIODS.find((p) => p.days === days)?.label ?? `${days}D`}
              </p>
            )}
            <CardAction>
              <div role="group" aria-label="Period" className="bg-muted flex rounded-md p-0.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.days}
                    aria-pressed={p.days === days}
                    onClick={() => setParams({ period: String(p.days) }, { replace: true })}
                    className={cn('rounded px-2.5 py-1 text-xs font-medium', p.days === days ? 'bg-background shadow-xs' : 'text-muted-foreground')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="h-64">
            {summary.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.data.balanceSeries} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} tickLine={false} axisLine={false} minTickGap={40} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis tickFormatter={(v: number) => formatMoneyCompact(v)} tickLine={false} axisLine={false} width={64} fontSize={12} stroke="var(--muted-foreground)" domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(v) => [formatMoney(Number(v)), 'Balance']}
                    labelFormatter={(l) => formatShortDate(String(l))}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="balanceCents" stroke="var(--chart-1)" strokeWidth={2} fill="url(#balanceFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CategoryFlowCard direction="in" summary={summary30} />
        <CategoryFlowCard direction="out" summary={summary30} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Accounts</CardTitle></CardHeader>
          <CardContent className="flex flex-col divide-y">
            {accounts.isError && <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />}
            {accounts.isPending && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="my-2 h-10" />)}
            {accounts.data?.map((a) => (
              <Link key={a.id} to={`/transactions?accountId=${a.id}`} className="hover:bg-muted/50 -mx-2 flex items-center justify-between rounded-md px-2 py-3">
                <div>
                  <div className="text-sm font-medium">{a.name} <span className="text-muted-foreground font-normal">••{a.mask}</span></div>
                  <div className="text-muted-foreground text-xs capitalize">{a.type}{a.pendingCents > 0 && ` · ${formatMoney(a.pendingCents)} pending`}</div>
                </div>
                <span className="tabular text-sm font-medium">{formatMoney(a.balanceCents)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild><Link to="/transactions">View all <ArrowRight /></Link></Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {recent.isError && <ErrorState error={recent.error} onRetry={() => recent.refetch()} />}
            {recent.isPending && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="my-2 h-8" />)}
            {recent.data?.items.map((tx) => (
              <Link key={tx.id} to={`/transactions?tx=${tx.id}`} className="hover:bg-muted/50 -mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{tx.counterparty}</div>
                  <div className="text-muted-foreground text-xs">{formatShortDate(tx.date)} · {tx.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  {tx.status !== 'posted' && <StatusBadge status={tx.status} />}
                  <Amount cents={tx.amountCents} className="text-sm font-medium" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
