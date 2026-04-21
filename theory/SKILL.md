---
name: theory
description: 14-step institutional-grade theory analysis across 5 phases. Regime detection, historical analogues, base rate anchoring, ACH competing hypotheses, 6 weighted lenses with Shannon IC scoring, Fermi decomposition, market mechanics (13F/options/flow), pre-mortem, reflexivity, and attention allocation (VOI). Use with /theory NVDA "AI compute monopoly".
user_invocable: true
---

# The Financial Gauntlet — Theory Analysis

Stress-test a stock theory with extreme skepticism. The system is designed to DISPROVE your theory, not confirm it. If the theory survives, it's strong. If it doesn't, you saved money.

## Governing Rules

**ALL Bayesian updates, evidence evaluation, and framework integration are governed by `bayesian-engine.md`.** Violations of its 7 hard rules invalidate the analysis. Key rules:
- LRs must be DERIVED (P(E|H)/P(E|~H)), never asserted from a lookup table
- Evidence must pass a dependency check before sequential updates (no double-counting)
- IC and LR are different quantities — never compare or combine
- Regime is evidence IN the chain, not a post-hoc multiplier
- No netting opposing signals in one update
- Only IC > 0.5 bits evidence enters the Bayesian chain
- Analysis MUST end with an EV calculation from a revenue × multiple Fermi matrix

## Core Principle: Popperian Falsification

A theory cannot be verified — only falsified. The goal is NOT to find evidence that supports the theory. The goal is to subject the theory to the harshest possible tests and see if it survives. Every lens asks: "what evidence would DISPROVE this theory, and does that evidence exist?"

This is the difference between retail analysis (seeking confirmation) and institutional analysis (seeking falsification).

## Input

Gabriel provides:
- **Ticker** (required): e.g., NVDA
- **Theory statement** (required for new theories): a specific, falsifiable claim. Not "NVDA is good" but "NVDA has a compute monopoly during the largest AI infrastructure buildout and no competitor can close the gap in 3 years"
- If the theory card already exists at `investing/theories/TICKER.md`, read the existing theory statement from there

## Process — 5 Phases, 14 Steps

### Phase 0: Context (BEFORE any analysis)

0. **Demand Chain Analysis** (`demand-chain.md`)
   - Map every layer between end users and this company's revenue
   - Identify leading indicators at each layer (1-3Q advance warning)
   - Classify demand fragility (political/strategic/ROI-dependent/speculative)
   - Estimate demand floor (minimum revenue in a downturn)

1. **Regime Detection** (`regime-detection.md`)
   - Classify current market regime across 4 dimensions: volatility, growth cycle, monetary policy, sector flows
   - ALL subsequent analysis is regime-conditional — a signal means different things in different regimes
   - Output: regime classification + sizing modifier

2. **Historical Analogues** (`historical-analogues.md`)
   - Find minimum 3 historical situations structurally similar to this one
   - At least 1 must be a FAILURE case (anti-analogue)
   - Extract: what happened, how long it lasted, what killed it
   - This is Tetlock's reference class forecasting — the most powerful debiasing technique

### Phase 1: Establish the Prior

3. **Base Rate Anchoring** (`base-rate.md`)
   - Using the historical analogues + theory type classification, establish the outside-view probability
   - This is the starting point. Everything adjusts from here. NEVER skip this.

4. **Competing Hypotheses** (`competing-hypotheses.md`)
   - Generate 3-4 ALTERNATIVE explanations for the stock's trajectory
   - These compete with Gabriel's theory throughout — every piece of evidence rated against ALL hypotheses
   - The ACH matrix is the analytical backbone of the entire process

### Phase 2: Run the 6 Analytical Lenses

Each lens is documented in this skill's directory:
5. `fundamental.md` — do the numbers support the theory?
6. `technical.md` — is the chart aligned with the theory's timeline? (REGIME-CONDITIONAL)
7. `competitive-moat.md` — how defensible is the position claimed?
8. `macro-sector.md` — does the macro environment help or hurt?
9. `sentiment.md` — is the market agreeing or disagreeing?
10. `contrarian-check.md` — what's the strongest argument AGAINST?

**For each lens**, produce:
- Analysis paragraphs
- A verdict: **SUPPORTS** / **NEUTRAL** / **UNDERMINES** the theory
- **Shannon information content score** (`information-content.md`) for each piece of evidence (bits)
- **ACH rating** against ALL competing hypotheses — only HIGH-IC evidence (>1.0 bits) meaningfully updates the posterior
- **Lens reliability weight** (`lens-reliability.md`) applied to the verdict (epidemiological PPV)

**After all lenses:**
- **Monetization Mapping** (`monetization-mapping.md`) — for EACH theory point, trace the chain: truth → revenue mechanism → financial line → growth driver → valuation impact. Identifies which points actually make money, which are speculative, what's already priced in, and where alpha exists. A theory without a monetization chain is incomplete.
- **Fermi Decomposition** (`fermi-decomposition.md`) — break the stock's value into independently estimable components (informed by monetization map revenue lines) + reverse Fermi to reveal what's already priced in

### Phase 3: Market Mechanics + Stress Tests

11. **Market Mechanics** (`market-mechanics.md`)
    - Ownership structure: 13F whale tracking, insider transactions, short interest
    - Options-implied expectations: what does the market already price in? Is there an edge?
    - Flow analysis: accumulation/distribution, sector rotation, crowding risk
    - This is the "will the STOCK go up?" layer vs "is the COMPANY good?" layer

