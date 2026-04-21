# Fundamental Triggers

**Core Question:** What financial metrics, if they changed, would break or weaken this theory?

## What to Gather (via WebSearch)

Search for: "[TICKER] earnings revenue margins quarterly" and "[TICKER] analyst estimates consensus"

Pull current values for:
- Revenue (last quarter, YoY growth rate)
- EPS (actual vs consensus history)
- Gross margin, operating margin
- Free cash flow
- Forward guidance / analyst estimates for next quarter
- Any key company-specific metrics (e.g., data center revenue for NVDA, cloud revenue for GOOGL)

## Trigger Categories

### Revenue Triggers
- **Growth deceleration**: if YoY revenue growth drops below X%
  - Set threshold relative to current growth rate (e.g., if growing 80%, trigger at <40% — a halving of growth)
  - Severity: MAJOR (if growth is the thesis) or MINOR (if growth is secondary to thesis)

### Earnings Triggers
- **EPS miss**: if earnings miss consensus by more than X%
  - Typical threshold: >10% miss = MINOR, >20% miss = MAJOR
  - Note: a single miss might be noise, consecutive misses = trend

### Margin Triggers
- **Margin compression**: if gross/operating margin drops below X%
  - Set relative to current (e.g., if gross margin is 75%, trigger at <65%)
  - Theory-specific: if thesis claims pricing power, margin is sacred

### Guidance Triggers
- **Guidance cut**: management lowers forward guidance
  - Any meaningful guidance cut = MINOR at minimum
  - Guidance cut + earnings miss = MAJOR

### Company-Specific
- Read the theory statement and identify what specific financial metrics THE THEORY depends on
- E.g., if theory is "NVDA's data center revenue is unstoppable" → trigger on data center revenue specifically, not total revenue

## Output Format

For each proposed trigger:
```
| # | Trigger | Current Value | Threshold | Severity | Theory-Specific? |
```

Include 3-5 fundamental triggers, mix of theory-specific and generic.
