import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

/**
 * GET /api/dashboard/summary
 * Returns global dashboard statistics
 */
router.get('/summary', (req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as count FROM connectors').get();
  const online = db.prepare("SELECT COUNT(*) as count FROM connectors WHERE status = 'online'").get();
  const offline = db.prepare("SELECT COUNT(*) as count FROM connectors WHERE status = 'offline'").get();
  const error = db.prepare("SELECT COUNT(*) as count FROM connectors WHERE status = 'error'").get();
  const unknown = db.prepare("SELECT COUNT(*) as count FROM connectors WHERE status = 'unknown'").get();

  // Connectors by category (using type)
  const byType = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM connectors GROUP BY type ORDER BY count DESC
  `).all();

  // Recent activity (last 20 log entries)
  const recentLogs = db.prepare(`
    SELECT l.*, c.name as connector_name, c.type as connector_type
    FROM connector_logs l
    JOIN connectors c ON l.connector_id = c.id
    ORDER BY l.created_at DESC
    LIMIT 20
  `).all();

  // Connectors with issues
  const connectorIssues = db.prepare(`
    SELECT id, name, type, status, last_probe_error, last_probe_at
    FROM connectors
    WHERE status IN ('offline', 'error')
    ORDER BY last_probe_at DESC
  `).all();

  res.json({
    connectors: {
      total: total.count,
      online: online.count,
      offline: offline.count,
      error: error.count,
      unknown: unknown.count,
    },
    byType,
    recentActivity: recentLogs,
    issues: connectorIssues,
  });
});

/**
 * GET /api/dashboard/connectors-status
 * Returns all connectors with status for the dashboard grid
 */
router.get('/connectors-status', (req, res) => {
  const db = getDb();

  const connectors = db.prepare(`
    SELECT id, name, type, description, base_url, status,
           capabilities, metadata, last_probe_at, last_probe_error
    FROM connectors
    ORDER BY status ASC, name ASC
  `).all();

  res.json(connectors.map(c => ({
    ...c,
    capabilities: JSON.parse(c.capabilities || '[]'),
    metadata: JSON.parse(c.metadata || '{}'),
  })));
});

export default router;
