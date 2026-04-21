"""
Position Lifecycle Management for TFG v6
Every stock moves through defined states with specific rules per state.

States: DISCOVERY → WATCHING → ENTERING → ACCUMULATING → STEADY → DISTRIBUTING → EXITING → CLOSED

Usage:
  python3 lifecycle.py status
  python3 lifecycle.py transition NVDA WATCHING
  python3 lifecycle.py history NVDA
"""

import argparse
import json
import os
from datetime import datetime

LIFECYCLE_FILE = os.path.join(os.path.dirname(__file__), "..", "lifecycle.json")

STATES = {
    "DISCOVERY": {
        "description": "Researching. No gauntlet run yet.",
        "allowed_actions": ["research", "screen", "profile"],
        "next_states": ["WATCHING", "DROPPED"],
        "entry_rule": "Stock identified via screener or thesis formation",
        "exit_rule": "Gauntlet complete with lab report",
    },
    "WATCHING": {
        "description": "Gauntlet complete. Waiting for entry trigger.",
        "allowed_actions": ["monitor_parameters", "re_run_gauntlet", "update_intuition"],
        "next_states": ["ENTERING", "DROPPED", "DISCOVERY"],
        "entry_rule": "v6 gauntlet complete, lab report written, EV computed",
        "exit_rule": "Entry trigger fires (price/regime/catalyst) AND EV flips positive",
    },
    "ENTERING": {
        "description": "Building initial position. Tranche 1.",
        "allowed_actions": ["buy_tranche", "set_stop", "monitor"],
        "next_states": ["ACCUMULATING", "EXITING"],
        "entry_rule": "EV is positive, Kelly > 0, entry trigger confirmed",
        "exit_rule": "Initial tranche placed, stop-loss set",
        "sizing_rule": "Quarter Kelly for first tranche. Max 25% of target position.",
    },
    "ACCUMULATING": {
        "description": "Adding on confirmation or price improvement.",
        "allowed_actions": ["buy_tranche", "monitor", "re_run_gauntlet"],
        "next_states": ["STEADY", "EXITING"],
        "entry_rule": "Theory confirmed by new data (earnings, parameters clear)",
        "exit_rule": "Target position reached OR theory weakens",
        "sizing_rule": "Each tranche = 25% of target. Re-run EV before each add.",
    },
    "STEADY": {
        "description": "Full position. Monitoring parameters.",
        "allowed_actions": ["monitor", "re_run_gauntlet", "trim"],
        "next_states": ["DISTRIBUTING", "EXITING"],
        "entry_rule": "Full target position reached",
        "exit_rule": "Price target hit, parameter triggers, or thesis evolves",
    },
    "DISTRIBUTING": {
        "description": "Taking profits. Trimming on thesis confirmation.",
        "allowed_actions": ["sell_tranche", "monitor"],
        "next_states": ["STEADY", "EXITING", "CLOSED"],
        "entry_rule": "Price target hit OR conviction drops to 3/5 from 4-5/5",
        "exit_rule": "Position reduced to target OR fully exited",
        "sizing_rule": "Trim 25% at each price target level. Keep core if thesis holds.",
    },
    "EXITING": {
        "description": "Parameter triggered. Reducing to zero.",
        "allowed_actions": ["sell_all", "sell_tranche"],
        "next_states": ["CLOSED"],
        "entry_rule": "EXIT-level parameter triggered OR EV flips strongly negative",
        "exit_rule": "Position = 0",
    },
    "CLOSED": {
        "description": "Position exited. Post-mortem required.",
        "allowed_actions": ["post_mortem", "archive"],
        "next_states": ["DISCOVERY"],  # re-entry via /re-entry protocol
        "entry_rule": "Position fully exited",
        "exit_rule": "Post-mortem complete. Can re-enter via /re-entry protocol.",
    },
    "DROPPED": {
        "description": "Decided not to pursue. Archived.",
        "allowed_actions": ["archive"],
        "next_states": ["DISCOVERY"],
        "entry_rule": "Gauntlet shows no trade OR research abandoned",
    },
}


def load_lifecycle() -> dict:
    if os.path.exists(LIFECYCLE_FILE):
        with open(LIFECYCLE_FILE) as f:
            return json.load(f)
    return {"stocks": {}, "history": []}


def save_lifecycle(data: dict):
    with open(LIFECYCLE_FILE, "w") as f:
        json.dump(data, f, indent=2)


