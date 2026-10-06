"""Black-Litterman allocation.

Blends the market's equilibrium returns with explicit views, weighting each by
its uncertainty. The covariance matrix is an *argument*, never fetched here —
price data is an adapter concern, and keeping it out is what makes this testable.

Per ``sizing/SKILL.md`` this is the allocator, not one candidate among several.
Kelly gates entry (see :mod:`tfg_core.kelly`) and cluster caps constrain the
output, but the weight itself comes from here.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

#: Weight on the prior in the BL posterior. Standard practice is 0.025-0.05.
DEFAULT_TAU = 0.05

#: Risk-aversion coefficient. ``theory/regime-detection.md`` raises it when cautious.
DEFAULT_RISK_AVERSION = 2.5

#: Floor on any view's variance, so full confidence cannot produce a singular omega.
MIN_VIEW_VARIANCE = 1e-4


@dataclass(frozen=True, slots=True)
class BlackLittermanResult:
    """Equilibrium, blended returns, and the weights they imply."""

    tickers: list[str]
    market_weights: dict[str, float]
    equilibrium_returns: dict[str, float]
    bl_returns: dict[str, float]
    bl_weights: dict[str, float]
    risk_contribution: dict[str, float]
    portfolio_vol: float
    views_used: dict[str, float]
    confidences_used: dict[str, float]


def equilibrium_returns(
    sigma: np.ndarray, market_weights: np.ndarray, risk_aversion: float,
) -> np.ndarray:
    """Reverse-optimise the returns implied by holding the market portfolio.

    This is the prior: what the market must believe for current cap weights to
    be optimal. Starting anywhere else smuggles in a view before stating one.
    """
    return risk_aversion * sigma @ market_weights


def black_litterman(
    tickers: list[str],
    market_caps: list[float],
    views: list[float],
    confidences: list[float],
    sigma: np.ndarray,
    risk_aversion: float = DEFAULT_RISK_AVERSION,
    tau: float = DEFAULT_TAU,
) -> BlackLittermanResult:
    """Blend equilibrium returns with absolute views on each asset.

    ``views`` are expected returns in percent, one per ticker. ``confidences``
    are 0-100; higher confidence shrinks that view's variance in omega, so the
    posterior leans further from equilibrium toward the view.

    Weights are long-only and normalised to sum to 1. If every weight is
    non-positive the market portfolio is returned, because a long-only optimiser
    with no admissible solution should fall back to the prior rather than fail.
    """
    n = len(tickers)
    sigma = np.asarray(sigma, dtype=float)

    total_cap = sum(market_caps)
    w_mkt = np.array([mc / total_cap for mc in market_caps])

    pi = equilibrium_returns(sigma, w_mkt, risk_aversion)

    # Absolute views on every asset, so the pick matrix is the identity.
    P = np.eye(n)
    Q = np.array([v / 100 for v in views])

    # Omega: diagonal view-uncertainty. Confidence 100 trusts the view entirely,
    # confidence 0 falls back to the prior's own scaled variance.
    omega_diag = [
        max(MIN_VIEW_VARIANCE, (1.0 - conf / 100.0) * tau * sigma[i][i])
        for i, conf in enumerate(confidences)
    ]
    omega = np.diag(omega_diag)

    tau_sigma_inv = np.linalg.inv(tau * sigma)
    omega_inv = np.linalg.inv(omega)
    M = np.linalg.inv(tau_sigma_inv + P.T @ omega_inv @ P)
    bl_returns = M @ (tau_sigma_inv @ pi + P.T @ omega_inv @ Q)

    w_bl = np.linalg.inv(risk_aversion * sigma) @ bl_returns
    w_bl = np.maximum(w_bl, 0)
    w_sum = w_bl.sum()
    w_bl = w_bl / w_sum if w_sum > 0 else w_mkt

    port_vol = np.sqrt(w_bl @ sigma @ w_bl) * 100
    risk_contrib = w_bl * (sigma @ w_bl)
    contrib_sum = risk_contrib.sum()
    risk_contrib_pct = (
        risk_contrib / contrib_sum * 100 if contrib_sum > 0 else np.zeros(n)
    )

    return BlackLittermanResult(
        tickers=tickers,
        market_weights={t: round(float(w), 4) for t, w in zip(tickers, w_mkt)},
        equilibrium_returns={t: round(float(r) * 100, 2) for t, r in zip(tickers, pi)},
        bl_returns={t: round(float(r) * 100, 2) for t, r in zip(tickers, bl_returns)},
        bl_weights={t: round(float(w), 4) for t, w in zip(tickers, w_bl)},
        risk_contribution={t: round(float(rc), 1) for t, rc in zip(tickers, risk_contrib_pct)},
        portfolio_vol=round(float(port_vol), 1),
        views_used=dict(zip(tickers, views)),
        confidences_used=dict(zip(tickers, confidences)),
    )
