# Bayesian Engine — Evidence-to-Posterior Pipeline

## The Foundation: Data First, Always

The system REFUSES to produce a numerical posterior from subjective inputs. Rigorous methods applied to hunches with no data is useless — it creates the illusion of precision from nothing.

**The rule:** every numerical input to the chain must be tagged EMPIRICAL, SEMI-EMPIRICAL, or SUBJECTIVE. The chain runs ONLY on EMPIRICAL and SEMI-EMPIRICAL inputs. SUBJECTIVE inputs are listed as unresolved uncertainty that WIDENS the output range — they do not narrow it.

If most inputs are SUBJECTIVE, the system outputs: "insufficient data to produce a posterior. here's what data you need and where to find it." That IS the output. The gauntlet's job in that case is DATA ACQUISITION PLANNING, not probability estimation.

**The achievable target is not pure objectivity** — forward-looking trade analysis always involves judgment. The target is replacing subjective LR estimates with frequency-based estimates derived from actual historical data wherever possible, and being honest about what remains subjective.

---

## Precision Discipline

**Sig figs rule:** No output may imply more precision than inputs justify.

| Input quality | Max sig figs | Example |
|--------------|:---:|---|
| n < 10 frequency data | 1 | "~40%" not "40.0%" |
| n 10-50 frequency data | 2 | "35%" not "35.2%" |
| n > 50 or empirical measurement | 3 | "$215.9B" (from audited filing) |
| Ordinal/subjective estimate | 0 (range only) | "30-45%" not "37.5%" |
| CI propagation output | 2 for mean, 1 for std | "35% ± 13%" |
| EV from Monte Carlo | 2 for mean, 1 for std | "-11% ± 15%" |

**Anti-false-precision rules:**
- Never report a posterior to more decimal places than the prior justifies. Prior from n=19 binomial → posterior gets 1 sig fig (e.g., "~35%").
- Revenue estimates in Fermi: round to nearest $5B for estimates, nearest $0.1B for empirical data.
- Multiple scenarios: whole numbers only (30x, 22x, 15x — never 22.3x).
- The CI is MORE important than the point estimate. Always report "X% ± Y%" never just "X%".
- If the 95% CI crosses a decision boundary (e.g., crosses 50%, or EV CI crosses zero), STATE THIS EXPLICITLY. It means the analysis cannot resolve the question at current data quality.

## Python Tools

The gauntlet uses Python tools in `investing/tools/` for all quantitative computation:
- `monte_carlo_ev.py` — EV distribution from revenue × multiple matrix (not a point estimate)
- `sensitivity_tornado.py` — ranks inputs by EV impact, identifies research priorities
- `ci_propagation.py` — carries uncertainty through the entire posterior chain with bias corrections
- `options_implied_prob.py` — extracts market-implied scenario probabilities from IV data

ALL numerical conclusions (posterior, EV, Kelly) MUST come from these tools, not from manual calculation in the report narrative. The tools enforce precision discipline automatically.

---

## Rules

## The 5 Data Replacement Strategies

Before ANY posterior computation, the system must attempt to replace subjective estimates with frequency data for each of these 5 input types. If replacement isn't possible, the input is marked SUBJECTIVE and contributes only to widening the uncertainty range.

### Data Strategy 1: LRs → Historical Frequency Data

**Instead of:** "LR 2.0x because it feels right"
**Do:** Find historical cases where this evidence appeared and measure outcomes.

For EACH evidence type, search for comparable cases:
```
Evidence: Large order backlog (>2x trailing revenue)
Data task: Pull every S&P 500 company that reported backlog >2x revenue in last 20 years.
Measure: what % saw stock outperform 18 months later vs underperform?
Sources:
  - SEC EDGAR full-text search (free) — 10-K filings mentioning backlog
  - Compustat via WRDS (UCL library likely has access)
  - MacroTrends (free) — financial data for individual companies
Result: "In X of Y comparable cases, large backlog preceded outperformance" → real LR
```

```
Evidence: Ecosystem lock-in (CUDA-scale)
Data task: Find all cases of dominant software ecosystems with >80% share.
Candidates: Windows, x86, iOS App Store, Salesforce, VMware, Oracle DB, SAP, Bloomberg Terminal
Measure: how often did >80% share persist 3 years after first credible challenger?
Sources:
  - Google Scholar: "platform lock-in market share persistence"
  - IDC historical reports (cited in press — reconstruct from citations)
  - Gartner Magic Quadrant archives (dominance identification dates)
Result: "In X of Y cases, CUDA-scale lock-in persisted 3yr+" → real LR
```

