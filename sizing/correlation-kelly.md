# Correlation-Adjusted Kelly (Multi-Asset)

Kelly criterion adjusted for covariance between portfolio positions. Prevents over-allocation to correlated bets.

## The Problem

Standard Kelly sizes each position independently. If you run Kelly on NVDA (AI thesis) and GOOGL (AI thesis) separately, you might get 25% + 20% = 45% allocated to a single macro thesis (AI infrastructure spending). If AI spending pulls back, BOTH positions drop simultaneously.

Running Kelly independently on correlated assets is mathematically incorrect — it over-allocates to correlated risk.

## Multi-Asset Kelly Framework

For a portfolio of N correlated assets, the optimal Kelly fraction vector is:

```
f* = C^(-1) * m

Where:
- f* = vector of optimal fractions [f1, f2, ..., fn]
- C = covariance matrix of returns
- m = vector of expected excess returns
```

This is the continuous-time multivariate Kelly solution (Thorp, 2006; Bichuch & Sircar, 2018).

## Practical Implementation (Without a Covariance Matrix)

Since we don't have institutional data feeds, we approximate:

### Step 1: Estimate Pairwise Correlations
For each pair of positions in the portfolio, estimate correlation via WebSearch:
- Search: "[TICKER1] [TICKER2] correlation coefficient"
- Search: "[TICKER1] [TICKER2] beta comparison"

Typical correlations to expect:
- NVDA ↔ GOOGL: ~0.60-0.75 (both AI-dependent)
- NVDA ↔ VOO: ~0.50-0.65 (NVDA is a large S&P component)
- Tech stock ↔ Bond ETF: ~-0.20 to +0.10 (low/negative)

### Step 2: Apply Correlation Penalty
For a new position being added to an existing portfolio:

```
Correlation-adjusted size = Standalone Kelly * (1 - avg_correlation_with_existing)

Where:
avg_correlation = average correlation coefficient between new position and all existing positions

Example:
- Standalone Kelly for NVDA: 25%
- Existing position: GOOGL (correlation with NVDA: 0.70)
- Adjusted size = 25% * (1 - 0.70) = 7.5%
```

This is a simplified but conservative approximation. It says: the more correlated the new position is with what you already hold, the smaller it should be.

### Step 3: Portfolio-Level Correlation Check
```
Total thesis exposure = sum of all position sizes in the same correlation cluster

Example:
- NVDA: 20% (AI thesis)
- GOOGL: 15% (AI thesis)
- Total AI thesis exposure: 35%

If NVDA↔GOOGL correlation is 0.70, the effective risk is closer to:
Effective single-position equivalent = 35% * sqrt((1 + 0.70) / 2) = 35% * 0.92 = 32.2%

Translation: your 35% split across two AI stocks has the risk profile of a ~32% bet on one stock.
Threshold: if effective single-position equivalent exceeds 30%, flag as high concentration.
```

### Step 4: Diversification Benefit Score
For the portfolio as a whole:
```
If average pairwise correlation < 0.30: WELL DIVERSIFIED
If average pairwise correlation 0.30-0.60: MODERATELY CONCENTRATED
If average pairwise correlation > 0.60: HIGHLY CONCENTRATED (single-thesis portfolio)
```

## Output Format
```
### Correlation-Adjusted Kelly: [TICKER]

Standalone Kelly: [X]%
Existing positions and correlations:
| Position | Correlation | Weight |
|----------|-------------|--------|
| GOOGL | 0.70 | 15% |
| VOO | 0.55 | 50% |

Average correlation with portfolio: [Y]
Correlation-adjusted Kelly: [Z]%

Portfolio concentration:
- AI thesis cluster: [A]% total exposure
- Effective single-position equivalent: [B]%
- Diversification score: [WELL/MODERATE/HIGHLY CONCENTRATED]
```

## References
- Thorp, E.O. (2006). "The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market"
- Bichuch, M. & Sircar, R. (2018). "Optimal Investment with Correlated Stochastic Volatility Factors"
- MacLean, Zhao & Ziemba (2011). "The Kelly Capital Growth Investment Criterion"
