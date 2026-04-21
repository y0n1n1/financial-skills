# Attention Allocation (Value of Information Analysis)

Adapted from healthcare decision theory (EVPI/EVPPI). Mathematically determines WHERE to focus your limited research time for maximum decision improvement.

## The Problem

You can't research everything equally. You have limited time and attention. The question is: of all the uncertain things in your analysis, which one — if you could learn it — would MOST change your sizing decision?

That's where to focus. Everything else is lower priority.

## Value of Information Framework

### Expected Value of Perfect Information (EVPI)
"What is the maximum I should spend (in time/effort) to eliminate ALL uncertainty about this theory?"

```
EVPI = E[value with perfect information] - E[value with current information]

Practical approximation:
- Current best action: invest X% at current conviction
- If we KNEW the theory was right: invest Kelly-optimal %
- If we KNEW the theory was wrong: invest 0%
- EVPI = p * (gain from optimal sizing if right) + (1-p) * (loss avoided if wrong) - current expected outcome

If EVPI is small: your current information is sufficient. Stop researching. Act.
If EVPI is large: more research is justified before committing capital.
```

### Expected Value of Partial Perfect Information (EVPPI)
"Which SPECIFIC unknown, if I could learn it, would most change my decision?"

This is the key metric. For each uncertain parameter in your analysis:

```
EVPPI(parameter) = E[value if I knew this parameter perfectly] - E[value with current uncertainty]

Rank all uncertain parameters by EVPPI.
The highest-EVPPI parameter is where to focus research NEXT.
```

### Practical Implementation

After running `/theory`, you have uncertainty in multiple areas. Rank them:

```
| Uncertain Parameter | Current Estimate | Confidence | EVPPI Rank | Research Action |
|---|---|---|:---:|---|
| Data center revenue growth next 2yr | 40% CAGR | LOW | 1 (HIGHEST) | Find hyperscaler capex data |
| Competitive gap duration | 3 years | MEDIUM | 2 | Track AMD/custom ASIC progress |
| Market multiple in 2 years | 30x | LOW | 3 | Analyze historical multiples in similar situations |
| Macro rate environment | Easing | HIGH | 5 (LOW) | Already well-known, low EVPPI |
| Analyst sentiment | Bullish | HIGH | 6 (LOWEST) | Already known, wouldn't change decision |
```

**The first row is where to spend your next hour of research, not the last.**

### How to Estimate EVPPI Without Full Math

Simplified heuristic — for each uncertain parameter, ask:

1. **Decision sensitivity**: "If this parameter turned out to be at its LOW estimate vs its HIGH estimate, would my sizing change by more than 5%?"
   - YES → high EVPPI
   - NO → low EVPPI

2. **Current uncertainty**: "How wide is my confidence interval on this parameter?"
   - Wide (2x+ range) → high EVPPI
   - Narrow (<30% range) → low EVPPI

3. **EVPPI score = Decision Sensitivity × Current Uncertainty**
   - Both high → RESEARCH THIS FIRST
   - One high, one low → moderate priority
   - Both low → skip, already good enough

## Integration with Fermi Decomposition

The Fermi decomposition naturally identifies which components have the widest uncertainty ranges. Combine with EVPPI:

```
Fermi says: "Data center growth assumption has the widest range (20%-60%)"
EVPPI says: "Data center growth is the most decision-sensitive parameter"
→ RESEARCH DATA CENTER GROWTH NEXT. Everything else is secondary.
```

## Integration with Data Streams

Once you know the highest-EVPPI parameter, the question becomes: "what data source could reduce uncertainty on THIS specific parameter?"

```
Highest EVPPI: hyperscaler capex trajectory
→ Data stream needed: quarterly capex guidance from MSFT, GOOG, AMZN, META earnings calls
→ Action: add to data-streams registry, set up monitoring
```

This is how the 3 pillars (methodology → attention → data) form a closed loop.

## When to Stop Researching

```
If EVPI < cost of research time (valued at opportunity cost): STOP. You know enough. Decide.
If EVPPI for all remaining parameters < threshold: STOP. Marginal research won't change the decision.
```

The most common mistake: researching things that feel important but have low EVPPI — they won't change your decision no matter what you find.

## Output

After `/theory`, append:
```
## Attention Allocation
Total EVPI: [HIGH/MEDIUM/LOW] — [should you research more or act?]

| Priority | Parameter | EVPPI | Current Uncertainty | Action |
|:---:|---|:---:|---|---|
| 1 | [highest EVPPI parameter] | HIGH | [range] | [what to research] |
| 2 | [next] | MED | [range] | [what to research] |
| 3 | [next] | LOW | [range] | [skip or low-effort check] |

Research budget recommendation: spend [X] hours max, focused on priority 1-2.
After that, marginal research value drops below action value.
```

## References
- Claxton, K. (1999). "The irrelevance of inference: a decision-making approach to the stochastic evaluation of health care technologies." Journal of Health Economics.
- Ades, A.E. et al. (2004). "Expected value of sample information calculations in medical decision modeling." Medical Decision Making.
- Raiffa, H. & Schlaifer, R. (1961). "Applied Statistical Decision Theory." Harvard University Press.