12. **Pre-Mortem** (`pre-mortem.md`)
    - "It's 18 months from now. This trade was a disaster. What happened?"
    - 3 distinct failure narratives (slow bleed, shock event, right company wrong trade)
    - Psychologically distinct from the contrarian check — accesses different cognitive pathways

13. **Reflexivity Check** (`reflexivity.md`)
    - How would a significant price move (up or down) feed back into the fundamentals?
    - If the stock drops 40%, does that weaken the very thesis you're betting on?
    - Soros' insight: price and fundamentals are not independent — they're reflexive

### Phase 4: Attention Allocation

14. **Attention Allocation** (`attention-allocation.md`)
    - EVPPI analysis: which uncertain parameter, if learned, would most change the sizing decision?
    - Prioritized research list: where to spend the next hour of effort
    - Stop signal: when marginal research value drops below action value

## Output Format

### Phase 0 Output
```
## Market Regime
| Dimension | State | Evidence |
|-----------|-------|----------|
| Volatility | [state] | VIX at [X] |
| Growth | [state] | GDP [X]% |
| Monetary | [state] | Fed [X]% [direction] |
| Sector | [state] | [flows/RS data] |
Regime sizing modifier: [X]x

## Historical Analogues (minimum 3)
| Analogue | Match | Duration | Outcome | Key Lesson |
|----------|:---:|:---:|---|---|
| [company, period] | HIGH | Xyr | +X% then -Y% | [lesson] |
| [company, period] | MED | Xyr | +X% | [lesson] |
| [ANTI-ANALOGUE] | HIGH | Xyr | -X% | [what went wrong] |
Base rate from analogues: X%
```

### Phase 1 Output
```
## Base Rate
Historical base rate (from analogues + theory type): ~X%
Starting prior: X%

## Competing Hypotheses
H1 (Gabriel's theory): [theory statement]
H2: [moderate/alternative]
H3: [bear case]
H4: [null — fairly valued, goes nowhere]
```

### Phase 2 Output
Present each lens, then an ACH evidence matrix:
```
### ACH Evidence Matrix
| Key Evidence | H1 (Gabriel) | H2 | H3 | H4 | Diagnostic Value |
|-------------|:---:|:---:|:---:|:---:|:---:|
| Revenue +80% YoY | ++ | + | N | -- | MEDIUM (supports H1 but also H2) |
| CUDA lock-in | ++ | N | - | N | HIGH (uniquely supports H1) |
| P/E at 35 vs avg 60 | ++ | + | + | N | LOW (supports most hypotheses) |
```

Evidence key: ++ strongly supports, + supports, N neutral, - undermines, -- strongly undermines
Diagnostic value: HIGH (differentiates between hypotheses), MEDIUM, LOW (consistent with multiple)

### Phase 3 Output
```
### Pre-Mortem
[The failure narrative — what went wrong]
[Key risks surfaced that other lenses missed]

### Reflexivity Check
If price drops 30%: [feedback effects on fundamentals]
If price rises 50%: [feedback effects — does success change the thesis?]
```

### Revenue × Multiple Matrix (from Fermi + Contrarian)
```
| Scenario | Prob | Revenue | Multiple | Mkt Cap | Return |
|----------|:---:|---------|:---:|---------|:---:|
| H1 Bull | X% | $Xbn | Yx | $XT | +X% |
| H2 Base | X% | $Xbn | Yx | $XT | +X% |
| H3 Bear | X% | $Xbn | Yx | $XT | -X% |
| H4 Null | X% | $Xbn | Yx | $XT | -X% |
```

### Expected Value Calculation (MANDATORY — analysis is incomplete without this)
```
EV = Σ (probability_i × return_i)
EV = P(H1)×R(H1) + P(H2)×R(H2) + P(H3)×R(H3) + P(H4)×R(H4)

If EV < 0: NEGATIVE EXPECTED VALUE. Do not trade.
If EV > 0: compute Kelly fraction at this win rate and payoff ratio.
```

### Final Summary
```
## Theory Verdict
Prior: X% (anchored to exact analogue rate for question being tested)
Posterior: Y% (Bayesian chain with derived LRs, dependency-checked)
Weighted lens (sanity check): Z% — divergence because [reason if >10% gap]
EV: +/-X% (from revenue × multiple matrix)
Kelly fraction at this EV: X% (if negative, walk away)

Most diagnostic evidence (ACH IC): [what, IC score]
Largest Bayesian update: [what, LR, derivation]
Pre-mortem risk: [which narrative]
Reflexivity risk: [LOW/MED/HIGH]
Competing hypotheses alive: [which survived]
```

Then: "what's your conviction? (1-5) — the math says EV is X%, Kelly says Y% position, prior was Z%"

## After Gabriel Responds

Write/update the theory card at `investing/theories/TICKER.md` with:
- Theory statement + competing hypotheses
- Base rate and posterior probability
- All lens analyses, verdicts, and ACH matrix
- Pre-mortem narrative and reflexivity assessment
- Conviction level and reasoning
- Date of analysis

If reassessment: preserve Watch Log and Trade Log, show verdict CHANGES.

## Integration

This skill absorbs `/stock-analysis`. The data-gathering is distributed across the lenses.

## Rules
- SEEK FALSIFICATION, NOT CONFIRMATION. This is the prime directive.
- Every piece of evidence must be rated against ALL competing hypotheses, not just the main theory
- The base rate is established BEFORE looking at stock-specific data (prevents anchoring)
- Pre-mortem and reflexivity are MANDATORY, not optional
- NEVER give definitive financial advice
- If data is unavailable, say so — NEVER fabricate
- Gen z tone in presentation, institutional rigor in analysis
