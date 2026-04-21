"""
Universe Construction / Stock Screener for TFG v6
Screens S&P 500 + Russell 1000 weekly to surface candidates
where Gabriel's analytical edge (tech expertise, ecosystem lock-in,
demand chain analysis) is highest.

Usage:
  python3 stock_screener.py --screen tech-moat
  python3 stock_screener.py --screen value-growth
  python3 stock_screener.py --screen all --top 30
  python3 stock_screener.py --ticker NVDA --profile
"""

import argparse
import json
import sys
from datetime import datetime

try:
    import yfinance as yf
    import pandas as pd
except ImportError:
    print("Install: pip3 install yfinance pandas")
    sys.exit(1)


# Edge-based screen definitions
# Each screen targets a SPECIFIC edge Gabriel has, not just financial metrics
# The edge_criteria explain WHY Gabriel has an advantage analyzing these stocks
SCREENS = {
    "ai-stack": {
        "description": "Companies where Gabriel's AI stack domain expertise applies directly",
        "filters": {
            "sector": ["Technology", "Communication Services"],
            "gross_margin_min": 0.40,
            "revenue_growth_min": 0.10,
            "market_cap_min": 5e9,
        },
        "sort_by": "revenue_growth",
        "edge_type": "domain",
        "edge_criteria": [
            "Gabriel works on AI voice agents at Hamming — understands developer friction",
            "Can evaluate CUDA vs alternatives at technical level",
            "Knows real-world AI deployment challenges generalists miss",
        ],
        "thesis_testable": "Demand chain has observable leading indicators (earnings calls, job postings, GitHub)",
        "consensus_exploitable": "Analyst consensus on AI is often based on press releases not engineering reality",
    },
    "custom-silicon": {
        "description": "Companies affected by GPU-to-custom-silicon shift",
        "tickers": ["AMD", "INTC", "MRVL", "AVGO", "QCOM", "TSM", "ASML", "AMAT", "LRCX", "KLAC",
                     "NVDA", "MU", "ON", "ADI", "TXN", "NXPI", "SWKS", "QRVO", "ARM", "SMCI"],
        "edge_type": "information+domain",
        "edge_criteria": [
            "NVDA gauntlet built deep understanding of custom silicon adoption rates",
            "Trainium 0.5% actual vs announcements insight transfers to all semi stocks",
            "Can evaluate ROCm/CUDA switching costs from engineering perspective",
        ],
        "thesis_testable": "Market share data quarterly, earnings calls, GitHub framework adoption",
        "consensus_exploitable": "Market prices announcements (OpenAI→AMD) faster than deployment reality",
    },
    "demand-chain-plays": {
        "description": "Companies in NVDA/GOOGL demand chain where supply chain analysis gives edge",
        "tickers": ["TSM", "MU", "AMAT", "LRCX", "KLAC", "ASML", "AVGO", "MRVL",
                     "SMCI", "VRT", "EQIX", "DLR", "AME", "APH"],
        "edge_type": "analytical",
        "edge_criteria": [
            "NVDA demand chain analysis transfers — same hyperscaler capex drives these stocks",
            "Capex sensitivity model built for NVDA applies to entire supply chain",
            "Leading indicators (TSMC monthly rev, ERCOT grid load) proxy for all of them",
        ],
        "thesis_testable": "TSMC monthly revenue, hyperscaler capex quarterly, import records",
        "consensus_exploitable": "Supply chain stocks lag NVDA narratively — market prices NVDA first, supply chain second",
    },
    "high-analyst-agreement": {
        "description": "Stocks with >90% buy ratings — potential contrarian setups or genuinely priced in",
        "filters": {
            "sector": ["Technology", "Communication Services"],
            "market_cap_min": 50e9,
            "revenue_growth_min": 0.15,
        },
        "sort_by": "revenue_growth",
        "edge_type": "behavioral",
        "edge_criteria": [
            "High analyst agreement = thesis is consensus = possible crowded trade",
            "If everyone agrees, edge comes from identifying what breaks the consensus",
            "Time horizon arbitrage: institutions can't hold through the volatility of a narrative break",
        ],
        "thesis_testable": "The consensus itself is the testable claim — what specific data would break it?",
        "consensus_exploitable": "Consensus breaks create the largest price moves — but you need to be early not contrarian",
    },
    "value-growth": {
        "description": "Growing companies trading below historical P/E — potential mispricing",
        "filters": {
            "revenue_growth_min": 0.15,
            "pe_max": 30,
            "market_cap_min": 20e9,
            "gross_margin_min": 0.40,
        },
        "sort_by": "pe_discount",
        "edge_type": "analytical",
        "edge_criteria": [
            "Low forward P/E + high growth = market may be wrong about growth duration",
            "TFG gauntlet is specifically designed to test growth sustainability claims",
            "Fermi reverse decomposition reveals what's priced in at each P/E level",
        ],
        "thesis_testable": "Quarterly earnings resolve whether growth is decelerating",
        "consensus_exploitable": "Market often extrapolates recent deceleration too aggressively on growth stocks",
    },
}

