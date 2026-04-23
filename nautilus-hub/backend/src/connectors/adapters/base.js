import axios from 'axios';
import https from 'https';
import { decrypt } from '../../utils/encryption.js';
import { logger } from '../../utils/logger.js';

export class BaseAdapter {
  constructor(connector) {
    this.connector = connector;
    this.client = this._createClient();
  }

  _createClient() {
    const { base_url, auth_type, credentials, verify_ssl, timeout } = this.connector;
    const parsedCreds = this._parseCredentials(credentials);

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

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

    if (auth_type === 'basic' && parsedCreds.username) {
      clientConfig.auth = {
        username: parsedCreds.username,
        password: parsedCreds.password ? decrypt(parsedCreds.password) : '',
      };
    }

    return axios.create(clientConfig);
  }

  _parseCredentials(credentials) {
    if (!credentials) return {};
    try {
      return JSON.parse(credentials);
    } catch (e) {
      return {};
    }
  }

  async probe() {
    throw new Error(`probe() must be implemented by ${this.constructor.name}`);
  }

  async testConnection() {
    try {
      await this.probe();
      return true;
    } catch (e) {
      return false;
    }
  }

  async execute(capability, params = {}) {
    throw new Error(`execute() must be implemented by ${this.constructor.name}`);
  }

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

  async safePut(url, data = {}, config = {}) {
    try {
      const response = await this.client.put(url, data, config);
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

  async safeDelete(url, config = {}) {
    try {
      const response = await this.client.delete(url, config);
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

  async safePatch(url, data = {}, config = {}) {
    try {
      const response = await this.client.patch(url, data, config);
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