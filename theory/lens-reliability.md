# Lens Reliability Weighting (Diagnostic Test Theory)

Adapted from epidemiological diagnostic testing. Each analytical lens is a "diagnostic test" — it takes market data and produces a verdict (SUPPORTS/NEUTRAL/UNDERMINES). Like any test, each lens has a measurable reliability that should weight how much its verdict matters.

## The Problem

Currently all 6 lenses get equal weight. But the sentiment lens (driven by analyst ratings and news headlines) is NOISIER than the fundamental lens (driven by hard financial data). A "SUPPORTS" from sentiment is worth less than a "SUPPORTS" from fundamentals. Treating them equally distorts the analysis.

## Diagnostic Test Metrics per Lens

### Sensitivity — True Positive Rate
"When the theory IS correct, how often does this lens say SUPPORTS?"

High sensitivity = the lens rarely misses a valid theory.
Low sensitivity = the lens is overly skeptical, might say NEUTRAL when it should say SUPPORTS.

### Specificity — True Negative Rate
"When the theory IS wrong, how often does this lens say UNDERMINES?"

High specificity = the lens reliably catches bad theories.
Low specificity = the lens gives false SUPPORTS on bad theories (the dangerous one).

### Positive Predictive Value (PPV)
"When this lens says SUPPORTS, what's the probability the theory is actually correct?"

**PPV depends on the BASE RATE.** This is the critical insight from medicine:

```
PPV = (Sensitivity × Base Rate) / ((Sensitivity × Base Rate) + ((1-Specificity) × (1-Base Rate)))
```

If base rate = 35% (most theories are wrong) and a lens has:
- Sensitivity = 0.80, Specificity = 0.70
- PPV = (0.80 × 0.35) / ((0.80 × 0.35) + (0.30 × 0.65))
- PPV = 0.28 / (0.28 + 0.195) = 0.28 / 0.475 = 59%

A "SUPPORTS" from this lens only means 59% chance the theory is right. NOT 80%.

When base rate is LOW (most theories fail), even good lenses have mediocre PPV.

## Estimated Lens Reliability Scores

These are STARTING estimates. They get calibrated over time as we track which lens verdicts correlate with actual outcomes.

| Lens | Sensitivity | Specificity | Noise Level | Weight |
|------|:---:|:---:|:---:|:---:|
| **Fundamental** | 0.75 | 0.70 | Medium | 1.0 (baseline) |
| **Technical** | 0.55 | 0.50 | High | 0.5 |
| **Competitive Moat** | 0.70 | 0.75 | Medium | 0.9 |
| **Macro/Sector** | 0.65 | 0.60 | Medium-High | 0.7 |
| **Sentiment** | 0.60 | 0.45 | Very High | 0.4 |
| **Contrarian Check** | 0.80 | 0.80 | Low | 1.2 (bonus weight) |
| **Historical Analogues** | 0.70 | 0.75 | Low | 1.1 |
| **Pre-Mortem** | N/A | 0.85 | Low | 1.0 (risk-specific) |
| **Reflexivity** | N/A | 0.70 | Medium | 0.8 |

### Why These Scores?

- **Technical** gets low weight: RSI/MACD are lagging, noisy, and the academic evidence for retail-level technical analysis predicting returns is weak. It's useful for TIMING but not for THEORY VALIDATION.
- **Sentiment** gets lowest weight: analyst ratings are consensus (already priced in), news is noise-dominant, and social sentiment is manipulable. A "SUPPORTS" from sentiment barely moves the needle.
- **Contrarian check** gets bonus weight: it has the highest specificity (catching bad theories) because it's specifically designed to find disconfirming evidence.
- **Historical analogues** gets high weight: reference class forecasting has the strongest empirical backing from Tetlock's research.

## Weighted Verdict Scoring

Instead of counting raw verdicts, weight them:

```
Raw: 5 SUPPORTS, 1 UNDERMINES → looks great (83% support)

Weighted:
  Fundamental SUPPORTS (1.0): +1.0
  Technical SUPPORTS (0.5): +0.5
  Moat SUPPORTS (0.9): +0.9
  Macro SUPPORTS (0.7): +0.7
  Sentiment SUPPORTS (0.4): +0.4
  Contrarian UNDERMINES (1.2): -1.2

  Weighted sum: +2.3
  Max possible: +5.6
  Weighted support: 41% — MUCH less confident than the raw 83%
```

The contrarian check undermining weighs almost as much as the sentiment and technical supporting COMBINED. That's the system working correctly.

## Calibration Over Time

After each theory plays out (position closed, thesis confirmed or broken):
1. Check which lenses were right vs wrong
2. Update sensitivity/specificity estimates
3. Adjust weights

This is the meta-learning loop — the system LEARNS which of its own analytical tools are reliable.

## Output

In the theory summary, present BOTH raw and weighted verdicts:
```
Raw verdict split: 5 SUPPORTS / 1 UNDERMINES
Weighted confidence: 41% (lens reliability adjusted)
Most reliable supporting evidence: [from highest-weight lens that supports]
Most reliable contradicting evidence: [from highest-weight lens that undermines]
```

## References
- Sensitivity/Specificity/PPV: Baratloo et al. (2015), Emergency Medicine Journal
- Positive predictive value and base rate interaction: Altman & Bland, BMJ (1994)
- Lens weight calibration concept: Tetlock "Superforecasting" — tracking forecaster accuracy by domain
