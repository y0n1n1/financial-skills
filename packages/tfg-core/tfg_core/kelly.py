"""Kelly criterion, used as a binary entry gate rather than a position sizer.

``sizing/SKILL.md`` is explicit about the division of labour: Kelly answers
"does this trade have positive expected value?" and nothing else. A negative
fraction excludes the position outright, with no override. The *size* comes from
Black-Litterman (:mod:`tfg_core.portfolio`).

The reason is estimation error. Full Kelly is optimal only if p and b are known
exactly; with uncertain inputs it systematically oversizes, and its drawdown
profile is brutal even when correct. So the fraction is a gate, and the fractional
multiples below exist for anyone who wants to size from it anyway.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Gate(str, Enum):
    """Outcome of the entry gate."""

    PASS = "PASS"
    MARGINAL = "MARGINAL"
    EXCLUDED = "EXCLUDED"


#: A positive fraction below this is a rounding error, not an edge.
MARGINAL_THRESHOLD = 0.05

#: Conviction-to-probability heuristic from ``sizing/kelly.md``.
#: A starting point only — a Bayesian posterior should replace it when available.
CONVICTION_PRIORS: dict[int, float] = {5: 0.85, 4: 0.70, 3: 0.55, 2: 0.40, 1: 0.25}

#: Growth-rate and variance retention of fractional Kelly (Thorp, 2006).
HALF_KELLY = 0.5
QUARTER_KELLY = 0.25


@dataclass(frozen=True, slots=True)
class KellyResult:
    """The fraction, its fractional multiples, and the gate verdict."""

    probability: float
    win_loss_ratio: float
    fraction: float
    half: float
    quarter: float
    gate: str
    reason: str

    @property
    def passes(self) -> bool:
        """Whether the position may be sized at all."""
        return self.gate != Gate.EXCLUDED.value


def kelly_fraction(probability: float, win_loss_ratio: float) -> float:
    """f* = (p*b - q) / b.

    ``win_loss_ratio`` is upside divided by downside, both as positive
    magnitudes. Returns 0 for a non-positive ratio, where the bet is undefined
    rather than merely bad.
    """
    if win_loss_ratio <= 0:
        return 0.0
    q = 1 - probability
    return (probability * win_loss_ratio - q) / win_loss_ratio


def growth_rate(probability: float, win_loss_ratio: float, fraction: float) -> float:
    """Expected log growth per bet at a given staked fraction.

    This is the quantity Kelly maximises. It is also what shows *why* full Kelly
    is the peak of a curve that falls off steeply on the right: overbetting drives
    the rate negative well before the fraction reaches 1.
    """
    import math

    win = 1 + fraction * win_loss_ratio
    loss = 1 - fraction
    if win <= 0 or loss <= 0:
        return float("-inf")
    return probability * math.log(win) + (1 - probability) * math.log(loss)


def evaluate(probability: float, upside: float, downside: float) -> KellyResult:
    """Run the entry gate on an upside/downside pair.

    ``upside`` and ``downside`` are both positive magnitudes — a 52% upside and a
    25% downside are ``0.52`` and ``0.25``. A zero or negative downside is
    rejected rather than treated as a free bet.
    """
    if downside <= 0:
        return KellyResult(
            probability=probability, win_loss_ratio=float("inf"), fraction=0.0,
            half=0.0, quarter=0.0, gate=Gate.EXCLUDED.value,
            reason="Downside must be a positive magnitude; a riskless bet is not modelled.",
        )

    b = upside / downside
    f = kelly_fraction(probability, b)

    if f <= 0:
        gate, reason = Gate.EXCLUDED.value, (
            f"Negative expected value at p={probability:.1%} and b={b:.2f}. "
            "Excluded — no override."
        )
    elif f < MARGINAL_THRESHOLD:
        gate, reason = Gate.MARGINAL.value, (
            f"Positive but thin edge (f*={f:.3f}). Passes the gate; treat the "
            "edge as within estimation error."
        )
    else:
        gate, reason = Gate.PASS.value, f"Positive expected value (f*={f:.3f})."

    return KellyResult(
        probability=probability, win_loss_ratio=b, fraction=f,
        half=f * HALF_KELLY, quarter=f * QUARTER_KELLY, gate=gate, reason=reason,
    )


def breakeven_probability(win_loss_ratio: float) -> float:
    """The win rate at which f* crosses zero, i.e. the gate's threshold.

    Below this, no payoff ratio rescues the trade.
    """
    if win_loss_ratio <= 0:
        return 1.0
    return 1 / (1 + win_loss_ratio)
