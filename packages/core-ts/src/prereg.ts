/**
 * Pre-registration: detecting motivated reasoning by committing first.
 *
 * Port of `tfg_core/prereg.py`. Write down the prior and the posterior you
 * *expect* before running the analysis. If the finished analysis lands markedly
 * further in your pre-existing direction than you predicted, that asymmetry is the
 * signal.
 *
 * The asymmetric thresholds are deliberate: only the confirming direction is
 * evidence of the bias this check exists to catch.
 */

/** The direction the analyst declared before analysing. */
export enum Lean {
  Bullish = 'bullish',
  SlightlyBullish = 'slightly bullish',
  Neutral = 'neutral',
  SlightlyBearish = 'slightly bearish',
  Bearish = 'bearish',
}

export const BULLISH_LEANS: readonly string[] = [Lean.Bullish, Lean.SlightlyBullish];
export const BEARISH_LEANS: readonly string[] = [Lean.Bearish, Lean.SlightlyBearish];

/** Drift that *confirms* a declared lean is flagged beyond this many points. */
export const CONFIRMING_DRIFT_THRESHOLD = 0.10;

/** With no declared lean, drift in either direction is flagged beyond this. */
export const UNDIRECTED_DRIFT_THRESHOLD = 0.15;

/** Pre-registered expectation versus the posterior actually produced. */
export type Comparison = {
  readonly expected_posterior: number;
  readonly actual_posterior: number;
  readonly divergence: number;
  readonly motivated_reasoning_flag: boolean;
  readonly reason: string;
};

/** Format as Python's `:.0%`. */
function pct0(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Format as Python's `:+.0%`. */
function signedPct0(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

/**
 * Flag drift that confirms the declared lean.
 *
 * Drift *against* the declared lean is never flagged: that is the analysis working.
 */
export function compare(
  expectedPosterior: number, actualPosterior: number, expectedDirection: string,
): Comparison {
  const divergence = actualPosterior - expectedPosterior;
  let flag = false;
  let reason = 'No motivated reasoning detected. Actual within expected range.';

  if (BULLISH_LEANS.includes(expectedDirection)) {
    if (divergence > CONFIRMING_DRIFT_THRESHOLD) {
      flag = true;
      reason =
        `Actual posterior (${pct0(actualPosterior)}) is ${signedPct0(divergence)} more bullish ` +
        `than pre-registered expectation (${pct0(expectedPosterior)}). ` +
        'Possible confirmation bias toward bull thesis.';
    }
  } else if (BEARISH_LEANS.includes(expectedDirection)) {
    if (divergence < -CONFIRMING_DRIFT_THRESHOLD) {
      flag = true;
      reason =
        `Actual posterior (${pct0(actualPosterior)}) is ${pct0(Math.abs(divergence))} more bearish ` +
        `than pre-registered expectation (${pct0(expectedPosterior)}). ` +
        'Possible confirmation bias toward bear thesis.';
    }
  } else if (Math.abs(divergence) > UNDIRECTED_DRIFT_THRESHOLD) {
    flag = true;
    reason =
      `Actual posterior (${pct0(actualPosterior)}) diverged ${signedPct0(divergence)} from ` +
      `expectation (${pct0(expectedPosterior)}). Large unexplained divergence.`;
  }

  return {
    expected_posterior: expectedPosterior,
    actual_posterior: actualPosterior,
    divergence,
    motivated_reasoning_flag: flag,
    reason,
  };
}
