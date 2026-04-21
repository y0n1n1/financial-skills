# Analysis of Competing Hypotheses (ACH)

**Core Question:** What are the ALTERNATIVE explanations for this stock's trajectory, and which hypothesis does the evidence best support when evaluated AGAINST all of them simultaneously?

This is adapted from the CIA's structured analytic technique developed by Richards Heuer. The key insight: humans naturally seek evidence that CONFIRMS their preferred hypothesis. ACH forces you to evaluate evidence by what it DISPROVES.

## Why This Matters

If you only test one theory ("NVDA will dominate"), you'll find plenty of supporting evidence. But that evidence might EQUALLY support a different hypothesis ("NVDA will grow but competitors will close the gap, compressing margins"). The only evidence that truly validates YOUR theory is evidence that supports it AND contradicts alternatives.

## Process

### Step 1: Generate Competing Hypotheses
For Gabriel's theory (H1), generate at least 3 alternatives:

- **H2: The moderate case** — the company succeeds but not as dramatically as the theory claims
  - E.g., "NVDA grows but competition arrives by year 2, compressing margins. Decent investment but not the monopoly thesis."
- **H3: The bear case** — the theory's core claim is wrong
  - E.g., "Custom ASICs and AMD catch up faster than expected. NVDA loses market share. Overvalued at current levels."
- **H4: The null hypothesis** — the stock is roughly fairly valued and the theory doesn't matter
  - E.g., "NVDA is a fine company priced correctly. No significant alpha opportunity."
- **H5 (optional): The left-field case** — something nobody is talking about
  - E.g., "AI spending bubble pops, all AI stocks get repriced regardless of fundamentals."

### Step 2: Build the Evidence Matrix
As each analytical lens produces evidence, rate it against ALL hypotheses:

| Evidence | H1 | H2 | H3 | H4 | H5 |
|----------|:--:|:--:|:--:|:--:|:--:|
| [evidence item] | ++ / + / N / - / -- | ... | ... | ... | ... |

Rating scale:
- **++** Strongly supports this hypothesis
- **+** Consistent with this hypothesis
- **N** Neutral / irrelevant to this hypothesis
- **-** Inconsistent with this hypothesis
- **--** Strongly contradicts this hypothesis

### Step 3: Calculate Diagnostic Value
For each piece of evidence, its diagnostic value = how much it DIFFERENTIATES between hypotheses.

- **HIGH diagnostic value**: supports one hypothesis and contradicts others
  - Example: "CUDA developer lock-in metric shows 95% retention" → supports H1, contradicts H3
- **MEDIUM diagnostic value**: supports some hypotheses, neutral on others
  - Example: "Revenue +80% YoY" → supports H1 AND H2
- **LOW diagnostic value**: consistent with most or all hypotheses
  - Example: "AI is a growing sector" → supports H1, H2, H3, H4, H5

### Step 4: Evaluate by Elimination
The ACH principle: the hypothesis with the LEAST contradicting evidence wins, NOT the one with the most supporting evidence. Count the inconsistencies:

```
H1: 2 items of contradicting evidence
H2: 3 items of contradicting evidence
H3: 5 items of contradicting evidence
H4: 4 items of contradicting evidence

→ H1 is least contradicted, but H2 is close. Pay attention to what differentiates them.
```

### Step 5: Identify Linchpin Evidence
What single piece of evidence, if it were wrong, would change the conclusion? This is the most important evidence to verify independently.

## Output

```
## Competing Hypotheses
H1: [Gabriel's theory]
H2: [moderate case]
H3: [bear case]
H4: [null hypothesis]

## ACH Matrix (filled by lenses)
[evidence matrix with ratings]

## Diagnostic Summary
Most diagnostic evidence: [what]
Least contradicted hypothesis: [which]
Linchpin evidence: [what — if wrong, changes everything]
Surviving hypotheses: [which hypotheses couldn't be eliminated]
```

## Critical Rule

If H1 and H2 have roughly equal contradiction counts, the theory might be right about direction but wrong about magnitude. This matters for sizing — you'd size for the moderate case, not the bull case.
