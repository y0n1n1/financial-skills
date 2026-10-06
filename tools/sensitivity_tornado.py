"""
Sensitivity / Tornado Chart for TFG
Shows which inputs drive EV the most by perturbing each ±1 std dev.

Usage:
  python3 sensitivity_tornado.py --ticker NVDA --current-mcap 4400 --margin 0.65

Output: Ranked list of inputs by EV impact when perturbed
"""

import argparse
import json
from dataclasses import asdict

from _tfg_path import ensure_tfg_core_importable

ensure_tfg_core_importable()

from tfg_core.ev import deterministic_ev as compute_ev
from tfg_core.sensitivity import run_sensitivity as _run_sensitivity


def run_sensitivity(**kwargs) -> list[dict]:
    """Backwards-compatible wrapper: returns the legacy list-of-dicts shape."""
    return [asdict(item) for item in _run_sensitivity(**kwargs)]


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
