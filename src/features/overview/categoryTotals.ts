import type { CashFlowPoint, Category } from '@/api/types'
import type { Cents } from '@/lib/money'

export type FlowDirection = 'in' | 'out'

export interface CategoryTotal {
  /** Undefined for the folded "Other" row. */
  category?: Category
  label: string
  totalCents: Cents
}

/**
 * Sums daily per-category flows into one total per category, largest first.
 * Beyond `maxRows` categories the tail folds into "Other" (only if that saves a row).
 */
export function buildCategoryTotals(series: CashFlowPoint[], direction: FlowDirection, maxRows = 5): CategoryTotal[] {
  const totals = new Map<Category, Cents>()
  for (const p of series) {
    const byCategory = direction === 'in' ? p.inByCategory : p.outByCategory
    for (const [cat, cents] of Object.entries(byCategory) as [Category, Cents][]) {
      totals.set(cat, (totals.get(cat) ?? 0) + cents)
    }
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const keep = ranked.length > maxRows + 1 ? ranked.slice(0, maxRows) : ranked
  const rows: CategoryTotal[] = keep.map(([category, totalCents]) => ({ category, label: category, totalCents }))
  const folded = ranked.slice(keep.length)
  if (folded.length > 0) rows.push({ label: 'Other', totalCents: folded.reduce((s, [, c]) => s + c, 0) })
  return rows
}
