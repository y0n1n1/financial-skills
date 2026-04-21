# Monetization Mapping

**Core Question:** How does each theory point convert into actual revenue, and how does that revenue convert into stock price appreciation?

A theory without a monetization chain is an incomplete theory. These are companies — they need to make money for the stock to go up.

## The Chain

```
Theory Point (what's true)
    → Monetization Mechanism (how it makes money)
        → Revenue Line (where it shows up in financials)
            → Growth Driver (why it grows)
                → Valuation Impact (why the market pays more for it)
                    → Stock Price (what you profit from)
```

Every theory point must be traceable through this chain. If a point can't connect to revenue, it's an interesting fact, not an investment thesis.

## Process

### Step 1: For Each Theory Point, Map the Money Chain

For every point in the theory's living list:

```
Point: [theory point]
Monetization: [how does this specifically generate revenue?]
Revenue line: [which segment of the income statement does it hit?]
Current contribution: [how much revenue does this drive today? WebSearch]
Growth trajectory: [is this revenue line growing, stable, or shrinking?]
Margin profile: [is this high-margin or low-margin revenue?]
```

### Step 2: Identify the Revenue Concentration

Which theory points drive the MOST revenue? Which are speculative future revenue?

```
| Theory Point | Revenue Today | Revenue in 2 Years (est) | Margin | Certainty |
|-------------|:---:|:---:|:---:|:---:|
| Point 1 | $Xbn | $Ybn | 70% | HIGH |
| Point 2 | $0 | $Xbn | ?? | LOW (speculative) |
| ... | ... | ... | ... | ... |
```

If 80% of the revenue case depends on ONE theory point, that point is the linchpin. It needs the most parameters watching it and the tightest FMEA scoring.

### Step 3: Map the Valuation Mechanism

How does revenue → stock price? Three mechanisms:

1. **Earnings growth** — revenue grows → EPS grows → stock price follows earnings
   - This is the standard path. Requires revenue to actually flow to the bottom line (not consumed by costs).

2. **Multiple expansion** — market re-rates the stock higher because the NARRATIVE changes
   - Example: Meta was a "social media company" trading at 15x. If market reclassifies it as an "AI company," multiple expands to 25x even without revenue change.
   - This is how catalyst theories (like META) create stock price movement.

3. **Multiple compression risk** — stock is ALREADY priced for the theory being true
   - Example: NVDA at 35x P/E when the theory requires continued dominance. If the theory is true but growth decelerates even slightly, the multiple compresses and the stock drops despite the company performing well.
   - This is the "right company wrong trade" failure mode from the pre-mortem.

### Step 4: The "Priced In" Test

For each monetization chain:
```
Is this revenue stream already reflected in the current stock price?

Current market cap: $X
Current revenue from this point: $Y
Market-implied growth rate for this revenue: Z% (from reverse Fermi)

If the market already assumes Z% growth and you think growth will be Z%:
→ NO ALPHA. The theory is correct but it's priced in.

If the market assumes Z% but you think growth will be 2Z%:
→ ALPHA EXISTS. The market underestimates this revenue stream.

If the market assumes Z% but you think growth will be 0.5Z%:
→ NEGATIVE ALPHA. You actually think the stock is overpriced on this point.
```

This connects directly to the Fermi reverse decomposition and market mechanics (options-implied expectations).

### Step 5: Revenue Risk Assessment

For each revenue line:
```
Revenue dependency: [what has to remain true for this revenue to continue?]
Revenue fragility: [how quickly could this revenue disappear?]
  - RECURRING (subscriptions, enterprise contracts) → stable
  - CYCLICAL (hardware sales, capex-dependent) → volatile
  - SPECULATIVE (not yet monetized) → uncertain
Revenue diversification: [how many revenue lines does the theory rely on?]
```

## Output Format

```
## Monetization Map: [TICKER]

### Revenue Chain per Theory Point
| # | Theory Point | Monetization | Revenue Line | Today | Est 2yr | Margin | Priced In? |
|---|-------------|-------------|-------------|:---:|:---:|:---:|:---:|
| 1 | [point] | [how] | [segment] | $Xbn | $Ybn | X% | YES/NO/PARTIAL |

### Revenue Concentration
[X]% of revenue case depends on point [N] — this is the linchpin.

### Valuation Mechanism
Primary path: [earnings growth / multiple expansion / both]
Multiple compression risk: [LOW/MEDIUM/HIGH]
"Priced in" assessment: [how much of the theory is already in the stock price]

### Revenue Risk Profile
Recurring: [X]%
Cyclical: [Y]%
Speculative: [Z]%
Overall fragility: [LOW/MEDIUM/HIGH]
```

## Integration

This step runs AFTER the 6 analytical lenses and BEFORE market mechanics. It bridges the gap between "is the theory true?" and "does the truth make money?"

The monetization map feeds into:
- **Fermi decomposition** — the revenue lines become the Fermi components
- **EV/asymmetry sizing** — the revenue growth estimates become the scenario probabilities
- **Parameters** — the revenue linchpin gets the most parameters watching it
- **Market mechanics** — the "priced in" test aligns with options-implied expectations

## Rules
- If a theory point CAN'T connect to revenue within 3 years, mark it as SPECULATIVE and reduce its weight in the overall assessment
- Always check if the monetization mechanism requires ADDITIONAL things to be true (e.g., "WhatsApp monetizes" requires Meta to build a commerce/payment platform, not just have users)
- Revenue estimates must be ranges, not point estimates
- Use WebSearch to get current segment revenue data — never guess
