"""
Intuition Tracker for TFG v6
Tracks SPECIFICALLY where Gabriel's judgment diverged from the model's
data-only recommendation, and whether those divergences were additive.

Different from calibration.py (which tracks all predictions).
This tracks: did Gabriel's intuition make the model BETTER or WORSE?

Usage:
  python3 intuition_tracker.py log --ticker NVDA --param margin --model-rec 70 --gabriel-answer 74 --certainty 70
  python3 intuition_tracker.py resolve --id 1 --actual 73
  python3 intuition_tracker.py report
"""

import argparse
import json
import os
import math
from datetime import datetime

from _tfg_path import ensure_tfg_core_importable

ensure_tfg_core_importable()

from tfg_core.intuition import Divergence, categorize, resolve as score_override

LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "data-library",
                         "calibration", "intuition-divergences.json")


def load_log() -> list:
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE) as f:
            return json.load(f)
    return []


def save_log(data: list):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "w") as f:
        json.dump(data, f, indent=2)


def log_divergence(ticker: str, param: str, model_rec: float,
                    gabriel_answer: float, certainty: float, reasoning: str):
    """Log a case where Gabriel answered differently from the model recommendation."""
    entries = load_log()

    divergence = gabriel_answer - model_rec
    entry = {
        "id": len(entries) + 1,
        "date": datetime.now().isoformat(),
        "ticker": ticker.upper(),
        "parameter": param,
        "model_recommendation": model_rec,
        "gabriel_answer": gabriel_answer,
        "divergence": round(divergence, 2),
        "certainty": certainty,
        "reasoning": reasoning,
        "category": categorize(param).value,
        "actual": None,
        "model_error": None,
        "gabriel_error": None,
        "gabriel_was_better": None,
        "status": "OPEN",
    }

    entries.append(entry)
    save_log(entries)

    direction = "MORE BULLISH" if divergence > 0 else "MORE BEARISH"
    print(f"\n  DIVERGENCE LOGGED #{entry['id']}")
    print(f"  {ticker} / {param}")
    print(f"  Model: {model_rec} → Gabriel: {gabriel_answer} ({direction}, {divergence:+.1f})")
    print(f"  Certainty: {certainty}%")
    print(f"  Category: {entry['category']}")
    print(f"  Reasoning: {reasoning[:80]}\n")


def resolve(entry_id: int, actual: float):
    """Resolve a logged divergence with the actual outcome."""
    entries = load_log()

    target = None
    for e in entries:
        if e["id"] == entry_id:
            target = e
            break

    if not target:
        print(f"  Entry #{entry_id} not found.")
        return

    scored = score_override(
        Divergence(
            parameter=target["parameter"],
            model_recommendation=target["model_recommendation"],
            human_answer=target["gabriel_answer"],
            certainty=target["certainty"],
        ),
        actual,
    )
    model_error = scored.model_error
    gabriel_error = scored.human_error
    gabriel_was_better = scored.human_was_better

    target["actual"] = actual
    target["model_error"] = round(model_error, 2)
    target["gabriel_error"] = round(gabriel_error, 2)
    target["gabriel_was_better"] = gabriel_was_better
    target["resolved_date"] = datetime.now().isoformat()
    target["status"] = "RESOLVED"

    save_log(entries)

    g = '\033[92m'
    r = '\033[91m'
    rst = '\033[0m'

    print(f"\n  RESOLVED #{entry_id}: {target['ticker']} / {target['parameter']}")
    print(f"  Model: {target['model_recommendation']} (error: {model_error:.1f})")
    print(f"  Gabriel: {target['gabriel_answer']} (error: {gabriel_error:.1f})")
    print(f"  Actual: {actual}")
    print(f"  {g if gabriel_was_better else r}Gabriel was {'BETTER' if gabriel_was_better else 'WORSE'} than the model{rst}\n")


