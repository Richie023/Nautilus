import axios from 'axios';
import https from 'https';
import { decrypt } from '../../utils/encryption.js';
import { logger } from '../../utils/logger.js';

/**
 * Base adapter class that all connectors extend.
 * Handles HTTP client creation, authentication, and capability detection.
 */
export class BaseAdapter {
  constructor(connector) {
    this.connector = connector;
    this.client = this._createClient();
  }

  /**
   * Creates an axios instance configured for this connector
   */
  _createClient() {
    const { base_url, auth_type, credentials, verify_ssl, timeout } = this.connector;

    const parsedCreds = this._parseCredentials(credentials);

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Apply auth headers based on auth_type
    if (auth_type === 'bearer' && parsedCreds.token) {
      headers['Authorization'] = `Bearer ${decrypt(parsedCreds.token)}`;
    } else if (auth_type === 'apikey' && parsedCreds.apiKey) {
      const headerName = parsedCreds.apiKeyHeader || 'X-API-Key';
      headers[headerName] = decrypt(parsedCreds.apiKey);
    }

    const clientConfig = {
      baseURL: base_url,
      timeout: timeout || 10000,
      headers,
      httpsAgent: new https.Agent({
        rejectUnauthorized: verify_ssl !== 0,
      }),
    };

    // Basic auth
    if (auth_type === 'basic' && parsedCreds.username) {
      clientConfig.auth = {
        username: parsedCreds.username,
        password: parsedCreds.password ? decrypt(parsedCreds.password) : '',
      };
    }

    return axios.create(clientConfig);
  }

  /**
   * Parse credentials JSON string
   */
  _parseCredentials(credentials) {
    if (!credentials) return {};
    try {
      return JSON.parse(credentials);
    } catch {
      return {};
    }
  }

  /**
   * Probe the API and return detected capabilities.
   * Must be implemented by each adapter.
   * @returns {Promise<ProbeResult>}
   */
  async probe() {
    throw new Error(`probe() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Test basic connectivity
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.probe();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute a capability action
   * @param {string} capability - Capability name
   * @param {object} params - Action parameters
   * @returns {Promise<any>}
   */
  async execute(capability, params = {}) {
    throw new Error(`execute() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Safe HTTP GET with error handling
   */
  async safeGet(url, config = {}) {
    try {
      const response = await this.client.get(url, config);
      return { success: true, data: response.data, status: response.status };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        status: err.response?.status,
        data: err.response?.data,
      };
    }
  }

  /**
   * Safe HTTP POST with error handling
   */
  async safePost(url, data = {}, config = {}) {
    try {
      const response = await this.client.post(url, data, config);
      return { success: true, data: response.data, status: response.status };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        status: err.response?.status,
        data: err.response?.data,
      };
    }
  }
}

/**
 * @typedef {Object} ProbeResult
 * @property {boolean} online - Whether the connector is reachable
 * @property {string[]} capabilities - List of detected capability keys
 * @property {object} metadata - Extra metadata from the API (version, hostname, etc.)
 * @property {string} [error] - Error message if probe failed
 */
