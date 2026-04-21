# Fermi Decomposition Valuation

Adapted from Enrico Fermi's estimation technique. Instead of trying to value a stock as one opaque number, decompose it into independently estimable components. The total uncertainty is often SMALLER than the whole-blob estimate.

## Why This Works

Fermi proved that decomposing a hard question into easier sub-questions, even with rough estimates for each, produces a more accurate answer than trying to estimate the whole thing directly. This is because:

1. **Errors partially cancel**: overestimates on some components offset underestimates on others
2. **Each component is independently verifiable**: you can check GPU revenue separately from auto revenue
3. **Uncertainty is visible**: you see WHICH component has the widest range, and that's where more research helps most
4. **Assumptions are explicit**: instead of "NVDA is worth $X", you see exactly WHY you think it's worth $X

## Process

### Step 1: Identify Revenue/Value Components
Break the company into its business segments or value drivers:

Example for NVDA:
```
NVDA Total Value = Data Center + Gaming + Auto/Robotics + Professional Visualization + Licensing
```

### Step 2: Estimate Each Component Independently
For each component, estimate a RANGE (not a point):

```
Component: Data Center
- Current annual revenue: $X billion (known — look up)
- Growth rate next 2 years: [LOW: 20%, MID: 40%, HIGH: 60%]
- Projected revenue in 2 years: [LOW: $A, MID: $B, HIGH: $C]
- Appropriate margin: [LOW: 60%, MID: 67%, HIGH: 72%]
- Appropriate multiple: [LOW: 20x, MID: 30x, HIGH: 40x]
- Component value: [LOW: $X, MID: $Y, HIGH: $Z]
```

Repeat for each component.

### Step 3: Compose with Uncertainty Ranges

```
| Component | LOW | MID | HIGH | % of Total (MID) |
|-----------|-----|-----|------|:-:|
| Data Center | $A | $B | $C | 75% |
| Gaming | $D | $E | $F | 12% |
| Auto/Robotics | $G | $H | $I | 8% |
| Prof Viz + Other | $J | $K | $L | 5% |
| **Total** | **$SUM_LOW** | **$SUM_MID** | **$SUM_HIGH** | 100% |

Current market cap: $M
Implied upside/downside:
  LOW scenario: [X]% from current
  MID scenario: [Y]% from current
  HIGH scenario: [Z]% from current
```

### Step 4: Sensitivity Analysis
Which component has the WIDEST uncertainty range? That's where:
- More research would have the highest impact
- The theory is most vulnerable
- You should focus your data gathering effort

```
Sensitivity: Total value changes by [X]% for every 10% change in [component]
Most sensitive to: [which component and which assumption within it]
```

### Step 5: Scenario Mapping
Map the Fermi decomposition to the competing hypotheses:

```
H1 (bull thesis): HIGH data center + MID gaming + MID auto = $X
H2 (moderate): MID data center + MID gaming + LOW auto = $Y
H3 (bear): LOW data center + LOW gaming + LOW auto = $Z
H4 (fairly valued): current market cap ≈ $M → requires what assumptions?
```

Work BACKWARD for H4: what growth/margin/multiple assumptions does the CURRENT price imply? If those implied assumptions are unreasonable, the stock is mispriced. If they're reasonable, it's fairly valued and there's no edge.

## The Reverse Fermi (Most Valuable)

Instead of "what is the stock worth?" ask: **"what does the current price IMPLY about each component?"**

```
Current market cap: $1.5T
Backing out implied assumptions:
- Implied data center growth: ~50% CAGR for 3 years
- Implied margin: ~70% sustained
- Implied multiple: ~35x forward earnings

Are these implied assumptions reasonable?
- Data center growth 50%: [plausible / aggressive / insane]
- 70% margins sustained: [plausible / aggressive / insane]
- 35x multiple on $60B earnings: [plausible / aggressive / insane]
```

If the implied assumptions are already aggressive, the upside is LIMITED even if the theory is correct — it's PRICED IN.

If the implied assumptions are conservative, there's upside even in the moderate scenario.

## Output Format

```
## Fermi Decomposition: [TICKER]

### Forward Composition
[component table with LOW/MID/HIGH]
Total estimated value: $LOW - $MID - $HIGH
Current market cap: $X
Implied return: LOW [X]% / MID [Y]% / HIGH [Z]%

### Reverse Decomposition (what's priced in?)
[implied assumptions for current price]
Reasonableness: [assessment of each implied assumption]

### Sensitivity
Most sensitive component: [which]
Most sensitive assumption: [which]
Research priority: [where to focus next]

### Scenario Mapping
[which hypothesis corresponds to which Fermi scenario]
```

## Integration

The Fermi decomposition feeds directly into:
- **Expected Value analysis** in `/sizing` — the LOW/MID/HIGH map to the scenario-weighted EV table
- **Parameters** — the most sensitive component should have the most parameters watching it
- **Data streams** — the most sensitive assumption tells you what data to find

## References
- Fermi estimation technique: Enrico Fermi, University of Chicago
- Sum-of-the-parts valuation: standard institutional equity research methodology
- Reverse Fermi / implied expectations: adapted from Michael Mauboussin's "Expectations Investing"