```
Evidence: Major customer building in-house alternative
Data task: Timeline the Qualcomm→Apple and Intel→Apple Silicon cases.
Measure: lag from "customer starts building" to "revenue impact hits supplier"
Sources:
  - Company 10-Ks (SEC EDGAR)
  - Counterpoint Research historical
  - AnandTech teardown archives
Result: "Revenue impact lagged in-house announcement by X quarters on average" → real timeline
```

### Data Strategy 2: Prior → Expand Analogue Set to n≥20

**Instead of:** n=4 analogues with ±20pp CI
**Do:** Expand to every tech hardware/software monopoly since 1980 with defensible lock-in.

Target: n=20-30. Candidates beyond the original 4:
Oracle DB, SAP ERP, Cisco IOS, VMware, Adobe Creative Suite, Autodesk, Arm Holdings,
TSMC (fab monopoly), Dolby, Qualcomm patents, Bloomberg Terminal, Palantir, Veeva,
Intel Itanium (failure case), Sun Microsystems (failure), Nokia (failure), BlackBerry (failure),
Yahoo (failure), MySpace (failure — platform monopoly), Xerox PARC (failure to monetize)

For each: code binary outcome = "stock profitable 18 months after peak dominance identified"
Build binomial distribution. Prior becomes a distribution (mean + CI), not a point.

Sources:
- S&P Capital IQ for historical prices + market share
- Gartner Magic Quadrant archives for dominance identification dates
- SSRN: search "technology monopoly duration empirical"
- MacroTrends for stock price histories (free)

### Data Strategy 3: Market Share → Time Series Not Snapshot

**Instead of:** "90% → 86%, one data point"
**Do:** Build a quarterly time series going back to 2019.

Sources ranked by value:
1. Jon Peddie Research quarterly reports — gold standard, expensive but cited extensively in press (reconstruct from citations)
2. Hugging Face API — count CUDA-native vs hardware-agnostic vs TPU-optimized models per quarter (free, proxy for developer adoption)
3. LinkedIn/Indeed job postings — "CUDA engineer" vs "ROCm engineer" vs "TPU engineer" over time (free proxy for demand)
4. IDC GPU market share quarterly report — definitive but $3-5k per report
5. GitHub: ROCm stars/forks/contributors over time vs CUDA equivalent (free)

From time series → fit displacement curve → extrapolate → defensible projection instead of guess.

### Data Strategy 4: Capex Sensitivity → Build a Revenue Model

**Instead of:** "hyperscaler capex is highest EVPPI" (qualitative)
**Do:** Quantify what a 10% capex cut does to NVDA revenue.

Steps:
1. Pull NVDA 10-K customer concentration disclosures (SEC EDGAR)
2. Cross-reference with hyperscaler capex from earnings transcripts
3. Estimate NVDA's implied share of each hyperscaler's AI hardware spend
4. Model three scenarios: capex -20%, flat, +20% → compute implied NVDA revenue
5. Find the lag: compare when hyperscalers announced capex expansions vs when NVDA reported revenue bumps (all in public filings/transcripts)
6. Historical validation: pull semiconductor capex cycles from SOX constituents via Compustat (1994-present)

Result: "A 15% hyperscaler capex cut maps to ~X% NVDA revenue decline with Y-quarter lag" → real sensitivity number.

### Data Strategy 5: EV Inputs → Distribution from Market Data

**Instead of:** gut-feel win/loss magnitudes
**Do:** derive from actual market data.

Win magnitude:
- Sell-side price targets: 41 analysts, low $100, high $360, mean $265-278
- These ARE a distribution. Fit it. Read 75th percentile as bull case, 25th as base case.
- Sources: MarketBeat, TipRanks, StockAnalysis (free)

Loss magnitude:
- Pull every mega-cap tech (>$500B) P/E compression from >30x to <20x since 2000
- Candidates: INTC 00-02, CSCO 00-02, MSFT 00-02, QCOM 00-02, META 2022, NFLX 2022
- Measure drawdown for each. Average and range = loss distribution.
- Sources: MacroTrends P/E history (free)

Kelly Monte Carlo:
- With P(win), E(win), P(loss), E(loss) as distributions not points
- Run 10,000 simulations of the Kelly formula
- Output: Kelly fraction distribution — the RANGE where sizing is EV-positive
- Implementation: Python, ~200 lines. Public Kelly MC implementations on GitHub.

---

## Data Readiness Gate

