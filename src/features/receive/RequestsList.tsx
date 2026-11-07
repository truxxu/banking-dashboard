import { Link } from 'react-router-dom'
import { useCancelPaymentRequest, usePaymentRequests } from '@/api/queries'
import type { Account } from '@/api/types'
import { EmptyState, ErrorState } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FieldError } from '@/features/payments/fields'
import { transactionsHref } from '@/features/transactions/useTransactionFilters'
import { accountLabelById } from '@/lib/account'
import { formatDayKey } from '@/lib/date'
import { formatMoney } from '@/lib/money'
import { RequestStatusBadge } from './RequestStatusBadge'

export function RequestsList({ accounts }: { accounts: Account[] }) {
  const requests = usePaymentRequests()
  const cancel = useCancelPaymentRequest()

  return (
    <Card className="@container gap-0 overflow-hidden py-0 sm:py-0">
      <CardHeader className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <CardTitle>Payment requests</CardTitle>
        <CardDescription>Requests you've sent and whether they've been paid.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-0">
        {requests.isError && !requests.data ? (
          <ErrorState error={requests.error} onRetry={() => requests.refetch()} />
        ) : !requests.data ? (
          <div className="flex flex-col gap-2 px-6 pb-6" aria-busy="true" aria-label="Loading payment requests">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : requests.data.length === 0 ? (
          <EmptyState title="No payment requests yet" description="Requests you send will show up here." />
        ) : (
          <>
            {cancel.isError && <FieldError className="mx-5 mb-3 sm:mx-6" message={cancel.error.message || 'The request could not be cancelled.'} />}
            <Table className="sm:[&_td]:first:pl-6 sm:[&_td]:last:pr-6 sm:[&_th]:first:pl-6 sm:[&_th]:last:pr-6">
              <TableHeader className="[&_tr]:border-t">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Payer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="@max-lg:hidden">Due</TableHead>
                  <TableHead className="@max-2xl:hidden">Deposit to</TableHead>
                  <TableHead className="@max-lg:hidden">Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.data.map((r) => {
                  const cancelling = cancel.isPending && cancel.variables === r.id
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="max-w-[calc(100cqw-14rem)] truncate font-medium @lg:max-w-60">{r.payerName}</div>
                        <div className="text-muted-foreground max-w-[calc(100cqw-14rem)] truncate text-xs leading-4 @lg:max-w-60">{r.payerEmail}</div>
                        <div className="text-muted-foreground text-xs leading-4 @lg:hidden">Due {formatDayKey(r.dueDate)}</div>
                      </TableCell>
                      <TableCell className="tabular h-[58px] text-right font-medium">
                        {formatMoney(r.amountCents)}
                        <div className="mt-1 flex justify-end font-normal @lg:hidden">
                          <RequestStatusBadge request={r} />
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] whitespace-nowrap @max-lg:hidden">{formatDayKey(r.dueDate)}</TableCell>
                      <TableCell className="text-muted-foreground text-[13px] @max-2xl:hidden">{accountLabelById(accounts, r.toAccountId)}</TableCell>
                      <TableCell className="@max-lg:hidden">
                        <RequestStatusBadge request={r} />
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === 'open' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-foreground/70 hover:text-foreground h-7 px-2 text-[13px]"
                            disabled={cancel.isPending}
                            onClick={() => cancel.mutate(r.id)}
                            aria-label={`Cancel request to ${r.payerName} for ${formatMoney(r.amountCents)}`}
                          >
                            {cancelling ? 'Cancelling…' : 'Cancel'}
                          </Button>
                        )}
                        {r.transactionId && (
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary h-7 px-2 text-[13px]" asChild>
                            <Link to={transactionsHref({ tx: r.transactionId })} aria-label={`View payment from ${r.payerName}`}>
                              View
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}
