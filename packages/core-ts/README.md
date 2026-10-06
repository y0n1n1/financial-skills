# @tfg/core

A function-for-function TypeScript port of [`tfg-core`](../tfg-core), with **zero runtime dependencies**.

Everything NumPy, SciPy and `uncertainties` provide on the Python side is implemented here from scratch, so the algorithms run in a browser with nothing to install and nothing to download at runtime.

## Why a port rather than Pyodide

Running the Python package in the browser would mean shipping ~12MB of WebAssembly and accepting 100–400ms per recompute. That is fine for a one-shot calculation and useless for a slider you drag. The port recomputes in microseconds, which is what an interactive visualisation needs.

The cost of a port is drift. That is handled by testing both implementations against the same [golden vectors](../fixtures): 93 parity cases, plus 33 covering the machinery that exists only here. Neither language can change behaviour without a failing build in both.

## What had to be rebuilt

| Replaces | Module | Note |
|---|---|---|
| `uncertainties.ufloat` | `uncertain.ts` | First-order propagation **with correlation tracking** |
| `scipy.stats.norm` | `numeric.ts` | Hart/West rational approximation, accurate to ~1e-15 |
| `numpy.linalg.inv` | `numeric.ts` | Gauss-Jordan with partial pivoting |
| `numpy.percentile` | `numeric.ts` | Linear interpolation, matching NumPy's default method |
| `numpy.random` | `random.ts` | Seeded Mulberry32 + Box-Muller |

### The correlation problem

`uncertain.ts` is the part worth reading. A Bayesian update is

```
posterior = (p · lr) / (p · lr + (1 − p))
```

and `p` appears in both numerator and denominator. Those occurrences are perfectly correlated. Carrying a single standard deviation and combining it by the usual sum-of-squares rules treats them as independent and gets the wrong interval.

So every value tracks its partial derivative with respect to each *independent source* of uncertainty, and the standard deviation is the norm of those contributions. Correlation then falls out of the arithmetic:

```ts
const x = uncertain(5, 2);
stdDev(sub(x, x));  // 0 — not sqrt(2² + 2²) = 2.83
```

The suite pins this against the analytic derivative of the update formula to 15 decimal places.

### Monte Carlo is the one exception

NumPy's PCG64 stream cannot be reproduced here, so `monteCarlo` is **not** bit-identical to Python's. `random.ts` instead guarantees determinism *within* TypeScript — same seed, same sequence, every run and every browser, so a slider never reshuffles a histogram — and the shared fixture declares `"agreement": "statistical"`, holding the port to distributional agreement within tolerance. Python asserts its own stream exactly.

## Usage

```ts
import { bayes, ev, kelly, options } from '@tfg/core';

const result = bayes.runChain(0.40, 0.08, [
  { direction: 'STRONG_FOR', quality: 0.9, label: 'CUDA lock-in' },
  { direction: 'MODERATE_AGAINST', quality: 0.75, label: 'AMD MI400 sampling' },
]);

if (bayes.crosses(result.posterior, 0.5)) {
  // The 95% interval straddles 50%: the analysis has not resolved direction.
}

const gate = kelly.evaluate(0.632, 0.523, 0.25);  // PASS / MARGINAL / EXCLUDED
const implied = options.scenarioProbabilities({
  spot: 178, iv: 0.39, rf: 0.045, expiry_years: 1.0,
  scenario_boundaries: [130, 155, 250, 360], scenario_labels: [],
});
```

Field names match the Python package exactly (`snake_case` on result objects) so the fixtures can be shared verbatim. Function names follow TypeScript convention (`runChain`, not `run_chain`).

## Tests

```bash
npm install
npm test          # 126 tests
npm run typecheck
```

## License

MIT
