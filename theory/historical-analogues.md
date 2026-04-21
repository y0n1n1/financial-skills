# Historical Analogues Analysis

**Core Question:** What happened the last 3+ times a situation structurally similar to this one existed?

This is reference class forecasting applied to individual stock theses. Tetlock's research on superforecasters shows this is the single most powerful debiasing technique — it forces you out of the "inside view" (analyzing this specific case) and into the "outside view" (what happened in similar cases historically).

Top quant firms do this computationally. We do it with structured research.

## Why This Is Critical

Your brain creates a narrative: "NVDA has a monopoly, AI spending is growing, therefore NVDA will go up." This is the inside view — compelling, specific, and often wrong.

The outside view asks: "What happened to other companies that had compute monopolies during infrastructure buildouts?" That question has REAL historical answers, and those answers are the strongest predictor of what happens next.

## Process

### Step 1: Decompose the Theory into Structural Features
Break the theory into its abstract, transferable components:

Example for NVDA:
- Company with dominant market share (>70%) in a critical technology input
- During a period of massive infrastructure buildout by customers
- With high switching costs / ecosystem lock-in
- In a market with 2-3 smaller competitors trying to close the gap
- With the technology cycle still in early-to-mid stages

### Step 2: Search for Minimum 3 Historical Analogues
WebSearch for situations matching the structural features. Be CREATIVE about which analogues to find — they don't need to be the same industry.

Search patterns:
- "[structural feature] historical examples"
- "companies with monopoly during infrastructure buildout history"
- "technology lock-in market dominance examples what happened"
- "semiconductor monopoly history" (industry-specific)

For NVDA's theory, possible analogues:
- **Intel (1990s-2000s)** — x86 monopoly during PC buildout, WINTEL lock-in, AMD as perpetual #2
- **Cisco (1998-2002)** — networking infrastructure monopoly during internet buildout, seemed unassailable
- **IBM (1960s-80s)** — mainframe monopoly during enterprise compute buildout, massive switching costs
- **Qualcomm (2010s)** — mobile chipset dominance during smartphone buildout, patent moat
- **Oracle (2000s)** — database monopoly during enterprise software buildout, lock-in via data gravity

### Step 3: For Each Analogue, Extract
```
#### Analogue [N]: [Company] ([Period])

**Structural Match:**
- Market share at peak: [X]%
- Lock-in mechanism: [what]
- Infrastructure buildout: [what was being built]
- Key competitor(s): [who]
- Match quality: [HIGH/MEDIUM/LOW] — [why]

**What Actually Happened:**
- Duration of dominance: [years]
- How it ended (if it did): [what changed]
- Stock performance during thesis period: [+/- X%]
- Stock performance after thesis broke: [+/- X%]
- Key inflection point: [what event signaled the change]

**Lessons for Current Theory:**
- Supports the theory because: [what]
- Undermines the theory because: [what]
- Key risk this analogue surfaces: [what]
```

### Step 4: Synthesize Across All Analogues

```
## Historical Analogue Summary

| Analogue | Match Quality | Dominance Duration | How It Ended | Lesson |
|----------|:---:|:---:|---|---|
| Intel 90s | HIGH | ~15 years | Mobile shift made x86 irrelevant | Monopolies die when the PLATFORM shifts |
| Cisco 00s | HIGH | ~5 years | Buildout completed, commoditization | Infrastructure plays have CYCLE PEAKS |
| IBM 60-80s | MEDIUM | ~20 years | Minicomputers, then PCs disrupted | Lock-in delays disruption but doesn't prevent it |

**Base Rate from Analogues:**
- Average dominance duration: [X] years
- Median stock return during dominance: [X]%
- % that maintained monopoly beyond 5 years: [X]%
- Most common death cause: [platform shift / commoditization / regulation / competitor]

**Analogue-Adjusted Assessment:**
[How do the analogues modify our view of the theory?]
[Does the theory's timeline match what analogues suggest is realistic?]
[What's the most common failure mode we should set a parameter for?]
```

### Step 5: Identify the Anti-Analogue
Search for the ONE historical case where the bull thesis DIDN'T play out despite similar conditions. This is the most important analogue because it reveals what people get wrong about situations like this.

Example: "Cisco in 2000 had every metric screaming monopoly and infrastructure buildout. The stock dropped 80% anyway because the buildout peaked and demand plateaued."

## Quality Control

- **Minimum 3 analogues, maximum 6** — fewer than 3 is insufficient sample, more than 6 adds noise
- **At least 1 analogue must be a FAILURE case** — don't cherry-pick only successes
- **Match quality must be rated honestly** — a LOW match analogue with important lessons is still worth including
- **Time period matters** — prefer analogues from the last 30 years (market structure has changed)
- **Different industries are GOOD** — cross-industry analogues often surface non-obvious risks

## Output

Present all analogues, the synthesis table, the base rate from analogues, and the anti-analogue prominently. This should directly inform the base rate anchoring step.

## References
- Tetlock, P.E. & Gardner, D. (2015). "Superforecasting: The Art and Science of Prediction"
- Kahneman, D. (2011). "Thinking, Fast and Slow" — Chapter on reference class forecasting
- Verdad Capital. "An Alternative Approach to Financial Modeling for Individual Companies"
