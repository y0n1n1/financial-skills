"""Scoring for human overrides of a model estimate.

Distinct from :mod:`tfg_core.calibration`, which scores all forecasts. This
scores only the cases where a human disagreed with the model, and asks the
narrower question: did the override move the estimate toward the truth or away
from it? Intuition that is reliably worse than the model is worth knowing about.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class DivergenceCategory(str, Enum):
    """Kind of judgement the override exercised.

    Tracked separately because intuition is rarely uniformly good: domain
    knowledge may beat the model on product adoption and lose on macro.
    """

    FINANCIAL_FORECAST = "financial_forecast"
    COMPETITIVE_DYNAMICS = "competitive_dynamics"
    MACRO_CYCLE = "macro_cycle"
    HUMAN_DECISION = "human_decision"
    PRODUCT_ADOPTION = "product_adoption"
    OTHER = "other"


#: Substrings mapping a parameter name onto its category, checked in order.
CATEGORY_KEYWORDS: tuple[tuple[DivergenceCategory, tuple[str, ...]], ...] = (
    (DivergenceCategory.FINANCIAL_FORECAST, ("margin", "revenue", "earnings")),
    (DivergenceCategory.COMPETITIVE_DYNAMICS, ("silicon", "share", "moat", "cuda")),
    (DivergenceCategory.MACRO_CYCLE, ("capex", "regime", "vix", "fed")),
    (DivergenceCategory.HUMAN_DECISION, ("doj", "antitrust", "regulation")),
    (DivergenceCategory.PRODUCT_ADOPTION, ("gemini", "engagement", "adoption")),
)


@dataclass(frozen=True, slots=True)
class Divergence:
    """A recorded disagreement between the model and a human estimate."""

    parameter: str
    model_recommendation: float
    human_answer: float
    certainty: float

    @property
    def divergence(self) -> float:
        """Signed distance from the model's estimate. Positive is more bullish."""
        return self.human_answer - self.model_recommendation

    @property
    def category(self) -> str:
        """Category inferred from the parameter name."""
        return categorize(self.parameter).value


@dataclass(frozen=True, slots=True)
class Resolution:
    """Which estimate turned out closer once the truth was known."""

    actual: float
    model_error: float
    human_error: float
    human_was_better: bool
    error_reduction: float


def categorize(parameter: str) -> DivergenceCategory:
    """Infer a category from a parameter name, falling back to OTHER."""
    name = parameter.lower()
    for category, keywords in CATEGORY_KEYWORDS:
        if any(keyword in name for keyword in keywords):
            return category
    return DivergenceCategory.OTHER


def resolve(divergence: Divergence, actual: float) -> Resolution:
    """Score an override against the realised value.

    ``error_reduction`` is positive when the human estimate was closer, and is
    the quantity worth aggregating: a run of correct-direction overrides that
    barely improve accuracy is not evidence of useful intuition.
    """
    model_error = abs(divergence.model_recommendation - actual)
    human_error = abs(divergence.human_answer - actual)
    return Resolution(
        actual=actual,
        model_error=model_error,
        human_error=human_error,
        human_was_better=human_error < model_error,
        error_reduction=model_error - human_error,
    )
