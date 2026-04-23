import { BaseAdapter } from './base.js';
import { decrypt } from '../../utils/encryption.js';
import { logger } from '../../utils/logger.js';

export class ThreatdownAdapter extends BaseAdapter {
  constructor(connector) {
    super(connector);
    this._accessToken = null;
    this._tokenExpiry = null;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  _isTokenValid() {
    if (!this._accessToken || !this._tokenExpiry) return false;
    return Date.now() < this._tokenExpiry - 60 * 1000;
  }

  async _ensureAuth() {
    if (this._isTokenValid()) return;

    const creds         = this._parseCredentials(this.connector.credentials);
    const client_id     = creds.username    || '';
    const client_secret = creds.apiKey      ? decrypt(creds.apiKey) : '';
    const account_id    = creds.apiKeyHeader || '';

    if (!client_id || !client_secret || !account_id) {
      throw new Error('Faltan credenciales: Client ID, Client Secret o Account ID');
    }

    const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    const tokenResult = await this.safePost(
      'https://api.malwarebytes.com/oauth2/token',
      new URLSearchParams({ grant_type: 'client_credentials', scope: 'read write' }),
      {
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!tokenResult.success || !tokenResult.data?.access_token) {
      throw new Error(`Threatdown auth failed (${tokenResult.status}): ${tokenResult.error}`);
    }

    this._accessToken = tokenResult.data.access_token;
    this._tokenExpiry = Date.now() + (tokenResult.data.expires_in || 3600) * 1000;

    this.client.defaults.headers['Authorization'] = `Bearer ${this._accessToken}`;
    this.client.defaults.headers['accountid']     = account_id;
  }

  // ─── Probe ─────────────────────────────────────────────────────────────────

  async probe() {
    const metadata = {};
    try {
      await this._ensureAuth();
      const account = await this.safeGet('/nebula/v1/account');
      if (!account.success) {
        return { online: false, capabilities: [], metadata: {}, error: account.error };
      }
      metadata.accountName = account.data?.name || '';
      metadata.accountId   = account.data?.id   || '';

      const capabilities = [
        'account',
        'endpoints',
        'detections',
        'groups',
        'admins',
        'policies',
        'suspicious_activity',
        'exclusions',
      ];

      return { online: true, capabilities, metadata };
    } catch (err) {
      logger.error(`Threatdown probe error: ${err.message}`);
      return { online: false, capabilities: [], metadata: {}, error: err.message };
    }
  }

  // ─── Execute ───────────────────────────────────────────────────────────────

  async execute(capability, params = {}) {
    await this._ensureAuth();

    switch (capability) {
      // ── Lectura ──
      case 'account':             return this.getAccount();
      case 'endpoints':           return this.getEndpoints(params);
      case 'detections':          return this.getDetections(params);
      case 'groups':              return this.getGroups();
      case 'admins':              return this.getAdmins();
      case 'policies':            return this.getPolicies();
      case 'suspicious_activity': return this.getSuspiciousActivity(params);
      case 'exclusions':          return this.getExclusions();

      // ── Groups CRUD ──
      case 'create_group':        return this.createGroup(params);
      case 'update_group':        return this.updateGroup(params);
      case 'delete_group':        return this.deleteGroup(params);

      // ── Policies CRUD ──
      case 'create_policy':       return this.createPolicy(params);
      case 'update_policy':       return this.updatePolicy(params);
      case 'delete_policy':       return this.deletePolicy(params);

      // ── Exclusions CRUD ──
      case 'create_exclusion':    return this.createExclusion(params);
      case 'delete_exclusion':    return this.deleteExclusion(params);

      // ── Admins ──
      case 'invite_admin':        return this.inviteAdmin(params);
      case 'delete_admin':        return this.deleteAdmin(params);

      // ── Endpoints acciones ──
      case 'isolate':             return this.isolateEndpoint(params);
      case 'deisolate':           return this.deisolateEndpoint(params);
      case 'scan':                return this.scanEndpoint(params);
      case 'delete_endpoint':     return this.deleteEndpoint(params);

      case 'users':               return this.getAdmins();
      default:
        throw new Error(`Unknown Threatdown capability: ${capability}`);
    }
  }

  // ─── Lectura ───────────────────────────────────────────────────────────────

  async getAccount() {
    const r = await this.safeGet('/nebula/v1/account');
    if (!r.success) throw new Error(r.error);
    return r.data;
  }

  async getEndpoints({ page_size = 100, group_id = null } = {}) {
    const params = { page_size };
    if (group_id) params.group_id = group_id;
    let r = await this.safeGet('/nebula/v1/machines', { params });
    if (!r.success) r = await this.safeGet('/nebula/v1/endpoints', { params });
    if (!r.success) return { machines: [] };
    return r.data;
  }

  async getDetections({ page_size = 100, status = null } = {}) {
    const params = { page_size };
    if (status) params.status = status;
    let r = await this.safeGet('/nebula/v1/threats', { params });
    if (!r.success) r = await this.safeGet('/nebula/v1/detections', { params });
    if (!r.success) return { threats: [] };
    return r.data;
  }

  async getGroups() {
    const r = await this.safeGet('/nebula/v1/groups');
    if (!r.success) throw new Error(r.error);
    return r.data;
  }

  async getAdmins() {
    let r = await this.safeGet('/nebula/v1/admins');
    if (!r.success) r = await this.safeGet('/nebula/v1/users');
    if (!r.success) return { admins: [] };
    return r.data;
  }

  async getPolicies() {
    const r = await this.safeGet('/nebula/v1/policies');
    if (!r.success) throw new Error(r.error);
    return r.data;
  }

  async getSuspiciousActivity({ page_size = 100 } = {}) {
    let r = await this.safeGet('/nebula/v1/suspicious-activity', { params: { page_size } });
    if (!r.success) r = await this.safeGet('/nebula/v1/suspiciousactivity', { params: { page_size } });
    if (!r.success) r = await this.safeGet('/nebula/v1/edr/suspicious-activity', { params: { page_size } });
    if (!r.success) return { suspicious_activities: [] };
    return r.data;
  }

  async getExclusions() {
    const r = await this.safeGet('/nebula/v1/exclusions');
    if (!r.success) throw new Error(r.error);
    return r.data;
  }

  // ─── Groups CRUD ───────────────────────────────────────────────────────────

  async createGroup({ name, description = '' }) {
    if (!name) throw new Error('name es requerido');
    const r = await this.safePost('/nebula/v1/groups', { name, description });
    if (!r.success) throw new Error(r.error);
    return { success: true, message: `Grupo "${name}" creado`, data: r.data };
  }

  async updateGroup({ id, name, description }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safePut(`/nebula/v1/groups/${id}`, { name, description });
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Grupo actualizado', data: r.data };
  }

  async deleteGroup({ id }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safeDelete(`/nebula/v1/groups/${id}`);
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Grupo eliminado' };
  }

  // ─── Policies CRUD ─────────────────────────────────────────────────────────

  async createPolicy({ name, description = '', config = {} }) {
    if (!name) throw new Error('name es requerido');
    const r = await this.safePost('/nebula/v1/policies', { name, description, config });
    if (!r.success) throw new Error(r.error);
    return { success: true, message: `Política "${name}" creada`, data: r.data };
  }

  async updatePolicy({ id, name, description, config }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safePut(`/nebula/v1/policies/${id}`, { name, description, config });
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Política actualizada', data: r.data };
  }

  async deletePolicy({ id }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safeDelete(`/nebula/v1/policies/${id}`);
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Política eliminada' };
  }

  // ─── Exclusions CRUD ───────────────────────────────────────────────────────

  async createExclusion({ type, value, description = '' }) {
    if (!type || !value) throw new Error('type y value son requeridos');
    const r = await this.safePost('/nebula/v1/exclusions', { type, value, description });
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Exclusión creada', data: r.data };
  }

  async deleteExclusion({ id }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safeDelete(`/nebula/v1/exclusions/${id}`);
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Exclusión eliminada' };
  }

  // ─── Admins ────────────────────────────────────────────────────────────────

  async inviteAdmin({ email, role = 'Administrator' }) {
    if (!email) throw new Error('email es requerido');
    const r = await this.safePost('/nebula/v1/admins', { email, role });
    if (!r.success) throw new Error(r.error);
    return { success: true, message: `Invitación enviada a ${email}`, data: r.data };
  }

  async deleteAdmin({ id }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safeDelete(`/nebula/v1/admins/${id}`);
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Admin eliminado' };
  }

  // ─── Endpoints acciones ────────────────────────────────────────────────────

  async isolateEndpoint({ id }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safePost(`/nebula/v1/machines/${id}/isolate`);
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Endpoint aislado', job_id: r.data?.job_id };
  }

  async deisolateEndpoint({ id }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safePost(`/nebula/v1/machines/${id}/deisolate`);
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Aislamiento removido', job_id: r.data?.job_id };
  }

  async scanEndpoint({ id }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safePost(`/nebula/v1/machines/${id}/scan`);
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Escaneo iniciado', job_id: r.data?.job_id };
  }

  async deleteEndpoint({ id }) {
    if (!id) throw new Error('id es requerido');
    const r = await this.safeDelete(`/nebula/v1/machines/${id}`);
    if (!r.success) throw new Error(r.error);
    return { success: true, message: 'Endpoint eliminado' };
  }
}