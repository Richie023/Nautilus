// AGREGAR estas dos líneas al inicio
import axios from 'axios';
import https from 'https';
import { BaseAdapter } from './base.js';
import { decrypt } from '../../utils/encryption.js';

/**
 * Proxmox Mail Gateway Adapter
 * Capabilities: mail-stats, spam-filter, quarantine, domains, users, rules
 */
export class ProxmoxMailGatewayAdapter extends BaseAdapter {
  constructor(connector) {
    super(connector);
    this._ticket = null;
    this._csrfToken = null;
  }
// ESTE MÉTODO ES CLAVE PARA LA AUTENTICACIÓN EN PMG, YA QUE REQUIERE OBTENER UN TICKET Y UN TOKEN CSRF ANTES DE REALIZAR CUALQUIER OTRA PETICIÓN. SE ASEGURA DE QUE ESTOS VALORES SE OBTENGAN Y SE CONFIGUREN EN EL CLIENTE AXIOS ANTES DE INTENTAR ACCEDER A LOS ENDPOINTS PROTEGIDOS.
_createClient() {
  const { base_url, verify_ssl, timeout } = this.connector;
  return axios.create({
    baseURL: base_url,
    timeout: timeout || 10000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    httpsAgent: new https.Agent({
      rejectUnauthorized: verify_ssl !== 0, // mismo criterio que BaseAdapter
    }),
  });
}
 // REEMPLAZAR el _ensureAuth() que tienes por este:
async _ensureAuth() {
  if (this._ticket) return;

  const creds    = this._parseCredentials(this.connector.credentials);
  const username = creds.username || '';
  const password = creds.password ? decrypt(creds.password) : '';

  // ⚠️ PMG requiere form-urlencoded, NO json
  const result = await this.safePost(
    '/api2/json/access/ticket',
    new URLSearchParams({ username, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  if (!result.success || !result.data?.data?.ticket) {
    throw new Error(
      `PMG authentication failed (${result.status}): ${result.error ?? 'no ticket received'}. ` +
      `Check username format (user@pmg) and password.`
    );
  }

  this._ticket    = result.data.data.ticket;
  this._csrfToken = result.data.data.CSRFPreventionToken;
  this.client.defaults.headers['Cookie']              = `PMGAuthCookie=${this._ticket}`;
  this.client.defaults.headers['CSRFPreventionToken'] = this._csrfToken;
}

  async probe() {
    const capabilities = [];
    const metadata = {};

    try {
      await this._ensureAuth();

      const versionResult = await this.safeGet('/api2/json/version');
      if (!versionResult.success) {
        return { online: false, capabilities: [], metadata: {}, error: versionResult.error };
      }

      metadata.version = versionResult.data?.data?.version || 'unknown';
      capabilities.push('version');

      // Mail statistics
      const statsResult = await this.safeGet('/api2/json/statistics/mail', {
        params: { starttime: Math.floor(Date.now() / 1000) - 86400, endtime: Math.floor(Date.now() / 1000) },
      });
      if (statsResult.success) capabilities.push('mail_stats');

      // Quarantine
      const quarantineResult = await this.safeGet('/api2/json/quarantine/spam', { params: { limit: 1 } });
      if (quarantineResult.success) capabilities.push('quarantine');

      // Domains
      const domainsResult = await this.safeGet('/api2/json/config/domain');
      if (domainsResult.success) capabilities.push('domains');

      // Rules
      const rulesResult = await this.safeGet('/api2/json/config/ruledb');
      if (rulesResult.success) capabilities.push('rules');

      // SMTP whitelist/blacklist
      const bwResult = await this.safeGet('/api2/json/config/whitelist');
      if (bwResult.success) capabilities.push('whitelist');

      return { online: true, capabilities, metadata };
    } catch (err) {
      return { online: false, capabilities: [], metadata: {}, error: err.message };
    }
  }

  async execute(capability, params = {}) {
    await this._ensureAuth();

    switch (capability) {
      case 'mail_stats':
        return this.getMailStats(params);
      case 'quarantine':
        return this.getQuarantine(params);
      case 'domains':
        return this.getDomains();
      case 'rules':
        return this.getRules();
      default:
        throw new Error(`Unknown capability: ${capability}`);
    }
  }

  async getMailStats({ hours = 24 } = {}) {
    const endtime = Math.floor(Date.now() / 1000);
    const starttime = endtime - hours * 3600;
    const result = await this.safeGet('/api2/json/statistics/mail', { params: { starttime, endtime } });
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getQuarantine({ limit = 100, start = 0 } = {}) {
    const result = await this.safeGet('/api2/json/quarantine/spam', { params: { limit, start } });
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getDomains() {
    const result = await this.safeGet('/api2/json/config/domain');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }

  async getRules() {
    const result = await this.safeGet('/api2/json/config/ruledb');
    if (!result.success) throw new Error(result.error);
    return result.data.data;
  }
}