# S&P 500 tech + comm services tickers (subset for speed)
TECH_UNIVERSE = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ADBE", "CRM",
    "AMD", "INTC", "QCOM", "TXN", "AMAT", "LRCX", "KLAC", "MRVL", "ON", "NXPI",
    "NOW", "INTU", "ISRG", "PANW", "CRWD", "FTNT", "ZS", "DDOG", "NET", "SNOW",
    "PLTR", "UBER", "SHOP", "SQ", "COIN", "MDB", "TEAM", "TTD", "RBLX", "U",
    "TSM", "ASML", "SNPS", "CDNS", "ANSS", "WDAY", "HUBS", "VEEV", "SPLK", "OKTA",
    "NFLX", "DIS", "CMCSA", "TMUS", "VZ", "T",
    "IBM", "ORCL", "SAP", "VMW", "HPE", "DELL",
    "MU", "WDC", "STX", "SMCI", "ARM",
]


def get_stock_data(ticker: str) -> dict:
    """Fetch key metrics for a single stock via yfinance."""
    try:
        t = yf.Ticker(ticker)
        info = t.info

        return {
            "ticker": ticker,
            "name": info.get("shortName", ""),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap", 0),
            "price": info.get("currentPrice", info.get("regularMarketPrice", 0)),
            "pe_trailing": info.get("trailingPE", None),
            "pe_forward": info.get("forwardPE", None),
            "peg": info.get("pegRatio", None),
            "gross_margin": info.get("grossMargins", None),
            "operating_margin": info.get("operatingMargins", None),
            "net_margin": info.get("profitMargins", None),
            "revenue_growth": info.get("revenueGrowth", None),
            "earnings_growth": info.get("earningsGrowth", None),
            "revenue": info.get("totalRevenue", 0),
            "fcf": info.get("freeCashflow", 0),
            "cash": info.get("totalCash", 0),
            "debt": info.get("totalDebt", 0),
            "beta": info.get("beta", None),
            "52w_high": info.get("fiftyTwoWeekHigh", 0),
            "52w_low": info.get("fiftyTwoWeekLow", 0),
            "avg_volume": info.get("averageVolume", 0),
            "short_pct": info.get("shortPercentOfFloat", None),
            "analyst_target": info.get("targetMeanPrice", None),
            "analyst_count": info.get("numberOfAnalystOpinions", 0),
            "recommendation": info.get("recommendationKey", ""),
            "shares": info.get("sharesOutstanding", 0),
        }
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}


