import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import type { Account, Transaction } from '@/api/types'
import { Amount } from '@/components/shared/Amount'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { METHOD_LABEL } from '@/features/payments/transfer'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/date'
import { cn } from '@/lib/utils'

// TanStack Table v9: features and columns are defined at module scope (stable references).
// Filtering/pagination happen on the "server" (MSW), so only the core row model is needed.
const features = tableFeatures({})
const col = createColumnHelper<typeof features, Transaction & { accountLabel: string }>()
const columns = col.columns([
  col.accessor('date', { header: 'Date', cell: (c) => <span className="text-muted-foreground">{formatDate(c.getValue())}</span> }),
  col.accessor('counterparty', {
    header: 'To / From',
    cell: (c) => (
      <div className="max-w-64 truncate font-medium">
        {c.getValue()}
        {c.row.original.memo && <div className="text-muted-foreground truncate text-xs font-normal">{c.row.original.memo}</div>}
      </div>
    ),
  }),
  col.accessor('category', { header: 'Category' }),
  col.accessor('accountLabel', { header: 'Account', cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span> }),
  col.accessor('method', { header: 'Method', cell: (c) => METHOD_LABEL[c.getValue()] }),
  col.accessor('status', { header: 'Status', cell: (c) => <StatusBadge status={c.getValue()} /> }),
  col.accessor('amountCents', {
    header: () => <span className="block text-right">Amount</span>,
    cell: (c) => <Amount cents={c.getValue()} className={cn('block text-right font-medium', c.row.original.status === 'failed' && 'line-through opacity-60')} />,
  }),
])

export function TransactionsTable({
  rows,
  accounts,
  onSelect,
  selectedId,
}: {
  rows: Transaction[]
  accounts: Account[]
  onSelect: (id: string) => void
  selectedId: string | null
}) {
  const byId = new Map(accounts.map((a) => [a.id, `${a.name} ••${a.mask}`]))
  const data = rows.map((r) => ({ ...r, accountLabel: byId.get(r.accountId) ?? '—' }))
  const table = useTable({ features, columns, data, getRowId: (r) => r.id })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((g) => (
          <TableRow key={g.id} className="hover:bg-transparent">
            {g.headers.map((h) => (
              <TableHead key={h.id}>{h.isPlaceholder ? null : <table.FlexRender header={h} />}</TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={row.id === selectedId ? 'selected' : undefined}
            tabIndex={0}
            className="cursor-pointer"
            onClick={() => onSelect(row.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(row.id))}
          >
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
