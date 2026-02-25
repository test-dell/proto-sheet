export interface User {
  empCode: string;
  role: 'admin' | 'user';
  email: string;
}

export type DAType = 'License' | 'Custom Development' | 'SaaS';
export type DAStatus = 'Draft' | 'Submitted' | 'Approved';
export type AccessLevel = 'view' | 'edit';

export interface SharedAccess {
  email: string;
  accessLevel: AccessLevel;
  sharedAt: Date;
}

// Judgment parameter within a category
export interface JudgmentParameter {
  id: string;
  name: string;
  weightage: 5 | 10 | 15 | 20 | 25 | 30; // W% in the template - restricted to multiples of 5, max 30%
  comment: string; // Description/criteria text
}

// Dynamic category structure
export interface CategoryData {
  id: string;
  name: string;
  parameters: JudgmentParameter[];
}

// Evaluation score for a specific judgment parameter for a vendor
export interface JudgmentEvaluation {
  parameterId: string;
  evalScore: number; // Evaluation score (0-10)
  result: number; // Auto-calculated: evalScore × weightage
  vendorComment?: string; // Individual comment for this vendor against this parameter
}

// Vendor evaluation scores grouped by categories (dynamic)
export interface VendorScores {
  [categoryId: string]: {
    evaluations: JudgmentEvaluation[];
    subTotal: number; // Sum of all results in this category
  };
}

export interface Vendor {
  id: string;
  name: string;
  // Removed other fields - only keeping name
  scores: VendorScores;
  overallScore: number; // Sum of all subTotals
  notes: string;
}

// Template structure with dynamic categories
export interface Template {
  id: string;
  name: string;
  type: DAType;
  description: string;
  categories: CategoryData[];
  customFields: CustomField[];
  isDeployed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DASheet {
  id: string;
  name: string;
  type: DAType;
  status: DAStatus;
  templateId: string;
  vendors: Vendor[];
  selectedVendorId?: string;
  notes: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  sharedWith?: SharedAccess[];
}

export interface CustomField {
  label: string;
  type: string;
  required: boolean;
}