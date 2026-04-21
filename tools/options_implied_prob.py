"""
Options-Implied Scenario Probabilities for TFG
Extracts market-implied probabilities from options data using Black-Scholes.
Replaces subjectively asserted scenario probabilities with market-derived numbers.

Usage:
  python3 options_implied_prob.py --spot 178 --iv 0.39 --rf 0.045 --expiry-years 1.0 \
    --scenarios '130,155,250,360' --labels 'worst,bear,base_top,bull_top'

Output: probability that stock is in each range at expiry
"""

import argparse
import json
import numpy as np
from scipy.stats import norm


def implied_probability_range(
    S: float,      # current spot price
    K_low: float,  # lower strike
    K_high: float, # upper strike
    T: float,      # time to expiry in years
    r: float,      # risk-free rate
    sigma: float,  # implied volatility
) -> float:
    """
    Probability that stock price is between K_low and K_high at expiry T.
    Uses log-normal distribution from Black-Scholes assumptions.
    """
    if T <= 0:
        return 0.0

    # Under risk-neutral measure, S_T ~ LogNormal
    # ln(S_T/S) ~ N((r - 0.5*sigma^2)*T, sigma^2*T)
    mu = (r - 0.5 * sigma**2) * T
    vol = sigma * np.sqrt(T)

    # P(K_low < S_T < K_high) = N(d_high) - N(d_low)
    d_high = (np.log(K_high / S) - mu) / vol
    d_low = (np.log(K_low / S) - mu) / vol

    return float(norm.cdf(d_high) - norm.cdf(d_low))


def implied_probability_below(S, K, T, r, sigma):
    """P(S_T < K)"""
    mu = (r - 0.5 * sigma**2) * T
    vol = sigma * np.sqrt(T)
    d = (np.log(K / S) - mu) / vol
    return float(norm.cdf(d))


def implied_probability_above(S, K, T, r, sigma):
    """P(S_T > K)"""
    return 1.0 - implied_probability_below(S, K, T, r, sigma)


def compute_scenario_probs(
    spot: float,
    iv: float,
    rf: float,
    expiry_years: float,
    scenario_boundaries: list[float],
    scenario_labels: list[str],
) -> list[dict]:
    """
    Given scenario boundaries (sorted ascending), compute probability for each range.
    Boundaries define: [0, b1], [b1, b2], ..., [bn, inf]
    """
    boundaries = sorted(scenario_boundaries)
    scenarios = []

    # Below lowest boundary
    p_below = implied_probability_below(spot, boundaries[0], expiry_years, rf, iv)
    scenarios.append({
        "label": f"Below ${boundaries[0]:.0f}" if len(scenario_labels) == 0 else scenario_labels[0],
        "range": f"$0 - ${boundaries[0]:.0f}",
        "probability": p_below,
        "return": (boundaries[0] * 0.5 - spot) / spot,  # midpoint return estimate
    })

    # Between boundaries
    for i in range(len(boundaries) - 1):
        p = implied_probability_range(spot, boundaries[i], boundaries[i+1], expiry_years, rf, iv)
        label = scenario_labels[i+1] if i+1 < len(scenario_labels) else f"${boundaries[i]:.0f}-${boundaries[i+1]:.0f}"
        midpoint = (boundaries[i] + boundaries[i+1]) / 2
        scenarios.append({
            "label": label,
            "range": f"${boundaries[i]:.0f} - ${boundaries[i+1]:.0f}",
            "probability": p,
            "return": (midpoint - spot) / spot,
        })

    # Above highest boundary
    p_above = implied_probability_above(spot, boundaries[-1], expiry_years, rf, iv)
    label = scenario_labels[-1] if len(scenario_labels) > len(boundaries) else f"Above ${boundaries[-1]:.0f}"
    scenarios.append({
        "label": label,
        "range": f"${boundaries[-1]:.0f}+",
        "probability": p_above,
        "return": (boundaries[-1] * 1.3 - spot) / spot,  # 30% above top boundary
    })

    # Compute implied EV
    ev = sum(s["probability"] * s["return"] for s in scenarios)

    return scenarios, ev


def print_results(scenarios: list[dict], ev: float, spot: float, iv: float, ticker: str):
    print(f"\n{'='*60}")
    print(f"  OPTIONS-IMPLIED PROBABILITIES — {ticker}")
    print(f"  Spot: ${spot:.2f} | IV: {iv:.1%} | 12-month horizon")
    print(f"{'='*60}\n")

    print(f"  {'Scenario':<20} {'Range':<18} {'Prob':>8} {'Return':>10}")
    print(f"  {'-'*20} {'-'*18} {'-'*8} {'-'*10}")

    for s in scenarios:
        p = s['probability']
        r = s['return']
        color = '\033[92m' if r > 0 else '\033[91m'
        reset = '\033[0m'
        print(f"  {s['label']:<20} {s['range']:<18} {p:>7.1%} {color}{r:>+9.1%}{reset}")

    print(f"\n  Market-implied EV: {ev:+.1%}")
    print(f"  P(positive return): {sum(s['probability'] for s in scenarios if s['return'] > 0):.1%}")
    print(f"  P(negative return): {sum(s['probability'] for s in scenarios if s['return'] < 0):.1%}")

    print(f"\n  USE: Compare these probabilities against your model's scenario weights.")
    print(f"  If your model says Bull=35% but options say Bull=12%, you're claiming")
    print(f"  to know something the market doesn't. Articulate what or adjust.\n")


def main():
    parser = argparse.ArgumentParser(description="Options-implied probabilities for TFG")
    parser.add_argument("--ticker", default="NVDA")
    parser.add_argument("--spot", type=float, required=True, help="Current stock price")
    parser.add_argument("--iv", type=float, required=True, help="Implied volatility (annualized, as decimal)")
    parser.add_argument("--rf", type=float, default=0.045, help="Risk-free rate")
    parser.add_argument("--expiry-years", type=float, default=1.0, help="Time horizon in years")
    parser.add_argument("--scenarios", required=True, help="Comma-separated price boundaries")
    parser.add_argument("--labels", default="", help="Comma-separated scenario labels")
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()

    boundaries = [float(x) for x in args.scenarios.split(",")]
    labels = args.labels.split(",") if args.labels else []

    scenarios, ev = compute_scenario_probs(
        spot=args.spot,
        iv=args.iv,
        rf=args.rf,
        expiry_years=args.expiry_years,
        scenario_boundaries=boundaries,
        scenario_labels=labels,
    )

    if args.json:
        print(json.dumps({"scenarios": scenarios, "ev": ev}, indent=2))
    else:
        print_results(scenarios, ev, args.spot, args.iv, args.ticker)


if __name__ == "__main__":
    main()
