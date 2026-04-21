# Demand Chain Analysis

**Core Question:** What are the layers between end users and this company's revenue, and what are the leading indicators at each layer?

Runs as part of Phase 0 (before regime detection). Maps every layer of demand upstream from the company's revenue. Each layer has independently monitorable leading indicators that provide 1-3 quarter advance warning of revenue trajectory changes.

## Why This Exists

The system was excellent at analyzing what a company REPORTS and poor at analyzing what DRIVES the demand for what they sell. Revenue is a LAGGING indicator. The demand chain surfaces LEADING indicators at each layer.

## Process

### Step 1: Map the Demand Chain
For the company's PRIMARY revenue source, trace demand backward to end users:

```
NVDA Example:
  End users (enterprises, researchers, governments)
    → AI application developers (what they build)
      → AI training/inference workloads (compute demand)
        → Cloud GPU providers (CoreWeave, Lambda, hyperscalers)
          → NVDA data center revenue (what we see in earnings)

GOOGL Example:
  End users (consumers searching, watching, emailing)
    → Advertisers (buying ad inventory)
      → Google Search/YouTube ad auctions (monetization layer)
        → Alphabet advertising revenue

  Enterprises (using cloud/AI tools)
    → IT departments (procuring cloud services)
      → Google Cloud contracts
        → Alphabet cloud revenue
```

### Step 2: Identify Leading Indicators at Each Layer

For each layer, find a monitorable data point that moves BEFORE the next layer:

| Layer | NVDA Leading Indicator | Source | Lead Time |
|-------|----------------------|--------|-----------|
| End users | Gartner CIO survey: AI infrastructure vs AI application priority | Gartner press releases (free) | 2-3Q |
| AI developers | AI startup Series A/B funding volume | Crunchbase (free tier) | 2Q |
| Workloads | Inference price per token trend | Artificial Analysis (free) | 1-2Q |
| Cloud providers | Hyperscaler capex language | Earnings transcripts | 1Q |
| Supply constraints | TSMC CoWoS capacity, HBM supply | TSMC monthly revenue, SK Hynix earnings | 1Q |
| Macro context | Electricity prices for data centers | EIA monthly (free) | 2Q |
| Sovereign demand | Government AI program announcements | Georgetown CSET (free) | 1-2yr |

### Step 3: Classify Each Layer's Fragility

| Fragility Level | Meaning | Example |
|:---:|---|---|
| POLITICAL | Mandated by government, won't be cut for ROI reasons | Sovereign AI programs |
| STRATEGIC | Driven by competitive necessity, survives ROI scrutiny | Hyperscaler capex (fear of falling behind) |
| ROI-DEPENDENT | Continues only if demonstrable returns | Enterprise AI deployment |
| SPECULATIVE | Funded by venture/growth capital, highly cyclical | AI startup GPU cloud demand |

Revenue from POLITICAL/STRATEGIC layers is a floor. Revenue from ROI-DEPENDENT/SPECULATIVE layers is at risk in a capex downturn. The mix tells you how fragile total demand is.

### Step 4: Segment-Specific Demand Splits

Map the company's revenue to demand segments that aren't in their earnings breakdown:

```
NVDA Data Center ($194B):
  - Hyperscaler training: ~40% (STRATEGIC — competitive necessity)
  - Hyperscaler inference: ~25% (ROI-DEPENDENT — needs to show returns)
  - Enterprise on-premise: ~15% (ROI-DEPENDENT but stickier procurement cycles)
  - Sovereign AI: ~10% (POLITICAL — mandated)
  - AI startups (via cloud): ~10% (SPECULATIVE — VC-funded)
```

These splits aren't reported by NVDA but can be estimated from earnings call commentary, hyperscaler capex breakdowns, and sovereign AI program tracking.

## Output

```
## Demand Chain: [TICKER]

### Revenue Layers
[diagram of demand chain]

### Leading Indicators (monitorable)
| Layer | Indicator | Source | Lead Time | Current Signal |
|-------|-----------|--------|-----------|----------------|

### Demand Fragility Mix
| Segment | Revenue % | Fragility | At Risk in Downturn? |
|---------|-----------|-----------|---------------------|

### Demand Floor
Revenue from POLITICAL + STRATEGIC segments: $X (Y% of total)
This is the minimum revenue even in a capex downturn.
```