def get_status(data: dict):
    print(f"\n{'='*60}")
    print(f"  POSITION LIFECYCLE — {datetime.now().strftime('%Y-%m-%d')}")
    print(f"{'='*60}\n")

    if not data["stocks"]:
        print("  No stocks tracked yet.")
        # Auto-populate from theory cards
        theories_dir = os.path.join(os.path.dirname(__file__), "..", "theories")
        if os.path.exists(theories_dir):
            for f in os.listdir(theories_dir):
                if f.endswith(".md") and f != "TEMPLATE.md":
                    ticker = f.replace(".md", "")
                    data["stocks"][ticker] = {
                        "state": "WATCHING" if ticker in ["NVDA", "GOOGL"] else "DISCOVERY",
                        "entered_state": datetime.now().isoformat(),
                        "notes": "auto-populated from theory card",
                    }
            save_lifecycle(data)
            print("  Auto-populated from theory cards.\n")

    for ticker, info in sorted(data["stocks"].items()):
        state = info["state"]
        s = STATES[state]
        entered = info.get("entered_state", "")[:10]

        color = {
            "DISCOVERY": "\033[93m", "WATCHING": "\033[96m",
            "ENTERING": "\033[92m", "ACCUMULATING": "\033[92m",
            "STEADY": "\033[92m", "DISTRIBUTING": "\033[93m",
            "EXITING": "\033[91m", "CLOSED": "\033[90m",
            "DROPPED": "\033[90m",
        }.get(state, "")
        reset = "\033[0m"

        print(f"  {ticker:<8} {color}{state:<15}{reset} since {entered}")
        print(f"           {s['description']}")
        if info.get("notes"):
            print(f"           Note: {info['notes']}")
        print(f"           Next: {' | '.join(s['next_states'])}")
        print()

    print(f"  STATES: {' → '.join(['DISCOVERY','WATCHING','ENTERING','ACCUMULATING','STEADY','DISTRIBUTING','EXITING','CLOSED'])}")
    print()


def transition(data: dict, ticker: str, new_state: str, note: str = ""):
    ticker = ticker.upper()
    new_state = new_state.upper()

    if new_state not in STATES:
        print(f"  Invalid state: {new_state}")
        print(f"  Valid: {', '.join(STATES.keys())}")
        return

    current = data["stocks"].get(ticker, {}).get("state", "DISCOVERY")
    allowed = STATES[current]["next_states"]

    if new_state not in allowed:
        print(f"  BLOCKED: {ticker} is in {current}, can only move to: {', '.join(allowed)}")
        print(f"  Requested: {new_state}")
        return

    # Check entry rule
    entry_rule = STATES[new_state]["entry_rule"]
    print(f"\n  TRANSITION: {ticker} {current} → {new_state}")
    print(f"  Entry rule: {entry_rule}")

    old_state = current
    data["stocks"][ticker] = {
        "state": new_state,
        "entered_state": datetime.now().isoformat(),
        "previous_state": old_state,
        "notes": note,
    }

    data["history"].append({
        "date": datetime.now().isoformat(),
        "ticker": ticker,
        "from": old_state,
        "to": new_state,
        "note": note,
    })

    save_lifecycle(data)
    print(f"  Done. {ticker} is now {new_state}.\n")


def show_history(data: dict, ticker: str = None):
    history = data.get("history", [])
    if ticker:
        history = [h for h in history if h["ticker"] == ticker.upper()]

    print(f"\n  LIFECYCLE HISTORY{f' — {ticker.upper()}' if ticker else ''}")
    print(f"  {'-'*50}")
    for h in history[-20:]:
        print(f"  {h['date'][:10]} {h['ticker']:<8} {h['from']:<12} → {h['to']:<12} {h.get('note','')}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Position Lifecycle for TFG")
    parser.add_argument("command", choices=["status", "transition", "history"])
    parser.add_argument("ticker", nargs="?")
    parser.add_argument("state", nargs="?")
    parser.add_argument("--note", default="")
    args = parser.parse_args()

    data = load_lifecycle()

    if args.command == "status":
        get_status(data)
    elif args.command == "transition":
        if not args.ticker or not args.state:
            print("Usage: lifecycle.py transition TICKER STATE [--note 'reason']")
            return
        transition(data, args.ticker, args.state, args.note)
    elif args.command == "history":
        show_history(data, args.ticker)


if __name__ == "__main__":
    main()
