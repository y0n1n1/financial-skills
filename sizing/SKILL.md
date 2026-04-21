---
name: sizing
description: Determine position size using the v7 three-tool architecture — Kelly pre-filter gate, Black-Litterman allocation, cluster cap failsafe. Use with /sizing NVDA or /sizing (all positions).
user_invocable: true
---

# Position Sizing (v7)

Three tools, three distinct jobs, applied in sequence. No ambiguity, one answer.

## Architecture

```
KELLY GATE → BLACK-LITTERMAN → CLUSTER CAPS → FINAL WEIGHTS
```

**Tool 1: Kelly Pre-Filter Gate**
"Does this trade have positive expected value?"
Negative Kelly = EXCLUDED. No exceptions. No BL override.

**Tool 2: Black-Litterman Allocation**
"Given my views, confidence, and everything else I hold, what weight?"
THE allocation method. Replaces EV×Conv, risk-parity, correlation-Kelly, portfolio-context.

**Tool 3: Cluster Caps (Stress Failsafe)**
"If correlations spike to 1.0 in a crash, are we still safe?"
BL output exceeds cap → trim, redistribute. Never retired. Never overridden.

## Input

Two modes:

**Single stock:** `/sizing NVDA`
- Runs Kelly gate on NVDA
- If passes: re-runs BL for full portfolio with NVDA included
- Shows delta: how does adding NVDA change every other weight?

**Full portfolio:** `/sizing`
- Runs Kelly gate on all positions
- Runs BL on all passing positions
- Applies cluster caps
- Outputs final weights

## Process

1. **Read context:**
   - `investing/theories/TICKER.md` — posterior probability, EV, conviction
   - `investing/models/black-litterman.py` — BL model with current views
   - `investing/philosophy.md` — cluster caps, constraints
   - `investing/portfolio.md` — current holdings

2. **Kelly Gate:**
   - Pull posterior P(+) from theory card (Bayesian-calibrated)
   - Pull upside/downside ratio from EV distribution
   - Compute Kelly fraction: f* = (p × b - q) / b
   - If f* ≤ 0: **STOP. Position excluded.** Report why.
   - If f* > 0: **PASS.** Log Kelly fraction for reference (not for sizing).

3. **Black-Litterman:**
   - Run `python3 investing/models/black-litterman.py --phase [1|2]`
   - Or compute inline if views have changed since last run
   - BL inputs:
     - View vector (Q): EV estimates from gauntlet
     - Confidence (Ω): conviction → omega mapping (1/5=0.50, 2/5=0.20, 3/5=0.08, 4/5=0.03, 5/5=0.01)
     - Covariance (Σ): 2yr daily returns, annualised
     - Market equilibrium: cap-weighted implied returns
     - Risk aversion (δ): from regime detection (default 3.5 = cautious)
     - Constraints: max 20% per position, long-only
   - Output: optimal weight per position

4. **Cluster Caps:**
   - Check BL output against cluster limits:
     - AI Infrastructure (semis, foundry, networking): max 40% of stock allocation
     - Enterprise SaaS: max 40%
     - Consumer/Fintech: max 40%
     - Single position: max 20% of total capital
   - If exceeded: trim to cap, redistribute proportionally to uncapped positions
   - Log any cap-triggered adjustments

5. **Apply phase allocation:**
   - Phase 1: 45% ETF + 45% stocks + 10% cash
   - Phase 2: 5% ETF + 87% stocks + 8% cash
   - BL weights are within the stock allocation bucket

6. **Present results.**

## Output Format

```
## Sizing: [TICKER or PORTFOLIO]

### Kelly Gate
| Ticker | P(+)  | Upside | Downside | Kelly f* | Gate |
|--------|-------|--------|----------|----------|------|
| WDAY   | 63.2% | +52.3% | -25%     | 0.34     | PASS |
| HOOD   | 51.1% | +16.5% | -30%     | 0.02     | PASS (marginal) |

### Black-Litterman Allocation
| Ticker | Equilibrium | Your View | Posterior | BL Weight | £ Amount |
|--------|------------|-----------|-----------|-----------|----------|
| WDAY   | +13.9%     | +52.3%    | +16.0%    | 12.1%     | £X       |

### Cluster Cap Check
| Cluster          | BL Total | Cap  | Status |
|------------------|----------|------|--------|
| AI Infrastructure| 18.0%    | 40%  | OK     |
| SaaS             | 24.4%    | 40%  | OK     |

### Final Portfolio (Phase [1|2])
| Ticker | Weight | £ Amount | Role           |
|--------|--------|----------|----------------|
| VWRP   | 45.0%  | £X       | Stability floor|
| WDAY   | 12.1%  | £X       | BL allocation  |
| ...    | ...    | ...      | ...            |
| CASH   | 10.0%  | £X       | IPO reserve    |

### Risk Metrics
Expected return: +X.X%
Volatility: X.X%
Sharpe: X.XX

### BL vs Previous Allocation
[Show deltas, flag moves > 2pp]
```

## Rules
- Kelly gate is binary. Negative = excluded. No negotiation.
- BL output is the answer. Gabriel does NOT see 7 competing numbers and pick.
- Cluster caps cannot be overridden, even by Gabriel. They exist for the regime BL can't model.
- Show full BL math only if Gabriel asks. Default: show results table.
- All amounts in GBP.
- Never auto-execute trades.
- NEVER give financial advice.

## Retired Methods (v6)
The following v6 skill files are deprecated. They remain on disk for reference but are NOT run:
- ~~kelly.md~~ → Kelly stays but ONLY as binary gate, not sizer
- ~~bayesian-kelly.md~~ → posterior feeds BL confidence matrix instead
- ~~correlation-kelly.md~~ → BL covariance handles this
- ~~expected-value.md~~ → BL view vector
- ~~risk-parity.md~~ → BL covariance structure
- ~~max-drawdown.md~~ → stress test + cluster caps
- ~~portfolio-context.md~~ → BL constraints
