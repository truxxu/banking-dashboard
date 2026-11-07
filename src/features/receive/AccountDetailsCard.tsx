import { useEffect, useState } from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import type { Account } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { ACCOUNT_TYPE_LABEL, accountLabel } from '@/lib/account'

const BANK_NAME = 'Ledgerly Bank, N.A.'

export function AccountDetailsCard({ accounts }: { accounts: Account[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0]

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(t)
  }, [copied])

  if (!account) return null

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
    } catch {
      // Clipboard blocked (permissions / insecure context) — the value is still visible to copy by hand.
    }
  }

  const rows: { label: string; value: string; hint?: string; display?: string; revealable?: boolean }[] = [
    { label: 'Bank', value: BANK_NAME },
    { label: 'Routing number', hint: 'ACH and wire', value: account.routingNumber },
    {
      label: 'Account number',
      value: account.accountNumber,
      display: revealed ? undefined : `••••${account.mask}`,
      revealable: true,
    },
    { label: 'Account type', value: ACCOUNT_TYPE_LABEL[account.type] },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account details</CardTitle>
        <CardDescription>Share these so customers can pay you by ACH or wire.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="details-account" className="text-sm font-medium">
            Account
          </label>
          <NativeSelect
            id="details-account"
            value={account.id}
            onChange={(e) => {
              setAccountId(e.target.value)
              setRevealed(false)
            }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {accountLabel(a)}
              </option>
            ))}
          </NativeSelect>
        </div>

        <dl className="divide-y rounded-lg border text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground shrink-0">
                {r.label}
                {r.hint && <span className="block text-xs">{r.hint}</span>}
              </dt>
              <dd className="flex min-w-0 items-center gap-1">
                <span className="tabular truncate font-medium">{r.display ?? r.value}</span>
                {r.revealable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={revealed ? 'Hide account number' : 'Show account number'}
                    aria-pressed={revealed}
                    onClick={() => setRevealed(!revealed)}
                  >
                    {revealed ? <EyeOff /> : <Eye />}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Copy ${r.label.toLowerCase()}`}
                  onClick={() => void copy(r.label, r.value)}
                >
                  {copied === r.label ? <Check className="text-positive" /> : <Copy />}
                </Button>
              </dd>
            </div>
          ))}
        </dl>
        <p aria-live="polite" className="sr-only">
          {copied ? `${copied} copied` : ''}
        </p>
      </CardContent>
    </Card>
  )
}
