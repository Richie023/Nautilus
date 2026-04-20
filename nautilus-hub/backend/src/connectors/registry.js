/**
 * Connector Registry
 * Maps connector types to their adapter implementations.
 * Each adapter probes the API and returns detected capabilities.
 */

import { PRTGAdapter } from './adapters/prtg.js';
import { ProxmoxAdapter } from './adapters/proxmox.js';
import { ProxmoxMailGatewayAdapter } from './adapters/pmg.js';
import { PfSenseAdapter } from './adapters/pfsense.js';
import { ThreatdownAdapter } from './adapters/threatdown.js';
import { GenericRestAdapter } from './adapters/generic.js';

/**
 * Registry of all available connector types.
 * Each entry describes the tool and maps to its adapter class.
 */
export const CONNECTOR_REGISTRY = {
  prtg: {
    label: 'PRTG Network Monitor',
    description: 'Paessler PRTG - Network monitoring and alerting',
    category: 'monitoring',
    icon: 'activity',
    adapter: PRTGAdapter,
    defaultPort: 443,
   authTypes: ['passhash', 'basic', 'apikey'], 
    docsUrl: 'https://www.paessler.com/manuals/prtg/http_api',
  },
  proxmox: {
    label: 'Proxmox VE',
    description: 'Proxmox Virtual Environment - VM and container management',
    category: 'virtualization',
    icon: 'server',
    adapter: ProxmoxAdapter,
    defaultPort: 8006,
    authTypes: ['basic', 'apikey'],
    docsUrl: 'https://pve.proxmox.com/wiki/Proxmox_VE_API',
  },
  pmg: {
    label: 'Proxmox Mail Gateway',
    description: 'Proxmox Mail Gateway - Email security and filtering',
    category: 'security',
    icon: 'mail',
    adapter: ProxmoxMailGatewayAdapter,
    defaultPort: 8006,
    authTypes: ['basic'],
    docsUrl: 'https://pmg.proxmox.com/pmg-docs/api-viewer/',
  },
  pfsense: {
    label: 'pfSense / OPNsense',
    description: 'pfSense/OPNsense firewall and network management',
    category: 'network',
    icon: 'shield',
    adapter: PfSenseAdapter,
    defaultPort: 443,
    authTypes: ['basic', 'apikey'],
    docsUrl: 'https://docs.netgate.com/pfsense/en/latest/',
  },
  threatdown: {
    label: 'Threatdown (Malwarebytes)',
    description: 'Threatdown endpoint protection and threat management',
    category: 'security',
    icon: 'shield-alert',
    adapter: ThreatdownAdapter,
    defaultPort: 443,
    authTypes: ['apikey', 'bearer'],
    docsUrl: 'https://docs.threatdown.com/api',
  },
  generic: {
    label: 'Generic REST API',
    description: 'Generic REST API connector for custom integrations',
    category: 'other',
    icon: 'plug',
    adapter: GenericRestAdapter,
    defaultPort: 443,
    authTypes: ['none', 'basic', 'apikey', 'bearer'],
    docsUrl: null,
  },
};

/**
 * Get adapter instance for a connector type
 * @param {string} type - Connector type key
 * @param {object} connectorConfig - Connector configuration
 * @returns {BaseAdapter} Adapter instance
 */
export function getAdapter(type, connectorConfig) {
  console.log('🔥 USANDO ADAPTER TYPE:', type);

  const entry = CONNECTOR_REGISTRY[type];

  if (!entry) {
    console.log('⚠️ USANDO GENERIC ADAPTER');
    return new GenericRestAdapter(connectorConfig);
  }

  console.log('✅ USANDO ADAPTER:', type);

  return new entry.adapter(connectorConfig);
}

/**
 * List all available connector types for the UI
 */
export function listConnectorTypes() {
  return Object.entries(CONNECTOR_REGISTRY).map(([type, info]) => ({
    type,
    label: info.label,
    description: info.description,
    category: info.category,
    icon: info.icon,
    defaultPort: info.defaultPort,
    authTypes: info.authTypes,
    docsUrl: info.docsUrl,
  }));
}
