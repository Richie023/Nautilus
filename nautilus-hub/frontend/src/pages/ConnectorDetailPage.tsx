import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, RefreshCw, Trash2, Shield, ShieldOff, Scan,
  Plus, Pencil, X, UserPlus
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { connectorsApi, probeApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CapabilityBadge } from '@/components/connectors/CapabilityBadge'
import { toast } from '@/hooks/use-toast'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function StatusBadgeInline({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  let color = 'bg-gray-500'
  if (s.includes('up') || s.includes('ok') || s.includes('active')) color = 'bg-green-500'
  else if (s.includes('down') || s.includes('error')) color = 'bg-red-500'
  else if (s.includes('warn')) color = 'bg-yellow-500'
  else if (s.includes('pause') || s.includes('isolat')) color = 'bg-orange-400'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium ${color}`}>
      {status || '—'}
    </span>
  )
}

// ─── Modal base ───────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{title}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, placeholder = '', required = false }: {
  label: string, value: string, onChange: (v: string) => void,
  placeholder?: string, required?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}{required && ' *'}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all"
      />
    </div>
  )
}

// ─── Modals CRUD ──────────────────────────────────────────────────────────────

function GroupModal({ connectorId, group, onClose, onSuccess }: {
  connectorId: string, group?: any, onClose: () => void, onSuccess: () => void
}) {
  const [name, setName] = useState(group?.name || '')
  const [description, setDescription] = useState(group?.description || '')
  const [loading, setLoading] = useState(false)
  const isEdit = !!group

  const submit = async () => {
    if (!name) return
    setLoading(true)
    try {
      if (isEdit) {
        await connectorsApi.execute(connectorId, 'update_group', { id: group.id, name, description })
        toast({ title: 'Grupo actualizado' })
      } else {
        await connectorsApi.execute(connectorId, 'create_group', { name, description })
        toast({ title: 'Grupo creado' })
      }
      onSuccess()
      onClose()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <Modal title={isEdit ? 'Editar Grupo' : 'Crear Grupo'} onClose={onClose}>
      <div className="space-y-3">
        <InputField label="Nombre" value={name} onChange={setName} required />
        <InputField label="Descripción" value={description} onChange={setDescription} />
        <Button size="sm" onClick={submit} disabled={loading || !name} className="w-full">
          {loading ? (isEdit ? 'Guardando...' : 'Creando...') : (isEdit ? 'Guardar cambios' : 'Crear Grupo')}
        </Button>
      </div>
    </Modal>
  )
}

function PolicyModal({ connectorId, policy, onClose, onSuccess }: {
  connectorId: string, policy?: any, onClose: () => void, onSuccess: () => void
}) {
  const [name, setName] = useState(policy?.name || '')
  const [description, setDescription] = useState(policy?.description || '')
  const [loading, setLoading] = useState(false)
  const isEdit = !!policy

  const submit = async () => {
    if (!name) return
    setLoading(true)
    try {
      if (isEdit) {
        await connectorsApi.execute(connectorId, 'update_policy', { id: policy.id, name, description })
        toast({ title: 'Política actualizada' })
      } else {
        await connectorsApi.execute(connectorId, 'create_policy', { name, description })
        toast({ title: 'Política creada' })
      }
      onSuccess()
      onClose()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <Modal title={isEdit ? 'Editar Política' : 'Crear Política'} onClose={onClose}>
      <div className="space-y-3">
        <InputField label="Nombre" value={name} onChange={setName} required />
        <InputField label="Descripción" value={description} onChange={setDescription} />
        <Button size="sm" onClick={submit} disabled={loading || !name} className="w-full">
          {loading ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear Política')}
        </Button>
      </div>
    </Modal>
  )
}

function ExclusionModal({ connectorId, onClose, onSuccess }: {
  connectorId: string, onClose: () => void, onSuccess: () => void
}) {
  const [type, setType] = useState('path')
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!value) return
    setLoading(true)
    try {
      await connectorsApi.execute(connectorId, 'create_exclusion', { type, value, description })
      toast({ title: 'Exclusión creada' })
      onSuccess()
      onClose()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Crear Exclusión" onClose={onClose}>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tipo</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 outline-none focus:border-cyan-500">
            <option value="path">Path</option>
            <option value="sha256">SHA256</option>
            <option value="md5">MD5</option>
            <option value="domain">Domain</option>
            <option value="ip">IP</option>
          </select>
        </div>
        <InputField label="Valor" value={value} onChange={setValue}
          placeholder={type === 'path' ? 'C:\\Program Files\\...' : type === 'domain' ? 'example.com' : ''}
          required />
        <InputField label="Descripción" value={description} onChange={setDescription} />
        <Button size="sm" onClick={submit} disabled={loading || !value} className="w-full">
          {loading ? 'Creando...' : 'Crear Exclusión'}
        </Button>
      </div>
    </Modal>
  )
}

function InviteAdminModal({ connectorId, onClose, onSuccess }: {
  connectorId: string, onClose: () => void, onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Administrator')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email) return
    setLoading(true)
    try {
      await connectorsApi.execute(connectorId, 'invite_admin', { email, role })
      toast({ title: `Invitación enviada a ${email}` })
      onSuccess()
      onClose()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Invitar Admin" onClose={onClose}>
      <div className="space-y-3">
        <InputField label="Email" value={email} onChange={setEmail} placeholder="admin@empresa.com" required />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Rol</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 outline-none focus:border-cyan-500">
            <option value="Administrator">Administrator</option>
            <option value="SuperAdmin">SuperAdmin</option>
            <option value="ReadOnly">ReadOnly</option>
          </select>
        </div>
        <Button size="sm" onClick={submit} disabled={loading || !email} className="w-full">
          {loading ? 'Enviando...' : 'Enviar Invitación'}
        </Button>
      </div>
    </Modal>
  )
}

function ConfirmModal({ title, message, onConfirm, onClose }: {
  title: string, message: string, onConfirm: () => void, onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button size="sm" variant="destructive" onClick={onConfirm} className="flex-1">Eliminar</Button>
      </div>
    </Modal>
  )
}

// ─── Vistas PRTG ─────────────────────────────────────────────────────────────

function ItemList({ items, onSelect }: { items: any[], onSelect?: (id: any) => void }) {
  const [search, setSearch] = useState('')
  const filtered = items.filter((item: any) => {
    const name = item.device || item.sensor || item.group || item.probe || item.name || item.host_name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })
  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin datos</p>
  return (
    <div>
      <div className="px-3 py-2 border-b">
        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full text-xs bg-secondary/30 border border-border rounded px-2 py-1 outline-none focus:border-cyan-500" />
      </div>
      <p className="text-xs px-3 py-1 text-muted-foreground">{filtered.length} de {items.length} items</p>
      <div className="divide-y">
        {filtered.map((item: any, i: number) => (
          <div key={i} onClick={() => onSelect?.(item.objid ?? item.id)}
            className="px-3 py-2 hover:bg-secondary/30 cursor-pointer flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">
                {item.device || item.sensor || item.group || item.probe || item.name || item.host_name || '—'}
              </p>
              {item.host && <p className="text-xs text-muted-foreground">{item.host}</p>}
              {item.lastvalue && <p className="text-xs text-muted-foreground">{item.lastvalue}</p>}
              {item.message && <p className="text-xs text-muted-foreground truncate">{stripHtml(item.message)}</p>}
            </div>
            {item.status && <StatusBadgeInline status={item.status} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function LogsList({ items }: { items: any[] }) {
  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin logs</p>
  return (
    <div className="divide-y">
      {items.map((item: any, i: number) => (
        <div key={i} className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground shrink-0">{item.datetime}</span>
            <span className="text-xs font-medium truncate flex-1">{item.name}</span>
            <StatusBadgeInline status={item.status || item.type || ''} />
          </div>
          {item.message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{stripHtml(item.message)}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Vistas Threatdown con CRUD ───────────────────────────────────────────────

function ThreatdownEndpointsList({ items, onSelect }: { items: any[], onSelect?: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = items.filter((e: any) =>
    (e.host_name || e.name || '').toLowerCase().includes(search.toLowerCase())
  )
  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin endpoints</p>
  return (
    <div>
      <div className="px-3 py-2 border-b">
        <input type="text" placeholder="Buscar endpoint..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full text-xs bg-secondary/30 border border-border rounded px-2 py-1 outline-none focus:border-cyan-500" />
      </div>
      <p className="text-xs px-3 py-1 text-muted-foreground">{filtered.length} de {items.length} endpoints</p>
      <div className="divide-y">
        {filtered.map((e: any, i: number) => (
          <div key={i} onClick={() => onSelect?.(e.id)}
            className="px-3 py-2 hover:bg-secondary/30 cursor-pointer flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{e.host_name || e.name || '—'}</p>
              <p className="text-xs text-muted-foreground">{e.ip_address || e.os_version || ''}</p>
            </div>
            <StatusBadgeInline status={e.status || e.isolation_status || ''} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ThreatdownGroupsList({ items, onSelect, connectorId, onRefresh }: {
  items: any[], onSelect?: (id: string) => void,
  connectorId: string, onRefresh: () => void
}) {
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)

  const handleDelete = async () => {
    try {
      await connectorsApi.execute(connectorId, 'delete_group', { id: deleteItem.id })
      toast({ title: 'Grupo eliminado' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setDeleteItem(null)
  }

  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin grupos</p>
  return (
    <>
      {editItem && <GroupModal connectorId={connectorId} group={editItem} onClose={() => setEditItem(null)} onSuccess={onRefresh} />}
      {deleteItem && <ConfirmModal title="Eliminar grupo" message={`¿Eliminar "${deleteItem.name}"?`} onConfirm={handleDelete} onClose={() => setDeleteItem(null)} />}
      <div className="divide-y">
        {items.map((g: any, i: number) => (
          <div key={i} onClick={() => onSelect?.(g.id)}
            className="px-3 py-2 hover:bg-secondary/30 cursor-pointer flex items-center justify-between gap-2 group">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{g.name || '—'}</p>
              {g.description && <p className="text-xs text-muted-foreground truncate">{g.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {g.endpoint_count != null && (
                <span className="text-xs text-muted-foreground">{g.endpoint_count} endpoints</span>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); setEditItem(g) }}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={e => { e.stopPropagation(); setDeleteItem(g) }}
                  className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ThreatdownPoliciesList({ items, onSelect, connectorId, onRefresh }: {
  items: any[], onSelect?: (id: string) => void,
  connectorId: string, onRefresh: () => void
}) {
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)

  const handleDelete = async () => {
    try {
      await connectorsApi.execute(connectorId, 'delete_policy', { id: deleteItem.id })
      toast({ title: 'Política eliminada' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setDeleteItem(null)
  }

  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin políticas</p>
  return (
    <>
      {editItem && <PolicyModal connectorId={connectorId} policy={editItem} onClose={() => setEditItem(null)} onSuccess={onRefresh} />}
      {deleteItem && <ConfirmModal title="Eliminar política" message={`¿Eliminar "${deleteItem.name}"?`} onConfirm={handleDelete} onClose={() => setDeleteItem(null)} />}
      <div className="divide-y">
        {items.map((p: any, i: number) => (
          <div key={i} onClick={() => onSelect?.(p.id)}
            className="px-3 py-2 hover:bg-secondary/30 cursor-pointer flex items-center justify-between gap-2 group">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{p.name || '—'}</p>
              {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); setEditItem(p) }}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={e => { e.stopPropagation(); setDeleteItem(p) }}
                className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ThreatdownExclusionsList({ items, connectorId, onRefresh }: {
  items: any[], connectorId: string, onRefresh: () => void
}) {
  const [deleteItem, setDeleteItem] = useState<any>(null)

  const handleDelete = async () => {
    try {
      await connectorsApi.execute(connectorId, 'delete_exclusion', { id: deleteItem.id })
      toast({ title: 'Exclusión eliminada' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setDeleteItem(null)
  }

  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin exclusiones</p>
  return (
    <>
      {deleteItem && <ConfirmModal title="Eliminar exclusión" message={`¿Eliminar "${deleteItem.value}"?`} onConfirm={handleDelete} onClose={() => setDeleteItem(null)} />}
      <div className="divide-y">
        {items.map((e: any, i: number) => (
          <div key={i} className="px-3 py-2 flex items-center justify-between gap-2 group hover:bg-secondary/30">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{e.value || '—'}</p>
              {e.description && <p className="text-xs text-muted-foreground truncate">{e.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{e.type ?? ''}</span>
              <button onClick={() => setDeleteItem(e)}
                className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ThreatdownAdminsList({ items, connectorId, onRefresh }: {
  items: any[], connectorId: string, onRefresh: () => void
}) {
  const [deleteItem, setDeleteItem] = useState<any>(null)

  const handleDelete = async () => {
    try {
      await connectorsApi.execute(connectorId, 'delete_admin', { id: deleteItem.id })
      toast({ title: 'Admin eliminado' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setDeleteItem(null)
  }

  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin admins</p>
  return (
    <>
      {deleteItem && <ConfirmModal title="Eliminar admin" message={`¿Eliminar a "${deleteItem.email || deleteItem.name}"?`} onConfirm={handleDelete} onClose={() => setDeleteItem(null)} />}
      <div className="divide-y">
        {items.map((u: any, i: number) => (
          <div key={i} className="px-3 py-2 flex items-center justify-between gap-2 group hover:bg-secondary/30">
            <div>
              <p className="text-xs font-medium">{u.name || u.email || '—'}</p>
              {u.email && u.name && <p className="text-xs text-muted-foreground">{u.email}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{u.role || ''}</span>
              <button onClick={() => setDeleteItem(u)}
                className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Account View ─────────────────────────────────────────────────────────────

function ThreatdownAccountView({ data }: { data: any }) {
  const d = data?.data || data
  if (!d) return null
  const license = d.product_license_info?.[0]
  const expires = license?.license_expires_at
    ? new Date(license.license_expires_at).toLocaleDateString()
    : '—'
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{d.name || '—'}</p>
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Activo</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ['ID de cuenta', d.id?.slice(0, 8) + '...'],
          ['Licencia', license?.catalog_code || '—'],
          ['Seats', license?.licensed_seats ?? '—'],
          ['Vence', expires],
        ].map(([label, value]) => (
          <div key={label} className="bg-secondary/30 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xs font-medium mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ResultView ───────────────────────────────────────────────────────────────

function ResultView({ capability, data, onSelect, onSelectStr, connectorId, onRefresh }: {
  capability: string, data: any,
  onSelect?: (id: number) => void, onSelectStr?: (id: string) => void,
  connectorId: string, onRefresh: () => void
}) {
  if (!data) return null

  if (capability === 'account') return <ThreatdownAccountView data={data} />

  if (capability === 'status') {
    const d = data?.data || data
    const total = (d?.UpSens || 0) + (d?.WarnSens || 0) + (d?.DownSens || 0) + (d?.PausedSens || 0)
    const barData = [
      { name: 'Up', value: d?.UpSens || 0, color: '#22c55e' },
      { name: 'Warning', value: d?.WarnSens || 0, color: '#eab308' },
      { name: 'Down', value: d?.DownSens || 0, color: '#ef4444' },
      { name: 'Paused', value: d?.PausedSens || 0, color: '#6b7280' },
    ]
    return (
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {barData.map((c) => (
            <div key={c.name} className="rounded-lg p-3 text-center" style={{ border: `2px solid ${c.color}` }}>
              <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.name}</p>
            </div>
          ))}
        </div>
        <div className="flex rounded-full overflow-hidden h-2.5">
          {barData.filter(b => b.value > 0).map((b) => (
            <div key={b.name} style={{ width: `${(b.value / total) * 100}%`, background: b.color }} title={`${b.name}: ${b.value}`} />
          ))}
        </div>
      </div>
    )
  }

  if (['devices', 'sensors', 'alerts'].includes(capability)) {
    const items = data?.devices || data?.sensors || data?.alarms || []
    return <ItemList items={items} onSelect={onSelect} />
  }

  if (capability === 'groups' && !data?.groups?.some((g: any) => g.endpoint_count != null)) {
    const items = data?.devices || data?.groups || []
    return <ItemList items={items} onSelect={onSelect} />
  }

  if (capability === 'sensor_history') {
    const items: any[] = data?.data?.histdata || data?.histdata || []
    if (!items.length) return <p className="text-xs p-4 text-center text-muted-foreground">Sin historial</p>
    const chartData = items.slice(0, 60).map((h: any) => ({
      time: h.datetime?.split(' ')[1] || h.datetime,
      value: parseFloat(h.value_raw) || 0,
      label: h.value || '—',
    })).reverse()
    const values = chartData.map((d: any) => d.value)
    const min = Math.min(...values), max = Math.max(...values)
    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length
    return (
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Min', min], ['Promedio', avg], ['Max', max]].map(([label, val]) => (
            <div key={label as string} className="bg-secondary/30 rounded p-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold">{(val as number).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="w-full h-[200px] bg-secondary/20 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={45} />
              <Tooltip contentStyle={{ fontSize: 12, background: '#111827', border: '1px solid #333', borderRadius: '8px' }}
                formatter={(_: number, __: string, props: any) => [props.payload.label, 'Valor']} />
              <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (capability === 'device_details') {
    const d = Array.isArray(data) ? data[0] : data
    if (!d) return null
    return (
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{d.device || '—'}</p>
          <StatusBadgeInline status={d.status || ''} />
        </div>
        {d.host && <div className="flex gap-2 text-xs"><span className="text-muted-foreground">Host:</span><span className="font-medium">{d.host}</span></div>}
        {d.group && <div className="flex gap-2 text-xs"><span className="text-muted-foreground">Grupo:</span><span>{d.group}</span></div>}
        {d.message && <p className="text-xs text-muted-foreground border-t pt-2">{stripHtml(d.message)}</p>}
      </div>
    )
  }

  if (capability === 'sensor_details') {
    const sd = data?.data?.sensordata || data?.sensordata || data?.data || data
    return (
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{sd.name || '—'}</p>
          <StatusBadgeInline status={sd.statustext || sd.status || ''} />
        </div>
        {sd.parentgroupname && <p className="text-xs text-muted-foreground">Grupo: {sd.parentgroupname}</p>}
        {sd.lastvalue && <p className="text-xs">Último valor: <span className="font-medium">{sd.lastvalue}</span></p>}
        {sd.message && <p className="text-xs text-muted-foreground">{stripHtml(sd.message)}</p>}
      </div>
    )
  }

  if (capability === 'logs') return <LogsList items={Array.isArray(data) ? data : []} />

  if (capability === 'probes') {
    return (
      <div className="divide-y">
        {(Array.isArray(data) ? data : []).map((p: any, i: number) => (
          <div key={i} className="px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">{p.probe}</p>
              {p.location && <p className="text-xs text-muted-foreground">{p.location}</p>}
            </div>
            <StatusBadgeInline status={p.status || ''} />
          </div>
        ))}
      </div>
    )
  }

  if (capability === 'pause' || capability === 'acknowledge') {
    const ok = data?.success !== false
    return (
      <div className={`p-3 text-xs font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>
        {ok ? '✓ Acción ejecutada' : `✗ Error: ${data?.error || 'desconocido'}`}
      </div>
    )
  }

  if (capability === 'endpoints') {
    const items = data?.endpoints || data?.machines || []
    return <ThreatdownEndpointsList items={items} onSelect={onSelectStr} />
  }

  if (capability === 'detections') {
    const items = data?.detections || data?.threats || []
    if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin detecciones</p>
    return (
      <div className="divide-y">
        {items.map((d: any, i: number) => (
          <div key={i} className="px-3 py-2">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-medium truncate flex-1">{d.name || d.threat_name || '—'}</p>
              <StatusBadgeInline status={d.status || ''} />
            </div>
            <p className="text-xs text-muted-foreground">{d.endpoint_name || d.machine_name || ''}</p>
            {d.found_at && <p className="text-xs text-muted-foreground">{new Date(d.found_at).toLocaleString()}</p>}
          </div>
        ))}
      </div>
    )
  }

  if (capability === 'groups') {
    const items = data?.groups || (Array.isArray(data) ? data : [])
    return <ThreatdownGroupsList items={items} onSelect={onSelectStr} connectorId={connectorId} onRefresh={onRefresh} />
  }

  if (capability === 'policies') {
    const items = data?.policies || (Array.isArray(data) ? data : [])
    return <ThreatdownPoliciesList items={items} onSelect={onSelectStr} connectorId={connectorId} onRefresh={onRefresh} />
  }

  if (capability === 'exclusions') {
    const items = data?.exclusions || (Array.isArray(data) ? data : [])
    return <ThreatdownExclusionsList items={items} connectorId={connectorId} onRefresh={onRefresh} />
  }

  if (capability === 'admins') {
    const items = data?.admins || data?.users || (Array.isArray(data) ? data : [])
    return <ThreatdownAdminsList items={items} connectorId={connectorId} onRefresh={onRefresh} />
  }

  if (capability === 'suspicious_activity') {
    const items = data?.suspicious_activities || (Array.isArray(data) ? data : [])
    if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin actividad sospechosa</p>
    return (
      <div className="divide-y">
        {items.map((s: any, i: number) => (
          <div key={i} className="px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium truncate flex-1">{s.event_type || s.name || '—'}</p>
              <StatusBadgeInline status={s.status || s.severity || ''} />
            </div>
            <p className="text-xs text-muted-foreground">{s.endpoint_name || s.machine_name || ''}</p>
          </div>
        ))}
      </div>
    )
  }

  const isAction = ['isolate', 'deisolate', 'scan', 'delete_endpoint',
    'create_group', 'update_group', 'delete_group',
    'create_policy', 'update_policy', 'delete_policy',
    'create_exclusion', 'delete_exclusion',
    'invite_admin', 'delete_admin'].includes(capability)

  if (isAction) {
    const ok = data?.success !== false && !data?.error
    return (
      <div className={`p-3 text-xs font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>
        {ok
          ? `✓ ${data?.message || 'Operación exitosa'}${data?.job_id ? ` — Job: ${data.job_id}` : ''}`
          : `✗ Error: ${data?.error || 'desconocido'}`}
      </div>
    )
  }

  return (
    <pre className="text-xs p-3 whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

// ─── CapabilityPanel ─────────────────────────────────────────────────────────

function CapabilityPanel({
  connectorId, capability, connectorType,
  selectedId, setSelectedId,
  selectedStrId, setSelectedStrId,
}: {
  connectorId: string, capability: string, connectorType: string,
  selectedId: number | null, setSelectedId: (id: number) => void,
  selectedStrId: string | null, setSelectedStrId: (id: string) => void,
}) {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<string | null>(null)

  const isThreatdown = connectorType === 'threatdown'

  const execute = async (cap?: string, params?: Record<string, any>) => {
    const c = cap || capability
    setLoading(true)
    setError(null)
    try {
      const needsStrId = ['isolate', 'deisolate', 'scan', 'delete_endpoint'].includes(c)
      const needsNumId = ['device_details', 'sensor_details', 'sensor_history', 'pause', 'acknowledge'].includes(c)
      if (needsStrId && !selectedStrId) { setError('Selecciona un endpoint primero'); return }
      if (needsNumId && !selectedId) { setError('Selecciona un dispositivo o sensor primero'); return }
      const p = params ?? (needsStrId ? { id: selectedStrId } : needsNumId ? { id: selectedId } : {})
      const res = await connectorsApi.execute(connectorId, c, p)
      setResult(res.data)
      if (c === 'devices' && res.data?.devices?.length) setSelectedId(res.data.devices[0].objid)
      if (c === 'sensors' && res.data?.sensors?.length) setSelectedId(res.data.sensors[0].objid)
    } catch (err) {
      setError((err as Error).message)
    } finally { setLoading(false) }
  }

  const executePause = async (action: number) => {
    if (!selectedId) { setError('Selecciona un dispositivo primero'); return }
    setLoading(true)
    try {
      const res = await connectorsApi.execute(connectorId, 'pause', { id: selectedId, action })
      setResult(res.data)
    } catch (err) {
      setError((err as Error).message)
    } finally { setLoading(false) }
  }

  const renderButtons = () => {
    if (capability === 'pause') return (
      <>
        <Button size="sm" variant="outline" onClick={() => executePause(0)} disabled={loading}>⏸ Pausar</Button>
        <Button size="sm" variant="outline" onClick={() => executePause(1)} disabled={loading}>▶ Reanudar</Button>
      </>
    )

    if (isThreatdown && capability === 'endpoints') return (
      <>
        <Button size="sm" onClick={() => execute()} disabled={loading}>{loading ? '...' : 'Fetch'}</Button>
        <Button size="sm" variant="outline" onClick={() => execute('isolate')} disabled={loading || !selectedStrId} title="Aislar"><Shield className="w-3 h-3" /></Button>
        <Button size="sm" variant="outline" onClick={() => execute('deisolate')} disabled={loading || !selectedStrId} title="Des-aislar"><ShieldOff className="w-3 h-3" /></Button>
        <Button size="sm" variant="outline" onClick={() => execute('scan')} disabled={loading || !selectedStrId} title="Escanear"><Scan className="w-3 h-3" /></Button>
      </>
    )

    if (isThreatdown && capability === 'groups') return (
      <>
        <Button size="sm" onClick={() => execute()} disabled={loading}>{loading ? '...' : 'Fetch'}</Button>
        <Button size="sm" variant="outline" onClick={() => setModal('create_group')} title="Crear grupo"><Plus className="w-3 h-3" /></Button>
      </>
    )

    if (isThreatdown && capability === 'policies') return (
      <>
        <Button size="sm" onClick={() => execute()} disabled={loading}>{loading ? '...' : 'Fetch'}</Button>
        <Button size="sm" variant="outline" onClick={() => setModal('create_policy')} title="Crear política"><Plus className="w-3 h-3" /></Button>
      </>
    )

    if (isThreatdown && capability === 'exclusions') return (
      <>
        <Button size="sm" onClick={() => execute()} disabled={loading}>{loading ? '...' : 'Fetch'}</Button>
        <Button size="sm" variant="outline" onClick={() => setModal('create_exclusion')} title="Crear exclusión"><Plus className="w-3 h-3" /></Button>
      </>
    )

    if (isThreatdown && capability === 'admins') return (
      <>
        <Button size="sm" onClick={() => execute()} disabled={loading}>{loading ? '...' : 'Fetch'}</Button>
        <Button size="sm" variant="outline" onClick={() => setModal('invite_admin')} title="Invitar admin"><UserPlus className="w-3 h-3" /></Button>
      </>
    )

    return <Button size="sm" onClick={() => execute()} disabled={loading}>{loading ? '...' : 'Fetch'}</Button>
  }

  return (
    <>
      {modal === 'create_group' && <GroupModal connectorId={connectorId} onClose={() => setModal(null)} onSuccess={() => execute()} />}
      {modal === 'create_policy' && <PolicyModal connectorId={connectorId} onClose={() => setModal(null)} onSuccess={() => execute()} />}
      {modal === 'create_exclusion' && <ExclusionModal connectorId={connectorId} onClose={() => setModal(null)} onSuccess={() => execute()} />}
      {modal === 'invite_admin' && <InviteAdminModal connectorId={connectorId} onClose={() => setModal(null)} onSuccess={() => execute()} />}

      <div className="border rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-3 py-2 bg-secondary/30">
          <CapabilityBadge capability={capability} />
          <div className="flex gap-1.5">{renderButtons()}</div>
        </div>

        {(selectedId || selectedStrId) && (
          <p className="text-xs px-3 pt-1 text-muted-foreground">
            {isThreatdown
              ? selectedStrId ? `Endpoint: ...${selectedStrId.slice(-8)}` : ''
              : `ID: ${selectedId}`}
          </p>
        )}

        {error && <p className="text-xs text-red-400 p-3">{error}</p>}

        {result && (
          <div className="max-h-80 overflow-auto border-t">
            <ResultView
              capability={capability}
              data={result}
              onSelect={setSelectedId}
              onSelectStr={setSelectedStrId}
              connectorId={connectorId}
              onRefresh={() => execute()}
            />
          </div>
        )}
      </div>
    </>
  )
}

// ─── ConnectorDetailPage ──────────────────────────────────────────────────────

export function ConnectorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedStrId, setSelectedStrId] = useState<string | null>(null)

  const { data: connector } = useQuery({
    queryKey: ['connector', id],
    queryFn: () => connectorsApi.get(id!),
  })

  const probeMutation = useMutation({
    mutationFn: () => probeApi.probe(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connector', id] })
      toast({ title: 'Probe exitoso' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => connectorsApi.delete(id!),
    onSuccess: () => navigate('/connectors'),
  })

  if (!connector) return <div>Loading...</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link to="/connectors">
          <Button size="icon"><ArrowLeft /></Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl">{connector.name}</h2>
          <p className="text-sm text-muted-foreground">{connector.base_url}</p>
        </div>
        <Button onClick={() => probeMutation.mutate()}><RefreshCw /> Probe</Button>
        <Button variant="destructive" onClick={() => deleteMutation.mutate()}><Trash2 /></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Capabilities</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {connector.capabilities.map((cap: string) => (
            <CapabilityPanel
              key={cap}
              connectorId={connector.id}
              capability={cap}
              connectorType={connector.type}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              selectedStrId={selectedStrId}
              setSelectedStrId={setSelectedStrId}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}