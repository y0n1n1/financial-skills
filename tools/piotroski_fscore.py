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


def compute_fscore(
    roa_current: float,
    roa_prior: float,
    cfo_current: float,          # operating cash flow ($B)
    net_income_current: float,   # net income ($B)
    ltd_ratio_current: float,    # long-term debt / total assets
    ltd_ratio_prior: float,
    current_ratio_current: float,
    current_ratio_prior: float,
    shares_current: float,       # shares outstanding (M)
    shares_prior: float,
    gross_margin_current: float,
    gross_margin_prior: float,
    asset_turnover_current: float,  # revenue / total assets
    asset_turnover_prior: float,
) -> dict:
    """Compute Piotroski F-Score (0-9)."""

    signals = []

    # === PROFITABILITY (4 signals) ===

    # 1. ROA > 0
    s1 = 1 if roa_current > 0 else 0
    signals.append({
        "name": "ROA positive",
        "category": "Profitability",
        "score": s1,
        "detail": f"ROA = {roa_current:.2%} {'> 0' if s1 else '<= 0'}",
    })

    # 2. CFO > 0
    s2 = 1 if cfo_current > 0 else 0
    signals.append({
        "name": "CFO positive",
        "category": "Profitability",
        "score": s2,
        "detail": f"CFO = ${cfo_current:.1f}B {'> 0' if s2 else '<= 0'}",
    })

    # 3. ROA improving
    s3 = 1 if roa_current > roa_prior else 0
    signals.append({
        "name": "ROA improving",
        "category": "Profitability",
        "score": s3,
        "detail": f"ROA {roa_current:.2%} vs prior {roa_prior:.2%}",
    })

    # 4. CFO > Net Income (earnings quality — cash > accruals)
    s4 = 1 if cfo_current > net_income_current else 0
    signals.append({
        "name": "CFO > Net Income (quality)",
        "category": "Profitability",
        "score": s4,
        "detail": f"CFO ${cfo_current:.1f}B vs NI ${net_income_current:.1f}B — accruals {'low' if s4 else 'high'}",
    })

    # === LEVERAGE (3 signals) ===

    # 5. Debt ratio declining
    s5 = 1 if ltd_ratio_current < ltd_ratio_prior else 0
    signals.append({
        "name": "Debt ratio declining",
        "category": "Leverage",
        "score": s5,
        "detail": f"LTD/Assets {ltd_ratio_current:.3f} vs prior {ltd_ratio_prior:.3f}",
    })

    # 6. Current ratio improving
    s6 = 1 if current_ratio_current > current_ratio_prior else 0
    signals.append({
        "name": "Current ratio improving",
        "category": "Leverage",
        "score": s6,
        "detail": f"Current ratio {current_ratio_current:.2f} vs prior {current_ratio_prior:.2f}",
    })

    # 7. No share dilution
    s7 = 1 if shares_current <= shares_prior else 0
    signals.append({
        "name": "No dilution",
        "category": "Leverage",
        "score": s7,
        "detail": f"Shares {shares_current:.0f}M vs prior {shares_prior:.0f}M",
    })

    # === EFFICIENCY (2 signals) ===

    # 8. Gross margin improving
    s8 = 1 if gross_margin_current > gross_margin_prior else 0
    signals.append({
        "name": "Gross margin improving",
        "category": "Efficiency",
        "score": s8,
        "detail": f"GM {gross_margin_current:.1%} vs prior {gross_margin_prior:.1%}",
    })

    # 9. Asset turnover improving
    s9 = 1 if asset_turnover_current > asset_turnover_prior else 0
    signals.append({
        "name": "Asset turnover improving",
        "category": "Efficiency",
        "score": s9,
        "detail": f"AT {asset_turnover_current:.2f} vs prior {asset_turnover_prior:.2f}",
    })

    total = sum(s["score"] for s in signals)

    # Accruals ratio (supplementary)
    accruals = (net_income_current - cfo_current) / max(1, net_income_current)

    quality = "STRONG" if total >= 7 else "MODERATE" if total >= 4 else "WEAK"

    return {
        "total_score": total,
        "max_score": 9,
        "quality": quality,
        "signals": signals,
        "accruals_ratio": accruals,
        "profitability_score": s1 + s2 + s3 + s4,
        "leverage_score": s5 + s6 + s7,
        "efficiency_score": s8 + s9,
    }


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
