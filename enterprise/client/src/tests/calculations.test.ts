import { describe, it, expect } from 'vitest';
import {
  getCategoryWeightage,
  getTotalWeightage,
  calculateResult,
  calculateCategorySubTotal,
  calculateOverallScore,
  createEmptyVendorScores,
  recalculateVendor,
} from '../utils/calculations';
import type { CategoryData, Vendor } from '../types';

const mockCategories: CategoryData[] = [
  {
    id: 'cat-1',
    name: 'Quality',
    parameters: [
      { id: 'p1', name: 'Expertise', weightage: 15, comment: '' },
      { id: 'p2', name: 'Code Quality', weightage: 10, comment: '' },
    ],
  },
  {
    id: 'cat-2',
    name: 'Cost',
    parameters: [
      { id: 'p3', name: 'Dev Cost', weightage: 20, comment: '' },
    ],
  },
];

describe('getCategoryWeightage', () => {
  it('should sum parameter weightages', () => {
    expect(getCategoryWeightage(mockCategories[0])).toBe(25);
    expect(getCategoryWeightage(mockCategories[1])).toBe(20);
  });

  it('should return 0 for empty parameters', () => {
    expect(getCategoryWeightage({ id: 'x', name: 'X', parameters: [] })).toBe(0);
  });
});

describe('getTotalWeightage', () => {
  it('should sum all category weightages', () => {
    expect(getTotalWeightage(mockCategories)).toBe(45);
  });

  it('should return 0 for empty categories', () => {
    expect(getTotalWeightage([])).toBe(0);
  });
});

describe('calculateResult', () => {
  it('should multiply score by weightage', () => {
    expect(calculateResult(8, 10)).toBe(80);
    expect(calculateResult(10, 15)).toBe(150);
    expect(calculateResult(0, 20)).toBe(0);
  });

  it('should return 0 for out-of-range scores', () => {
    expect(calculateResult(-1, 10)).toBe(0);
    expect(calculateResult(11, 10)).toBe(0);
  });
});

describe('calculateCategorySubTotal', () => {
  it('should sum evaluation results', () => {
    const evaluations = [
      { parameterId: 'p1', evalScore: 8, result: 80, vendorComment: '' },
      { parameterId: 'p2', evalScore: 7, result: 70, vendorComment: '' },
    ];
    expect(calculateCategorySubTotal(evaluations)).toBe(150);
  });

  it('should return 0 for empty evaluations', () => {
    expect(calculateCategorySubTotal([])).toBe(0);
  });
});

describe('calculateOverallScore', () => {
  it('should sum all category subtotals', () => {
    const scores = {
      'cat-1': {
        evaluations: [
          { parameterId: 'p1', evalScore: 8, result: 120, vendorComment: '' },
        ],
        subTotal: 120,
      },
      'cat-2': {
        evaluations: [
          { parameterId: 'p2', evalScore: 6, result: 90, vendorComment: '' },
        ],
        subTotal: 90,
      },
    };
    expect(calculateOverallScore(scores)).toBe(210);
  });
});

describe('createEmptyVendorScores', () => {
  it('should create scores for all categories and parameters', () => {
    const scores = createEmptyVendorScores(mockCategories);

    expect(Object.keys(scores)).toHaveLength(2);
    expect(scores['cat-1'].evaluations).toHaveLength(2);
    expect(scores['cat-2'].evaluations).toHaveLength(1);

    // All scores should be 0
    expect(scores['cat-1'].evaluations[0].evalScore).toBe(0);
    expect(scores['cat-1'].evaluations[0].result).toBe(0);
    expect(scores['cat-1'].subTotal).toBe(0);
  });
});

describe('recalculateVendor', () => {
  it('should recalculate results based on current weightages', () => {
    const vendor: Vendor = {
      id: 'v1',
      name: 'Test Vendor',
      scores: {
        'cat-1': {
          evaluations: [
            { parameterId: 'p1', evalScore: 8, result: 0, vendorComment: '' },
            { parameterId: 'p2', evalScore: 7, result: 0, vendorComment: '' },
          ],
          subTotal: 0,
        },
        'cat-2': {
          evaluations: [
            { parameterId: 'p3', evalScore: 9, result: 0, vendorComment: '' },
          ],
          subTotal: 0,
        },
      },
      overallScore: 0,
      notes: '',
    };

    const updated = recalculateVendor(vendor, mockCategories);

    // p1: 8 * 15 = 120, p2: 7 * 10 = 70
    expect(updated.scores['cat-1'].evaluations[0].result).toBe(120);
    expect(updated.scores['cat-1'].evaluations[1].result).toBe(70);
    expect(updated.scores['cat-1'].subTotal).toBe(190);

    // p3: 9 * 20 = 180
    expect(updated.scores['cat-2'].evaluations[0].result).toBe(180);
    expect(updated.scores['cat-2'].subTotal).toBe(180);

    expect(updated.overallScore).toBe(370);
  });
});
