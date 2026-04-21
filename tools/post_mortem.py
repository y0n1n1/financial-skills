"""
Post-Mortem System for TFG v6
Runs on every closed position. Structured template + meta-analysis.

Usage:
  python3 post_mortem.py create NVDA --outcome loss --return -15
  python3 post_mortem.py meta  # aggregate analysis across all post-mortems
"""

import argparse
import json
import os
from datetime import datetime

PM_DIR = os.path.join(os.path.dirname(__file__), "..", "post-mortems")


def create_post_mortem(ticker: str, outcome: str, return_pct: float):
    os.makedirs(PM_DIR, exist_ok=True)

    date = datetime.now().strftime("%Y-%m-%d")
    filename = f"{date}-{ticker.upper()}.md"
    filepath = os.path.join(PM_DIR, filename)

    template = f"""---
ticker: {ticker.upper()}
date: {date}
outcome: {outcome}
return_pct: {return_pct}
system_version: 6.0.0
---

# Post-Mortem: {ticker.upper()} — {date}

## Outcome
- Result: {outcome.upper()}
- Return: {return_pct:+.1f}%
- Holding period: [fill in]

## 1. Thesis Accuracy
Which theory points were true? Which were false?
- Point 1: [TRUE/FALSE] — [what happened]
- Point 2: [TRUE/FALSE] — [what happened]

## 2. Process Accuracy
Did the gauntlet correctly identify the key risks?
- Pre-mortem most dangerous narrative: [did it happen?]
- Parameters: [did they trigger at the right time?]
- Were there risks the system missed entirely?

## 3. Sizing Accuracy
Was Kelly sizing appropriate given actual outcome volatility?
- Position size: [what was it]
- Actual volatility: [what was it]
- Was the size too large/small for the realized risk?

## 4. Parameter Accuracy
Did parameters trigger at the right time?
- Which triggered: [list]
- Which should have triggered but didn't: [list]
- False alarms: [list]

## 5. Information Attribution
What data would have changed the outcome?
- Available but missed: [list]
- Genuinely unavailable at decision time: [list]

## 6. Cognitive Bias Audit
Which biases are detectable in retrospect?
- Confirmation bias: [evidence]
- Anchoring: [evidence]
- Overconfidence: [evidence]
- Narrative coherence: [evidence]

## 7. System Improvement
What rule change would have produced a better outcome?
- [specific change]

## 8. Intuition Accuracy
How did Gabriel's intuition scores compare to actuals?
- Q1: scored [X], actual [Y], error [Z]
- Q2: scored [X], actual [Y], error [Z]

## Meta-Tags
- Error type: [contaminated_input / process_violation / internal_inconsistency / structural_omission / correct_process_bad_luck]
- Primary cause: [specific]
- Lens that was most wrong: [which]
- Lens that was most right: [which]
"""

    with open(filepath, "w") as f:
        f.write(template)

    print(f"\n  Post-mortem created: {filepath}")
    print(f"  Fill in the template, then run 'python3 post_mortem.py meta' for aggregation.\n")


def run_meta_analysis():
    if not os.path.exists(PM_DIR):
        print("\n  No post-mortems yet.\n")
        return

    files = [f for f in os.listdir(PM_DIR) if f.endswith(".md")]
    if not files:
        print("\n  No post-mortems yet.\n")
        return

    print(f"\n{'='*50}")
    print(f"  POST-MORTEM META-ANALYSIS")
    print(f"  {len(files)} closed positions")
    print(f"{'='*50}\n")

    # Parse frontmatter from each
    results = []
    for f in files:
        with open(os.path.join(PM_DIR, f)) as fh:
            content = fh.read()
            # Simple frontmatter parse
            if content.startswith("---"):
                fm = content.split("---")[1]
                data = {}
                for line in fm.strip().split("\n"):
                    if ":" in line:
                        k, v = line.split(":", 1)
                        data[k.strip()] = v.strip()
                results.append(data)

    if not results:
        print("  No parseable post-mortems.\n")
        return

    wins = sum(1 for r in results if r.get("outcome") == "win")
    losses = sum(1 for r in results if r.get("outcome") == "loss")
    returns = [float(r.get("return_pct", 0)) for r in results]

    print(f"  Win/Loss: {wins}W / {losses}L ({wins/(wins+losses)*100:.0f}% win rate)" if wins + losses > 0 else "  No resolved trades")
    print(f"  Avg return: {sum(returns)/len(returns):+.1f}%" if returns else "")
    print(f"\n  Need 10+ post-mortems for error type analysis.\n")


def main():
    parser = argparse.ArgumentParser(description="Post-Mortem System for TFG")
    subparsers = parser.add_subparsers(dest="command")

    c = subparsers.add_parser("create")
    c.add_argument("ticker")
    c.add_argument("--outcome", required=True, choices=["win", "loss", "breakeven"])
    c.add_argument("--return", type=float, required=True, dest="return_pct")

    subparsers.add_parser("meta")

    args = parser.parse_args()

    if args.command == "create":
        create_post_mortem(args.ticker, args.outcome, args.return_pct)
    elif args.command == "meta":
        run_meta_analysis()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
