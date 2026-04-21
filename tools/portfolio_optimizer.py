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

try:
    import numpy as np
    import yfinance as yf
    import pandas as pd
except ImportError:
    print("Install: pip3 install numpy yfinance pandas")
    sys.exit(1)


def get_covariance_matrix(tickers: list[str], period: str = "1y") -> tuple:
    """Get annualized covariance matrix from historical returns."""
    returns = {}
    for t in tickers:
        hist = yf.Ticker(t).history(period=period)
        if not hist.empty:
            returns[t] = hist["Close"].pct_change().dropna()

    df = pd.DataFrame(returns).dropna()
    cov_annual = df.cov() * 252
    return cov_annual, df


def black_litterman(
    tickers: list[str],
    market_caps: list[float],
    views: list[float],      # TFG EV estimates (%)
    confidences: list[float], # 0-100, how confident in each view
    risk_aversion: float = 2.5,
    tau: float = 0.05,
    period: str = "1y",
) -> dict:
    """
    Simplified Black-Litterman allocation.

    market_caps: used to derive equilibrium weights
    views: TFG expected returns (from Monte Carlo EV)
    confidences: TFG conviction mapped to view certainty
    """
    n = len(tickers)
    cov, returns_df = get_covariance_matrix(tickers, period)

    if cov.empty:
        return {"error": "insufficient price data"}

    sigma = cov.values

    # Market cap weights (equilibrium)
    total_cap = sum(market_caps)
    w_mkt = np.array([mc / total_cap for mc in market_caps])

    # Implied equilibrium returns
    pi = risk_aversion * sigma @ w_mkt

    # Views matrix (P) — identity for absolute views on each stock
    P = np.eye(n)

    # View returns (Q)
    Q = np.array([v / 100 for v in views])

    # Omega — uncertainty in views (diagonal, from confidences)
    # Higher confidence = lower uncertainty = tighter omega
    omega_diag = []
    for i, conf in enumerate(confidences):
        # Map confidence 0-100 to omega
        # conf 100% → omega ≈ 0 (fully trust view)
        # conf 0% → omega = tau * sigma[i][i] (fully trust market)
        uncertainty = 1.0 - (conf / 100.0)
        omega_diag.append(max(0.0001, uncertainty * tau * sigma[i][i]))
    omega = np.diag(omega_diag)

    # BL posterior expected returns
    # E[R] = [(tau*sigma)^-1 + P'*omega^-1*P]^-1 * [(tau*sigma)^-1*pi + P'*omega^-1*Q]
    tau_sigma_inv = np.linalg.inv(tau * sigma)
    omega_inv = np.linalg.inv(omega)

    M = np.linalg.inv(tau_sigma_inv + P.T @ omega_inv @ P)
    bl_returns = M @ (tau_sigma_inv @ pi + P.T @ omega_inv @ Q)

    # Optimal weights
    w_bl = np.linalg.inv(risk_aversion * sigma) @ bl_returns

    # Normalize (long-only, no leverage)
    w_bl = np.maximum(w_bl, 0)  # no shorts
    w_sum = w_bl.sum()
    if w_sum > 0:
        w_bl = w_bl / w_sum
    else:
        w_bl = w_mkt  # fallback to market weights

    # Risk contribution
    port_vol = np.sqrt(w_bl @ sigma @ w_bl) * 100
    marginal_risk = sigma @ w_bl
    risk_contrib = w_bl * marginal_risk
    risk_contrib_pct = risk_contrib / risk_contrib.sum() * 100 if risk_contrib.sum() > 0 else np.zeros(n)

    return {
        "tickers": tickers,
        "market_weights": {t: round(float(w), 4) for t, w in zip(tickers, w_mkt)},
        "equilibrium_returns": {t: round(float(r) * 100, 2) for t, r in zip(tickers, pi)},
        "bl_returns": {t: round(float(r) * 100, 2) for t, r in zip(tickers, bl_returns)},
        "bl_weights": {t: round(float(w), 4) for t, w in zip(tickers, w_bl)},
        "risk_contribution": {t: round(float(rc), 1) for t, rc in zip(tickers, risk_contrib_pct)},
        "portfolio_vol": round(float(port_vol), 1),
        "views_used": {t: v for t, v in zip(tickers, views)},
        "confidences_used": {t: c for t, c in zip(tickers, confidences)},
    }


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
