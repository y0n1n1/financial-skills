"""
Options-Implied Scenario Probabilities for TFG
Extracts market-implied probabilities from options data using Black-Scholes.
Replaces subjectively asserted scenario probabilities with market-derived numbers.

Usage:
  python3 options_implied_prob.py --spot 178 --iv 0.39 --rf 0.045 --expiry-years 1.0 \
    --scenarios '130,155,250,360' --labels 'worst,bear,base_top,bull_top'

Output: probability that stock is in each range at expiry
"""

import argparse
import json

from _tfg_path import ensure_tfg_core_importable

ensure_tfg_core_importable()

from tfg_core.options import (
    probability_above as implied_probability_above,
    probability_below as implied_probability_below,
    probability_range as implied_probability_range,
    scenario_probabilities,
)


def compute_scenario_probs(**kwargs) -> tuple[list[dict], float]:
    """Backwards-compatible wrapper: returns (legacy scenario dicts, EV)."""
    result = scenario_probabilities(**kwargs)
    return result.as_dicts(), result.ev


def print_results(scenarios: list[dict], ev: float, spot: float, iv: float, ticker: str):
    print(f"\n{'='*60}")
    print(f"  OPTIONS-IMPLIED PROBABILITIES — {ticker}")
    print(f"  Spot: ${spot:.2f} | IV: {iv:.1%} | 12-month horizon")
    print(f"{'='*60}\n")

    print(f"  {'Scenario':<20} {'Range':<18} {'Prob':>8} {'Return':>10}")
    print(f"  {'-'*20} {'-'*18} {'-'*8} {'-'*10}")

    for s in scenarios:
        p = s['probability']
        r = s['return']
        color = '\033[92m' if r > 0 else '\033[91m'
        reset = '\033[0m'
        print(f"  {s['label']:<20} {s['range']:<18} {p:>7.1%} {color}{r:>+9.1%}{reset}")

    print(f"\n  Market-implied EV: {ev:+.1%}")
    print(f"  P(positive return): {sum(s['probability'] for s in scenarios if s['return'] > 0):.1%}")
    print(f"  P(negative return): {sum(s['probability'] for s in scenarios if s['return'] < 0):.1%}")

    print(f"\n  USE: Compare these probabilities against your model's scenario weights.")
    print(f"  If your model says Bull=35% but options say Bull=12%, you're claiming")
    print(f"  to know something the market doesn't. Articulate what or adjust.\n")


def main():
    parser = argparse.ArgumentParser(description="Options-implied probabilities for TFG")
    parser.add_argument("--ticker", default="NVDA")
    parser.add_argument("--spot", type=float, required=True, help="Current stock price")
    parser.add_argument("--iv", type=float, required=True, help="Implied volatility (annualized, as decimal)")
    parser.add_argument("--rf", type=float, default=0.045, help="Risk-free rate")
    parser.add_argument("--expiry-years", type=float, default=1.0, help="Time horizon in years")
    parser.add_argument("--scenarios", required=True, help="Comma-separated price boundaries")
    parser.add_argument("--labels", default="", help="Comma-separated scenario labels")
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()

    boundaries = [float(x) for x in args.scenarios.split(",")]
    labels = args.labels.split(",") if args.labels else []

    scenarios, ev = compute_scenario_probs(
        spot=args.spot,
        iv=args.iv,
        rf=args.rf,
        expiry_years=args.expiry_years,
        scenario_boundaries=boundaries,
        scenario_labels=labels,
    )

    if args.json:
        print(json.dumps({"scenarios": scenarios, "ev": ev}, indent=2))
    else:
        print_results(scenarios, ev, args.spot, args.iv, args.ticker)


if __name__ == "__main__":
    main()
