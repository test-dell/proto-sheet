// ─── User Types ─────────────────────────────────────────────────

export interface User {
  id: string;
  empCode: string;
  email: string;
  role: 'admin' | 'user';
}

// ─── Template Types ─────────────────────────────────────────────

export type DAType = 'License' | 'Custom Development' | 'SaaS';
export type DAStatus = 'Draft' | 'Submitted' | 'Approved';
export type AccessLevel = 'view' | 'edit';

export interface JudgmentParameter {
  id: string;
  name: string;
  weightage: 5 | 10 | 15 | 20 | 25 | 30;
  comment: string;
}

export interface CategoryData {
  id: string;
  name: string;
  parameters: JudgmentParameter[];
}

export interface Template {
  id: string;
  name: string;
  type: DAType;
  description: string;
  categories: CategoryData[];
  isDeployed: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── DA Sheet Types ─────────────────────────────────────────────

export interface JudgmentEvaluation {
  parameterId: string;
  evalScore: number;
  result: number;
  vendorComment: string;
}

export interface VendorScores {
  [categoryId: string]: {
    evaluations: JudgmentEvaluation[];
    subTotal: number;
  };
}

export interface Vendor {
  id: string;
  name: string;
  scores: VendorScores;
  overallScore: number;
  notes: string;
}

export interface SharedAccess {
  email: string;
  accessLevel: AccessLevel;
  sharedAt: string;
}

export interface DASheet {
  id: string;
  name: string;
  type: DAType;
  status: DAStatus;
  templateId: string;
  vendors: Vendor[];
  notes: string;
  version: number;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sharedWith: SharedAccess[];
}

// ─── API Response Types ─────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}
