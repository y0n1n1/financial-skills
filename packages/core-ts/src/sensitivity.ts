/**
 * One-at-a-time sensitivity analysis over the revenue x multiple matrix.
 *
 * Port of `tfg_core/sensitivity.py`. Ranks inputs by how far expected value moves
 * when each is perturbed alone, feeding `theory/attention-allocation.md`: the
 * widest swing is where the next hour of research buys the most.
 */

import { deterministicEv } from './ev.js';

/** Probabilities are perturbed by this many percentage points, then renormalised. */
export const PROBABILITY_SHIFT = 0.10;

/** Net margin is perturbed by this many percentage points. */
export const MARGIN_SHIFT = 0.05;

export const PROBABILITY_CEILING = 0.95;
export const PROBABILITY_FLOOR = 0.05;

/** Display labels for multiple scenarios, in descending-multiple order. */
export const MULTIPLE_LABELS = ['Bull', 'Current', 'Bear', 'Crash', 'Extra1', 'Extra2'] as const;

/** Expected-value swing produced by perturbing one input. */
export type Sensitivity = {
  readonly parameter: string;
  readonly ev_low: number;
  readonly ev_high: number;
  readonly ev_swing: number;
  readonly base_ev: number;
};

/** Set one probability to a target and rescale the others to keep the sum at 1. */
function redistribute(probs: readonly number[], index: number, target: number): number[] {
  const shifted = [...probs];
  shifted[index] = target;
  const remaining = 1 - target;
  let otherSum = 0;
  for (let i = 0; i < shifted.length; i++) if (i !== index) otherSum += shifted[i]!;
  if (otherSum > 0) {
    for (let i = 0; i < shifted.length; i++) {
      if (i !== index) shifted[i] = (shifted[i]! * remaining) / otherSum;
    }
  }
  return shifted;
}

/** Format a number the way Python's `f"{x}"` does, so labels match exactly. */
function pyNum(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

/** Format a fraction as Python's `:.0%` does. */
function pyPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export type SensitivityArgs = {
  readonly current_mcap: number;
  readonly revenue_scenarios: readonly number[];
  readonly revenue_probs: readonly number[];
  readonly revenue_stds: readonly number[];
  readonly multiple_scenarios: readonly number[];
  readonly multiple_probs: readonly number[];
  readonly margin: number;
};

/**
 * Perturb every input in turn, returning swings sorted widest-first.
 *
 * Revenue levels move by their own standard deviation; probabilities move by
 * {@link PROBABILITY_SHIFT} with the remainder redistributed proportionally;
 * margin moves by {@link MARGIN_SHIFT}.
 */
export function runSensitivity(args: SensitivityArgs): Sensitivity[] {
  const {
    current_mcap, revenue_scenarios, revenue_probs, revenue_stds,
    multiple_scenarios, multiple_probs, margin,
  } = args;

  const ev = (
    revenues: readonly number[] = revenue_scenarios,
    revProbs: readonly number[] = revenue_probs,
    multProbs: readonly number[] = multiple_probs,
    netMargin: number = margin,
  ): number =>
    deterministicEv({
      current_mcap,
      revenue_scenarios: revenues,
      revenue_probs: revProbs,
      multiple_scenarios,
      multiple_probs: multProbs,
      margin: netMargin,
    });

  const baseEv = ev();
  const results: Sensitivity[] = [];

  revenue_scenarios.forEach((revenue, i) => {
    const std = revenue_stds[i]!;
    const high = [...revenue_scenarios];
    high[i] = revenue + std;
    const low = [...revenue_scenarios];
    low[i] = revenue - std;
    const evHigh = ev(high);
    const evLow = ev(low);
    results.push({
      parameter: `Revenue scenario ${i + 1} ($${pyNum(revenue)}B ± $${pyNum(std)}B)`,
      ev_low: evLow,
      ev_high: evHigh,
      ev_swing: evHigh - evLow,
      base_ev: baseEv,
    });
  });

  multiple_probs.forEach((prob, i) => {
    const evHigh = ev(undefined, undefined, redistribute(multiple_probs, i, Math.min(prob + PROBABILITY_SHIFT, PROBABILITY_CEILING)));
    const evLow = ev(undefined, undefined, redistribute(multiple_probs, i, Math.max(prob - PROBABILITY_SHIFT, PROBABILITY_FLOOR)));
    const label = i < MULTIPLE_LABELS.length ? MULTIPLE_LABELS[i]! : `Multiple ${i + 1}`;
    results.push({
      parameter: `${label} multiple prob (${pyPercent(prob)} ± 10pp)`,
      ev_low: evLow,
      ev_high: evHigh,
      ev_swing: Math.abs(evHigh - evLow),
      base_ev: baseEv,
    });
  });

  revenue_probs.forEach((prob, i) => {
    const evHigh = ev(undefined, redistribute(revenue_probs, i, Math.min(prob + PROBABILITY_SHIFT, PROBABILITY_CEILING)));
    const evLow = ev(undefined, redistribute(revenue_probs, i, Math.max(prob - PROBABILITY_SHIFT, PROBABILITY_FLOOR)));
    results.push({
      parameter: `Revenue $${pyNum(revenue_scenarios[i]!)}B prob (${pyPercent(prob)} ± 10pp)`,
      ev_low: evLow,
      ev_high: evHigh,
      ev_swing: Math.abs(evHigh - evLow),
      base_ev: baseEv,
    });
  });

  const evHighMargin = ev(undefined, undefined, undefined, margin + MARGIN_SHIFT);
  const evLowMargin = ev(undefined, undefined, undefined, margin - MARGIN_SHIFT);
  results.push({
    parameter: `Net margin (${pyPercent(margin)} ± 5pp)`,
    ev_low: evLowMargin,
    ev_high: evHighMargin,
    ev_swing: Math.abs(evHighMargin - evLowMargin),
    base_ev: baseEv,
  });

  // Stable sort, matching Python's, so equal swings keep insertion order.
  return results
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.ev_swing - a.s.ev_swing || a.i - b.i)
    .map(({ s }) => s);
}
