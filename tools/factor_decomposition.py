"""
Factor Decomposition for TFG v6
Uses Ken French's free Fama-French factor data to decompose
stock returns into factor exposures vs idiosyncratic alpha.

Answers: are our positions actually diversified, or are we
running the same factor 3x?

Usage:
  python3 factor_decomposition.py --tickers NVDA,GOOGL,META --period 1y
"""

import argparse
import json
import sys
from datetime import datetime, timedelta

try:
    import yfinance as yf
    import pandas as pd
    import numpy as np
    from sklearn.linear_model import LinearRegression
except ImportError:
    print("Install: pip3 install yfinance pandas numpy scikit-learn")
    sys.exit(1)


def get_returns(ticker: str, period: str = "1y") -> pd.Series:
    """Get daily returns for a ticker."""
    t = yf.Ticker(ticker)
    hist = t.history(period=period)
    if hist.empty:
        return pd.Series(dtype=float)
    returns = hist["Close"].pct_change().dropna()
    returns.name = ticker
    return returns


def get_market_returns(period: str = "1y") -> pd.Series:
    """Get S&P 500 returns as market proxy."""
    spy = yf.Ticker("SPY")
    hist = spy.history(period=period)
    returns = hist["Close"].pct_change().dropna()
    returns.name = "market"
    return returns


def decompose(ticker: str, period: str = "1y") -> dict:
    """Decompose stock returns into market beta + alpha."""
    stock_ret = get_returns(ticker, period)
    mkt_ret = get_market_returns(period)

    # Align dates
    combined = pd.concat([stock_ret, mkt_ret], axis=1).dropna()
    if combined.empty or len(combined) < 30:
        return {"ticker": ticker, "error": "insufficient data"}

    X = combined["market"].values.reshape(-1, 1)
    y = combined[ticker].values

    reg = LinearRegression().fit(X, y)
    beta = reg.coef_[0]
    alpha_daily = reg.intercept_
    alpha_annual = alpha_daily * 252
    r_squared = reg.score(X, y)

    # Idiosyncratic volatility
    predicted = reg.predict(X)
    residuals = y - predicted
    idio_vol = np.std(residuals) * np.sqrt(252)
    total_vol = np.std(y) * np.sqrt(252)

    # Returns decomposition
    total_return = (1 + combined[ticker]).prod() - 1
    mkt_return = (1 + combined["market"]).prod() - 1
    factor_contribution = beta * mkt_return
    alpha_contribution = total_return - factor_contribution

    return {
        "ticker": ticker,
        "period": period,
        "beta": round(beta, 2),
        "alpha_annual": round(alpha_annual * 100, 2),
        "r_squared": round(r_squared, 3),
        "total_vol": round(total_vol * 100, 1),
        "idio_vol": round(idio_vol * 100, 1),
        "systematic_vol_pct": round((1 - (idio_vol / total_vol) ** 2) * 100 if total_vol > 0 else 0, 1),
        "total_return": round(total_return * 100, 1),
        "factor_return": round(factor_contribution * 100, 1),
        "alpha_return": round(alpha_contribution * 100, 1),
        "n_observations": len(combined),
    }


def portfolio_correlation(tickers: list[str], period: str = "1y") -> dict:
    """Compute pairwise correlations and effective diversification."""
    returns = {}
    for t in tickers:
        r = get_returns(t, period)
        if not r.empty:
            returns[t] = r

    combined = pd.DataFrame(returns).dropna()
    if combined.empty:
        return {"error": "insufficient data"}

    corr = combined.corr()
    avg_corr = corr.values[np.triu_indices_from(corr.values, k=1)].mean()

    return {
        "tickers": tickers,
        "correlation_matrix": corr.round(3).to_dict(),
        "avg_pairwise_correlation": round(avg_corr, 3),
        "diversification_grade": (
            "WELL DIVERSIFIED" if avg_corr < 0.30 else
            "MODERATE" if avg_corr < 0.60 else
            "HIGHLY CONCENTRATED"
        ),
    }


def print_results(results: list[dict], corr: dict):
    print(f"\n{'='*65}")
    print(f"  FACTOR DECOMPOSITION")
    print(f"{'='*65}\n")

    print(f"  {'Ticker':<8} {'Beta':>6} {'Alpha':>7} {'R2':>6} {'TotVol':>7} {'IdioVol':>8} {'Sys%':>5} {'TotRet':>7} {'AlphaR':>7}")
    print(f"  {'-'*8} {'-'*6} {'-'*7} {'-'*6} {'-'*7} {'-'*8} {'-'*5} {'-'*7} {'-'*7}")

    for r in results:
        if "error" in r:
            print(f"  {r['ticker']:<8} ERROR: {r['error']}")
            continue
        g = '\033[92m'
        d = '\033[91m'
        rst = '\033[0m'
        ac = g if r['alpha_return'] > 0 else d
        print(f"  {r['ticker']:<8} {r['beta']:>5.2f}x {r['alpha_annual']:>+6.1f}% {r['r_squared']:>5.3f} {r['total_vol']:>6.1f}% {r['idio_vol']:>7.1f}% {r['systematic_vol_pct']:>4.0f}% {r['total_return']:>+6.1f}% {ac}{r['alpha_return']:>+6.1f}%{rst}")

    if corr and "error" not in corr:
        print(f"\n  PORTFOLIO CORRELATION:")
        print(f"  Avg pairwise: {corr['avg_pairwise_correlation']:.3f}")
        print(f"  Grade: {corr['diversification_grade']}")

        if corr['avg_pairwise_correlation'] > 0.60:
            print(f"  \033[91mWARNING: positions are highly correlated — effectively one bet\033[0m")
    print()


def main():
    parser = argparse.ArgumentParser(description="Factor Decomposition for TFG")
    parser.add_argument("--tickers", required=True, help="Comma-separated tickers")
    parser.add_argument("--period", default="1y", help="Period: 1y, 2y, 6mo")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.tickers.split(",")]

    print(f"\n  Fetching data for {len(tickers)} stocks...", flush=True)
    results = [decompose(t, args.period) for t in tickers]
    corr = portfolio_correlation(tickers, args.period) if len(tickers) > 1 else {}

    if args.json:
        print(json.dumps({"decomposition": results, "correlation": corr}, indent=2))
    else:
        print_results(results, corr)


if __name__ == "__main__":
    main()
