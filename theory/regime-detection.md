# Regime Detection

**Core Question:** What market regime are we currently in, and how does that change the interpretation of every other lens?

Renaissance Technologies uses Hidden Markov Models for this. We approximate it with structured observation.

## Why This Is Critical

ALL other analysis is regime-conditional. An RSI of 70 in a strong bull regime is noise. An RSI of 70 after a regime shift to risk-off is a sell signal. A P/E of 35 in an expansion regime is reasonable for growth. A P/E of 35 in a contraction regime is dangerous.

If you don't know what regime you're in, your analysis is ungrounded.

## The 4 Regime Dimensions

### 1. Volatility Regime
**LOW VOL** (VIX < 15): calm markets, trend-following works, support/resistance holds
**NORMAL VOL** (VIX 15-25): typical conditions, standard analysis applies
**HIGH VOL** (VIX 25-35): fear in the market, reversals common, position sizes should shrink
**CRISIS VOL** (VIX > 35): panic, correlations go to 1, diversification fails, cash is king

WebSearch: "VIX index current level" and "VIX 30 day trend"

### 2. Growth Regime
**EXPANSION**: GDP growing, employment rising, earnings revisions positive
**LATE CYCLE**: growth slowing, inflation rising, yields inverting
**CONTRACTION**: GDP shrinking, layoffs starting, earnings declining
**RECOVERY**: bottoming out, early signs of improvement, risk assets rally

WebSearch: "US GDP growth current" and "economic cycle indicator current phase"

### 3. Monetary Regime
**EASING**: rates being cut, liquidity increasing — bullish for growth stocks
**NEUTRAL**: rates stable, no strong direction
**TIGHTENING**: rates being raised, liquidity decreasing — bearish for growth stocks
**EMERGENCY**: extreme intervention (QE, rate cuts to zero) — everything distorted

WebSearch: "Federal Reserve rate decision latest" and "monetary policy outlook"

### 4. Sector Regime (for the specific sector)
**RISK-ON**: capital flowing INTO this sector, momentum positive
**NEUTRAL**: no strong flows either direction
**RISK-OFF**: capital flowing OUT of this sector, rotation away
**BUBBLE**: extreme inflows, valuations detached from fundamentals, narrative-driven

WebSearch: "[SECTOR] ETF fund flows" and "[SECTOR] relative strength vs S&P 500"

## Process

### Step 1: Classify Current Regime
Fetch data for all 4 dimensions and classify:

```
## Current Market Regime — [DATE]

| Dimension | Classification | Evidence | Confidence |
|-----------|---------------|----------|------------|
| Volatility | [LOW/NORMAL/HIGH/CRISIS] | VIX at [X] | HIGH |
| Growth | [EXPANSION/LATE/CONTRACTION/RECOVERY] | GDP [X]%, employment [Y] | MEDIUM |
| Monetary | [EASING/NEUTRAL/TIGHTENING/EMERGENCY] | Fed funds at [X]%, direction [Y] | HIGH |
| Sector | [RISK-ON/NEUTRAL/RISK-OFF/BUBBLE] | [sector] flows [X], RS [Y] | MEDIUM |

Overall Regime: [summary label, e.g., "Low-vol expansion with easing — goldilocks for growth"]
```

### Step 2: Regime-Conditional Adjustments
For EACH analytical lens, state how the current regime affects interpretation:

```
Regime Impact on Analysis:
- Fundamental: [how regime affects fundamental interpretation]
- Technical: [how regime affects signal reliability]
- Competitive: [how regime affects moat durability]
- Macro: [regime IS the macro, so this lens absorbs it]
- Sentiment: [how regime affects sentiment reliability]
- Sizing: [regime directly affects position size — high vol = smaller positions]
```

### Step 3: Regime Transition Risk
The most dangerous moment is a REGIME CHANGE — when the market shifts from one regime to another. This is when most losses happen.

```
Regime Transition Risks:
- Most likely next regime shift: [what could change]
- What would trigger it: [specific events]
- How it affects the theory: [would a regime change break the thesis?]
- Historical: how did similar theories perform during regime transitions?
```

## Regime-Conditional Sizing Modifier

| Regime | Sizing Modifier | Rationale |
|--------|:---:|---|
| Low vol + expansion + easing | 1.0x (no adjustment) | Ideal conditions |
| Normal vol + expansion | 0.9x | Standard conditions |
| High vol + any | 0.6-0.7x | Reduce all positions |
| Crisis vol | 0.3-0.5x | Survival mode |
| Late cycle + tightening | 0.7x | Elevated risk |
| Sector in bubble territory | 0.5x | Excess needs to unwind |

This modifier applies to ALL sizing methods as a final adjustment.

## Output

The regime classification should appear at the TOP of the theory analysis, before any lenses run. Every lens should reference it. Sizing should incorporate the regime modifier.

## References
- Hidden Markov Models for regime detection (QuantStart)
- Dalio, R. "How the Economic Machine Works" — regime framework
- AQR "Investing with Style" — regime-conditional factor returns
