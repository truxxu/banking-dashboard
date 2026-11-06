import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { transactionQuerySchema, type TransactionQuery } from '@/api/schemas'

const FILTER_KEYS = ['q', 'accountId', 'category', 'status', 'direction', 'from', 'to'] as const

/**
 * Filters live in the URL so a filtered view survives refresh and can be shared.
 * Invalid params are dropped instead of crashing the page.
 */
export function useTransactionFilters() {
  const [params, setParams] = useSearchParams()

  const query = useMemo<TransactionQuery>(() => {
    const raw = Object.fromEntries([...params].filter(([k]) => (FILTER_KEYS as readonly string[]).includes(k) || k === 'page'))
    const parsed = transactionQuerySchema.safeParse(raw)
    return parsed.success ? { ...parsed.data, pageSize: 25 } : { page: 1, pageSize: 25 }
  }, [params])

  const setFilter = useCallback(
    (key: (typeof FILTER_KEYS)[number] | 'page', value: string | undefined) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          if (key !== 'page') next.delete('page') // new filter → back to page 1
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clearFilters = useCallback(() => setParams({}, { replace: true }), [setParams])

  const selectedId = params.get('tx')
  const setSelectedId = useCallback(
    (id: string | null) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set('tx', id)
        else next.delete('tx')
        return next
      }),
    [setParams],
  )

  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length

  return { query, setFilter, clearFilters, activeCount, selectedId, setSelectedId }
}
