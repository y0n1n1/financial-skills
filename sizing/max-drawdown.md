# Max-Drawdown Sizing

Size the position so that the worst-case scenario is survivable.

## Core Idea

Before you size a position, ask: "if this stock drops to its worst historical drawdown, can I sleep at night?" If the answer is no, the position is too big.

## What to Gather (via WebSearch)

Search for: "[TICKER] max drawdown historical" and "[TICKER] worst decline"

Pull:
- **Max historical drawdown**: the worst peak-to-trough decline ever (or in last 5 years)
- **Average drawdown in corrections**: typical decline during market selloffs
- **Recovery time**: how long did it take to recover from the worst drawdown?

## How to Calculate

### The Sleep-at-Night Test
```
Given:
- Portfolio value: £[TOTAL]
- Stock's max historical drawdown: [X]%
- Position size being considered: [Y]%

Worst-case portfolio impact = Y% * X%

Example:
- Portfolio: £5,000
- NVDA max drawdown: -66% (2022)
- Position size: 30%
- Worst-case: 30% * 66% = 19.8% portfolio loss = £990

Can Gabriel lose £990 and keep holding? That's the question.
```

### Maximum Position Size Formula
```
Max position size = Max acceptable portfolio loss / Max drawdown

Example:
- Max acceptable loss: 15% of portfolio
- NVDA max drawdown: 66%
- Max position: 15% / 66% = 22.7%
```

### Scenarios to Present
```
| Position Size | If -30% dip | If -50% crash | If max drawdown (-X%) |
|--------------|-------------|---------------|----------------------|
| 10% | -3% (£X) | -5% (£X) | -X% (£X) |
| 20% | -6% (£X) | -10% (£X) | -X% (£X) |
| 30% | -9% (£X) | -15% (£X) | -X% (£X) |
| 40% | -12% (£X) | -20% (£X) | -X% (£X) |
```

## What This Tells You

- The maximum position size where the worst case is still tolerable
- How different position sizes feel when things go wrong
- Whether the upside from Kelly is worth the drawdown risk

## Key Consideration for Gabriel

Gabriel's portfolio is small and growing (student income). A 20% drawdown on £5k is £1,000 — that's real money for him. This method keeps position sizes honest relative to what he can actually afford to lose.

## Output Format

Show max historical drawdown, the scenarios table with real GBP amounts, the max position size for different loss tolerances (10%, 15%, 20% portfolio loss), and a clear recommendation.
