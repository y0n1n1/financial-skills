# Expected Value & Asymmetry Analysis

Calculate the expected value of a trade and analyze its payoff convexity. A low-probability trade with 10:1 payoff can be better than a high-probability trade with 1.5:1 — this analysis catches that.

## Why Standard Sizing Misses This

Kelly optimizes for long-term growth rate, which implicitly accounts for EV. But Kelly doesn't tell you: "this trade's EV is negative — walk away." And it doesn't highlight when a low-conviction trade has BETTER risk-adjusted EV than a high-conviction one due to asymmetric payoff structure.

## The Math

### Step 1: Expected Value Calculation
```
EV = (p * upside) - (q * downside)

Where:
- p = Bayesian-calibrated probability (from theory analysis, NOT naive conviction)
- q = 1 - p
- upside = expected gain in GBP if thesis is correct
- downside = expected loss in GBP if thesis is wrong

Example:
- p = 0.58 (calibrated), upside = 3x (£300 on £100), downside = 1x (lose £100)
- EV = (0.58 * 300) - (0.42 * 100) = 174 - 42 = +£132 per £100 invested
- EV per unit risked = £132 / £100 = +1.32 (positive = good)
```

### Step 2: EV/Risk Ratio
```
EV/Risk = EV / downside

This is the expected return per unit of capital at risk.
- EV/Risk > 0.5: STRONG opportunity
- EV/Risk 0.1 - 0.5: ACCEPTABLE
- EV/Risk 0 - 0.1: MARGINAL (barely positive)
- EV/Risk < 0: NEGATIVE EV — do NOT take this trade
```

### Step 3: Payoff Asymmetry Score
```
Asymmetry = upside / downside

- Asymmetry > 5:1: HIGHLY ASYMMETRIC (Taleb-style convex bet)
- Asymmetry 3:1 - 5:1: GOOD ASYMMETRY
- Asymmetry 1.5:1 - 3:1: MODERATE
- Asymmetry < 1.5:1: POOR — you need high probability to justify this
```

### Step 4: Convexity Check (Taleb's Barbell Principle)
Does the payoff have convexity (gains accelerate faster than losses)?

```
A position has positive convexity if:
- Limited, defined downside (you know the max you can lose)
- Open-ended or accelerating upside (gains compound or have no ceiling)

Example of convex: buying shares with a stop-loss at -15% but upside of 3x+
Example of concave: selling options (defined upside from premium, unlimited downside)
```

For the theory being analyzed:
- Is the downside truly bounded? Or could the stock drop more than estimated?
- Does the upside accelerate? (e.g., monopoly → pricing power → margin expansion → re-rating)
- Is there optionality? (e.g., if theory is right, future catalysts could make it even more right)

### Step 5: Scenario-Weighted EV (Fermi-Informed)
Go beyond binary (right/wrong). If the theory card has a Fermi Decomposition section, USE IT — the LOW/MID/HIGH component estimates directly map to scenarios:

```
Read from theory card Fermi section:
- LOW scenario return: (Fermi LOW total - current market cap) / current market cap
- MID scenario return: (Fermi MID total - current market cap) / current market cap
- HIGH scenario return: (Fermi HIGH total - current market cap) / current market cap

Map to competing hypotheses:
- H1 (bull thesis) → HIGH scenario
- H2 (moderate) → MID scenario
- H3 (bear) → LOW scenario (or worse)
- H4 (null) → ~0% return

Assign probabilities from the ACH analysis (which hypothesis has least contradiction):
```

| Scenario | Source | Probability | Return | Contribution to EV |
|----------|--------|------------|--------|-------------------|
| Full thesis (H1) | Fermi HIGH | [from ACH] | [from Fermi] | — |
| Moderate (H2) | Fermi MID | [from ACH] | [from Fermi] | — |
| Flat (H4) | Null | [from ACH] | ~0% | — |
| Bear (H3) | Fermi LOW | [from ACH] | [from Fermi] | — |
| Worst case | Pre-mortem | [estimated] | -50% to -70% | — |

This connects the Fermi valuation work directly to the EV calculation — no redundant re-estimation.

### Step 6: EV-Optimal Position Size
```
EV-optimal size = EV / (max_loss^2) * risk_tolerance_factor

This is a simplified mean-variance approach:
- Higher EV → larger position
- Higher max loss → smaller position (quadratic penalty)
- Risk tolerance: 1.0 (aggressive), 0.5 (moderate), 0.25 (conservative)
```

## Output Format
```
### Expected Value Analysis: [TICKER]

Binary EV: +£X per £100 invested (p=[Y]%, upside=[A]x, downside=[B]x)
EV/Risk ratio: [Z] — [STRONG/ACCEPTABLE/MARGINAL/NEGATIVE]
Payoff asymmetry: [A:B] — [HIGHLY ASYMMETRIC/GOOD/MODERATE/POOR]
Convexity: [POSITIVE/NEUTRAL/NEGATIVE] — [explanation]

Scenario-weighted EV:
[scenario table]
Total: +X%

EV-optimal position size: [Y]%

KEY INSIGHT: [e.g., "low probability (35%) but 5:1 asymmetry makes this a positive EV trade
despite low conviction — Kelly would undersize this, EV analysis says it deserves more"]
```

## Critical Rule
If EV is NEGATIVE at the calibrated probability, flag it immediately: "this trade has negative expected value. the math says don't do it, regardless of how compelling the narrative is."
