import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getConnection, transaction, execute } from '../db/index.js';
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
  ID: string;
  NAME: string;
  TYPE: string;
  STATUS: string;
  TEMPLATE_ID: string;
  NOTES: string;
  VERSION: number;
  CREATED_BY: string;
  APPROVED_BY: string | null;
  APPROVED_AT: string | null;
  CREATED_AT: string;
  UPDATED_AT: string;
}

interface VendorRow {
  ID: string;
  DA_SHEET_ID: string;
  NAME: string;
  OVERALL_SCORE: number;
  NOTES: string;
  SORT_ORDER: number;
}

interface EvaluationRow {
  ID: string;
  VENDOR_ID: string;
  CATEGORY_ID: string;
  PARAMETER_ID: string;
  EVAL_SCORE: number;
  RESULT: number;
  VENDOR_COMMENT: string;
}

interface SharedAccessRow {
  ID: string;
  DA_SHEET_ID: string;
  USER_EMAIL: string;
  ACCESS_LEVEL: string;
  SHARED_AT: string;
}

async function assembleSheet(row: SheetRow) {
  const vendorResult = await execute<VendorRow>(
    'SELECT * FROM vendors WHERE da_sheet_id = :sheetId ORDER BY sort_order',
    { sheetId: row.ID }
  );

  const vendors = await Promise.all(
    (vendorResult.rows || []).map(async (v) => {
      const evalResult = await execute<EvaluationRow>(
        'SELECT * FROM vendor_evaluations WHERE vendor_id = :vendorId',
        { vendorId: v.ID }
      );

      const scores: Record<string, { evaluations: Array<{ parameterId: string; evalScore: number; result: number; vendorComment: string }>; subTotal: number }> = {};

      for (const eval_ of evalResult.rows || []) {
        if (!scores[eval_.CATEGORY_ID]) {
          scores[eval_.CATEGORY_ID] = { evaluations: [], subTotal: 0 };
        }
        scores[eval_.CATEGORY_ID].evaluations.push({
          parameterId: eval_.PARAMETER_ID,
          evalScore: eval_.EVAL_SCORE,
          result: eval_.RESULT,
          vendorComment: eval_.VENDOR_COMMENT,
        });
        scores[eval_.CATEGORY_ID].subTotal += eval_.RESULT;
      }

      return {
        id: v.ID,
        name: v.NAME,
        scores,
        overallScore: v.OVERALL_SCORE,
        notes: v.NOTES,
      };
    })
  );

  const saResult = await execute<SharedAccessRow>(
    'SELECT * FROM shared_access WHERE da_sheet_id = :sheetId',
    { sheetId: row.ID }
  );

  return {
    id: row.ID,
    name: row.NAME,
    type: row.TYPE,
    status: row.STATUS,
    templateId: row.TEMPLATE_ID,
    vendors,
    notes: row.NOTES,
    version: row.VERSION,
    createdBy: row.CREATED_BY,
    approvedBy: row.APPROVED_BY,
    approvedAt: row.APPROVED_AT ? String(row.APPROVED_AT) : null,
    createdAt: String(row.CREATED_AT),
    updatedAt: String(row.UPDATED_AT),
    sharedWith: (saResult.rows || []).map((sa) => ({
      email: sa.USER_EMAIL,
      accessLevel: sa.ACCESS_LEVEL,
      sharedAt: String(sa.SHARED_AT),
    })),
  };
}

async function hasAccess(
  sheetId: string,
  userId: string,
  requiredLevel?: 'edit'
): Promise<boolean> {
  const sheet = await execute<{ CREATED_BY: string }>(
    'SELECT created_by FROM da_sheets WHERE id = :id',
    { id: sheetId }
  );

  if (!sheet.rows?.length) return false;
  if (sheet.rows[0].CREATED_BY === userId) return true;

  const user = await execute<{ EMAIL: string }>(
    'SELECT email FROM users WHERE id = :id',
    { id: userId }
  );
  if (!user.rows?.length) return false;

  const access = await execute<{ ACCESS_LEVEL: string }>(
    'SELECT access_level FROM shared_access WHERE da_sheet_id = :sheetId AND user_email = :email',
    { sheetId, email: user.rows[0].EMAIL }
  );

  if (!access.rows?.length) return false;
  if (requiredLevel === 'edit' && access.rows[0].ACCESS_LEVEL !== 'edit') return false;

  return true;
}

