import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  createDASheetSchema,
  updateDASheetSchema,
  shareAccessSchema,
  sheetFiltersSchema,
  CreateDASheetInput,
  UpdateDASheetInput,
} from '../models/schemas.js';
import { logAudit } from '../services/audit.js';
import logger from '../utils/logger.js';

const router = Router();
router.use(authenticate);

interface SheetRow {
  id: string;
  name: string;
  type: string;
  status: string;
  template_id: string;
  notes: string;
  version: number;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface VendorRow {
  id: string;
  da_sheet_id: string;
  name: string;
  overall_score: number;
  notes: string;
  sort_order: number;
}

interface EvaluationRow {
  id: string;
  vendor_id: string;
  category_id: string;
  parameter_id: string;
  eval_score: number;
  result: number;
  vendor_comment: string;
}

interface SharedAccessRow {
  id: string;
  da_sheet_id: string;
  user_email: string;
  access_level: string;
  shared_at: string;
}

function assembleSheet(row: SheetRow) {
  const db = getDb();

  const vendorRows = db
    .prepare('SELECT * FROM vendors WHERE da_sheet_id = ? ORDER BY sort_order')
    .all(row.id) as VendorRow[];

  const vendors = vendorRows.map((v) => {
    const evaluations = db
      .prepare('SELECT * FROM vendor_evaluations WHERE vendor_id = ?')
      .all(v.id) as EvaluationRow[];

    // Group evaluations by category
    const scores: Record<string, { evaluations: Array<{ parameterId: string; evalScore: number; result: number; vendorComment: string }>; subTotal: number }> = {};

    for (const eval_ of evaluations) {
      if (!scores[eval_.category_id]) {
        scores[eval_.category_id] = { evaluations: [], subTotal: 0 };
      }
      scores[eval_.category_id].evaluations.push({
        parameterId: eval_.parameter_id,
        evalScore: eval_.eval_score,
        result: eval_.result,
        vendorComment: eval_.vendor_comment,
      });
      scores[eval_.category_id].subTotal += eval_.result;
    }

    return {
      id: v.id,
      name: v.name,
      scores,
      overallScore: v.overall_score,
      notes: v.notes,
    };
  });

  const sharedAccess = db
    .prepare('SELECT * FROM shared_access WHERE da_sheet_id = ?')
    .all(row.id) as SharedAccessRow[];

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    templateId: row.template_id,
    vendors,
    notes: row.notes,
    version: row.version,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sharedWith: sharedAccess.map((sa) => ({
      email: sa.user_email,
      accessLevel: sa.access_level,
      sharedAt: sa.shared_at,
    })),
  };
}

/**
 * Check if user has access to a sheet (owner or shared).
 */
function hasAccess(
  sheetId: string,
  userId: string,
  requiredLevel?: 'edit'
): boolean {
  const db = getDb();

  // Check ownership
  const sheet = db
    .prepare('SELECT created_by FROM da_sheets WHERE id = ?')
    .get(sheetId) as { created_by: string } | undefined;

  if (!sheet) return false;
  if (sheet.created_by === userId) return true;

  // Check shared access
  const user = db
    .prepare('SELECT email FROM users WHERE id = ?')
    .get(userId) as { email: string } | undefined;

  if (!user) return false;

  const access = db
    .prepare('SELECT access_level FROM shared_access WHERE da_sheet_id = ? AND user_email = ?')
    .get(sheetId, user.email) as { access_level: string } | undefined;

  if (!access) return false;
  if (requiredLevel === 'edit' && access.access_level !== 'edit') return false;

  return true;
}

