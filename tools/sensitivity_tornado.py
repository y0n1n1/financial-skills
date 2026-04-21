"""
Sensitivity / Tornado Chart for TFG
Shows which inputs drive EV the most by perturbing each ±1 std dev.

Usage:
  python3 sensitivity_tornado.py --ticker NVDA --current-mcap 4400 --margin 0.65

Output: Ranked list of inputs by EV impact when perturbed
"""

import numpy as np
import json
import argparse


def compute_ev(
    current_mcap: float,
    revenue_scenarios: list[float],
    revenue_probs: list[float],
    multiple_scenarios: list[float],
    multiple_probs: list[float],
    margin: float,
) -> float:
    """Compute deterministic EV from the matrix."""
    ev = 0
    for i, (rev, rp) in enumerate(zip(revenue_scenarios, revenue_probs)):
        for j, (mult, mp) in enumerate(zip(multiple_scenarios, multiple_probs)):
            implied_mcap = rev * margin * mult
            ret = (implied_mcap - current_mcap) / current_mcap
            ev += rp * mp * ret
    return ev


def run_sensitivity(
    current_mcap: float,
    revenue_scenarios: list[float],
    revenue_probs: list[float],
    revenue_stds: list[float],
    multiple_scenarios: list[float],
    multiple_probs: list[float],
    margin: float,
) -> list[dict]:
    """
    Perturb each input by ±1 std dev and measure EV impact.
    Returns sorted list of sensitivities.
    """
    base_ev = compute_ev(current_mcap, revenue_scenarios, revenue_probs,
                          multiple_scenarios, multiple_probs, margin)

    sensitivities = []

    # Perturb each revenue scenario
    for i, (rev, std) in enumerate(zip(revenue_scenarios, revenue_stds)):
        # High perturbation
        rev_high = revenue_scenarios.copy()
        rev_high[i] = rev + std
        ev_high = compute_ev(current_mcap, rev_high, revenue_probs,
                              multiple_scenarios, multiple_probs, margin)

        # Low perturbation
        rev_low = revenue_scenarios.copy()
        rev_low[i] = rev - std
        ev_low = compute_ev(current_mcap, rev_low, revenue_probs,
                             multiple_scenarios, multiple_probs, margin)

        sensitivities.append({
            "parameter": f"Revenue scenario {i+1} (${rev}B ± ${std}B)",
            "ev_low": ev_low,
            "ev_high": ev_high,
            "ev_swing": ev_high - ev_low,
            "base_ev": base_ev,
        })

    # Perturb each multiple probability by ±10pp (redistributed)
    for i in range(len(multiple_probs)):
        shift = 0.10
        labels = ["Bull", "Current", "Bear", "Crash", "Extra1", "Extra2"][: len(multiple_probs)]

        # Shift 10pp TO this multiple from others
        probs_high = multiple_probs.copy()
        probs_high[i] = min(probs_high[i] + shift, 0.95)
        # Redistribute the shift proportionally from others
        remaining = 1.0 - probs_high[i]
        other_sum = sum(probs_high[j] for j in range(len(probs_high)) if j != i)
        if other_sum > 0:
            for j in range(len(probs_high)):
                if j != i:
                    probs_high[j] = probs_high[j] * remaining / other_sum

        ev_high = compute_ev(current_mcap, revenue_scenarios, revenue_probs,
                              multiple_scenarios, probs_high, margin)

        # Shift 10pp AWAY from this multiple
        probs_low = multiple_probs.copy()
        probs_low[i] = max(probs_low[i] - shift, 0.05)
        remaining = 1.0 - probs_low[i]
        other_sum = sum(probs_low[j] for j in range(len(probs_low)) if j != i)
        if other_sum > 0:
            for j in range(len(probs_low)):
                if j != i:
                    probs_low[j] = probs_low[j] * remaining / other_sum

        ev_low = compute_ev(current_mcap, revenue_scenarios, revenue_probs,
                             multiple_scenarios, probs_low, margin)

        sensitivities.append({
            "parameter": f"{labels[i]} multiple prob ({multiple_probs[i]:.0%} ± 10pp)",
            "ev_low": ev_low,
            "ev_high": ev_high,
            "ev_swing": abs(ev_high - ev_low),
            "base_ev": base_ev,
        })

    # Perturb each revenue probability by ±10pp
    rev_labels = [f"${r}B" for r in revenue_scenarios]
    for i in range(len(revenue_probs)):
        shift = 0.10

        probs_high = revenue_probs.copy()
        probs_high[i] = min(probs_high[i] + shift, 0.95)
        remaining = 1.0 - probs_high[i]
        other_sum = sum(probs_high[j] for j in range(len(probs_high)) if j != i)
        if other_sum > 0:
            for j in range(len(probs_high)):
                if j != i:
                    probs_high[j] = probs_high[j] * remaining / other_sum

        ev_high = compute_ev(current_mcap, revenue_scenarios, probs_high,
                              multiple_scenarios, multiple_probs, margin)

        probs_low = revenue_probs.copy()
        probs_low[i] = max(probs_low[i] - shift, 0.05)
        remaining = 1.0 - probs_low[i]
        other_sum = sum(probs_low[j] for j in range(len(probs_low)) if j != i)
        if other_sum > 0:
            for j in range(len(probs_low)):
                if j != i:
                    probs_low[j] = probs_low[j] * remaining / other_sum

        ev_low = compute_ev(current_mcap, revenue_scenarios, probs_low,
                             multiple_scenarios, multiple_probs, margin)

        sensitivities.append({
            "parameter": f"Revenue {rev_labels[i]} prob ({revenue_probs[i]:.0%} ± 10pp)",
            "ev_low": ev_low,
            "ev_high": ev_high,
            "ev_swing": abs(ev_high - ev_low),
            "base_ev": base_ev,
        })

    # Perturb margin
    ev_high_m = compute_ev(current_mcap, revenue_scenarios, revenue_probs,
                            multiple_scenarios, multiple_probs, margin + 0.05)
    ev_low_m = compute_ev(current_mcap, revenue_scenarios, revenue_probs,
                           multiple_scenarios, multiple_probs, margin - 0.05)
    sensitivities.append({
        "parameter": f"Net margin ({margin:.0%} ± 5pp)",
        "ev_low": ev_low_m,
        "ev_high": ev_high_m,
        "ev_swing": abs(ev_high_m - ev_low_m),
        "base_ev": base_ev,
    })

    # Sort by swing magnitude
    sensitivities.sort(key=lambda x: x["ev_swing"], reverse=True)
    return sensitivities


