import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { useTransaction, useUpdateMemo } from '@/api/queries'
import { MEMO_MAX, METHOD_LABEL } from '@/api/schemas'
import { Amount } from '@/components/shared/Amount'
import { ErrorState } from '@/components/shared/States'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatDateTime } from '@/lib/date'

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
        className="w-full gap-0 sm:max-w-md"
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

function DetailBody({ id }: { id: string }) {
  const tx = useTransaction(id)
  return (
    <>
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>Transaction</SheetTitle>
        <SheetDescription>
          {tx.data ? `${tx.data.counterparty} · ${formatDate(tx.data.date)}` : 'Loading transaction details'}
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto p-5">
        {tx.isError && <ErrorState error={tx.error} onRetry={() => tx.refetch()} />}
        {tx.isPending && <Skeleton className="h-40" />}
        {tx.data && (
          <div className="flex flex-col gap-6">
            <div>
              <Amount cents={tx.data.amountCents} className="text-3xl font-semibold" />
              <div className="mt-1 flex items-center gap-2 text-sm">
                {tx.data.counterparty} <StatusBadge status={tx.data.status} />
              </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Category</dt><dd>{tx.data.category}</dd>
              <dt className="text-muted-foreground">Method</dt><dd>{METHOD_LABEL[tx.data.method]}</dd>
              {tx.data.cardLast4 && (<><dt className="text-muted-foreground">Card</dt><dd>••{tx.data.cardLast4}</dd></>)}
              <dt className="text-muted-foreground">ID</dt><dd className="font-mono text-xs">{tx.data.id}</dd>
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-medium">Timeline</h3>
              <ol className="border-l pl-4 text-sm">
                {tx.data.timeline.map((t, i) => (
                  <li key={i} className="mb-2 capitalize">
                    {t.status} <span className="text-muted-foreground normal-case">· {formatDateTime(t.at)}</span>
                  </li>
                ))}
              </ol>
            </div>
            {/* Keyed so the draft resets when the saved memo changes */}
            <MemoForm key={`${tx.data.id}:${tx.data.memo}`} id={tx.data.id} saved={tx.data.memo} />
          </div>
        )}
      </div>
      <SheetFooter className="border-t px-5 py-3">
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
      <label htmlFor="memo" className="text-sm font-medium">Memo</label>
      <Input id="memo" value={memo} maxLength={MEMO_MAX} onChange={(e) => setMemo(e.target.value)} placeholder="Add a note" />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={updateMemo.isPending || memo === saved}>
          {updateMemo.isPending ? 'Saving…' : 'Save memo'}
        </Button>
        {updateMemo.isError && <span className="text-destructive text-sm">{updateMemo.error.message}</span>}
      </div>
    </form>
  )
}
