import { useAccounts, useCustomers } from '@/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { FlowSkeleton, QueriesErrorState } from '@/components/shared/States'
import { Card, CardContent } from '@/components/ui/card'
import { RequestFlow } from '@/features/receive/RequestFlow'
import { RequestsList } from '@/features/receive/RequestsList'

export function RequestsPage() {
  const accounts = useAccounts()
  const customers = useCustomers()

  // Prefer data over errors: a failed background refetch (e.g. after sending) shouldn't tear down the flow.
  const body =
    accounts.data && customers.data ? (
      <RequestFlow accounts={accounts.data} customers={customers.data} />
    ) : accounts.isError || customers.isError ? (
      <QueriesErrorState queries={[accounts, customers]} />
    ) : (
      <FlowSkeleton />
    )

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
