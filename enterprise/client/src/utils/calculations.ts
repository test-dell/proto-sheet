import type { CategoryData, Vendor, VendorScores, JudgmentEvaluation } from '../types';

/**
 * Calculate the total weightage of all parameters within a single category.
 */
export function getCategoryWeightage(category: CategoryData): number {
  return category.parameters.reduce((sum, param) => sum + param.weightage, 0);
}

/**
 * Calculate the total weightage across all categories.
 */
export function getTotalWeightage(categories: CategoryData[]): number {
  return categories.reduce((sum, cat) => sum + getCategoryWeightage(cat), 0);
}

/**
 * Calculate the result for a single evaluation: evalScore * weightage.
 */
export function calculateResult(evalScore: number, weightage: number): number {
  if (evalScore < 0 || evalScore > 10) return 0;
  return evalScore * weightage;
}

/**
 * Calculate the subtotal for a category within vendor scores.
 */
export function calculateCategorySubTotal(evaluations: JudgmentEvaluation[]): number {
  return evaluations.reduce((sum, evaluation) => sum + evaluation.result, 0);
}

/**
 * Calculate the overall score for a vendor across all categories.
 */
export function calculateOverallScore(scores: VendorScores): number {
  return Object.values(scores).reduce((sum, cat) => sum + cat.subTotal, 0);
}

/**
 * Create empty vendor scores based on template categories.
 */
export function createEmptyVendorScores(categories: CategoryData[]): VendorScores {
  const scores: VendorScores = {};

  for (const category of categories) {
    scores[category.id] = {
      evaluations: category.parameters.map((param) => ({
        parameterId: param.id,
        evalScore: 0,
        result: 0,
        vendorComment: '',
      })),
      subTotal: 0,
    };
  }

  return scores;
}

/**
 * Recalculate all results and subtotals for a vendor given the template categories.
 */
export function recalculateVendor(vendor: Vendor, categories: CategoryData[]): Vendor {
  const updatedScores: VendorScores = {};

  for (const category of categories) {
    const catScores = vendor.scores[category.id];
    if (!catScores) continue;

    const updatedEvaluations = catScores.evaluations.map((evaluation) => {
      const param = category.parameters.find((p) => p.id === evaluation.parameterId);
      const weightage = param?.weightage ?? 0;
      return {
        ...evaluation,
        result: calculateResult(evaluation.evalScore, weightage),
      };
    });

    updatedScores[category.id] = {
      evaluations: updatedEvaluations,
      subTotal: calculateCategorySubTotal(updatedEvaluations),
    };
  }

  return {
    ...vendor,
    scores: updatedScores,
    overallScore: calculateOverallScore(updatedScores),
  };
}
