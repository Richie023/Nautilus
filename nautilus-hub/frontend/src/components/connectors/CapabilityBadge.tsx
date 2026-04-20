import { cn } from '@/lib/utils'

const capabilityLabels: Record<string, string> = {
  // PRTG
  status: 'Status',
  devices: 'Devices',
  sensors: 'Sensors',
  alerts: 'Alerts',
  groups: 'Groups',
  reports: 'Reports',
  maps: 'Maps',
  // Proxmox
  nodes: 'Nodes',
  vms: 'Virtual Machines',
  containers: 'Containers',
  storage: 'Storage',
  cluster: 'Cluster',
  tasks: 'Tasks',
  version: 'Version',
  // PMG
  mail_stats: 'Mail Stats',
  quarantine: 'Quarantine',
  domains: 'Domains',
  rules: 'Rules',
  whitelist: 'Whitelist',
  // pfSense
  system_info: 'System Info',
  firewall_rules: 'Firewall Rules',
  interfaces: 'Interfaces',
  dhcp: 'DHCP',
  dhcp_leases: 'DHCP Leases',
  vpn: 'VPN',
  static_routes: 'Static Routes',
  // Threatdown
  accounts: 'Accounts',
  endpoints: 'Endpoints',
  detections: 'Detections',
  policies: 'Policies',
  // Generic
  ping: 'Ping',
  raw_request: 'Raw Request',
}

interface CapabilityBadgeProps {
  capability: string
  className?: string
}

export function CapabilityBadge({ capability, className }: CapabilityBadgeProps) {
  const label = capabilityLabels[capability] || capability.replace(/_/g, ' ')

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border',
      className
    )}>
      {label}
    </span>
  )
}
