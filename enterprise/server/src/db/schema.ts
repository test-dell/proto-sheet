import oracledb from 'oracledb';
import logger from '../utils/logger.js';

/**
 * Initialize the Oracle database schema.
 * Uses PL/SQL blocks to create tables only if they don't exist.
 */
export async function initializeSchema(connection: oracledb.Connection): Promise<void> {
  const statements = getCreateTableStatements();

  for (const stmt of statements) {
    try {
      await connection.execute(stmt);
    } catch (err: unknown) {
      const oraErr = err as { errorNum?: number; message?: string };
      // ORA-00955: name is already used by an existing object — skip
      if (oraErr.errorNum === 955) {
        continue;
      }
      logger.error({ error: oraErr.message, sql: stmt.substring(0, 80) }, 'Schema creation error');
      throw err;
    }
  }

  await connection.commit();
  logger.info('Oracle database schema initialized successfully');
}

function getCreateTableStatements(): string[] {
  return [
    // ─── Users ─────────────────────────────────────────────────
    `CREATE TABLE users (
      id VARCHAR2(36) PRIMARY KEY,
      emp_code VARCHAR2(50) NOT NULL UNIQUE,
      email VARCHAR2(255) NOT NULL UNIQUE,
      password_hash VARCHAR2(255) NOT NULL,
      role VARCHAR2(10) NOT NULL CHECK (role IN ('admin', 'user')),
      created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )`,

    // ─── Refresh Tokens ────────────────────────────────────────
    `CREATE TABLE refresh_tokens (
      id VARCHAR2(36) PRIMARY KEY,
      user_id VARCHAR2(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR2(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      revoked_at TIMESTAMP
    )`,

    // ─── Templates ─────────────────────────────────────────────
    `CREATE TABLE templates (
      id VARCHAR2(36) PRIMARY KEY,
      name VARCHAR2(200) NOT NULL,
      type VARCHAR2(30) NOT NULL CHECK (type IN ('License', 'Custom Development', 'SaaS')),
      description VARCHAR2(2000) DEFAULT '' NOT NULL,
      is_deployed NUMBER(1) DEFAULT 0 NOT NULL CHECK (is_deployed IN (0, 1)),
      created_by VARCHAR2(36) REFERENCES users(id),
      created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )`,

    // ─── Categories ────────────────────────────────────────────
    `CREATE TABLE categories (
      id VARCHAR2(36) PRIMARY KEY,
      template_id VARCHAR2(36) NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      name VARCHAR2(200) NOT NULL,
      sort_order NUMBER(10) DEFAULT 0 NOT NULL
    )`,

    // ─── Judgment Parameters ───────────────────────────────────
    `CREATE TABLE judgment_parameters (
      id VARCHAR2(36) PRIMARY KEY,
      category_id VARCHAR2(36) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name VARCHAR2(200) NOT NULL,
      weightage NUMBER(3) NOT NULL CHECK (weightage IN (5, 10, 15, 20, 25, 30)),
      comment VARCHAR2(1000) DEFAULT '' NOT NULL,
      sort_order NUMBER(10) DEFAULT 0 NOT NULL
    )`,

    // ─── DA Sheets ─────────────────────────────────────────────
    `CREATE TABLE da_sheets (
      id VARCHAR2(36) PRIMARY KEY,
      name VARCHAR2(200) NOT NULL,
      type VARCHAR2(30) NOT NULL CHECK (type IN ('License', 'Custom Development', 'SaaS')),
      status VARCHAR2(20) DEFAULT 'Draft' NOT NULL CHECK (status IN ('Draft', 'Submitted', 'Approved')),
      template_id VARCHAR2(36) NOT NULL REFERENCES templates(id),
      notes VARCHAR2(4000) DEFAULT '' NOT NULL,
      version NUMBER(10) DEFAULT 1 NOT NULL,
      created_by VARCHAR2(36) NOT NULL REFERENCES users(id),
      approved_by VARCHAR2(36) REFERENCES users(id),
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )`,

    // ─── Vendors ───────────────────────────────────────────────
    `CREATE TABLE vendors (
      id VARCHAR2(36) PRIMARY KEY,
      da_sheet_id VARCHAR2(36) NOT NULL REFERENCES da_sheets(id) ON DELETE CASCADE,
      name VARCHAR2(200) NOT NULL,
      overall_score NUMBER(10, 2) DEFAULT 0 NOT NULL,
      notes VARCHAR2(4000) DEFAULT '' NOT NULL,
      sort_order NUMBER(10) DEFAULT 0 NOT NULL
    )`,

    // ─── Vendor Evaluations ────────────────────────────────────
    `CREATE TABLE vendor_evaluations (
      id VARCHAR2(36) PRIMARY KEY,
      vendor_id VARCHAR2(36) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      category_id VARCHAR2(36) NOT NULL,
      parameter_id VARCHAR2(36) NOT NULL,
      eval_score NUMBER(5, 2) DEFAULT 0 NOT NULL CHECK (eval_score >= 0 AND eval_score <= 10),
      result NUMBER(10, 2) DEFAULT 0 NOT NULL,
      vendor_comment VARCHAR2(2000) DEFAULT '' NOT NULL,
      CONSTRAINT uq_vendor_param UNIQUE (vendor_id, parameter_id)
    )`,

    // ─── Shared Access ─────────────────────────────────────────
    `CREATE TABLE shared_access (
      id VARCHAR2(36) PRIMARY KEY,
      da_sheet_id VARCHAR2(36) NOT NULL REFERENCES da_sheets(id) ON DELETE CASCADE,
      user_email VARCHAR2(255) NOT NULL,
      access_level VARCHAR2(10) NOT NULL CHECK (access_level IN ('view', 'edit')),
      shared_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT uq_sheet_email UNIQUE (da_sheet_id, user_email)
    )`,

    // ─── Audit Log ─────────────────────────────────────────────
    `CREATE TABLE audit_log (
      id VARCHAR2(36) PRIMARY KEY,
      user_id VARCHAR2(36) REFERENCES users(id),
      action VARCHAR2(50) NOT NULL,
      entity_type VARCHAR2(50) NOT NULL,
      entity_id VARCHAR2(36) NOT NULL,
      details CLOB,
      created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )`,

    // ─── Indexes ───────────────────────────────────────────────
    `CREATE INDEX idx_templates_type ON templates(type)`,
    `CREATE INDEX idx_templates_deployed ON templates(is_deployed)`,
    `CREATE INDEX idx_da_sheets_status ON da_sheets(status)`,
    `CREATE INDEX idx_da_sheets_created_by ON da_sheets(created_by)`,
    `CREATE INDEX idx_da_sheets_template_id ON da_sheets(template_id)`,
    `CREATE INDEX idx_vendors_da_sheet_id ON vendors(da_sheet_id)`,
    `CREATE INDEX idx_vendor_evals_vendor ON vendor_evaluations(vendor_id)`,
    `CREATE INDEX idx_shared_access_sheet ON shared_access(da_sheet_id)`,
    `CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id)`,
    `CREATE INDEX idx_audit_log_user ON audit_log(user_id)`,
    `CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id)`,
  ];
}
