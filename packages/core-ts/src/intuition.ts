/**
 * Scoring for human overrides of a model estimate.
 *
 * Port of `tfg_core/intuition.py`. Distinct from calibration, which scores all
 * forecasts. This scores only disagreements, and asks the narrower question: did
 * the override move the estimate toward the truth or away from it?
 */

/** Kind of judgement the override exercised. */
export enum DivergenceCategory {
  FinancialForecast = 'financial_forecast',
  CompetitiveDynamics = 'competitive_dynamics',
  MacroCycle = 'macro_cycle',
  HumanDecision = 'human_decision',
  ProductAdoption = 'product_adoption',
  Other = 'other',
}

/** Substrings mapping a parameter name onto its category, checked in order. */
export const CATEGORY_KEYWORDS: ReadonlyArray<readonly [DivergenceCategory, readonly string[]]> = [
  [DivergenceCategory.FinancialForecast, ['margin', 'revenue', 'earnings']],
  [DivergenceCategory.CompetitiveDynamics, ['silicon', 'share', 'moat', 'cuda']],
  [DivergenceCategory.MacroCycle, ['capex', 'regime', 'vix', 'fed']],
  [DivergenceCategory.HumanDecision, ['doj', 'antitrust', 'regulation']],
  [DivergenceCategory.ProductAdoption, ['gemini', 'engagement', 'adoption']],
];

/** A recorded disagreement between the model and a human estimate. */
export type Divergence = {
  readonly parameter: string;
  readonly model_recommendation: number;
  readonly human_answer: number;
  readonly certainty: number;
};

/** Which estimate turned out closer once the truth was known. */
export type Resolution = {
  readonly actual: number;
  readonly model_error: number;
  readonly human_error: number;
  readonly human_was_better: boolean;
  readonly error_reduction: number;
};

/** Infer a category from a parameter name, falling back to Other. */
export function categorize(parameter: string): DivergenceCategory {
  const name = parameter.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => name.includes(keyword))) return category;
  }
  return DivergenceCategory.Other;
}

/** Signed distance from the model's estimate. Positive is more bullish. */
export function divergenceOf(d: Divergence): number {
  return d.human_answer - d.model_recommendation;
}

/**
 * Score an override against the realised value.
 *
 * `error_reduction` is positive when the human estimate was closer, and is the
 * quantity worth aggregating: a run of correct-direction overrides that barely
 * improve accuracy is not evidence of useful intuition.
 */
export function resolve(divergence: Divergence, actual: number): Resolution {
  const modelError = Math.abs(divergence.model_recommendation - actual);
  const humanError = Math.abs(divergence.human_answer - actual);
  return {
    actual,
    model_error: modelError,
    human_error: humanError,
    human_was_better: humanError < modelError,
    error_reduction: modelError - humanError,
  };
}
