"""One-at-a-time sensitivity analysis over the revenue x multiple matrix.

Ranks inputs by how far expected value moves when each is perturbed alone.
The output feeds ``theory/attention-allocation.md``: the widest swing is where
the next hour of research buys the most.
"""

from __future__ import annotations

from dataclasses import dataclass

from .ev import deterministic_ev

#: Probabilities are perturbed by this many percentage points, then renormalised.
PROBABILITY_SHIFT = 0.10

#: Net margin is perturbed by this many percentage points.
MARGIN_SHIFT = 0.05

#: Clamps applied to a perturbed probability before the rest are redistributed.
PROBABILITY_CEILING = 0.95
PROBABILITY_FLOOR = 0.05

#: Display labels for multiple scenarios, in descending-multiple order.
MULTIPLE_LABELS = ("Bull", "Current", "Bear", "Crash", "Extra1", "Extra2")


@dataclass(frozen=True, slots=True)
class Sensitivity:
    """Expected-value swing produced by perturbing one input."""

    parameter: str
    ev_low: float
    ev_high: float
    ev_swing: float
    base_ev: float


def _redistribute(probs: list[float], index: int, target: float) -> list[float]:
    """Set ``probs[index]`` to ``target`` and rescale the others to keep the sum at 1."""
    shifted = list(probs)
    shifted[index] = target
    remaining = 1.0 - target
    other_sum = sum(p for i, p in enumerate(shifted) if i != index)
    if other_sum > 0:
        for i in range(len(shifted)):
            if i != index:
                shifted[i] = shifted[i] * remaining / other_sum
    return shifted


def run_sensitivity(
    current_mcap: float,
    revenue_scenarios: list[float],
    revenue_probs: list[float],
    revenue_stds: list[float],
    multiple_scenarios: list[float],
    multiple_probs: list[float],
    margin: float,
) -> list[Sensitivity]:
    """Perturb every input in turn, returning swings sorted widest-first.

    Revenue levels move by their own standard deviation; probabilities move by
    ``PROBABILITY_SHIFT`` with the remainder redistributed proportionally;
    margin moves by ``MARGIN_SHIFT``.
    """
    base_ev = deterministic_ev(
        current_mcap, revenue_scenarios, revenue_probs,
        multiple_scenarios, multiple_probs, margin,
    )
    sensitivities: list[Sensitivity] = []

    def ev_with(revenues=None, rev_probs=None, mult_probs=None, net_margin=None) -> float:
        return deterministic_ev(
            current_mcap,
            revenues if revenues is not None else revenue_scenarios,
            rev_probs if rev_probs is not None else revenue_probs,
            multiple_scenarios,
            mult_probs if mult_probs is not None else multiple_probs,
            net_margin if net_margin is not None else margin,
        )

    # Revenue levels: perturb each scenario by its own standard deviation.
    for i, (revenue, std) in enumerate(zip(revenue_scenarios, revenue_stds)):
        high = list(revenue_scenarios)
        high[i] = revenue + std
        low = list(revenue_scenarios)
        low[i] = revenue - std
        ev_high = ev_with(revenues=high)
        ev_low = ev_with(revenues=low)
        sensitivities.append(Sensitivity(
            parameter=f"Revenue scenario {i + 1} (${revenue}B ± ${std}B)",
            ev_low=ev_low,
            ev_high=ev_high,
            ev_swing=ev_high - ev_low,
            base_ev=base_ev,
        ))

    # Multiple probabilities.
    for i, prob in enumerate(multiple_probs):
        probs_high = _redistribute(multiple_probs, i, min(prob + PROBABILITY_SHIFT, PROBABILITY_CEILING))
        probs_low = _redistribute(multiple_probs, i, max(prob - PROBABILITY_SHIFT, PROBABILITY_FLOOR))
        ev_high = ev_with(mult_probs=probs_high)
        ev_low = ev_with(mult_probs=probs_low)
        label = MULTIPLE_LABELS[i] if i < len(MULTIPLE_LABELS) else f"Multiple {i + 1}"
        sensitivities.append(Sensitivity(
            parameter=f"{label} multiple prob ({prob:.0%} ± 10pp)",
            ev_low=ev_low,
            ev_high=ev_high,
            ev_swing=abs(ev_high - ev_low),
            base_ev=base_ev,
        ))

    # Revenue probabilities.
    for i, prob in enumerate(revenue_probs):
        probs_high = _redistribute(revenue_probs, i, min(prob + PROBABILITY_SHIFT, PROBABILITY_CEILING))
        probs_low = _redistribute(revenue_probs, i, max(prob - PROBABILITY_SHIFT, PROBABILITY_FLOOR))
        ev_high = ev_with(rev_probs=probs_high)
        ev_low = ev_with(rev_probs=probs_low)
        sensitivities.append(Sensitivity(
            parameter=f"Revenue ${revenue_scenarios[i]}B prob ({prob:.0%} ± 10pp)",
            ev_low=ev_low,
            ev_high=ev_high,
            ev_swing=abs(ev_high - ev_low),
            base_ev=base_ev,
        ))

    # Net margin.
    ev_high_margin = ev_with(net_margin=margin + MARGIN_SHIFT)
    ev_low_margin = ev_with(net_margin=margin - MARGIN_SHIFT)
    sensitivities.append(Sensitivity(
        parameter=f"Net margin ({margin:.0%} ± 5pp)",
        ev_low=ev_low_margin,
        ev_high=ev_high_margin,
        ev_swing=abs(ev_high_margin - ev_low_margin),
        base_ev=base_ev,
    ))

    sensitivities.sort(key=lambda s: s.ev_swing, reverse=True)
    return sensitivities