def apply_screen(stocks: list[dict], screen: dict) -> list[dict]:
    """Filter stocks by screen criteria."""
    filters = screen.get("filters", {})
    results = []

    for s in stocks:
        if "error" in s:
            continue

        # Sector filter
        if "sector" in filters:
            if s.get("sector") not in filters["sector"]:
                continue

        # Margin filter
        if "gross_margin_min" in filters:
            gm = s.get("gross_margin")
            if gm is None or gm < filters["gross_margin_min"]:
                continue

        # Revenue growth filter
        if "revenue_growth_min" in filters:
            rg = s.get("revenue_growth")
            if rg is None or rg < filters["revenue_growth_min"]:
                continue

        # Market cap filter
        if "market_cap_min" in filters:
            mc = s.get("market_cap", 0)
            if mc < filters["market_cap_min"]:
                continue

        # P/E filter
        if "pe_max" in filters:
            pe = s.get("pe_forward") or s.get("pe_trailing")
            if pe is not None and pe > filters["pe_max"]:
                continue

        results.append(s)

    # Sort
    sort_key = screen.get("sort_by", "revenue_growth")
    if sort_key == "revenue_growth":
        results.sort(key=lambda x: x.get("revenue_growth") or 0, reverse=True)
    elif sort_key == "pe_discount":
        results.sort(key=lambda x: x.get("pe_forward") or 999)

    return results


def print_screen_results(results: list[dict], screen_name: str, screen: dict, top_n: int = 20):
    """Pretty-print screen results."""
    print(f"\n{'='*80}")
    print(f"  STOCK SCREEN: {screen_name.upper()}")
    print(f"  {screen.get('description', '')}")
    print(f"  Edge: {screen.get('edge', '')}")
    print(f"  Results: {len(results)} stocks passed filters")
    print(f"{'='*80}\n")

    print(f"  {'Ticker':<8} {'Name':<25} {'MCap':>8} {'P/E':>6} {'GM':>6} {'RevG':>6} {'NetM':>6} {'Price':>8} {'Target':>8}")
    print(f"  {'-'*8} {'-'*25} {'-'*8} {'-'*6} {'-'*6} {'-'*6} {'-'*6} {'-'*8} {'-'*8}")

    for s in results[:top_n]:
        mcap_b = s.get('market_cap', 0) / 1e9
        pe = s.get('pe_forward') or s.get('pe_trailing') or 0
        gm = (s.get('gross_margin') or 0) * 100
        rg = (s.get('revenue_growth') or 0) * 100
        nm = (s.get('net_margin') or 0) * 100
        price = s.get('price', 0)
        target = s.get('analyst_target', 0)

        upside = ((target / price - 1) * 100) if price and target else 0

        green = '\033[92m'
        red = '\033[91m'
        reset = '\033[0m'

        upside_color = green if upside > 10 else red if upside < -10 else ''
        rg_color = green if rg > 20 else ''

        print(f"  {s['ticker']:<8} {s.get('name','')[:25]:<25} {mcap_b:>7.0f}B {pe:>5.0f}x {gm:>5.0f}% {rg_color}{rg:>5.0f}%{reset} {nm:>5.0f}% {price:>7.0f} {upside_color}{target:>7.0f}{reset}")

    if len(results) > top_n:
        print(f"\n  ... and {len(results) - top_n} more. Use --top to see more.")

    print(f"\n  NEXT: Run /theory on top candidates to enter the gauntlet.")
    print()


