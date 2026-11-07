import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { useAccounts, useTransaction, useUpdateMemo } from '@/api/queries'
import { MEMO_MAX, METHOD_LABEL } from '@/api/schemas'
import { Amount } from '@/components/shared/Amount'
import { CounterpartyAvatar } from '@/components/shared/CounterpartyAvatar'
import { ErrorState } from '@/components/shared/States'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { accountLabelById } from '@/lib/account'
import { formatDate, formatDateTime } from '@/lib/date'
import { cn } from '@/lib/utils'

/**
 * Transaction detail drawer. `id` is the transaction to show; `open` is controlled separately
 * so the last transaction stays rendered while the close animation runs.
 */
export function TransactionDetail({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  // Opened from table rows rather than a SheetTrigger, so Radix has no trigger to return focus to.
  // Remember whatever was focused when the drawer opened and restore it on close.
  const returnFocus = useRef<HTMLElement | null>(null)
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-[448px]"
        onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(e) => {
          if (returnFocus.current?.isConnected) {
            e.preventDefault()
            returnFocus.current.focus()
          }
        }}
      >
        {id && <DetailBody id={id} />}
      </SheetContent>
    </Sheet>
  )
}

const TIMELINE_DOT = {
  posted: 'bg-positive border-positive',
  pending: 'bg-warning border-warning',
  failed: 'bg-destructive border-destructive',
  initiated: 'bg-card border-muted-foreground/40',
} as const

function DetailBody({ id }: { id: string }) {
  const tx = useTransaction(id)
  const accounts = useAccounts()
  return (
    <>
      <SheetHeader className="border-hairline gap-1 border-b px-6 py-5 pr-16">
        <SheetTitle>Transaction</SheetTitle>
        <SheetDescription>
          {tx.data ? `${tx.data.counterparty} · ${formatDate(tx.data.date)}` : 'Loading transaction details'}
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto p-6">
        {tx.isError && <ErrorState error={tx.error} onRetry={() => tx.refetch()} />}
        {tx.isPending && <Skeleton className="h-40" />}
        {tx.data && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3.5">
              <CounterpartyAvatar name={tx.data.counterparty} category={tx.data.category} size="lg" />
              <div className="min-w-0">
                <Amount
                  cents={tx.data.amountCents}
                  className={cn('block text-[30px] leading-9 font-semibold tracking-[-0.03em]', tx.data.status === 'failed' && 'line-through opacity-60')}
                />
                <div className="mt-0.5 flex items-center gap-2 text-sm">
                  <span className="truncate">{tx.data.counterparty}</span> <StatusBadge status={tx.data.status} />
                </div>
              </div>
            </div>
            <dl className="bg-surface-muted grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 rounded-xl p-4 text-sm">
              <dt className="text-muted-foreground">Category</dt><dd>{tx.data.category}</dd>
              <dt className="text-muted-foreground">Method</dt><dd>{METHOD_LABEL[tx.data.method]}</dd>
              {tx.data.cardLast4 && (<><dt className="text-muted-foreground">Card</dt><dd>••{tx.data.cardLast4}</dd></>)}
              <dt className="text-muted-foreground">Account</dt><dd>{accountLabelById(accounts.data, tx.data.accountId)}</dd>
              <dt className="text-muted-foreground">ID</dt><dd className="font-mono text-xs leading-5 break-all">{tx.data.id}</dd>
            </dl>
            <div>
              <h3 className="mb-3 text-[13px] font-semibold">Timeline</h3>
              <ol className="flex flex-col">
                {tx.data.timeline.map((t, i, all) => {
                  const last = i === all.length - 1
                  return (
                    <li key={i} className="flex gap-3">
                      <div aria-hidden className="flex w-2.5 flex-col items-center">
                        <span className={cn('mt-[5px] size-2.5 shrink-0 rounded-full border-2', last ? TIMELINE_DOT[t.status] : TIMELINE_DOT.initiated)} />
                        {!last && <span className="bg-border w-[1.5px] flex-1" />}
                      </div>
                      <div className="pb-3.5 text-sm">
                        <div className="font-medium capitalize">{t.status}</div>
                        <div className="text-muted-foreground text-xs">{formatDateTime(t.at)}</div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
            {/* Keyed so the draft resets when the saved memo changes */}
            <MemoForm key={`${tx.data.id}:${tx.data.memo}`} id={tx.data.id} saved={tx.data.memo} />
          </div>
        )}
      </div>
      <SheetFooter className="border-hairline border-t px-6 py-3.5">
        {/* TODO: generate a PDF receipt */}
        <Button variant="outline" disabled title="Receipts coming soon">
          <Download /> Download receipt
        </Button>
      </SheetFooter>
    </>
  )
}

function MemoForm({ id, saved }: { id: string; saved: string }) {
  const updateMemo = useUpdateMemo()
  const [memo, setMemo] = useState(saved)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        updateMemo.mutate({ id, memo })
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="memo" className="text-[13px] font-semibold">Memo</label>
      <Input id="memo" value={memo} maxLength={MEMO_MAX} onChange={(e) => setMemo(e.target.value)} placeholder="Add a note" />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" className="h-8 text-[13px]" disabled={updateMemo.isPending || memo === saved}>
          {updateMemo.isPending ? 'Saving…' : 'Save memo'}
        </Button>
        {updateMemo.isError && <span className="text-destructive text-sm">{updateMemo.error.message}</span>}
      </div>
    </form>
  )
}
