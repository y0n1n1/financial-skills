"""
Monte Carlo EV Simulator for The Financial Gauntlet
Propagates uncertainty through the revenue × multiple matrix to produce
an EV DISTRIBUTION, not a point estimate.

Usage:
  python3 monte_carlo_ev.py --ticker NVDA --current-mcap 4400 \
    --revenue-scenarios '365,300,240,180' --revenue-probs '0.20,0.40,0.25,0.15' \
    --revenue-stds '40,30,25,30' \
    --multiple-scenarios '30,22,15' --multiple-probs '0.20,0.50,0.30' \
    --margin 0.65 --n 100000

Output: EV distribution stats + histogram data for visualization
"""

import argparse
import numpy as np
import json
import sys


def run_monte_carlo(
    current_mcap: float,
    revenue_scenarios: list[float],
    revenue_probs: list[float],
    revenue_stds: list[float],
    multiple_scenarios: list[float],
    multiple_probs: list[float],
    net_margin: float = 0.65,
    n_simulations: int = 100_000,
    seed: int = 42,
) -> dict:
    """
    Run Monte Carlo simulation on the revenue × multiple matrix.

    Each simulation:
    1. Draw a revenue scenario (weighted by probs)
    2. Add Gaussian noise (std from revenue_stds)
    3. Draw a multiple scenario (weighted by probs)
    4. Compute implied market cap = revenue × margin × multiple
    5. Compute return vs current market cap
    """
    rng = np.random.default_rng(seed)

    # Draw revenue scenarios
    rev_indices = rng.choice(len(revenue_scenarios), size=n_simulations, p=revenue_probs)
    rev_means = np.array([revenue_scenarios[i] for i in rev_indices])
    rev_stds = np.array([revenue_stds[i] for i in rev_indices])
    revenues = rng.normal(rev_means, rev_stds)
    revenues = np.maximum(revenues, 50)  # floor at $50B (company doesn't disappear)

    # Draw multiple scenarios
    mult_indices = rng.choice(len(multiple_scenarios), size=n_simulations, p=multiple_probs)
    multiples = np.array([multiple_scenarios[i] for i in mult_indices])

    # Add noise to multiples too (±20% of the multiple)
    multiple_noise = rng.normal(1.0, 0.10, n_simulations)
    multiples = multiples * multiple_noise
    multiples = np.maximum(multiples, 5)  # floor at 5x

    # Compute implied market caps and returns
    earnings = revenues * net_margin
    market_caps = earnings * multiples
    returns = (market_caps - current_mcap) / current_mcap

    # Statistics
    ev_mean = float(np.mean(returns))
    ev_median = float(np.median(returns))
    ev_std = float(np.std(returns))
    percentiles = {
        "p5": float(np.percentile(returns, 5)),
        "p10": float(np.percentile(returns, 10)),
        "p25": float(np.percentile(returns, 25)),
        "p50": float(np.percentile(returns, 50)),
        "p75": float(np.percentile(returns, 75)),
        "p90": float(np.percentile(returns, 90)),
        "p95": float(np.percentile(returns, 95)),
    }

    p_positive = float(np.mean(returns > 0))
    p_negative = float(np.mean(returns < 0))

    # Win/loss stats for Kelly
    wins = returns[returns > 0]
    losses = returns[returns < 0]
    avg_win = float(np.mean(wins)) if len(wins) > 0 else 0
    avg_loss = float(np.mean(np.abs(losses))) if len(losses) > 0 else 0
    win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else float('inf')

    # Kelly fraction
    if avg_loss > 0 and win_loss_ratio > 0:
        kelly = (p_positive * win_loss_ratio - p_negative) / win_loss_ratio
    else:
        kelly = 0

    # Histogram bins for visualization
    hist_counts, hist_edges = np.histogram(returns, bins=50)
    histogram = {
        "counts": hist_counts.tolist(),
        "edges": hist_edges.tolist(),
    }

    return {
        "n_simulations": n_simulations,
        "ev_mean": ev_mean,
        "ev_median": ev_median,
        "ev_std": ev_std,
        "percentiles": percentiles,
        "p_positive": p_positive,
        "p_negative": p_negative,
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "win_loss_ratio": win_loss_ratio,
        "kelly_fraction": kelly,
        "kelly_quarter": kelly * 0.25,
        "histogram": histogram,
    }


