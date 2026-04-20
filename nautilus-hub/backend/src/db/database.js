import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

let db;

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase() {
  const dbDir = dirname(config.dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory: ${dbDir}`);
  }

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  logger.info(`Database connected: ${config.dbPath}`);
}

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      base_url TEXT NOT NULL,
      auth_type TEXT NOT NULL CHECK(auth_type IN ('basic', 'apikey', 'bearer', 'none', 'passhash')),
      credentials TEXT,
      verify_ssl INTEGER DEFAULT 1,
      timeout INTEGER DEFAULT 10000,
      status TEXT DEFAULT 'unknown' CHECK(status IN ('online', 'offline', 'error', 'unknown')),
      capabilities TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      last_probe_at TEXT,
      last_probe_error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS connector_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connector_id TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (connector_id) REFERENCES connectors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS probe_cache (
      connector_id TEXT PRIMARY KEY,
      capabilities TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      probed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (connector_id) REFERENCES connectors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_connector_logs_connector_id
      ON connector_logs(connector_id);
    CREATE INDEX IF NOT EXISTS idx_connector_logs_created_at
      ON connector_logs(created_at);

    -- Default settings
    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('probe_interval_minutes', '15'),
      ('log_retention_days', '30'),
      ('theme', 'dark'),
      ('company_name', 'Rolosa');
  `);

  logger.info('Database migrations completed');
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}
