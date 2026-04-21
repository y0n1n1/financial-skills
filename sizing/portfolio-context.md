# Portfolio Context Sizing

Size the position with full awareness of the current portfolio state, phase rules, and strategic constraints.

## What to Read

1. **`investing/portfolio.md`** — current holdings, phase, allocation targets
2. **`investing/philosophy.md`** — phase rules
3. **`investing/theories/`** — all active theory cards (for correlation check)

## Checks to Run

### 1. Phase Compliance
What phase is Gabriel in?

**Phase 1 (Now → April):**
- 50% low risk (broad ETFs, bonds)
- 50% growth (NVDA, GOOGL)
- Adding a growth stock? Check you're not exceeding the 50% growth cap

**Phase 2 (May onwards):**
- 90-95% growth/aggressive
- 5-10% low risk (cash reserve for IPOs)
- Much more room for concentrated bets

### 2. Concentration Check
- No single position should exceed 40% of portfolio (hard ceiling from philosophy)
- After adding this position at proposed size, what's the largest holding?
- Sector concentration: if adding another AI stock when already holding NVDA + GOOGL, flag the correlation risk

### 3. Dry Powder Reserve
- Always keep 10% cash for IPO opportunities (Anthropic, OpenAI)
- Does this trade eat into the reserve?
- If Gabriel says he's OK using the reserve, note that it's a deliberate choice

### 4. Existing Position Check
- Is Gabriel already holding this stock? If so, this is adding to an existing position
- What's the average cost basis if adding? Will this raise or lower it?
- Total exposure after adding

### 5. Correlation Analysis
- How correlated is this stock with existing holdings?
- If portfolio is NVDA + GOOGL + new AI stock, that's triple exposure to AI sentiment
- Flag if adding this position makes the portfolio a single-thesis bet

### 6. Free Trades Check
- Revolut Portugal gives 5 free trades/month, then 0.25% commission
- How many trades used this month?
- If out of free trades, factor commission into the sizing decision

## Output Format

```
Portfolio Snapshot (after proposed trade):
| Holding | Current % | After Trade % | Phase Target |
|---------|-----------|---------------|-------------|
| ... | ... | ... | ... |

Flags:
- [x] Phase compliant
- [x] Under 40% concentration
- [ ] WARNING: Dry powder below 10%
- [x] Free trades available

Recommended size range: X% - Y% given portfolio constraints
```

Present the portfolio as it would look AFTER the trade at various sizes (10%, 20%, 30%), so Gabriel can see the full picture before deciding.
