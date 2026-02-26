import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import logger from '../utils/logger.js';

export type EntityType = 'user' | 'template' | 'da_sheet' | 'vendor';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SHARE'
  | 'UNSHARE'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'SUBMIT'
  | 'APPROVE'
  | 'DUPLICATE';

export function logAudit(
  userId: string | null,
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  details?: Record<string, unknown>
): void {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      uuidv4(),
      userId,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null
    );
  } catch (error) {
    logger.error({ error, action, entityType, entityId }, 'Failed to write audit log');
  }
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export function getAuditLog(
  entityType?: string,
  entityId?: string,
  limit = 50,
  offset = 0
): AuditEntry[] {
  const db = getDb();
  let query = 'SELECT * FROM audit_log';
  const params: (string | number)[] = [];

  const conditions: string[] = [];
  if (entityType) {
    conditions.push('entity_type = ?');
    params.push(entityType);
  }
  if (entityId) {
    conditions.push('entity_id = ?');
    params.push(entityId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params) as Array<{
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    details: string | null;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details ? JSON.parse(row.details) : null,
    createdAt: row.created_at,
  }));
}
