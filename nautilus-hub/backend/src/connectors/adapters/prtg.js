import { BaseAdapter } from './base.js';
import { decrypt } from '../../utils/encryption.js';
import { logger } from '../../utils/logger.js';

export class PRTGAdapter extends BaseAdapter {
  constructor(connector) {
    super(connector);
    this.authParams = this._buildAuthParams();
  }

  /**
   * AUTH
   */
  _buildAuthParams() {
    const creds = this._parseCredentials(this.connector.credentials);

    const params = {};

    if (this.connector.auth_type === 'passhash') {
      params.username = (creds.username || '').trim();

      try {
        params.passhash = creds.passhash
          ? decrypt(creds.passhash).trim()
          : '';
      } catch {
        params.passhash = (creds.passhash || '').trim();
      }
    }

    logger.info(`PRTG Auth Params: ${JSON.stringify(params)}`);

    return params;
  }

  /**
   * PROBE
   */
  async probe() {
    const capabilities = [];
    const metadata = {};

    const statusResult = await this.safeGet('/api/getstatus.htm', {
      params: {
        ...this.authParams,
        id: 0,
      },
    });

    if (!statusResult.success) {
      return {
        online: false,
        capabilities: [],
        metadata: {},
        error: `Cannot reach PRTG API: ${statusResult.error}`,
      };
    }

    const status = statusResult.data;

    metadata.version = status.Version || 'unknown';
    metadata.hostname = status.ClusterNodeName || this.connector.base_url;
    metadata.upSensors = status.UpSens;
    metadata.warningSensors = status.WarnSens;
    metadata.downSensors = status.DownSens;
    metadata.pausedSensors = status.PausedSens;

    capabilities.push(
      'status',
      'devices',
      'sensors',
      'alerts',
      'groups',
      'sensor_details',
      'device_details',
      'sensor_history',
      'pause',
      'acknowledge',
      'logs',
      'probes',
      'users'
    );

    return { online: true, capabilities, metadata };
  }

  /**
   * EXECUTE ROUTER
   */
  async execute(capability, params = {}) {
    switch (capability) {
      case 'status':
        return this.getStatus();

      case 'devices':
        return this.getDevices(params);

      case 'sensors':
        return this.getSensors(params);

      case 'alerts':
        return this.getAlerts(params);

      case 'groups':
        return this.getGroups();

      case 'sensor_details':
        return this.getSensorDetails(params.id);

      case 'device_details':
        return this.getDeviceDetails(params.id);

      case 'sensor_history':
        return this.getSensorHistory(params.id, params);

      case 'pause':
        return this.pauseObject(params.id, params.action);

      case 'acknowledge':
        return this.acknowledgeAlarm(params.id, params.message);

      case 'logs':
        return this.getLogs(params);

      case 'probes':
        return this.getProbes();

      case 'users':
        return this.getUsers();

      default:
        return { success: false, error: `Unknown capability: ${capability}` };
    }
  }

  /**
   * STATUS
   */
  async getStatus() {
    const result = await this.safeGet('/api/getstatus.htm', {
      params: { ...this.authParams, id: 0 },
    });

    if (!result.success) return result;

    return result.data;
  }

  /**
   * DEVICES
   */
  async getDevices({ count = 5000, start = 0, filter = '' } = {}) {
    const result = await this.safeGet('/api/table.json', {
      params: {
        ...this.authParams,
        content: 'devices',
        columns:
          'objid,device,host,group,status,message,location,tags,priority',
        count,
        start,
        ...(filter && { filter_device: filter }),
      },
    });

    if (!result.success) return result;

    return {
      version: result.data['prtg-version'],
      total: result.data.treesize,
      devices: result.data.devices || [],
    };
  }

