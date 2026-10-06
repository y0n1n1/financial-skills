/**
 * Shannon information content of evidence, in bits.
 *
 * Port of `tfg_core/information.py`. Information is surprise: evidence consistent
 * with every competing hypothesis eliminates nothing and carries zero bits,
 * however dramatic it sounds.
 *
 * Information content and likelihood ratios are different quantities in different
 * units. `theory/bayesian-engine.md` forbids comparing or combining them: IC
 * decides what *enters* the chain, LR decides what it *does* once there.
 */

/** Qualitative label for an IC score. */
export enum Band {
  Zero = 'ZERO',
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Critical = 'CRITICAL',
}

/** Lower bound of each band, in bits, highest first. */
export const BAND_THRESHOLDS: ReadonlyArray<readonly [number, Band]> = [
  [1.5, Band.Critical],
  [1.0, Band.High],
  [0.5, Band.Medium],
  [0.0001, Band.Low],
  [0.0, Band.Zero],
];

/** Minimum IC, in bits, for evidence to enter the Bayesian chain at all. */
export const CHAIN_ADMISSION_THRESHOLD = 0.5;

/** Minimum IC, in bits, for evidence to meaningfully move the posterior. */
export const MATERIAL_THRESHOLD = 1.0;

/** One row of an ACH matrix, scored for information content. */
export type Evidence = {
  readonly label: string;
  readonly n_hypotheses: number;
  readonly n_consistent: number;
  readonly bits: number;
  readonly band: string;
  readonly admissible: boolean;
  readonly material: boolean;
};

/**
 * IC = log2(N_hypotheses / N_consistent), in bits.
 *
 * Consistency with every hypothesis gives exactly 0 bits. Consistency with none
 * is treated as the maximum the matrix can express rather than infinity: evidence
 * refuting every hypothesis under consideration means the hypothesis set is
 * incomplete, which is a modelling problem, not infinite information.
 */
export function informationContent(nHypotheses: number, nConsistent: number): number {
  if (nHypotheses <= 0) throw new Error('n_hypotheses must be positive');
  if (nConsistent <= 0) return Math.log2(nHypotheses);
  if (nConsistent > nHypotheses) throw new Error('n_consistent cannot exceed n_hypotheses');
  return Math.log2(nHypotheses / nConsistent);
}

/** Map a bit count onto its qualitative band. */
export function bandFor(bits: number): Band {
  for (const [threshold, band] of BAND_THRESHOLDS) {
    if (bits >= threshold) return band;
  }
  return Band.Zero;
}

/** Score one piece of evidence and decide whether it may enter the chain. */
export function score(label: string, nHypotheses: number, nConsistent: number): Evidence {
  const bits = informationContent(nHypotheses, nConsistent);
  return {
    label,
    n_hypotheses: nHypotheses,
    n_consistent: nConsistent,
    bits,
    band: bandFor(bits),
    admissible: bits > CHAIN_ADMISSION_THRESHOLD,
    material: bits > MATERIAL_THRESHOLD,
  };
}

/**
 * Shannon entropy of a hypothesis distribution, in bits.
 *
 * Maximal when hypotheses are equiprobable, zero once one is certain — so the
 * drop in entropy across an analysis is how much it actually learned.
 */
export function entropy(probabilities: readonly number[]): number {
  let total = 0;
  for (const p of probabilities) {
    if (p > 0) total -= p * Math.log2(p);
  }
  return total;
}

/**
 * Bits of uncertainty eliminated between two hypothesis distributions.
 *
 * Negative means the analysis left the field *more* uncertain than it started,
 * which is a legitimate finding and worth surfacing rather than hiding.
 */
export function entropyReduction(
  prior: readonly number[], posterior: readonly number[],
): number {
  return entropy(prior) - entropy(posterior);
}
