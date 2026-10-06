/**
 * Shared fixture loading and tolerance-aware comparison.
 *
 * These are the same JSON files the Python suite reads, from
 * `packages/fixtures`. Passing here and there is what proves the two
 * implementations agree.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the shared fixture directory. */
export const FIXTURE_DIR = join(here, '..', '..', 'fixtures');

export type Fixture = {
  readonly algorithm: string;
  readonly agreement: 'exact' | 'statistical';
  readonly tolerance: number;
  readonly note?: string;
  readonly cases: ReadonlyArray<{
    readonly name: string;
    readonly input: Record<string, unknown>;
    readonly expected: unknown;
  }>;
};

/**
 * Inverse of the sentinel map in `scripts/generate_fixtures.py`.
 *
 * Non-finite floats have no JSON representation, so they travel as strings.
 */
const NON_FINITE_SENTINELS: Readonly<Record<string, number>> = {
  __Infinity__: Infinity,
  '__-Infinity__': -Infinity,
  __NaN__: NaN,
};

/** Recursively restore non-finite floats from their string sentinels. */
function decode(value: unknown): unknown {
  if (typeof value === 'string' && value in NON_FINITE_SENTINELS) {
    return NON_FINITE_SENTINELS[value];
  }
  if (Array.isArray(value)) return value.map(decode);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, decode(v)]),
    );
  }
  return value;
}

/** Read one shared fixture file by name (without the .json suffix). */
export function loadFixture(name: string): Fixture {
  const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), 'utf8'));
  return decode(raw) as Fixture;
}

/** Flatten a fixture into tuples for `describe.each` / `test.each`. */
export function cases(
  name: string,
): Array<[string, Record<string, unknown>, unknown, number]> {
  const fixture = loadFixture(name);
  return fixture.cases.map((c) => [c.name, c.input, c.expected, fixture.tolerance]);
}

/**
 * Recursively compare values within tolerance.
 *
 * Numbers are compared with a combined absolute and relative tolerance, matching
 * the Python suite's `pytest.approx(expected, abs=tol, rel=tol)`. Everything else
 * must be strictly equal, so a changed label or verdict string fails as loudly as
 * a changed number.
 */
export function assertClose(
  actual: unknown,
  expected: unknown,
  tol: number,
  path = '',
): void {
  if (expected === null || typeof expected === 'boolean' || typeof expected === 'string') {
    expect(actual, path).toBe(expected);
    return;
  }

  if (typeof expected === 'number') {
    if (Number.isNaN(expected)) {
      expect(Number.isNaN(actual as number), `${path}: expected NaN, got ${actual}`).toBe(true);
      return;
    }
    if (!Number.isFinite(expected)) {
      expect(actual, path).toBe(expected);
      return;
    }
    expect(typeof actual, `${path}: expected a number, got ${typeof actual}`).toBe('number');
    const difference = Math.abs((actual as number) - expected);
    const allowed = tol + tol * Math.abs(expected);
    expect(
      difference <= allowed,
      `${path}: ${actual} != ${expected} (difference ${difference.toExponential(3)} exceeds ${allowed.toExponential(3)})`,
    ).toBe(true);
    return;
  }

  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), `${path}: expected an array`).toBe(true);
    const actualArray = actual as unknown[];
    expect(actualArray.length, `${path}: length`).toBe(expected.length);
    expected.forEach((e, i) => assertClose(actualArray[i], e, tol, `${path}[${i}]`));
    return;
  }

  if (typeof expected === 'object') {
    expect(typeof actual, `${path}: expected an object`).toBe('object');
    const actualObject = actual as Record<string, unknown>;
    const expectedObject = expected as Record<string, unknown>;
    expect(Object.keys(actualObject).sort(), `${path}: keys`).toEqual(
      Object.keys(expectedObject).sort(),
    );
    for (const key of Object.keys(expectedObject)) {
      assertClose(actualObject[key], expectedObject[key], tol, `${path}.${key}`);
    }
    return;
  }

  expect(actual, path).toBe(expected);
}
