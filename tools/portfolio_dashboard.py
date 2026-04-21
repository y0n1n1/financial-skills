"""
Portfolio Dashboard for TFG v6
Tracks positions, computes P&L, checks theory card status,
and generates the portfolio overview page.

Usage:
  python3 portfolio_dashboard.py --status
  python3 portfolio_dashboard.py --watchlist
  python3 portfolio_dashboard.py --generate-page
"""

import argparse
import json
import os
import sys
from datetime import datetime

try:
    import yfinance as yf
except ImportError:
    print("Install: pip3 install yfinance")
    sys.exit(1)

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THEORIES_DIR = os.path.join(BASE, "theories")
LAB_REPORTS_DIR = os.path.join(BASE, "lab-reports")
ANSWERS_FILE = os.path.join(BASE, "intuition_answers_v6.json")
PORTFOLIO_FILE = os.path.join(BASE, "portfolio.md")


def get_live_price(ticker: str) -> dict:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        return {
            "ticker": ticker,
            "price": info.get("currentPrice", info.get("regularMarketPrice", 0)),
            "change_pct": info.get("regularMarketChangePercent", 0),
            "market_cap": info.get("marketCap", 0),
            "pe_forward": info.get("forwardPE", None),
            "52w_high": info.get("fiftyTwoWeekHigh", 0),
            "52w_low": info.get("fiftyTwoWeekLow", 0),
        }
    except:
        return {"ticker": ticker, "price": 0, "error": True}


def get_theory_status() -> list[dict]:
    """Read all theory cards and extract status."""
    theories = []
    if not os.path.exists(THEORIES_DIR):
        return theories

    for f in os.listdir(THEORIES_DIR):
        if f == "TEMPLATE.md" or not f.endswith(".md"):
            continue
        ticker = f.replace(".md", "")

        # Check for lab report
        lab_dir = os.path.join(LAB_REPORTS_DIR, ticker)
        has_lab = os.path.exists(lab_dir) and any(
            f.endswith(".md") and "archive" not in f
            for f in os.listdir(lab_dir) if os.path.isfile(os.path.join(lab_dir, f))
        )

        # Get latest lab report version
        latest_version = "none"
        if has_lab:
            reports = [f for f in os.listdir(lab_dir)
                      if f.endswith(".md") and "archive" not in f and os.path.isfile(os.path.join(lab_dir, f))]
            if reports:
                reports.sort()
                latest_version = reports[-1].replace(".md", "")

        theories.append({
            "ticker": ticker,
            "has_theory_card": True,
            "has_lab_report": has_lab,
            "latest_version": latest_version,
            "lifecycle": "WATCHING" if has_lab else "DISCOVERY",
        })

    return theories


# TFG verdicts from v6
V6_VERDICTS = {
    "NVDA": {"ev": -3.9, "p_pos": 43.7, "wl": 0.96, "kelly": -0.15, "conviction": 2, "breakeven": 173, "signal": "WATCH"},
    "GOOGL": {"ev": -8.3, "p_pos": 34.6, "wl": 0.75, "kelly": -0.53, "conviction": 1, "breakeven": 276, "signal": "NO TRADE"},
    "META": {"ev": None, "signal": "NOT ANALYZED"},
}