Before computing a posterior, classify every evidence item:

| Status | Definition | Can enter chain? |
|--------|-----------|:---:|
| **EMPIRICAL** | Direct measurement from public filings/data (revenue, price, margins) | YES |
| **FREQUENCY-BASED** | Historical frequency from comparable cases (n≥10) | YES |
| **SEMI-EMPIRICAL** | Derived from data with stated assumptions (market share estimate from proxies) | YES, with widened uncertainty |
| **SUBJECTIVE** | Analyst judgment with no frequency backing | NO — widens range only |

**Data Readiness Score:**
```
Score = (EMPIRICAL + FREQUENCY + SEMI-EMPIRICAL items) / (total evidence items)

Score > 0.7: proceed with posterior computation
Score 0.4-0.7: compute posterior but flag as LOW CONFIDENCE, widen range significantly
Score < 0.4: DO NOT compute posterior. Output a data acquisition plan instead.
```

If score < 0.4, the gauntlet output is not a verdict — it's a research todo list prioritized by EVPPI.

---

### Rule 1: Prior — Match-Weighted from Analogue Set

The prior must come from frequency data, weighted by analogue match quality.

**Match-weighted base rate (not simple frequency):**
Each analogue gets a match score (0-1) based on how well it matches the target stock's SPECIFIC threat profile. Score across 3 dimensions:
- Hardware/software monopoly with ecosystem dependency (0-0.33)
- Threatened by customer vertical integration specifically (0-0.33)
- Market undergoing architectural shift (0-0.33)

```python
# Weighted base rate
weighted_rate = sum(match_i × outcome_i) / sum(match_i)
# NOT simple_rate = sum(outcome_i) / n
```

Low-match analogues (ASML, TI) count LESS than high-match analogues (Qualcomm, Intel). This prevents inflating the base rate with irrelevant comparisons.

**Report BOTH simple and weighted rates.** If they diverge significantly, state why and use the weighted rate.

**Minimum standard:** n ≥ 15 analogues for the prior. Always report Wilson CI. Never use a point estimate from small samples without the CI.

**NEVER hide the blending math.** If the prior is derived from multiple populations or adjustments, show every step:
```
Match-weighted rate: X%
Wilson 95% CI: [A%, B%]
High-match only (n=K): Y% (for reference)
Prior used: X% ± CI
```

### Rule 2: Evidence Processing — v4 Chain Mechanics

**Order of operations (FIXED, applies to every LR):**
```
1. Assign RAW ordinal LR from category (STRONG_FOR=1.40, MOD_FOR=1.15, etc.)
2. Apply quality score: step2 = 1 + (raw - 1) × quality
3. Apply inside-view dampening: ONLY if evidence is NOT empirical
   - EMPIRICAL: dampening = 1.0 (NO dampening — observed facts are not inside-view)
   - SEMI-EMPIRICAL: dampening = 0.8
   - SUBJECTIVE: dampening = 0.6
   step3 = 1 + (step2 - 1) × dampening
4. Apply dependency weight: final = 1 + (step3 - 1) × dep_weight
```

**v4 fix:** Inside-view dampening does NOT apply to EMPIRICAL evidence. "OpenAI announced AMD deal" is an observed fact, not case-specific reasoning.

**Show RAW LRs.** The chain table must include both raw and final:
```
| # | Evidence | Status | Raw LR | Q | IV | Dep | Final LR | Post ± CI |
```

**Regime dependency:** VIX, Fed, sector rotation = ONE combined update, not three.

Every estimate labeled:

| Status | Meaning | IV Dampening |
|--------|---------|:---:|
| **EMPIRICAL** | Direct measurement | 1.0 (none) |
| **SEMI-EMPIRICAL** | Data with assumptions | 0.8 |
| **SUBJECTIVE** | Judgment, no data | 0.6 |

For each evidence item entering the chain:
```
Evidence: [what]
Status: [EMPIRICAL / SEMI-EMPIRICAL / SUBJECTIVE]
Directional effect on H1: [positive / negative / ambiguous]
Magnitude estimate: [SUBJECTIVE: mild / moderate / strong, with reasoning]
Uncertainty: [how wrong could this estimate be?]
```

Do NOT convert subjective magnitude estimates into precise LR numbers or precise posterior ranges. The ordinal categories below produce DIRECTION and ROUGH MAGNITUDE. The output is a RANGE, not a point.

