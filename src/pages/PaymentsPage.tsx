import { useAccounts, useRecipients } from '@/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState } from '@/components/shared/States'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TransferFlow } from '@/features/payments/TransferFlow'

export function PaymentsPage() {
  const accounts = useAccounts()
  const recipients = useRecipients()

  // Prefer data over errors: a failed background refetch (e.g. after sending) shouldn't tear down the flow.
  let body: React.ReactNode
  if (accounts.data && recipients.data) {
    body = <TransferFlow accounts={accounts.data} recipients={recipients.data} />
  } else if (accounts.isError || recipients.isError) {
    body = (
      <ErrorState
        error={accounts.error ?? recipients.error}
        onRetry={() => {
          if (accounts.isError) void accounts.refetch()
          if (recipients.isError) void recipients.refetch()
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
      <PageHeader title="Send money" description="Pay a recipient or move money between your accounts." />
      <Card className="max-w-xl">
        <CardContent>{body}</CardContent>
      </Card>
    </>
  )
}
