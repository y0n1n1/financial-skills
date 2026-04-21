# Risk-Parity Sizing

Size the position so that each holding contributes equal RISK to the portfolio, not equal capital.

## Core Idea

A 10% position in a volatile stock (beta 2.0) contributes way more risk than a 10% position in a stable ETF (beta 0.8). Risk-parity says: adjust sizes so each position contributes the same amount of portfolio risk.

## What to Gather (via WebSearch)

Search for: "[TICKER] beta volatility standard deviation"

Pull:
- **Beta**: stock's volatility relative to market (>1 = more volatile, <1 = less)
- **30-day volatility**: recent price movement range
- **Historical standard deviation**: annualized

Also read `investing/portfolio.md` for existing holdings and their approximate volatilities.

## How to Calculate

### Simple Risk-Parity Formula
```
Target risk contribution = 1 / N (where N = number of positions)
Position weight = (1/volatility_i) / sum(1/volatility_j for all j)
```

### Step by Step
1. Get volatility (beta or std dev) for this stock and all existing holdings
2. Calculate inverse-volatility weight for each
3. Normalize so weights sum to 100%
4. The result is the risk-parity recommended allocation for this stock

### Example
```
Portfolio: NVDA (beta 1.8), GOOGL (beta 1.1), VOO (beta 1.0)
Inverse volatilities: 1/1.8=0.56, 1/1.1=0.91, 1/1.0=1.00
Sum = 2.47
Weights: NVDA=0.56/2.47=22.5%, GOOGL=0.91/2.47=36.8%, VOO=1.00/2.47=40.5%
```

## What This Tells You

- High volatility stocks get SMALLER positions (they already contribute a lot of risk)
- Low volatility stocks get LARGER positions (they contribute less risk per dollar)
- This naturally prevents you from being over-exposed to your most volatile bets

## Limitations
- Doesn't account for correlation between positions (NVDA and GOOGL are highly correlated)
- Historical volatility may not predict future volatility
- Ignores conviction entirely — a pure risk math approach

## Output Format

Show the calculation, the recommended allocation %, the GBP amount, and how it compares to current portfolio allocation.
