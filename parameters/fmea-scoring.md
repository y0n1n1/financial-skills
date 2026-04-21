# FMEA Risk Priority Numbers for Parameters

Adapted from aerospace/automotive engineering Failure Mode and Effects Analysis. Every parameter gets scored on THREE dimensions, not just severity.

## The Problem with Severity-Only Scoring

Our current system: MINOR / MAJOR / EXIT. This is one-dimensional. It answers "how bad is it?" but ignores two critical questions:
- **How likely is it?** (Occurrence)
- **How early can we detect it?** (Detection)

A high-severity risk that's easy to detect early and unlikely to occur is manageable. A moderate-severity risk that's invisible until too late and increasingly probable is the one that actually kills you.

## The Three Dimensions

### Severity (S) — How bad is it if this triggers?
| Score | Level | Impact |
|:---:|---|---|
| 1 | Negligible | Noise. Theory unaffected. |
| 2-3 | Minor | One lens verdict might change. Position holds. |
| 4-5 | Moderate | Multiple lenses affected. Theory weakened. Position at risk. |
| 6-7 | High | Theory likely broken. Significant capital loss if not acted on. |
| 8-9 | Critical | Theory fundamentally wrong. Portfolio-level damage. |
| 10 | Catastrophic | Total thesis destruction. Maximum possible loss. |

### Occurrence (O) — How likely is this to happen?
| Score | Level | Probability |
|:---:|---|---|
| 1 | Extremely unlikely | <1% in thesis timeframe |
| 2-3 | Low | 1-10% |
| 4-5 | Moderate | 10-30% |
| 6-7 | High | 30-60% |
| 8-9 | Very high | 60-90% |
| 10 | Near certain | >90% |

Estimate occurrence using: historical analogues, base rates, current trajectory of the metric.

### Detection (D) — How early can we spot this before it's too late?
**This is the missing dimension. Lower score = BETTER detection.**
| Score | Level | Lead Time |
|:---:|---|---|
| 1 | Immediate | Real-time data. Know within hours. (e.g., stock price) |
| 2-3 | Fast | Know within days. Public data, frequent updates. (e.g., VIX, sector ETF flows) |
| 4-5 | Moderate | Know within weeks. Quarterly data, earnings. (e.g., revenue, margins) |
| 6-7 | Slow | Know within months. Lagging indicators. (e.g., market share reports, annual data) |
| 8-9 | Very slow | Know within quarters/years. (e.g., deep competitive shifts, regulatory change) |
| 10 | Undetectable | No reliable way to detect until damage is done. (e.g., fraud, hidden liabilities) |

## Risk Priority Number (RPN)

```
RPN = Severity × Occurrence × Detection

Range: 1 (trivial) to 1,000 (catastrophic undetectable certainty)
```

### RPN Action Thresholds
| RPN Range | Priority | Action |
|:---:|---|---|
| 1-50 | LOW | Monitor passively. Check during scheduled scans. |
| 51-150 | MODERATE | Active monitoring. Include in every /watch scan. |
| 151-300 | HIGH | Priority monitoring. Consider reducing position size preemptively. |
| 301-500 | CRITICAL | Immediate action required. Re-run theory. Consider partial exit. |
| 500+ | EXTREME | This risk alone justifies not entering or exiting the position. |

## How to Apply

When running `/parameters`, for EACH proposed trigger:

```
| # | Trigger | S | O | D | RPN | Priority | Action |
|---|---------|:-:|:-:|:-:|:---:|----------|--------|
| F1 | Revenue growth <15% QoQ | 7 | 3 | 5 | 105 | MODERATE | Monitor quarterly |
| C1 | AMD achieves GPU parity | 9 | 2 | 7 | 126 | MODERATE | Hard to detect early |
| T1 | Price below 200d MA | 4 | 5 | 1 | 20 | LOW | Easy to detect |
| M1 | AI capex bubble pops | 9 | 3 | 8 | 216 | HIGH | Very hard to detect |
```

### The Key Insight: High-D Parameters Need Special Attention
Parameters with Detection score ≥ 7 are the most dangerous because by the time you see them, it's too late to act. For these:
- Search for LEADING indicators that correlate with the lagging risk
- Set proxy parameters that are easier to detect
- Consider the pre-mortem: which failure narrative involves this undetectable risk?

## Integration with Existing Severity Levels

Map RPN ranges to the existing system:
- RPN 1-100 → MINOR reassess
- RPN 101-300 → MAJOR reassess
- RPN 300+ → EXIT signal

But now the severity level is JUSTIFIED by three independent scores, not vibes.

## References
- FMEA methodology: MIL-P-1629 (US Military, 1949), adapted via ASQ standards
- Detection dimension: adapted from AIAG FMEA 4th Edition automotive standard
