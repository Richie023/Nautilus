import { BaseAdapter } from './base.js';
import { decrypt } from '../../utils/encryption.js';

/**
 * Threatdown (Malwarebytes) Adapter
 * Compatible con flujo OAuth2 (client_credentials)
 */
export class ThreatdownAdapter extends BaseAdapter {
  constructor(connector) {
    super(connector);
    this._accessToken = null;
  }

  /**
   * 🔐 Autenticación (igual que tu script Python)
   */
  async _ensureAuth() {
    if (this._accessToken) return;

    const creds = this._parseCredentials(this.connector.credentials);

    // 🔥 Mapeo desde tu UI
    const client_id = creds.username;
    const client_secret = creds.apiKey ? decrypt(creds.apiKey) : '';
    const account_id = creds.apiKeyHeader;

    if (!client_id || !client_secret || !account_id) {
      throw new Error('Missing client_id, client_secret or account_id');
    }

    const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    const tokenResult = await this.safePost(
      'https://api.malwarebytes.com/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'read',
      }),
      {
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!tokenResult.success || !tokenResult.data?.access_token) {
      throw new Error(
        `Auth failed (${tokenResult.status}): ${tokenResult.error}`
      );
    }

    this._accessToken = tokenResult.data.access_token;

    // 🔥 Headers globales
    this.client.defaults.headers['Authorization'] = `Bearer ${this._accessToken}`;
    this.client.defaults.headers['accountid'] = account_id;
  }

  /**
   * 🔍 Detecta capacidades
   */
  async probe() {
    const capabilities = [];
    const metadata = {};

    try {
      await this._ensureAuth();

      // ✅ ACCOUNT
      const account = await this.safeGet('/nebula/v1/account');
      if (!account.success) {
        return {
          online: false,
          capabilities: [],
          metadata: {},
          error: account.error,
        };
      }

      metadata.account = account.data;
      capabilities.push('account');

      // ✅ MACHINES
      const machines = await this.safeGet('/nebula/v1/machines');
      if (machines.success) capabilities.push('endpoints');

      // ✅ THREATS
      const threats = await this.safeGet('/nebula/v1/threats');
      if (threats.success) capabilities.push('detections');

      // ✅ GROUPS
      const groups = await this.safeGet('/nebula/v1/groups');
      if (groups.success) capabilities.push('groups');

      // ✅ USERS
      const users = await this.safeGet('/nebula/v1/users');
      if (users.success) capabilities.push('users');

      return { online: true, capabilities, metadata };

    } catch (err) {
      return {
        online: false,
        capabilities: [],
        metadata: {},
        error: err.message,
      };
    }
  }

  /**
   * 🎯 Dispatcher
   */
  async execute(capability, params = {}) {
    await this._ensureAuth();

    switch (capability) {
      case 'account':
        return this.getAccount();
      case 'endpoints':
        return this.getEndpoints();
      case 'detections':
        return this.getDetections();
      case 'groups':
        return this.getGroups();
      case 'users':
        return this.getUsers();
      default:
        throw new Error(`Unknown capability: ${capability}`);
    }
  }

  /**
   * 📊 ENDPOINTS
   */

  async getAccount() {
    const result = await this.safeGet('/nebula/v1/account');
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async getEndpoints() {
    const result = await this.safeGet('/nebula/v1/machines');
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async getDetections() {
    const result = await this.safeGet('/nebula/v1/threats');
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async getGroups() {
    const result = await this.safeGet('/nebula/v1/groups');
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async getUsers() {
    const result = await this.safeGet('/nebula/v1/users');
    if (!result.success) throw new Error(result.error);
    return result.data;
  }
}