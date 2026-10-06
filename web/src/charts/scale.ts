/**
 * Minimal linear and band scales.
 *
 * d3-scale would do this, but these two functions are the whole of what the
 * gallery needs, and a dependency-free chart layer keeps the deployed bundle
 * small enough to load instantly on a phone.
 */

export type LinearScale = {
  (value: number): number;
  readonly domain: readonly [number, number];
  readonly range: readonly [number, number];
  /** Map a pixel position back to a domain value. */
  invert(pixel: number): number;
  /** Evenly spaced, human-readable tick values covering the domain. */
  ticks(count?: number): number[];
};

/** A linear mapping from a data domain onto a pixel range. */
export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;

  const scale = ((value: number) => r0 + ((value - d0) / span) * (r1 - r0)) as {
    (value: number): number;
    domain: readonly [number, number];
    range: readonly [number, number];
    invert(pixel: number): number;
    ticks(count?: number): number[];
  };

  scale.domain = domain;
  scale.range = range;
  scale.invert = (pixel: number) => d0 + ((pixel - r0) / (r1 - r0 || 1)) * span;
  scale.ticks = (count = 6) => niceTicks(d0, d1, count);
  return scale;
}

/**
 * Tick values at a round step covering the domain.
 *
 * Steps snap to 1, 2, 2.5 or 5 times a power of ten, which is what makes axis
 * labels readable rather than arbitrary.
 */
export function niceTicks(min: number, max: number, count = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const rawStep = (max - min) / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalised = rawStep / magnitude;
  const niceNormalised =
    normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  const step = niceNormalised * magnitude;

  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max + step * 1e-9; t += step) {
    // Re-round to kill the floating-point dust that accumulates over the loop.
    ticks.push(Math.round(t / step) * step);
  }
  return ticks;
}

/** Pad a domain outward by a fraction of its span, so marks clear the frame. */
export function padDomain(
  min: number,
  max: number,
  fraction = 0.05,
): [number, number] {
  if (min === max) {
    const nudge = Math.abs(min) * fraction || 1;
    return [min - nudge, max + nudge];
  }
  const pad = (max - min) * fraction;
  return [min - pad, max + pad];
}

/** Extent of a numeric array, as `[min, max]`. Iterative, so large arrays are safe. */
export function extent(values: readonly number[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

/** Evenly spaced positions for n categories across a pixel range. */
export function band(
  count: number,
  range: readonly [number, number],
  padding = 0.2,
): { position(index: number): number; width: number } {
  const [r0, r1] = range;
  const total = r1 - r0;
  const step = total / Math.max(1, count);
  const width = step * (1 - padding);
  return {
    position: (index: number) => r0 + index * step + (step - width) / 2,
    width,
  };
}
