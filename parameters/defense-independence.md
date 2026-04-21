# Parameter Defense Independence Audit (Swiss Cheese Model)

Adapted from James Reason's Swiss Cheese Model of accident causation (aviation/nuclear safety) and PID control theory derivative term (engineering).

## Swiss Cheese Principle

Your parameters are defensive layers — slices of Swiss cheese between you and a catastrophic loss. Each slice has holes (blind spots). A loss happens when the holes in ALL slices align simultaneously.

**The critical question: are your defensive layers actually independent?**

If all your parameters are fundamental (earnings, revenue, margin), a single bad earnings report punches through ALL of them at once. That's not 3 layers of defense — it's 1 layer counted 3 times.

## Defense Independence Matrix

After defining parameters with `/parameters`, run this audit:

### Step 1: Categorize Each Parameter's Dependency

For each parameter, identify what SINGLE EVENT could trigger it:

```
| Parameter | Triggered By | Dependency Cluster |
|-----------|-------------|-------------------|
| F1: Revenue <15% QoQ | Bad earnings report | EARNINGS |
| F2: Margin <65% | Bad earnings report | EARNINGS |
| F3: EPS miss >10% | Bad earnings report | EARNINGS |
| T1: Price below 200d MA | Price decline | PRICE |
| T2: RSI <30 | Price decline | PRICE |
| C1: AMD achieves parity | Competitor announcement | COMPETITION |
| M1: AI capex drops 30% | Macro shift | MACRO |
```

### Step 2: Count Independent Clusters

```
Cluster analysis:
- EARNINGS cluster: 3 parameters (F1, F2, F3) — all triggered by one event
- PRICE cluster: 2 parameters (T1, T2) — both triggered by price decline
- COMPETITION cluster: 1 parameter (C1) — independent
- MACRO cluster: 1 parameter (M1) — independent

Effective independent layers: 4 (not 7)
Swiss Cheese Score: 4/7 = 57% independence
```

### Step 3: Grade the Defense

| Independence Score | Grade | Assessment |
|:---:|---|---|
| >80% | A | Well-diversified defense. True layered protection. |
| 60-80% | B | Decent. Some clustering but manageable. |
| 40-60% | C | Concerning. Multiple parameters share triggers. |
| <40% | D | Dangerous. Effectively a single-layer defense. |

### Step 4: Remediation

For each cluster with >2 parameters:
- **Do you need all of them?** If F1, F2, F3 all trigger on bad earnings, keep the ONE with the best FMEA Detection score and drop or relax the others.
- **Can you add INDEPENDENT parameters?** The goal is to have defense layers across DIFFERENT event types.

Ideal parameter set:
```
Minimum 1 parameter from EACH of these independent categories:
- Financial/earnings-dependent
- Price/market-dependent
- Competition/industry-dependent
- Macro/external-dependent
- Time-dependent (alpha decay)

5 independent layers > 10 correlated layers
```

## Correlation Between Parameters and the Thesis

**The most dangerous case:** all your parameters AND your theory depend on the same underlying factor.

Example: Theory says "AI spending will grow." Parameters watch AI spending metrics. If AI spending drops, the theory breaks AND all parameters trigger simultaneously — but by then it's too late because the parameters were watching the same thing the theory assumed.

The fix: include at least one parameter that's a LEADING indicator of the thing your theory assumes. If your theory assumes AI spending growth, watch CAPEX GUIDANCE (leading) not REVENUE (lagging).

## PID Rate-of-Change Detection (Derivative Term)

Standard parameter monitoring: "did the metric cross the threshold?" (binary)

**Enhanced with PID derivative:** "is the metric ACCELERATING toward the threshold?" (rate of change)

```
For each parameter:
- Current value: X
- Previous scan value: Y
- Threshold: Z
- Distance to threshold: Z - X
- Rate of change: X - Y (per scan period)
- Scans until threshold (at current rate): (Z - X) / (X - Y)

If scans_until_threshold < 3: EARLY WARNING
If scans_until_threshold < 1: IMMINENT
If rate of change accelerating (second derivative positive): ACCELERATION WARNING
```

This catches the SLOW BLEED from the pre-mortem — individual scans show the metric is still safe, but the TREND is clearly heading toward the trigger.

### Integral Term (Accumulated Drift)

Track cumulative drift from the value at position entry:

```
Integral drift = sum of (current - baseline) across all scans

Even if the metric never crosses the threshold, sustained drift in the wrong direction
accumulates. If integral drift exceeds [threshold × N_scans × 0.5], flag as:
"metric hasn't triggered but has been drifting consistently — investigate"
```

This catches the case where a metric slowly deteriorates without ever triggering a threshold-based alert.

## Output Format

```
## Defense Independence Audit

| Cluster | Parameters | Independence |
|---------|-----------|:---:|
| EARNINGS | F1, F2, F3 | Correlated |
| PRICE | T1, T2 | Correlated |
| COMPETITION | C1 | Independent |
| MACRO | M1 | Independent |

Effective independent layers: 4 of 7
Swiss Cheese Grade: B (57% independence)

Recommendations:
- Consolidate EARNINGS cluster: keep F1 (best detection), relax F2/F3
- Add leading indicator for AI spending (currently all lagging)
- Consider adding TIME-based parameter (alpha decay)

## Rate-of-Change Monitoring
| Parameter | Current | Prev | Rate | Scans to Threshold | Status |
|-----------|:---:|:---:|:---:|:---:|---|
| F1 Revenue | 45% | 52% | -7%/Q | 4.3 | WATCH — decelerating |
| T1 Price | $125 | $130 | -$5/scan | 6.0 | OK |
```

## References
- Swiss Cheese Model: Reason, J. (1990). "Human Error." Cambridge University Press.
- PID Control: Åström, K.J. & Murray, R.M. (2008). "Feedback Systems." Princeton University Press.
- Defense-in-depth: adapted from nuclear safety engineering (IAEA) and aviation (ICAO)
