"""
Pre-Registration System for TFG
Write down your prior and update expectations BEFORE running analysis.
Compares post-analysis posterior to pre-registered predictions to detect motivated reasoning.

Usage:
  # Before analysis:
  python3 pre_register.py register --ticker NVDA --prior 0.40 \
    --expected-posterior 0.35 --expected-direction "slightly bearish" \
    --key-evidence "OpenAI AMD deal should push posterior down 5-10pp"

  # After analysis:
  python3 pre_register.py compare --ticker NVDA --actual-posterior 0.35

  # View all registrations:
  python3 pre_register.py list
"""

import argparse
import json
import os
from datetime import datetime

from _tfg_path import ensure_tfg_core_importable

ensure_tfg_core_importable()

from tfg_core.prereg import compare as score_prereg

REGISTRY_FILE = os.path.join(os.path.dirname(__file__), "..", "pre_registrations.json")


def load_registry() -> list:
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE) as f:
            return json.load(f)
    return []


def save_registry(data: list):
    with open(REGISTRY_FILE, "w") as f:
        json.dump(data, f, indent=2)


def register(ticker: str, prior: float, expected_posterior: float,
             expected_direction: str, key_evidence: str):
    registry = load_registry()

    entry = {
        "id": len(registry) + 1,
        "ticker": ticker,
        "date_registered": datetime.now().isoformat(),
        "prior": prior,
        "expected_posterior": expected_posterior,
        "expected_direction": expected_direction,
        "key_evidence_expected": key_evidence,
        "actual_posterior": None,
        "divergence": None,
        "motivated_reasoning_flag": None,
        "status": "REGISTERED",
    }

    registry.append(entry)
    save_registry(registry)

    print(f"\n  PRE-REGISTRATION #{entry['id']} — {ticker}")
    print(f"  Date: {entry['date_registered'][:10]}")
    print(f"  Prior: {prior:.0%}")
    print(f"  Expected posterior: {expected_posterior:.0%}")
    print(f"  Expected direction: {expected_direction}")
    print(f"  Key evidence: {key_evidence}")
    print(f"  Status: REGISTERED (run analysis, then compare)\n")


def compare(ticker: str, actual_posterior: float):
    registry = load_registry()

    # Find most recent unresolved registration for this ticker
    target = None
    for entry in reversed(registry):
        if entry["ticker"] == ticker and entry["status"] == "REGISTERED":
            target = entry
            break

    if target is None:
        print(f"\n  No open pre-registration found for {ticker}.")
        print(f"  Register first: python3 pre_register.py register --ticker {ticker} ...\n")
        return

    expected = target["expected_posterior"]
    scored = score_prereg(
        expected_posterior=expected,
        actual_posterior=actual_posterior,
        expected_direction=target["expected_direction"],
    )
    divergence = scored.divergence
    flag = scored.motivated_reasoning_flag
    flag_reason = scored.reason

    target["actual_posterior"] = actual_posterior
    target["divergence"] = divergence
    target["motivated_reasoning_flag"] = flag
    target["flag_reason"] = flag_reason
    target["date_compared"] = datetime.now().isoformat()
    target["status"] = "COMPARED"

    save_registry(registry)

    color = '\033[91m' if flag else '\033[92m'
    reset = '\033[0m'

    print(f"\n  PRE-REGISTRATION COMPARISON — {ticker} #{target['id']}")
    print(f"  {'='*50}")
    print(f"  Expected posterior:  {expected:.0%}")
    print(f"  Actual posterior:    {actual_posterior:.0%}")
    print(f"  Divergence:         {divergence:+.0%}")
    print(f"  {color}{'FLAG: ' + flag_reason if flag else 'CLEAN: ' + flag_reason}{reset}")
    print(f"  {'='*50}\n")


def list_registrations():
    registry = load_registry()

    if not registry:
        print("\n  No pre-registrations yet.\n")
        return

    print(f"\n  {'#':<4} {'Ticker':<8} {'Date':<12} {'Prior':>6} {'Expected':>9} {'Actual':>8} {'Div':>6} {'Flag':>5}")
    print(f"  {'-'*4} {'-'*8} {'-'*12} {'-'*6} {'-'*9} {'-'*8} {'-'*6} {'-'*5}")

    for e in registry:
        actual = f"{e['actual_posterior']:.0%}" if e['actual_posterior'] is not None else "—"
        div = f"{e['divergence']:+.0%}" if e['divergence'] is not None else "—"
        flag = "YES" if e.get('motivated_reasoning_flag') else "no" if e['status'] == 'COMPARED' else "—"
        print(f"  {e['id']:<4} {e['ticker']:<8} {e['date_registered'][:10]:<12} {e['prior']:>5.0%} {e['expected_posterior']:>8.0%} {actual:>8} {div:>6} {flag:>5}")

    # Summary stats
    compared = [e for e in registry if e['status'] == 'COMPARED']
    if len(compared) >= 3:
        flags = sum(1 for e in compared if e.get('motivated_reasoning_flag'))
        avg_div = sum(abs(e['divergence']) for e in compared) / len(compared)
        print(f"\n  Avg absolute divergence: {avg_div:.0%}")
        print(f"  Motivated reasoning flags: {flags}/{len(compared)} ({flags/len(compared):.0%})")

    print()


def main():
    parser = argparse.ArgumentParser(description="Pre-registration for TFG")
    subparsers = parser.add_subparsers(dest="command")

    reg = subparsers.add_parser("register")
    reg.add_argument("--ticker", required=True)
    reg.add_argument("--prior", type=float, required=True)
    reg.add_argument("--expected-posterior", type=float, required=True)
    reg.add_argument("--expected-direction", required=True)
    reg.add_argument("--key-evidence", required=True)

    comp = subparsers.add_parser("compare")
    comp.add_argument("--ticker", required=True)
    comp.add_argument("--actual-posterior", type=float, required=True)

    subparsers.add_parser("list")

    args = parser.parse_args()

    if args.command == "register":
        register(args.ticker, args.prior, args.expected_posterior,
                args.expected_direction, args.key_evidence)
    elif args.command == "compare":
        compare(args.ticker, args.actual_posterior)
    elif args.command == "list":
        list_registrations()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
