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
from dataclasses import asdict

from _tfg_path import ensure_tfg_core_importable

ensure_tfg_core_importable()

from tfg_core.bayes import (
    Update,
    dampen_lr as adjust_lr_by_quality,
    evidence_quality as evidence_quality_score,
    run_chain as _run_chain,
    update as bayesian_update,
)
from tfg_core.constants import (
    INSIDE_VIEW_DAMPENING,
    LR_RANGES,
    OVERCONFIDENCE_INFLATION,
)


def run_chain(prior_mean: float, prior_std: float, updates: list[dict], **kwargs) -> dict:
    """Backwards-compatible wrapper: returns the legacy nested dict shape.

    The AMBIGUOUS branch now reports ``lr_quality_adjusted``/``lr_final`` like
    every other step, instead of the legacy ``lr_adjusted``. The rendered table
    is unchanged; only ``--json`` sees the normalised key.
    """
    result = _run_chain(
        prior_mean=prior_mean,
        prior_std=prior_std,
        updates=[
            Update(
                direction=u["direction"],
                quality=u.get("quality", 0.7),
                label=u.get("label", ""),
            )
            for u in updates
        ],
        **kwargs,
    )
    chain = []
    for step in result.chain:
        entry = asdict(step)
        if not entry["note"]:
            del entry["note"]
        chain.append(entry)
    return {
        "prior": {"mean": result.prior_mean, "std": result.prior_std},
        "chain": chain,
        "posterior": {
            "mean": result.posterior.mean,
            "std_raw": result.posterior.std_raw,
            "std_corrected": result.posterior.std_corrected,
            "ci_68": list(result.posterior.ci_68),
            "ci_95": list(result.posterior.ci_95),
        },
        "bias_correction_applied": result.bias_correction_applied,
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
