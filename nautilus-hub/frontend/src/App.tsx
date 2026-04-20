import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Layout } from '@/components/layout/Layout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ConnectorsPage } from '@/pages/ConnectorsPage'
import { ConnectorDetailPage } from '@/pages/ConnectorDetailPage'
import { AddConnectorPage } from '@/pages/AddConnectorPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="connectors" element={<ConnectorsPage />} />
          <Route path="connectors/new" element={<AddConnectorPage />} />
          <Route path="connectors/:id" element={<ConnectorDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}
