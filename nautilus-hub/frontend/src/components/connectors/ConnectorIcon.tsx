import {
  Activity,
  Server,
  Mail,
  Shield,
  ShieldAlert,
  Plug,
  HardDrive,
  Network,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  activity: Activity,
  server: Server,
  mail: Mail,
  shield: Shield,
  'shield-alert': ShieldAlert,
  plug: Plug,
  'hard-drive': HardDrive,
  network: Network,
}

const categoryColors: Record<string, string> = {
  monitoring: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  virtualization: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  security: 'bg-red-500/10 text-red-400 border-red-500/20',
  network: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  storage: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  other: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

interface ConnectorIconProps {
  icon: string
  category?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ConnectorIcon({ icon, category = 'other', size = 'md', className }: ConnectorIconProps) {
  const Icon = iconMap[icon] || Plug
  const colorClass = categoryColors[category] || categoryColors.other

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <div className={cn(
      'rounded-lg border flex items-center justify-center shrink-0',
      sizeClasses[size],
      colorClass,
      className
    )}>
      <Icon className={iconSizes[size]} />
    </div>
  )
}
