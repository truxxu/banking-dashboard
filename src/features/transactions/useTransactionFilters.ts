import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toSearchParams } from '@/api/client'
import { transactionQuerySchema, type TransactionQuery } from '@/api/schemas'

const FILTER_KEYS = ['q', 'accountId', 'category', 'status', 'direction', 'from', 'to'] as const

/** Link to the transactions page with these filters applied, and optionally a transaction open (`tx`). */
export const transactionsHref = (filters: TransactionQuery & { tx?: string }) => `/transactions${toSearchParams(filters)}`

/**
 * Filters live in the URL so a filtered view survives refresh and can be shared.
 * Invalid params are dropped instead of crashing the page.
 */
export function useTransactionFilters() {
  const [params, setParams] = useSearchParams()

  // Every field is optional or has a .catch, so parsing can't fail; unknown params (tx, …) are stripped.
  const query = useMemo<TransactionQuery>(
    () => ({ ...transactionQuerySchema.parse(Object.fromEntries(params)), pageSize: 25 }),
    [params],
  )

  /** Sets or clears params in one URL update; changing a filter goes back to page 1. */
  const update = useCallback(
    (entries: Record<string, string | undefined>, { resetPage = true, replace = true } = {}) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(entries)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          if (resetPage) next.delete('page')
          return next
        },
        { replace },
      ),
    [setParams],
  )

  const setFilter = useCallback(
    (key: (typeof FILTER_KEYS)[number] | 'page', value: string | undefined) => update({ [key]: value }, { resetPage: key !== 'page' }),
    [update],
  )

  /** Sets both ends of the date range in one URL update (one fetch). */
  const setDateRange = useCallback((from: string | undefined, to: string | undefined) => update({ from, to }), [update])

  const clearFilters = useCallback(() => setParams({}, { replace: true }), [setParams])

  const selectedId = params.get('tx')
  const setSelectedId = useCallback(
    (id: string | null) => update({ tx: id ?? undefined }, { resetPage: false, replace: false }),
    [update],
  )

  // Count only filters that survived parsing; from/to count as a single "date" filter.
  const activeCount = FILTER_KEYS.filter((k) => k !== 'to' && (query[k] || (k === 'from' && query.to))).length

  return { query, setFilter, setDateRange, clearFilters, activeCount, selectedId, setSelectedId }
}
