import { Link } from 'react-router-dom'
import { useCancelPaymentRequest, usePaymentRequests } from '@/api/queries'
import type { Account } from '@/api/types'
import { EmptyState, ErrorState } from '@/components/shared/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDayKey } from '@/lib/date'
import { formatMoney } from '@/lib/money'
import { RequestStatusBadge } from './RequestStatusBadge'

export function RequestsList({ accounts }: { accounts: Account[] }) {
  const requests = usePaymentRequests()
  const cancel = useCancelPaymentRequest()
  const accountName = (id: string) => {
    const a = accounts.find((x) => x.id === id)
    return a ? `${a.name} ••${a.mask}` : '—'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment requests</CardTitle>
        <CardDescription>Requests you've sent and whether they've been paid.</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.isError && !requests.data ? (
          <ErrorState error={requests.error} onRetry={() => requests.refetch()} />
        ) : !requests.data ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading payment requests">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : requests.data.length === 0 ? (
          <EmptyState title="No payment requests yet" description="Requests you send will show up here." />
        ) : (
          <>
            {cancel.isError && (
              <p role="alert" className="text-destructive mb-3 text-sm">
                {cancel.error.message || 'The request could not be cancelled.'}
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="max-md:hidden">Deposit to</TableHead>
                  <TableHead>Status</TableHead>
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
                        <div className="font-medium">{r.payerName}</div>
                        <div className="text-muted-foreground text-xs">{r.payerEmail}</div>
                      </TableCell>
                      <TableCell className="tabular text-right font-medium">{formatMoney(r.amountCents)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDayKey(r.dueDate)}</TableCell>
                      <TableCell className="text-muted-foreground max-md:hidden">{accountName(r.toAccountId)}</TableCell>
                      <TableCell>
                        <RequestStatusBadge request={r} />
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === 'open' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={cancel.isPending}
                            onClick={() => cancel.mutate(r.id)}
                            aria-label={`Cancel request to ${r.payerName} for ${formatMoney(r.amountCents)}`}
                          >
                            {cancelling ? 'Cancelling…' : 'Cancel'}
                          </Button>
                        )}
                        {r.transactionId && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/transactions?tx=${r.transactionId}`} aria-label={`View payment from ${r.payerName}`}>
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
