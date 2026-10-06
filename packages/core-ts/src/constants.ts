/**
 * Shared constants and enumerations.
 *
 * Mirrors `tfg_core/constants.py`. These values are the registry referenced by
 * `theory/safeguards.md`: changing one is a versioned methodology change, not a
 * per-analysis tweak, so they live in one place in both languages.
 */

/** Ordinal evidence direction. The only admissible inputs to a Bayesian chain. */
export enum Direction {
  StrongFor = 'STRONG_FOR',
  ModerateFor = 'MODERATE_FOR',
  WeakFor = 'WEAK_FOR',
  Ambiguous = 'AMBIGUOUS',
  WeakAgainst = 'WEAK_AGAINST',
  ModerateAgainst = 'MODERATE_AGAINST',
  StrongAgainst = 'STRONG_AGAINST',
}

/** Input provenance. Only Empirical and SemiEmpirical may narrow a posterior. */
export enum Tier {
  Empirical = 'EMPIRICAL',
  SemiEmpirical = 'SEMI_EMPIRICAL',
  Subjective = 'SUBJECTIVE',
}

/** An ordinal direction's central likelihood ratio and its own uncertainty. */
export type LrRange = { readonly central: number; readonly std: number };

/** Ordinal likelihood-ratio ranges. */
export const LR_RANGES: Readonly<Record<string, LrRange>> = {
  [Direction.StrongFor]: { central: 1.40, std: 0.15 },
  [Direction.ModerateFor]: { central: 1.15, std: 0.10 },
  [Direction.WeakFor]: { central: 1.05, std: 0.05 },
  [Direction.Ambiguous]: { central: 1.00, std: 0.00 },
  [Direction.WeakAgainst]: { central: 0.95, std: 0.05 },
  [Direction.ModerateAgainst]: { central: 0.85, std: 0.10 },
  [Direction.StrongAgainst]: { central: 0.60, std: 0.15 },
};

/** Evidence-quality dampening by provenance tier. */
export const TIER_DAMPENING: Readonly<Record<string, number>> = {
  [Tier.Empirical]: 1.0,
  [Tier.SemiEmpirical]: 0.8,
  [Tier.Subjective]: 0.6,
};

/** Final confidence intervals are inflated by this factor to offset overconfidence. */
export const OVERCONFIDENCE_INFLATION = 1.5;

/** Inside-view likelihood ratios are dampened by this factor before updating. */
export const INSIDE_VIEW_DAMPENING = 0.6;

/** Posteriors are clamped here: certainty is never earned from a finite chain. */
export const POSTERIOR_FLOOR = 0.05;
export const POSTERIOR_CEILING = 0.95;
