"""Bayesian updating with confidence intervals carried end to end.

Implements the chain specified by ``theory/bayesian-engine.md``. Three things
distinguish it from a naive odds-form update:

1. **Likelihood ratios carry their own uncertainty.** An ordinal direction maps
   to a central LR *and* a standard deviation, propagated via first-order error
   analysis rather than discarded.
2. **Evidence quality mechanically dampens impact.** A 2.0x LR sourced from a
   management claim is not a 2.0x LR; quality scales the distance from 1.0.
3. **Bias corrections are applied by default.** Inside-view LRs are dampened and
   the final interval is inflated, because the documented failure mode of this
   chain is overconfidence, not underconfidence.

The point estimate is the least interesting output. The interval is the output.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from uncertainties import ufloat

from .constants import (
    INSIDE_VIEW_DAMPENING,
    LR_RANGES,
    OVERCONFIDENCE_INFLATION,
    POSTERIOR_CEILING,
    POSTERIOR_FLOOR,
)

#: Recency decay horizon in days. Evidence older than this contributes nothing.
RECENCY_HORIZON_DAYS = 730

#: Sample size reaching this log10 saturates the sample-quality dimension.
SAMPLE_LOG_SATURATION = 2

#: Quality credit for non-primary (second-hand) sourcing.
SECONDARY_SOURCE_PENALTY = 0.5

#: Quality assumed when an update does not declare one.
DEFAULT_QUALITY = 0.7


@dataclass(frozen=True, slots=True)
class Update:
    """One piece of evidence entering the chain."""

    direction: str
    quality: float = DEFAULT_QUALITY
    label: str = ""


@dataclass(frozen=True, slots=True)
class ChainStep:
    """The posterior after one update, with the LRs that produced it.

    Three LRs are kept rather than one, so the effect of evidence quality is
    separable from the effect of bias correction: ``lr_raw`` is the ordinal
    central estimate, ``lr_quality_adjusted`` applies evidence quality, and
    ``lr_final`` additionally applies inside-view dampening.
    """

    step: int
    label: str
    direction: str
    lr_raw: float
    lr_quality_adjusted: float
    lr_final: float
    quality: float
    posterior_mean: float
    posterior_std: float
    note: str = ""


@dataclass(frozen=True, slots=True)
class Posterior:
    """Final posterior with raw and bias-corrected intervals."""

    mean: float
    std_raw: float
    std_corrected: float
    ci_68: tuple[float, float]
    ci_95: tuple[float, float]

    def crosses(self, boundary: float) -> bool:
        """Whether the 95% interval straddles a decision boundary.

        ``theory/bayesian-engine.md`` requires this to be stated explicitly: a
        posterior whose interval crosses 50% has not resolved the question, and
        reporting its midpoint alone is false precision.
        """
        return self.ci_95[0] <= boundary <= self.ci_95[1]


@dataclass(frozen=True, slots=True)
class ChainResult:
    """Prior, every intermediate step, and the final posterior."""

    prior_mean: float
    prior_std: float
    chain: list[ChainStep]
    posterior: Posterior
    bias_correction_applied: bool


def evidence_quality(
    source_tier: float, days_old: int, sample_n: int, is_primary: bool,
) -> float:
    """Score evidence quality in [0, 1] as the mean of four dimensions.

    ``source_tier`` is 0.3 for a management claim, 0.6 for an analyst estimate,
    1.0 for an audited filing. The remaining dimensions are recency, sample
    size, and whether the source is primary.
    """
    recency = max(0.0, 1 - days_old / RECENCY_HORIZON_DAYS)
    sample = min(1.0, np.log10(max(1, sample_n)) / SAMPLE_LOG_SATURATION)
    independence = 1.0 if is_primary else SECONDARY_SOURCE_PENALTY
    return float(np.mean([source_tier, recency, sample, independence]))


def dampen_lr(raw_lr: float, quality: float) -> float:
    """Scale an LR's distance from 1.0 by evidence quality.

    Quality acts on *impact*, not direction: a 2.0x LR from a quality-0.4 source
    moves the posterior as a 1.4x LR would.
    """
    return 1 + (raw_lr - 1) * quality


def update(prior: float, lr: float) -> float:
    """Single Bayesian update in probability form: P(H|E) = P(H)L / (P(H)L + P(~H)).

    Returns the prior unchanged if the denominator vanishes, which can only
    happen for a zero prior and a zero LR.
    """
    numerator = prior * lr
    denominator = prior * lr + (1 - prior)
    if denominator == 0:
        return prior
    return numerator / denominator


def run_chain(
    prior_mean: float,
    prior_std: float,
    updates: list[Update],
    apply_bias_correction: bool = True,
    overconfidence_factor: float = OVERCONFIDENCE_INFLATION,
    inside_view_dampening: float = INSIDE_VIEW_DAMPENING,
) -> ChainResult:
    """Run the full posterior chain, propagating uncertainty through every step.

    The prior and each LR are uncertain quantities. Because the posterior appears
    on both sides of the update's quotient, correlations between the numerator
    and denominator matter; ``uncertainties`` tracks them, so the interval does
    not spuriously widen.

    AMBIGUOUS evidence is recorded and skipped: by construction it has a 1.0 LR
    and zero spread, so it cannot move either the mean or the interval.

    Posterior means are clamped to [POSTERIOR_FLOOR, POSTERIOR_CEILING] after
    every step — no finite chain of ordinal evidence earns certainty.
    """
    prior = ufloat(prior_mean, prior_std)
    current = prior
    chain: list[ChainStep] = []

    for i, item in enumerate(updates):
        label = item.label or f"Update {i + 1}"
        spec = LR_RANGES.get(item.direction, LR_RANGES["AMBIGUOUS"])

        if spec["std"] == 0:
            chain.append(ChainStep(
                step=i + 1,
                label=label,
                direction=item.direction,
                lr_raw=1.0,
                lr_quality_adjusted=1.0,
                lr_final=1.0,
                quality=item.quality,
                posterior_mean=current.nominal_value,
                posterior_std=current.std_dev,
                note="AMBIGUOUS — no update",
            ))
            continue

        lr_raw = ufloat(spec["central"], spec["std"])
        lr_quality_adjusted = 1 + (lr_raw - 1) * item.quality
        if apply_bias_correction:
            lr_final = 1 + (lr_quality_adjusted - 1) * inside_view_dampening
        else:
            lr_final = lr_quality_adjusted

        posterior = (current * lr_final) / (current * lr_final + (1 - current))
        clamped_mean = max(POSTERIOR_FLOOR, min(POSTERIOR_CEILING, posterior.nominal_value))
        current = ufloat(clamped_mean, posterior.std_dev)

        chain.append(ChainStep(
            step=i + 1,
            label=label,
            direction=item.direction,
            lr_raw=lr_raw.nominal_value,
            lr_quality_adjusted=lr_quality_adjusted.nominal_value,
            lr_final=lr_final.nominal_value,
            quality=item.quality,
            posterior_mean=current.nominal_value,
            posterior_std=current.std_dev,
        ))

    final_mean = current.nominal_value
    std_raw = current.std_dev
    std_corrected = std_raw * overconfidence_factor if apply_bias_correction else std_raw

    return ChainResult(
        prior_mean=prior_mean,
        prior_std=prior_std,
        chain=chain,
        posterior=Posterior(
            mean=final_mean,
            std_raw=std_raw,
            std_corrected=std_corrected,
            ci_68=(
                max(0.0, final_mean - std_corrected),
                min(1.0, final_mean + std_corrected),
            ),
            ci_95=(
                max(0.0, final_mean - 2 * std_corrected),
                min(1.0, final_mean + 2 * std_corrected),
            ),
        ),
        bias_correction_applied=apply_bias_correction,
    )
