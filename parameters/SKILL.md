---
name: parameters
description: Define trigger parameters for when a stock theory changes in truth. Analyzes fundamental, technical, competitive, and macro triggers with severity levels (minor/major/exit). Run after establishing a theory. Use with /parameters NVDA.
user_invocable: true
---

# Parameter Definition

Define specific, measurable triggers that would change a theory's truth value. These are set BEFORE entering a position, not after you're already emotional about it.

## Input

Gabriel provides:
- **Ticker** (required): e.g., NVDA
- Theory card MUST exist at `investing/theories/TICKER.md` — run /theory first if it doesn't

## Process

1. **Read the theory card** from `investing/theories/TICKER.md`
   - If no theory card exists: tell Gabriel to run `/theory TICKER` first
   - The parameters MUST be specific to THIS theory, not generic
   - **Read the pre-mortem section** — extract "Suggested New Parameters" and "Gap" assessments. These are failure modes the pre-mortem identified that may not have corresponding parameters yet. Include them in the trigger proposal set.
   - **Read the Fermi Decomposition sensitivity** — the most sensitive Fermi component should have the MOST and TIGHTEST parameters watching it
2. **Run all 4 trigger analysis sub-skills** — each in this skill's directory:
   - `fundamental-triggers.md` — earnings/financial triggers
   - `technical-triggers.md` — price/chart triggers
   - `competitive-triggers.md` — market position triggers
   - `macro-triggers.md` — external environment triggers
3. **Each sub-skill proposes specific triggers** with:
   - The trigger condition (specific and measurable)
   - Current value of the metric
   - Threshold that would trigger reassessment
   - Severity: **MINOR** / **MAJOR** / **EXIT**
   - Whether it's theory-specific or generic
4. **FMEA score each trigger** (`fmea-scoring.md`):
   - Rate Severity (1-10), Occurrence (1-10), Detection (1-10)
   - Calculate RPN = S × O × D
   - High-D triggers (hard to detect) get special attention — find leading indicators
5. **Present all proposed triggers** organized by type with RPN scores
6. **Run Defense Independence Audit** (`defense-independence.md`):
   - Check if parameters are in independent clusters or correlated
   - Grade: A (>80% independence) through D (<40%)
   - If clustered: consolidate redundant triggers, add triggers from underrepresented categories
7. **Ask Gabriel** which triggers to activate
8. **Write chosen parameters** to the theory card

## Severity Levels

- **MINOR** — re-run the relevant theory lens, probably hold. Something to watch.
  - Example: RSI hits 75, approaching overbought
- **MAJOR** — re-run full theory analysis, position at risk. Something changed.
  - Example: earnings miss consensus by 15%
- **EXIT** — theory is broken, sizing should go to zero. Get out.
  - Example: competitor achieves technological parity, destroying the moat thesis

## Output Format

```
## Proposed Parameters for [TICKER]
Theory: "[theory statement]"

### Fundamental Triggers
| # | Trigger | Current | Threshold | Severity | Theory-Specific? |
|---|---------|---------|-----------|----------|-----------------|
| F1 | QoQ revenue growth | 80% | <15% | MAJOR | Yes — growth thesis |
| F2 | Gross margin | 75% | <65% | MAJOR | Yes — monopoly pricing |
| F3 | Earnings miss | - | >10% miss | MINOR | No — generic |

### Technical Triggers
[same format]

### Competitive Triggers
[same format]

### Macro Triggers
[same format]
```

Then: "which of these do you want active? you can pick all, or just the ones that matter most. i'd recommend at minimum [X, Y, Z]."

## Rules
- Parameters MUST be specific and measurable — "if X crosses Y" not "if things get bad"
- Always fetch CURRENT values via WebSearch to set realistic thresholds
- Distinguish between theory-specific and generic parameters
- Don't overwhelm — recommend a focused set of 6-10 key parameters
- NEVER make up current values — if WebSearch fails, say so
- Gen z tone, rigorous analysis