def print_tornado(sensitivities: list[dict], ticker: str):
    print(f"\n{'='*70}")
    print(f"  SENSITIVITY TORNADO — {ticker}")
    print(f"  Base EV: {sensitivities[0]['base_ev']:+.1%}")
    print(f"{'='*70}\n")

    print(f"  {'Parameter':<45} {'EV Swing':>10} {'Low':>8} {'High':>8}")
    print(f"  {'-'*45} {'-'*10} {'-'*8} {'-'*8}")

    for s in sensitivities:
        swing = s['ev_swing']
        color = '\033[91m' if swing > 0.05 else '\033[93m' if swing > 0.02 else '\033[0m'
        reset = '\033[0m'
        print(f"  {s['parameter']:<45} {color}{swing:>9.1%}{reset} {s['ev_low']:>+7.1%} {s['ev_high']:>+7.1%}")

    print(f"\n  TOP DRIVER: {sensitivities[0]['parameter']}")
    print(f"  This input alone swings EV by {sensitivities[0]['ev_swing']:.1%}")
    print(f"  → Highest research priority for reducing uncertainty\n")


def main():
    parser = argparse.ArgumentParser(description="Sensitivity tornado for TFG")
    parser.add_argument("--ticker", required=True)
    parser.add_argument("--current-mcap", type=float, required=True)
    parser.add_argument("--revenue-scenarios", required=True)
    parser.add_argument("--revenue-probs", required=True)
    parser.add_argument("--revenue-stds", required=True)
    parser.add_argument("--multiple-scenarios", required=True)
    parser.add_argument("--multiple-probs", required=True)
    parser.add_argument("--margin", type=float, default=0.65)
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()

    sensitivities = run_sensitivity(
        current_mcap=args.current_mcap,
        revenue_scenarios=[float(x) for x in args.revenue_scenarios.split(",")],
        revenue_probs=[float(x) for x in args.revenue_probs.split(",")],
        revenue_stds=[float(x) for x in args.revenue_stds.split(",")],
        multiple_scenarios=[float(x) for x in args.multiple_scenarios.split(",")],
        multiple_probs=[float(x) for x in args.multiple_probs.split(",")],
        margin=args.margin,
    )

    if args.json:
        print(json.dumps(sensitivities, indent=2))
    else:
        print_tornado(sensitivities, args.ticker)


if __name__ == "__main__":
    main()
