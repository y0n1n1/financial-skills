"""Expected value from the revenue x multiple matrix.

Two estimators over the same matrix: a closed-form expectation, and a Monte
Carlo simulation that returns a *distribution* rather than a point estimate.
``theory/bayesian-engine.md`` requires the distribution — a bare EV number
hides whether the confidence interval straddles zero.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

#: Revenue draws are floored here so a drawdown never implies the company vanishes.
REVENUE_FLOOR_USD_B = 50.0

#: Multiple draws are floored here: no going concern trades at less than this.
MULTIPLE_FLOOR = 5.0

#: Multiples carry this proportional lognormal-ish noise around their scenario value.
MULTIPLE_NOISE_STD = 0.10

#: Fraction of full Kelly used as the house default (quarter-Kelly).
KELLY_SAFETY_FRACTION = 0.25


@dataclass(frozen=True, slots=True)
class Percentiles:
    """Return distribution percentiles, as decimal fractions."""

    p5: float
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    p95: float


@dataclass(frozen=True, slots=True)
class Histogram:
    """Bin counts and edges, ready to plot without further processing."""

    counts: list[int] = field(default_factory=list)
    edges: list[float] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class MonteCarloResult:
    """Outcome of a Monte Carlo pass over the revenue x multiple matrix."""

    n_simulations: int
    ev_mean: float
    ev_median: float
    ev_std: float
    percentiles: Percentiles
    p_positive: float
    p_negative: float
    avg_win: float
    avg_loss: float
    win_loss_ratio: float
    kelly_fraction: float
    kelly_quarter: float
    histogram: Histogram


def deterministic_ev(
    current_mcap: float,
    revenue_scenarios: list[float],
    revenue_probs: list[float],
    multiple_scenarios: list[float],
    multiple_probs: list[float],
    margin: float,
) -> float:
    """Closed-form expected return over the full outer product of the matrix.

    Revenue and multiple are treated as independent, so every cell's weight is
    the product of its marginals.
    """
    ev = 0.0
    for revenue, revenue_prob in zip(revenue_scenarios, revenue_probs):
        for multiple, multiple_prob in zip(multiple_scenarios, multiple_probs):
            implied_mcap = revenue * margin * multiple
            ret = (implied_mcap - current_mcap) / current_mcap
            ev += revenue_prob * multiple_prob * ret
    return ev


def monte_carlo(
    current_mcap: float,
    revenue_scenarios: list[float],
    revenue_probs: list[float],
    revenue_stds: list[float],
    multiple_scenarios: list[float],
    multiple_probs: list[float],
    net_margin: float = 0.65,
    n_simulations: int = 100_000,
    seed: int = 42,
) -> MonteCarloResult:
    """Simulate the matrix, propagating scenario uncertainty into a return distribution.

    Each path draws a revenue scenario, perturbs it by that scenario's standard
    deviation, draws a multiple, perturbs that proportionally, and prices the
    implied market cap against today's.
    """
    rng = np.random.default_rng(seed)

    rev_indices = rng.choice(len(revenue_scenarios), size=n_simulations, p=revenue_probs)
    rev_means = np.asarray(revenue_scenarios, dtype=float)[rev_indices]
    rev_stds = np.asarray(revenue_stds, dtype=float)[rev_indices]
    revenues = np.maximum(rng.normal(rev_means, rev_stds), REVENUE_FLOOR_USD_B)

    mult_indices = rng.choice(len(multiple_scenarios), size=n_simulations, p=multiple_probs)
    multiples = np.asarray(multiple_scenarios, dtype=float)[mult_indices]
    multiples = multiples * rng.normal(1.0, MULTIPLE_NOISE_STD, n_simulations)
    multiples = np.maximum(multiples, MULTIPLE_FLOOR)

    market_caps = revenues * net_margin * multiples
    returns = (market_caps - current_mcap) / current_mcap

    p_positive = float(np.mean(returns > 0))
    p_negative = float(np.mean(returns < 0))

    wins = returns[returns > 0]
    losses = returns[returns < 0]
    avg_win = float(np.mean(wins)) if len(wins) else 0.0
    avg_loss = float(np.mean(np.abs(losses))) if len(losses) else 0.0
    win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else float("inf")

    if avg_loss > 0 and win_loss_ratio > 0:
        kelly = (p_positive * win_loss_ratio - p_negative) / win_loss_ratio
    else:
        kelly = 0.0

    counts, edges = np.histogram(returns, bins=50)

    return MonteCarloResult(
        n_simulations=n_simulations,
        ev_mean=float(np.mean(returns)),
        ev_median=float(np.median(returns)),
        ev_std=float(np.std(returns)),
        percentiles=Percentiles(
            p5=float(np.percentile(returns, 5)),
            p10=float(np.percentile(returns, 10)),
            p25=float(np.percentile(returns, 25)),
            p50=float(np.percentile(returns, 50)),
            p75=float(np.percentile(returns, 75)),
            p90=float(np.percentile(returns, 90)),
            p95=float(np.percentile(returns, 95)),
        ),
        p_positive=p_positive,
        p_negative=p_negative,
        avg_win=avg_win,
        avg_loss=avg_loss,
        win_loss_ratio=win_loss_ratio,
        kelly_fraction=kelly,
        kelly_quarter=kelly * KELLY_SAFETY_FRACTION,
        histogram=Histogram(counts=counts.tolist(), edges=edges.tolist()),
    )
