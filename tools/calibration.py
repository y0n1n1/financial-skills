"""
Calibration Scoring for TFG
Tracks every probability estimate, scores against outcomes, computes Brier scores.
Over time reveals whether Gabriel/Claude are systematically over/under-confident.

Usage:
  # Log a prediction:
  python3 calibration.py log --ticker NVDA --question "profitable 18mo" \
    --probability 0.35 --timeframe "2027-09-22"

  # Resolve a prediction:
  python3 calibration.py resolve --id 1 --outcome 0  (0=wrong, 1=right)

  # View calibration stats:
  python3 calibration.py stats
"""

import argparse
import json
import os
from datetime import datetime

from _tfg_path import ensure_tfg_core_importable

ensure_tfg_core_importable()

from tfg_core.calibration import (
    Forecast,
    GOOD_BRIER,
    MIN_RESOLVED_FOR_STATS,
    UNINFORMED_BRIER,
    brier_score,
    score_calibration,
)

LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "calibration_log.json")


def load_log() -> list:
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE) as f:
            return json.load(f)
    return []


def save_log(data: list):
    with open(LOG_FILE, "w") as f:
        json.dump(data, f, indent=2)


def log_prediction(ticker: str, question: str, probability: float, timeframe: str):
    predictions = load_log()

    entry = {
        "id": len(predictions) + 1,
        "ticker": ticker,
        "question": question,
        "probability": probability,
        "date_logged": datetime.now().isoformat(),
        "timeframe": timeframe,
        "outcome": None,
        "brier_score": None,
        "status": "OPEN",
    }

    predictions.append(entry)
    save_log(predictions)

    print(f"\n  PREDICTION #{entry['id']} LOGGED")
    print(f"  {ticker}: {question}")
    print(f"  P = {probability:.0%}")
    print(f"  Resolves by: {timeframe}")
    print(f"  Status: OPEN\n")


def resolve_prediction(pred_id: int, outcome: int):
    predictions = load_log()

    target = None
    for p in predictions:
        if p["id"] == pred_id:
            target = p
            break

    if target is None:
        print(f"\n  Prediction #{pred_id} not found.\n")
        return

    if target["status"] == "RESOLVED":
        print(f"\n  Prediction #{pred_id} already resolved.\n")
        return

    brier = brier_score(target["probability"], outcome)

    target["outcome"] = outcome
    target["brier_score"] = brier
    target["date_resolved"] = datetime.now().isoformat()
    target["status"] = "RESOLVED"

    save_log(predictions)

    outcome_str = "CORRECT" if outcome == 1 else "WRONG"
    color = '\033[92m' if outcome == 1 else '\033[91m'
    reset = '\033[0m'

    print(f"\n  PREDICTION #{pred_id} RESOLVED")
    print(f"  {target['ticker']}: {target['question']}")
    print(f"  Forecast: {target['probability']:.0%}")
    print(f"  Outcome: {color}{outcome_str}{reset}")
    print(f"  Brier score: {brier:.4f} (lower is better, 0 = perfect, 0.25 = uninformed)")
    print()


def show_stats():
    predictions = load_log()

    total = len(predictions)
    resolved = [p for p in predictions if p["status"] == "RESOLVED"]
    open_preds = [p for p in predictions if p["status"] == "OPEN"]

    print(f"\n  {'='*55}")
    print(f"  CALIBRATION DASHBOARD")
    print(f"  {'='*55}")
    print(f"\n  Total predictions: {total}")
    print(f"  Resolved: {len(resolved)}")
    print(f"  Open: {len(open_preds)}")

    report = score_calibration([
        Forecast(probability=p["probability"], outcome=p["outcome"]) for p in resolved
    ])

    if len(resolved) < MIN_RESOLVED_FOR_STATS:
        print(f"\n  Need at least {MIN_RESOLVED_FOR_STATS} resolved predictions for meaningful stats.")
        print(f"  Keep logging predictions — calibration improves with data.\n")

        if resolved:
            print(f"  Mean Brier: {report.mean_brier:.4f}")

        if open_preds:
            print(f"\n  Open predictions:")
            for p in open_preds:
                print(f"    #{p['id']} {p['ticker']}: {p['question']} (P={p['probability']:.0%}, resolves {p['timeframe']})")
        print()
        return

    print(f"\n  Mean Brier score: {report.mean_brier:.4f}")
    print(f"  ({0} = perfect, {UNINFORMED_BRIER} = uninformed, lower = better)".format(0))

    if report.mean_brier < GOOD_BRIER:
        print(f"  \033[92mGood calibration\033[0m")
    elif report.mean_brier < UNINFORMED_BRIER:
        print(f"  \033[93mModerate — room for improvement\033[0m")
    else:
        print(f"  \033[91mPoor — predictions are less informative than guessing 50%\033[0m")

    print(f"\n  Calibration by confidence bucket:")
    print(f"  {'Bucket':<12} {'Count':>6} {'Avg Forecast':>13} {'Actual Rate':>12} {'Gap':>8}")
    print(f"  {'-'*12} {'-'*6} {'-'*13} {'-'*12} {'-'*8}")

    for b in report.buckets:
        color = '\033[92m' if b.calibrated else '\033[91m'
        reset = '\033[0m'
        print(f"  {b.low:.0%}-{b.high:.0%}       {b.count:>6} {b.avg_forecast:>12.0%} {b.actual_rate:>11.0%} {color}{b.gap:>+7.0%}{reset}")

    if report.overconfident:
        print(f"\n  \033[91mOVERCONFIDENCE DETECTED: {report.overconfidence_detail[0].lower()}{report.overconfidence_detail[1:].rstrip('.')}\033[0m")

    if open_preds:
        print(f"\n  Open predictions:")
        for p in open_preds:
            print(f"    #{p['id']} {p['ticker']}: {p['question']} (P={p['probability']:.0%}, resolves {p['timeframe']})")

    print()


def main():
    parser = argparse.ArgumentParser(description="Calibration scoring for TFG")
    subparsers = parser.add_subparsers(dest="command")

    log = subparsers.add_parser("log")
    log.add_argument("--ticker", required=True)
    log.add_argument("--question", required=True)
    log.add_argument("--probability", type=float, required=True)
    log.add_argument("--timeframe", required=True)

    res = subparsers.add_parser("resolve")
    res.add_argument("--id", type=int, required=True)
    res.add_argument("--outcome", type=int, required=True, choices=[0, 1])

    subparsers.add_parser("stats")

    args = parser.parse_args()

    if args.command == "log":
        log_prediction(args.ticker, args.question, args.probability, args.timeframe)
    elif args.command == "resolve":
        resolve_prediction(args.id, args.outcome)
    elif args.command == "stats":
        show_stats()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
