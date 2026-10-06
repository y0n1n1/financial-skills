/**
 * Lens reliability as diagnostic test theory.
 *
 * Port of `tfg_core/reliability.py`. Each analytical lens is a diagnostic test
 * with a sensitivity, a specificity, and — the part that matters — a predictive
 * value that depends on the base rate. When most theories are wrong, a SUPPORTS
 * verdict from an 80%-sensitive lens means far less than 80%.
 */

/** What a lens concluded about the theory. */
export enum Verdict {
  Supports = 'SUPPORTS',
  Neutral = 'NEUTRAL',
  Undermines = 'UNDERMINES',
}

/**
 * A lens's measured reliability and its weight in the verdict tally.
 *
 * `sensitivity` is null for lenses that only ever disconfirm: a pre-mortem cannot
 * "detect a correct theory", so it has specificity but no sensitivity.
 */
export type Lens = {
  readonly name: string;
  readonly sensitivity: number | null;
  readonly specificity: number;
  readonly weight: number;
};

/**
 * Starting reliability estimates from `theory/lens-reliability.md`.
 * Priors to be calibrated against outcomes, not measured constants.
 */
export const LENSES: Readonly<Record<string, Lens>> = {
  fundamental: { name: 'Fundamental', sensitivity: 0.75, specificity: 0.70, weight: 1.0 },
  technical: { name: 'Technical', sensitivity: 0.55, specificity: 0.50, weight: 0.5 },
  competitive_moat: { name: 'Competitive Moat', sensitivity: 0.70, specificity: 0.75, weight: 0.9 },
  macro_sector: { name: 'Macro/Sector', sensitivity: 0.65, specificity: 0.60, weight: 0.7 },
  sentiment: { name: 'Sentiment', sensitivity: 0.60, specificity: 0.45, weight: 0.4 },
  contrarian_check: { name: 'Contrarian Check', sensitivity: 0.80, specificity: 0.80, weight: 1.2 },
  historical_analogues: { name: 'Historical Analogues', sensitivity: 0.70, specificity: 0.75, weight: 1.1 },
  pre_mortem: { name: 'Pre-Mortem', sensitivity: null, specificity: 0.85, weight: 1.0 },
  reflexivity: { name: 'Reflexivity', sensitivity: null, specificity: 0.70, weight: 0.8 },
};

/** Sensitivity assumed for a disconfirmation-only lens: an uninformative coin flip. */
export const DISCONFIRMATION_ONLY_SENSITIVITY = 0.5;

/** What a lens's verdict is actually worth at a given base rate. */
export type PredictiveValues = {
  readonly base_rate: number;
  readonly sensitivity: number;
  readonly specificity: number;
  readonly ppv: number;
  readonly npv: number;
};

/** Reliability-weighted verdict count across several lenses. */
export type WeightedTally = {
  readonly weighted_sum: number;
  readonly max_possible: number;
  readonly weighted_support: number;
  readonly raw_support: number;
  readonly divergence: number;
};

/**
 * How far a SUPPORTS verdict moves belief above the base rate.
 * Near zero means the verdict carries no information, however confident the lens sounded.
 */
export function ppvLift(values: PredictiveValues): number {
  return values.ppv - values.base_rate;
}

/**
 * P(theory correct | lens says SUPPORTS).
 *
 * The denominator's second term is false-positive mass, which grows as the base
 * rate falls. That is why a good lens can still have a mediocre PPV.
 */
export function positivePredictiveValue(
  sensitivity: number, specificity: number, baseRate: number,
): number {
  const truePositive = sensitivity * baseRate;
  const falsePositive = (1 - specificity) * (1 - baseRate);
  const denominator = truePositive + falsePositive;
  if (denominator === 0) return 0;
  return truePositive / denominator;
}

/** P(theory wrong | lens says UNDERMINES). */
export function negativePredictiveValue(
  sensitivity: number, specificity: number, baseRate: number,
): number {
  const trueNegative = specificity * (1 - baseRate);
  const falseNegative = (1 - sensitivity) * baseRate;
  const denominator = trueNegative + falseNegative;
  if (denominator === 0) return 0;
  return trueNegative / denominator;
}

/** Compute predictive values for one named lens at a base rate. */
export function evaluateLens(lensKey: string, baseRate: number): PredictiveValues {
  const lens = LENSES[lensKey];
  if (!lens) throw new Error(`evaluateLens: unknown lens "${lensKey}"`);
  const sensitivity = lens.sensitivity ?? DISCONFIRMATION_ONLY_SENSITIVITY;
  return {
    base_rate: baseRate,
    sensitivity,
    specificity: lens.specificity,
    ppv: positivePredictiveValue(sensitivity, lens.specificity, baseRate),
    npv: negativePredictiveValue(sensitivity, lens.specificity, baseRate),
  };
}

/**
 * Score verdicts by lens weight instead of counting them equally.
 *
 * The worked example in `theory/lens-reliability.md` turns a raw 83% into a
 * weighted 41%, because one high-weight contrarian UNDERMINES offsets several
 * weak SUPPORTS. `weighted_support` runs from -1 to +1 and goes negative when
 * undermining outweighs support.
 */
export function weightedTally(verdicts: Readonly<Record<string, string>>): WeightedTally {
  let weightedSum = 0;
  let maxPossible = 0;
  let rawPositive = 0;
  let counted = 0;

  for (const [key, verdict] of Object.entries(verdicts)) {
    const lens = LENSES[key];
    if (!lens) throw new Error(`weightedTally: unknown lens "${key}"`);
    maxPossible += lens.weight;
    if (verdict === Verdict.Supports) {
      weightedSum += lens.weight;
      rawPositive += 1;
    } else if (verdict === Verdict.Undermines) {
      weightedSum -= lens.weight;
    }
    counted += 1;
  }

  const weightedSupport = maxPossible ? weightedSum / maxPossible : 0;
  const rawSupport = counted ? rawPositive / counted : 0;

  return {
    weighted_sum: weightedSum,
    max_possible: maxPossible,
    weighted_support: weightedSupport,
    raw_support: rawSupport,
    divergence: weightedSupport - rawSupport,
  };
}
