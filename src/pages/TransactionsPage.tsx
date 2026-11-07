import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { useAccounts, useTransactions } from '@/api/queries'
import { STATUS_LABEL } from '@/api/schemas'
import { CATEGORIES, TRANSACTION_STATUSES } from '@/api/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { DateRangeFilter } from '@/features/transactions/DateRangeFilter'
import { TransactionDetail } from '@/features/transactions/TransactionDetail'
import { TransactionsTable } from '@/features/transactions/TransactionsTable'
import { useTransactionFilters } from '@/features/transactions/useTransactionFilters'
import { accountLabel } from '@/lib/account'

export function TransactionsPage() {
  const { query, setFilter, setDateRange, clearFilters, activeCount, selectedId, setSelectedId } = useTransactionFilters()
  const transactions = useTransactions(query)
  const accounts = useAccounts()

  // Debounce the search box before it hits the URL / API.
  const [search, setSearch] = useState(query.q ?? '')
  useEffect(() => {
    const t = setTimeout(() => search !== (query.q ?? '') && setFilter('q', search || undefined), 300)
    return () => clearTimeout(t)
  }, [search, query.q, setFilter])

  // Keep the last selected id so the drawer content stays put during its close animation.
  const [shownId, setShownId] = useState(selectedId)
  if (selectedId && selectedId !== shownId) setShownId(selectedId)

  const page = query.page ?? 1
  const total = transactions.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / (query.pageSize ?? 25)))

  return (
    <>
      <PageHeader
        title="Transactions"
        description={transactions.data ? `${total.toLocaleString()} transactions` : undefined}
        actions={
          // TODO: export the current filtered query as CSV
          <Button variant="outline" title="CSV export coming soon" onClick={() => {}}>
            <Download /> Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-56 sm:flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input aria-label="Search transactions" placeholder="Search counterparty or memo" className="h-9 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:contents">
        <NativeSelect aria-label="Account" value={query.accountId ?? ''} onChange={(e) => setFilter('accountId', e.target.value || undefined)}>
          <option value="">All accounts</option>
          {accounts.data?.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Category" value={query.category ?? ''} onChange={(e) => setFilter('category', e.target.value || undefined)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Direction" value={query.direction ?? ''} onChange={(e) => setFilter('direction', e.target.value || undefined)}>
          <option value="">In & out</option>
          <option value="in">Money in</option>
          <option value="out">Money out</option>
        </NativeSelect>
        <NativeSelect aria-label="Status" value={query.status ?? ''} onChange={(e) => setFilter('status', e.target.value || undefined)}>
          <option value="">Any status</option>
          {TRANSACTION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </NativeSelect>
        </div>
        <DateRangeFilter from={query.from} to={query.to} onChange={setDateRange} className="max-sm:flex-1" />
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); clearFilters() }}>Clear filters</Button>
        )}
      </div>

      <Card className="@container gap-0 overflow-hidden py-0 sm:py-0">
        {transactions.isError ? (
          <ErrorState error={transactions.error} onRetry={() => transactions.refetch()} />
        ) : transactions.isPending || accounts.isPending ? (
          <div className="flex flex-col gap-2 p-4">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>
        ) : transactions.data.items.length === 0 ? (
          <EmptyState title="No transactions found" description="Try a different search or clear your filters." />
        ) : (
          <div className={transactions.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
            <TransactionsTable rows={transactions.data.items} accounts={accounts.data ?? []} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        )}
        <div className="border-hairline flex items-center justify-between border-t px-4 py-3 text-[13px] sm:px-5">
          <span className="text-muted-foreground">Page {page} of {pageCount}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} aria-label="Previous page" onClick={() => setFilter('page', String(page - 1))}><ChevronLeft /><span className="max-sm:hidden">Prev</span></Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount} aria-label="Next page" onClick={() => setFilter('page', String(page + 1))}><span className="max-sm:hidden">Next</span><ChevronRight /></Button>
          </div>
        </div>
      </Card>

      <TransactionDetail id={shownId} open={!!selectedId} onClose={() => setSelectedId(null)} />
    </>
  )
}
