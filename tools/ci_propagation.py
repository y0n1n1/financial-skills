"""
Confidence Interval Propagation for TFG
Converts every point estimate to a range using the uncertainties library.
The posterior chain carries uncertainty bounds from prior through every update.

Usage:
  python3 ci_propagation.py --prior 0.40 --prior-std 0.08 \
    --updates 'STRONG_FOR:0.9,STRONG_AGAINST:0.85,MODERATE_FOR:0.7,MODERATE_AGAINST:0.75,MODERATE_AGAINST:0.7'

  Update format: DIRECTION:evidence_quality_score
  Quality score (0-1) controls how much the LR is dampened.
"""

import argparse
import json
import numpy as np
from uncertainties import ufloat
from uncertainties.umath import log, exp


# Ordinal LR ranges — central estimate + uncertainty
# These are the multipliers from the bayesian engine
LR_RANGES = {
    "STRONG_FOR":       {"central": 1.40, "std": 0.15},
    "MODERATE_FOR":     {"central": 1.15, "std": 0.10},
    "WEAK_FOR":         {"central": 1.05, "std": 0.05},
    "AMBIGUOUS":        {"central": 1.00, "std": 0.00},
    "WEAK_AGAINST":     {"central": 0.95, "std": 0.05},
    "MODERATE_AGAINST": {"central": 0.85, "std": 0.10},
    "STRONG_AGAINST":   {"central": 0.60, "std": 0.15},
}

# Bias corrections (applied by default, removable with --no-bias-correction)
OVERCONFIDENCE_INFLATION = 1.5  # inflate CIs by 1.5x
INSIDE_VIEW_DAMPENING = 0.6    # dampen inside-view LRs by 40%


def evidence_quality_score(source_tier: float, days_old: int, sample_n: int, is_primary: bool) -> float:
    """
    Compute evidence quality on 4 dimensions.
    source_tier: 0.3 (management claim), 0.6 (analyst estimate), 1.0 (audited filing)
    """
    recency = max(0, 1 - days_old / 730)  # decay over 2 years
    sample = min(1, np.log10(max(1, sample_n)) / 2)
    independence = 1.0 if is_primary else 0.5
    return float(np.mean([source_tier, recency, sample, independence]))


def adjust_lr_by_quality(raw_lr: float, quality: float) -> float:
    """
    Evidence quality mechanically scales LR impact.
    LR of 2.0x from quality 0.4 source → 1.4x
    LR of 2.0x from quality 0.9 source → 1.9x
    """
    return 1 + (raw_lr - 1) * quality


def bayesian_update(prior: float, lr: float) -> float:
    """Single Bayesian update: P(H|E) = P(H) * LR / (P(H) * LR + P(~H))"""
    numerator = prior * lr
    denominator = prior * lr + (1 - prior)
    if denominator == 0:
        return prior
    return numerator / denominator


def run_chain(
    prior_mean: float,
    prior_std: float,
    updates: list[dict],
    apply_bias_correction: bool = True,
    overconfidence_factor: float = OVERCONFIDENCE_INFLATION,
    inside_view_dampening: float = INSIDE_VIEW_DAMPENING,
) -> dict:
    """
    Run the full posterior chain with CI propagation.

    updates: list of {"direction": str, "quality": float, "label": str}
    """
    # Build uncertain prior
    prior = ufloat(prior_mean, prior_std)

    chain = []
    current = prior

    for i, update in enumerate(updates):
        direction = update["direction"]
        quality = update.get("quality", 0.7)
        label = update.get("label", f"Update {i+1}")

        # Get base LR from ordinal category
        lr_spec = LR_RANGES.get(direction, LR_RANGES["AMBIGUOUS"])
        if lr_spec["std"] == 0:
            # AMBIGUOUS — no update
            chain.append({
                "step": i + 1,
                "label": label,
                "direction": direction,
                "lr_raw": 1.0,
                "lr_adjusted": 1.0,
                "quality": quality,
                "posterior_mean": current.nominal_value,
                "posterior_std": current.std_dev,
                "note": "AMBIGUOUS — no update",
            })
            continue

        # Build uncertain LR
        lr_raw = ufloat(lr_spec["central"], lr_spec["std"])

        # Apply quality adjustment
        lr_quality_adjusted = 1 + (lr_raw - 1) * quality

        # Apply inside-view dampening if bias correction enabled
        if apply_bias_correction:
            lr_final = 1 + (lr_quality_adjusted - 1) * inside_view_dampening
        else:
            lr_final = lr_quality_adjusted

        # Bayesian update with uncertainty
        numerator = current * lr_final
        denominator = current * lr_final + (1 - current)
        new_posterior = numerator / denominator

        # Clamp to [0.05, 0.95]
        mean_clamped = max(0.05, min(0.95, new_posterior.nominal_value))
        new_posterior = ufloat(mean_clamped, new_posterior.std_dev)

        current = new_posterior

        chain.append({
            "step": i + 1,
            "label": label,
            "direction": direction,
            "lr_raw": lr_raw.nominal_value,
            "lr_quality_adjusted": lr_quality_adjusted.nominal_value,
            "lr_final": lr_final.nominal_value if hasattr(lr_final, 'nominal_value') else float(lr_final),
            "quality": quality,
            "posterior_mean": current.nominal_value,
            "posterior_std": current.std_dev,
        })

    # Apply overconfidence inflation to final CI
    final_mean = current.nominal_value
    final_std = current.std_dev
    if apply_bias_correction:
        final_std *= overconfidence_factor

    # Compute CI
    ci_68 = (final_mean - final_std, final_mean + final_std)
    ci_95 = (final_mean - 2 * final_std, final_mean + 2 * final_std)

    return {
        "prior": {"mean": prior_mean, "std": prior_std},
        "chain": chain,
        "posterior": {
            "mean": final_mean,
            "std_raw": current.std_dev,
            "std_corrected": final_std,
            "ci_68": [max(0, ci_68[0]), min(1, ci_68[1])],
            "ci_95": [max(0, ci_95[0]), min(1, ci_95[1])],
        },
        "bias_correction_applied": apply_bias_correction,
    }


