import { useAccounts, useRecipients } from '@/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { FlowSkeleton, QueriesErrorState } from '@/components/shared/States'
import { Card, CardContent } from '@/components/ui/card'
import { TransferFlow } from '@/features/payments/TransferFlow'

export function PaymentsPage() {
  const accounts = useAccounts()
  const recipients = useRecipients()

  // Prefer data over errors: a failed background refetch (e.g. after sending) shouldn't tear down the flow.
  const body =
    accounts.data && recipients.data ? (
      <TransferFlow accounts={accounts.data} recipients={recipients.data} />
    ) : accounts.isError || recipients.isError ? (
      <QueriesErrorState queries={[accounts, recipients]} />
    ) : (
      <FlowSkeleton />
    )

  return (
    <>
      <PageHeader title="Send money" description="Pay a recipient or move money between your accounts." />
      <Card className="max-w-[600px]">
        <CardContent>{body}</CardContent>
      </Card>
    </>
  )
}
