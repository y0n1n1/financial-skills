"""
Piotroski F-Score Calculator for TFG
9-point earnings quality score from 10-K data.
Directly feeds the fundamentals lens with a standardized, comparable metric.

Score 0-3: weak (high risk of future underperformance)
Score 4-6: moderate
Score 7-9: strong (historically outperforms)

Usage:
  python3 piotroski_fscore.py --ticker NVDA \
    --roa-current 0.65 --roa-prior 0.55 \
    --cfo-current 97 --net-income-current 73 \
    --ltd-ratio-current 0.07 --ltd-ratio-prior 0.08 \
    --current-ratio-current 3.91 --current-ratio-prior 3.50 \
    --shares-current 24400 --shares-prior 24500 \
    --gross-margin-current 0.75 --gross-margin-prior 0.73 \
    --asset-turnover-current 2.23 --asset-turnover-prior 1.85 \
    --revenue-current 215.9 --total-assets-current 96.8
"""

import argparse
import json


import argparse
import json
from dataclasses import asdict

from _tfg_path import ensure_tfg_core_importable

ensure_tfg_core_importable()

from tfg_core.fundamentals import compute_fscore as _compute_fscore


def compute_fscore(**kwargs) -> dict:
    """Backwards-compatible wrapper: returns the legacy dict shape."""
    return asdict(_compute_fscore(**kwargs))


def print_fscore(results: dict, ticker: str):
    total = results["total_score"]

    if total >= 7:
        color = '\033[92m'
        label = "STRONG"
    elif total >= 4:
        color = '\033[93m'
        label = "MODERATE"
    else:
        color = '\033[91m'
        label = "WEAK"
    reset = '\033[0m'

    print(f"\n{'='*55}")
    print(f"  PIOTROSKI F-SCORE — {ticker}")
    print(f"{'='*55}")
    print(f"\n  Score: {color}{total}/9 ({label}){reset}\n")
    print(f"  Profitability: {results['profitability_score']}/4")
    print(f"  Leverage:      {results['leverage_score']}/3")
    print(f"  Efficiency:    {results['efficiency_score']}/2")
    print(f"  Accruals:      {results['accruals_ratio']:+.2f} ({'low — good' if results['accruals_ratio'] < 0.1 else 'elevated — watch'})")
    print()

    for s in results["signals"]:
        check = '\033[92m+' if s["score"] else '\033[91m-'
        print(f"  {check}{reset} {s['name']:<30} {s['detail']}")

    print(f"\n{'='*55}\n")


def main():
    parser = argparse.ArgumentParser(description="Piotroski F-Score for TFG")
    parser.add_argument("--ticker", default="NVDA")
    parser.add_argument("--roa-current", type=float, required=True)
    parser.add_argument("--roa-prior", type=float, required=True)
    parser.add_argument("--cfo-current", type=float, required=True)
    parser.add_argument("--net-income-current", type=float, required=True)
    parser.add_argument("--ltd-ratio-current", type=float, required=True)
    parser.add_argument("--ltd-ratio-prior", type=float, required=True)
    parser.add_argument("--current-ratio-current", type=float, required=True)
    parser.add_argument("--current-ratio-prior", type=float, required=True)
    parser.add_argument("--shares-current", type=float, required=True)
    parser.add_argument("--shares-prior", type=float, required=True)
    parser.add_argument("--gross-margin-current", type=float, required=True)
    parser.add_argument("--gross-margin-prior", type=float, required=True)
    parser.add_argument("--asset-turnover-current", type=float, required=True)
    parser.add_argument("--asset-turnover-prior", type=float, required=True)
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()

    results = compute_fscore(
        roa_current=args.roa_current,
        roa_prior=args.roa_prior,
        cfo_current=args.cfo_current,
        net_income_current=args.net_income_current,
        ltd_ratio_current=args.ltd_ratio_current,
        ltd_ratio_prior=args.ltd_ratio_prior,
        current_ratio_current=args.current_ratio_current,
        current_ratio_prior=args.current_ratio_prior,
        shares_current=args.shares_current,
        shares_prior=args.shares_prior,
        gross_margin_current=args.gross_margin_current,
        gross_margin_prior=args.gross_margin_prior,
        asset_turnover_current=args.asset_turnover_current,
        asset_turnover_prior=args.asset_turnover_prior,
    )

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print_fscore(results, args.ticker)


if __name__ == "__main__":
    main()
