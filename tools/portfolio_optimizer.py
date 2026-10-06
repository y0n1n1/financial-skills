"""
Portfolio Optimizer for TFG v6
Black-Litterman inspired: combines market equilibrium with TFG views
to produce optimal portfolio weights.

Usage:
  python3 portfolio_optimizer.py --tickers NVDA,GOOGL,META --views '-3.9,-8.3,0' --confidences '55,35,20'
  python3 portfolio_optimizer.py --risk-budget --total-risk 15
"""

import argparse
import json
import sys
from dataclasses import asdict

from _tfg_path import ensure_tfg_core_importable

ensure_tfg_core_importable()

from tfg_core.portfolio import black_litterman as _black_litterman

try:
    import numpy as np
    import pandas as pd
    import yfinance as yf
except ImportError:
    print("Install: pip3 install numpy pandas yfinance")
    sys.exit(1)

#: Trading days per year, for annualising a daily covariance matrix.
TRADING_DAYS = 252


def get_covariance_matrix(tickers: list[str], period: str = "1y") -> tuple:
    """Fetch an annualised covariance matrix from historical daily closes.

    This is the adapter boundary: network and pandas live here, never in
    ``tfg_core``, so the allocation maths stays testable without market data.
    """
    returns = {}
    for t in tickers:
        hist = yf.Ticker(t).history(period=period)
        if not hist.empty:
            returns[t] = hist["Close"].pct_change().dropna()

    df = pd.DataFrame(returns).dropna()
    return df.cov() * TRADING_DAYS, df


def black_litterman(
    tickers: list[str],
    market_caps: list[float],
    views: list[float],
    confidences: list[float],
    risk_aversion: float = 2.5,
    tau: float = 0.05,
    period: str = "1y",
) -> dict:
    """Fetch covariance, then delegate to ``tfg_core.portfolio.black_litterman``."""
    cov, _returns = get_covariance_matrix(tickers, period)
    if cov.empty:
        return {"error": "insufficient price data"}

    result = _black_litterman(
        tickers=tickers,
        market_caps=market_caps,
        views=views,
        confidences=confidences,
        sigma=cov.values,
        risk_aversion=risk_aversion,
        tau=tau,
    )
    return asdict(result)


def print_results(results: dict):
    if "error" in results:
        print(f"  Error: {results['error']}")
        return

    tickers = results["tickers"]
    print(f"\n{'='*65}")
    print(f"  BLACK-LITTERMAN PORTFOLIO ALLOCATION")
    print(f"{'='*65}\n")

    print(f"  {'Ticker':<8} {'MktWt':>7} {'View':>7} {'Conf':>6} {'BL Ret':>8} {'BL Wt':>7} {'Risk%':>7}")
    print(f"  {'-'*8} {'-'*7} {'-'*7} {'-'*6} {'-'*8} {'-'*7} {'-'*7}")

    for t in tickers:
        mw = results["market_weights"][t] * 100
        view = results["views_used"][t]
        conf = results["confidences_used"][t]
        blr = results["bl_returns"][t]
        blw = results["bl_weights"][t] * 100
        rc = results["risk_contribution"][t]

        g = '\033[92m'
        r = '\033[91m'
        rst = '\033[0m'
        vc = g if view > 0 else r if view < 0 else ''
        wc = g if blw > mw * 1.2 else r if blw < mw * 0.8 else ''

        print(f"  {t:<8} {mw:>6.1f}% {vc}{view:>+6.1f}%{rst} {conf:>5.0f}% {blr:>+7.2f}% {wc}{blw:>6.1f}%{rst} {rc:>6.1f}%")

    print(f"\n  Portfolio volatility: {results['portfolio_vol']:.1f}% annualized")

    # Check for zero allocations
    zeros = [t for t in tickers if results["bl_weights"][t] < 0.01]
    if zeros:
        print(f"  Zero allocation: {', '.join(zeros)} — BL says don't hold these")

    print()


def main():
    parser = argparse.ArgumentParser(description="Portfolio Optimizer for TFG")
    parser.add_argument("--tickers", required=True)
    parser.add_argument("--views", required=True, help="TFG EV estimates, comma-separated (%)")
    parser.add_argument("--confidences", required=True, help="Confidence per view, comma-separated (0-100)")
    parser.add_argument("--risk-aversion", type=float, default=2.5)
    parser.add_argument("--period", default="1y")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.tickers.split(",")]
    views = [float(v) for v in args.views.split(",")]
    confidences = [float(c) for c in args.confidences.split(",")]

    # Get market caps
    print(f"\n  Fetching data...", flush=True)
    mcaps = []
    for t in tickers:
        info = yf.Ticker(t).info
        mcaps.append(info.get("marketCap", 1e9))

    results = black_litterman(tickers, mcaps, views, confidences,
                               args.risk_aversion, period=args.period)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print_results(results)


if __name__ == "__main__":
    main()
