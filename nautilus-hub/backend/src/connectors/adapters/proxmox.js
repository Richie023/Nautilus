import { BaseAdapter } from './base.js';
import { decrypt } from '../../utils/encryption.js';
import { logger } from '../../utils/logger.js';

/**
 * Proxmox VE Adapter
 * Supports username/password (ticket auth) and API token authentication
 * Capabilities: nodes, vms, containers, storage, cluster, tasks
 */
export class ProxmoxAdapter extends BaseAdapter {
  constructor(connector) {
    super(connector);
    this._ticket = null;
    this._csrfToken = null;
  }

  /**
   * Create an axios client configured for Proxmox
   * Proxmox uses a ticket-based auth or API token
   */
  _createClient() {
    // We override to handle Proxmox's specific auth after base client creation
    return super._createClient();
  }

  async _ensureAuth() {
    const creds = this._parseCredentials(this.connector.credentials);

    if (this.connector.auth_type === 'apikey') {
      // API Token format: USER@REALM!TOKENID=SECRET
      const tokenId = creds.tokenId || '';
      const secret = creds.apiKey ? decrypt(creds.apiKey) : '';
      this.client.defaults.headers['Authorization'] = `PVEAPIToken=${tokenId}=${secret}`;
      return;
    }

    // Username/password - get ticket
    if (!this._ticket) {
      const result = await this.safePost('/api2/json/access/ticket', {
        username: creds.username || '',
        password: creds.password ? decrypt(creds.password) : '',
      });

      if (!result.success || !result.data?.data?.ticket) {
        throw new Error('Proxmox authentication failed');
      }

      this._ticket = result.data.data.ticket;
      this._csrfToken = result.data.data.CSRFPreventionToken;
      this.client.defaults.headers['Cookie'] = `PVEAuthCookie=${this._ticket}`;
      this.client.defaults.headers['CSRFPreventionToken'] = this._csrfToken;
    }
  }

  async probe() {
    const capabilities = [];
    const metadata = {};

    try {
      await this._ensureAuth();

      // Test cluster/nodes
      const versionResult = await this.safeGet('/api2/json/version');
      if (!versionResult.success) {
        return {
          online: false,
          capabilities: [],
          metadata: {},
          error: `Cannot reach Proxmox API: ${versionResult.error}`,
        };
      }

      metadata.version = versionResult.data?.data?.version || 'unknown';
      metadata.release = versionResult.data?.data?.release || '';
      capabilities.push('version');

      // Test nodes
      const nodesResult = await this.safeGet('/api2/json/nodes');
      if (nodesResult.success) {
        capabilities.push('nodes');
        metadata.nodeCount = nodesResult.data?.data?.length || 0;
      }

      // Test VMs
      const vmsResult = await this.safeGet('/api2/json/cluster/resources', {
        params: { type: 'vm' },
      });
      if (vmsResult.success) capabilities.push('vms');

      // Test containers
      const ctResult = await this.safeGet('/api2/json/cluster/resources', {
        params: { type: 'lxc' },
      });
      if (ctResult.success) capabilities.push('containers');

      // Test storage
      const storageResult = await this.safeGet('/api2/json/cluster/resources', {
        params: { type: 'storage' },
      });
      if (storageResult.success) capabilities.push('storage');

      // Test cluster status
      const clusterResult = await this.safeGet('/api2/json/cluster/status');
      if (clusterResult.success) capabilities.push('cluster');

      // Test tasks
      const tasksResult = await this.safeGet('/api2/json/cluster/tasks');
      if (tasksResult.success) capabilities.push('tasks');

      return { online: true, capabilities, metadata };
    } catch (err) {
      return { online: false, capabilities: [], metadata: {}, error: err.message };
    }
  }

  async execute(capability, params = {}) {
    await this._ensureAuth();

    switch (capability) {
      case 'nodes':
        return this.getNodes();
      case 'vms':
        return this.getVMs(params);
      case 'containers':
        return this.getContainers(params);
      case 'storage':
        return this.getStorage(params);
      case 'cluster':
        return this.getClusterStatus();
      case 'tasks':
        return this.getTasks(params);
      default:
        throw new Error(`Unknown capability: ${capability}`);
    }
  }

  async getNodes() {
    const result = await this.safeGet('/api2/json/nodes');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getVMs({ node = null } = {}) {
    if (node) {
      const result = await this.safeGet(`/api2/json/nodes/${node}/qemu`);
      if (!result.success) throw new Error(result.error);
      return result.data.data;
    }
    const result = await this.safeGet('/api2/json/cluster/resources', { params: { type: 'vm' } });
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getContainers({ node = null } = {}) {
    if (node) {
      const result = await this.safeGet(`/api2/json/nodes/${node}/lxc`);
      if (!result.success) throw new Error(result.error);
      return result.data.data;
    }
    const result = await this.safeGet('/api2/json/cluster/resources', { params: { type: 'lxc' } });
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getStorage({ node = null } = {}) {
    const result = await this.safeGet('/api2/json/cluster/resources', {
      params: { type: 'storage' },
    });
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getClusterStatus() {
    const result = await this.safeGet('/api2/json/cluster/status');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getTasks({ count = 50 } = {}) {
    const result = await this.safeGet('/api2/json/cluster/tasks', { params: { limit: count } });
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }
}
