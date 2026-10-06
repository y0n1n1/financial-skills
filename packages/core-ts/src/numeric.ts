/**
 * Numerical primitives JavaScript doesn't ship.
 *
 * Python gets these from SciPy and NumPy. The browser gets them from here, at
 * double precision, because the shared fixtures demand agreement to 1e-12 and a
 * textbook approximation of the normal CDF is only good to about 1e-7.
 */

/** Coefficients for Hart's rational approximation of the normal CDF. */
const HART_P = [
  220.2068679123761, 221.2135961699311, 112.0792914978709,
  33.91286607838300, 6.373962203531650, 0.7003830644436881,
  0.3526249659989109e-1,
] as const;

const HART_Q = [
  440.4137358247522, 793.8265125199484, 637.3336333788311,
  296.5642487796737, 86.78073220294608, 16.06417757920695,
  1.755667163182642, 0.8838834764831844e-1,
] as const;

/** Beyond this many standard deviations the tail underflows to zero anyway. */
const HART_CUTOFF = 37;

/**
 * Standard normal cumulative distribution function.
 *
 * Hart's (1968) rational approximation, as popularised by West (2005). Accurate
 * to roughly full double precision across the whole range, which plain
 * `erf`-style series approximations are not — and the difference is visible in
 * option-implied probabilities at the tails, where the interesting scenarios live.
 */
export function normalCdf(z: number): number {
  const absZ = Math.abs(z);
  if (absZ > HART_CUTOFF) return z > 0 ? 1 : 0;

  const exponential = Math.exp(-(absZ * absZ) / 2);
  let result: number;

  if (absZ < 7.07106781186547) {
    let numerator = HART_P[6]!;
    for (let i = 5; i >= 0; i--) numerator = numerator * absZ + HART_P[i]!;

    let denominator = HART_Q[7]!;
    for (let i = 6; i >= 0; i--) denominator = denominator * absZ + HART_Q[i]!;

    result = (exponential * numerator) / denominator;
  } else {
    // Continued-fraction expansion for the far tail, where the rational form
    // above loses accuracy.
    const continued =
      absZ + 1 / (absZ + 2 / (absZ + 3 / (absZ + 4 / (absZ + 0.65))));
    result = exponential / (continued * 2.506628274631001);
  }

  return z > 0 ? 1 - result : result;
}

/** Standard normal probability density function. */
export function normalPdf(z: number): number {
  return Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
}

/**
 * Invert a square matrix by Gauss-Jordan elimination with partial pivoting.
 *
 * Partial pivoting is not optional: covariance matrices of correlated assets are
 * poorly conditioned, and without it the Black-Litterman weights drift from
 * NumPy's by far more than the fixtures allow.
 *
 * @throws if the matrix is not square or is singular to working precision.
 */
export function invert(matrix: readonly (readonly number[])[]): number[][] {
  const n = matrix.length;
  for (const row of matrix) {
    if (row.length !== n) throw new Error(`invert: matrix must be square, got ${n}x${row.length}`);
  }

  // Work on [A | I] and reduce the left half to the identity.
  const work: number[][] = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let largest = Math.abs(work[col]![col]!);
    for (let row = col + 1; row < n; row++) {
      const candidate = Math.abs(work[row]![col]!);
      if (candidate > largest) {
        largest = candidate;
        pivotRow = row;
      }
    }

    if (largest < Number.EPSILON) {
      throw new Error(`invert: matrix is singular at column ${col}`);
    }

    if (pivotRow !== col) {
      const swap = work[col]!;
      work[col] = work[pivotRow]!;
      work[pivotRow] = swap;
    }

    const pivot = work[col]![col]!;
    const pivotRowRef = work[col]!;
    for (let j = 0; j < 2 * n; j++) pivotRowRef[j] = pivotRowRef[j]! / pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = work[row]![col]!;
      if (factor === 0) continue;
      const target = work[row]!;
      for (let j = 0; j < 2 * n; j++) {
        target[j] = target[j]! - factor * pivotRowRef[j]!;
      }
    }
  }

  return work.map((row) => row.slice(n));
}

/** Matrix-vector product. */
export function matVec(
  matrix: readonly (readonly number[])[],
  vector: readonly number[],
): number[] {
  return matrix.map((row) => row.reduce((sum, value, j) => sum + value * vector[j]!, 0));
}

/** Matrix-matrix product. */
export function matMul(
  a: readonly (readonly number[])[],
  b: readonly (readonly number[])[],
): number[][] {
  const inner = b.length;
  const cols = b[0]?.length ?? 0;
  return a.map((row) =>
    Array.from({ length: cols }, (_, j) => {
      let sum = 0;
      for (let k = 0; k < inner; k++) sum += row[k]! * b[k]![j]!;
      return sum;
    }),
  );
}

/** Add two matrices elementwise. */
export function matAdd(
  a: readonly (readonly number[])[],
  b: readonly (readonly number[])[],
): number[][] {
  return a.map((row, i) => row.map((value, j) => value + b[i]![j]!));
}

/** Dot product of two vectors. */
export function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, value, i) => sum + value * b[i]!, 0);
}

/** Build a diagonal matrix from a vector. */
export function diag(values: readonly number[]): number[][] {
  return values.map((value, i) =>
    values.map((_, j) => (i === j ? value : 0)),
  );
}

/** The n-by-n identity matrix. */
export function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

/** Transpose a matrix. */
export function transpose(
  matrix: readonly (readonly number[])[],
): number[][] {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  return Array.from({ length: cols }, (_, j) =>
    Array.from({ length: rows }, (_, i) => matrix[i]![j]!),
  );
}

/** Arithmetic mean. Returns NaN for an empty input, as the mean is undefined. */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Population standard deviation, matching NumPy's default `ddof=0`. */
export function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) * (v - m), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Linearly interpolated percentile, matching NumPy's default method.
 *
 * `q` is a percentage in [0, 100]. The input is sorted internally.
 */
export function percentile(values: readonly number[], q: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0]!;

  const position = (q / 100) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower]!;
  const weight = position - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

/** Median, via {@link percentile}. */
export function median(values: readonly number[]): number {
  return percentile(values, 50);
}
