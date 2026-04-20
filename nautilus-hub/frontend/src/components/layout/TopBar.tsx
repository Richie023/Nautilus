import { useLocation, Link } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { probeApi } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/connectors': 'Connectors',
  '/connectors/new': 'Add Connector',
  '/settings': 'Settings',
}

export function TopBar() {
  const location = useLocation()
  const queryClient = useQueryClient()

  const title = routeTitles[location.pathname] ||
    (location.pathname.startsWith('/connectors/') ? 'Connector Detail' : 'Nautilus Hub')

  const probeMutation = useMutation({
    mutationFn: probeApi.probeAll,
    onSuccess: () => {
      queryClient.invalidateQueries()
      toast({ title: 'All connectors probed', description: 'Statuses have been refreshed.' })
    },
    onError: (err: Error) => {
      toast({ title: 'Probe failed', description: err.message, variant: 'destructive' })
    },
  })

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background/50 backdrop-blur-sm">
      <h1 className="text-sm font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => probeMutation.mutate()}
          disabled={probeMutation.isPending}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${probeMutation.isPending ? 'animate-spin' : ''}`} />
          {probeMutation.isPending ? 'Probing...' : 'Probe All'}
        </Button>

        {location.pathname === '/connectors' && (
          <Link to="/connectors/new">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Connector
            </Button>
          </Link>
        )}
      </div>
    </header>
  )
}