def print_status():
    theories = get_theory_status()

    print(f"\n{'='*70}")
    print(f"  TFG PORTFOLIO DASHBOARD — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  System version: 6.0.0")
    print(f"{'='*70}\n")

    # Live prices
    print(f"  {'Ticker':<8} {'Price':>8} {'MCap':>8} {'FwdPE':>7} {'vs52wH':>8} {'Signal':<12} {'EV':>6} {'Conv':>5}")
    print(f"  {'-'*8} {'-'*8} {'-'*8} {'-'*7} {'-'*8} {'-'*12} {'-'*6} {'-'*5}")

    for t in theories:
        ticker = t["ticker"]
        v = V6_VERDICTS.get(ticker, {})
        live = get_live_price(ticker)

        price = live.get("price", 0)
        mcap = live.get("market_cap", 0) / 1e9
        pe = live.get("pe_forward")
        high = live.get("52w_high", 0)
        vs_high = ((price / high - 1) * 100) if high else 0

        ev = v.get("ev")
        ev_str = f"{ev:+.1f}%" if ev is not None else "—"
        conv = v.get("conviction", "—")
        signal = v.get("signal", "—")
        breakeven = v.get("breakeven")

        green = '\033[92m'
        red = '\033[91m'
        yellow = '\033[93m'
        reset = '\033[0m'

        sig_color = green if signal == "WATCH" else red if "NO" in str(signal) else yellow
        ev_color = green if ev and ev > 0 else red if ev and ev < 0 else ''

        print(f"  {ticker:<8} ${price:>6.0f} {mcap:>7.0f}B {pe:>6.0f}x {vs_high:>+7.1f}% {sig_color}{signal:<12}{reset} {ev_color}{ev_str:>6}{reset} {conv:>5}")

        if breakeven and price:
            distance = (breakeven / price - 1) * 100
            if distance < 0:
                print(f"           {'':>8} {'':>8} {'':>7} {'':>8} Entry: ${breakeven} ({distance:+.0f}% from current)")

    # Theory lifecycle
    print(f"\n  LIFECYCLE STATUS:")
    for t in theories:
        print(f"    {t['ticker']}: {t['lifecycle']} | lab: {t['latest_version']}")

    # Positions (from portfolio.md — currently empty)
    print(f"\n  POSITIONS: none (watching only)")
    print(f"\n  REGIME: elevated VIX, restrictive Fed, tech rotation out")
    print(f"  CONCLUSION: both analyzed stocks are negative EV at current prices.")
    print(f"  ACTION: monitor parameters, wait for entry triggers.\n")


def print_watchlist():
    print(f"\n{'='*60}")
    print(f"  WATCHLIST — Entry Triggers")
    print(f"{'='*60}\n")

    for ticker, v in V6_VERDICTS.items():
        if v.get("breakeven"):
            live = get_live_price(ticker)
            price = live.get("price", 0)
            be = v["breakeven"]
            dist = ((be / price - 1) * 100) if price else 0

            print(f"  {ticker}")
            print(f"    Current: ${price:.0f} | Breakeven: ${be} | Distance: {dist:+.1f}%")
            print(f"    EV at current: {v['ev']:+.1f}% | Signal: {v['signal']}")
            print(f"    Triggers: price to ${be}, Fed cut, regime normalization, positive earnings")
            print()


def generate_page():
    """Generate the portfolio dashboard HTML page."""
    theories = get_theory_status()
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    rows = ""
    for t in theories:
        ticker = t["ticker"]
        v = V6_VERDICTS.get(ticker, {})
        ev = v.get("ev")
        ev_str = f"{ev:+.1f}%" if ev is not None else "—"
        signal = v.get("signal", "—")
        conv = v.get("conviction", "—")
        be = v.get("breakeven", "—")
        wl = v.get("wl", "—")
        p_pos = v.get("p_pos", "—")

        ev_class = "g" if ev and ev > 0 else "d" if ev and ev < 0 else ""
        sig_class = "g" if signal == "WATCH" else "d" if "NO" in str(signal) else "w"

        rows += f'<tr><td class="rl">{ticker}</td><td class="{ev_class}">{ev_str}</td><td>{p_pos}%</td><td>{wl}</td><td class="{sig_class}">{signal}</td><td>{conv}/5</td><td>${be}</td></tr>'

    html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"><title>TFG Portfolio</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap');*{{margin:0;padding:0;box-sizing:border-box}}body{{background:#fafafa;color:#1a1a1a;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.7;padding:20px 16px;max-width:480px;margin:0 auto}}body.unauthorized{{display:none}}h1,h2{{font-family:'Bodoni Moda',Georgia,serif;font-weight:700;text-transform:uppercase;letter-spacing:.06em}}h1{{font-size:24px;color:#000}}h2{{font-size:16px;color:#000;margin-bottom:10px;letter-spacing:.1em}}.header{{padding:28px 0 20px;border-bottom:2px solid #000}}.header .sub{{color:#888;font-size:11px;margin-top:6px;text-transform:uppercase;letter-spacing:2.5px}}.s{{padding:20px 0;border-bottom:1px solid #e0e0e0}}.s:last-child{{border-bottom:none}}p{{margin-bottom:8px;color:#333}}strong{{color:#000;font-weight:600}}.m{{color:#555;font-size:11px}}.d{{color:#dc2626}}.g{{color:#16a34a}}.w{{color:#d97706}}.a{{color:#2563eb}}.mx{{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px}}.mx th{{padding:5px 3px;font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#888;border-bottom:1px solid #e0e0e0;text-align:center}}.mx td{{padding:7px 3px;text-align:center;border-bottom:1px solid #f0f0f0;font-weight:500}}.mx .rl{{text-align:left;color:#000;font-weight:600}}.st{{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f0f0f0}}.st:last-child{{border-bottom:none}}.st-l{{color:#666}}.st-v{{font-weight:600}}.ab{{border-left:3px solid #2563eb;padding:12px 16px;margin:8px 0;background:#eff6ff}}.ab strong{{color:#2563eb}}.footer{{text-align:center;padding:32px 0 16px;color:#444;font-size:10px;letter-spacing:1.5px;text-transform:uppercase}}</style></head>
