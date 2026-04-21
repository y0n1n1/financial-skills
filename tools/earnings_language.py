"""
Earnings Call Language Tracker for TFG v6
Monitors hyperscaler earnings call language for sentiment shifts
on AI capex — the #1 EVPPI parameter for NVDA.

Searches for specific language patterns in earnings call transcripts
and tracks sentiment over time.

Usage:
  python3 earnings_language.py --company MSFT --quarter Q2-FY2026
  python3 earnings_language.py --scan-all
  python3 earnings_language.py --trend
"""

import argparse
import json
import os
import sys
from datetime import datetime

try:
    from collections import Counter
except ImportError:
    pass

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data-library",
                          "leading-indicators", "hyperscaler-capex", "language-tracker.json")

# Language patterns to track — bullish vs bearish capex signals
BULLISH_PATTERNS = [
    "accelerate", "accelerating", "unprecedented demand", "supply constrained",
    "increasing investment", "scaling up", "doubling down", "ramping",
    "enormous opportunity", "once in a generation", "infrastructure buildout",
    "AI infrastructure", "demand exceeds", "capacity expansion",
    "long-term investment", "generational", "transformative",
]

BEARISH_PATTERNS = [
    "efficiency", "optimize", "rationalize", "disciplined",
    "return on investment", "ROI", "payback period", "prudent",
    "measured approach", "slower pace", "normalize", "decelerate",
    "cost discipline", "capital efficiency", "right-sizing",
    "near-term headwinds", "cautious",
]

NEUTRAL_PATTERNS = [
    "on track", "in line", "as expected", "consistent",
    "steady", "balanced", "appropriate",
]


def analyze_transcript(text: str) -> dict:
    """Analyze earnings call transcript for capex language patterns."""
    text_lower = text.lower()
    words = text_lower.split()
    total_words = len(words)

    bull_hits = []
    bear_hits = []
    neutral_hits = []

    for pattern in BULLISH_PATTERNS:
        count = text_lower.count(pattern.lower())
        if count > 0:
            bull_hits.append({"pattern": pattern, "count": count})

    for pattern in BEARISH_PATTERNS:
        count = text_lower.count(pattern.lower())
        if count > 0:
            bear_hits.append({"pattern": pattern, "count": count})

    for pattern in NEUTRAL_PATTERNS:
        count = text_lower.count(pattern.lower())
        if count > 0:
            neutral_hits.append({"pattern": pattern, "count": count})

    bull_total = sum(h["count"] for h in bull_hits)
    bear_total = sum(h["count"] for h in bear_hits)
    neutral_total = sum(h["count"] for h in neutral_hits)
    total_hits = bull_total + bear_total + neutral_total

    if total_hits == 0:
        score = 0.0
    else:
        score = (bull_total - bear_total) / total_hits  # -1 to +1

    return {
        "bull_count": bull_total,
        "bear_count": bear_total,
        "neutral_count": neutral_total,
        "total_pattern_hits": total_hits,
        "score": round(score, 3),  # -1 (bearish) to +1 (bullish)
        "top_bull": sorted(bull_hits, key=lambda x: x["count"], reverse=True)[:3],
        "top_bear": sorted(bear_hits, key=lambda x: x["count"], reverse=True)[:3],
        "signal": "BULLISH" if score > 0.2 else "BEARISH" if score < -0.2 else "NEUTRAL",
    }


def log_analysis(company: str, quarter: str, analysis: dict):
    """Save analysis to the language tracker."""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

    if os.path.exists(DATA_FILE):
        with open(DATA_FILE) as f:
            data = json.load(f)
    else:
        data = {"entries": [], "metadata": {"created": datetime.now().isoformat()}}

    entry = {
        "company": company.upper(),
        "quarter": quarter,
        "date": datetime.now().isoformat(),
        "score": analysis["score"],
        "signal": analysis["signal"],
        "bull_count": analysis["bull_count"],
        "bear_count": analysis["bear_count"],
        "top_bull": analysis["top_bull"],
        "top_bear": analysis["top_bear"],
    }

    # Replace if same company+quarter exists
    data["entries"] = [e for e in data["entries"]
                       if not (e["company"] == company.upper() and e["quarter"] == quarter)]
    data["entries"].append(entry)

    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

    return entry


