import { cn } from '@/lib/utils'
import type { ConnectorStatus } from '@/lib/api'

interface StatusBadgeProps {
  status: ConnectorStatus
  className?: string
  showDot?: boolean
}

const statusConfig: Record<ConnectorStatus, { label: string; dotClass: string; badgeClass: string }> = {
  online: {
    label: 'Online',
    dotClass: 'bg-emerald-400 animate-pulse',
    badgeClass: 'status-badge-online',
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-red-400',
    badgeClass: 'status-badge-offline',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-orange-400',
    badgeClass: 'status-badge-error',
  },
  unknown: {
    label: 'Unknown',
    dotClass: 'bg-zinc-400',
    badgeClass: 'status-badge-unknown',
  },
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unknown

  return (
    <span className={cn(config.badgeClass, className)}>
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full inline-block', config.dotClass)} />
      )}
      {config.label}
    </span>
  )
}
