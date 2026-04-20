import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search, Plus, ExternalLink, Trash2, RefreshCw, ChevronRight, AlertCircle
} from 'lucide-react'
import { connectorsApi, probeApi, type Connector } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/connectors/StatusBadge'
import { ConnectorIcon } from '@/components/connectors/ConnectorIcon'
import { CapabilityBadge } from '@/components/connectors/CapabilityBadge'
import { toast } from '@/hooks/use-toast'
import { formatRelative } from '@/lib/utils'

// Category-to-icon/color mapping (needs type info)
const typeToCategory: Record<string, { category: string; icon: string }> = {
  prtg: { category: 'monitoring', icon: 'activity' },
  proxmox: { category: 'virtualization', icon: 'server' },
  pmg: { category: 'security', icon: 'mail' },
  pfsense: { category: 'network', icon: 'shield' },
  threatdown: { category: 'security', icon: 'shield-alert' },
  generic: { category: 'other', icon: 'plug' },
}

function ConnectorCard({ connector, onDelete, onProbe }: {
  connector: Connector
  onDelete: (id: string) => void
  onProbe: (id: string) => void
}) {
  const typeInfo = typeToCategory[connector.type] || { category: 'other', icon: 'plug' }

  return (
    <Card className="connector-card group">
      <CardContent className="p-0">
        <Link to={`/connectors/${connector.id}`} className="block p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <ConnectorIcon icon={typeInfo.icon} category={typeInfo.category} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{connector.name}</h3>
                <StatusBadge status={connector.status} className="shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground truncate">{connector.base_url}</p>
              {connector.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{connector.description}</p>
              )}
            </div>
          </div>

          {/* Capabilities */}
          {connector.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {connector.capabilities.slice(0, 5).map((cap) => (
                <CapabilityBadge key={cap} capability={cap} />
              ))}
              {connector.capabilities.length > 5 && (
                <span className="text-xs text-muted-foreground px-2 py-0.5">
                  +{connector.capabilities.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{connector.type}</span>
            <span>Probed {formatRelative(connector.last_probe_at)}</span>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-t border-border bg-secondary/30 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={(e) => { e.preventDefault(); onProbe(connector.id) }}
          >
            <RefreshCw className="w-3 h-3" />
            Probe
          </Button>
          <Link to={`/connectors/${connector.id}`} className="ml-auto">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
              View
              <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
            onClick={(e) => { e.preventDefault(); onDelete(connector.id) }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ConnectorsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data: connectors = [], isLoading, error } = useQuery({
    queryKey: ['connectors'],
    queryFn: connectorsApi.list,
    refetchInterval: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: connectorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
      toast({ title: 'Connector deleted', variant: 'default' })
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' })
    },
  })

  const probeMutation = useMutation({
    mutationFn: probeApi.probe,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] })
      toast({
        title: data.online ? 'Probe successful' : 'Connector offline',
        description: data.online
          ? `${data.capabilities.length} capabilities detected`
          : data.error,
        variant: data.online ? 'default' : 'destructive',
      })
    },
    onError: (err: Error) => {
      toast({ title: 'Probe failed', description: err.message, variant: 'destructive' })
    },
  })

  const filtered = connectors.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.base_url.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-card border" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-xl border border-destructive/20 bg-destructive/10">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <p className="text-sm">Failed to load connectors: {(error as Error).message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search connectors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5">
          {['all', 'online', 'offline', 'error', 'unknown'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filterStatus === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {status}
              {status !== 'all' && (
                <span className="ml-1.5 opacity-60">
                  {connectors.filter((c) => c.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <Link to="/connectors/new">
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Connector
          </Button>
        </Link>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <ExternalLink className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-30" />
          <p className="text-base font-medium mb-1">
            {connectors.length === 0 ? 'No connectors yet' : 'No results found'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {connectors.length === 0
              ? 'Add your first connector to get started.'
              : 'Try adjusting your search or filters.'}
          </p>
          {connectors.length === 0 && (
            <Link to="/connectors/new">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Connector
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onDelete={(id) => {
                if (confirm('Delete this connector? This action cannot be undone.')) {
                  deleteMutation.mutate(id)
                }
              }}
              onProbe={(id) => probeMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {connectors.length} connectors
        </p>
      )}
    </div>
  )
}
