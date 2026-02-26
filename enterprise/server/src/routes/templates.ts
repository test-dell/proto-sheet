import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateFiltersSchema,
  CreateTemplateInput,
} from '../models/schemas.js';
import { logAudit } from '../services/audit.js';
import logger from '../utils/logger.js';

const router = Router();

// All template routes require authentication
router.use(authenticate);

interface CategoryRow {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
}

interface ParameterRow {
  id: string;
  category_id: string;
  name: string;
  weightage: number;
  comment: string;
  sort_order: number;
}

interface TemplateRow {
  id: string;
  name: string;
  type: string;
  description: string;
  is_deployed: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function assembleTemplate(row: TemplateRow) {
  const db = getDb();

  const categories = db
    .prepare('SELECT * FROM categories WHERE template_id = ? ORDER BY sort_order')
    .all(row.id) as CategoryRow[];

  const categoriesWithParams = categories.map((cat) => {
    const parameters = db
      .prepare('SELECT * FROM judgment_parameters WHERE category_id = ? ORDER BY sort_order')
      .all(cat.id) as ParameterRow[];

    return {
      id: cat.id,
      name: cat.name,
      parameters: parameters.map((p) => ({
        id: p.id,
        name: p.name,
        weightage: p.weightage,
        comment: p.comment,
      })),
    };
  });

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    isDeployed: row.is_deployed === 1,
    categories: categoriesWithParams,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/templates — List templates with filters
router.get(
  '/',
  validate(templateFiltersSchema, 'query'),
  (req: Request, res: Response): void => {
    try {
      const db = getDb();
      const { page, limit, type, deployed, search } = req.query as Record<string, string>;
      const offset = (Number(page || 1) - 1) * Number(limit || 20);

      let query = 'SELECT * FROM templates';
      let countQuery = 'SELECT COUNT(*) as total FROM templates';
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (type) {
        conditions.push('type = ?');
        params.push(type);
      }
      if (deployed !== undefined) {
        conditions.push('is_deployed = ?');
        params.push(deployed === 'true' ? 1 : 0);
      }
      if (search) {
        conditions.push('(name LIKE ? OR description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      if (conditions.length > 0) {
        const where = ' WHERE ' + conditions.join(' AND ');
        query += where;
        countQuery += where;
      }

      const countRow = db.prepare(countQuery).get(...params) as { total: number };

      query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
      const rows = db.prepare(query).all(...params, Number(limit || 20), offset) as TemplateRow[];

      const templates = rows.map(assembleTemplate);

      res.json({
        templates,
        pagination: {
          page: Number(page || 1),
          limit: Number(limit || 20),
          total: countRow.total,
          totalPages: Math.ceil(countRow.total / Number(limit || 20)),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list templates');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/templates/:id — Get single template
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const row = db
      .prepare('SELECT * FROM templates WHERE id = ?')
      .get(req.params.id) as TemplateRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ template: assembleTemplate(row) });
  } catch (error) {
    logger.error({ error }, 'Failed to get template');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/templates — Create template
router.post(
  '/',
  authorize('admin'),
  validate(createTemplateSchema),
  (req: Request, res: Response): void => {
    try {
      const db = getDb();
      const input: CreateTemplateInput = req.body;
      const templateId = uuidv4();

      const insertTemplate = db.prepare(
        'INSERT INTO templates (id, name, type, description, is_deployed, created_by) VALUES (?, ?, ?, ?, ?, ?)'
      );

      const insertCategory = db.prepare(
        'INSERT INTO categories (id, template_id, name, sort_order) VALUES (?, ?, ?, ?)'
      );

      const insertParameter = db.prepare(
        'INSERT INTO judgment_parameters (id, category_id, name, weightage, comment, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
      );

      const transaction = db.transaction(() => {
        insertTemplate.run(
          templateId,
          input.name,
          input.type,
          input.description,
          input.isDeployed ? 1 : 0,
          req.user!.userId
        );

        input.categories.forEach((cat, catIdx) => {
          const categoryId = cat.id || uuidv4();
          insertCategory.run(categoryId, templateId, cat.name, catIdx);

          cat.parameters.forEach((param, paramIdx) => {
            const parameterId = param.id || uuidv4();
            insertParameter.run(
              parameterId,
              categoryId,
              param.name,
              param.weightage,
              param.comment,
              paramIdx
            );
          });
        });
      });

      transaction();

      logAudit(req.user!.userId, 'CREATE', 'template', templateId, {
        name: input.name,
        type: input.type,
      });

      const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as TemplateRow;
      res.status(201).json({ template: assembleTemplate(row) });
    } catch (error) {
      logger.error({ error }, 'Failed to create template');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/templates/:id — Update template
router.put(
  '/:id',
  authorize('admin'),
  validate(updateTemplateSchema),
  (req: Request, res: Response): void => {
    try {
      const db = getDb();
      const templateId = req.params.id;

      const existing = db
        .prepare('SELECT * FROM templates WHERE id = ?')
        .get(templateId) as TemplateRow | undefined;

      if (!existing) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      const input = req.body;

      const transaction = db.transaction(() => {
        // Update template base fields
        const updates: string[] = [];
        const params: (string | number)[] = [];

        if (input.name !== undefined) {
          updates.push('name = ?');
          params.push(input.name);
        }
        if (input.type !== undefined) {
          updates.push('type = ?');
          params.push(input.type);
        }
        if (input.description !== undefined) {
          updates.push('description = ?');
          params.push(input.description);
        }
        if (input.isDeployed !== undefined) {
          updates.push('is_deployed = ?');
          params.push(input.isDeployed ? 1 : 0);
        }

        updates.push("updated_at = datetime('now')");

        if (updates.length > 0) {
          params.push(templateId);
          db.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        // Replace categories and parameters if provided
        if (input.categories) {
          // Delete existing categories (cascade deletes parameters)
          db.prepare('DELETE FROM categories WHERE template_id = ?').run(templateId);

          const insertCategory = db.prepare(
            'INSERT INTO categories (id, template_id, name, sort_order) VALUES (?, ?, ?, ?)'
          );
          const insertParameter = db.prepare(
            'INSERT INTO judgment_parameters (id, category_id, name, weightage, comment, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
          );

          input.categories.forEach(
            (cat: { id?: string; name: string; parameters: Array<{ id?: string; name: string; weightage: number; comment: string }> }, catIdx: number) => {
              const categoryId = cat.id || uuidv4();
              insertCategory.run(categoryId, templateId, cat.name, catIdx);

              cat.parameters.forEach((param, paramIdx) => {
                const parameterId = param.id || uuidv4();
                insertParameter.run(
                  parameterId,
                  categoryId,
                  param.name,
                  param.weightage,
                  param.comment,
                  paramIdx
                );
              });
            }
          );
        }
      });

      transaction();

      logAudit(req.user!.userId, 'UPDATE', 'template', templateId);

      const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as TemplateRow;
      res.json({ template: assembleTemplate(row) });
    } catch (error) {
      logger.error({ error }, 'Failed to update template');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/templates/:id — Delete template
router.delete(
  '/:id',
  authorize('admin'),
  (req: Request, res: Response): void => {
    try {
      const db = getDb();
      const templateId = req.params.id;

      const existing = db
        .prepare('SELECT id FROM templates WHERE id = ?')
        .get(templateId);

      if (!existing) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      // Check if template is used by any DA sheets
      const usedBy = db
        .prepare('SELECT COUNT(*) as count FROM da_sheets WHERE template_id = ?')
        .get(templateId) as { count: number };

      if (usedBy.count > 0) {
        res.status(409).json({
          error: 'Cannot delete template that is in use by DA sheets',
          sheetsCount: usedBy.count,
        });
        return;
      }

      db.prepare('DELETE FROM templates WHERE id = ?').run(templateId);

      logAudit(req.user!.userId, 'DELETE', 'template', templateId);

      res.json({ message: 'Template deleted' });
    } catch (error) {
      logger.error({ error }, 'Failed to delete template');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/templates/:id/publish — Publish/unpublish template
router.post(
  '/:id/publish',
  authorize('admin'),
  (req: Request, res: Response): void => {
    try {
      const db = getDb();
      const templateId = req.params.id;

      const existing = db
        .prepare('SELECT * FROM templates WHERE id = ?')
        .get(templateId) as TemplateRow | undefined;

      if (!existing) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      const newStatus = existing.is_deployed ? 0 : 1;
      db.prepare("UPDATE templates SET is_deployed = ?, updated_at = datetime('now') WHERE id = ?").run(
        newStatus,
        templateId
      );

      const action = newStatus ? 'PUBLISH' : 'UNPUBLISH';
      logAudit(req.user!.userId, action, 'template', templateId);

      const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as TemplateRow;
      res.json({ template: assembleTemplate(row) });
    } catch (error) {
      logger.error({ error }, 'Failed to toggle template publish status');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
