"""Calibration scoring: are the stated probabilities any good?

A forecast of 70% is only meaningful if things forecast at 70% happen about 70%
of the time. Brier scores and bucket reliability measure that directly, which is
what separates a track record from a narrative.

Scoring is pure: callers own storage. ``tools/calibration.py`` holds the log.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

#: Brier score of an uninformed forecaster who always says 50%.
UNINFORMED_BRIER = 0.25

#: Brier below this counts as good calibration.
GOOD_BRIER = 0.15

#: Minimum resolved forecasts before bucket statistics mean anything.
MIN_RESOLVED_FOR_STATS = 3

#: Reliability-diagram buckets. The top edge exceeds 1.0 to include p = 1.0.
BUCKETS: tuple[tuple[float, float], ...] = (
    (0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.01),
)

#: Forecasts above this are "high confidence" for the overconfidence check.
HIGH_CONFIDENCE = 0.7

#: Forecasts below this are "low confidence" for the overconfidence check.
LOW_CONFIDENCE = 0.3

#: Gap between stated and actual rates that triggers an overconfidence flag.
OVERCONFIDENCE_GAP = 0.15

#: Bucket gap beyond which that bucket is judged miscalibrated.
BUCKET_TOLERANCE = 0.10


@dataclass(frozen=True, slots=True)
class Forecast:
    """A resolved forecast: what was claimed, and what happened."""

    probability: float
    outcome: int


@dataclass(frozen=True, slots=True)
class Bucket:
    """Reliability statistics for one confidence band."""

    low: float
    high: float
    count: int
    avg_forecast: float
    actual_rate: float
    gap: float

    @property
    def calibrated(self) -> bool:
        """Whether the band's actual rate is within tolerance of its average claim."""
        return abs(self.gap) < BUCKET_TOLERANCE


@dataclass(frozen=True, slots=True)
class CalibrationReport:
    """Aggregate calibration across every resolved forecast."""

    n_resolved: int
    mean_brier: float
    verdict: str
    buckets: list[Bucket]
    overconfident: bool
    overconfidence_detail: str
    sufficient_data: bool


def brier_score(probability: float, outcome: int) -> float:
    """Squared error of a probabilistic forecast. 0 is perfect, 0.25 uninformed."""
    return (probability - outcome) ** 2


def verdict_for(mean_brier: float) -> str:
    """Plain-language reading of a mean Brier score."""
    if mean_brier < GOOD_BRIER:
        return "GOOD"
    if mean_brier < UNINFORMED_BRIER:
        return "MODERATE"
    return "POOR"


def score_calibration(forecasts: list[Forecast]) -> CalibrationReport:
    """Compute mean Brier, bucket reliability, and the overconfidence check.

    Reports ``sufficient_data=False`` below ``MIN_RESOLVED_FOR_STATS`` resolved
    forecasts and still returns the mean Brier, because a provisional number
    labelled provisional beats refusing to answer.
    """
    if not forecasts:
        return CalibrationReport(
            n_resolved=0, mean_brier=float("nan"), verdict="NO DATA",
            buckets=[], overconfident=False,
            overconfidence_detail="No resolved forecasts.", sufficient_data=False,
        )

    probs = [f.probability for f in forecasts]
    outcomes = [f.outcome for f in forecasts]
    mean_brier = float(np.mean([brier_score(p, o) for p, o in zip(probs, outcomes)]))
    sufficient = len(forecasts) >= MIN_RESOLVED_FOR_STATS

    buckets: list[Bucket] = []
    for low, high in BUCKETS:
        in_bucket = [(p, o) for p, o in zip(probs, outcomes) if low <= p < high]
        if not in_bucket:
            continue
        avg_p = float(np.mean([p for p, _ in in_bucket]))
        actual = float(np.mean([o for _, o in in_bucket]))
        buckets.append(Bucket(
            low=low, high=high, count=len(in_bucket),
            avg_forecast=avg_p, actual_rate=actual, gap=actual - avg_p,
        ))

    overconfident = False
    detail = "No overconfidence detected."
    high_conf = [(p, o) for p, o in zip(probs, outcomes) if p > HIGH_CONFIDENCE]
    if high_conf:
        high_avg = float(np.mean([p for p, _ in high_conf]))
        high_actual = float(np.mean([o for _, o in high_conf]))
        if high_actual < high_avg - OVERCONFIDENCE_GAP:
            overconfident = True
            detail = (
                f"High-confidence calls ({high_avg:.0%} avg) are right only "
                f"{high_actual:.0%} of the time."
            )

    return CalibrationReport(
        n_resolved=len(forecasts),
        mean_brier=mean_brier,
        verdict=verdict_for(mean_brier),
        buckets=buckets,
        overconfident=overconfident,
        overconfidence_detail=detail,
        sufficient_data=sufficient,
    )
