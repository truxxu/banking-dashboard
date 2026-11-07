import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, toSearchParams } from './client'
import { REQUEST_PAY_MS, SETTLE_MS, type PaymentRequestInput, type TransactionQuery, type TransferRequest } from './schemas'
import type { Account, Customer, Paginated, PaymentRequest, Recipient, Summary, Transaction } from './types'

/** Centralised query keys so invalidation stays consistent. */
export const qk = {
  accounts: ['accounts'] as const,
  recipients: ['recipients'] as const,
  customers: ['customers'] as const,
  paymentRequests: ['payment-requests'] as const,
  summary: (days: number) => ['summary', days] as const,
  transactions: (q: TransactionQuery) => ['transactions', q] as const,
  transaction: (id: string) => ['transaction', id] as const,
}

export const useAccounts = () =>
  useQuery({ queryKey: qk.accounts, queryFn: () => api<Account[]>('/accounts') })

export const useRecipients = () =>
  useQuery({ queryKey: qk.recipients, queryFn: () => api<Recipient[]>('/recipients'), staleTime: Infinity })

export const useCustomers = () =>
  useQuery({ queryKey: qk.customers, queryFn: () => api<Customer[]>('/customers'), staleTime: Infinity })

export const usePaymentRequests = () =>
  useQuery({ queryKey: qk.paymentRequests, queryFn: () => api<PaymentRequest[]>('/payment-requests') })

export const useSummary = (days: number) =>
  useQuery({ queryKey: qk.summary(days), queryFn: () => api<Summary>(`/summary?days=${days}`) })

export const useTransactions = (query: TransactionQuery) =>
  useQuery({
    queryKey: qk.transactions(query),
    queryFn: () => api<Paginated<Transaction>>(`/transactions${toSearchParams(query)}`),
    // Keep the current page on screen while the next filter/page loads.
    placeholderData: keepPreviousData,
  })

export const useTransaction = (id: string | null) =>
  useQuery({
    queryKey: qk.transaction(id ?? ''),
    queryFn: () => api<Transaction>(`/transactions/${id}`),
    enabled: Boolean(id),
  })

/** Everything that depends on balances or the ledger. */
function invalidateLedger(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: qk.accounts }),
    qc.invalidateQueries({ queryKey: ['summary'] }),
    qc.invalidateQueries({ queryKey: ['transactions'] }),
    qc.invalidateQueries({ queryKey: ['transaction'] }),
  ])
}

export function useUpdateMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, memo }: { id: string; memo: string }) =>
      api<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify({ memo }) }),
    onSuccess: (tx) => {
      qc.setQueryData(qk.transaction(tx.id), tx)
      return qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useCreateTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TransferRequest) =>
      api<Transaction>('/transfers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void invalidateLedger(qc)
      // Refetch again once the mock bank has settled the transfer (pending → posted).
      setTimeout(() => void invalidateLedger(qc), SETTLE_MS + 500)
    },
  })
}

export function useCreatePaymentRequest() {
  const qc = useQueryClient()
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: qk.paymentRequests }), invalidateLedger(qc)])
  return useMutation({
    mutationFn: (body: PaymentRequestInput) =>
      api<PaymentRequest>('/payment-requests', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.paymentRequests })
      // The mock customer pays (open → paid, pending deposit), then the deposit posts.
      // Chained, not two fixed timers: the deposit's settleAt is set while the first refresh is
      // being served (after its own latency), so the second waits SETTLE_MS from that point.
      setTimeout(() => {
        void refresh()
          .catch(() => {})
          .then(() => setTimeout(() => void refresh(), SETTLE_MS + 500))
      }, REQUEST_PAY_MS + 500)
    },
  })
}

export function useCancelPaymentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<PaymentRequest>(`/payment-requests/${id}/cancel`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.paymentRequests }),
  })
}

export function useResetDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/demo/reset', { method: 'POST' }),
    onSuccess: () => qc.resetQueries(),
  })
}
