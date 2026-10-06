"""Lens reliability as diagnostic test theory.

Each analytical lens is a diagnostic test: it reads market data and returns a
verdict. Like any test it has a sensitivity and a specificity, and — the part
that matters — a predictive value that depends on the base rate.

This is the medical-testing insight applied to research. When most theories are
wrong, a SUPPORTS verdict from an 80%-sensitive lens means far less than 80%.
Equal-weighting six lenses, as naive scoring does, buries that.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Verdict(str, Enum):
    """What a lens concluded about the theory."""

    SUPPORTS = "SUPPORTS"
    NEUTRAL = "NEUTRAL"
    UNDERMINES = "UNDERMINES"


@dataclass(frozen=True, slots=True)
class Lens:
    """A lens's measured reliability and its weight in the verdict tally.

    ``sensitivity`` is None for lenses that only ever disconfirm — a pre-mortem
    cannot "detect a correct theory", so it has specificity but no sensitivity.
    """

    name: str
    sensitivity: float | None
    specificity: float
    weight: float


#: Starting reliability estimates from ``theory/lens-reliability.md``.
#: These are priors to be calibrated against outcomes, not measured constants.
LENSES: dict[str, Lens] = {
    "fundamental": Lens("Fundamental", 0.75, 0.70, 1.0),
    "technical": Lens("Technical", 0.55, 0.50, 0.5),
    "competitive_moat": Lens("Competitive Moat", 0.70, 0.75, 0.9),
    "macro_sector": Lens("Macro/Sector", 0.65, 0.60, 0.7),
    "sentiment": Lens("Sentiment", 0.60, 0.45, 0.4),
    "contrarian_check": Lens("Contrarian Check", 0.80, 0.80, 1.2),
    "historical_analogues": Lens("Historical Analogues", 0.70, 0.75, 1.1),
    "pre_mortem": Lens("Pre-Mortem", None, 0.85, 1.0),
    "reflexivity": Lens("Reflexivity", None, 0.70, 0.8),
}


@dataclass(frozen=True, slots=True)
class PredictiveValues:
    """What a lens's verdict is actually worth at a given base rate."""

    base_rate: float
    sensitivity: float
    specificity: float
    ppv: float
    npv: float

    @property
    def ppv_lift(self) -> float:
        """How far a SUPPORTS verdict moves belief above the base rate.

        Near zero means the verdict carries no information, however confident
        the lens sounded.
        """
        return self.ppv - self.base_rate


@dataclass(frozen=True, slots=True)
class WeightedTally:
    """Reliability-weighted verdict count across several lenses."""

    weighted_sum: float
    max_possible: float
    weighted_support: float
    raw_support: float
    divergence: float


def positive_predictive_value(
    sensitivity: float, specificity: float, base_rate: float,
) -> float:
    """P(theory correct | lens says SUPPORTS).

    The denominator's second term is the false-positive mass, which grows as the
    base rate falls. That is why a good lens can still have a mediocre PPV.
    """
    true_positive = sensitivity * base_rate
    false_positive = (1 - specificity) * (1 - base_rate)
    denominator = true_positive + false_positive
    if denominator == 0:
        return 0.0
    return true_positive / denominator


def negative_predictive_value(
    sensitivity: float, specificity: float, base_rate: float,
) -> float:
    """P(theory wrong | lens says UNDERMINES)."""
    true_negative = specificity * (1 - base_rate)
    false_negative = (1 - sensitivity) * base_rate
    denominator = true_negative + false_negative
    if denominator == 0:
        return 0.0
    return true_negative / denominator


def evaluate_lens(lens_key: str, base_rate: float) -> PredictiveValues:
    """Compute predictive values for one named lens at a base rate.

    Disconfirmation-only lenses are given a sensitivity of 0.5 for this
    calculation — an uninformative coin flip in the confirming direction, which
    is the honest reading of "N/A" rather than treating it as perfect.
    """
    lens = LENSES[lens_key]
    sensitivity = lens.sensitivity if lens.sensitivity is not None else 0.5
    return PredictiveValues(
        base_rate=base_rate,
        sensitivity=sensitivity,
        specificity=lens.specificity,
        ppv=positive_predictive_value(sensitivity, lens.specificity, base_rate),
        npv=negative_predictive_value(sensitivity, lens.specificity, base_rate),
    )


def weighted_tally(verdicts: dict[str, str]) -> WeightedTally:
    """Score verdicts by lens weight instead of counting them equally.

    SUPPORTS adds the lens weight, UNDERMINES subtracts it, NEUTRAL contributes
    nothing but still counts toward the maximum. ``weighted_support`` is the signed
    sum over the maximum, so it runs from -1 (every lens undermining) through 0 to
    +1, and goes negative when undermining outweighs support.

    The gap against ``raw_support`` is the point of the exercise: the worked
    example in ``theory/lens-reliability.md`` turns a raw 83% into a weighted 41%,
    because one high-weight contrarian UNDERMINES offsets several weak SUPPORTS.
    """
    weighted_sum = 0.0
    max_possible = 0.0
    raw_positive = 0
    counted = 0

    for key, verdict in verdicts.items():
        weight = LENSES[key].weight
        max_possible += weight
        if verdict == Verdict.SUPPORTS.value:
            weighted_sum += weight
            raw_positive += 1
        elif verdict == Verdict.UNDERMINES.value:
            weighted_sum -= weight
        counted += 1

    weighted_support = weighted_sum / max_possible if max_possible else 0.0
    raw_support = raw_positive / counted if counted else 0.0

    return WeightedTally(
        weighted_sum=weighted_sum,
        max_possible=max_possible,
        weighted_support=weighted_support,
        raw_support=raw_support,
        divergence=weighted_support - raw_support,
    )
