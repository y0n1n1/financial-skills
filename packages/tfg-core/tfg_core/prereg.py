"""Pre-registration: detecting motivated reasoning by committing first.

Write down the prior and the posterior you *expect* before running the analysis.
If the finished analysis lands markedly further in your pre-existing direction
than you predicted, that asymmetry is the signal — the analysis probably found
what it was looking for.

The asymmetric thresholds are deliberate. Drift that confirms a declared lean is
flagged at a lower threshold than drift in any other direction, because only the
confirming direction is evidence of the bias this check exists to catch.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Lean(str, Enum):
    """The direction the analyst declared before analysing."""

    BULLISH = "bullish"
    SLIGHTLY_BULLISH = "slightly bullish"
    NEUTRAL = "neutral"
    SLIGHTLY_BEARISH = "slightly bearish"
    BEARISH = "bearish"


BULLISH_LEANS = frozenset({Lean.BULLISH.value, Lean.SLIGHTLY_BULLISH.value})
BEARISH_LEANS = frozenset({Lean.BEARISH.value, Lean.SLIGHTLY_BEARISH.value})

#: Drift that *confirms* a declared lean is flagged beyond this many points.
CONFIRMING_DRIFT_THRESHOLD = 0.10

#: With no declared lean, drift in either direction is flagged beyond this.
UNDIRECTED_DRIFT_THRESHOLD = 0.15


@dataclass(frozen=True, slots=True)
class Comparison:
    """Pre-registered expectation versus the posterior actually produced."""

    expected_posterior: float
    actual_posterior: float
    divergence: float
    motivated_reasoning_flag: bool
    reason: str


def compare(
    expected_posterior: float, actual_posterior: float, expected_direction: str,
) -> Comparison:
    """Flag drift that confirms the declared lean.

    A bullish lean is flagged when the posterior comes in more bullish than
    predicted, a bearish lean when it comes in more bearish, and an undeclared
    lean when it moves far in either direction. Drift *against* the declared
    lean is never flagged: that is the analysis working.
    """
    divergence = actual_posterior - expected_posterior
    flag = False
    reason = "No motivated reasoning detected. Actual within expected range."

    if expected_direction in BULLISH_LEANS:
        if divergence > CONFIRMING_DRIFT_THRESHOLD:
            flag = True
            reason = (
                f"Actual posterior ({actual_posterior:.0%}) is {divergence:+.0%} more "
                f"bullish than pre-registered expectation ({expected_posterior:.0%}). "
                "Possible confirmation bias toward bull thesis."
            )
    elif expected_direction in BEARISH_LEANS:
        if divergence < -CONFIRMING_DRIFT_THRESHOLD:
            flag = True
            reason = (
                f"Actual posterior ({actual_posterior:.0%}) is {abs(divergence):.0%} more "
                f"bearish than pre-registered expectation ({expected_posterior:.0%}). "
                "Possible confirmation bias toward bear thesis."
            )
    elif abs(divergence) > UNDIRECTED_DRIFT_THRESHOLD:
        flag = True
        reason = (
            f"Actual posterior ({actual_posterior:.0%}) diverged {divergence:+.0%} from "
            f"expectation ({expected_posterior:.0%}). Large unexplained divergence."
        )

    return Comparison(
        expected_posterior=expected_posterior,
        actual_posterior=actual_posterior,
        divergence=divergence,
        motivated_reasoning_flag=flag,
        reason=reason,
    )
