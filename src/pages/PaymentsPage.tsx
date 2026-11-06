import { useAccounts, useRecipients } from '@/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * TODO — the main "functional feature". Everything it needs already exists:
 * - useAccounts(), useRecipients() for the pickers
 * - transferRequestSchema (src/api/schemas.ts) → zodResolver for react-hook-form
 * - TRANSFER_FEES / TRANSFER_ETA for the review step
 * - useCreateTransfer() → POST /api/transfers. The mock API validates funds,
 *   creates a pending transaction, and posts it after SETTLE_MS; the hook
 *   invalidates balances, summary and transactions both times.
 *
 * Steps: from account → recipient (or own account) → amount + method → review → confirm → success.
 */
export function PaymentsPage() {
  const accounts = useAccounts()
  const recipients = useRecipients()
  return (
    <>
      <PageHeader title="Send money" description="Pay a recipient or move money between your accounts." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Transfer flow goes here</CardTitle>
          <CardDescription>
            {accounts.data?.length ?? '…'} accounts and {recipients.data?.length ?? '…'} saved recipients loaded from the mock API.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">See the TODO at the top of PaymentsPage.tsx.</CardContent>
      </Card>
    </>
  )
}
