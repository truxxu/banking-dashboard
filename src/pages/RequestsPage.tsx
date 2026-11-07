import { useAccounts, useCustomers } from '@/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState } from '@/components/shared/States'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RequestFlow } from '@/features/receive/RequestFlow'
import { RequestsList } from '@/features/receive/RequestsList'

export function RequestsPage() {
  const accounts = useAccounts()
  const customers = useCustomers()

  // Prefer data over errors: a failed background refetch shouldn't tear down the flow.
  let body: React.ReactNode
  if (accounts.data && customers.data) {
    body = <RequestFlow accounts={accounts.data} customers={customers.data} />
  } else if (accounts.isError || customers.isError) {
    body = (
      <ErrorState
        error={accounts.error ?? customers.error}
        onRetry={() => {
          if (accounts.isError) void accounts.refetch()
          if (customers.isError) void customers.refetch()
        }}
      />
    )
  } else {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading accounts">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Payment requests" description="Ask a customer to pay you, and track what's been paid." />
      <Card className="max-w-xl">
        <CardContent>{body}</CardContent>
      </Card>
      {accounts.data && (
        <div className="mt-6">
          <RequestsList accounts={accounts.data} />
        </div>
      )}
    </>
  )
}