| Category | Meaning | Posterior shift mechanism |
|----------|---------|------------------------|
| STRONG FOR | Would be surprising if theory false | Prior × 1.3-1.5 (shift the range upward by ~30-50% of remaining distance to ceiling) |
| MODERATE FOR | More likely if theory true than false | Prior × 1.1-1.2 |
| WEAK FOR | Slightly favors theory | Prior × 1.03-1.08 |
| AMBIGUOUS | Mixed or irreducibly unclear | No update. File with explanation. |
| WEAK AGAINST | Slightly disfavors theory | Prior × 0.92-0.97 |
| MODERATE AGAINST | More likely if theory false | Prior × 0.8-0.9 |
| STRONG AGAINST | Would be surprising if theory true | Prior × 0.5-0.7 |

**Mechanical derivation of posterior range:** each update produces a range because the multiplier itself is a range. Show the math:
```
Prior: 40% (range 25-55%)
Update 1: STRONG FOR (×1.3 to ×1.5)
  Low path: 25% × 1.3 = 32.5%
  Central: 40% × 1.4 = 56% → cap at 55% (prior ceiling)
  High path: 55% × 1.5 = 82.5% → cap at 80%
  New range: 32.5-80%, central ~52%
```

This is STILL subjective (the multiplier ranges are judgment), but now the MECHANISM is visible and each step is auditable. The subjectivity lives in the category assignment, not in an unexplained number.

**Rule 2a: Prior weighting for mixed-population analogues**

When the analogue set splits into distinct populations (e.g., ongoing vs peaked dominance), explicitly weight which population the stock belongs to:

```
Population A (ongoing dominance): base rate X%, n=N_A
Population B (peaked dominance): base rate Y%, n=N_B
Stock's membership: W% in A, (1-W)% in B

Weighted prior = W × X + (1-W) × Y

W must be DERIVED from measurable criteria, not asserted:
- What % of the stock's revenue comes from ongoing-dominance segments?
- What % from peaked segments?
- Use revenue share as the weight.

Example (NVDA): training (ongoing) = 45% of DC revenue, inference (peaked) = 55%
W = 0.45 → Prior = 0.45 × 100% + 0.55 × 33% = 45% + 18.2% = 63.2%... but wait —
this is P(monopoly persists), not P(trade profitable). Adjust:
For trade profitability: ongoing = 100%, peaked = 33%
W = 0.45 → 0.45 × 100% + 0.55 × 33% = 63%... this seems too high.

The issue: "100% profitable" from n=7 ongoing has wide CI (~65-100%).
With CI: ongoing = 65-100%, peaked = 15-55%
Weighted: 0.45 × 82% + 0.55 × 35% = 37% + 19% = 56% central
Range: 0.45 × 65% + 0.55 × 15% = 38% ... 0.45 × 100% + 0.55 × 55% = 75%

Report: Prior = 38-75%, central ~56%
```

The math is crude but VISIBLE. Every input is traceable.

**Rule 2b: Revenue probability → hypothesis mapping must be EXPLICIT**

The revenue scenarios in the Fermi matrix must map directly from hypothesis probabilities:

```
Posterior gives: H1=X%, H2=Y%, H3=Z%, H4=W%
Each hypothesis implies a revenue scenario. Show the mapping:

H1 (monopoly persists, stock rises) → Bull revenue ($365B) → P = X%
H2 (dominant but sideways) → Base revenue ($300B) → P = Y%
H3 (custom silicon erodes) → Bear revenue ($240B) → P = Z%
H4 (fairly valued) → maps to Base revenue but different multiple → split Y%

If hypotheses don't map 1:1 to revenue scenarios, show how you decompose.
```

NEVER state revenue probabilities without showing which hypothesis they derive from.

**Rule 2c: Multiple probabilities must be grounded in frequency data**

Multiple scenario probabilities (Bull/Current/Bear multiple) are the MOST SENSITIVE parameters in the EV calculation. They must NOT be asserted.

Until WRDS provides historical frequency data:
- Pull EVERY instance of the stock's own P/E over the last 5 years from MacroTrends
- Classify: what % of time was P/E in bull range, current range, bear range?
- Adjust for current regime (if hostile regime historically correlates with lower multiples, weight bear higher)
- Show the data and the derivation

```
GOOGL 5-year P/E history:
  >30x: 15% of observations
  22-30x: 55% of observations
  <22x: 30% of observations

Current regime (hostile) historically correlates with lower quartile multiples.
Adjustment: shift 10pp from bull to bear.
Final: Bull 10%, Current 50%, Bear 40%
```

This is STILL approximate but it's frequency-grounded, not a guess. And the derivation is shown.