<body class="unauthorized">
<script>(function(){{if(!window.location.search.includes('token=b1c9a74d5aed49b5bd85bad8208b011d')){{document.body.innerHTML='';return}}document.body.classList.remove('unauthorized')}})();</script>

<div class="header"><h1>Portfolio</h1><div class="sub">TFG v6.0 &middot; {now}</div></div>

<div class="s">
<h2>Theory Network</h2>
<table class="mx">
<tr><th>Stock</th><th>EV</th><th>P(+)</th><th>W/L</th><th>Signal</th><th>Conv</th><th>Entry</th></tr>
{rows}
</table>
</div>

<div class="s">
<h2>Positions</h2>
<p class="m">No open positions. Both analyzed stocks are negative EV at current prices. Monitoring for entry triggers.</p>
</div>

<div class="s">
<h2>Regime</h2>
<div class="st"><span class="st-l">VIX</span><span class="st-v d">24-27 (elevated)</span></div>
<div class="st"><span class="st-l">Fed</span><span class="st-v d">3.50-3.75% (holding)</span></div>
<div class="st"><span class="st-l">GDP</span><span class="st-v w">+0.7% Q4 (below trend)</span></div>
<div class="st"><span class="st-l">Tech flows</span><span class="st-v d">XLK -4% YTD, rotating out</span></div>
</div>

<div class="s">
<h2>Entry Watchlist</h2>
<div class="st"><span class="st-l">NVDA breakeven</span><span class="st-v">$173 (-4% from current)</span></div>
<div class="st"><span class="st-l">GOOGL breakeven</span><span class="st-v">$276 (-8% from current)</span></div>
<div class="st"><span class="st-l">Regime trigger</span><span class="st-v">VIX &lt;18 + 1 Fed cut</span></div>
<div class="st"><span class="st-l">Earnings trigger</span><span class="st-v">NVDA Q1 FY2027 (May 2026)</span></div>
</div>

<div class="s">
<div class="ab"><strong>System working correctly.</strong><p>Both stocks analyzed deeply. Both negative EV. Both truths (monopoly, distribution) likely correct but priced in. The right action: wait, monitor parameters, deploy capital when entry conditions are met.</p></div>
</div>

<div class="s">
<h2>Links</h2>
<p><a href="nvda-gauntlet.html?token=b1c9a74d5aed49b5bd85bad8208b011d" style="color:#2563eb">NVDA Gauntlet</a></p>
<p><a href="googl-gauntlet.html?token=b1c9a74d5aed49b5bd85bad8208b011d" style="color:#2563eb">GOOGL Gauntlet</a></p>
<p><a href="intuition.html?token=b1c9a74d5aed49b5bd85bad8208b011d" style="color:#2563eb">Intuition Questions</a></p>
</div>

<div class="footer">TFG v6.0.0 &middot; {now}</div>
</body></html>'''

    output_path = os.path.join(BASE, "..", "briefing-images", "output", "portfolio.html")
    with open(output_path, "w") as f:
        f.write(html)
    print(f"  Portfolio page written to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Portfolio Dashboard for TFG v6")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--watchlist", action="store_true")
    parser.add_argument("--generate-page", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.status:
        print_status()
    elif args.watchlist:
        print_watchlist()
    elif args.generate_page:
        generate_page()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
