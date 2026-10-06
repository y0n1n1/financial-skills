<h1 align="center">The Financial Gauntlet</h1>

<p align="center">
  <strong>An institutional-grade equity research system that runs as Claude Code skills.</strong><br>
  Built to <em>disprove</em> your investment thesis — not to confirm it.
</p>

<p align="center">
  <img alt="Claude Code Skills" src="https://img.shields.io/badge/Claude%20Code-skills-D97757">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white">
  <img alt="Skills" src="https://img.shields.io/badge/skills-3-informational">
  <img alt="Quant tools" src="https://img.shields.io/badge/quant%20tools-19-6E56CF">
  <img alt="Methodology" src="https://img.shields.io/badge/methodology-Bayesian%20%2B%20ACH-444">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="Tests" src="https://img.shields.io/badge/tests-287%20passing-success">
</p>

<p align="center">
  <strong><a href="https://y0n1n1.github.io/financial-skills/">→ Open the interactive gallery</a></strong><br>
  <sub>25 of these algorithms, recomputing live in the browser as you move the inputs</sub>
</p>

---

## What this is

Most retail stock research is motivated reasoning with a spreadsheet attached. You pick a stock, you like it, and then you go looking for reasons.

The Financial Gauntlet inverts that. It's a set of **three Claude Code skills** backed by **19 Python quant tools** and **~4,000 lines of methodology** that subject a thesis to the harshest tests available, in a fixed order, with pre-registered expectations — so the analysis can't be quietly bent toward the answer you wanted.

The prime directive is Popperian: **a theory can never be verified, only falsified.** Every lens asks "what evidence would destroy this thesis, and does that evidence exist?"

If the theory survives, it's worth sizing. If it doesn't, you just saved money.

```
                        ┌──────────────────────────────┐
  /theory NVDA  ──────► │  THE GAUNTLET                │  5 phases · 14 steps
  "AI compute monopoly" │  regime → analogues → prior  │
                        │  → ACH → 6 lenses → Fermi    │
                        │  → mechanics → pre-mortem    │
                        └──────────────┬───────────────┘
                                       │  posterior ± CI, EV distribution
                                       ▼
                        ┌──────────────────────────────┐
  /parameters NVDA ───► │  FALSIFICATION TRIGGERS      │  FMEA-scored, RPN-ranked
                        │  fundamental · technical ·   │  MINOR / MAJOR / EXIT
                        │  competitive · macro         │  + independence audit
                        └──────────────┬───────────────┘
                                       │  pre-specified update rules
                                       ▼
                        ┌──────────────────────────────┐
  /sizing NVDA  ──────► │  KELLY GATE → BLACK-LITTERMAN│  one number, no cherry-picking
                        │  → CLUSTER CAP FAILSAFE      │  negative Kelly = excluded
                        └──────────────────────────────┘
```

---

## The three skills

| Skill | Invoke | What it does |
|---|---|---|
| **`theory/`** | `/theory NVDA "AI compute monopoly"` | The gauntlet itself. 14 steps across 5 phases: demand-chain mapping, regime detection, historical analogues (one mandatory *anti*-analogue), base-rate anchoring, ACH competing hypotheses, 6 weighted analytical lenses, Shannon information-content scoring, monetization mapping, Fermi decomposition, 13F/options/flow mechanics, pre-mortem, reflexivity, and VOI-based attention allocation. |
| **`parameters/`** | `/parameters NVDA` | Turns a thesis into falsifiable tripwires *before* you're emotionally long. Proposes fundamental / technical / competitive / macro triggers, FMEA-scores each one (RPN = Severity × Occurrence × Detection), then runs a **defense-independence audit** so you don't end up with six triggers that all fire on the same event. |
| **`sizing/`** | `/sizing NVDA` or `/sizing` | Three tools, three jobs, one answer. **Kelly as a binary gate** (negative EV = excluded, no override), **Black-Litterman** as the actual allocator (views + conviction-mapped confidence + covariance), and **cluster caps** as a stress failsafe for the regime BL can't model. |

### The 6 analytical lenses

`fundamental` · `technical` · `competitive-moat` · `macro-sector` · `sentiment` · `contrarian-check`

Each returns SUPPORTS / NEUTRAL / UNDERMINES — but **verdicts are not equal-weighted.** Lens reliability is treated as a diagnostic test (sensitivity, specificity, and base-rate-dependent PPV, borrowed straight from epidemiology), so a "SUPPORTS" from hard filings data outweighs a "SUPPORTS" from analyst sentiment.

---

## What makes it rigorous

This is the part most frameworks skip.