// GET /api/sheets
router.get(
  '/',
  validate(sheetFiltersSchema, 'query'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, type, status, search } = req.query as Record<string, string>;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const pageNum = Number(page || 1);
      const limitNum = Number(limit || 20);
      const offset = (pageNum - 1) * limitNum;

      let query = 'SELECT DISTINCT s.* FROM da_sheets s';
      let countQuery = 'SELECT COUNT(DISTINCT s.id) AS TOTAL FROM da_sheets s';
      const conditions: string[] = [];
      const binds: Record<string, string | number> = {};

      if (userRole !== 'admin') {
        query += ' LEFT JOIN shared_access sa ON s.id = sa.da_sheet_id LEFT JOIN users u ON sa.user_email = u.email';
        countQuery += ' LEFT JOIN shared_access sa ON s.id = sa.da_sheet_id LEFT JOIN users u ON sa.user_email = u.email';
        conditions.push('(s.created_by = :userId OR u.id = :userId)');
        binds.userId = userId;
      }

      if (type) {
        conditions.push('s.type = :type');
        binds.type = type;
      }
      if (status) {
        conditions.push('s.status = :status');
        binds.status = status;
      }
      if (search) {
        conditions.push('s.name LIKE :search');
        binds.search = `%${search}%`;
      }

      if (conditions.length > 0) {
        const where = ' WHERE ' + conditions.join(' AND ');
        query += where;
        countQuery += where;
      }

      const countResult = await execute<{ TOTAL: number }>(countQuery, binds);
      const total = countResult.rows?.[0]?.TOTAL ?? 0;

      query += ' ORDER BY s.updated_at DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY';
      const rowResult = await execute<SheetRow>(query, { ...binds, offset, limit: limitNum });

      const sheets = await Promise.all((rowResult.rows || []).map(assembleSheet));

      res.json({
        sheets,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list DA sheets');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/sheets/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const sheetId = req.params.id;

    if (!(await hasAccess(sheetId, req.user!.userId)) && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await execute<SheetRow>(
      'SELECT * FROM da_sheets WHERE id = :id',
      { id: sheetId }
    );

    if (!result.rows?.length) {
      res.status(404).json({ error: 'DA Sheet not found' });
      return;
    }

    res.json({ sheet: await assembleSheet(result.rows[0]) });
  } catch (error) {
    logger.error({ error }, 'Failed to get DA sheet');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sheets
router.post(
  '/',
  validate(createDASheetSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input: CreateDASheetInput = req.body;
      const sheetId = uuidv4();
      const userId = req.user!.userId;

      const template = await execute<{ ID: string }>(
        'SELECT id FROM templates WHERE id = :id',
        { id: input.templateId }
      );
      if (!template.rows?.length) {
        res.status(400).json({ error: 'Template not found' });
        return;
      }

      await transaction(async (conn) => {
        await conn.execute(
          `INSERT INTO da_sheets (id, name, type, template_id, notes, created_by)
           VALUES (:id, :name, :type, :templateId, :notes, :createdBy)`,
          { id: sheetId, name: input.name, type: input.type, templateId: input.templateId, notes: input.notes, createdBy: userId }
        );

        for (let i = 0; i < input.vendors.length; i++) {
          const vendor = input.vendors[i];
          const vendorId = vendor.id || uuidv4();

          await conn.execute(
            `INSERT INTO vendors (id, da_sheet_id, name, overall_score, notes, sort_order)
             VALUES (:id, :sheetId, :name, :overallScore, :notes, :sortOrder)`,
            { id: vendorId, sheetId, name: vendor.name, overallScore: vendor.overallScore, notes: vendor.notes, sortOrder: i }
          );

          for (const [categoryId, categoryData] of Object.entries(vendor.scores)) {
            for (const evaluation of categoryData.evaluations) {
              await conn.execute(
                `INSERT INTO vendor_evaluations (id, vendor_id, category_id, parameter_id, eval_score, result, vendor_comment)
                 VALUES (:id, :vendorId, :categoryId, :parameterId, :evalScore, :result, :vendorComment)`,
                {
                  id: uuidv4(), vendorId, categoryId,
                  parameterId: evaluation.parameterId,
                  evalScore: evaluation.evalScore,
                  result: evaluation.result,
                  vendorComment: evaluation.vendorComment,
                }
              );
            }
          }
        }
      });

      await logAudit(userId, 'CREATE', 'da_sheet', sheetId, { name: input.name, type: input.type });

      const result = await execute<SheetRow>('SELECT * FROM da_sheets WHERE id = :id', { id: sheetId });
      res.status(201).json({ sheet: await assembleSheet(result.rows![0]) });
    } catch (error) {
      logger.error({ error }, 'Failed to create DA sheet');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/sheets/:id
router.put(
  '/:id',
  validate(updateDASheetSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sheetId = req.params.id;
      const userId = req.user!.userId;

      if (!(await hasAccess(sheetId, userId, 'edit')) && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const existing = await execute<SheetRow>('SELECT * FROM da_sheets WHERE id = :id', { id: sheetId });
      if (!existing.rows?.length) {
        res.status(404).json({ error: 'DA Sheet not found' });
        return;
      }

      const input: UpdateDASheetInput = req.body;

      await transaction(async (conn) => {
        const setClauses: string[] = [];
        const binds: Record<string, string | number> = { sheetId };

        if (input.name !== undefined) { setClauses.push('name = :name'); binds.name = input.name; }
        if (input.status !== undefined) { setClauses.push('status = :status'); binds.status = input.status; }
        if (input.notes !== undefined) { setClauses.push('notes = :notes'); binds.notes = input.notes; }

        setClauses.push('version = version + 1');
        setClauses.push('updated_at = SYSTIMESTAMP');

        await conn.execute(
          `UPDATE da_sheets SET ${setClauses.join(', ')} WHERE id = :sheetId`,
          binds
        );

        if (input.vendors) {
          await conn.execute('DELETE FROM vendors WHERE da_sheet_id = :sheetId', { sheetId });

          for (let i = 0; i < input.vendors.length; i++) {
            const vendor = input.vendors[i];
            const vendorId = vendor.id || uuidv4();

            await conn.execute(
              `INSERT INTO vendors (id, da_sheet_id, name, overall_score, notes, sort_order)
               VALUES (:id, :sheetId, :name, :overallScore, :notes, :sortOrder)`,
              { id: vendorId, sheetId, name: vendor.name, overallScore: vendor.overallScore, notes: vendor.notes, sortOrder: i }
            );

            if (vendor.scores) {
              for (const [categoryId, categoryData] of Object.entries(vendor.scores)) {
                for (const evaluation of categoryData.evaluations) {
                  await conn.execute(
                    `INSERT INTO vendor_evaluations (id, vendor_id, category_id, parameter_id, eval_score, result, vendor_comment)
                     VALUES (:id, :vendorId, :categoryId, :parameterId, :evalScore, :result, :vendorComment)`,
                    {
                      id: uuidv4(), vendorId, categoryId,
                      parameterId: evaluation.parameterId,
                      evalScore: evaluation.evalScore,
                      result: evaluation.result,
                      vendorComment: evaluation.vendorComment,
                    }
                  );
                }
              }
            }
          }
        }
      });

      await logAudit(userId, 'UPDATE', 'da_sheet', sheetId);

      const result = await execute<SheetRow>('SELECT * FROM da_sheets WHERE id = :id', { id: sheetId });
      res.json({ sheet: await assembleSheet(result.rows![0]) });
    } catch (error) {
      logger.error({ error }, 'Failed to update DA sheet');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/sheets/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const sheetId = req.params.id;
    const userId = req.user!.userId;

    const existing = await execute<{ CREATED_BY: string }>(
      'SELECT created_by FROM da_sheets WHERE id = :id', { id: sheetId }
    );
    if (!existing.rows?.length) {
      res.status(404).json({ error: 'DA Sheet not found' });
      return;
    }

    if (existing.rows[0].CREATED_BY !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the owner or admin can delete this sheet' });
      return;
    }

    await transaction(async (conn) => {
      await conn.execute('DELETE FROM da_sheets WHERE id = :id', { id: sheetId });
    });

    await logAudit(userId, 'DELETE', 'da_sheet', sheetId);
    res.json({ message: 'DA Sheet deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete DA sheet');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sheets/:id/duplicate
router.post('/:id/duplicate', async (req: Request, res: Response): Promise<void> => {
  try {
    const sheetId = req.params.id;
    const userId = req.user!.userId;

    if (!(await hasAccess(sheetId, userId)) && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const original = await execute<SheetRow>('SELECT * FROM da_sheets WHERE id = :id', { id: sheetId });
    if (!original.rows?.length) {
      res.status(404).json({ error: 'DA Sheet not found' });
      return;
    }

    const orig = original.rows[0];
    const newSheetId = uuidv4();

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO da_sheets (id, name, type, status, template_id, notes, version, created_by)
         VALUES (:id, :name, :type, 'Draft', :templateId, :notes, 1, :createdBy)`,
        { id: newSheetId, name: `${orig.NAME} (Copy)`, type: orig.TYPE, templateId: orig.TEMPLATE_ID, notes: orig.NOTES, createdBy: userId }
      );

      const vendors = await conn.execute<VendorRow>(
        'SELECT * FROM vendors WHERE da_sheet_id = :sheetId ORDER BY sort_order',
        { sheetId }
      );

      for (const vendor of vendors.rows || []) {
        const newVendorId = uuidv4();
        await conn.execute(
          `INSERT INTO vendors (id, da_sheet_id, name, overall_score, notes, sort_order)
           VALUES (:id, :sheetId, :name, :score, :notes, :sortOrder)`,
          { id: newVendorId, sheetId: newSheetId, name: vendor.NAME, score: vendor.OVERALL_SCORE, notes: vendor.NOTES, sortOrder: vendor.SORT_ORDER }
        );

        const evals = await conn.execute<EvaluationRow>(
          'SELECT * FROM vendor_evaluations WHERE vendor_id = :vendorId',
          { vendorId: vendor.ID }
        );
        for (const ev of evals.rows || []) {
          await conn.execute(
            `INSERT INTO vendor_evaluations (id, vendor_id, category_id, parameter_id, eval_score, result, vendor_comment)
             VALUES (:id, :vendorId, :catId, :paramId, :evalScore, :result, :comment)`,
            { id: uuidv4(), vendorId: newVendorId, catId: ev.CATEGORY_ID, paramId: ev.PARAMETER_ID, evalScore: ev.EVAL_SCORE, result: ev.RESULT, comment: ev.VENDOR_COMMENT }
          );
        }
      }
    });

    await logAudit(userId, 'DUPLICATE', 'da_sheet', newSheetId, { originalId: sheetId });

    const result = await execute<SheetRow>('SELECT * FROM da_sheets WHERE id = :id', { id: newSheetId });
    res.status(201).json({ sheet: await assembleSheet(result.rows![0]) });
  } catch (error) {
    logger.error({ error }, 'Failed to duplicate DA sheet');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sheets/:id/share
router.post(
  '/:id/share',
  validate(shareAccessSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sheetId = req.params.id;
      const userId = req.user!.userId;

      const sheet = await execute<{ CREATED_BY: string }>(
        'SELECT created_by FROM da_sheets WHERE id = :id', { id: sheetId }
      );
      if (!sheet.rows?.length) {
        res.status(404).json({ error: 'DA Sheet not found' });
        return;
      }
      if (sheet.rows[0].CREATED_BY !== userId && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Only the owner or admin can share this sheet' });
        return;
      }

      const { email, accessLevel } = req.body;

      await transaction(async (conn) => {
        // Oracle MERGE for upsert
        await conn.execute(
          `MERGE INTO shared_access sa
           USING (SELECT :sheetId AS da_sheet_id, :email AS user_email FROM dual) src
           ON (sa.da_sheet_id = src.da_sheet_id AND sa.user_email = src.user_email)
           WHEN MATCHED THEN UPDATE SET access_level = :accessLevel
           WHEN NOT MATCHED THEN INSERT (id, da_sheet_id, user_email, access_level)
             VALUES (:id, :sheetId, :email, :accessLevel)`,
          { id: uuidv4(), sheetId, email, accessLevel }
        );
      });

      await logAudit(userId, 'SHARE', 'da_sheet', sheetId, { email, accessLevel });
      res.json({ message: 'Sheet shared successfully' });
    } catch (error) {
      logger.error({ error }, 'Failed to share DA sheet');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/sheets/:id/share/:email
router.delete('/:id/share/:email', async (req: Request, res: Response): Promise<void> => {
  try {
    const sheetId = req.params.id;
    const email = decodeURIComponent(req.params.email);
    const userId = req.user!.userId;

    const sheet = await execute<{ CREATED_BY: string }>(
      'SELECT created_by FROM da_sheets WHERE id = :id', { id: sheetId }
    );
    if (!sheet.rows?.length) {
      res.status(404).json({ error: 'DA Sheet not found' });
      return;
    }
    if (sheet.rows[0].CREATED_BY !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the owner or admin can manage sharing' });
      return;
    }

    await transaction(async (conn) => {
      await conn.execute(
        'DELETE FROM shared_access WHERE da_sheet_id = :sheetId AND user_email = :email',
        { sheetId, email }
      );
    });

    await logAudit(userId, 'UNSHARE', 'da_sheet', sheetId, { email });
    res.json({ message: 'Access removed' });
  } catch (error) {
    logger.error({ error }, 'Failed to remove shared access');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