**Rule 2d: Loss magnitude must reconcile with matrix**

The empirical loss magnitude distribution (n=10, median -75%) MUST appear as a cell in the revenue × multiple matrix. If the matrix worst case is -59% but comparable P/E compression cases show median -75%, add a column or row that captures the -75% scenario explicitly.

Minimum: the matrix must include a cell that equals or exceeds the MEDIAN empirical drawdown from the loss magnitude study. If it doesn't, the matrix is understating downside and the EV is biased upward.

**Rule 2e: Data readiness score = requirements coverage**

Data readiness is measured against what the MODEL REQUIRES, not what was collected:

```
Model requires:
1. Prior from n≥15 analogues with CI [YES/NO]
2. Revenue estimates from empirical segment data [YES/NO]
3. Multiple probabilities from historical frequency [YES/PARTIAL/NO]
4. Loss magnitude from comparable cases [YES/NO]
5. Competitive position from market share data [YES/NO]
6. Macro regime from empirical indicators [YES/NO]
7. Customer concentration from SEC filings [YES/NO]
8. Capex sensitivity from cross-referenced filings [YES/NO]
9. Developer adoption time series [PARTIAL/NO]
10. Full Compustat financials for analogues [NO — needs WRDS]

Score = (YES count × 1.0 + PARTIAL count × 0.5) / total requirements
```

The score reflects how well the model's REQUIREMENTS are met, not how many data points were collected.

### Rule 3: Evidence Dependencies — Partial Correlation Handling

Binary group-and-drop is too crude. Evidence often has PARTIAL shared causes.

For each pair of evidence items, assess:
```
E1: $500B backlog
E2: CUDA ecosystem maturity

Shared cause: AI training demand + ecosystem lock-in
Shared variance: ~60% (CUDA explains most of the backlog, but Blackwell performance and sovereign AI mandates contribute independently)
Independent signal from E2 given E1: ~40%

Treatment: E1 enters at full weight. E2 enters at REDUCED weight (roughly 40% of what it would be standalone).
This is SUBJECTIVE. State the estimated shared variance and why.
```

If shared variance > 80%: treat as effectively one signal, use the higher-IC item.
If shared variance 30-80%: enter both, second at reduced magnitude.
If shared variance < 30%: treat as independent.

### Rule 4: IC and LR Are Different Tools for Different Jobs

**Physically separate them in all output:**

ACH section uses IC — appears in the ACH Evidence Matrix table ONLY.
Purpose: identify which evidence DISCRIMINATES between hypotheses.

Bayesian section uses ordinal magnitude categories — appears in the Posterior Chain table ONLY.
Purpose: estimate how much each evidence item moves the posterior.

They NEVER appear in the same table. They NEVER reference each other's numbers. If you find yourself writing "3.0 bits combined" next to a posterior update, you're mixing frameworks.

### Rule 5: Regime Is Complex Evidence, Not a Simple LR

A hostile macro regime affects H1 through MULTIPLE channels with different magnitudes:
- P(multiple compression) increases → bearish for stock price
- P(capex pullback) increases → bearish for revenue
- P(risk-off rotation) → bearish for all tech regardless of fundamentals

This is too complex for a single LR. Instead, regime evidence enters as MULTIPLE separate items:
```
Evidence: VIX elevated (24-27)
  → Effect: increases P(short-term volatility and drawdown)
  → Magnitude: MODERATE AGAINST trade profitability
  → Note: affects timing, not thesis truth

Evidence: Fed holding at 3.50-3.75%
  → Effect: multiple compression pressure on growth stocks
  → Magnitude: WEAK AGAINST (rates already priced in by market)

Evidence: Tech sector rotation out ($3.5B outflows)
  → Effect: passive selling pressure regardless of fundamentals
  → Magnitude: MODERATE AGAINST trade profitability (NVDA is 38% of XLK)
```

Each enters the chain separately. This is more honest than a single "0.7x regime modifier" because the individual components can be challenged.

### Rule 6: Ambiguous Evidence Gets Labeled, Not Forced

Some evidence is irreducibly ambiguous — it simultaneously provides signal in opposing directions FROM A SINGLE DATA POINT, not because two things were combined.

Example: "NVDA market share declined from 90% to 86%"
- Bearish reading: share erosion, competitive threats materializing
- Bullish reading: TAM grew so fast even at 86% absolute revenue increased

This is ONE data point with genuine interpretive ambiguity. Do NOT:
- Split into two updates (they're not two things, they're two readings of one thing)
- Net them to zero (that discards real information)
- Force a direction (that resolves ambiguity dishonestly)

