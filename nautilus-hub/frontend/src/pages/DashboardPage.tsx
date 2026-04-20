import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Server, Wifi, WifiOff, AlertCircle, HelpCircle,
  Clock, CheckCircle, XCircle, ArrowRight
} from 'lucide-react'
import { dashboardApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/connectors/StatusBadge'
import { formatRelative } from '@/lib/utils'

function StatCard({
  label, value, icon: Icon, colorClass
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-card border" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-xl border border-destructive/20 bg-destructive/10">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <p className="text-sm">Failed to load dashboard: {(error as Error).message}</p>
      </div>
    )
  }

  const { connectors, byType, recentActivity, issues } = data!

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Connectors"
          value={connectors.total}
          icon={Server}
          colorClass="bg-primary/10 text-primary"
        />
        <StatCard
          label="Online"
          value={connectors.online}
          icon={Wifi}
          colorClass="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          label="Offline"
          value={connectors.offline}
          icon={WifiOff}
          colorClass="bg-red-500/10 text-red-400"
        />
        <StatCard
          label="Unknown"
          value={connectors.unknown + connectors.error}
          icon={HelpCircle}
          colorClass="bg-zinc-500/10 text-zinc-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              Issues Detected
              {issues.length > 0 && (
                <span className="ml-auto text-xs font-normal px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">
                  {issues.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <p className="text-sm text-muted-foreground">All connectors are healthy</p>
              </div>
            ) : (
              <div className="space-y-2">
                {issues.map((issue) => (
                  <Link
                    key={issue.id}
                    to={`/connectors/${issue.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{issue.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {issue.last_probe_error || 'Connection failed'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <StatusBadge status={issue.status} />
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No activity yet. Start by probing your connectors.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentActivity.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    {log.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        <span className="font-medium">{log.connector_name}</span>
                        <span className="text-muted-foreground mx-1">·</span>
                        <span className="text-muted-foreground capitalize">{log.action}</span>
                      </p>
                      {log.message && (
                        <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelative(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By Type */}
      {byType.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Connectors by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {byType.map(({ type, count }) => (
                <Link
                  key={type}
                  to={`/connectors?type=${type}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <span className="text-sm font-medium capitalize">{type}</span>
                  <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
