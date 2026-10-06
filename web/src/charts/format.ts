/**
 * Number formatting, including the precision discipline the methodology demands.
 *
 * `theory/bayesian-engine.md` caps significant figures by input quality: a base
 * rate from n=19 is "~35%", never "35.2%". Most chart libraries will happily
 * render six decimals of noise, so the gallery formats deliberately instead.
 */

/** Input provenance, which decides how many figures an output may claim. */
export enum Precision {
  /** n < 10 frequency data: one significant figure, prefixed with a tilde. */
  VeryCoarse = 'VeryCoarse',
  /** n 10-50 frequency data: two significant figures. */
  Coarse = 'Coarse',
  /** n > 50 or a direct measurement: three significant figures. */
  Fine = 'Fine',
  /** An ordinal or subjective estimate: a range only, never a point. */
  RangeOnly = 'RangeOnly',
}

/** Percentage, with the decimals the caller asks for. */
export function pct(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Signed percentage, always carrying its sign. */
export function signedPct(value: number, decimals = 0): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(decimals)}%`;
}

/**
 * A probability rendered at the precision its provenance justifies.
 *
 * This is the rule the system refuses to break: claiming "35.2%" from nineteen
 * historical analogues is false precision, and the tilde is the honest prefix.
 */
export function probability(value: number, precision: Precision): string {
  switch (precision) {
    case Precision.VeryCoarse:
      return `~${Math.round(value * 100 / 10) * 10}%`;
    case Precision.Coarse:
      return `${Math.round(value * 100)}%`;
    case Precision.Fine:
      return `${(value * 100).toFixed(1)}%`;
    case Precision.RangeOnly:
      return `${Math.round(value * 100)}%`;
  }
}

/** An interval, rendered as "35% ± 13%". */
export function interval(mean: number, std: number, decimals = 0): string {
  return `${(mean * 100).toFixed(decimals)}% ± ${(std * 100).toFixed(decimals)}%`;
}

/** A bracketed range, rendered as "[14%, 56%]". */
export function range(low: number, high: number, decimals = 0): string {
  return `[${(low * 100).toFixed(decimals)}%, ${(high * 100).toFixed(decimals)}%]`;
}

/** Fixed decimals, with a non-breaking minus so columns stay aligned. */
export function fixed(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '−∞';
  return value.toFixed(decimals);
}

/** A money magnitude in billions or trillions, as the matrix uses. */
export function usdB(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(2)}T`;
  return `$${value.toFixed(0)}B`;
}

/** Bits, to one decimal — the unit information content is measured in. */
export function bits(value: number): string {
  return `${value.toFixed(2)} bits`;
}

/** A compact integer with thousands separators. */
export function count(value: number): string {
  return value.toLocaleString('en-US');
}
