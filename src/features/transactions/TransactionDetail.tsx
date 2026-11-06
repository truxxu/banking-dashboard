import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useTransaction, useUpdateMemo } from '@/api/queries'
import { Amount } from '@/components/shared/Amount'
import { ErrorState } from '@/components/shared/States'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Minimal detail panel. TODO: turn into a proper drawer (`npx shadcn add sheet`)
 * with focus trapping, and add a "Download receipt" action.
 */
export function TransactionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const tx = useTransaction(id)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside aria-label="Transaction details" className="bg-card fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l shadow-xl">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="font-semibold">Transaction</h2>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X /></Button>
      </div>
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
              <dt className="text-muted-foreground">Method</dt><dd className="uppercase">{tx.data.method}</dd>
              {tx.data.cardLast4 && (<><dt className="text-muted-foreground">Card</dt><dd>••{tx.data.cardLast4}</dd></>)}
              <dt className="text-muted-foreground">ID</dt><dd className="font-mono text-xs">{tx.data.id}</dd>
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-medium">Timeline</h3>
              <ol className="border-l pl-4 text-sm">
                {tx.data.timeline.map((t, i) => (
                  <li key={i} className="mb-2 capitalize">
                    {t.status} <span className="text-muted-foreground normal-case">· {new Date(t.at).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            </div>
            {/* Keyed so the draft resets when the saved memo changes */}
            <MemoForm key={`${tx.data.id}:${tx.data.memo}`} id={tx.data.id} saved={tx.data.memo} />
          </div>
        )}
      </div>
    </aside>
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
      <Input id="memo" value={memo} maxLength={140} onChange={(e) => setMemo(e.target.value)} placeholder="Add a note" />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={updateMemo.isPending || memo === saved}>
          {updateMemo.isPending ? 'Saving…' : 'Save memo'}
        </Button>
        {updateMemo.isError && <span className="text-destructive text-sm">{updateMemo.error.message}</span>}
      </div>
    </form>
  )
}
