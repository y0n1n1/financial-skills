# Bayesian-Calibrated Kelly

Kelly criterion where the probability input is derived from Bayesian updating rather than arbitrary conviction mapping.

## The Problem with Naive Kelly

Standard Kelly maps conviction (1-5) to a fixed probability. Conviction 4 → p = 0.70. This is arbitrary and Kelly is EXTREMELY sensitive to p. A 10% error in p can change optimal size by 50%+.

## The Solution: Bayesian Probability Construction

Build p from the theory card's Bayesian posterior, governed by `theory/bayesian-engine.md`.

### Step 1: Read the Posterior from Theory Card
The `/theory` analysis produces a Bayesian posterior via derived LRs (not lookup tables). Read it directly:
```
p = theory card's Bayesian posterior for the TRADE question (not the truth question)
```

**If no theory card exists:** Do not run Bayesian Kelly. Run `/theory` first.

### Step 2: Validate the Posterior Was Correctly Derived
Quick sanity check — the theory card's Bayesian chain must show:
- Prior anchored to exact analogue base rate for the question being tested
- Every LR has a P(E|H)/P(E|~H) derivation, not a lookup table value
- Evidence dependency groups identified (no double-counting)
- Only IC > 0.5 bits evidence entered the chain
- Regime entered as an LR, not a post-hoc multiplier

If any of these are violated, flag it and re-derive before using for Kelly.

### Step 3: Calibrate with Gabriel's Track Record
From `investing/intuition-log.md`:
```
If Gabriel's historical accuracy in this CATEGORY is known:
- Accuracy = 70% on direction calls → trust his conviction more (adjust p toward his stated belief)
- Accuracy = 40% on sector picks → adjust p toward base rate (he's worse than a coin flip here)

Calibration formula:
Final p = (accuracy_weight * Gabriel_p) + ((1 - accuracy_weight) * Bayesian_posterior)

Where accuracy_weight starts at 0.3 (skeptical of subjective input) and increases
as more data points accumulate (converges toward Gabriel's actual accuracy).
```

If no track record yet (new system): accuracy_weight = 0, use pure Bayesian posterior.

### Step 4: Apply Alpha Decay Freshness Adjustment
From the theory card's Alpha Decay section (calculated by `/watch`):
```
Freshness = 1.0 - (days_since_last_full_analysis / decay_halflife)
Time-adjusted p = Bayesian_posterior * freshness + base_rate * (1 - freshness)

As freshness decays, probability regresses toward the base rate.
At freshness 1.0: full posterior used (just analyzed)
At freshness 0.5: halfway between posterior and base rate
At freshness 0.0: back to base rate (you know nothing — re-analyze first)

If theory was JUST analyzed (freshness > 0.9): skip this step, use calibrated p directly.
If theory card has no Alpha Decay section yet: default freshness = 1.0.
```

### Step 5: Calculate Kelly with Final p
```
Given:
- Final p = time-adjusted calibrated p [from step 4]
- b = upside / downside
- q = 1 - p

Full Kelly: f* = (p * b - q) / b
Half Kelly: f*/2
Quarter Kelly: f*/4
```

### Show the Full Chain
```
Base rate prior: 35%
→ Strong competitive moat evidence (LR 2.5x): 35% * 2.5 / (35% * 2.5 + 65%) = 57%
→ Revenue supports theory (LR 1.5x): update → 67%
→ Macro neutral (LR 1.0x): stays 67%
→ Bear case has merit (LR 0.7x): update → 58%
→ Cap at 90%, floor at 10%: 58%
→ Gabriel's accuracy adjustment (no data yet, weight=0): stays 58%
Calibrated p = 0.58
→ Alpha decay (theory analyzed 30 days ago, structural halflife=180): freshness = 0.83
→ Time-adjusted p = 0.58 * 0.83 + 0.35 * 0.17 = 0.48 + 0.06 = 0.54
Final p = 0.54

f* = (0.54 * 3.0 - 0.46) / 3.0 = 0.39 = 39%
Half Kelly = 22%
Quarter Kelly = 11%
```

## Why This Matters

The difference between naive Kelly (conviction 4 → p=0.70 → Kelly says 35%) and Bayesian Kelly (calibrated p=0.58 → Kelly says 22%) could be the difference between a position that survives a drawdown and one that doesn't.

## Output
Show every step of the chain. Every update, every likelihood ratio, every adjustment. Full transparency.
