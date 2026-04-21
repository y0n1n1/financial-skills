# Sentiment Analysis Lens

**Core Question:** Is the market agreeing or disagreeing with your theory?

## What to Gather

### WebSearch
Search for: "[TICKER] analyst rating price target" and "[TICKER] news today" and "[TICKER] insider trading"

Pull:
- **Analyst consensus**: buy/hold/sell distribution, average price target, recent upgrades/downgrades
- **News headlines**: top 3-5 recent headlines, overall tone
- **Insider activity**: are executives buying or selling? Recent SEC filings
- **Institutional ownership**: any major fund changes? 13F filings
- **Short interest**: what % of float is shorted? Rising or falling?

### Local Sources
- Check `~/news.json` for RSS feed mentions of the ticker
- Check `~/Desktop/claude-slave/investing/theories/` for any existing analysis

## How to Analyze

Sentiment is a double-edged lens:
- **Consensus agrees with your theory** → good validation, but the opportunity might be priced in already
- **Consensus disagrees** → either you're wrong, or you've found an edge the market hasn't priced in yet
- **The valuable signal is CHANGE** — sentiment shifting toward or away from your theory

Connect to the theory:
- If theory is contrarian → disagreeing sentiment is actually SUPPORTING (that's the whole point, you see something others don't)
- If theory follows consensus → strong agreement means less upside potential (already priced in)
- If insiders are selling → do they know something the theory doesn't account for?

## Red Flags to Watch
- Heavy insider selling (especially C-suite) during strong price action
- Analyst downgrades citing fundamental concerns (not just price targets)
- Short interest rising sharply (smart money betting against)
- Overwhelmingly positive sentiment (contrarian signal — everyone's already in)
- News cycle turning negative on a narrative that supports your theory

## Output Format

2-4 paragraphs analyzing market sentiment relative to the theory.

Then:
```
**Verdict:** SUPPORTS/NEUTRAL/UNDERMINES — [one sentence]
```

Example: "**Verdict:** NEUTRAL — Analyst consensus is bullish (85% buy) with avg PT 20% above current, which validates the thesis. But heavy consensus means the theory might already be priced in. Insider selling is flat, not concerning."
