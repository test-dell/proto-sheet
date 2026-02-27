import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import oracledb from 'oracledb';
import { getConnection, transaction, execute } from '../db/index.js';
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

// Oracle returns UPPERCASE column names
interface CategoryRow {
  ID: string;
  TEMPLATE_ID: string;
  NAME: string;
  SORT_ORDER: number;
}

interface ParameterRow {
  ID: string;
  CATEGORY_ID: string;
  NAME: string;
  WEIGHTAGE: number;
  COMMENT: string;
  SORT_ORDER: number;
}

interface TemplateRow {
  ID: string;
  NAME: string;
  TYPE: string;
  DESCRIPTION: string;
  IS_DEPLOYED: number;
  CREATED_BY: string | null;
  CREATED_AT: string;
  UPDATED_AT: string;
}

async function assembleTemplate(row: TemplateRow) {
  const catResult = await execute<CategoryRow>(
    'SELECT * FROM categories WHERE template_id = :templateId ORDER BY sort_order',
    { templateId: row.ID }
  );

  const categories = catResult.rows || [];

  const categoriesWithParams = await Promise.all(
    categories.map(async (cat) => {
      const paramResult = await execute<ParameterRow>(
        'SELECT * FROM judgment_parameters WHERE category_id = :categoryId ORDER BY sort_order',
        { categoryId: cat.ID }
      );

      return {
        id: cat.ID,
        name: cat.NAME,
        parameters: (paramResult.rows || []).map((p) => ({
          id: p.ID,
          name: p.NAME,
          weightage: p.WEIGHTAGE,
          comment: p.COMMENT,
        })),
      };
    })
  );

  return {
    id: row.ID,
    name: row.NAME,
    type: row.TYPE,
    description: row.DESCRIPTION,
    isDeployed: row.IS_DEPLOYED === 1,
    categories: categoriesWithParams,
    createdBy: row.CREATED_BY,
    createdAt: String(row.CREATED_AT),
    updatedAt: String(row.UPDATED_AT),
  };
}

