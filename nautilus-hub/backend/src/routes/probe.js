import { Router } from 'express';
import { getDb } from '../db/database.js';
import { getAdapter } from '../connectors/registry.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/probe/:connectorId
 * Probe a connector to detect capabilities and update status
 */
router.post('/:connectorId', async (req, res) => {
  const db = getDb();
  const connector = db.prepare('SELECT * FROM connectors WHERE id = ?').get(req.params.connectorId);

  if (!connector) {
    return res.status(404).json({ error: { message: 'Connector not found', status: 404 } });
  }

  const adapter = getAdapter(connector.type, connector);
  const startTime = Date.now();

  try {
    logger.info(`Probing connector: ${connector.name} [${connector.id}]`);
    const result = await adapter.probe();
    const duration = Date.now() - startTime;

    if (result.online) {
      // Update connector with detected capabilities and status
      db.prepare(`
        UPDATE connectors SET
          status = 'online',
          capabilities = ?,
          metadata = ?,
          last_probe_at = datetime('now'),
          last_probe_error = NULL,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        JSON.stringify(result.capabilities),
        JSON.stringify(result.metadata),
        connector.id,
      );

      logger.info(`Probe success: ${connector.name} | Capabilities: ${result.capabilities.join(', ')}`);

      res.json({
        online: true,
        capabilities: result.capabilities,
        metadata: result.metadata,
        duration_ms: duration,
      });
    } else {
      db.prepare(`
        UPDATE connectors SET
          status = 'offline',
          last_probe_at = datetime('now'),
          last_probe_error = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(result.error || 'Probe failed', connector.id);

      logger.warn(`Probe failed: ${connector.name} - ${result.error}`);

      res.json({
        online: false,
        capabilities: [],
        metadata: {},
        error: result.error,
        duration_ms: duration,
      });
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(`Probe error: ${connector.name} - ${err.message}`);

    db.prepare(`
      UPDATE connectors SET
        status = 'error',
        last_probe_at = datetime('now'),
        last_probe_error = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(err.message, connector.id);

    res.status(500).json({
      online: false,
      error: err.message,
      duration_ms: duration,
    });
  }
});

/**
 * POST /api/probe/all
 * Probe all connectors
 */
router.post('/batch/all', async (req, res) => {
  const db = getDb();
  const connectors = db.prepare('SELECT * FROM connectors').all();

  if (connectors.length === 0) {
    return res.json({ message: 'No connectors to probe', results: [] });
  }

  const results = await Promise.allSettled(
    connectors.map(async (connector) => {
      const adapter = getAdapter(connector.type, connector);
      const result = await adapter.probe();

      if (result.online) {
        db.prepare(`
          UPDATE connectors SET
            status = 'online', capabilities = ?, metadata = ?,
            last_probe_at = datetime('now'), last_probe_error = NULL,
            updated_at = datetime('now')
          WHERE id = ?
        `).run(JSON.stringify(result.capabilities), JSON.stringify(result.metadata), connector.id);
      } else {
        db.prepare(`
          UPDATE connectors SET
            status = 'offline', last_probe_at = datetime('now'),
            last_probe_error = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(result.error || 'Probe failed', connector.id);
      }

      return { id: connector.id, name: connector.name, ...result };
    })
  );

  res.json({
    total: connectors.length,
    results: results.map((r, i) => ({
      id: connectors[i].id,
      name: connectors[i].name,
      ...(r.status === 'fulfilled' ? r.value : { online: false, error: r.reason?.message }),
    })),
  });
});

export default router;
