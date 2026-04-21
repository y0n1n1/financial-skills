"""
Parameter Monitoring with Pre-Specified Update Rules for TFG
Eliminates motivated reasoning by writing update rules BEFORE observing data.

Usage:
  # Define parameters for a stock:
  python3 parameter_monitor.py define --ticker NVDA --config investing/parameters/nvda.yaml

  # Check a parameter against its rules:
  python3 parameter_monitor.py check --ticker NVDA --param capex_language --value -0.1

  # Check all parameters for a stock:
  python3 parameter_monitor.py check-all --ticker NVDA

  # List all monitored parameters:
  python3 parameter_monitor.py list
"""

import argparse
import json
import os
import yaml
from datetime import datetime

PARAMS_DIR = os.path.join(os.path.dirname(__file__), "..", "parameters")


def ensure_dir():
    os.makedirs(PARAMS_DIR, exist_ok=True)


def get_config_path(ticker: str) -> str:
    return os.path.join(PARAMS_DIR, f"{ticker.lower()}.yaml")


def define_parameters(ticker: str, config_path: str = None):
    """Create a parameter config from a YAML file or interactively."""
    ensure_dir()
    dest = get_config_path(ticker)

    if config_path and os.path.exists(config_path):
        with open(config_path) as f:
            config = yaml.safe_load(f)
        with open(dest, "w") as f:
            yaml.dump(config, f, default_flow_style=False)
        print(f"\n  Parameters defined for {ticker} from {config_path}")
        print(f"  Saved to {dest}\n")
        return

    # Create template
    template = {
        "ticker": ticker,
        "date_defined": datetime.now().isoformat()[:10],
        "parameters": {
            "example_param": {
                "description": "Description of what this parameter measures",
                "source": "Where to get the data",
                "measurement": "What units / scale",
                "current_value": 0.0,
                "last_checked": datetime.now().isoformat()[:10],
                "check_frequency": "quarterly",
                "update_rules": [
                    {"condition": "value < -0.3", "action": "apply STRONG_AGAINST to posterior"},
                    {"condition": "value < 0", "action": "apply MODERATE_AGAINST to posterior"},
                    {"condition": "value > 0.6", "action": "apply MODERATE_FOR to posterior"},
                ],
            }
        },
        "history": [],
    }

    with open(dest, "w") as f:
        yaml.dump(template, f, default_flow_style=False)

    print(f"\n  Template created at {dest}")
    print(f"  Edit the YAML to define actual parameters.\n")


def check_parameter(ticker: str, param_name: str, value: float):
    """Check a parameter value against its pre-specified rules."""
    config_path = get_config_path(ticker)

    if not os.path.exists(config_path):
        print(f"\n  No parameters defined for {ticker}. Run 'define' first.\n")
        return

    with open(config_path) as f:
        config = yaml.safe_load(f)

    if param_name not in config.get("parameters", {}):
        print(f"\n  Parameter '{param_name}' not found for {ticker}.")
        print(f"  Available: {', '.join(config.get('parameters', {}).keys())}\n")
        return

    param = config["parameters"][param_name]
    old_value = param.get("current_value", None)

    # Check rules (most severe first — rules should be ordered by severity)
    triggered_rules = []
    for rule in param.get("update_rules", []):
        condition = rule["condition"]
        # Simple eval — only supports: value < X, value > X, value == X
        try:
            if eval(condition, {"value": value, "__builtins__": {}}):
                triggered_rules.append(rule)
        except Exception:
            pass

    # Log the check
    history_entry = {
        "date": datetime.now().isoformat(),
        "param": param_name,
        "old_value": old_value,
        "new_value": value,
        "rules_triggered": [r["action"] for r in triggered_rules],
    }

    if "history" not in config:
        config["history"] = []
    config["history"].append(history_entry)

    # Update current value
    config["parameters"][param_name]["current_value"] = value
    config["parameters"][param_name]["last_checked"] = datetime.now().isoformat()[:10]

    with open(config_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)

    # Print results
    print(f"\n  PARAMETER CHECK — {ticker} / {param_name}")
    print(f"  {'='*50}")
    print(f"  Previous: {old_value}")
    print(f"  Current:  {value}")

    if old_value is not None:
        change = value - old_value
        print(f"  Change:   {change:+.3f}")

    if triggered_rules:
        print(f"\n  RULES TRIGGERED:")
        for rule in triggered_rules:
            print(f"  \033[91m  → {rule['condition']}: {rule['action']}\033[0m")
    else:
        print(f"\n  \033[92m  No rules triggered. Parameter within normal range.\033[0m")

    print(f"  {'='*50}\n")


def list_parameters():
    """List all monitored parameters across all stocks."""
    ensure_dir()
    files = [f for f in os.listdir(PARAMS_DIR) if f.endswith(".yaml")]

    if not files:
        print("\n  No parameters defined. Run 'define' first.\n")
        return

    print(f"\n  {'='*65}")
    print(f"  MONITORED PARAMETERS")
    print(f"  {'='*65}\n")

    for f in sorted(files):
        with open(os.path.join(PARAMS_DIR, f)) as fh:
            config = yaml.safe_load(fh)

        ticker = config.get("ticker", f.replace(".yaml", "").upper())
        params = config.get("parameters", {})

        print(f"  {ticker} ({len(params)} parameters)")
        for name, p in params.items():
            val = p.get("current_value", "—")
            last = p.get("last_checked", "never")
            freq = p.get("check_frequency", "—")
            rules = len(p.get("update_rules", []))
            val_str = str(val) if val is not None else "—"
            print(f"    {name:<30} val={val_str:<8} last={last} freq={freq} rules={rules}")

        # Show recent history
        history = config.get("history", [])
        if history:
            recent = history[-3:]
            print(f"    Recent checks:")
            for h in recent:
                triggered = ", ".join(h.get("rules_triggered", [])) or "none"
                print(f"      {h['date'][:10]} {h['param']}: {h.get('old_value')}→{h.get('new_value')} [{triggered}]")
        print()


def main():
    parser = argparse.ArgumentParser(description="Parameter monitoring for TFG")
    subparsers = parser.add_subparsers(dest="command")

    d = subparsers.add_parser("define")
    d.add_argument("--ticker", required=True)
    d.add_argument("--config", default=None)

    c = subparsers.add_parser("check")
    c.add_argument("--ticker", required=True)
    c.add_argument("--param", required=True)
    c.add_argument("--value", type=float, required=True)

    subparsers.add_parser("list")

    args = parser.parse_args()

    if args.command == "define":
        define_parameters(args.ticker, args.config)
    elif args.command == "check":
        check_parameter(args.ticker, args.param, args.value)
    elif args.command == "list":
        list_parameters()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
