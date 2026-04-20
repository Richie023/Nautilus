import { BaseAdapter } from './base.js';
import { decrypt } from '../../utils/encryption.js';

/**
 * pfSense / OPNsense Adapter
 * Uses pfSense's xmlrpc API or REST API (pfSense Plus / pfSense-api package)
 * Capabilities: firewall-rules, interfaces, dhcp, vpn, system-stats, routes
 */
export class PfSenseAdapter extends BaseAdapter {
  constructor(connector) {
    super(connector);
    this._flavor = 'pfsense'; // or 'opnsense'
  }

  async probe() {
    const capabilities = [];
    const metadata = {};

    // Try pfSense REST API (fauxapi or official API)
    const systemResult = await this.safeGet('/api/v1/system/info');
    const isRestApi = systemResult.success;

    if (isRestApi) {
      this._flavor = 'pfsense-rest';
      metadata.hostname = systemResult.data?.data?.hostname || 'unknown';
      metadata.version = systemResult.data?.data?.netgate_device_id || 'unknown';
      capabilities.push('system_info');

      // Firewall rules
      const firewallResult = await this.safeGet('/api/v1/firewall/rule');
      if (firewallResult.success) capabilities.push('firewall_rules');

      // Interfaces
      const ifResult = await this.safeGet('/api/v1/interface');
      if (ifResult.success) capabilities.push('interfaces');

      // DHCP
      const dhcpResult = await this.safeGet('/api/v1/services/dhcpd');
      if (dhcpResult.success) capabilities.push('dhcp');

      // Routes
      const routeResult = await this.safeGet('/api/v1/routing/static_route');
      if (routeResult.success) capabilities.push('static_routes');

      // VPN
      const vpnResult = await this.safeGet('/api/v1/vpn/openvpn/client');
      if (vpnResult.success) capabilities.push('vpn');

      return { online: true, capabilities, metadata };
    }

    // Try OPNsense REST API
    const opnResult = await this.safeGet('/api/core/firmware/info');
    if (opnResult.success) {
      this._flavor = 'opnsense';
      metadata.version = opnResult.data?.product_version || 'unknown';
      capabilities.push('system_info');

      const ifResult = await this.safeGet('/api/interfaces/overview/interfacesInfo');
      if (ifResult.success) capabilities.push('interfaces');

      const fw = await this.safeGet('/api/firewall/filter/searchRule', { params: { limit: 1 } });
      if (fw.success) capabilities.push('firewall_rules');

      const dhcp = await this.safeGet('/api/dhcp/leases/searchLease', { params: { limit: 1 } });
      if (dhcp.success) capabilities.push('dhcp_leases');

      const vpn = await this.safeGet('/api/openvpn/export/providers');
      if (vpn.success) capabilities.push('vpn');

      return { online: true, capabilities, metadata };
    }

    return {
      online: false,
      capabilities: [],
      metadata: {},
      error: 'Cannot detect pfSense/OPNsense API. Ensure API package is installed.',
    };
  }

  async execute(capability, params = {}) {
    switch (capability) {
      case 'system_info':
        return this.getSystemInfo();
      case 'firewall_rules':
        return this.getFirewallRules(params);
      case 'interfaces':
        return this.getInterfaces();
      case 'dhcp':
      case 'dhcp_leases':
        return this.getDHCPLeases(params);
      case 'vpn':
        return this.getVPN();
      case 'static_routes':
        return this.getRoutes();
      default:
        throw new Error(`Unknown capability: ${capability}`);
    }
  }

  async getSystemInfo() {
    if (this._flavor === 'opnsense') {
      const result = await this.safeGet('/api/core/firmware/info');
      if (!result.success) throw new Error(result.error);
      return result.data;
    }
    const result = await this.safeGet('/api/v1/system/info');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getFirewallRules(params = {}) {
    if (this._flavor === 'opnsense') {
      const result = await this.safeGet('/api/firewall/filter/searchRule');
      if (!result.success) throw new Error(result.error);
      return result.data.rows || result.data;
    }
    const result = await this.safeGet('/api/v1/firewall/rule');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getInterfaces() {
    if (this._flavor === 'opnsense') {
      const result = await this.safeGet('/api/interfaces/overview/interfacesInfo');
      if (!result.success) throw new Error(result.error);
      return result.data;
    }
    const result = await this.safeGet('/api/v1/interface');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getDHCPLeases(params = {}) {
    if (this._flavor === 'opnsense') {
      const result = await this.safeGet('/api/dhcp/leases/searchLease');
      if (!result.success) throw new Error(result.error);
      return result.data.rows || result.data;
    }
    const result = await this.safeGet('/api/v1/services/dhcpd/lease');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getVPN() {
    if (this._flavor === 'opnsense') {
      const result = await this.safeGet('/api/openvpn/export/providers');
      if (!result.success) throw new Error(result.error);
      return result.data;
    }
    const result = await this.safeGet('/api/v1/vpn/openvpn/client');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getRoutes() {
    const result = await this.safeGet('/api/v1/routing/static_route');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }
}
