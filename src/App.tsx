import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { OverviewPage } from '@/pages/OverviewPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { ReceivePage } from '@/pages/ReceivePage'
import { RequestsPage } from '@/pages/RequestsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="receive" element={<ReceivePage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
