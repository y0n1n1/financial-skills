/**
 * Tests for the machinery that exists only in the port.
 *
 * The parity suite proves the algorithms agree with Python. These cover the
 * pieces written from scratch to replace NumPy, SciPy and `uncertainties`, where
 * a subtle error would be invisible to a fixture that only checks end results.
 */

import { describe, expect, test } from 'vitest';

import {
  add, div, exact, isExact, mul, mulScalar, scalarSub, stdDev, sub, uncertain,
} from '../src/uncertain.js';
import {
  dot, identity, invert, matMul, matVec, mean, median, normalCdf, normalPdf,
  percentile, standardDeviation, transpose,
} from '../src/numeric.js';
import { createRng } from '../src/random.js';
import { ev, fmea, information, kelly, reliability } from '../src/index.js';

describe('uncertain: correlation tracking', () => {
  test('a value minus itself is exactly zero, with no residual uncertainty', () => {
    const x = uncertain(5, 2);
    const difference = sub(x, x);
    expect(difference.nominal).toBe(0);
    // Naive independent propagation would give sqrt(2^2 + 2^2) = 2.83 here.
    expect(stdDev(difference)).toBe(0);
    expect(isExact(difference)).toBe(true);
  });

  test('a value divided by itself is exactly one', () => {
    const x = uncertain(0.4, 0.08);
    const ratio = div(x, x);
    expect(ratio.nominal).toBeCloseTo(1, 15);
    expect(stdDev(ratio)).toBeCloseTo(0, 15);
  });

  test('independent values do combine in quadrature', () => {
    const a = uncertain(10, 3);
    const b = uncertain(10, 4);
    expect(stdDev(add(a, b))).toBeCloseTo(5, 12);
    expect(stdDev(sub(a, b))).toBeCloseTo(5, 12);
  });

  test('scaling scales the uncertainty linearly', () => {
    expect(stdDev(mulScalar(uncertain(4, 0.5), 3))).toBeCloseTo(1.5, 12);
  });

  test('products follow the relative-error rule', () => {
    // For independent a, b: (s_ab/ab)^2 = (s_a/a)^2 + (s_b/b)^2
    const a = uncertain(4, 0.4);
    const b = uncertain(5, 0.25);
    const product = mul(a, b);
    const relative = Math.hypot(0.4 / 4, 0.25 / 5);
    expect(stdDev(product)).toBeCloseTo(relative * 20, 12);
  });

  test('the Bayesian update quotient matches the analytic derivative', () => {
    // post(p, l) = pl / (pl + 1 - p), with sigma_p = 0.08 and sigma_l = 0.15.
    const [pv, lv, sigmaP, sigmaL] = [0.4, 1.4, 0.08, 0.15];
    const p = uncertain(pv, sigmaP);
    const lr = uncertain(lv, sigmaL);
    const weighted = mul(p, lr);
    const posterior = div(weighted, add(weighted, scalarSub(1, p)));

    const denominator = pv * lv + 1 - pv;
    const dByP = (lv * denominator - pv * lv * (lv - 1)) / denominator ** 2;
    const dByL = (pv * (denominator - pv * lv)) / denominator ** 2;
    const analytic = Math.hypot(dByP * sigmaP, dByL * sigmaL);

    expect(posterior.nominal).toBeCloseTo((pv * lv) / denominator, 15);
    expect(stdDev(posterior)).toBeCloseTo(analytic, 15);
  });

  test('correlation changes the result, so it is demonstrably tracked', () => {
    // Treating p's two occurrences as independent variables gives a different
    // interval. Here it is narrower, because the numerator's p and the
    // denominator's (1 - p) push the posterior the same way: their covariance
    // reinforces rather than cancels. The direction is formula-specific; what
    // matters is that decorrelating changes the answer at all.
    const p = uncertain(0.4, 0.08);
    const lr = uncertain(1.4, 0.15);
    const weighted = mul(p, lr);
    const correlated = div(weighted, add(weighted, scalarSub(1, p)));

    const pAgain = uncertain(0.4, 0.08);
    const decorrelated = div(weighted, add(weighted, scalarSub(1, pAgain)));

    expect(correlated.nominal).toBeCloseTo(decorrelated.nominal, 15);
    expect(stdDev(correlated)).not.toBeCloseTo(stdDev(decorrelated), 6);
  });

  test('exact values carry no uncertainty', () => {
    expect(stdDev(exact(7))).toBe(0);
    expect(stdDev(mul(exact(3), exact(4)))).toBe(0);
  });
});

