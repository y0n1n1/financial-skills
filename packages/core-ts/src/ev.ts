/**
 * Expected value from the revenue x multiple matrix.
 *
 * Port of `tfg_core/ev.py`. Two estimators over the same matrix: a closed-form
 * expectation, and a Monte Carlo simulation returning a *distribution*.
 * `theory/bayesian-engine.md` requires the distribution — a bare EV number hides
 * whether the confidence interval straddles zero.
 */

import { mean, median, percentile, standardDeviation } from './numeric.js';
import { createRng } from './random.js';

/** Revenue draws are floored here so a drawdown never implies the company vanishes. */
export const REVENUE_FLOOR_USD_B = 50.0;

/** Multiple draws are floored here: no going concern trades at less than this. */
export const MULTIPLE_FLOOR = 5.0;

/** Proportional noise applied to a drawn multiple. */
export const MULTIPLE_NOISE_STD = 0.10;

/** Fraction of full Kelly used as the house default. */
export const KELLY_SAFETY_FRACTION = 0.25;

/** Number of histogram bins, matching the Python reference. */
export const HISTOGRAM_BINS = 50;

/** Return distribution percentiles, as decimal fractions. */
export type Percentiles = {
  readonly p5: number; readonly p10: number; readonly p25: number;
  readonly p50: number; readonly p75: number; readonly p90: number;
  readonly p95: number;
};

/** Bin counts and edges, ready to plot without further processing. */
export type Histogram = {
  readonly counts: readonly number[];
  readonly edges: readonly number[];
};

/** Outcome of a Monte Carlo pass over the revenue x multiple matrix. */
export type MonteCarloResult = {
  readonly n_simulations: number;
  readonly ev_mean: number;
  readonly ev_median: number;
  readonly ev_std: number;
  readonly percentiles: Percentiles;
  readonly p_positive: number;
  readonly p_negative: number;
  readonly avg_win: number;
  readonly avg_loss: number;
  readonly win_loss_ratio: number;
  readonly kelly_fraction: number;
  readonly kelly_quarter: number;
  readonly histogram: Histogram;
  /** Every simulated return, for callers that want to draw the raw cloud. */
  readonly returns: readonly number[];
};

export type DeterministicEvArgs = {
  readonly current_mcap: number;
  readonly revenue_scenarios: readonly number[];
  readonly revenue_probs: readonly number[];
  readonly multiple_scenarios: readonly number[];
  readonly multiple_probs: readonly number[];
  readonly margin: number;
};

/**
 * Closed-form expected return over the full outer product of the matrix.
 *
 * Revenue and multiple are treated as independent, so every cell's weight is the
 * product of its marginals.
 */
export function deterministicEv(args: DeterministicEvArgs): number {
  const { current_mcap, revenue_scenarios, revenue_probs, multiple_scenarios, multiple_probs, margin } = args;
  let ev = 0;
  for (let i = 0; i < revenue_scenarios.length; i++) {
    for (let j = 0; j < multiple_scenarios.length; j++) {
      const impliedMcap = revenue_scenarios[i]! * margin * multiple_scenarios[j]!;
      const ret = (impliedMcap - current_mcap) / current_mcap;
      ev += revenue_probs[i]! * multiple_probs[j]! * ret;
    }
  }
  return ev;
}

export type MonteCarloArgs = {
  readonly current_mcap: number;
  readonly revenue_scenarios: readonly number[];
  readonly revenue_probs: readonly number[];
  readonly revenue_stds: readonly number[];
  readonly multiple_scenarios: readonly number[];
  readonly multiple_probs: readonly number[];
  readonly net_margin?: number;
  readonly n_simulations?: number;
  readonly seed?: number;
};

/**
 * Build a histogram with uniformly spaced bins over the data's full range.
 *
 * Bounds are found by iteration rather than `Math.min(...values)`: spreading a
 * large array into an argument list overflows the call stack somewhere above
 * ~65k elements, and 100k paths is this function's default workload.
 */
function histogram(values: readonly number[], bins: number): Histogram {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const width = (max - min) / bins || 1;
  const counts = new Array<number>(bins).fill(0);
  for (const value of values) {
    const index = Math.min(bins - 1, Math.floor((value - min) / width));
    counts[index] = counts[index]! + 1;
  }
  const edges = Array.from({ length: bins + 1 }, (_, i) => min + i * width);
  return { counts, edges };
}

/**
 * Simulate the matrix, propagating scenario uncertainty into a return distribution.
 *
 * Deterministic for a given seed, but not bit-identical to the Python reference —
 * see {@link module:random} for why.
 */
export function monteCarlo(args: MonteCarloArgs): MonteCarloResult {
  const {
    current_mcap, revenue_scenarios, revenue_probs, revenue_stds,
    multiple_scenarios, multiple_probs,
    net_margin = 0.65, n_simulations = 100_000, seed = 42,
  } = args;

  const rng = createRng(seed);
  const returns = new Array<number>(n_simulations);

  for (let i = 0; i < n_simulations; i++) {
    const r = rng.choice(revenue_probs);
    const revenue = Math.max(
      rng.normal(revenue_scenarios[r]!, revenue_stds[r]!),
      REVENUE_FLOOR_USD_B,
    );
    const m = rng.choice(multiple_probs);
    const multiple = Math.max(
      multiple_scenarios[m]! * rng.normal(1.0, MULTIPLE_NOISE_STD),
      MULTIPLE_FLOOR,
    );
    const marketCap = revenue * net_margin * multiple;
    returns[i] = (marketCap - current_mcap) / current_mcap;
  }

  const wins = returns.filter((r) => r > 0);
  const losses = returns.filter((r) => r < 0);
  const pPositive = wins.length / n_simulations;
  const pNegative = losses.length / n_simulations;
  const avgWin = wins.length ? mean(wins) : 0;
  const avgLoss = losses.length ? mean(losses.map(Math.abs)) : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : Infinity;

  const kelly =
    avgLoss > 0 && winLossRatio > 0
      ? (pPositive * winLossRatio - pNegative) / winLossRatio
      : 0;

  return {
    n_simulations,
    ev_mean: mean(returns),
    ev_median: median(returns),
    ev_std: standardDeviation(returns),
    percentiles: {
      p5: percentile(returns, 5),
      p10: percentile(returns, 10),
      p25: percentile(returns, 25),
      p50: percentile(returns, 50),
      p75: percentile(returns, 75),
      p90: percentile(returns, 90),
      p95: percentile(returns, 95),
    },
    p_positive: pPositive,
    p_negative: pNegative,
    avg_win: avgWin,
    avg_loss: avgLoss,
    win_loss_ratio: winLossRatio,
    kelly_fraction: kelly,
    kelly_quarter: kelly * KELLY_SAFETY_FRACTION,
    histogram: histogram(returns, HISTOGRAM_BINS),
    returns,
  };
}
