/**
 * Kelly criterion, used as a binary entry gate rather than a position sizer.
 *
 * Port of `tfg_core/kelly.py`. `sizing/SKILL.md` is explicit: Kelly answers
 * "does this trade have positive expected value?" and nothing else. The *size*
 * comes from Black-Litterman.
 */

/** Outcome of the entry gate. */
export enum Gate {
  Pass = 'PASS',
  Marginal = 'MARGINAL',
  Excluded = 'EXCLUDED',
}

/** A positive fraction below this is a rounding error, not an edge. */
export const MARGINAL_THRESHOLD = 0.05;

/**
 * Conviction-to-probability heuristic from `sizing/kelly.md`.
 * A starting point only — a Bayesian posterior should replace it when available.
 */
export const CONVICTION_PRIORS: Readonly<Record<number, number>> = {
  5: 0.85, 4: 0.70, 3: 0.55, 2: 0.40, 1: 0.25,
};

export const HALF_KELLY = 0.5;
export const QUARTER_KELLY = 0.25;

/** The fraction, its fractional multiples, and the gate verdict. */
export type KellyResult = {
  readonly probability: number;
  readonly win_loss_ratio: number;
  readonly fraction: number;
  readonly half: number;
  readonly quarter: number;
  readonly gate: string;
  readonly reason: string;
};

/** Whether a position may be sized at all. */
export function passes(result: KellyResult): boolean {
  return result.gate !== Gate.Excluded;
}

/**
 * f* = (p*b - q) / b.
 *
 * `winLossRatio` is upside over downside, both positive magnitudes. Returns 0 for
 * a non-positive ratio, where the bet is undefined rather than merely bad.
 */
export function kellyFraction(probability: number, winLossRatio: number): number {
  if (winLossRatio <= 0) return 0;
  const q = 1 - probability;
  return (probability * winLossRatio - q) / winLossRatio;
}

/**
 * Expected log growth per bet at a given staked fraction.
 *
 * The quantity Kelly maximises, and what shows why full Kelly is the peak of a
 * curve that falls off steeply on the right.
 */
export function growthRate(
  probability: number, winLossRatio: number, fraction: number,
): number {
  const win = 1 + fraction * winLossRatio;
  const loss = 1 - fraction;
  if (win <= 0 || loss <= 0) return -Infinity;
  return probability * Math.log(win) + (1 - probability) * Math.log(loss);
}

/** Format as Python's `:.1%`. */
function pct1(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Run the entry gate on an upside/downside pair.
 *
 * Both are positive magnitudes: a 52% upside against a 25% downside is
 * `(0.52, 0.25)`. A non-positive downside is rejected, not treated as free money.
 */
export function evaluate(
  probability: number, upside: number, downside: number,
): KellyResult {
  if (downside <= 0) {
    return {
      probability, win_loss_ratio: Infinity, fraction: 0, half: 0, quarter: 0,
      gate: Gate.Excluded,
      reason: 'Downside must be a positive magnitude; a riskless bet is not modelled.',
    };
  }

  const b = upside / downside;
  const f = kellyFraction(probability, b);

  let gate: Gate;
  let reason: string;
  if (f <= 0) {
    gate = Gate.Excluded;
    reason = `Negative expected value at p=${pct1(probability)} and b=${b.toFixed(2)}. Excluded — no override.`;
  } else if (f < MARGINAL_THRESHOLD) {
    gate = Gate.Marginal;
    reason = `Positive but thin edge (f*=${f.toFixed(3)}). Passes the gate; treat the edge as within estimation error.`;
  } else {
    gate = Gate.Pass;
    reason = `Positive expected value (f*=${f.toFixed(3)}).`;
  }

  return {
    probability, win_loss_ratio: b, fraction: f,
    half: f * HALF_KELLY, quarter: f * QUARTER_KELLY, gate, reason,
  };
}

/**
 * The win rate at which f* crosses zero, i.e. the gate's threshold.
 * Below this, no payoff ratio rescues the trade.
 */
export function breakevenProbability(winLossRatio: number): number {
  if (winLossRatio <= 0) return 1;
  return 1 / (1 + winLossRatio);
}