def print_profile(data: dict):
    """Print detailed profile for a single stock."""
    if "error" in data:
        print(f"  Error: {data['error']}")
        return

    mcap = data.get('market_cap', 0) / 1e9
    price = data.get('price', 0)
    shares = data.get('shares', 0) / 1e9

    print(f"\n{'='*55}")
    print(f"  {data['ticker']} — {data.get('name', '')}")
    print(f"  {data.get('sector', '')} / {data.get('industry', '')}")
    print(f"{'='*55}\n")

    print(f"  Price: ${price:.2f}")
    print(f"  Market cap: ${mcap:.0f}B (${price:.2f} x {shares:.1f}B shares)")
    print(f"  52w range: ${data.get('52w_low',0):.2f} - ${data.get('52w_high',0):.2f}")
    print()

    pe_t = data.get('pe_trailing')
    pe_f = data.get('pe_forward')
    print(f"  P/E trailing: {pe_t:.1f}x" if pe_t else "  P/E trailing: N/A")
    print(f"  P/E forward:  {pe_f:.1f}x" if pe_f else "  P/E forward:  N/A")
    print(f"  PEG ratio:    {data.get('peg','N/A')}")
    print()

    gm = data.get('gross_margin')
    om = data.get('operating_margin')
    nm = data.get('net_margin')
    print(f"  Gross margin:     {gm*100:.1f}%" if gm else "  Gross margin: N/A")
    print(f"  Operating margin: {om*100:.1f}%" if om else "  Operating margin: N/A")
    print(f"  Net margin:       {nm*100:.1f}%" if nm else "  Net margin: N/A")
    print()

    rg = data.get('revenue_growth')
    eg = data.get('earnings_growth')
    print(f"  Revenue growth: {rg*100:.1f}% YoY" if rg else "  Revenue growth: N/A")
    print(f"  Earnings growth: {eg*100:.1f}% YoY" if eg else "  Earnings growth: N/A")
    print()

    rev = data.get('revenue', 0) / 1e9
    fcf = data.get('fcf', 0) / 1e9
    cash = data.get('cash', 0) / 1e9
    debt = data.get('debt', 0) / 1e9
    print(f"  Revenue: ${rev:.1f}B")
    print(f"  FCF: ${fcf:.1f}B")
    print(f"  Cash: ${cash:.1f}B | Debt: ${debt:.1f}B | Net: ${cash-debt:.1f}B")
    print()

    target = data.get('analyst_target')
    count = data.get('analyst_count', 0)
    rec = data.get('recommendation', '')
    short = data.get('short_pct')
    if target and price:
        upside = (target / price - 1) * 100
        print(f"  Analyst target: ${target:.0f} ({upside:+.0f}%) | {count} analysts | {rec}")
    print(f"  Short interest: {short*100:.1f}%" if short else "  Short interest: N/A")
    print(f"  Beta: {data.get('beta', 'N/A')}")

    # TFG readiness check
    print(f"\n  TFG READINESS:")
    print(f"    Market cap verified: ${price:.2f} x {shares:.1f}B = ${price*shares:.0f}B")
    print(f"    Net margin for MC: {nm*100:.1f}%" if nm else "    Net margin: NEEDS VERIFICATION")
    print(f"    Gross margin: {gm*100:.1f}%" if gm else "    Gross margin: NEEDS VERIFICATION")
    print()


def main():
    parser = argparse.ArgumentParser(description="Stock Screener for TFG v6")
    parser.add_argument("--screen", help="Screen name: tech-moat, value-growth, infrastructure, custom-silicon")
    parser.add_argument("--ticker", help="Single stock profile")
    parser.add_argument("--top", type=int, default=20, help="Number of results to show")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.ticker:
        data = get_stock_data(args.ticker.upper())
        if args.json:
            print(json.dumps(data, indent=2, default=str))
        else:
            print_profile(data)
        return

    if args.screen:
        screen = SCREENS.get(args.screen)
        if not screen:
            print(f"Unknown screen: {args.screen}")
            print(f"Available: {', '.join(SCREENS.keys())}")
            return

        # Get tickers
        if "tickers" in screen:
            tickers = screen["tickers"]
        else:
            tickers = TECH_UNIVERSE

        print(f"\n  Fetching data for {len(tickers)} stocks...", flush=True)

        stocks = []
        for i, ticker in enumerate(tickers):
            if (i + 1) % 10 == 0:
                print(f"  ... {i+1}/{len(tickers)}", flush=True)
            data = get_stock_data(ticker)
            if "error" not in data:
                stocks.append(data)

        results = apply_screen(stocks, screen)

        if args.json:
            print(json.dumps(results[:args.top], indent=2, default=str))
        else:
            print_screen_results(results, args.screen, screen, args.top)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
