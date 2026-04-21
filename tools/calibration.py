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
import numpy as np
from datetime import datetime

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

    # Brier score = (forecast - outcome)^2
    brier = (target["probability"] - outcome) ** 2

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

    if len(resolved) < 3:
        print(f"\n  Need at least 3 resolved predictions for meaningful stats.")
        print(f"  Keep logging predictions — calibration improves with data.\n")

        # Still show what we have
        if resolved:
            briers = [p["brier_score"] for p in resolved]
            print(f"  Mean Brier: {np.mean(briers):.4f}")

        if open_preds:
            print(f"\n  Open predictions:")
            for p in open_preds:
                print(f"    #{p['id']} {p['ticker']}: {p['question']} (P={p['probability']:.0%}, resolves {p['timeframe']})")
        print()
        return

    briers = [p["brier_score"] for p in resolved]
    probs = [p["probability"] for p in resolved]
    outcomes = [p["outcome"] for p in resolved]

    mean_brier = np.mean(briers)
    correct_count = sum(outcomes)

    print(f"\n  Mean Brier score: {mean_brier:.4f}")
    print(f"  (0 = perfect, 0.25 = uninformed, lower = better)")

    if mean_brier < 0.15:
        print(f"  \033[92mGood calibration\033[0m")
    elif mean_brier < 0.25:
        print(f"  \033[93mModerate — room for improvement\033[0m")
    else:
        print(f"  \033[91mPoor — predictions are less informative than guessing 50%\033[0m")

    # Calibration by bucket
    buckets = [(0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.01)]
    print(f"\n  Calibration by confidence bucket:")
    print(f"  {'Bucket':<12} {'Count':>6} {'Avg Forecast':>13} {'Actual Rate':>12} {'Gap':>8}")
    print(f"  {'-'*12} {'-'*6} {'-'*13} {'-'*12} {'-'*8}")

    for low, high in buckets:
        in_bucket = [(p, o) for p, o in zip(probs, outcomes) if low <= p < high]
        if in_bucket:
            avg_p = np.mean([p for p, o in in_bucket])
            actual_rate = np.mean([o for p, o in in_bucket])
            gap = actual_rate - avg_p
            color = '\033[92m' if abs(gap) < 0.10 else '\033[91m'
            reset = '\033[0m'
            print(f"  {low:.0%}-{high:.0%}       {len(in_bucket):>6} {avg_p:>12.0%} {actual_rate:>11.0%} {color}{gap:>+7.0%}{reset}")

    # Overconfidence check
    high_conf = [(p, o) for p, o in zip(probs, outcomes) if p > 0.7]
    low_conf = [(p, o) for p, o in zip(probs, outcomes) if p < 0.3]

    if high_conf:
        high_actual = np.mean([o for _, o in high_conf])
        high_avg_p = np.mean([p for p, _ in high_conf])
        if high_actual < high_avg_p - 0.15:
            print(f"\n  \033[91mOVERCONFIDENCE DETECTED: high-confidence calls ({high_avg_p:.0%} avg) are right only {high_actual:.0%} of the time\033[0m")

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