describe('numeric: normal CDF', () => {
  test('matches known values to double precision', () => {
    // Reference values from scipy.stats.norm.cdf.
    const reference: ReadonlyArray<readonly [number, number]> = [
      [0, 0.5],
      [1, 0.8413447460685429],
      [-1, 0.15865525393145705],
      [1.96, 0.9750021048517795],
      [-2.5758293035489004, 0.005000000000000013],
      [3, 0.9986501019683699],
      [-6, 9.865876450376946e-10],
      [8, 0.9999999999999994],
    ];
    for (const [z, expected] of reference) {
      expect(normalCdf(z), `cdf(${z})`).toBeCloseTo(expected, 14);
    }
  });

  test('is symmetric about zero', () => {
    for (const z of [0.3, 1.1, 2.7, 4.2]) {
      expect(normalCdf(z) + normalCdf(-z)).toBeCloseTo(1, 14);
    }
  });

  test('is monotonic and bounded', () => {
    let previous = 0;
    for (let z = -8; z <= 8; z += 0.25) {
      const value = normalCdf(z);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });

  test('the density integrates to the distribution', () => {
    // Crude trapezoidal check that pdf and cdf are consistent.
    const step = 0.001;
    let integral = 0;
    for (let z = -6; z < 0; z += step) {
      integral += ((normalPdf(z) + normalPdf(z + step)) / 2) * step;
    }
    expect(integral).toBeCloseTo(0.5 - normalCdf(-6), 6);
  });
});

describe('numeric: matrix operations', () => {
  test('inverting returns the identity when multiplied back', () => {
    const matrix = [
      [0.16, 0.072, 0.064],
      [0.072, 0.09, 0.054],
      [0.064, 0.054, 0.1225],
    ];
    const product = matMul(matrix, invert(matrix));
    const expected = identity(3);
    product.forEach((row, i) =>
      row.forEach((value, j) => expect(value).toBeCloseTo(expected[i]![j]!, 12)),
    );
  });

  test('partial pivoting handles a zero leading entry', () => {
    const matrix = [
      [0, 1],
      [1, 0],
    ];
    expect(invert(matrix)).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  test('a singular matrix is rejected rather than silently wrong', () => {
    expect(() => invert([[1, 2], [2, 4]])).toThrow(/singular/);
  });

  test('a non-square matrix is rejected', () => {
    expect(() => invert([[1, 2, 3], [4, 5, 6]])).toThrow(/square/);
  });

  test('transpose and matVec agree with hand computation', () => {
    expect(transpose([[1, 2], [3, 4], [5, 6]])).toEqual([[1, 3, 5], [2, 4, 6]]);
    expect(matVec([[1, 2], [3, 4]], [5, 6])).toEqual([17, 39]);
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
});

describe('numeric: statistics match NumPy conventions', () => {
  test('percentile interpolates linearly', () => {
    const values = [1, 2, 3, 4];
    // numpy.percentile([1,2,3,4], 25) == 1.75
    expect(percentile(values, 25)).toBeCloseTo(1.75, 12);
    expect(percentile(values, 50)).toBeCloseTo(2.5, 12);
    expect(percentile(values, 75)).toBeCloseTo(3.25, 12);
    expect(percentile(values, 0)).toBe(1);
    expect(percentile(values, 100)).toBe(4);
  });

  test('standard deviation uses the population denominator', () => {
    // numpy.std([2,4,4,4,5,5,7,9]) == 2.0, not the sample value 2.138
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 12);
  });

  test('empty inputs give NaN rather than zero', () => {
    expect(Number.isNaN(mean([]))).toBe(true);
    expect(Number.isNaN(standardDeviation([]))).toBe(true);
    expect(Number.isNaN(median([]))).toBe(true);
  });

  test('percentile does not mutate its input', () => {
    const values = [3, 1, 2];
    percentile(values, 50);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('random: seeded determinism', () => {
  test('the same seed replays the same stream', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  test('different seeds diverge', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  test('uniforms stay in range and spread across it', () => {
    const rng = createRng(7);
    const values = Array.from({ length: 20_000 }, () => rng.next());
    expect(Math.min(...values.slice(0, 1000))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values.slice(0, 1000))).toBeLessThan(1);
    expect(mean(values)).toBeCloseTo(0.5, 2);
    expect(standardDeviation(values)).toBeCloseTo(Math.sqrt(1 / 12), 2);
  });

  test('normals have the requested mean and spread', () => {
    const rng = createRng(11);
    const values = Array.from({ length: 50_000 }, () => rng.normal(3, 2));
    expect(mean(values)).toBeCloseTo(3, 1);
    expect(standardDeviation(values)).toBeCloseTo(2, 1);
  });

  test('weighted choice respects its weights', () => {
    const rng = createRng(5);
    const weights = [0.1, 0.6, 0.3];
    const counts = [0, 0, 0];
    for (let i = 0; i < 60_000; i++) counts[rng.choice(weights)]!++;
    counts.forEach((count, i) => {
      expect(count / 60_000).toBeCloseTo(weights[i]!, 1);
    });
  });

  test('a Monte Carlo run is reproducible across calls', () => {
    const args = {
      current_mcap: 1000, revenue_scenarios: [120, 90], revenue_probs: [0.6, 0.4],
      revenue_stds: [15, 10], multiple_scenarios: [25, 12], multiple_probs: [0.5, 0.5],
      n_simulations: 5000, seed: 7,
    } as const;
    expect(ev.monteCarlo(args).ev_mean).toBe(ev.monteCarlo(args).ev_mean);
    expect(ev.monteCarlo({ ...args, seed: 8 }).ev_mean).not.toBe(
      ev.monteCarlo(args).ev_mean,
    );
  });

  test('the histogram survives a large run without overflowing the stack', () => {
    const result = ev.monteCarlo({
      current_mcap: 4400, revenue_scenarios: [365, 240], revenue_probs: [0.5, 0.5],
      revenue_stds: [40, 25], multiple_scenarios: [30, 15], multiple_probs: [0.5, 0.5],
      n_simulations: 200_000,
    });
    expect(result.histogram.counts.reduce((a, b) => a + b, 0)).toBe(200_000);
    expect(result.histogram.edges).toHaveLength(51);
  });
});

describe('port-side invariants', () => {
  test('full Kelly maximises growth', () => {
    const [p, b] = [0.6, 2.0];
    const fStar = kelly.kellyFraction(p, b);
    const best = kelly.growthRate(p, b, fStar);
    for (const delta of [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2]) {
      expect(kelly.growthRate(p, b, fStar + delta)).toBeLessThan(best);
    }
  });

  test('PPV falls as the base rate falls', () => {
    const ppvs = [0.05, 0.2, 0.35, 0.5, 0.8].map((br) =>
      reliability.positivePredictiveValue(0.8, 0.7, br),
    );
    expect([...ppvs].sort((a, b) => a - b)).toEqual(ppvs);
  });

  test('entropy is maximal when hypotheses are equiprobable', () => {
    expect(information.entropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(2, 12);
    expect(information.entropy([0.7, 0.2, 0.07, 0.03])).toBeLessThan(2);
    expect(information.entropy([1, 0, 0, 0])).toBe(0);
  });

  test('out-of-range FMEA scores are rejected', () => {
    expect(() => fmea.rpn({ name: 'x', severity: 0, occurrence: 5, detection: 5 })).toThrow();
    expect(() => fmea.rpn({ name: 'x', severity: 5, occurrence: 11, detection: 5 })).toThrow();
    expect(fmea.rpn({ name: 'x', severity: 7, occurrence: 5, detection: 4 })).toBe(140);
  });

  test('unknown lens keys throw rather than return garbage', () => {
    expect(() => reliability.evaluateLens('not_a_lens', 0.35)).toThrow(/unknown lens/);
    expect(() => reliability.weightedTally({ not_a_lens: 'SUPPORTS' })).toThrow(/unknown lens/);
  });
});
