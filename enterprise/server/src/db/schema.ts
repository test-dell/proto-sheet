import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initializeDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath || path.join(__dirname, '../../data/da-sheet-manager.db');

  // Ensure data directory exists
  const dir = path.dirname(resolvedPath);
  import('fs').then((fs) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const db = new Database(resolvedPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables(db);
  logger.info('Database initialized successfully');

  return db;
}

function createTables(db: Database.Database): void {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      emp_code TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Refresh tokens for session management
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT
    );

    -- Templates table
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('License', 'Custom Development', 'SaaS')),
      description TEXT NOT NULL DEFAULT '',
      is_deployed INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Template categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- Judgment parameters within categories
    CREATE TABLE IF NOT EXISTS judgment_parameters (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      weightage INTEGER NOT NULL CHECK (weightage IN (5, 10, 15, 20, 25, 30)),
      comment TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- DA Sheets
    CREATE TABLE IF NOT EXISTS da_sheets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('License', 'Custom Development', 'SaaS')),
      status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved')),
      template_id TEXT NOT NULL REFERENCES templates(id),
      notes TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL REFERENCES users(id),
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Vendors within DA Sheets
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      da_sheet_id TEXT NOT NULL REFERENCES da_sheets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      overall_score REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- Vendor evaluations (scores per judgment parameter)
    CREATE TABLE IF NOT EXISTS vendor_evaluations (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL,
      parameter_id TEXT NOT NULL,
      eval_score REAL NOT NULL DEFAULT 0 CHECK (eval_score >= 0 AND eval_score <= 10),
      result REAL NOT NULL DEFAULT 0,
      vendor_comment TEXT NOT NULL DEFAULT '',
      UNIQUE(vendor_id, parameter_id)
    );

    -- Shared access for DA Sheets
    CREATE TABLE IF NOT EXISTS shared_access (
      id TEXT PRIMARY KEY,
      da_sheet_id TEXT NOT NULL REFERENCES da_sheets(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      access_level TEXT NOT NULL CHECK (access_level IN ('view', 'edit')),
      shared_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(da_sheet_id, user_email)
    );

    -- Audit log for tracking all changes
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
    CREATE INDEX IF NOT EXISTS idx_templates_deployed ON templates(is_deployed);
    CREATE INDEX IF NOT EXISTS idx_da_sheets_status ON da_sheets(status);
    CREATE INDEX IF NOT EXISTS idx_da_sheets_created_by ON da_sheets(created_by);
    CREATE INDEX IF NOT EXISTS idx_da_sheets_template_id ON da_sheets(template_id);
    CREATE INDEX IF NOT EXISTS idx_vendors_da_sheet_id ON vendors(da_sheet_id);
    CREATE INDEX IF NOT EXISTS idx_vendor_evaluations_vendor_id ON vendor_evaluations(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_shared_access_da_sheet_id ON shared_access(da_sheet_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  `);
}
