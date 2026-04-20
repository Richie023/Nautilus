import { BaseAdapter } from './base.js';
import { decrypt } from '../../utils/encryption.js';

/**
 * Threatdown (Malwarebytes) Adapter
 * Uses Threatdown Cloud API with OAuth2 / API Key
 * Capabilities: endpoints, threats, detections, policies, alerts
 */
export class ThreatdownAdapter extends BaseAdapter {
  constructor(connector) {
    super(connector);
    this._accessToken = null;
  }

  async _ensureAuth() {
    if (this._accessToken) return;

    const creds = this._parseCredentials(this.connector.credentials);

    if (this.connector.auth_type === 'bearer') {
      this._accessToken = creds.token ? decrypt(creds.token) : '';
      this.client.defaults.headers['Authorization'] = `Bearer ${this._accessToken}`;
      return;
    }

    // API Key / Client credentials flow
    if (creds.clientId && creds.clientSecret) {
      const tokenResult = await this.safePost(
        'https://login.threatdown.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: creds.clientId,
          client_secret: decrypt(creds.clientSecret),
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (tokenResult.success && tokenResult.data.access_token) {
        this._accessToken = tokenResult.data.access_token;
        this.client.defaults.headers['Authorization'] = `Bearer ${this._accessToken}`;
      } else {
        throw new Error('Threatdown OAuth2 authentication failed');
      }
    } else if (creds.apiKey) {
      this.client.defaults.headers['Authorization'] = `Token ${decrypt(creds.apiKey)}`;
    }
  }

  async probe() {
    const capabilities = [];
    const metadata = {};

    try {
      await this._ensureAuth();

      // Test account/org info
      const accountResult = await this.safeGet('/v1/accounts');
      if (!accountResult.success) {
        return { online: false, capabilities: [], metadata: {}, error: accountResult.error };
      }

      const accounts = accountResult.data?.accounts || accountResult.data;
      metadata.accountCount = Array.isArray(accounts) ? accounts.length : 1;
      capabilities.push('accounts');

      // Endpoints
      const endpointsResult = await this.safeGet('/v1/endpoints', { params: { size: 1 } });
      if (endpointsResult.success) capabilities.push('endpoints');

      // Threats / Detections
      const detectionsResult = await this.safeGet('/v1/detections', { params: { size: 1 } });
      if (detectionsResult.success) capabilities.push('detections');

      // Policies
      const policiesResult = await this.safeGet('/v1/policies', { params: { size: 1 } });
      if (policiesResult.success) capabilities.push('policies');

      // Groups
      const groupsResult = await this.safeGet('/v1/groups', { params: { size: 1 } });
      if (groupsResult.success) capabilities.push('groups');

      return { online: true, capabilities, metadata };
    } catch (err) {
      return { online: false, capabilities: [], metadata: {}, error: err.message };
    }
  }

  async execute(capability, params = {}) {
    await this._ensureAuth();

    switch (capability) {
      case 'endpoints':
        return this.getEndpoints(params);
      case 'detections':
        return this.getDetections(params);
      case 'policies':
        return this.getPolicies();
      case 'groups':
        return this.getGroups();
      case 'accounts':
        return this.getAccounts();
      default:
        throw new Error(`Unknown capability: ${capability}`);
    }
  }

  async getAccounts() {
    const result = await this.safeGet('/v1/accounts');
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async getEndpoints({ size = 100, page = 0, status = null } = {}) {
    const params = { size, page };
    if (status) params.status = status;
    const result = await this.safeGet('/v1/endpoints', { params });
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async getDetections({ size = 100, page = 0 } = {}) {
    const result = await this.safeGet('/v1/detections', { params: { size, page } });
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async getPolicies() {
    const result = await this.safeGet('/v1/policies');
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async getGroups() {
    const result = await this.safeGet('/v1/groups');
    if (!result.success) throw new Error(result.error);
    return result.data;
  }
}
