import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { encrypt, maskSecret } from '../utils/encryption.js';
import { getAdapter, listConnectorTypes } from '../connectors/registry.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/connectors/types
 * List all available connector types
 */
router.get('/types', (req, res) => {
  res.json(listConnectorTypes());
});

/**
 * GET /api/connectors
 * List all registered connectors (credentials masked)
 */
router.get('/', (req, res) => {
  const db = getDb();
  const connectors = db.prepare(`
    SELECT id, name, type, description, base_url, auth_type,
           status, capabilities, metadata, last_probe_at,
           last_probe_error, created_at, updated_at
    FROM connectors
    ORDER BY name ASC
  `).all();

  res.json(connectors.map(c => ({
    ...c,
    capabilities: JSON.parse(c.capabilities || '[]'),
    metadata: JSON.parse(c.metadata || '{}'),
  })));
});

/**
 * GET /api/connectors/:id
 * Get single connector (credentials partially masked)
 */
router.get('/:id', (req, res) => {
  const db = getDb();
  const connector = db.prepare(`
    SELECT id, name, type, description, base_url, auth_type,
           credentials, verify_ssl, timeout, status,
           capabilities, metadata, last_probe_at, last_probe_error,
           created_at, updated_at
    FROM connectors WHERE id = ?
  `).get(req.params.id);

  if (!connector) {
    return res.status(404).json({ error: { message: 'Connector not found', status: 404 } });
  }

  // Parse and mask credentials for safe display
  let maskedCredentials = {};
  try {
    const creds = JSON.parse(connector.credentials || '{}');
    maskedCredentials = Object.fromEntries(
      Object.entries(creds).map(([k, v]) => {
        // Don't mask non-secret fields like username, headerName
        const secretFields = ['password', 'apiKey', 'token', 'clientSecret', 'passhash'];
        if (secretFields.includes(k) && v) {
          return [k, maskSecret(v)];
        }
        return [k, v];
      })
    );
  } catch {}

  res.json({
    ...connector,
    credentials: maskedCredentials,
    capabilities: JSON.parse(connector.capabilities || '[]'),
    metadata: JSON.parse(connector.metadata || '{}'),
  });
});

/**
 * POST /api/connectors
 * Create a new connector
 */
router.post('/', (req, res) => {
  const {
    name, type, description, base_url, auth_type,
    credentials = {}, verify_ssl = true, timeout = 10000,
  } = req.body;

  if (!name || !type || !base_url || !auth_type) {
    return res.status(400).json({
      error: { message: 'name, type, base_url, and auth_type are required', status: 400 },
    });
  }

  // Encrypt sensitive fields in credentials
  const encryptedCreds = encryptCredentials(credentials);

  const id = uuidv4();
  const db = getDb();

  db.prepare(`
    INSERT INTO connectors (id, name, type, description, base_url, auth_type,
      credentials, verify_ssl, timeout)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, type, description || null, base_url, auth_type,
    JSON.stringify(encryptedCreds),
    verify_ssl ? 1 : 0,
    timeout,
  );

  logger.info(`Connector created: ${name} (${type}) [${id}]`);

  res.status(201).json({
    id, name, type, description, base_url, auth_type,
    status: 'unknown', capabilities: [], metadata: {},
    created_at: new Date().toISOString(),
  });
});

/**
 * PUT /api/connectors/:id
 * Update an existing connector
 */
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: { message: 'Connector not found', status: 404 } });
  }

  const {
    name, type, description, base_url, auth_type,
    credentials, verify_ssl, timeout,
  } = req.body;

  // Merge credentials - only update provided fields
  let mergedCreds = JSON.parse(existing.credentials || '{}');
  if (credentials) {
    const secretFields = ['password', 'apiKey', 'token', 'clientSecret', 'passhash'];
    Object.entries(credentials).forEach(([k, v]) => {
      if (v && !v.startsWith('*')) {
        // New value provided (not masked placeholder)
        mergedCreds[k] = secretFields.includes(k) ? encrypt(v) : v;
      }
    });
  }

  db.prepare(`
    UPDATE connectors SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      description = COALESCE(?, description),
      base_url = COALESCE(?, base_url),
      auth_type = COALESCE(?, auth_type),
      credentials = ?,
      verify_ssl = COALESCE(?, verify_ssl),
      timeout = COALESCE(?, timeout),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || null, type || null, description || null,
    base_url || null, auth_type || null,
    JSON.stringify(mergedCreds),
    verify_ssl !== undefined ? (verify_ssl ? 1 : 0) : null,
    timeout || null,
    req.params.id,
  );

  logger.info(`Connector updated: ${req.params.id}`);
  res.json({ message: 'Connector updated successfully', id: req.params.id });
});

/**
 * DELETE /api/connectors/:id
 * Delete a connector
 */
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM connectors WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: { message: 'Connector not found', status: 404 } });
  }

  logger.info(`Connector deleted: ${req.params.id}`);
  res.json({ message: 'Connector deleted successfully' });
});

/**
 * POST /api/connectors/:id/execute
 * Execute a capability on a connector
 */
router.post('/:id/execute', async (req, res) => {
  const db = getDb();
  const connector = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.id);

  if (!connector) {
    return res.status(404).json({ error: { message: 'Connector not found', status: 404 } });
  }

  const { capability, params = {} } = req.body;
  if (!capability) {
    return res.status(400).json({ error: { message: 'capability is required', status: 400 } });
  }

  const startTime = Date.now();
  const adapter = getAdapter(connector.type, connector);

  try {
    const data = await adapter.execute(capability, params);
    const duration = Date.now() - startTime;

    // Log the action
    db.prepare(`
      INSERT INTO connector_logs (connector_id, action, status, message, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `).run(connector.id, capability, 'success', null, duration);

    res.json({ success: true, data, duration_ms: duration });
  } catch (err) {
    const duration = Date.now() - startTime;

    db.prepare(`
      INSERT INTO connector_logs (connector_id, action, status, message, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `).run(connector.id, capability, 'error', err.message, duration);

    logger.error(`Execute failed [${connector.id}] ${capability}: ${err.message}`);
    res.status(500).json({ success: false, error: err.message, duration_ms: duration });
  }
});

/**
 * GET /api/connectors/:id/logs
 * Get action logs for a connector
 */
router.get('/:id/logs', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const db = getDb();

  const logs = db.prepare(`
    SELECT * FROM connector_logs
    WHERE connector_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.params.id, parseInt(limit), parseInt(offset));

  res.json(logs);
});

// Helpers
function encryptCredentials(creds) {
  const secretFields = ['password', 'apiKey', 'token', 'clientSecret', 'passhash'];
  const result = {};
  Object.entries(creds).forEach(([k, v]) => {
    if (secretFields.includes(k) && v) {
      result[k] = encrypt(v);
    } else {
      result[k] = v;
    }
  });
  return result;
}

export default router;
