import axios from 'axios';
import https from 'https';
import { BaseAdapter } from './base.js';
import { decrypt } from '../../utils/encryption.js';

export class ProxmoxMailGatewayAdapter extends BaseAdapter {
  constructor(connector) {
    super(connector);
    this._ticket = null;
    this._csrfToken = null;
  }

  /**
   * CLIENT (sin auth por defecto)
   */
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
        rejectUnauthorized: verify_ssl !== 0,
      }),
    });
  }

  /**
   * AUTH (TICKET + CSRF)
   */
  async _ensureAuth() {
    if (this._ticket) return;

    const creds = this._parseCredentials(this.connector.credentials);
    const username = creds.username || '';
    const password = creds.password ? decrypt(creds.password) : '';

    const result = await this.safePost(
      '/api2/json/access/ticket',
      new URLSearchParams({ username, password }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    if (!result.success || !result.data?.data?.ticket) {
      throw new Error(
        `PMG Auth failed (${result.status}): ${result.error || 'No ticket'}`
      );
    }

    this._ticket = result.data.data.ticket;
    this._csrfToken = result.data.data.CSRFPreventionToken;

    // 🔑 IMPORTANTE: cookies + csrf
    this.client.defaults.headers['Cookie'] = `PMGAuthCookie=${this._ticket}`;
    this.client.defaults.headers['CSRFPreventionToken'] = this._csrfToken;
  }

  /**
   * PROBE
   */
  async probe() {
    const capabilities = [];
    const metadata = {};

    try {
      await this._ensureAuth();

      // VERSION
      const version = await this.safeGet('/api2/json/version');
      if (version.success) {
        metadata.version = version.data.data.version;
        capabilities.push('version');
      }

      // MAIL STATS
      const stats = await this.safeGet('/api2/json/statistics/mail', {
        params: {
          starttime: Math.floor(Date.now() / 1000) - 86400,
          endtime: Math.floor(Date.now() / 1000),
        },
      });
      if (stats.success) capabilities.push('mail_stats');

      // QUARANTINE
      const quarantine = await this.safeGet('/api2/json/quarantine/spam', {
        params: { limit: 1 },
      });
      if (quarantine.success) capabilities.push('quarantine');

      // DOMAINS
      const domains = await this.safeGet('/api2/json/config/domain');
      if (domains.success) capabilities.push('domains');

      // RULES
      const rules = await this.safeGet('/api2/json/config/ruledb');
      if (rules.success) capabilities.push('rules');

      // WHITELIST
      const whitelist = await this.safeGet('/api2/json/config/whitelist');
      if (whitelist.success) capabilities.push('whitelist');

      // BLACKLIST
      const blacklist = await this.safeGet('/api2/json/config/blacklist');
      if (blacklist.success) capabilities.push('blacklist');

      return {
        online: true,
        capabilities,
        metadata,
      };
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
   * EXECUTE
   */
  async execute(capability, params = {}) {
    await this._ensureAuth();

    switch (capability) {
      case 'version':
        return this.getVersion();

      case 'mail_stats':
        return this.getMailStats(params);

      case 'quarantine':
        return this.getQuarantine(params);

      case 'domains':
        return this.getDomains();

      case 'rules':
        return this.getRules();

      case 'whitelist':
        return this.getWhitelist();

      case 'blacklist':
        return this.getBlacklist();

      default:
        return { success: false, error: `Unknown capability: ${capability}` };
    }
  }

  /**
   * VERSION
   */
  async getVersion() {
    const res = await this.safeGet('/api2/json/version');
    if (!res.success) return res;
    return res.data.data;
  }

  /**
   * MAIL STATS
   */
  async getMailStats({ hours = 24 } = {}) {
    const endtime = Math.floor(Date.now() / 1000);
    const starttime = endtime - hours * 3600;

    const res = await this.safeGet('/api2/json/statistics/mail', {
      params: { starttime, endtime },
    });

    if (!res.success) return res;
    return res.data.data;
  }

  /**
   * QUARANTINE
   */
  async getQuarantine({ limit = 100, start = 0 } = {}) {
    const res = await this.safeGet('/api2/json/quarantine/spam', {
      params: { limit, start },
    });

    if (!res.success) return res;
    return res.data.data;
  }

  /**
   * DOMAINS
   */
  async getDomains() {
    const res = await this.safeGet('/api2/json/config/domain');
    if (!res.success) return res;
    return res.data.data;
  }

  /**
   * RULES
   */
  async getRules() {
    const res = await this.safeGet('/api2/json/config/ruledb');
    if (!res.success) return res;
    return res.data.data;
  }

  /**
   * WHITELIST
   */
  async getWhitelist() {
    const res = await this.safeGet('/api2/json/config/whitelist');
    if (!res.success) return res;
    return res.data.data;
  }

  /**
   * BLACKLIST
   */
  async getBlacklist() {
    const res = await this.safeGet('/api2/json/config/blacklist');
    if (!res.success) return res;
    return res.data.data;
  }
}