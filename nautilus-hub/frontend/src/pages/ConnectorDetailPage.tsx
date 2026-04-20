import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, RefreshCw, Trash2, Play, Clock, CheckCircle,
  XCircle, AlertCircle, Server, Globe, Key, Timer
} from 'lucide-react'
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

function SensorList({ data, onSelect }: { data: any, onSelect?: (id: number) => void }) {
  const items = data?.devices || data?.sensors || data?.groups || data?.alarms || []

  if (!items.length) return <p className="text-xs p-3">No data</p>

  return (
    <div className="divide-y">
      {items.map((item: any, i: number) => (
        <div
          key={i}
          onClick={() => onSelect?.(item.objid)}
          className="px-3 py-2 hover:bg-secondary/30 cursor-pointer"
        >
          <p className="text-xs font-medium">{item.device || item.sensor || item.group}</p>
          {item.message && (
            <p className="text-xs text-muted-foreground">{stripHtml(item.message)}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function CapabilityPanel({
  connectorId,
  capability,
  selectedId,
  setSelectedId,
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
      const needsId = ['device_details', 'sensor_details'].includes(capability)

      if (needsId && !selectedId) {
        setError('Select a device or sensor first')
        return
      }

      const params = needsId ? { id: selectedId } : {}

      const res = await connectorsApi.execute(connectorId, capability, params)
      const data = res.data

      setResult(data)

      // AUTO SELECT
      if (capability === 'devices' && data?.devices?.length) {
        setSelectedId(data.devices[0].objid)
      }

      if (capability === 'sensors' && data?.sensors?.length) {
        setSelectedId(data.sensors[0].objid)
      }

    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const isList = ['devices', 'sensors', 'alerts', 'groups'].includes(capability)

  return (
    <div className="border rounded-lg">
      <div className="flex justify-between px-3 py-2 bg-secondary/30">
        <CapabilityBadge capability={capability} />
        <Button size="sm" onClick={execute} disabled={loading}>
          {loading ? '...' : 'Fetch'}
        </Button>
      </div>

      {selectedId && (
        <p className="text-xs px-3 pt-2 text-muted-foreground">
          Selected ID: {selectedId}
        </p>
      )}

      {error && <p className="text-xs text-red-400 p-3">{error}</p>}

      {result && (
        <div className="max-h-80 overflow-auto border-t">
          {isList ? (
            <SensorList data={result} onSelect={setSelectedId} />
          ) : (
            <pre className="text-xs p-3 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
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
      toast({ title: 'Probed successfully' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => connectorsApi.delete(id!),
    onSuccess: () => {
      navigate('/connectors')
    },
  })

  if (!connector) return <div>Loading...</div>

  return (
    <div className="space-y-6 max-w-5xl">

      {/* HEADER */}
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

        <Button onClick={() => deleteMutation.mutate()}>
          <Trash2 />
        </Button>
      </div>

      {/* CAPABILITIES */}
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