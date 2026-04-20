import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

/**
 * GET /api/settings
 * Get all settings
 */
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json(settings);
});

/**
 * PUT /api/settings
 * Update settings (bulk)
 */
router.put('/', (req, res) => {
  const db = getDb();
  const updates = req.body;

  if (typeof updates !== 'object') {
    return res.status(400).json({ error: { message: 'Body must be an object', status: 400 } });
  }

  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  const updateMany = db.transaction((items) => {
    for (const [key, value] of Object.entries(items)) {
      upsert.run(key, String(value));
    }
  });

  updateMany(updates);
  res.json({ message: 'Settings updated', count: Object.keys(updates).length });
});

/**
 * GET /api/settings/:key
 * Get a single setting
 */
router.get('/:key', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);

  if (!row) {
    return res.status(404).json({ error: { message: 'Setting not found', status: 404 } });
  }

  res.json({ key: req.params.key, value: row.value });
});

export default router;
