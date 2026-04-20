import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'
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

function StatusCards({ data }: { data: any }) {
  const d = data?.data || data
  const cards = [
    { label: 'Up', value: d?.UpSens ?? '—', color: 'border-green-500 text-green-400' },
    { label: 'Warning', value: d?.WarnSens ?? '—', color: 'border-yellow-500 text-yellow-400' },
    { label: 'Down', value: d?.DownSens ?? '—', color: 'border-red-500 text-red-400' },
    { label: 'Paused', value: d?.PausedSens ?? '—', color: 'border-gray-500 text-gray-400' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2 p-3">
      {cards.map((c) => (
        <div key={c.label} className={`border-2 rounded-lg p-3 text-center ${c.color}`}>
          <p className={`text-2xl font-bold`}>{c.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

function ItemList({ items, onSelect }: { items: any[], onSelect?: (id: number) => void }) {
  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin datos</p>
  return (
    <div className="divide-y">
      {items.map((item: any, i: number) => (
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
    return <StatusCards data={data} />
  }

  if (['devices', 'sensors', 'alerts', 'groups'].includes(capability)) {
    const items = data?.devices || data?.sensors || data?.alarms || data?.groups || []
    return <ItemList items={items} onSelect={onSelect} />
  }

  if (capability === 'sensor_details') {
    return <SensorDetailView data={data} />
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
  const items = data?.data?.histdata || data?.histdata || []
  if (!items.length) return <p className="text-xs p-3 text-muted-foreground">Sin historial</p>
  return (
    <div className="divide-y">
      {items.slice(0, 50).map((h: any, i: number) => (
        <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground shrink-0">{h.datetime}</span>
          <span className="text-xs font-medium">{h.value || '—'}</span>
          {h.coverage && (
            <span className="text-xs text-muted-foreground">{h.coverage}</span>
          )}
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex justify-between items-center px-3 py-2 bg-secondary/30">
        <CapabilityBadge capability={capability} />
        <Button size="sm" onClick={execute} disabled={loading}>
          {loading ? '...' : 'Fetch'}
        </Button>
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