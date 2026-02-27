import { v4 as uuidv4 } from 'uuid';
import { executeWithCommit, execute } from '../db/index.js';
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

export async function logAudit(
  userId: string | null,
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await executeWithCommit(
      `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details)
       VALUES (:id, :userId, :action, :entityType, :entityId, :details)`,
      {
        id: uuidv4(),
        userId: userId ?? null,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
      }
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

interface AuditRow {
  ID: string;
  USER_ID: string | null;
  ACTION: string;
  ENTITY_TYPE: string;
  ENTITY_ID: string;
  DETAILS: string | null;
  CREATED_AT: string;
}

export async function getAuditLog(
  entityType?: string,
  entityId?: string,
  limit = 50,
  offset = 0
): Promise<AuditEntry[]> {
  let query = 'SELECT * FROM audit_log';
  const binds: Record<string, string | number> = {};

  const conditions: string[] = [];
  if (entityType) {
    conditions.push('entity_type = :entityType');
    binds.entityType = entityType;
  }
  if (entityId) {
    conditions.push('entity_id = :entityId');
    binds.entityId = entityId;
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY';
  binds.offset = offset;
  binds.limit = limit;

  const result = await execute<AuditRow>(query, binds);

  return (result.rows || []).map((row) => ({
    id: row.ID,
    userId: row.USER_ID,
    action: row.ACTION,
    entityType: row.ENTITY_TYPE,
    entityId: row.ENTITY_ID,
    details: row.DETAILS ? JSON.parse(row.DETAILS) : null,
    createdAt: String(row.CREATED_AT),
  }));
}
