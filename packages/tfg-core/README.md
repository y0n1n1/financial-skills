# tfg-core

Pure quantitative primitives behind [The Financial Gauntlet](https://github.com/y0n1n1/financial-skills).

Every function is deterministic given its arguments: **no file IO, no network, no printing.** Data acquisition and presentation live in the repo's `tools/` CLIs. That separation is what makes this layer testable, and what lets the TypeScript port in `packages/core-ts` mirror it function for function against [shared fixtures](../fixtures).

```bash
pip install tfg-core
```

## Modules

| Module | Contents |
|---|---|
| `bayes` | Posterior chains with confidence intervals propagated throughout, ordinal likelihood ratios, evidence-quality scoring |
| `ev` | Monte Carlo and closed-form expected value over a revenue × multiple matrix |
| `sensitivity` | One-at-a-time input perturbation, ranked by EV impact |
| `options` | Black-Scholes implied scenario probabilities |
| `portfolio` | Black-Litterman allocation |
| `fundamentals` | Piotroski F-Score |
| `calibration` | Brier scoring and reliability buckets |
| `intuition` | Scoring of human overrides against outcomes |
| `prereg` | Motivated-reasoning detection from pre-registered expectations |
| `kelly` | Kelly fraction as a binary entry gate |
| `reliability` | Per-lens diagnostic reliability and base-rate-dependent PPV |
| `information` | Shannon information content of evidence, in bits |
| `fmea` | Failure-mode RPN scoring and defense-independence grading |

## Why the interval, not the point estimate

The headline function is `bayes.run_chain`. It differs from a textbook odds-form update in three ways, each of which exists to stop a number looking more certain than it is:

```python
from tfg_core.bayes import run_chain, Update

result = run_chain(
    prior_mean=0.40,
    prior_std=0.08,
    updates=[
        Update("STRONG_FOR", quality=0.9, label="CUDA lock-in"),
        Update("MODERATE_AGAINST", quality=0.75, label="AMD MI400 sampling"),
    ],
)

print(f"{result.posterior.mean:.0%} ± {result.posterior.std_corrected:.0%}")
if result.posterior.crosses(0.5):
    print("95% CI straddles 50% — the analysis has not resolved direction")
```

1. **Likelihood ratios carry their own uncertainty.** An ordinal direction maps to a central LR *and* a standard deviation, propagated via first-order error analysis rather than thrown away. Because the posterior appears in both the numerator and denominator of the update, correlations matter — `uncertainties` tracks them, so the interval doesn't spuriously widen.
2. **Evidence quality mechanically dampens impact.** A 2.0× LR from a management claim is not a 2.0× LR. Quality scales distance from 1.0, so a quality-0 source is exactly inert.
3. **Bias corrections are on by default.** Inside-view LRs are dampened and the final interval inflated, because the documented failure mode of this chain is overconfidence.

Posteriors clamp to [5%, 95%]: no finite chain of ordinal evidence earns certainty.

## Other entry points

```python
from tfg_core.ev import monte_carlo
from tfg_core.options import scenario_probabilities
from tfg_core.portfolio import black_litterman

# EV as a distribution, never a point estimate.
mc = monte_carlo(
    current_mcap=4400, revenue_scenarios=[365, 300, 240, 180],
    revenue_probs=[0.20, 0.40, 0.25, 0.15], revenue_stds=[40, 30, 25, 30],
    multiple_scenarios=[30, 22, 15], multiple_probs=[0.20, 0.50, 0.30],
)
print(mc.ev_mean, mc.percentiles.p5, mc.percentiles.p95, mc.kelly_fraction)

# Market-implied probabilities instead of asserted ones. These sum to 1 by construction.
implied = scenario_probabilities(
    spot=178, iv=0.39, rf=0.045, expiry_years=1.0,
    scenario_boundaries=[130, 155, 250, 360],
    scenario_labels=["worst", "bear", "base_top", "bull_top"],
)

# Covariance is an argument, never fetched here — that boundary is deliberate.
weights = black_litterman(
    tickers=["NVDA", "GOOGL"], market_caps=[4.4e12, 2.1e12],
    views=[-3.9, -8.3], confidences=[55, 35], sigma=my_covariance_matrix,
)
```

## Tests

```bash
pip install -e ".[dev]"
pytest
```

Two suites, with different jobs. `test_against_fixtures.py` checks every algorithm against the shared golden vectors in `../fixtures`, which the TypeScript port reads too — so neither language can drift silently. `test_invariants.py` asserts the properties the methodology *claims*: that probabilities partition the line, that bias correction only ever widens an interval, that drift against a declared lean is never flagged as motivated reasoning.

Monte Carlo is the one exception to cross-language equality. NumPy's PCG64 stream cannot be reproduced in TypeScript, so the port is held to distributional agreement within tolerance while Python asserts its own stream exactly.

## License

MIT
