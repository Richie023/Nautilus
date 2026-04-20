import { BaseAdapter } from './base.js';

/**
 * Generic REST API Adapter
 * Used as fallback for any REST API.
 * Capabilities are minimal: connectivity check + raw request
 */
export class GenericRestAdapter extends BaseAdapter {
  async probe() {
    const result = await this.safeGet('/');
    if (result.success || result.status < 500) {
      return {
        online: true,
        capabilities: ['ping', 'raw_request'],
        metadata: { responseStatus: result.status },
      };
    }
    return {
      online: false,
      capabilities: [],
      metadata: {},
      error: result.error || `HTTP ${result.status}`,
    };
  }

  async execute(capability, params = {}) {
    switch (capability) {
      case 'ping':
        return this.ping();
      case 'raw_request':
        return this.rawRequest(params);
      default:
        throw new Error(`Unknown capability: ${capability}`);
    }
  }

  async ping() {
    const result = await this.safeGet('/');
    return { online: result.success, status: result.status };
  }

  async rawRequest({ method = 'GET', path = '/', body = null, headers = {} } = {}) {
    try {
      const response = await this.client.request({
        method,
        url: path,
        data: body,
        headers,
      });
      return { status: response.status, data: response.data };
    } catch (err) {
      throw new Error(`Request failed: ${err.message}`);
    }
  }
}
