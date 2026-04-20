import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || error.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type ConnectorStatus = 'online' | 'offline' | 'error' | 'unknown'
export type AuthType = 'none' | 'basic' | 'apikey' | 'bearer' | 'passhash'

export interface Connector {
  id: string
  name: string
  type: string
  description: string | null
  base_url: string
  auth_type: AuthType
  status: ConnectorStatus
  capabilities: string[]
  metadata: Record<string, unknown>
  last_probe_at: string | null
  last_probe_error: string | null
  created_at: string
  updated_at: string
  verify_ssl?: boolean
  timeout?: number
}

export interface ConnectorType {
  type: string
  label: string
  description: string
  category: string
  icon: string
  defaultPort: number
  authTypes: AuthType[]
  docsUrl: string | null
}

export interface ProbeResult {
  online: boolean
  capabilities: string[]
  metadata: Record<string, unknown>
  error?: string
  duration_ms: number
}

export interface DashboardSummary {
  connectors: {
    total: number
    online: number
    offline: number
    error: number
    unknown: number
  }
  byType: Array<{ type: string; count: number }>
  recentActivity: Array<{
    id: number
    connector_id: string
    connector_name: string
    connector_type: string
    action: string
    status: string
    message: string | null
    duration_ms: number
    created_at: string
  }>
  issues: Array<{
    id: string
    name: string
    type: string
    status: ConnectorStatus
    last_probe_error: string | null
    last_probe_at: string | null
  }>
}

// ────────────────────────────────────────────────────────────────
// API Functions
// ────────────────────────────────────────────────────────────────

export const connectorsApi = {
  list: () => api.get<Connector[]>('/connectors').then(r => r.data),
  get: (id: string) => api.get<Connector>(`/connectors/${id}`).then(r => r.data),
  types: () => api.get<ConnectorType[]>('/connectors/types').then(r => r.data),
  create: (data: Partial<Connector> & { credentials?: Record<string, string> }) =>
    api.post<Connector>('/connectors', data).then(r => r.data),
  update: (id: string, data: Partial<Connector> & { credentials?: Record<string, string> }) =>
    api.put(`/connectors/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/connectors/${id}`).then(r => r.data),
  execute: (id: string, capability: string, params?: Record<string, unknown>) =>
    api.post(`/connectors/${id}/execute`, { capability, params }).then(r => r.data),
  logs: (id: string, limit = 50) =>
    api.get(`/connectors/${id}/logs`, { params: { limit } }).then(r => r.data),
}

export const probeApi = {
  probe: (connectorId: string) =>
    api.post<ProbeResult>(`/probe/${connectorId}`).then(r => r.data),
  probeAll: () =>
    api.post('/probe/batch/all').then(r => r.data),
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary').then(r => r.data),
  connectorsStatus: () => api.get<Connector[]>('/dashboard/connectors-status').then(r => r.data),
}

export const settingsApi = {
  getAll: () => api.get<Record<string, string>>('/settings').then(r => r.data),
  update: (settings: Record<string, string>) => api.put('/settings', settings).then(r => r.data),
}
