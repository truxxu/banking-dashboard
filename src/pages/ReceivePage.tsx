import { useAccounts } from '@/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState } from '@/components/shared/States'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountDetailsCard } from '@/features/receive/AccountDetailsCard'

export function ReceivePage() {
  const accounts = useAccounts()

  return (
    <>
      <PageHeader title="Receive money" description="Share your account details so customers can pay you by ACH or wire." />
      <div className="max-w-xl">
        {accounts.data ? (
          <AccountDetailsCard accounts={accounts.data} />
        ) : accounts.isError ? (
          <Card>
            <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
          </Card>
        ) : (
          <Skeleton className="h-72" aria-label="Loading account details" />
        )}
      </div>
    </>
  )
}
