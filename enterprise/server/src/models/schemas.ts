import { z } from 'zod';

// ─── Auth Schemas ───────────────────────────────────────────────

export const loginSchema = z.object({
  empCode: z.string().min(1, 'Employee code is required').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  empCode: z.string().min(1).max(50),
  email: z
    .string()
    .email('Invalid email address')
    .max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  role: z.enum(['admin', 'user']).default('user'),
});

// ─── Template Schemas ───────────────────────────────────────────

export const judgmentParameterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Parameter name is required').max(200),
  weightage: z.union([
    z.literal(5),
    z.literal(10),
    z.literal(15),
    z.literal(20),
    z.literal(25),
    z.literal(30),
  ]),
  comment: z.string().max(1000).default(''),
});

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Category name is required').max(200),
  parameters: z.array(judgmentParameterSchema).min(1, 'At least one parameter is required'),
});

export const daTypeSchema = z.enum(['License', 'Custom Development', 'SaaS']);

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  type: daTypeSchema,
  description: z.string().max(2000).default(''),
  categories: z.array(categorySchema).min(1, 'At least one category is required'),
  isDeployed: z.boolean().default(false),
});

export const updateTemplateSchema = createTemplateSchema.partial();

// ─── DA Sheet Schemas ───────────────────────────────────────────

export const daStatusSchema = z.enum(['Draft', 'Submitted', 'Approved']);

export const judgmentEvaluationSchema = z.object({
  parameterId: z.string(),
  evalScore: z.number().min(0).max(10),
  result: z.number().min(0),
  vendorComment: z.string().max(2000).default(''),
});

export const vendorScoresSchema = z.record(
  z.string(),
  z.object({
    evaluations: z.array(judgmentEvaluationSchema),
    subTotal: z.number().min(0),
  })
);

export const vendorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Vendor name is required').max(200),
  scores: vendorScoresSchema.optional().default({}),
  overallScore: z.number().min(0).default(0),
  notes: z.string().max(2000).default(''),
});

export const createDASheetSchema = z.object({
  name: z.string().min(1, 'Sheet name is required').max(200),
  type: daTypeSchema,
  templateId: z.string(),
  vendors: z.array(vendorSchema).default([]),
  notes: z.string().max(5000).default(''),
});

export const updateDASheetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: daStatusSchema.optional(),
  vendors: z.array(vendorSchema).optional(),
  notes: z.string().max(5000).optional(),
});

export const shareAccessSchema = z.object({
  email: z.string().email('Invalid email'),
  accessLevel: z.enum(['view', 'edit']),
});

// ─── Query Parameter Schemas ────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sheetFiltersSchema = paginationSchema.extend({
  type: daTypeSchema.optional(),
  status: daStatusSchema.optional(),
  search: z.string().max(200).optional(),
});

export const templateFiltersSchema = paginationSchema.extend({
  type: daTypeSchema.optional(),
  deployed: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
});

// ─── Type Exports ───────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CreateDASheetInput = z.infer<typeof createDASheetSchema>;
export type UpdateDASheetInput = z.infer<typeof updateDASheetSchema>;
export type ShareAccessInput = z.infer<typeof shareAccessSchema>;
export type JudgmentParameterInput = z.infer<typeof judgmentParameterSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
