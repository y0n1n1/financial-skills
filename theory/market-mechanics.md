# Market Mechanics Layer

You're buying STOCK, not the business directly. The company can be excellent and the stock can still go down. This layer analyzes HOW the market will likely react — who owns it, who's buying/selling, what's priced in, and how the crowd is positioned.

This is the gap between fundamental analysis ("is the company good?") and market analysis ("will the stock go up?"). Both are necessary. Neither alone is sufficient.

## Three Components

### 1. Ownership Structure Analysis (Who Holds the Cards?)

**What to gather:**

WebSearch: "[TICKER] institutional ownership 13F" and "[TICKER] top holders" and "[TICKER] insider transactions"
Free tools: whalewisdom.com, fintel.io, 13f.info (all free for basic data)

**Extract:**
```
Ownership Breakdown:
- Institutional ownership %: [X]% (>80% = heavily institutional, sensitive to fund flows)
- Top 5 holders + their % (Vanguard, BlackRock, etc.)
- Active vs passive split (index funds don't sell on thesis changes; active funds do)
- Recent 13F changes: any major fund adding/trimming in last quarter?
- Insider transactions: are C-suite buying or selling?

Key Analysis:
- Ownership concentration: top 10 holders own [X]% — concentrated = vulnerable to single-fund selling
- Active fund thesis alignment: are the active holders in for the same thesis as you?
- Short interest: [X]% of float — rising/falling?
```

**What this tells you:**
- High passive ownership (Vanguard/BlackRock index) = price driven by sector flows, not company-specific analysis
- Active fund accumulating = someone with a research team agrees with your thesis
- Active fund trimming = someone with a research team is exiting — WHY?
- Heavy insider buying = management putting their own money where their mouth is
- Heavy insider selling = could be routine, could be informative — check context
- Rising short interest = informed bears are positioning against the stock

### 2. Options-Implied Expectations (What's Already Priced In?)

**What to gather:**

WebSearch: "[TICKER] options expected move" and "[TICKER] implied volatility" and "[TICKER] put call ratio"

**Extract:**
```
Options Market Says:
- Implied volatility: [X]% (vs historical vol [Y]%) — market expects [more/less] movement than usual
- Expected move (from ATM straddle): ±[X]% over [timeframe]
- Put/Call ratio: [X] (>1.0 = more puts than calls = bearish positioning, <0.7 = bullish)
- IV skew: puts priced [higher/lower] than calls = market prices [crash/rally] risk differently
- Pre-earnings implied move: ±[X]% (if near earnings)

Key Analysis:
- Is the market pricing in MORE or LESS uncertainty than your thesis implies?
- If you think the stock will move 20% and options price a 10% move: your thesis isn't consensus (potential edge)
- If you think +15% and options already price +15%: NO EDGE — it's priced in
- Skew tells you WHERE the market sees risk (left-tail crash vs right-tail rally)
```

**The Critical Insight:**
The options market is the SMARTEST consensus available. It aggregates the views of every institutional desk with capital at risk. If your thesis implies something radically different from what options price, EITHER you've found an edge OR you're wrong and the market is right. Determine which.

### 3. Flow & Positioning Analysis (Where's the Money Going?)

**What to gather:**

WebSearch: "[TICKER] fund flows" and "[TICKER] sector rotation" and "[TICKER] accumulation distribution"

**Extract:**
```
Flow Analysis:
- ETF inflows/outflows for sector: [X] — money flowing into/out of this sector
- Stock-specific accumulation/distribution: price up on high volume = accumulation, price down on high volume = distribution
- Dark pool activity (if available via free tools): large block trades above/below current price
- Analyst revision momentum: net upgrades vs downgrades in last 30 days — and the RATE of change

Positioning:
- Hedge fund crowding: is this a crowded long? (many funds own it = crowded trade risk)
- Index rebalancing: any upcoming index additions/deletions that force buying/selling?
- Seasonal patterns: any reliable seasonal effects for this stock/sector?
```

## Synthesized Market Mechanics Verdict

```
## Market Mechanics: [TICKER]

### Who Owns It
Top holders: [list]
Institutional %: [X]% ([HIGH/MEDIUM/LOW] institutional]
Active fund trend: [ACCUMULATING / FLAT / TRIMMING]
Insider signal: [BUYING / NEUTRAL / SELLING]
Short interest: [X]% ([RISING / FLAT / FALLING])

### What's Priced In
Implied move: ±[X]% vs your thesis: ±[Y]%
Edge exists: [YES — market underprices your expected move / NO — already priced in]
Options sentiment: [BULLISH / NEUTRAL / BEARISH]
IV level: [CHEAP / FAIR / EXPENSIVE] vs historical

### Where's Money Flowing
Sector flows: [INFLOW / NEUTRAL / OUTFLOW]
Stock accumulation: [YES / UNCLEAR / NO]
Crowding risk: [HIGH / MEDIUM / LOW]

### Market Mechanics Verdict
**Market supports entry:** [YES / PARTIALLY / NO]
**Key risk:** [what the market mechanics layer surfaces that fundamentals don't]
**Timing signal:** [market mechanics suggest now / wait / avoid]
```

## Integration

This layer runs AFTER the 6 analytical lenses but BEFORE the final conviction assessment. It answers: "even if the theory is right, does the market setup support a profitable trade?"

A theory can be RIGHT and the stock still goes nowhere if:
- It's already priced in (options say so)
- Everyone who wants to buy already has (crowded long)
- Sector rotation is pulling money out regardless of fundamentals
- A major holder is unwinding for non-fundamental reasons

## Rules
- 13F data is 45 days delayed (filed quarterly). It's lagging but still informative for long-term positioning.
- Options data is real-time and forward-looking. Weight it higher for timing.
- NEVER assume "smart money is always right." They have constraints (redemptions, mandates) that cause non-informative selling.
- Free data sources: whalewisdom.com, fintel.io, 13f.info, optionshawk.com, barchart.com
- This layer does NOT override the theory analysis. A great theory with bad market mechanics = wait for better timing. A weak theory with great market mechanics = still a weak theory.

## References
- SEC Form 13F regulatory framework
- Options implied probability: Hull, J.C. "Options, Futures, and Other Derivatives"
- Institutional ownership and stock returns: Gompers & Metrick (2001), "Institutional Investors and Equity Prices"
- Smart money flow: Saar, G. (2001), "Price Impact Asymmetry of Block Trades"
