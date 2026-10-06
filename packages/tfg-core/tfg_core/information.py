"""Shannon information content of evidence, in bits.

Information is surprise. Evidence consistent with every competing hypothesis
eliminates nothing and carries zero bits, however dramatic it sounds. Evidence
consistent with exactly one hypothesis eliminates the rest and is maximally
informative.

The practical consequence, per ``theory/information-content.md``: ten pieces of
0.2-bit evidence are worth less than one piece of 2.0-bit evidence, and are less
reliable besides, because noise accumulates with every piece gathered.

Information content and likelihood ratios are different quantities measured in
different units. ``theory/bayesian-engine.md`` forbids comparing or combining
them: IC decides what *enters* the chain, LR decides what it *does* once there.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum


class Band(str, Enum):
    """Qualitative label for an IC score."""

    ZERO = "ZERO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


#: Lower bound of each band, in bits, highest first.
BAND_THRESHOLDS: tuple[tuple[float, Band], ...] = (
    (1.5, Band.CRITICAL),
    (1.0, Band.HIGH),
    (0.5, Band.MEDIUM),
    (0.0001, Band.LOW),
    (0.0, Band.ZERO),
)

#: Minimum IC, in bits, for evidence to enter the Bayesian chain at all.
CHAIN_ADMISSION_THRESHOLD = 0.5

#: Minimum IC, in bits, for evidence to meaningfully move the posterior.
MATERIAL_THRESHOLD = 1.0


@dataclass(frozen=True, slots=True)
class Evidence:
    """One row of an ACH matrix, scored for information content."""

    label: str
    n_hypotheses: int
    n_consistent: int
    bits: float
    band: str
    admissible: bool
    material: bool


def information_content(n_hypotheses: int, n_consistent: int) -> float:
    """IC = log2(N_hypotheses / N_consistent), in bits.

    Consistency with every hypothesis gives exactly 0 bits. Consistency with
    none is treated as the maximum the matrix can express rather than infinity:
    evidence that refutes every hypothesis under consideration means the
    hypothesis set is incomplete, which is a modelling problem, not infinite
    information.
    """
    if n_hypotheses <= 0:
        raise ValueError("n_hypotheses must be positive")
    if n_consistent <= 0:
        return math.log2(n_hypotheses)
    if n_consistent > n_hypotheses:
        raise ValueError("n_consistent cannot exceed n_hypotheses")
    return math.log2(n_hypotheses / n_consistent)


def band_for(bits: float) -> Band:
    """Map a bit count onto its qualitative band."""
    for threshold, band in BAND_THRESHOLDS:
        if bits >= threshold:
            return band
    return Band.ZERO


def score(label: str, n_hypotheses: int, n_consistent: int) -> Evidence:
    """Score one piece of evidence and decide whether it may enter the chain."""
    bits = information_content(n_hypotheses, n_consistent)
    return Evidence(
        label=label,
        n_hypotheses=n_hypotheses,
        n_consistent=n_consistent,
        bits=bits,
        band=band_for(bits).value,
        admissible=bits > CHAIN_ADMISSION_THRESHOLD,
        material=bits > MATERIAL_THRESHOLD,
    )


def entropy(probabilities: list[float]) -> float:
    """Shannon entropy of a hypothesis distribution, in bits.

    The uncertainty remaining across competing hypotheses. Maximal when they are
    equiprobable, zero once one is certain — so the drop in entropy across an
    analysis is how much it actually learned.
    """
    total = 0.0
    for p in probabilities:
        if p > 0:
            total -= p * math.log2(p)
    return total


def entropy_reduction(prior: list[float], posterior: list[float]) -> float:
    """Bits of uncertainty eliminated between two hypothesis distributions.

    Negative means the analysis left the field *more* uncertain than it started,
    which is a legitimate finding and worth surfacing rather than hiding.
    """
    return entropy(prior) - entropy(posterior)
