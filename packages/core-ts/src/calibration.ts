/**
 * Calibration scoring: are the stated probabilities any good?
 *
 * Port of `tfg_core/calibration.py`. A forecast of 70% is only meaningful if
 * things forecast at 70% happen about 70% of the time. Scoring is pure: callers
 * own storage.
 */

import { mean } from './numeric.js';

/** Brier score of an uninformed forecaster who always says 50%. */
export const UNINFORMED_BRIER = 0.25;

/** Brier below this counts as good calibration. */
export const GOOD_BRIER = 0.15;

/** Minimum resolved forecasts before bucket statistics mean anything. */
export const MIN_RESOLVED_FOR_STATS = 3;

/** Reliability-diagram buckets. The top edge exceeds 1.0 to include p = 1.0. */
export const BUCKETS: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.01],
];

export const HIGH_CONFIDENCE = 0.7;
export const LOW_CONFIDENCE = 0.3;

/** Gap between stated and actual rates that triggers an overconfidence flag. */
export const OVERCONFIDENCE_GAP = 0.15;

/** Bucket gap beyond which that bucket is judged miscalibrated. */
export const BUCKET_TOLERANCE = 0.10;

/** A resolved forecast: what was claimed, and what happened. */
export type Forecast = {
  readonly probability: number;
  /** 1 if the event occurred, 0 if not. */
  readonly outcome: number;
};

/** Reliability statistics for one confidence band. */
export type Bucket = {
  readonly low: number;
  readonly high: number;
  readonly count: number;
  readonly avg_forecast: number;
  readonly actual_rate: number;
  readonly gap: number;
  readonly calibrated: boolean;
};

/** Aggregate calibration across every resolved forecast. */
export type CalibrationReport = {
  readonly n_resolved: number;
  readonly mean_brier: number;
  readonly verdict: string;
  readonly buckets: readonly Bucket[];
  readonly overconfident: boolean;
  readonly overconfidence_detail: string;
  readonly sufficient_data: boolean;
};

/** Squared error of a probabilistic forecast. 0 is perfect, 0.25 uninformed. */
export function brierScore(probability: number, outcome: number): number {
  return (probability - outcome) ** 2;
}

/** Plain-language reading of a mean Brier score. */
export function verdictFor(meanBrier: number): string {
  if (meanBrier < GOOD_BRIER) return 'GOOD';
  if (meanBrier < UNINFORMED_BRIER) return 'MODERATE';
  return 'POOR';
}

/** Format as Python's `:.0%`. */
function pct0(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Compute mean Brier, bucket reliability, and the overconfidence check.
 *
 * Reports `sufficient_data: false` below {@link MIN_RESOLVED_FOR_STATS} and still
 * returns the mean Brier, because a provisional number labelled provisional beats
 * refusing to answer.
 */
export function scoreCalibration(forecasts: readonly Forecast[]): CalibrationReport {
  if (forecasts.length === 0) {
    return {
      n_resolved: 0, mean_brier: NaN, verdict: 'NO DATA', buckets: [],
      overconfident: false, overconfidence_detail: 'No resolved forecasts.',
      sufficient_data: false,
    };
  }

  const meanBrier = mean(forecasts.map((f) => brierScore(f.probability, f.outcome)));

  const buckets: Bucket[] = [];
  for (const [low, high] of BUCKETS) {
    const inBucket = forecasts.filter((f) => f.probability >= low && f.probability < high);
    if (inBucket.length === 0) continue;
    const avgForecast = mean(inBucket.map((f) => f.probability));
    const actualRate = mean(inBucket.map((f) => f.outcome));
    const gap = actualRate - avgForecast;
    buckets.push({
      low, high, count: inBucket.length,
      avg_forecast: avgForecast, actual_rate: actualRate, gap,
      calibrated: Math.abs(gap) < BUCKET_TOLERANCE,
    });
  }

  let overconfident = false;
  let detail = 'No overconfidence detected.';
  const highConf = forecasts.filter((f) => f.probability > HIGH_CONFIDENCE);
  if (highConf.length > 0) {
    const highAvg = mean(highConf.map((f) => f.probability));
    const highActual = mean(highConf.map((f) => f.outcome));
    if (highActual < highAvg - OVERCONFIDENCE_GAP) {
      overconfident = true;
      detail = `High-confidence calls (${pct0(highAvg)} avg) are right only ${pct0(highActual)} of the time.`;
    }
  }

  return {
    n_resolved: forecasts.length,
    mean_brier: meanBrier,
    verdict: verdictFor(meanBrier),
    buckets,
    overconfident,
    overconfidence_detail: detail,
    sufficient_data: forecasts.length >= MIN_RESOLVED_FOR_STATS,
  };
}
