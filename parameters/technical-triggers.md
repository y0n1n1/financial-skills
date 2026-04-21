# Technical Triggers

**Core Question:** What price/chart movements would signal the theory is failing?

## What to Gather (via WebSearch)

Search for: "[TICKER] support resistance levels" and "[TICKER] 200 day moving average" and "[TICKER] RSI technical"

Pull:
- Current price
- Key support levels (recent lows, 200-day MA)
- Key resistance levels
- Current RSI
- 50-day and 200-day moving average values
- Recent volume patterns

## Trigger Categories

### Support Breaks
- **Price below key support**: if price closes below $X
  - Use the 200-day MA as a common support reference
  - Or use a significant recent low
  - Severity: MINOR (first touch), MAJOR (sustained break for 5+ days)

### Moving Average Crosses
- **Death cross**: 50-day MA crosses below 200-day MA
  - Severity: MAJOR — historically significant bearish signal
- **Price below 200-day MA**: stock trading below long-term trend
  - Severity: MINOR (brief dip), MAJOR (sustained)

### RSI Thresholds
- **RSI extremes**: RSI drops below 30 (oversold, fear) or stays above 80 for 5+ days (exhaustion)
  - Severity: MINOR — RSI alone isn't a thesis-breaker but signals potential reversal

### Volume Signals
- **Volume spike on decline**: volume 3x+ average on a significant down day
  - Severity: MINOR — smart money might be exiting

### Drawdown from Entry
- **Stop-loss style**: if position drops X% from entry price
  - Common thresholds: -15% = MINOR, -25% = MAJOR, -40% = EXIT
  - Adjust based on the stock's normal volatility (a volatile stock needs wider bands)

## Output Format

For each proposed trigger:
```
| # | Trigger | Current Value | Threshold | Severity | Theory-Specific? |
```

Include 3-4 technical triggers. Most are generic (not theory-specific) but the thresholds should be calibrated to this stock's volatility.
