"""Market-implied scenario probabilities from the Black-Scholes measure.

Replaces asserted scenario probabilities with ones the options market is
actually quoting. Under the risk-neutral measure the terminal price is
lognormal, so a strike range maps directly to a probability.

These are risk-neutral, not real-world, probabilities: they carry the market's
risk premium. Treat them as the market's *pricing* of a scenario, which is
exactly what ``theory/market-mechanics.md`` wants to compare a view against.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.stats import norm

#: Midpoint used for the open-ended bottom bucket, as a fraction of its upper bound.
BOTTOM_BUCKET_MIDPOINT = 0.5

#: Representative level for the open-ended top bucket, as a multiple of its lower bound.
TOP_BUCKET_MULTIPLE = 1.3


@dataclass(frozen=True, slots=True)
class Scenario:
    """One price bucket with its implied probability and representative return.

    The return field is spelled ``return_`` because ``return`` is a Python
    keyword; :meth:`as_dict` restores the wire name.
    """

    label: str
    range: str
    probability: float
    return_: float

    def as_dict(self) -> dict:
        """Serialise with ``return`` as the key, matching the published JSON shape."""
        return {
            "label": self.label,
            "range": self.range,
            "probability": self.probability,
            "return": self.return_,
        }


@dataclass(frozen=True, slots=True)
class ImpliedScenarios:
    """A full partition of terminal price space, plus the EV it implies."""

    scenarios: list[Scenario]
    ev: float

    def as_dicts(self) -> list[dict]:
        """Serialise every bucket in order."""
        return [s.as_dict() for s in self.scenarios]


def _drift_and_vol(T: float, r: float, sigma: float) -> tuple[float, float]:
    """Log-return drift and volatility over the horizon under the risk-neutral measure."""
    return (r - 0.5 * sigma**2) * T, sigma * np.sqrt(T)


def probability_below(S: float, K: float, T: float, r: float, sigma: float) -> float:
    """P(S_T < K)."""
    mu, vol = _drift_and_vol(T, r, sigma)
    return float(norm.cdf((np.log(K / S) - mu) / vol))


def probability_above(S: float, K: float, T: float, r: float, sigma: float) -> float:
    """P(S_T > K)."""
    return 1.0 - probability_below(S, K, T, r, sigma)


def probability_range(
    S: float, K_low: float, K_high: float, T: float, r: float, sigma: float,
) -> float:
    """P(K_low < S_T < K_high). Returns 0 at or past expiry, where the range has no width."""
    if T <= 0:
        return 0.0
    mu, vol = _drift_and_vol(T, r, sigma)
    d_high = (np.log(K_high / S) - mu) / vol
    d_low = (np.log(K_low / S) - mu) / vol
    return float(norm.cdf(d_high) - norm.cdf(d_low))


def scenario_probabilities(
    spot: float,
    iv: float,
    rf: float,
    expiry_years: float,
    scenario_boundaries: list[float],
    scenario_labels: list[str],
) -> ImpliedScenarios:
    """Partition price space at ``scenario_boundaries`` and price each bucket.

    Produces ``len(boundaries) + 1`` buckets: one below the lowest boundary, one
    between each adjacent pair, and one above the highest. Probabilities sum to 1
    by construction, so they cannot be quietly rigged the way asserted ones can.
    """
    boundaries = sorted(scenario_boundaries)
    scenarios: list[Scenario] = []

    p_below = probability_below(spot, boundaries[0], expiry_years, rf, iv)
    scenarios.append(Scenario(
        label=f"Below ${boundaries[0]:.0f}" if not scenario_labels else scenario_labels[0],
        range=f"$0 - ${boundaries[0]:.0f}",
        probability=p_below,
        return_=(boundaries[0] * BOTTOM_BUCKET_MIDPOINT - spot) / spot,
    ))

    for i in range(len(boundaries) - 1):
        low, high = boundaries[i], boundaries[i + 1]
        label = scenario_labels[i + 1] if i + 1 < len(scenario_labels) else f"${low:.0f}-${high:.0f}"
        scenarios.append(Scenario(
            label=label,
            range=f"${low:.0f} - ${high:.0f}",
            probability=probability_range(spot, low, high, expiry_years, rf, iv),
            return_=((low + high) / 2 - spot) / spot,
        ))

    top = boundaries[-1]
    label = scenario_labels[-1] if len(scenario_labels) > len(boundaries) else f"Above ${top:.0f}"
    scenarios.append(Scenario(
        label=label,
        range=f"${top:.0f}+",
        probability=probability_above(spot, top, expiry_years, rf, iv),
        return_=(top * TOP_BUCKET_MULTIPLE - spot) / spot,
    ))

    ev = sum(s.probability * s.return_ for s in scenarios)
    return ImpliedScenarios(scenarios=scenarios, ev=ev)
