/**
 * Pure quantitative primitives behind The Financial Gauntlet.
 *
 * A function-for-function port of the Python package `tfg-core`, verified against
 * shared golden vectors in `packages/fixtures` so the two implementations cannot
 * drift silently. Zero runtime dependencies: everything NumPy and SciPy would
 * supply is implemented in {@link module:numeric} and {@link module:uncertain}.
 *
 * Monte Carlo is the single exception to cross-language equality — NumPy's PCG64
 * stream is not reproducible here, so {@link module:random} provides a generator
 * that is deterministic within TypeScript and the fixture requires distributional
 * rather than exact agreement.
 */

export * as bayes from './bayes.js';
export * as calibration from './calibration.js';
export * as constants from './constants.js';
export * as ev from './ev.js';
export * as fmea from './fmea.js';
export * as fundamentals from './fundamentals.js';
export * as information from './information.js';
export * as intuition from './intuition.js';
export * as kelly from './kelly.js';
export * as numeric from './numeric.js';
export * as options from './options.js';
export * as portfolio from './portfolio.js';
export * as prereg from './prereg.js';
export * as random from './random.js';
export * as reliability from './reliability.js';
export * as sensitivity from './sensitivity.js';
export * as uncertain from './uncertain.js';
