/**
 * A seeded, portable pseudo-random generator.
 *
 * NumPy's PCG64 stream cannot be reproduced here, so the Monte Carlo port cannot
 * be bit-identical to Python's. Rather than pretend otherwise, this module
 * provides a generator that is *deterministic within TypeScript* — same seed,
 * same sequence, every run and every browser — and the shared fixture for Monte
 * Carlo is marked as requiring distributional rather than exact agreement.
 *
 * That tradeoff is deliberate: reproducibility across reloads is what a
 * visualisation needs (a slider must not reshuffle the histogram), while
 * bit-equality with NumPy would require reimplementing PCG64 and NumPy's
 * ziggurat normal sampler for no visible benefit.
 */

/** 2^32, the period of the underlying 32-bit state. */
const TWO_32 = 0x100000000;

/** Mulberry32: small, fast, and good enough for visualisation-grade sampling. */
export type Rng = {
  /** Uniform in [0, 1). */
  next(): number;
  /** Standard normal, via Box-Muller. */
  normal(mean?: number, stdDev?: number): number;
  /** An index in [0, weights.length), drawn proportionally to `weights`. */
  choice(weights: readonly number[]): number;
};

/**
 * Create a generator from a seed.
 *
 * Mulberry32 with a Box-Muller normal transform. Box-Muller produces values in
 * pairs; the spare is cached so no draw is wasted.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  let spare: number | null = null;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / TWO_32;
  }

  function normal(mean = 0, stdDev = 1): number {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return mean + stdDev * value;
    }
    // Guard against log(0), which Box-Muller cannot tolerate.
    let u = next();
    while (u === 0) u = next();
    const v = next();
    const radius = Math.sqrt(-2 * Math.log(u));
    const angle = 2 * Math.PI * v;
    spare = radius * Math.sin(angle);
    return mean + stdDev * radius * Math.cos(angle);
  }

  function choice(weights: readonly number[]): number {
    const target = next();
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i]!;
      if (target < cumulative) return i;
    }
    // Floating-point error in the weights can leave `target` past the last
    // boundary; the final index is the only correct fallback.
    return weights.length - 1;
  }

  return { next, normal, choice };
}
