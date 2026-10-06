"""Shared constants and enumerations.

These values are the registry referenced by ``theory/safeguards.md``: changing
one is a versioned methodology change, not a per-analysis tweak.
"""

from __future__ import annotations

from enum import Enum


class Direction(str, Enum):
    """Ordinal evidence direction. The only admissible inputs to a Bayesian chain."""

    STRONG_FOR = "STRONG_FOR"
    MODERATE_FOR = "MODERATE_FOR"
    WEAK_FOR = "WEAK_FOR"
    AMBIGUOUS = "AMBIGUOUS"
    WEAK_AGAINST = "WEAK_AGAINST"
    MODERATE_AGAINST = "MODERATE_AGAINST"
    STRONG_AGAINST = "STRONG_AGAINST"


class Tier(str, Enum):
    """Input provenance. Only EMPIRICAL and SEMI_EMPIRICAL may narrow a posterior."""

    EMPIRICAL = "EMPIRICAL"
    SEMI_EMPIRICAL = "SEMI_EMPIRICAL"
    SUBJECTIVE = "SUBJECTIVE"


#: Ordinal likelihood-ratio ranges: central estimate plus its own uncertainty.
LR_RANGES: dict[str, dict[str, float]] = {
    Direction.STRONG_FOR.value: {"central": 1.40, "std": 0.15},
    Direction.MODERATE_FOR.value: {"central": 1.15, "std": 0.10},
    Direction.WEAK_FOR.value: {"central": 1.05, "std": 0.05},
    Direction.AMBIGUOUS.value: {"central": 1.00, "std": 0.00},
    Direction.WEAK_AGAINST.value: {"central": 0.95, "std": 0.05},
    Direction.MODERATE_AGAINST.value: {"central": 0.85, "std": 0.10},
    Direction.STRONG_AGAINST.value: {"central": 0.60, "std": 0.15},
}

#: Evidence-quality dampening by provenance tier (``theory/safeguards.md``).
TIER_DAMPENING: dict[str, float] = {
    Tier.EMPIRICAL.value: 1.0,
    Tier.SEMI_EMPIRICAL.value: 0.8,
    Tier.SUBJECTIVE.value: 0.6,
}

#: Final confidence intervals are inflated by this factor to offset overconfidence.
OVERCONFIDENCE_INFLATION = 1.5

#: Inside-view likelihood ratios are dampened by this factor before updating.
INSIDE_VIEW_DAMPENING = 0.6

#: Posteriors are clamped to this range: certainty is never earned from a chain.
POSTERIOR_FLOOR = 0.05
POSTERIOR_CEILING = 0.95
