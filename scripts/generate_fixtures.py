"""Generate the shared golden vectors in ``packages/fixtures``.

These files are the contract between the Python package and its TypeScript port:
both test suites read them, so neither can drift without a failing build.

The Python implementations are the reference, and were themselves verified
byte-identical against the pre-refactor CLIs (``scripts/capture_golden_cli.sh``).

Run from the repo root:  ./.venv/bin/python scripts/generate_fixtures.py
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict
from typing import Any

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "packages", "tfg-core"))
FIXTURE_DIR = os.path.join(REPO_ROOT, "packages", "fixtures")

from tfg_core import (  # noqa: E402
    bayes, calibration, ev, fmea, fundamentals, information, intuition, kelly,
    options, portfolio, prereg, reliability, sensitivity,
)

#: Agreement required between languages for closed-form results.
EXACT_TOLERANCE = 1e-12

#: Agreement required for Monte Carlo, which cannot share a bit-exact generator.
#: NumPy's PCG64 stream is not reproducible in TypeScript, so the ported sampler
#: is checked for distributional agreement instead of identity.
STATISTICAL_TOLERANCE = 5e-3


def write(name: str, algorithm: str, cases: list[dict[str, Any]], *,
          tolerance: float = EXACT_TOLERANCE, kind: str = "exact",
          note: str = "") -> None:
    """Write one fixture file."""
    payload = {
        "algorithm": algorithm,
        "agreement": kind,
        "tolerance": tolerance,
        "generated_by": "scripts/generate_fixtures.py",
        "cases": cases,
    }
    if note:
        payload["note"] = note
    path = os.path.join(FIXTURE_DIR, f"{name}.json")
    with open(path, "w") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")
    print(f"  wrote {os.path.relpath(path, REPO_ROOT)} ({len(cases)} cases)")


def bayes_fixtures() -> None:
    chain_inputs = [
        {
            "name": "five updates, bias correction on",
            "prior_mean": 0.40, "prior_std": 0.08, "apply_bias_correction": True,
            "updates": [
                {"direction": "STRONG_FOR", "quality": 0.9, "label": "STRONG_FOR"},
                {"direction": "STRONG_AGAINST", "quality": 0.85, "label": "STRONG_AGAINST"},
                {"direction": "MODERATE_FOR", "quality": 0.7, "label": "MODERATE_FOR"},
                {"direction": "MODERATE_AGAINST", "quality": 0.75, "label": "MODERATE_AGAINST"},
                {"direction": "MODERATE_AGAINST", "quality": 0.7, "label": "MODERATE_AGAINST"},
            ],
        },
        {
            "name": "ambiguous evidence is inert, bias correction off",
            "prior_mean": 0.35, "prior_std": 0.10, "apply_bias_correction": False,
            "updates": [
                {"direction": "WEAK_FOR", "quality": 0.5, "label": "WEAK_FOR"},
                {"direction": "AMBIGUOUS", "quality": 0.5, "label": "AMBIGUOUS"},
                {"direction": "STRONG_AGAINST", "quality": 0.9, "label": "STRONG_AGAINST"},
            ],
        },
        {
            "name": "posterior clamps at the ceiling",
            "prior_mean": 0.90, "prior_std": 0.05, "apply_bias_correction": False,
            "updates": [{"direction": "STRONG_FOR", "quality": 1.0, "label": f"s{i}"} for i in range(6)],
        },
        {
            "name": "unknown direction falls back to AMBIGUOUS",
            "prior_mean": 0.50, "prior_std": 0.10, "apply_bias_correction": True,
            "updates": [{"direction": "NOT_A_DIRECTION", "quality": 0.8, "label": "bogus"}],
        },
    ]
    cases = []
    for spec in chain_inputs:
        result = bayes.run_chain(
            prior_mean=spec["prior_mean"],
            prior_std=spec["prior_std"],
            updates=[bayes.Update(**u) for u in spec["updates"]],
            apply_bias_correction=spec["apply_bias_correction"],
        )
        cases.append({
            "name": spec["name"],
            "input": {k: v for k, v in spec.items() if k != "name"},
            "expected": {
                "chain": [asdict(s) for s in result.chain],
                "posterior": {
                    "mean": result.posterior.mean,
                    "std_raw": result.posterior.std_raw,
                    "std_corrected": result.posterior.std_corrected,
                    "ci_68": list(result.posterior.ci_68),
                    "ci_95": list(result.posterior.ci_95),
                },
                "crosses_50": result.posterior.crosses(0.5),
            },
        })
    write("bayes_chain", "bayes.run_chain", cases,
          note="Uncertainty propagation must track the correlation between numerator "
               "and denominator; independent propagation gives a wider, wrong interval.")

    write("bayes_primitives", "bayes.update / dampen_lr / evidence_quality", [
        {"name": "update, lr above 1", "input": {"fn": "update", "prior": 0.40, "lr": 1.4},
         "expected": bayes.update(0.40, 1.4)},
        {"name": "update, lr below 1", "input": {"fn": "update", "prior": 0.40, "lr": 0.6},
         "expected": bayes.update(0.40, 0.6)},
        {"name": "update, lr of 1 is inert", "input": {"fn": "update", "prior": 0.37, "lr": 1.0},
         "expected": bayes.update(0.37, 1.0)},
        {"name": "update, zero prior stays zero", "input": {"fn": "update", "prior": 0.0, "lr": 5.0},
         "expected": bayes.update(0.0, 5.0)},
        {"name": "dampen, low quality", "input": {"fn": "dampen_lr", "raw_lr": 2.0, "quality": 0.4},
         "expected": bayes.dampen_lr(2.0, 0.4)},
        {"name": "dampen, high quality", "input": {"fn": "dampen_lr", "raw_lr": 2.0, "quality": 0.9},
         "expected": bayes.dampen_lr(2.0, 0.9)},
        {"name": "dampen, zero quality is inert",
         "input": {"fn": "dampen_lr", "raw_lr": 2.0, "quality": 0.0},
         "expected": bayes.dampen_lr(2.0, 0.0)},
        {"name": "quality, audited primary filing",
         "input": {"fn": "evidence_quality", "source_tier": 1.0, "days_old": 30,
                   "sample_n": 100, "is_primary": True},
         "expected": bayes.evidence_quality(1.0, 30, 100, True)},
        {"name": "quality, stale secondary management claim",
         "input": {"fn": "evidence_quality", "source_tier": 0.3, "days_old": 900,
                   "sample_n": 1, "is_primary": False},
         "expected": bayes.evidence_quality(0.3, 900, 1, False)},
    ])


def ev_fixtures() -> None:
    matrix = {
        "current_mcap": 4400.0,
        "revenue_scenarios": [365.0, 300.0, 240.0, 180.0],
        "revenue_probs": [0.20, 0.40, 0.25, 0.15],
        "multiple_scenarios": [30.0, 22.0, 15.0],
        "multiple_probs": [0.20, 0.50, 0.30],
        "margin": 0.65,
    }
    small = {
        "current_mcap": 1000.0,
        "revenue_scenarios": [120.0, 90.0],
        "revenue_probs": [0.6, 0.4],
        "multiple_scenarios": [25.0, 12.0],
        "multiple_probs": [0.5, 0.5],
        "margin": 0.5,
    }
    write("ev_deterministic", "ev.deterministic_ev", [
        {"name": "four revenue x three multiple", "input": matrix,
         "expected": ev.deterministic_ev(**matrix)},
        {"name": "two by two", "input": small, "expected": ev.deterministic_ev(**small)},
    ])

    mc_input = {
        "current_mcap": 4400.0,
        "revenue_scenarios": [365.0, 300.0, 240.0, 180.0],
        "revenue_probs": [0.20, 0.40, 0.25, 0.15],
        "revenue_stds": [40.0, 30.0, 25.0, 30.0],
        "multiple_scenarios": [30.0, 22.0, 15.0],
        "multiple_probs": [0.20, 0.50, 0.30],
        "net_margin": 0.65,
        "n_simulations": 200_000,
        "seed": 42,
    }
    result = ev.monte_carlo(**mc_input)
    write("ev_monte_carlo", "ev.monte_carlo", [{
        "name": "NVDA-shaped matrix, 200k paths",
        "input": mc_input,
        "expected": {
            "ev_mean": result.ev_mean,
            "ev_median": result.ev_median,
            "ev_std": result.ev_std,
            "p_positive": result.p_positive,
            "p_negative": result.p_negative,
            "percentiles": asdict(result.percentiles),
            "kelly_fraction": result.kelly_fraction,
        },
    }], tolerance=STATISTICAL_TOLERANCE, kind="statistical",
        note="NumPy's PCG64 stream cannot be reproduced in TypeScript, so the port "
             "is held to distributional agreement within tolerance, not bit equality. "
             "Python asserts these values exactly as a regression guard.")


def sensitivity_fixtures() -> None:
    spec = {
        "current_mcap": 4400.0,
        "revenue_scenarios": [365.0, 300.0, 240.0, 180.0],
        "revenue_probs": [0.20, 0.40, 0.25, 0.15],
        "revenue_stds": [40.0, 30.0, 25.0, 30.0],
        "multiple_scenarios": [30.0, 22.0, 15.0],
        "multiple_probs": [0.20, 0.50, 0.30],
        "margin": 0.65,
    }
    write("sensitivity", "sensitivity.run_sensitivity", [{
        "name": "NVDA-shaped matrix, ranked widest-first",
        "input": spec,
        "expected": [asdict(s) for s in sensitivity.run_sensitivity(**spec)],
    }])


def options_fixtures() -> None:
    specs = [
        {"name": "one year, four boundaries", "spot": 178.0, "iv": 0.39, "rf": 0.045,
         "expiry_years": 1.0, "scenario_boundaries": [130.0, 155.0, 250.0, 360.0],
         "scenario_labels": ["worst", "bear", "base_top", "bull_top"]},
        {"name": "six months, unlabelled", "spot": 100.0, "iv": 0.25, "rf": 0.03,
         "expiry_years": 0.5, "scenario_boundaries": [80.0, 120.0], "scenario_labels": []},
        {"name": "high vol, single boundary", "spot": 50.0, "iv": 0.80, "rf": 0.05,
         "expiry_years": 2.0, "scenario_boundaries": [75.0], "scenario_labels": []},
    ]
    cases = []
    for spec in specs:
        name = spec.pop("name")
        result = options.scenario_probabilities(**spec)
        cases.append({
            "name": name,
            "input": spec,
            "expected": {"scenarios": result.as_dicts(), "ev": result.ev,
                         "probability_sum": sum(s.probability for s in result.scenarios)},
        })
    write("options", "options.scenario_probabilities", cases,
          note="Probabilities partition the real line, so they must sum to 1.")


def portfolio_fixtures() -> None:
    # A fixed, well-conditioned covariance matrix: no market data in fixtures.
    sigma = [
        [0.1600, 0.0720, 0.0640],
        [0.0720, 0.0900, 0.0540],
        [0.0640, 0.0540, 0.1225],
    ]
    spec = {
        "tickers": ["NVDA", "GOOGL", "META"],
        "market_caps": [4.4e12, 2.1e12, 1.3e12],
        "views": [-3.9, -8.3, 0.0],
        "confidences": [55.0, 35.0, 20.0],
        "sigma": sigma,
        "risk_aversion": 2.5,
        "tau": 0.05,
    }
    bullish = dict(spec, views=[18.0, 12.0, 25.0], confidences=[80.0, 60.0, 90.0])
    cases = []
    for name, s in (("bearish views", spec), ("bullish views", bullish)):
        cases.append({"name": name, "input": s,
                      "expected": asdict(portfolio.black_litterman(**s))})
    write("portfolio", "portfolio.black_litterman", cases, tolerance=1e-9,
          note="Requires an n-by-n matrix inverse; the TypeScript port implements "
               "Gauss-Jordan elimination with partial pivoting.")


def fundamentals_fixtures() -> None:
    strong = {
        "roa_current": 0.65, "roa_prior": 0.55, "cfo_current": 97.0,
        "net_income_current": 73.0, "ltd_ratio_current": 0.07, "ltd_ratio_prior": 0.08,
        "current_ratio_current": 3.91, "current_ratio_prior": 3.50,
        "shares_current": 24400.0, "shares_prior": 24500.0,
        "gross_margin_current": 0.75, "gross_margin_prior": 0.73,
        "asset_turnover_current": 0.85, "asset_turnover_prior": 0.80,
    }
    weak = {
        "roa_current": -0.02, "roa_prior": 0.01, "cfo_current": -5.0,
        "net_income_current": 2.0, "ltd_ratio_current": 0.42, "ltd_ratio_prior": 0.30,
        "current_ratio_current": 0.90, "current_ratio_prior": 1.40,
        "shares_current": 5200.0, "shares_prior": 4800.0,
        "gross_margin_current": 0.21, "gross_margin_prior": 0.29,
        "asset_turnover_current": 0.40, "asset_turnover_prior": 0.55,
    }
    cases = [
        {"name": "nine of nine", "input": strong,
         "expected": asdict(fundamentals.compute_fscore(**strong))},
        {"name": "zero of nine", "input": weak,
         "expected": asdict(fundamentals.compute_fscore(**weak))},
    ]
    write("fundamentals", "fundamentals.compute_fscore", cases)


def calibration_fixtures() -> None:
    sets = {
        "overconfident forecaster": [
            (0.35, 0), (0.75, 1), (0.80, 0), (0.55, 1), (0.90, 0), (0.85, 0),
        ],
        "well calibrated": [
            (0.10, 0), (0.10, 0), (0.50, 1), (0.50, 0), (0.90, 1), (0.90, 1),
        ],
        "below the stats threshold": [(0.40, 1), (0.60, 0)],
    }
    cases = []
    for name, pairs in sets.items():
        forecasts = [calibration.Forecast(p, o) for p, o in pairs]
        report = calibration.score_calibration(forecasts)
        cases.append({
            "name": name,
            "input": {"forecasts": [{"probability": p, "outcome": o} for p, o in pairs]},
            "expected": {
                "n_resolved": report.n_resolved,
                "mean_brier": report.mean_brier,
                "verdict": report.verdict,
                "sufficient_data": report.sufficient_data,
                "overconfident": report.overconfident,
                "buckets": [
                    dict(asdict(b), calibrated=b.calibrated) for b in report.buckets
                ],
            },
        })
    write("calibration", "calibration.score_calibration", cases)


def intuition_fixtures() -> None:
    cases = []
    for param, model, human, certainty, actual in [
        ("margin", 70.0, 74.0, 70.0, 73.0),
        ("capex_language", 40.0, 28.0, 60.0, 38.0),
        ("gemini adoption", 55.0, 62.0, 80.0, 61.0),
        ("doj antitrust risk", 30.0, 45.0, 50.0, 30.0),
        ("something unmapped", 10.0, 12.0, 40.0, 11.0),
    ]:
        d = intuition.Divergence(parameter=param, model_recommendation=model,
                                 human_answer=human, certainty=certainty)
        r = intuition.resolve(d, actual)
        cases.append({
            "name": f"{param} resolved at {actual}",
            "input": {"parameter": param, "model_recommendation": model,
                      "human_answer": human, "certainty": certainty, "actual": actual},
            "expected": {"category": d.category, "divergence": d.divergence,
                         **asdict(r)},
        })
    write("intuition", "intuition.categorize / resolve", cases)


def prereg_fixtures() -> None:
    cases = []
    for name, expected_posterior, actual, direction in [
        ("bullish lean, confirming drift flagged", 0.40, 0.55, "slightly bullish"),
        ("bullish lean, drift against is clean", 0.40, 0.25, "slightly bullish"),
        ("bearish lean, confirming drift flagged", 0.35, 0.22, "slightly bearish"),
        ("bearish lean, drift against is clean", 0.35, 0.50, "bearish"),
        ("neutral, large drift flagged", 0.48, 0.70, "neutral"),
        ("neutral, small drift clean", 0.48, 0.55, "neutral"),
        ("exactly at the threshold is clean", 0.40, 0.50, "bullish"),
    ]:
        result = prereg.compare(expected_posterior, actual, direction)
        cases.append({
            "name": name,
            "input": {"expected_posterior": expected_posterior,
                      "actual_posterior": actual, "expected_direction": direction},
            "expected": asdict(result),
        })
    write("prereg", "prereg.compare", cases,
          note="Thresholds are asymmetric by design: drift confirming a declared "
               "lean is flagged sooner than drift in any other direction.")


def kelly_fixtures() -> None:
    cases = []
    for name, p, upside, downside in [
        ("strong edge passes", 0.632, 0.523, 0.25),
        ("thin edge is marginal", 0.511, 0.165, 0.30),
        ("negative edge is excluded", 0.40, 0.20, 0.30),
        ("coinflip at even odds is excluded", 0.50, 0.30, 0.30),
        ("riskless bet is rejected", 0.80, 0.50, 0.0),
    ]:
        result = kelly.evaluate(p, upside, downside)
        cases.append({
            "name": name,
            "input": {"probability": p, "upside": upside, "downside": downside},
            "expected": asdict(result) | {"passes": result.passes},
        })
    write("kelly", "kelly.evaluate", cases,
          note="Kelly is an entry gate here, not a sizer: a negative fraction "
               "excludes the position with no override.")

    write("kelly_breakeven", "kelly.breakeven_probability / growth_rate", [
        {"name": f"breakeven at b={b}", "input": {"fn": "breakeven_probability", "win_loss_ratio": b},
         "expected": kelly.breakeven_probability(b)}
        for b in (0.5, 1.0, 2.0, 3.0, 10.0)
    ] + [
        {"name": "growth rate at full kelly",
         "input": {"fn": "growth_rate", "probability": 0.6, "win_loss_ratio": 2.0, "fraction": 0.4},
         "expected": kelly.growth_rate(0.6, 2.0, 0.4)},
        {"name": "growth rate at half kelly",
         "input": {"fn": "growth_rate", "probability": 0.6, "win_loss_ratio": 2.0, "fraction": 0.2},
         "expected": kelly.growth_rate(0.6, 2.0, 0.2)},
        {"name": "growth rate when overbetting",
         "input": {"fn": "growth_rate", "probability": 0.6, "win_loss_ratio": 2.0, "fraction": 0.9},
         "expected": kelly.growth_rate(0.6, 2.0, 0.9)},
    ])


def reliability_fixtures() -> None:
    cases = []
    for base_rate in (0.15, 0.35, 0.50, 0.80):
        for key in ("fundamental", "technical", "sentiment", "contrarian_check", "pre_mortem"):
            pv = reliability.evaluate_lens(key, base_rate)
            cases.append({
                "name": f"{key} at base rate {base_rate}",
                "input": {"lens": key, "base_rate": base_rate},
                "expected": asdict(pv) | {"ppv_lift": pv.ppv_lift},
            })
    write("reliability_ppv", "reliability.evaluate_lens", cases,
          note="The doc's worked example: sensitivity 0.80, specificity 0.70 at a "
               "35% base rate yields PPV 59%, not 80%.")

    verdicts = {
        "fundamental": "SUPPORTS", "technical": "SUPPORTS", "competitive_moat": "SUPPORTS",
        "macro_sector": "SUPPORTS", "sentiment": "SUPPORTS", "contrarian_check": "UNDERMINES",
    }
    all_support = {k: "SUPPORTS" for k in verdicts}
    mixed = dict(verdicts, technical="NEUTRAL", macro_sector="UNDERMINES")
    cases = []
    for name, v in (
        ("five supports, contrarian undermines", verdicts),
        ("unanimous support", all_support),
        ("mixed with neutrals", mixed),
    ):
        cases.append({"name": name, "input": {"verdicts": v},
                      "expected": asdict(reliability.weighted_tally(v))})
    write("reliability_tally", "reliability.weighted_tally", cases,
          note="Worked example from theory/lens-reliability.md: a raw 83% support "
               "becomes a weighted 41% once lens reliability is applied.")


def information_fixtures() -> None:
    cases = []
    for n_hyp, n_con in [(4, 1), (4, 2), (4, 3), (4, 4), (4, 0), (8, 1), (3, 2), (1, 1)]:
        e = information.score(f"{n_con} of {n_hyp}", n_hyp, n_con)
        cases.append({
            "name": f"consistent with {n_con} of {n_hyp} hypotheses",
            "input": {"n_hypotheses": n_hyp, "n_consistent": n_con},
            "expected": asdict(e),
        })
    write("information", "information.score", cases,
          note="IC gates what enters the Bayesian chain; it is never compared with "
               "or combined into a likelihood ratio.")

    write("information_entropy", "information.entropy / entropy_reduction", [
        {"name": "uniform over four", "input": {"fn": "entropy", "probabilities": [0.25]*4},
         "expected": information.entropy([0.25]*4)},
        {"name": "certain", "input": {"fn": "entropy", "probabilities": [1.0, 0.0, 0.0, 0.0]},
         "expected": information.entropy([1.0, 0.0, 0.0, 0.0])},
        {"name": "skewed", "input": {"fn": "entropy", "probabilities": [0.7, 0.2, 0.07, 0.03]},
         "expected": information.entropy([0.7, 0.2, 0.07, 0.03])},
        {"name": "analysis that learned something",
         "input": {"fn": "entropy_reduction", "prior": [0.25]*4, "posterior": [0.7, 0.2, 0.07, 0.03]},
         "expected": information.entropy_reduction([0.25]*4, [0.7, 0.2, 0.07, 0.03])},
        {"name": "analysis that increased uncertainty",
         "input": {"fn": "entropy_reduction", "prior": [0.7, 0.2, 0.07, 0.03], "posterior": [0.25]*4},
         "expected": information.entropy_reduction([0.7, 0.2, 0.07, 0.03], [0.25]*4)},
    ])


def fmea_fixtures() -> None:
    triggers = [
        {"name": "F1 revenue decel", "severity": 7, "occurrence": 5, "detection": 4, "cluster": "EARNINGS"},
        {"name": "F2 margin compression", "severity": 6, "occurrence": 4, "detection": 4, "cluster": "EARNINGS"},
        {"name": "F3 earnings miss", "severity": 5, "occurrence": 5, "detection": 5, "cluster": "EARNINGS"},
        {"name": "T1 price breakdown", "severity": 4, "occurrence": 6, "detection": 1, "cluster": "PRICE"},
        {"name": "C1 competitor parity", "severity": 9, "occurrence": 3, "detection": 8, "cluster": "COMPETITIVE"},
        {"name": "M1 rate shock", "severity": 6, "occurrence": 3, "detection": 2, "cluster": "MACRO"},
        {"name": "X1 hidden liability", "severity": 10, "occurrence": 2, "detection": 10, "cluster": "ACCOUNTING"},
    ]
    objs = [fmea.Trigger(**t) for t in triggers]
    write("fmea_rpn", "fmea.rank", [{
        "name": "seven triggers ranked by RPN",
        "input": {"triggers": triggers},
        "expected": [asdict(s) for s in fmea.rank(objs)],
    }], note="Detection is inverted: 1 is immediate, 10 is undetectable, so RPN "
             "rises as a risk becomes harder to see coming.")

    clustered = [
        {"name": f"F{i}", "severity": 5, "occurrence": 5, "detection": 4, "cluster": "EARNINGS"}
        for i in range(1, 6)
    ]
    cases = []
    for name, ts in (
        ("seven triggers across five clusters", triggers),
        ("five triggers all on one cluster", clustered),
        ("one trigger per cluster", triggers[3:]),
    ):
        cases.append({
            "name": name,
            "input": {"triggers": ts},
            "expected": asdict(fmea.audit_independence([fmea.Trigger(**t) for t in ts])),
        })
    write("fmea_independence", "fmea.audit_independence", cases,
          note="Seven triggers that all fire on one earnings miss are one defence "
               "layer, not seven. Grades follow the table in "
               "parameters/defense-independence.md, whose own worked example "
               "mislabels 57% as a B; the table says C.")


def main() -> None:
    os.makedirs(FIXTURE_DIR, exist_ok=True)
    print("Generating shared fixtures:")
    bayes_fixtures()
    ev_fixtures()
    sensitivity_fixtures()
    options_fixtures()
    portfolio_fixtures()
    fundamentals_fixtures()
    calibration_fixtures()
    intuition_fixtures()
    prereg_fixtures()
    kelly_fixtures()
    reliability_fixtures()
    information_fixtures()
    fmea_fixtures()
    print("Done.")


if __name__ == "__main__":
    main()