- **Derived likelihood ratios, never asserted.** Every Bayesian update computes `P(E|H)/P(E|~H)` from data. Lookup-table LRs are a blocking error.
- **Inputs are tagged `EMPIRICAL` / `SEMI-EMPIRICAL` / `SUBJECTIVE`.** The posterior chain runs on the first two only. Subjective inputs *widen* the output range — they never narrow it. If most inputs are subjective, the system refuses to emit a number and returns a **data-acquisition plan** instead. That refusal is a feature.
- **Contamination firewall.** Historical analogues are selected on observable criteria and the candidate list is *locked* before any outcome is coded. Shared timestamps across those steps means the prior is contaminated and gets downgraded.
- **Pre-registration.** Write your prior and expected posterior *before* the analysis, then diff against the actual result. Systematic drift toward your preferred answer becomes visible.
- **Dependency checks before sequential updates.** Correlated evidence can't be multiplied through the chain twice.
- **Shannon information content as a gate.** Only evidence above 0.5 bits enters the chain; only >1.0 bits meaningfully moves the posterior. IC and LR are never compared or combined.
- **Precision discipline.** Sig figs are capped by input quality — an `n=19` base rate yields "~35%", never "35.2%". Confidence intervals outrank point estimates, and a CI that straddles a decision boundary must say so out loud.
- **Uncertainty propagates end to end.** Monte Carlo over the revenue × multiple matrix produces an EV *distribution*; CI propagation carries bounds from prior through every update.
- **Calibration is scored.** Every probability estimate is logged and Brier-scored against outcomes, so persistent over/under-confidence shows up as a number rather than a vibe.

---

## The quant toolkit

19 standalone Python CLIs in [`tools/`](tools) — each runnable on its own, no framework required.

**Valuation & uncertainty**
| Tool | Purpose |
|---|---|
| [`monte_carlo_ev.py`](tools/monte_carlo_ev.py) | EV *distribution* from the revenue × multiple matrix (100k paths), not a point estimate |
| [`ci_propagation.py`](tools/ci_propagation.py) | Carries uncertainty bounds through the full posterior chain |
| [`sensitivity_tornado.py`](tools/sensitivity_tornado.py) | Perturbs each input ±1σ to rank what actually drives EV |
| [`options_implied_prob.py`](tools/options_implied_prob.py) | Black-Scholes extraction of market-implied scenario probabilities — replaces asserted priors with traded ones |

**Fundamentals & factors**
| Tool | Purpose |
|---|---|
| [`piotroski_fscore.py`](tools/piotroski_fscore.py) | 9-point earnings-quality score from 10-K data |
| [`factor_decomposition.py`](tools/factor_decomposition.py) | Fama-French decomposition — are you diversified, or running one factor three times? |
| [`stock_screener.py`](tools/stock_screener.py) | Screens S&P 500 + Russell 1000 for names where your specific edge is highest |
| [`earnings_language.py`](tools/earnings_language.py) | Tracks hyperscaler earnings-call language for capex-sentiment shifts |

**Portfolio**
| Tool | Purpose |
|---|---|
| [`portfolio_optimizer.py`](tools/portfolio_optimizer.py) | Black-Litterman weights from equilibrium + views + conviction |
| [`portfolio_dashboard.py`](tools/portfolio_dashboard.py) | Positions, P&L, theory-card freshness |
| [`lifecycle.py`](tools/lifecycle.py) | State machine: DISCOVERY → WATCHING → ENTERING → ACCUMULATING → STEADY → DISTRIBUTING → EXITING → CLOSED, with per-state rules |
| [`parameter_monitor.py`](tools/parameter_monitor.py) | Checks live metrics against update rules written *before* the data arrived |

**Epistemics**
| Tool | Purpose |
|---|---|
| [`calibration.py`](tools/calibration.py) | Logs every forecast, resolves it, computes Brier scores |
| [`pre_register.py`](tools/pre_register.py) | Prior and expected posterior committed before analysis; diffed after |
| [`intuition_tracker.py`](tools/intuition_tracker.py) | Measures whether human overrides of the model were additive or destructive |
| [`post_mortem.py`](tools/post_mortem.py) | Mandatory structured review on every closed position, plus cross-position meta-analysis |
| [`question_generator.py`](tools/question_generator.py) | Extracts the model's free parameters and asks about them in native units |
| [`edge_questions.py`](tools/edge_questions.py) | Elicits domain intuition about *your world*, then maps answers onto tickers |
| [`mosaic_update.py`](tools/mosaic_update.py) | Weekly signal synthesis per active thesis — 20 minutes a stock |

---

## Intellectual lineage

Every component is borrowed from a discipline that already solved the problem:

| Source | What it contributes |
|---|---|
| Popper | Falsification as the prime directive |
| Tetlock & Kahneman | Reference-class forecasting, outside view, base rates before specifics |
| Heuer (CIA) | Analysis of Competing Hypotheses — the analytical backbone |
| Bayes | Derived-LR posterior updating with dependency checks |
| Shannon | Information content in bits as an evidence filter |
| Soros | Reflexivity — price and fundamentals are not independent |
| Kelly | Positive-EV gate on every position |
| Black & Litterman | Equilibrium-anchored allocation from subjective views |
| Fermi | Decomposition into independently estimable components, plus reverse-Fermi to expose what's priced in |
| Klein | Pre-mortem — "it's 18 months out and this was a disaster; what happened?" |
| FMEA (reliability engineering) | Severity × Occurrence × Detection scoring of failure modes |
| Diagnostic test theory (epidemiology) | Sensitivity, specificity, and base-rate-dependent PPV per lens |
| Brier | Calibration scoring of every probability ever stated |