def print_results(results: dict, ticker: str):
    """Pretty-print Monte Carlo results."""
    print(f"\n{'='*60}")
    print(f"  MONTE CARLO EV — {ticker}")
    print(f"  {results['n_simulations']:,} simulations")
    print(f"{'='*60}\n")

    ev = results['ev_mean']
    color = '\033[92m' if ev > 0 else '\033[91m'
    reset = '\033[0m'

    print(f"  EV (mean):    {color}{ev:+.1%}{reset}")
    print(f"  EV (median):  {results['ev_median']:+.1%}")
    print(f"  Std dev:      {results['ev_std']:.1%}")
    print()
    print(f"  Distribution:")
    print(f"    5th pctl:   {results['percentiles']['p5']:+.1%}")
    print(f"    25th pctl:  {results['percentiles']['p25']:+.1%}")
    print(f"    50th pctl:  {results['percentiles']['p50']:+.1%}")
    print(f"    75th pctl:  {results['percentiles']['p75']:+.1%}")
    print(f"    95th pctl:  {results['percentiles']['p95']:+.1%}")
    print()
    print(f"  P(positive):  {results['p_positive']:.1%}")
    print(f"  P(negative):  {results['p_negative']:.1%}")
    print(f"  Avg win:      {results['avg_win']:+.1%}")
    print(f"  Avg loss:     {results['avg_loss']:.1%}")
    print(f"  Win/loss:     {results['win_loss_ratio']:.2f}:1")
    print()

    kelly = results['kelly_fraction']
    kelly_color = '\033[92m' if kelly > 0 else '\033[91m'
    print(f"  Kelly:        {kelly_color}{kelly:+.2%}{reset}")
    print(f"  Quarter Kelly:{kelly_color}{results['kelly_quarter']:+.2%}{reset}")

    red = '\033[91m'
    yellow = '\033[93m'
    green_c = '\033[92m'
    if kelly < 0:
        print(f"\n  {red}NEGATIVE KELLY — trade has negative expected value{reset}")
    elif kelly > 0 and kelly < 0.05:
        print(f"\n  {yellow}MARGINAL — barely positive EV, size very small{reset}")
    elif kelly > 0:
        print(f"\n  {green_c}POSITIVE EV — size according to quarter Kelly{reset}")

    print(f"\n{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(description="Monte Carlo EV for TFG")
    parser.add_argument("--ticker", required=True)
    parser.add_argument("--current-mcap", type=float, required=True, help="Current market cap in $B")
    parser.add_argument("--revenue-scenarios", required=True, help="Comma-separated revenue scenarios in $B")
    parser.add_argument("--revenue-probs", required=True, help="Comma-separated probabilities")
    parser.add_argument("--revenue-stds", required=True, help="Comma-separated std devs in $B")
    parser.add_argument("--multiple-scenarios", required=True, help="Comma-separated P/E multiples")
    parser.add_argument("--multiple-probs", required=True, help="Comma-separated probabilities")
    parser.add_argument("--margin", type=float, default=0.65, help="Net margin assumption")
    parser.add_argument("--n", type=int, default=100_000, help="Number of simulations")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    rev_scenarios = [float(x) for x in args.revenue_scenarios.split(",")]
    rev_probs = [float(x) for x in args.revenue_probs.split(",")]
    rev_stds = [float(x) for x in args.revenue_stds.split(",")]
    mult_scenarios = [float(x) for x in args.multiple_scenarios.split(",")]
    mult_probs = [float(x) for x in args.multiple_probs.split(",")]

    results = run_monte_carlo(
        current_mcap=args.current_mcap,
        revenue_scenarios=rev_scenarios,
        revenue_probs=rev_probs,
        revenue_stds=rev_stds,
        multiple_scenarios=mult_scenarios,
        multiple_probs=mult_probs,
        net_margin=args.margin,
        n_simulations=args.n,
    )

    if args.json:
        # Remove histogram for cleaner JSON output
        results_clean = {k: v for k, v in results.items() if k != "histogram"}
        print(json.dumps(results_clean, indent=2))
    else:
        print_results(results, args.ticker)


if __name__ == "__main__":
    main()
