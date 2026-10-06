/**
 * First-order uncertainty propagation with correlation tracking.
 *
 * A port of the subset of Python's `uncertainties` package that
 * {@link module:bayes} depends on. Getting this right is the whole reason the
 * TypeScript port can reproduce the Bayesian chain's confidence intervals.
 *
 * The naive approach — carrying a single standard deviation and combining it by
 * the usual sum-of-squares rules — is wrong here. In a Bayesian update the
 * posterior appears in both the numerator and the denominator:
 *
 *     posterior = (p * lr) / (p * lr + (1 - p))
 *
 * Those two occurrences of `p` are perfectly correlated. Treating them as
 * independent inflates the result's uncertainty, so the interval comes out wider
 * than it should and the port silently disagrees with Python.
 *
 * The fix is to track, for every value, its partial derivative with respect to
 * each *independent source* of uncertainty. A value is represented as its
 * nominal magnitude plus a map from source id to that source's already-scaled
 * contribution (the partial derivative multiplied by the source's standard
 * deviation). The standard deviation is then the Euclidean norm of those
 * contributions, and correlations fall out of the arithmetic for free.
 */

/** Monotonic id generator for independent uncertainty sources. */
let nextSourceId = 0;

/**
 * A number with uncertainty, carrying its dependence on each independent source.
 *
 * Treat instances as immutable: every operation returns a new value.
 */
export type Uncertain = {
  /** The central estimate. */
  readonly nominal: number;
  /**
   * Source id to that source's scaled contribution, i.e. the partial derivative
   * of this value with respect to the source, times the source's own standard
   * deviation. Absent keys contribute nothing.
   */
  readonly components: ReadonlyMap<number, number>;
};

/**
 * Create a value with an independent uncertainty.
 *
 * Each call introduces a *new* source, so two `uncertain(0.4, 0.08)` values are
 * uncorrelated — exactly like two separate `ufloat` calls in Python. Reusing a
 * single value is what creates correlation.
 */
export function uncertain(nominal: number, stdDev: number): Uncertain {
  return {
    nominal,
    components: new Map([[nextSourceId++, stdDev]]),
  };
}

/** Lift a plain number into an {@link Uncertain} with no uncertainty. */
export function exact(value: number): Uncertain {
  return { nominal: value, components: new Map() };
}

/** The standard deviation: the Euclidean norm of all scaled contributions. */
export function stdDev(value: Uncertain): number {
  let sumOfSquares = 0;
  for (const contribution of value.components.values()) {
    sumOfSquares += contribution * contribution;
  }
  return Math.sqrt(sumOfSquares);
}

/**
 * Combine two values' components under a linear operation.
 *
 * `d(result)/d(a)` and `d(result)/d(b)` are the partial derivatives of the
 * operation at the current nominal values; every propagation rule below reduces
 * to supplying those two numbers.
 */
function combine(
  a: Uncertain,
  b: Uncertain,
  dResultDa: number,
  dResultDb: number,
): ReadonlyMap<number, number> {
  const components = new Map<number, number>();
  for (const [source, contribution] of a.components) {
    components.set(source, dResultDa * contribution);
  }
  for (const [source, contribution] of b.components) {
    const existing = components.get(source) ?? 0;
    const combined = existing + dResultDb * contribution;
    // A source can cancel out exactly; dropping it keeps maps minimal and makes
    // `isExact` meaningful.
    if (combined === 0) components.delete(source);
    else components.set(source, combined);
  }
  return components;
}

/** Sum. */
export function add(a: Uncertain, b: Uncertain): Uncertain {
  return { nominal: a.nominal + b.nominal, components: combine(a, b, 1, 1) };
}

/** Difference. */
export function sub(a: Uncertain, b: Uncertain): Uncertain {
  return { nominal: a.nominal - b.nominal, components: combine(a, b, 1, -1) };
}

/** Product. d(ab)/da = b, d(ab)/db = a. */
export function mul(a: Uncertain, b: Uncertain): Uncertain {
  return {
    nominal: a.nominal * b.nominal,
    components: combine(a, b, b.nominal, a.nominal),
  };
}

/** Quotient. d(a/b)/da = 1/b, d(a/b)/db = -a/b^2. */
export function div(a: Uncertain, b: Uncertain): Uncertain {
  const { nominal: bn } = b;
  return {
    nominal: a.nominal / bn,
    components: combine(a, b, 1 / bn, -a.nominal / (bn * bn)),
  };
}

/** Add a constant. Shifts the nominal value and leaves uncertainty untouched. */
export function addScalar(a: Uncertain, k: number): Uncertain {
  return { nominal: a.nominal + k, components: new Map(a.components) };
}

/** Subtract an uncertain value from a constant: `k - a`. */
export function scalarSub(k: number, a: Uncertain): Uncertain {
  return sub(exact(k), a);
}

/** Multiply by a constant. Scales every contribution by the same factor. */
export function mulScalar(a: Uncertain, k: number): Uncertain {
  const components = new Map<number, number>();
  for (const [source, contribution] of a.components) {
    components.set(source, k * contribution);
  }
  return { nominal: a.nominal * k, components };
}

/** Whether a value carries no uncertainty at all. */
export function isExact(value: Uncertain): boolean {
  return value.components.size === 0;
}