  /**
   * SENSORS
   */
  async getSensors({ count = 5000, start = 0, status = null } = {}) {
    const params = {
      ...this.authParams,
      content: 'sensors',
      columns:
        'objid,sensor,device,group,status,message,lastvalue,lastvalue_raw,priority',
      count,
      start,
    };

    if (status) params.filter_status = status;

    const result = await this.safeGet('/api/table.json', { params });

    if (!result.success) return result;

    return {
      total: result.data.treesize,
      sensors: result.data.sensors || [],
    };
  }

  /**
   * ALERTS
   */
  async getAlerts({ count = 1000 } = {}) {
    const result = await this.safeGet('/api/table.json', {
      params: {
        ...this.authParams,
        content: 'alarms',
        columns:
          'objid,name,device,group,status,message,lastvalue,priority,datetime',
        count,
      },
    });

    if (!result.success) return result;

    return {
      total: result.data.treesize,
      alarms: result.data.alarms || [],
    };
  }

  /**
   * GROUPS
   */
  async getGroups() {
    const result = await this.safeGet('/api/table.json', {
      params: {
        ...this.authParams,
        content: 'groups',
        columns:
          'objid,group,status,totalsens,upsens,downsens,warnsens,pausedsens',
      },
    });

    if (!result.success) return result;

    return {
      total: result.data.treesize,
      groups: result.data.groups || [],
    };
  }

  /**
   * SENSOR DETAILS
   */
  async getSensorDetails(id) {
    if (!id) return { success: false, error: 'Sensor ID is required' };

    return await this.safeGet('/api/getsensordetails.json', {
      params: { ...this.authParams, id },
    });
  }

  /**
   * DEVICE DETAILS
   */
 async getDeviceDetails(id) {
  if (!id) return { success: false, error: 'Device ID is required' };

  const result = await this.safeGet('/api/table.json', {
    params: {
      ...this.authParams,
      content: 'devices',
      columns: 'objid,device,host,group,status,message,location,tags,priority',
      filter_objid: id,
    },
  });

  if (!result.success) return result;
  return result.data.devices?.[0] || { error: 'Device not found' };
}
  /**
   * SENSOR HISTORY
   */
async getSensorHistory(id, { avg = 0, sdate, edate } = {}) {
  if (!id) return { success: false, error: 'Sensor ID is required' };

  const now = new Date();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);
  
  const fmt = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  };

  return await this.safeGet('/api/historicdata.json', {
    params: {
      ...this.authParams,
      id,
      avg,
      sdate: sdate || fmt(yesterday),
      edate: edate || fmt(now),
    },
  });
}
  /**
   * PAUSE / RESUME
   */
  async pauseObject(id, action = 0) {
    if (!id) return { success: false, error: 'ID is required' };

    return await this.safeGet('/api/pause.htm', {
      params: {
        ...this.authParams,
        id,
        action,
      },
    });
  }

  /**
   * ACK ALERT
   */
  async acknowledgeAlarm(id, message = 'Ack from API') {
    if (!id) return { success: false, error: 'ID is required' };

    return await this.safeGet('/api/acknowledgealarm.htm', {
      params: {
        ...this.authParams,
        id,
        msg: message,
      },
    });
  }

  /**
   * LOGS
   */
  async getLogs({ count = 100 } = {}) {
    const result = await this.safeGet('/api/table.json', {
      params: {
        ...this.authParams,
        content: 'messages',
        columns: 'datetime,type,name,status,message',
        count,
      },
    });

    if (!result.success) return result;

    return result.data.messages || [];
  }

  /**
   * PROBES
   */
  async getProbes() {
    const result = await this.safeGet('/api/table.json', {
      params: {
        ...this.authParams,
        content: 'probes',
        columns: 'objid,probe,status,location',
      },
    });

    if (!result.success) return result;

    return result.data.probes || [];
  }

  /**
   * USERS
   */
  async getUsers() {
    const result = await this.safeGet('/api/table.json', {
      params: {
        ...this.authParams,
        content: 'users',
        columns: 'objid,name,lastlogin',
      },
    });

    if (!result.success) return result;

    return result.data.users || [];
  }
}