def report():
    """Report on whether Gabriel's intuition is additive."""
    entries = load_log()
    resolved = [e for e in entries if e["status"] == "RESOLVED"]
    open_entries = [e for e in entries if e["status"] == "OPEN"]

    print(f"\n{'='*55}")
    print(f"  INTUITION TRACKER — Is Gabriel's Judgment Additive?")
    print(f"{'='*55}\n")

    print(f"  Total divergences logged: {len(entries)}")
    print(f"  Resolved: {len(resolved)}")
    print(f"  Open: {len(open_entries)}")

    if len(resolved) < 3:
        print(f"\n  Need ≥3 resolved to analyze. Keep logging divergences.\n")
        if open_entries:
            print(f"  Open entries:")
            for e in open_entries:
                print(f"    #{e['id']} {e['ticker']}/{e['parameter']}: model={e['model_recommendation']} gabriel={e['gabriel_answer']} ({e['divergence']:+.1f})")
        print()
        return

    # Overall
    better_count = sum(1 for e in resolved if e["gabriel_was_better"])
    worse_count = len(resolved) - better_count
    hit_rate = better_count / len(resolved)

    g = '\033[92m'
    r = '\033[91m'
    y = '\033[93m'
    rst = '\033[0m'

    color = g if hit_rate > 0.55 else r if hit_rate < 0.45 else y
    print(f"\n  OVERALL: Gabriel better in {color}{better_count}/{len(resolved)} ({hit_rate:.0%}){rst} of divergences")

    if hit_rate > 0.55:
        print(f"  {g}Gabriel's intuition IS additive — trust his divergences more{rst}")
    elif hit_rate < 0.45:
        print(f"  {r}Gabriel's intuition is NOISE — default to model recommendation{rst}")
    else:
        print(f"  {y}Inconclusive — need more data{rst}")

    # By category
    by_cat = {}
    for e in resolved:
        cat = e.get("category", "other")
        if cat not in by_cat:
            by_cat[cat] = {"better": 0, "total": 0}
        by_cat[cat]["total"] += 1
        if e["gabriel_was_better"]:
            by_cat[cat]["better"] += 1

    print(f"\n  BY CATEGORY:")
    for cat, d in sorted(by_cat.items()):
        rate = d["better"] / d["total"]
        color = g if rate > 0.55 else r if rate < 0.45 else y
        print(f"    {cat:<25} {color}{d['better']}/{d['total']} ({rate:.0%}){rst}")

    # Recommendation
    print(f"\n  RECOMMENDATION:")
    for cat, d in by_cat.items():
        rate = d["better"] / d["total"]
        if d["total"] >= 5:
            if rate > 0.60:
                print(f"    {cat}: {g}TRUST Gabriel's divergences (>60% additive){rst}")
            elif rate < 0.40:
                print(f"    {cat}: {r}IGNORE Gabriel's divergences (default to model){rst}")
            else:
                print(f"    {cat}: {y}INSUFFICIENT signal — keep tracking{rst}")
        else:
            print(f"    {cat}: n={d['total']} — need ≥5 for recommendation")
    print()


def main():
    parser = argparse.ArgumentParser(description="Intuition Tracker for TFG")
    subparsers = parser.add_subparsers(dest="command")

    l = subparsers.add_parser("log")
    l.add_argument("--ticker", required=True)
    l.add_argument("--param", required=True)
    l.add_argument("--model-rec", type=float, required=True)
    l.add_argument("--gabriel-answer", type=float, required=True)
    l.add_argument("--certainty", type=float, required=True)
    l.add_argument("--reasoning", default="")

    r = subparsers.add_parser("resolve")
    r.add_argument("--id", type=int, required=True)
    r.add_argument("--actual", type=float, required=True)

    subparsers.add_parser("report")

    args = parser.parse_args()

    if args.command == "log":
        log_divergence(args.ticker, args.param, args.model_rec,
                       args.gabriel_answer, args.certainty, args.reasoning)
    elif args.command == "resolve":
        resolve(args.id, args.actual)
    elif args.command == "report":
        report()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
