import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, RefreshCw, Trash2, Play, Clock, CheckCircle,
  XCircle, AlertCircle, Server, Globe, Key, Timer
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { connectorsApi, probeApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/connectors/StatusBadge'
import { ConnectorIcon } from '@/components/connectors/ConnectorIcon'
import { CapabilityBadge } from '@/components/connectors/CapabilityBadge'
import { toast } from '@/hooks/use-toast'
import { formatDate, formatRelative, formatDuration } from '@/lib/utils'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function StatusBadgeInline({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  let color = 'bg-gray-500'
  if (s.includes('up') || s.includes('ok')) color = 'bg-green-500'
  else if (s.includes('down') || s.includes('error')) color = 'bg-red-500'
  else if (s.includes('warn')) color = 'bg-yellow-500'
  else if (s.includes('pause')) color = 'bg-gray-400'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium ${color}`}>
      {status || '—'}
    </span>
  )
}

function ItemList({ items, onSelect }: { items: any[], onSelect?: (id: number) => void }) {
  const [search, setSearch] = useState('')
  const filtered = items.filter((item: any) => {
    const name = item.device || item.sensor || item.group || item.probe || item.name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin datos</p>

  return (
    <div>
      <div className="px-3 py-2 border-b">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-xs bg-secondary/30 border border-border rounded px-2 py-1 outline-none focus:border-cyan-500"
        />
      </div>
      <p className="text-xs px-3 py-1 text-muted-foreground">{filtered.length} de {items.length} items</p>
      <div className="divide-y">
        {filtered.map((item: any, i: number) => (
          <div
            key={i}
            onClick={() => onSelect?.(item.objid)}
            className="px-3 py-2 hover:bg-secondary/30 cursor-pointer flex items-center justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">
                {item.device || item.sensor || item.group || item.probe || item.name || '—'}
              </p>
              {item.host && <p className="text-xs text-muted-foreground">{item.host}</p>}
              {item.device && item.group && <p className="text-xs text-muted-foreground">{item.group}</p>}
              {item.lastvalue && <p className="text-xs text-muted-foreground">{item.lastvalue}</p>}
              {item.message && (
                <p className="text-xs text-muted-foreground truncate">{stripHtml(item.message)}</p>
              )}
            </div>
            {item.status && (
              <div className="shrink-0">
                <StatusBadgeInline status={item.status} />
              </div>
            )}
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
          {item.message && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{stripHtml(item.message)}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function SensorDetailView({ data }: { data: any }) {
  const sd = data?.data?.sensordata || data?.sensordata || data?.data || data
  if (!sd) return null
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{sd.name || '—'}</p>
        <StatusBadgeInline status={sd.statustext || sd.status || ''} />
      </div>
      {sd.parentgroupname && (
        <p className="text-xs text-muted-foreground">Grupo: {sd.parentgroupname}</p>
      )}
      {sd.lastvalue && (
        <p className="text-xs">Último valor: <span className="font-medium">{sd.lastvalue}</span></p>
      )}
      {sd.message && (
        <p className="text-xs text-muted-foreground">{stripHtml(sd.message)}</p>
      )}
    </div>
  )
}

function ResultView({
  capability, data, onSelect
}: {
  capability: string, data: any, onSelect?: (id: number) => void
}) {
  if (!data) return null

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
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Distribución ({total} sensores)</p>
          <div className="flex rounded-full overflow-hidden h-3">
            {barData.filter(b => b.value > 0).map((b) => (
              <div
                key={b.name}
                style={{ width: `${(b.value / total) * 100}%`, background: b.color }}
                title={`${b.name}: ${b.value}`}
              />
            ))}
          </div>
          <div className="flex gap-3 flex-wrap">
            {barData.filter(b => b.value > 0).map((b) => (
              <div key={b.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                <span className="text-xs text-muted-foreground">{b.name} {Math.round((b.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (['devices', 'sensors', 'alerts', 'groups'].includes(capability)) {
    const items = data?.devices || data?.sensors || data?.alarms || data?.groups || []
    return <ItemList items={items} onSelect={onSelect} />
  }

  if (capability === 'sensor_details') {
    return <SensorDetailView data={data} />
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
        {d.host && (
          <div className="flex gap-2 text-xs">
            <span className="text-muted-foreground">Host:</span>
            <span className="font-medium">{d.host}</span>
          </div>
        )}
        {d.group && (
          <div className="flex gap-2 text-xs">
            <span className="text-muted-foreground">Grupo:</span>
            <span>{d.group}</span>
          </div>
        )}
        {d.location && (
          <div className="flex gap-2 text-xs">
            <span className="text-muted-foreground">Ubicación:</span>
            <span>{stripHtml(d.location)}</span>
          </div>
        )}
        {d.message && (
          <p className="text-xs text-muted-foreground border-t pt-2">{stripHtml(d.message)}</p>
        )}
      </div>
    )
  }

 if (capability === 'sensor_history') {
  const items: any[] = data?.data?.histdata || data?.histdata || []

  if (!items.length) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Sin datos de historial
      </div>
    )
  }

  const chartData = items.slice(0, 60).map((h: any) => {
    const raw = parseFloat(h.value_raw) || 0

    return {
      time: h.datetime?.split(' ')[1] || h.datetime,
      value: raw,
      label: h.value || '—',
    }
  }).reverse()

  const values = chartData.map((d: any) => d.value)

  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length

  return (
    <div className="p-3 space-y-3">

      {/* RESUMEN */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-secondary/30 rounded p-2">
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="text-sm font-semibold">{min.toFixed(2)}</p>
        </div>
        <div className="bg-secondary/30 rounded p-2">
          <p className="text-xs text-muted-foreground">Promedio</p>
          <p className="text-sm font-semibold">{avg.toFixed(2)}</p>
        </div>
        <div className="bg-secondary/30 rounded p-2">
          <p className="text-xs text-muted-foreground">Max</p>
          <p className="text-sm font-semibold">{max.toFixed(2)}</p>
        </div>
      </div>

      {/* GRAFICA */}
      <div className="w-full h-[220px] bg-secondary/20 rounded-lg p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={45} />

            <Tooltip
              contentStyle={{
                fontSize: 12,
                background: '#111827',
                border: '1px solid #333',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string, props: any) => {
                return [props.payload.label, 'Valor']
              }}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
            />

          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {chartData.length} registros
      </p>

    </div>
  )
}

  if (capability === 'logs') {
    const items = Array.isArray(data) ? data : []
    return <LogsList items={items} />
  }

  if (capability === 'probes') {
    const items = Array.isArray(data) ? data : []
    return (
      <div className="divide-y">
        {items.map((p: any, i: number) => (
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

  if (capability === 'users') {
    const items = Array.isArray(data) ? data : []
    return (
      <div className="divide-y">
        {items.map((u: any, i: number) => (
          <div key={i} className="px-3 py-2 flex items-center justify-between">
            <p className="text-xs font-medium">{u.name}</p>
            {u.lastlogin && <p className="text-xs text-muted-foreground">{u.lastlogin}</p>}
          </div>
        ))}
      </div>
    )
  }

  if (capability === 'pause' || capability === 'acknowledge') {
    const ok = data?.success !== false
    return (
      <div className={`p-3 text-xs font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>
        {ok ? '✓ Acción ejecutada correctamente' : `✗ Error: ${data?.error || 'desconocido'}`}
      </div>
    )
  }
if (capability === 'mail_stats') {
  const items = data || []

  if (!items.length) {
    return <p className="text-xs p-3 text-muted-foreground">Sin estadísticas</p>
  }

  const chartData = items.map((d: any) => ({
    time: new Date(d.time * 1000).toLocaleTimeString(),
    inbound: d.in || 0,
    outbound: d.out || 0,
    spam: d.spam || 0,
  }))

  return (
    <div className="p-3 space-y-3">

      <div className="w-full h-[220px] bg-secondary/20 rounded-lg p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>

            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={40} />

            <Tooltip />

            <Line type="monotone" dataKey="inbound" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="outbound" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="spam" stroke="#ef4444" strokeWidth={2} dot={false} />

          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Tráfico de correo (entrada, salida, spam)
      </p>

    </div>
  )
}
if (capability === 'quarantine') {
  const items = data || []

  if (!items.length) {
    return <p className="text-xs p-3 text-muted-foreground">Sin correos en cuarentena</p>
  }

  return (
    <div className="divide-y">
      {items.map((mail: any, i: number) => (
        <div key={i} className="p-2 text-xs">
          <p><strong>De:</strong> {mail.sender}</p>
          <p><strong>Para:</strong> {mail.receiver}</p>
          <p><strong>Asunto:</strong> {mail.subject}</p>
          <p className="text-muted-foreground">
            {new Date(mail.time * 1000).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}
if (capability === 'domains') {
  const items = data || []

  return (
    <div className="divide-y">
      {items.map((d: any, i: number) => (
        <div key={i} className="p-2 text-xs flex justify-between">
          <span>{d.domain}</span>
          <span className="text-muted-foreground">
            {d.active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      ))}
    </div>
  )
}
if (capability === 'rules') {
  const items = data || []

  return (
    <div className="divide-y">
      {items.map((r: any, i: number) => (
        <div key={i} className="p-2 text-xs">
          <p className="font-medium">{r.name}</p>
          <p className="text-muted-foreground">{r.direction}</p>
          <p className="text-muted-foreground">
            Prioridad: {r.priority}
          </p>
        </div>
      ))}
    </div>
  )
}

  return (
    <pre className="text-xs p-3 whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function CapabilityPanel({
  connectorId, capability, selectedId, setSelectedId,
}: {
  connectorId: string
  capability: string
  selectedId: number | null
  setSelectedId: (id: number) => void
}) {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const execute = async () => {
    setLoading(true)
    setError(null)
    try {
      const needsId = ['device_details', 'sensor_details', 'sensor_history', 'pause', 'acknowledge'].includes(capability)
      if (needsId && !selectedId) {
        setError('Seleccioná un dispositivo o sensor primero')
        return
      }
      const params = needsId ? { id: selectedId } : {}
      const res = await connectorsApi.execute(connectorId, capability, params)
      const data = res.data
      setResult(data)
      if (capability === 'devices' && data?.devices?.length) setSelectedId(data.devices[0].objid)
      if (capability === 'sensors' && data?.sensors?.length) setSelectedId(data.sensors[0].objid)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const executePause = async (action: number) => {
    setLoading(true)
    setError(null)
    try {
      if (!selectedId) {
        setError('Seleccioná un dispositivo o sensor primero')
        return
      }
      const res = await connectorsApi.execute(connectorId, 'pause', { id: selectedId, action })
      setResult(res.data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex justify-between items-center px-3 py-2 bg-secondary/30">
        <CapabilityBadge capability={capability} />
        <div className="flex gap-2">
          {capability === 'pause' ? (
            <>
              <Button size="sm" variant="outline" onClick={() => executePause(0)} disabled={loading}>
                ⏸ Pausar
              </Button>
              <Button size="sm" variant="outline" onClick={() => executePause(1)} disabled={loading}>
                ▶ Reanudar
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={execute} disabled={loading}>
              {loading ? '...' : 'Fetch'}
            </Button>
          )}
        </div>
      </div>
      {selectedId && (
        <p className="text-xs px-3 pt-1 text-muted-foreground">
          ID seleccionado: {selectedId}
        </p>
      )}
      {error && <p className="text-xs text-red-400 p-3">{error}</p>}
      {result && (
        <div className="max-h-80 overflow-auto border-t">
          <ResultView capability={capability} data={result} onSelect={setSelectedId} />
        </div>
      )}
    </div>
  )

}

export function ConnectorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)

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
        <Button onClick={() => probeMutation.mutate()}>
          <RefreshCw /> Probe
        </Button>
        <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
          <Trash2 />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capabilities</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {connector.capabilities.map((cap: string) => (
            <CapabilityPanel
              key={cap}
              connectorId={connector.id}
              capability={cap}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}