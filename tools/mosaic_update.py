"""
Weekly Mosaic Update for TFG v6
Synthesizes all data streams for an active theory into a
single weekly signal summary. 20 minutes per stock per week.

Usage:
  python3 mosaic_update.py --ticker NVDA
  python3 mosaic_update.py --all
"""

import argparse
import json
import os
from datetime import datetime

MOSAIC_DIR = os.path.join(os.path.dirname(__file__), "..", "mosaic-updates")


def create_mosaic(ticker: str):
    os.makedirs(MOSAIC_DIR, exist_ok=True)

    date = datetime.now().strftime("%Y-%m-%d")
    filename = f"{date}-{ticker.upper()}.md"
    filepath = os.path.join(MOSAIC_DIR, filename)

    template = f"""# Weekly Mosaic — {ticker.upper()} — {date}
System version: 6.0.0

## Signal Inventory

| Signal | Source | Direction | vs Last Week | IC |
|--------|--------|-----------|:---:|:---:|
| TSMC monthly revenue | TSMC IR | [BULL/BEAR/NEUTRAL] | [+/-/flat] | [H/M/L] |
| GitHub CUDA dependency | GitHub API | | | |
| Hyperscaler job postings | LinkedIn | | | |
| Startup AI funding | Crunchbase | | | |
| Earnings language tracker | earnings_language.py | | | |
| Options IV / P/C ratio | Barchart | | | |
| Analyst revision direction | MarketBeat | | | |

## Mosaic Direction
[BULLISH / BEARISH / MIXED / NEUTRAL]

## vs Last Week
[IMPROVING / STABLE / DETERIORATING]

## Parameters Checked
- P-NVDA-01 (capex language): [value] → [CLEAR/WARNING/TRIGGERED]
- P-NVDA-02 (market share): [value] → [CLEAR/WARNING/TRIGGERED]
- P-NVDA-03 (margin): [value] → [CLEAR/WARNING/TRIGGERED]

## Conviction Change
[NONE / UP / DOWN] — reason: [if changed]

## Next Catalyst
[event, date]

## Entry Trigger Status
- Price: ${ticker} at $[current] vs $[breakeven] entry → [X]% away
- Regime: VIX [X], Fed [X] → [status]

## Time Spent
[X] minutes
"""

    with open(filepath, "w") as f:
        f.write(template)

    print(f"\n  Mosaic template created: {filepath}")
    print(f"  Fill in signals from this week's data.\n")


def list_mosaics(ticker: str = None):
    if not os.path.exists(MOSAIC_DIR):
        print("\n  No mosaic updates yet.\n")
        return

    files = sorted(os.listdir(MOSAIC_DIR))
    if ticker:
        files = [f for f in files if ticker.upper() in f]

    print(f"\n  MOSAIC UPDATES{f' — {ticker.upper()}' if ticker else ''}")
    print(f"  {len(files)} updates\n")
    for f in files[-10:]:
        print(f"    {f}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Weekly Mosaic for TFG")
    parser.add_argument("--ticker", help="Create mosaic for ticker")
    parser.add_argument("--all", action="store_true", help="Create for all active theories")
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()

    if args.ticker:
        create_mosaic(args.ticker)
    elif args.all:
        theories_dir = os.path.join(os.path.dirname(__file__), "..", "theories")
        for f in os.listdir(theories_dir):
            if f.endswith(".md") and f != "TEMPLATE.md":
                create_mosaic(f.replace(".md", ""))
    elif args.list:
        list_mosaics()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