def print_chain(results: dict, ticker: str):
    print(f"\n{'='*65}")
    print(f"  CI PROPAGATION — {ticker}")
    print(f"  Prior: {results['prior']['mean']:.1%} +/- {results['prior']['std']:.1%}")
    if results['bias_correction_applied']:
        print(f"  Bias corrections: ON (overconfidence 1.5x, inside-view 0.6x)")
    print(f"{'='*65}\n")

    print(f"  {'Step':<4} {'Label':<35} {'Dir':<12} {'Q':>4} {'LR':>6} {'Post':>8} {'±':>6}")
    print(f"  {'-'*4} {'-'*35} {'-'*12} {'-'*4} {'-'*6} {'-'*8} {'-'*6}")

    for step in results['chain']:
        lr_str = f"{step.get('lr_final', step.get('lr_raw', 1.0)):.2f}"
        post = step['posterior_mean']
        std = step['posterior_std']
        print(f"  {step['step']:<4} {step['label']:<35} {step['direction']:<12} {step['quality']:>4.1f} {lr_str:>6} {post:>7.1%} {std:>5.1%}")

    p = results['posterior']
    print(f"\n  {'='*65}")
    print(f"  FINAL POSTERIOR: {p['mean']:.1%} +/- {p['std_corrected']:.1%}")
    print(f"  68% CI: [{p['ci_68'][0]:.1%}, {p['ci_68'][1]:.1%}]")
    print(f"  95% CI: [{p['ci_95'][0]:.1%}, {p['ci_95'][1]:.1%}]")

    if p['ci_95'][0] < 0.5 and p['ci_95'][1] > 0.5:
        print(f"\n  NOTE: 95% CI CROSSES 50% — uncertainty is too high to call direction")
    elif p['mean'] < 0.5:
        print(f"\n  DIRECTION: AGAINST profitable trade (posterior < 50%)")
    else:
        print(f"\n  DIRECTION: FOR profitable trade (posterior > 50%)")

    print(f"{'='*65}\n")


def main():
    parser = argparse.ArgumentParser(description="CI Propagation for TFG")
    parser.add_argument("--ticker", default="NVDA")
    parser.add_argument("--prior", type=float, required=True, help="Prior mean (0-1)")
    parser.add_argument("--prior-std", type=float, required=True, help="Prior std dev")
    parser.add_argument("--updates", required=True,
                        help="Comma-separated updates in format DIRECTION:quality:label")
    parser.add_argument("--no-bias-correction", action="store_true")
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()

    updates = []
    for item in args.updates.split(","):
        parts = item.strip().split(":")
        direction = parts[0]
        quality = float(parts[1]) if len(parts) > 1 else 0.7
        label = parts[2] if len(parts) > 2 else direction
        updates.append({"direction": direction, "quality": quality, "label": label})

    results = run_chain(
        prior_mean=args.prior,
        prior_std=args.prior_std,
        updates=updates,
        apply_bias_correction=not args.no_bias_correction,
    )

    if args.json:
        print(json.dumps(results, indent=2, default=str))
    else:
        print_chain(results, args.ticker)


if __name__ == "__main__":
    main()
