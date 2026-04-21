# Kelly Criterion Analysis (Naive)

The standard Kelly calculation. This is the BASELINE — presented alongside the Bayesian-calibrated Kelly for comparison. The naive version uses the conviction→probability mapping directly. The Bayesian version (bayesian-kelly.md) uses empirically derived probabilities.

## The Formula

**f* = (p * b - q) / b**

Where:
- **f*** = fraction of portfolio to allocate
- **p** = probability of winning
- **b** = win/loss ratio (upside / downside)
- **q** = probability of losing (1 - p)

## Naive Conviction to Probability Mapping

This mapping is a HEURISTIC starting point. The Bayesian Kelly replaces it with empirically derived p.

| Conviction | p (naive) | Note |
|-----------|----------|------|
| 5 (near certain) | 0.85 | Almost never justified — requires extraordinary evidence |
| 4 (strong) | 0.70 | Strong thesis with multiple supporting lenses |
| 3 (moderate) | 0.55 | Slightly better than coinflip |
| 2 (speculative) | 0.40 | Interesting but uncertain |
| 1 (punt) | 0.25 | Lottery ticket |

## Three Variants

### Full Kelly (f*)
- Maximizes long-term geometric growth rate (proven by Shannon & Kelly, 1956)
- Drawdown profile: expects ~50% drawdowns in a lifetime of use (Thorp, 2006)
- Used in practice by: almost nobody. The variance is brutal.

### Half Kelly (f*/2)
- Captures ~75% of full Kelly's growth rate with ~50% of the variance
- Industry standard for professional systematic traders
- The "default" recommendation when in doubt

### Quarter Kelly (f*/4)
- Captures ~50% of growth rate with ~25% of variance
- For: speculative positions, new system (no track record yet), high estimation uncertainty

## Calculation

Show every step:
```
Given:
- Conviction: [X] → naive p = [Y]
- Upside: [A]x, Downside: [B]x
- b = A / B = [C]
- q = 1 - p = [Z]

f* = (p * b - q) / b
f* = ([Y] * [C] - [Z]) / [C]
f* = [result]%

At portfolio value £[TOTAL]:
- Full Kelly: [X]% = £[amount]
- Half Kelly: [X/2]% = £[amount]
- Quarter Kelly: [X/4]% = £[amount]
```

## Critical Limitations

1. **p sensitivity**: ±10% error in p → ±50% change in optimal size. This is why Bayesian calibration exists.
2. **Independence assumption**: Kelly treats each bet independently. See correlation-kelly.md.
3. **Geometric growth ≠ short-term returns**: Kelly has brutal drawdowns. Quarter Kelly if your portfolio is small.
4. **Negative Kelly = negative EV**: If f* < 0, walk away. The math says you're expected to lose.
5. **Kelly assumes infinite time horizon**: If you need the money in 6 months, Kelly is too aggressive.

## References
- Kelly, J.L. (1956). "A New Interpretation of Information Rate." Bell System Technical Journal.
- Thorp, E.O. (2006). "The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market."
- MacLean, Ziemba & Blazenko (1992). "Growth versus Security in Dynamic Investment Analysis."