DO:
- Label as AMBIGUOUS
- State both readings
- Assign it ZERO posterior update but note it in the "evidence requiring future resolution" section
- Specify what NEW data would resolve the ambiguity (e.g., next quarter's share data showing direction of trend)

### Rule 7: IC Threshold — Justified and Specified

Threshold: IC > 0.5 bits (= evidence consistent with ≤3 of 4 hypotheses, i.e., it excludes at least one).

Justification: evidence consistent with ALL hypotheses (IC = 0.0) literally cannot discriminate. Evidence consistent with 3 of 4 (IC = 0.42) barely discriminates. The threshold is set at the point where evidence excludes at least one hypothesis.

Below-threshold evidence:
- Still appears in the ACH matrix (it exists, just has low diagnostic value)
- Does NOT appear in the Posterior Chain
- Does NOT get a magnitude assessment
- Gets a single line in a "Low-IC evidence filed" section at the end

---

## Posterior Chain — Output Format

```
## Posterior Chain

### Prior
Question tested: [exact question]
Analogue rate: X% (n = Y, CI: A% - B%)
Prior: X% ± Z%

### High-IC Evidence Updates (IC > 0.5 bits only)
| # | Evidence | Status | Direction | Magnitude | Dep. Group | Shared Var | Posterior Range |
|---|---------|--------|-----------|-----------|------------|:---:|:---:|
| 1 | [what] | EMP/SEMI/SUBJ | FOR/AGAINST/AMBIG | STRONG/MOD/WEAK | [group] | N/A (first) | [X% - Y%] |
| 2 | [what] | ... | ... | REDUCED (40% indep.) | same as 1 | 60% | [X% - Y%] |

### Posterior Estimate
Range: X% - Y% (not a point estimate)
Central tendency: ~Z% (if forced to a single number)
Key uncertainty driver: [which subjective input matters most]

### Sanity Check — Weighted Lens Comparison
Weighted lens: A%
Posterior: ~Z%
Gap: [X pp]
Explanation: [specific reason — e.g., "weighted lens gives more credit to sentiment (SUPPORTS at 0.4 weight) while posterior chain correctly excludes low-IC sentiment evidence"]
Resolution: use [LOWER / POSTERIOR / LENS] because [reason]

### Low-IC Evidence Filed (IC < 0.5, no posterior update)
- [evidence item] — IC [X], consistent with H1/H2/H3/H4
```

---

## Revenue × Multiple Matrix — Required Constraints

The Fermi output MUST include:
- At least 4 revenue scenarios (mapped to H1-H4)
- At least 3 multiple scenarios:
  - **Bull multiple**: justified re-rate (e.g., market reclassifies the stock)
  - **Current multiple**: holds at today's level
  - **Bear multiple**: 2/3 compression from current (e.g., 35x → 12x, or current/3). This floor MUST be included — it represents the "what if the narrative breaks" scenario.
- The full matrix has ≥12 cells (4 revenue × 3 multiple)

## EV Calculation — Prescribed Derivation Order

1. Populate revenue × multiple matrix (from Fermi + contrarian)
2. Calculate implied market cap for each cell
3. Calculate return vs current price for each cell
4. Assign probabilities to each SCENARIO (from posterior chain — map hypothesis probabilities to revenue scenarios, multiple probabilities from regime + sentiment analysis)
5. EV = Σ(P_i × return_i) across all cells
6. If EV < 0: report "NEGATIVE EXPECTED VALUE — do not trade"
7. If EV > 0: compute Kelly fraction: f* = (p × b - q) / b where p = P(positive return), b = avg(positive returns)/avg(negative returns)
8. If Kelly ≤ 0: even with positive EV, risk/reward doesn't justify position. Report this.

---

## Calibration System

The posterior is a structured opinion. The ONLY way to make opinions calibrated is to track them over time.

After every theory resolves (position closed, thesis confirmed/broken):
1. Record: posterior estimate at time of trade, actual outcome
2. Update `investing/methodologies/lens-calibration.md` with per-lens accuracy
3. Over time (10+ resolved theories): compute calibration curve
   - "When I said 30%, how often was I right?" → if 30% estimates are right 50% of the time, I'm systematically underconfident
4. Apply calibration correction to future posteriors

Until we have calibration data (n < 10 resolved theories): **treat the posterior range as directional, not precise.** Size conservatively. The system gets better with data — but right now we have zero calibration history.