// GET /api/templates — List templates with filters
router.get(
  '/',
  validate(templateFiltersSchema, 'query'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, type, deployed, search } = req.query as Record<string, string>;
      const pageNum = Number(page || 1);
      const limitNum = Number(limit || 20);
      const offset = (pageNum - 1) * limitNum;

      let query = 'SELECT * FROM templates';
      let countQuery = 'SELECT COUNT(*) AS TOTAL FROM templates';
      const conditions: string[] = [];
      const binds: Record<string, string | number> = {};

      if (type) {
        conditions.push('type = :type');
        binds.type = type;
      }
      if (deployed !== undefined) {
        conditions.push('is_deployed = :deployed');
        binds.deployed = deployed === 'true' ? 1 : 0;
      }
      if (search) {
        conditions.push('(name LIKE :search OR description LIKE :search)');
        binds.search = `%${search}%`;
      }

      if (conditions.length > 0) {
        const where = ' WHERE ' + conditions.join(' AND ');
        query += where;
        countQuery += where;
      }

      const countResult = await execute<{ TOTAL: number }>(countQuery, binds);
      const total = countResult.rows?.[0]?.TOTAL ?? 0;

      query += ' ORDER BY updated_at DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY';
      const rowResult = await execute<TemplateRow>(query, { ...binds, offset, limit: limitNum });

      const templates = await Promise.all((rowResult.rows || []).map(assembleTemplate));

      res.json({
        templates,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list templates');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/templates/:id — Get single template
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await execute<TemplateRow>(
      'SELECT * FROM templates WHERE id = :id',
      { id: req.params.id }
    );

    const row = result.rows?.[0];
    if (!row) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ template: await assembleTemplate(row) });
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
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input: CreateTemplateInput = req.body;
      const templateId = uuidv4();

      await transaction(async (conn) => {
        await conn.execute(
          `INSERT INTO templates (id, name, type, description, is_deployed, created_by)
           VALUES (:id, :name, :type, :description, :isDeployed, :createdBy)`,
          {
            id: templateId,
            name: input.name,
            type: input.type,
            description: input.description,
            isDeployed: input.isDeployed ? 1 : 0,
            createdBy: req.user!.userId,
          }
        );

        for (let catIdx = 0; catIdx < input.categories.length; catIdx++) {
          const cat = input.categories[catIdx];
          const categoryId = cat.id || uuidv4();

          await conn.execute(
            `INSERT INTO categories (id, template_id, name, sort_order)
             VALUES (:id, :templateId, :name, :sortOrder)`,
            { id: categoryId, templateId, name: cat.name, sortOrder: catIdx }
          );

          for (let paramIdx = 0; paramIdx < cat.parameters.length; paramIdx++) {
            const param = cat.parameters[paramIdx];
            await conn.execute(
              `INSERT INTO judgment_parameters (id, category_id, name, weightage, comment, sort_order)
               VALUES (:id, :categoryId, :name, :weightage, :comment, :sortOrder)`,
              {
                id: param.id || uuidv4(),
                categoryId,
                name: param.name,
                weightage: param.weightage,
                comment: param.comment,
                sortOrder: paramIdx,
              }
            );
          }
        }
      });

      await logAudit(req.user!.userId, 'CREATE', 'template', templateId, {
        name: input.name,
        type: input.type,
      });

      const result = await execute<TemplateRow>(
        'SELECT * FROM templates WHERE id = :id',
        { id: templateId }
      );
      res.status(201).json({ template: await assembleTemplate(result.rows![0]) });
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
  async (req: Request, res: Response): Promise<void> => {
    try {
      const templateId = req.params.id;

      const existing = await execute<TemplateRow>(
        'SELECT * FROM templates WHERE id = :id',
        { id: templateId }
      );

      if (!existing.rows?.length) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      const input = req.body;

      await transaction(async (conn) => {
        // Update base fields
        const setClauses: string[] = [];
        const binds: Record<string, string | number> = { templateId };

        if (input.name !== undefined) {
          setClauses.push('name = :name');
          binds.name = input.name;
        }
        if (input.type !== undefined) {
          setClauses.push('type = :type');
          binds.type = input.type;
        }
        if (input.description !== undefined) {
          setClauses.push('description = :description');
          binds.description = input.description;
        }
        if (input.isDeployed !== undefined) {
          setClauses.push('is_deployed = :isDeployed');
          binds.isDeployed = input.isDeployed ? 1 : 0;
        }

        setClauses.push('updated_at = SYSTIMESTAMP');

        if (setClauses.length > 0) {
          await conn.execute(
            `UPDATE templates SET ${setClauses.join(', ')} WHERE id = :templateId`,
            binds
          );
        }

        // Replace categories if provided
        if (input.categories) {
          await conn.execute(
            'DELETE FROM categories WHERE template_id = :templateId',
            { templateId }
          );

          for (let catIdx = 0; catIdx < input.categories.length; catIdx++) {
            const cat = input.categories[catIdx];
            const categoryId = cat.id || uuidv4();

            await conn.execute(
              `INSERT INTO categories (id, template_id, name, sort_order)
               VALUES (:id, :templateId, :name, :sortOrder)`,
              { id: categoryId, templateId, name: cat.name, sortOrder: catIdx }
            );

            for (let paramIdx = 0; paramIdx < cat.parameters.length; paramIdx++) {
              const param = cat.parameters[paramIdx];
              await conn.execute(
                `INSERT INTO judgment_parameters (id, category_id, name, weightage, comment, sort_order)
                 VALUES (:id, :categoryId, :name, :weightage, :comment, :sortOrder)`,
                {
                  id: param.id || uuidv4(),
                  categoryId,
                  name: param.name,
                  weightage: param.weightage,
                  comment: param.comment,
                  sortOrder: paramIdx,
                }
              );
            }
          }
        }
      });

      await logAudit(req.user!.userId, 'UPDATE', 'template', templateId);

      const result = await execute<TemplateRow>(
        'SELECT * FROM templates WHERE id = :id',
        { id: templateId }
      );
      res.json({ template: await assembleTemplate(result.rows![0]) });
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
  async (req: Request, res: Response): Promise<void> => {
    try {
      const templateId = req.params.id;

      const existing = await execute<{ ID: string }>(
        'SELECT id FROM templates WHERE id = :id',
        { id: templateId }
      );

      if (!existing.rows?.length) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      const usedBy = await execute<{ CNT: number }>(
        'SELECT COUNT(*) AS CNT FROM da_sheets WHERE template_id = :templateId',
        { templateId }
      );

      if ((usedBy.rows?.[0]?.CNT ?? 0) > 0) {
        res.status(409).json({
          error: 'Cannot delete template that is in use by DA sheets',
          sheetsCount: usedBy.rows![0].CNT,
        });
        return;
      }

      await transaction(async (conn) => {
        await conn.execute('DELETE FROM templates WHERE id = :id', { id: templateId });
      });

      await logAudit(req.user!.userId, 'DELETE', 'template', templateId);

      res.json({ message: 'Template deleted' });
    } catch (error) {
      logger.error({ error }, 'Failed to delete template');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/templates/:id/publish — Toggle publish/unpublish
router.post(
  '/:id/publish',
  authorize('admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const templateId = req.params.id;

      const existing = await execute<TemplateRow>(
        'SELECT * FROM templates WHERE id = :id',
        { id: templateId }
      );

      if (!existing.rows?.length) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      const newStatus = existing.rows[0].IS_DEPLOYED ? 0 : 1;

      await transaction(async (conn) => {
        await conn.execute(
          'UPDATE templates SET is_deployed = :newStatus, updated_at = SYSTIMESTAMP WHERE id = :id',
          { newStatus, id: templateId }
        );
      });

      const action = newStatus ? 'PUBLISH' : 'UNPUBLISH';
      await logAudit(req.user!.userId, action, 'template', templateId);

      const result = await execute<TemplateRow>(
        'SELECT * FROM templates WHERE id = :id',
        { id: templateId }
      );
      res.json({ template: await assembleTemplate(result.rows![0]) });
    } catch (error) {
      logger.error({ error }, 'Failed to toggle template publish status');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
