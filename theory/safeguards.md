# TFG Safeguards — v6.0.0

Blocking checks that must pass before an analysis is valid. Violations are ERRORS, not warnings.

## Output Ordering Rule
**Lab report FIRST, then Vercel page.** The lab report is the permanent scientific record. The Vercel page is a presentation of the lab report. Never deploy a page without a completed lab report.

## Safeguard 1: Contamination Firewall

Analogues must be selected WITHOUT seeing outcomes. Temporal separation enforced.

```
SEQUENCE (each step timestamped):
1. Define match criteria BEFORE pulling outcomes
   Criteria = observable properties, NOT outcome-dependent
   WRONG: "platforms that successfully integrated AI"
   RIGHT: "dominant distribution platforms facing a technology transition"

2. Lock candidate list BEFORE coding outcomes
   List every company meeting criteria. Do not look up profitability.

3. Code outcomes AFTER list is locked
   Now check if each was profitable. Cannot add/remove companies.

4. Compute base rate from locked coded list
   Whatever rate comes out IS the prior. No adjustments.

5. Document sequence with timestamps
   If any steps share timestamps: prior is CONTAMINATED
   Contaminated prior → use simple frequency only, no weighting
```

## Safeguard 2: Methodology Consistency

ONE methodology for ALL analyses. No ad-hoc changes per stock.

```
REGISTRY RULES:
- Prior weighting method: LINEAR match-weighted (consistent across all stocks)
  Change requires: version bump + retroactive recalculation of ALL active cards
- Evidence dampening: empirical=1.0, semi-empirical=0.8, subjective=0.6
- Regime: always ONE combined update
- Raw LRs: always shown

Any deviation from registry = BLOCKING ERROR
Fix the deviation OR update the registry (which forces re-run of all active cards)
```

## Safeguard 3: Pre-Registration Adversarial Review

When |actual - expected posterior| > 15pp:

```
1. Write strongest case this IS motivated reasoning (min 3 sentences, specific)
2. Write strongest case it's legitimate (min 3 sentences, methodology-based)
3. Identify single data point that would resolve the debate
4. Assign bias probability P(motivated reasoning) — must be 5-95%, never 0% or 100%
5. Adjusted posterior = (1 - bias_prob) × actual + bias_prob × expected
6. Use adjusted posterior for conviction and sizing
```

## Safeguard 4: Internal Consistency Checks (run before verdict)

```
CHECK 1: Largest stated risk must have proportional IC in chain
  If top risk has lowest LR impact: INCONSISTENCY → fix or explain

CHECK 2: Accruals explanation must be accounting-valid
  Capex is investing CF, NOT operating. Cannot explain operating accruals.
  Valid explanations: revenue recognition, A/R growth, deferred revenue, SBC, working capital
  Invalid: capex, debt, buybacks, dividends

CHECK 3: 95% CI lower bound vs conviction
  If CI_lower < 45% and conviction ≥ 3: flag for justification

CHECK 4: EV and Kelly must agree on sign
  Opposite signs = investigate
```

## Safeguard 5: Theory Interlock Completeness

Every linked stock requires BOTH directions AND BOTH timeframes:

```
Near-term (<12mo): if linked succeeds → effect | if linked fails → effect
Medium-term (12-36mo): if linked succeeds → effect | if linked fails → effect
Net direction: POSITIVE / NEGATIVE / AMBIGUOUS
Portfolio implication: can hold both / should not / hedge required
```

## Safeguard 6: Evidence Dependency Check (logged before chain)

Every evidence pair checked. Output logged in lab report. Missing = blocking error.

```
For each pair (A, B):
  Share common cause? → partial or full dependency?
  Does knowing A change P(B)? → independent updates permitted?
  Dependency group assignment → primary item + reduced-weight secondaries
```

## Safeguard 7: Demand Chain Required

No theory card reaches AWAITING_CONVICTION without a demand chain.

```
Required sections:
- Layer mapping (reported → lagged → leading → early warning)
- Leading indicator assignment per layer (source, frequency)
- Single-point-of-failure identification
- Demand fragility mix (political/strategic/ROI/speculative)
```

## Safeguard 8: Version Consistency for Comparisons

All active theory cards must use same system version before cross-stock comparisons or portfolio allocation. Mixed-version comparisons are INVALID.

## Safeguard 9: Weekly Integrity Audit

```
1. Pre-registration calibration (avg divergence, bias direction)
2. Methodology consistency (all cards same version?)
3. Weakest link check (quality floor)
4. Contamination scan (selection dates, dismissed flags)
5. Internal consistency scan (all flags resolved?)
Output: CLEAN / ISSUES_FOUND. No new positions until CLEAN.
```

## Safeguard 10: Lab Report Completion Gate

No verdict card or Vercel page may be generated until the lab report passes ALL checks:

```
LAB REPORT COMPLETION GATE

Required sections present:              Y/N
Demand chain documented:                Y/N
Dependency check logged for all pairs:  Y/N
Pre-registration filed:                 Y/N
Contamination firewall timestamps:      Y/N
Internal consistency check passed:      Y/N
Accounting validation passed:           Y/N
Both directions on all interlocks:      Y/N
Options divergence adjudicated:         Y/N
Intuition points recorded:             Y/N
Safeguard checks section present:       Y/N

Status: COMPLETE / INCOMPLETE
Verdict card generation: BLOCKED until ALL = Y
Vercel page deployment: BLOCKED until lab report COMPLETE
```

## Contamination Flag Treatment

If prior is flagged as CONTAMINATED (analogue selection dates shared with outcome coding):

```
1. Recompute prior with corrected methodology (firewall-compliant)
2. Run evidence chain from corrected prior
3. If posterior DIRECTION unchanged: thesis survives, prior fixed
4. If posterior DIRECTION changes: FULL re-analysis required
5. Log which version of prior changed the conclusion and by how much
```

A contaminated prior does NOT invalidate the evidence chain or the thesis — it invalidates the STARTING PROBABILITY. The fix is mechanical (recompute), not judgmental (re-evaluate everything).

## The Analysis-First Flow (v6)

```
Phase 0: ANALYSIS (data only, no opinions)
  0a. Demand chain mapping
  0b. Regime detection
  0c. Historical analogues (contamination firewall enforced)
  0d. Data gathering (fundamentals, competitive, macro, market mechanics)

Phase 1: UNCERTAINTY IDENTIFICATION
  System identifies 3-7 questions it CANNOT answer from data
  Each question is specific, falsifiable, and high-EVPPI

Phase 2: INTUITION INPUT (Gabriel only)
  Gabriel answers each uncertainty question on 1-10 scale
  P = answer/10 × 0.8 + 0.1 (floors 10%, caps 90%)
  Each answer logged for calibration

Phase 3: COMPUTATION (no human input)
  Prior (from locked analogues)
  Evidence chain (from empirical data + intuition-filled gaps)
  Revenue × multiple matrix
  Monte Carlo EV
  Options calibration
  Sensitivity tornado

Phase 4: VERDICT
  All safeguards pass → lab report written → Vercel page deployed
  Any safeguard fails → fix before publishing
```
