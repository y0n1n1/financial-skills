"""Piotroski F-Score: nine binary accounting signals, scored 0-9.

Each signal is a yes/no comparison between the current period and the prior one,
grouped into profitability (4), leverage (3), and efficiency (2). Binary scoring
is the point — it resists the temptation to weight whichever signal flatters the
thesis, which is why it feeds the fundamental lens as a standardised input.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Category(str, Enum):
    """The three signal groups."""

    PROFITABILITY = "Profitability"
    LEVERAGE = "Leverage"
    EFFICIENCY = "Efficiency"


class Quality(str, Enum):
    """Score bands. Piotroski's original work found 7+ historically outperforms."""

    STRONG = "STRONG"
    MODERATE = "MODERATE"
    WEAK = "WEAK"


#: Lowest total score still counted as STRONG.
STRONG_THRESHOLD = 7

#: Lowest total score still counted as MODERATE.
MODERATE_THRESHOLD = 4


@dataclass(frozen=True, slots=True)
class Signal:
    """One binary signal, with the comparison that produced it."""

    name: str
    category: str
    score: int
    detail: str


@dataclass(frozen=True, slots=True)
class FScore:
    """Total score, per-group subtotals, and every underlying signal."""

    total_score: int
    max_score: int
    quality: str
    signals: list[Signal]
    accruals_ratio: float
    profitability_score: int
    leverage_score: int
    efficiency_score: int


def classify(total: int) -> Quality:
    """Map a 0-9 total onto its quality band."""
    if total >= STRONG_THRESHOLD:
        return Quality.STRONG
    if total >= MODERATE_THRESHOLD:
        return Quality.MODERATE
    return Quality.WEAK


def compute_fscore(
    roa_current: float,
    roa_prior: float,
    cfo_current: float,
    net_income_current: float,
    ltd_ratio_current: float,
    ltd_ratio_prior: float,
    current_ratio_current: float,
    current_ratio_prior: float,
    shares_current: float,
    shares_prior: float,
    gross_margin_current: float,
    gross_margin_prior: float,
    asset_turnover_current: float,
    asset_turnover_prior: float,
) -> FScore:
    """Score all nine signals.

    Cash-flow figures are in billions and share counts in millions, but only
    their signs and period-over-period directions matter, so units cancel.
    """
    s1 = 1 if roa_current > 0 else 0
    s2 = 1 if cfo_current > 0 else 0
    s3 = 1 if roa_current > roa_prior else 0
    s4 = 1 if cfo_current > net_income_current else 0
    s5 = 1 if ltd_ratio_current < ltd_ratio_prior else 0
    s6 = 1 if current_ratio_current > current_ratio_prior else 0
    s7 = 1 if shares_current <= shares_prior else 0
    s8 = 1 if gross_margin_current > gross_margin_prior else 0
    s9 = 1 if asset_turnover_current > asset_turnover_prior else 0

    signals = [
        Signal("ROA positive", Category.PROFITABILITY.value, s1,
               f"ROA = {roa_current:.2%} {'> 0' if s1 else '<= 0'}"),
        Signal("CFO positive", Category.PROFITABILITY.value, s2,
               f"CFO = ${cfo_current:.1f}B {'> 0' if s2 else '<= 0'}"),
        Signal("ROA improving", Category.PROFITABILITY.value, s3,
               f"ROA {roa_current:.2%} vs prior {roa_prior:.2%}"),
        Signal("CFO > Net Income (quality)", Category.PROFITABILITY.value, s4,
               f"CFO ${cfo_current:.1f}B vs NI ${net_income_current:.1f}B "
               f"— accruals {'low' if s4 else 'high'}"),
        Signal("Debt ratio declining", Category.LEVERAGE.value, s5,
               f"LTD/Assets {ltd_ratio_current:.3f} vs prior {ltd_ratio_prior:.3f}"),
        Signal("Current ratio improving", Category.LEVERAGE.value, s6,
               f"Current ratio {current_ratio_current:.2f} vs prior {current_ratio_prior:.2f}"),
        Signal("No dilution", Category.LEVERAGE.value, s7,
               f"Shares {shares_current:.0f}M vs prior {shares_prior:.0f}M"),
        Signal("Gross margin improving", Category.EFFICIENCY.value, s8,
               f"GM {gross_margin_current:.1%} vs prior {gross_margin_prior:.1%}"),
        Signal("Asset turnover improving", Category.EFFICIENCY.value, s9,
               f"AT {asset_turnover_current:.2f} vs prior {asset_turnover_prior:.2f}"),
    ]

    total = sum(s.score for s in signals)

    # Accruals: the gap between reported earnings and the cash behind them.
    # Positive means earnings outrun cash flow, which is the warning direction.
    accruals = (net_income_current - cfo_current) / max(1, net_income_current)

    return FScore(
        total_score=total,
        max_score=9,
        quality=classify(total).value,
        signals=signals,
        accruals_ratio=accruals,
        profitability_score=s1 + s2 + s3 + s4,
        leverage_score=s5 + s6 + s7,
        efficiency_score=s8 + s9,
    )