---

## Install

Drop the three skill directories into your Claude Code skills folder:

```bash
git clone https://github.com/y0n1n1/financial-skills.git
cp -r financial-skills/{theory,sizing,parameters} ~/.claude/skills/
cp -r financial-skills/tools ~/investing/tools
```

Then install the quant dependencies:

```bash
pip3 install numpy scipy pandas scikit-learn yfinance uncertainties pyyaml
```

The skills expect an `investing/` workspace alongside them:

```
investing/
├── theories/TICKER.md     # the theory card — the permanent record per name
├── philosophy.md          # cluster caps, constraints, phase allocation
├── portfolio.md           # current holdings
└── tools/                 # this repo's tools/
```

### Usage

```bash
/theory NVDA "AI compute monopoly no competitor closes in 3 years"
/parameters NVDA      # falsification triggers, FMEA-ranked
/sizing NVDA          # Kelly gate → Black-Litterman → cluster caps
/sizing               # re-optimise the whole book
```

Standalone, no Claude required:

```bash
python3 tools/monte_carlo_ev.py --ticker NVDA --current-mcap 4400 \
  --revenue-scenarios '365,300,240,180' --revenue-probs '0.20,0.40,0.25,0.15' \
  --revenue-stds '40,30,25,30' \
  --multiple-scenarios '30,22,15' --multiple-probs '0.20,0.50,0.30' \
  --margin 0.65 --n 100000

python3 tools/calibration.py stats
```

---

## Repo layout

```
theory/        24 files — the gauntlet: 6 lenses + bayesian engine + safeguards + protocols
parameters/     7 files — trigger definition, FMEA scoring, independence audit
sizing/         8 files — Kelly gate, Black-Litterman, cluster caps (+ archived v6 methods)
tools/         19 CLIs  — thin argparse wrappers over the package below
packages/
  tfg-core/    13 modules, pure Python — no IO, no network, no printing
  core-ts/     the same 13, ported to TypeScript with zero runtime dependencies
  fixtures/    shared golden vectors both test suites read
web/           the interactive gallery
```

`sizing/` keeps its superseded v6 sizers (`kelly.md`, `risk-parity.md`, `correlation-kelly.md`, …) on disk and clearly marked retired — because the system's own rule is that you don't get to see seven competing numbers and pick your favourite. One method, one answer, versioned changes.

## How the two implementations stay honest

The maths exists twice: once in Python, once in TypeScript so it can run in a browser with nothing to install. Two implementations is normally a drift problem, so it is handled structurally rather than by discipline.

Both suites read the **same golden vectors** in `packages/fixtures`. CI regenerates them and fails if the result differs, which means Python cannot change behaviour without the vectors being updated, and TypeScript cannot drift from the vectors without its own suite going red.

```
tfg-core (Python)  ──┐
                     ├──→  packages/fixtures/*.json  ←── CI asserts these are current
@tfg/core (TS)     ──┘
```

**287 tests**: 161 in Python, 126 in TypeScript. Beyond the shared vectors, each side asserts what the other cannot — Python checks the properties the methodology *claims* (probabilities partition the line, bias correction only ever widens an interval, drift against a declared lean is never flagged), while TypeScript checks the machinery it had to rebuild from scratch: a normal CDF against SciPy reference values to 14 decimals, matrix inversion round-trips, NumPy's percentile conventions.

The one exception is Monte Carlo. NumPy's PCG64 stream cannot be reproduced in TypeScript, so that fixture declares `"agreement": "statistical"` and the port is held to distributional agreement within tolerance, while Python asserts its own stream exactly.

### Four methods that had no code

`theory/` and `parameters/` specified the Kelly gate, lens-reliability PPV, Shannon information content and FMEA RPN scoring in prose, with worked examples but no implementation. They are now executable, and their tests assert those documented examples directly: PPV of 59% at a 35% base rate, IC of 2.0 and 0.42 bits for 1-of-4 and 3-of-4 consistency, f* = 0.40 at p = 0.6 and b = 2.

## Notes

This is a **personal research system**, written in first person for its author and opinionated accordingly — the prompts address a specific user, assume a GBP book, and carry a deliberately informal presentation layer over a formal analytical core. Fork it and make it yours.

It is **not financial advice**, and by construction it never gives any. It produces probabilities, expected values, confidence intervals, and reasons to walk away. Every output is a prompt for your own judgement, not a substitute for it. No tool here executes a trade.

## License

MIT — see [LICENSE](LICENSE).
