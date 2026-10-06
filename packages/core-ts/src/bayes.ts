/**
 * Bayesian updating with confidence intervals carried end to end.
 *
 * Port of `tfg_core/bayes.py`, implementing the chain specified by
 * `theory/bayesian-engine.md`. See that module's docstring for why likelihood
 * ratios carry their own uncertainty, why evidence quality dampens impact
 * mechanically, and why bias corrections are on by default.
 *
 * The point estimate is the least interesting output. The interval is the output.
 */

import {
  INSIDE_VIEW_DAMPENING,
  LR_RANGES,
  OVERCONFIDENCE_INFLATION,
  POSTERIOR_CEILING,
  POSTERIOR_FLOOR,
  Direction,
} from './constants.js';
import {
  type Uncertain,
  add,
  addScalar,
  div,
  mul,
  mulScalar,
  scalarSub,
  stdDev,
  uncertain,
} from './uncertain.js';

/** Recency decay horizon in days. Evidence older than this contributes nothing. */
export const RECENCY_HORIZON_DAYS = 730;

/** Sample size reaching this log10 saturates the sample-quality dimension. */
export const SAMPLE_LOG_SATURATION = 2;

/** Quality credit for non-primary (second-hand) sourcing. */
export const SECONDARY_SOURCE_PENALTY = 0.5;

/** Quality assumed when an update does not declare one. */
export const DEFAULT_QUALITY = 0.7;

/** One piece of evidence entering the chain. */
export type Update = {
  readonly direction: string;
  readonly quality?: number;
  readonly label?: string;
};

/**
 * The posterior after one update, with the LRs that produced it.
 *
 * Three LRs rather than one, so the effect of evidence quality stays separable
 * from the effect of bias correction.
 */
export type ChainStep = {
  readonly step: number;
  readonly label: string;
  readonly direction: string;
  readonly lr_raw: number;
  readonly lr_quality_adjusted: number;
  readonly lr_final: number;
  readonly quality: number;
  readonly posterior_mean: number;
  readonly posterior_std: number;
  readonly note: string;
};

/** Final posterior with raw and bias-corrected intervals. */
export type Posterior = {
  readonly mean: number;
  readonly std_raw: number;
  readonly std_corrected: number;
  readonly ci_68: readonly [number, number];
  readonly ci_95: readonly [number, number];
};

/** Prior, every intermediate step, and the final posterior. */
export type ChainResult = {
  readonly prior_mean: number;
  readonly prior_std: number;
  readonly chain: readonly ChainStep[];
  readonly posterior: Posterior;
  readonly bias_correction_applied: boolean;
};

/**
 * Whether a 95% interval straddles a decision boundary.
 *
 * `theory/bayesian-engine.md` requires this to be stated explicitly: a posterior
 * whose interval crosses 50% has not resolved the question, and reporting its
 * midpoint alone is false precision.
 */
export function crosses(posterior: Posterior, boundary: number): boolean {
  return posterior.ci_95[0] <= boundary && boundary <= posterior.ci_95[1];
}

/**
 * Score evidence quality in [0, 1] as the mean of four dimensions.
 *
 * `sourceTier` is 0.3 for a management claim, 0.6 for an analyst estimate, 1.0
 * for an audited filing.
 */
export function evidenceQuality(
  sourceTier: number,
  daysOld: number,
  sampleN: number,
  isPrimary: boolean,
): number {
  const recency = Math.max(0, 1 - daysOld / RECENCY_HORIZON_DAYS);
  const sample = Math.min(1, Math.log10(Math.max(1, sampleN)) / SAMPLE_LOG_SATURATION);
  const independence = isPrimary ? 1.0 : SECONDARY_SOURCE_PENALTY;
  return (sourceTier + recency + sample + independence) / 4;
}

/** Scale an LR's distance from 1.0 by evidence quality. */
export function dampenLr(rawLr: number, quality: number): number {
  return 1 + (rawLr - 1) * quality;
}

/** Single Bayesian update in probability form. */
export function update(prior: number, lr: number): number {
  const numerator = prior * lr;
  const denominator = prior * lr + (1 - prior);
  if (denominator === 0) return prior;
  return numerator / denominator;
}

/**
 * Run the full posterior chain, propagating uncertainty through every step.
 *
 * Each step re-anchors the running value as a fresh independent uncertain
 * quantity once its mean has been clamped, exactly as the Python reference does.
 * That matters: it means correlation is tracked *within* a step's quotient but
 * deliberately reset *between* steps.
 */
export function runChain(
  priorMean: number,
  priorStd: number,
  updates: readonly Update[],
  applyBiasCorrection = true,
  overconfidenceFactor = OVERCONFIDENCE_INFLATION,
  insideViewDampening = INSIDE_VIEW_DAMPENING,
): ChainResult {
  let current: Uncertain = uncertain(priorMean, priorStd);
  const chain: ChainStep[] = [];

  updates.forEach((item, i) => {
    const quality = item.quality ?? DEFAULT_QUALITY;
    const label = item.label || `Update ${i + 1}`;
    const spec = LR_RANGES[item.direction] ?? LR_RANGES[Direction.Ambiguous]!;

    if (spec.std === 0) {
      chain.push({
        step: i + 1,
        label,
        direction: item.direction,
        lr_raw: 1.0,
        lr_quality_adjusted: 1.0,
        lr_final: 1.0,
        quality,
        posterior_mean: current.nominal,
        posterior_std: stdDev(current),
        note: 'AMBIGUOUS — no update',
      });
      return;
    }

    const lrRaw = uncertain(spec.central, spec.std);
    const lrQualityAdjusted = addScalar(mulScalar(addScalar(lrRaw, -1), quality), 1);
    const lrFinal = applyBiasCorrection
      ? addScalar(mulScalar(addScalar(lrQualityAdjusted, -1), insideViewDampening), 1)
      : lrQualityAdjusted;

    // The running value appears in both numerator and denominator; `uncertain`
    // tracks that correlation so the interval does not spuriously widen.
    const weighted = mul(current, lrFinal);
    const posterior = div(weighted, add(weighted, scalarSub(1, current)));

    const clampedMean = Math.max(POSTERIOR_FLOOR, Math.min(POSTERIOR_CEILING, posterior.nominal));
    current = uncertain(clampedMean, stdDev(posterior));

    chain.push({
      step: i + 1,
      label,
      direction: item.direction,
      lr_raw: lrRaw.nominal,
      lr_quality_adjusted: lrQualityAdjusted.nominal,
      lr_final: lrFinal.nominal,
      quality,
      posterior_mean: current.nominal,
      posterior_std: stdDev(current),
      note: '',
    });
  });

  const finalMean = current.nominal;
  const stdRaw = stdDev(current);
  const stdCorrected = applyBiasCorrection ? stdRaw * overconfidenceFactor : stdRaw;

  return {
    prior_mean: priorMean,
    prior_std: priorStd,
    chain,
    posterior: {
      mean: finalMean,
      std_raw: stdRaw,
      std_corrected: stdCorrected,
      ci_68: [Math.max(0, finalMean - stdCorrected), Math.min(1, finalMean + stdCorrected)],
      ci_95: [
        Math.max(0, finalMean - 2 * stdCorrected),
        Math.min(1, finalMean + 2 * stdCorrected),
      ],
    },
    bias_correction_applied: applyBiasCorrection,
  };
}
