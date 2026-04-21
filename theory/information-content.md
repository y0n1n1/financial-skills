# Information Content Scoring (Shannon Theory)

Adapted from Claude Shannon's information theory. Every piece of evidence has a measurable information content — how much does it actually reduce your uncertainty about which hypothesis is correct?

## The Core Concept

In Shannon's framework, information = surprise = uncertainty reduction. A coin flip (50/50) has maximum entropy — maximum uncertainty. If someone tells you the result, you gain 1 bit of information. But if the coin was weighted 99/1, the result barely surprises you — almost zero information gained.

Applied to trading: a piece of evidence that's consistent with ALL hypotheses reduces ZERO uncertainty. It has zero bits of information content. Evidence that's consistent with only ONE hypothesis and contradicts all others is maximally informative.

## Information Content Formula for Evidence

For each piece of evidence in the ACH matrix:

```
Information Content (IC) = log2(N_hypotheses / N_consistent)

Where:
- N_hypotheses = total competing hypotheses (typically 4)
- N_consistent = number of hypotheses this evidence is consistent with

Examples:
- Evidence consistent with 1 of 4 hypotheses: IC = log2(4/1) = 2.0 bits (HIGH)
- Evidence consistent with 2 of 4 hypotheses: IC = log2(4/2) = 1.0 bit (MEDIUM)
- Evidence consistent with 3 of 4 hypotheses: IC = log2(4/3) = 0.42 bits (LOW)
- Evidence consistent with 4 of 4 hypotheses: IC = log2(4/4) = 0.0 bits (ZERO)
```

## Practical Scoring

| IC Score | Label | Meaning | Example |
|:---:|---|---|---|
| 0.0 bits | ZERO | Consistent with everything. Useless. | "AI is a growing sector" |
| 0.1-0.5 bits | LOW | Barely differentiates. Background noise. | "Revenue grew" (true for any healthy company) |
| 0.5-1.0 bits | MEDIUM | Some differentiation. Useful but not decisive. | "Revenue grew 80% YoY" (supports growth thesis more than moderate thesis) |
| 1.0-1.5 bits | HIGH | Strongly differentiates. Key evidence. | "CUDA ecosystem retention at 95%" (uniquely supports monopoly thesis) |
| 1.5-2.0 bits | CRITICAL | Eliminates most alternatives. This is the evidence that matters most. | "No competitor within 3 years of matching H100 performance" (only consistent with H1) |

## Integration with ACH Matrix

Enhance the ACH matrix with an IC column:

```
| Evidence | H1 | H2 | H3 | H4 | IC (bits) | Weight |
|----------|:--:|:--:|:--:|:--:|:---------:|:------:|
| AI spending growing | ++ | ++ | + | N | 0.0 | ignore |
| Revenue +80% YoY | ++ | + | N | N | 1.0 | medium |
| CUDA retention 95% | ++ | N | - | N | 1.6 | critical |
| P/E at 35 vs avg 60 | ++ | + | + | + | 0.2 | ignore |
```

## The Key Insight: Most Evidence is Low-Information

In a typical analysis, 70% of the evidence you gather will be 0.0-0.5 bits — consistent with multiple hypotheses and essentially useless for deciding between them. Only ~10-20% will be HIGH+ information content.

**The system should spend MOST of its effort finding and verifying HIGH-IC evidence, not accumulating more LOW-IC evidence.** Ten pieces of 0.2-bit evidence (total: 2 bits) are worth less than one piece of 2.0-bit evidence — and the single piece is more reliable because it's less prone to noise accumulation.

## Signal-to-Noise Ratio for Data Sources

Each data source can be characterized by its typical IC contribution:

```
SNR(source) = average IC of evidence from this source / variance of IC

High SNR sources: earnings reports, patent filings, customer contract announcements
Low SNR sources: analyst opinions, news headlines, social sentiment
```

This feeds into the data streams registry — rate each source by its typical information content, not just its reliability.

## Application to Theory Verdict

Weight the Bayesian updates by information content:

```
Standard: update posterior with every piece of evidence equally
Shannon-weighted: update posterior proportional to IC score

High-IC evidence (1.5+ bits): full likelihood ratio update
Medium-IC evidence (0.5-1.5 bits): dampened update (LR closer to 1)
Low-IC evidence (<0.5 bits): near-zero update (barely moves the posterior)
```

This prevents a pile of weak evidence from overwhelming a single piece of strong contradictory evidence — which is exactly what happens with confirmation bias.

## Output

In the theory analysis:
```
## Information Content Summary
Total evidence items: 15
HIGH IC (>1.0 bits): 3 items — these drive the conclusion
MEDIUM IC (0.5-1.0): 4 items — supporting role
LOW IC (<0.5): 8 items — noise, excluded from weighted verdict

Most informative evidence FOR: [what, IC score]
Most informative evidence AGAINST: [what, IC score]
Total information gathered: [sum of IC] bits
```

## References
- Shannon, C.E. (1948). "A Mathematical Theory of Communication." Bell System Technical Journal.
- Cover, T.M. & Thomas, J.A. (2006). "Elements of Information Theory."
- Adapted from IC concept in Grinold & Kahn's "Active Portfolio Management"