// GET /api/sheets — List DA sheets
router.get(
  '/',
  validate(sheetFiltersSchema, 'query'),
  (req: Request, res: Response): void => {
    try {
      const db = getDb();
      const { page, limit, type, status, search } = req.query as Record<string, string>;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const offset = (Number(page || 1) - 1) * Number(limit || 20);

      let query = 'SELECT DISTINCT s.* FROM da_sheets s';
      let countQuery = 'SELECT COUNT(DISTINCT s.id) as total FROM da_sheets s';
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      // Non-admin users only see their own sheets or sheets shared with them
      if (userRole !== 'admin') {
        query +=
          ' LEFT JOIN shared_access sa ON s.id = sa.da_sheet_id LEFT JOIN users u ON sa.user_email = u.email';
        countQuery +=
          ' LEFT JOIN shared_access sa ON s.id = sa.da_sheet_id LEFT JOIN users u ON sa.user_email = u.email';
        conditions.push('(s.created_by = ? OR u.id = ?)');
        params.push(userId, userId);
      }

      if (type) {
        conditions.push('s.type = ?');
        params.push(type);
      }
      if (status) {
        conditions.push('s.status = ?');
        params.push(status);
      }
      if (search) {
        conditions.push('(s.name LIKE ?)');
        params.push(`%${search}%`);
      }

      if (conditions.length > 0) {
        const where = ' WHERE ' + conditions.join(' AND ');
        query += where;
        countQuery += where;
      }

      const countRow = db.prepare(countQuery).get(...params) as { total: number };

      query += ' ORDER BY s.updated_at DESC LIMIT ? OFFSET ?';
      const rows = db.prepare(query).all(...params, Number(limit || 20), offset) as SheetRow[];

      const sheets = rows.map(assembleSheet);

      res.json({
        sheets,
        pagination: {
          page: Number(page || 1),
          limit: Number(limit || 20),
          total: countRow.total,
          totalPages: Math.ceil(countRow.total / Number(limit || 20)),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list DA sheets');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/sheets/:id — Get single sheet
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const sheetId = req.params.id;

    if (!hasAccess(sheetId, req.user!.userId) && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const row = db
      .prepare('SELECT * FROM da_sheets WHERE id = ?')
      .get(sheetId) as SheetRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'DA Sheet not found' });
      return;
    }

    res.json({ sheet: assembleSheet(row) });
  } catch (error) {
    logger.error({ error }, 'Failed to get DA sheet');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sheets — Create DA sheet
router.post(
  '/',
  validate(createDASheetSchema),
  (req: Request, res: Response): void => {
    try {
      const db = getDb();
      const input: CreateDASheetInput = req.body;
      const sheetId = uuidv4();
      const userId = req.user!.userId;

      // Verify template exists
      const template = db
        .prepare('SELECT id FROM templates WHERE id = ?')
        .get(input.templateId);

      if (!template) {
        res.status(400).json({ error: 'Template not found' });
        return;
      }

      const transaction = db.transaction(() => {
        db.prepare(
          'INSERT INTO da_sheets (id, name, type, template_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(sheetId, input.name, input.type, input.templateId, input.notes, userId);

        // Insert vendors if provided
        for (let i = 0; i < input.vendors.length; i++) {
          const vendor = input.vendors[i];
          const vendorId = vendor.id || uuidv4();

          db.prepare(
            'INSERT INTO vendors (id, da_sheet_id, name, overall_score, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(vendorId, sheetId, vendor.name, vendor.overallScore, vendor.notes, i);

          // Insert evaluations
          for (const [categoryId, categoryData] of Object.entries(vendor.scores)) {
            for (const evaluation of categoryData.evaluations) {
              db.prepare(
                'INSERT INTO vendor_evaluations (id, vendor_id, category_id, parameter_id, eval_score, result, vendor_comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
              ).run(
                uuidv4(),
                vendorId,
                categoryId,
                evaluation.parameterId,
                evaluation.evalScore,
                evaluation.result,
                evaluation.vendorComment
              );
            }
          }
        }
      });

      transaction();

      logAudit(userId, 'CREATE', 'da_sheet', sheetId, {
        name: input.name,
        type: input.type,
      });

      const row = db
        .prepare('SELECT * FROM da_sheets WHERE id = ?')
        .get(sheetId) as SheetRow;
      res.status(201).json({ sheet: assembleSheet(row) });
    } catch (error) {
      logger.error({ error }, 'Failed to create DA sheet');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/sheets/:id — Update DA sheet
router.put(
  '/:id',
  validate(updateDASheetSchema),
  (req: Request, res: Response): void => {
    try {
      const db = getDb();
      const sheetId = req.params.id;
      const userId = req.user!.userId;

      if (!hasAccess(sheetId, userId, 'edit') && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const existing = db
        .prepare('SELECT * FROM da_sheets WHERE id = ?')
        .get(sheetId) as SheetRow | undefined;

      if (!existing) {
        res.status(404).json({ error: 'DA Sheet not found' });
        return;
      }

      // Optimistic locking: check version
      const input: UpdateDASheetInput = req.body;

      const transaction = db.transaction(() => {
        const updates: string[] = [];
        const params: (string | number)[] = [];

        if (input.name !== undefined) {
          updates.push('name = ?');
          params.push(input.name);
        }
        if (input.status !== undefined) {
          updates.push('status = ?');
          params.push(input.status);
        }
        if (input.notes !== undefined) {
          updates.push('notes = ?');
          params.push(input.notes);
        }

        // Increment version
        updates.push('version = version + 1');
        updates.push("updated_at = datetime('now')");

        params.push(sheetId);
        db.prepare(`UPDATE da_sheets SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        // Replace vendors if provided
        if (input.vendors) {
          // Delete existing vendors (cascade deletes evaluations)
          db.prepare('DELETE FROM vendors WHERE da_sheet_id = ?').run(sheetId);

          for (let i = 0; i < input.vendors.length; i++) {
            const vendor = input.vendors[i];
            const vendorId = vendor.id || uuidv4();

            db.prepare(
              'INSERT INTO vendors (id, da_sheet_id, name, overall_score, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(vendorId, sheetId, vendor.name, vendor.overallScore, vendor.notes, i);

            if (vendor.scores) {
              for (const [categoryId, categoryData] of Object.entries(vendor.scores)) {
                for (const evaluation of categoryData.evaluations) {
                  db.prepare(
                    'INSERT INTO vendor_evaluations (id, vendor_id, category_id, parameter_id, eval_score, result, vendor_comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
                  ).run(
                    uuidv4(),
                    vendorId,
                    categoryId,
                    evaluation.parameterId,
                    evaluation.evalScore,
                    evaluation.result,
                    evaluation.vendorComment
                  );
                }
              }
            }
          }
        }
      });

      transaction();

      logAudit(userId, 'UPDATE', 'da_sheet', sheetId);

      const row = db
        .prepare('SELECT * FROM da_sheets WHERE id = ?')
        .get(sheetId) as SheetRow;
      res.json({ sheet: assembleSheet(row) });
    } catch (error) {
      logger.error({ error }, 'Failed to update DA sheet');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/sheets/:id — Delete DA sheet
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const sheetId = req.params.id;
    const userId = req.user!.userId;

    const existing = db
      .prepare('SELECT created_by FROM da_sheets WHERE id = ?')
      .get(sheetId) as { created_by: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'DA Sheet not found' });
      return;
    }

    // Only owner or admin can delete
    if (existing.created_by !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the owner or admin can delete this sheet' });
      return;
    }

    db.prepare('DELETE FROM da_sheets WHERE id = ?').run(sheetId);

    logAudit(userId, 'DELETE', 'da_sheet', sheetId);

    res.json({ message: 'DA Sheet deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete DA sheet');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sheets/:id/duplicate — Duplicate a DA sheet
router.post('/:id/duplicate', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const sheetId = req.params.id;
    const userId = req.user!.userId;

    if (!hasAccess(sheetId, userId) && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const original = db
      .prepare('SELECT * FROM da_sheets WHERE id = ?')
      .get(sheetId) as SheetRow | undefined;

    if (!original) {
      res.status(404).json({ error: 'DA Sheet not found' });
      return;
    }

    const newSheetId = uuidv4();

    const transaction = db.transaction(() => {
      db.prepare(
        'INSERT INTO da_sheets (id, name, type, status, template_id, notes, version, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        newSheetId,
        `${original.name} (Copy)`,
        original.type,
        'Draft',
        original.template_id,
        original.notes,
        1,
        userId
      );

      // Copy vendors
      const vendors = db
        .prepare('SELECT * FROM vendors WHERE da_sheet_id = ? ORDER BY sort_order')
        .all(sheetId) as VendorRow[];

      for (const vendor of vendors) {
        const newVendorId = uuidv4();
        db.prepare(
          'INSERT INTO vendors (id, da_sheet_id, name, overall_score, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(newVendorId, newSheetId, vendor.name, vendor.overall_score, vendor.notes, vendor.sort_order);

        // Copy evaluations
        const evaluations = db
          .prepare('SELECT * FROM vendor_evaluations WHERE vendor_id = ?')
          .all(vendor.id) as EvaluationRow[];

        for (const eval_ of evaluations) {
          db.prepare(
            'INSERT INTO vendor_evaluations (id, vendor_id, category_id, parameter_id, eval_score, result, vendor_comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(uuidv4(), newVendorId, eval_.category_id, eval_.parameter_id, eval_.eval_score, eval_.result, eval_.vendor_comment);
        }
      }
    });

    transaction();

    logAudit(userId, 'DUPLICATE', 'da_sheet', newSheetId, {
      originalId: sheetId,
    });

    const row = db
      .prepare('SELECT * FROM da_sheets WHERE id = ?')
      .get(newSheetId) as SheetRow;
    res.status(201).json({ sheet: assembleSheet(row) });
  } catch (error) {
    logger.error({ error }, 'Failed to duplicate DA sheet');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sheets/:id/share — Share sheet with another user
router.post(
  '/:id/share',
  validate(shareAccessSchema),
  (req: Request, res: Response): void => {
    try {
      const db = getDb();
      const sheetId = req.params.id;
      const userId = req.user!.userId;

      const sheet = db
        .prepare('SELECT created_by FROM da_sheets WHERE id = ?')
        .get(sheetId) as { created_by: string } | undefined;

      if (!sheet) {
        res.status(404).json({ error: 'DA Sheet not found' });
        return;
      }

      if (sheet.created_by !== userId && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Only the owner or admin can share this sheet' });
        return;
      }

      const { email, accessLevel } = req.body;

      // Upsert shared access
      db.prepare(
        `INSERT INTO shared_access (id, da_sheet_id, user_email, access_level)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(da_sheet_id, user_email) DO UPDATE SET access_level = ?`
      ).run(uuidv4(), sheetId, email, accessLevel, accessLevel);

      logAudit(userId, 'SHARE', 'da_sheet', sheetId, { email, accessLevel });

      res.json({ message: 'Sheet shared successfully' });
    } catch (error) {
      logger.error({ error }, 'Failed to share DA sheet');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/sheets/:id/share/:email — Remove shared access
router.delete('/:id/share/:email', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const sheetId = req.params.id;
    const email = decodeURIComponent(req.params.email);
    const userId = req.user!.userId;

    const sheet = db
      .prepare('SELECT created_by FROM da_sheets WHERE id = ?')
      .get(sheetId) as { created_by: string } | undefined;

    if (!sheet) {
      res.status(404).json({ error: 'DA Sheet not found' });
      return;
    }

    if (sheet.created_by !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the owner or admin can manage sharing' });
      return;
    }

    db.prepare('DELETE FROM shared_access WHERE da_sheet_id = ? AND user_email = ?').run(
      sheetId,
      email
    );

    logAudit(userId, 'UNSHARE', 'da_sheet', sheetId, { email });

    res.json({ message: 'Access removed' });
  } catch (error) {
    logger.error({ error }, 'Failed to remove shared access');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
