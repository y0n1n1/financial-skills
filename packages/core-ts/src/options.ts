/**
 * Market-implied scenario probabilities from the Black-Scholes measure.
 *
 * Port of `tfg_core/options.py`. These are risk-neutral, not real-world,
 * probabilities: they carry the market's risk premium. Treat them as the market's
 * *pricing* of a scenario, which is what `theory/market-mechanics.md` wants to
 * compare a view against.
 */

import { normalCdf } from './numeric.js';

/** Midpoint used for the open-ended bottom bucket, as a fraction of its upper bound. */
export const BOTTOM_BUCKET_MIDPOINT = 0.5;

/** Representative level for the open-ended top bucket, as a multiple of its lower bound. */
export const TOP_BUCKET_MULTIPLE = 1.3;

/** One price bucket with its implied probability and representative return. */
export type Scenario = {
  readonly label: string;
  readonly range: string;
  readonly probability: number;
  /** Named `return` to match the published wire format; it is not a keyword here. */
  readonly return: number;
};

/** A full partition of terminal price space, plus the EV it implies. */
export type ImpliedScenarios = {
  readonly scenarios: readonly Scenario[];
  readonly ev: number;
};

/** Log-return drift and volatility over the horizon under the risk-neutral measure. */
function driftAndVol(T: number, r: number, sigma: number): [number, number] {
  return [(r - 0.5 * sigma * sigma) * T, sigma * Math.sqrt(T)];
}

/** P(S_T < K). */
export function probabilityBelow(S: number, K: number, T: number, r: number, sigma: number): number {
  const [mu, vol] = driftAndVol(T, r, sigma);
  return normalCdf((Math.log(K / S) - mu) / vol);
}

/** P(S_T > K). */
export function probabilityAbove(S: number, K: number, T: number, r: number, sigma: number): number {
  return 1 - probabilityBelow(S, K, T, r, sigma);
}

/** P(K_low < S_T < K_high). Returns 0 at or past expiry, where the range has no width. */
export function probabilityRange(
  S: number, kLow: number, kHigh: number, T: number, r: number, sigma: number,
): number {
  if (T <= 0) return 0;
  const [mu, vol] = driftAndVol(T, r, sigma);
  return normalCdf((Math.log(kHigh / S) - mu) / vol) - normalCdf((Math.log(kLow / S) - mu) / vol);
}

/** Format a price the way the Python reference's f-strings do (`:.0f`). */
function money(value: number): string {
  return Math.round(value).toString();
}

export type ScenarioArgs = {
  readonly spot: number;
  readonly iv: number;
  readonly rf: number;
  readonly expiry_years: number;
  readonly scenario_boundaries: readonly number[];
  readonly scenario_labels: readonly string[];
};

/**
 * Partition price space at the given boundaries and price each bucket.
 *
 * Produces `boundaries.length + 1` buckets, whose probabilities sum to 1 by
 * construction — so they cannot be quietly rigged the way asserted ones can.
 */
export function scenarioProbabilities(args: ScenarioArgs): ImpliedScenarios {
  const { spot, iv, rf, expiry_years, scenario_labels } = args;
  const boundaries = [...args.scenario_boundaries].sort((a, b) => a - b);
  const scenarios: Scenario[] = [];

  const first = boundaries[0]!;
  scenarios.push({
    label: scenario_labels.length === 0 ? `Below $${money(first)}` : scenario_labels[0]!,
    range: `$0 - $${money(first)}`,
    probability: probabilityBelow(spot, first, expiry_years, rf, iv),
    return: (first * BOTTOM_BUCKET_MIDPOINT - spot) / spot,
  });

  for (let i = 0; i < boundaries.length - 1; i++) {
    const low = boundaries[i]!;
    const high = boundaries[i + 1]!;
    const label =
      i + 1 < scenario_labels.length
        ? scenario_labels[i + 1]!
        : `$${money(low)}-$${money(high)}`;
    scenarios.push({
      label,
      range: `$${money(low)} - $${money(high)}`,
      probability: probabilityRange(spot, low, high, expiry_years, rf, iv),
      return: ((low + high) / 2 - spot) / spot,
    });
  }

  const top = boundaries[boundaries.length - 1]!;
  const topLabel =
    scenario_labels.length > boundaries.length
      ? scenario_labels[scenario_labels.length - 1]!
      : `Above $${money(top)}`;
  scenarios.push({
    label: topLabel,
    range: `$${money(top)}+`,
    probability: probabilityAbove(spot, top, expiry_years, rf, iv),
    return: (top * TOP_BUCKET_MULTIPLE - spot) / spot,
  });

  const ev = scenarios.reduce((sum, s) => sum + s.probability * s.return, 0);
  return { scenarios, ev };
}