def show_trend():
    """Show language sentiment trend across all tracked earnings calls."""
    if not os.path.exists(DATA_FILE):
        print("\n  No data yet. Run --company to analyze a transcript.\n")
        return

    with open(DATA_FILE) as f:
        data = json.load(f)

    entries = sorted(data["entries"], key=lambda x: x["date"])

    print(f"\n{'='*60}")
    print(f"  HYPERSCALER CAPEX LANGUAGE TREND")
    print(f"  {len(entries)} earnings calls tracked")
    print(f"{'='*60}\n")

    print(f"  {'Company':<8} {'Quarter':<12} {'Score':>7} {'Signal':<10} {'Bull':>5} {'Bear':>5}")
    print(f"  {'-'*8} {'-'*12} {'-'*7} {'-'*10} {'-'*5} {'-'*5}")

    for e in entries:
        score = e["score"]
        g = '\033[92m'
        r = '\033[91m'
        y = '\033[93m'
        rst = '\033[0m'
        sc = g if score > 0.2 else r if score < -0.2 else y

        print(f"  {e['company']:<8} {e['quarter']:<12} {sc}{score:>+6.3f}{rst} {e['signal']:<10} {e['bull_count']:>5} {e['bear_count']:>5}")

    # Aggregate
    if entries:
        avg_score = sum(e["score"] for e in entries) / len(entries)
        recent = entries[-4:] if len(entries) >= 4 else entries
        recent_avg = sum(e["score"] for e in recent) / len(recent)

        print(f"\n  Overall avg: {avg_score:+.3f}")
        print(f"  Recent avg (last 4): {recent_avg:+.3f}")

        if recent_avg < avg_score - 0.1:
            print(f"  \033[91mTREND: language shifting bearish — capex sentiment deteriorating\033[0m")
        elif recent_avg > avg_score + 0.1:
            print(f"  \033[92mTREND: language shifting bullish — capex sentiment improving\033[0m")
        else:
            print(f"  TREND: stable")
    print()


def main():
    parser = argparse.ArgumentParser(description="Earnings Language Tracker for TFG")
    parser.add_argument("--company", help="Company to analyze (MSFT, GOOG, META, AMZN)")
    parser.add_argument("--quarter", help="Quarter label (e.g., Q2-FY2026)")
    parser.add_argument("--text", help="Paste transcript text or path to file")
    parser.add_argument("--scan-all", action="store_true", help="Scan all tracked companies")
    parser.add_argument("--trend", action="store_true", help="Show sentiment trend")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.trend:
        show_trend()
        return

    if args.company:
        if not args.text:
            print(f"\n  Provide transcript with --text 'paste text here' or --text /path/to/file\n")
            return

        # Load text from file if path provided
        if os.path.exists(args.text):
            with open(args.text) as f:
                text = f.read()
        else:
            text = args.text

        quarter = args.quarter or f"Q?-{datetime.now().year}"
        analysis = analyze_transcript(text)
        entry = log_analysis(args.company, quarter, analysis)

        if args.json:
            print(json.dumps(analysis, indent=2))
        else:
            print(f"\n  {args.company.upper()} {quarter}")
            print(f"  Score: {analysis['score']:+.3f} ({analysis['signal']})")
            print(f"  Bull patterns: {analysis['bull_count']} | Bear patterns: {analysis['bear_count']}")
            if analysis['top_bull']:
                print(f"  Top bull: {', '.join(h['pattern'] + f'({h[\"count\"]})' for h in analysis['top_bull'])}")
            if analysis['top_bear']:
                print(f"  Top bear: {', '.join(h['pattern'] + f'({h[\"count\"]})' for h in analysis['top_bear'])}")
            print(f"  Logged to language tracker.\n")
        return

    parser.print_help()


if __name__ == "__main__":
    main()
