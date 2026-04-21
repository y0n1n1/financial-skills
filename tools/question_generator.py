"""
Question Generator for TFG v6
Extracts free parameters from the model, classifies them, checks dependencies,
and generates properly structured intuition questions in native units.

Usage:
  python3 question_generator.py --ticker NVDA --output-json
  python3 question_generator.py --ticker GOOGL --output-html
"""

import argparse
import json
import os
import sys
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class FreeParameter:
    name: str
    sensitivity: float          # EV swing from tornado (%)
    current_value: float
    source: str                 # ASSUMED / JUDGMENT / SEMI_EMPIRICAL
    unit: str                   # '%', '$B', 'quarter', 'state'
    param_type: str             # A (probability), B (rate), C (structural), D (magnitude)
    scale_min: float
    scale_max: float
    scale_step: float = 1.0
    anchors: list = field(default_factory=list)  # historical calibration anchors
    resolution: str = ""        # data source + date that resolves this
    conditional_on: Optional[str] = None
    question_text: str = ""
    named_states: list = field(default_factory=list)  # for Type C only


# NVDA free parameters (from v5 sensitivity tornado)
NVDA_PARAMS = [
    FreeParameter(
        name="gross_margin_q4_fy2027",
        sensitivity=12.5,
        current_value=75.0,  # Q4 FY2026 exit rate: 75.0%. FY avg: 71.1%. Exit rate is the real current state.
        source="SEMI_EMPIRICAL",
        unit="%",
        param_type="D",
        scale_min=60, scale_max=78, scale_step=1,
        question_text="What GAAP gross margin does NVDA report in Q4 FY2027 (Oct 2026)? Exit rate Q4 FY2026: 75.0%. FY avg: 71.1%. Gross = revenue minus COGS only (before SBC, R&D, tax).",
        anchors=[
            {"value": 63, "description": "AMD inference pricing forces GPU price cuts + Blackwell CoWoS yields stay poor + Rubin transition costs. 12pp compression from exit rate. (cf. Intel Haswell→Skylake margin hit)"},
            {"value": 70, "description": "Blackwell yields normalize per typical 18-24mo semiconductor yield curve. Modest pricing pressure on inference SKUs. Rubin not yet shipping."},
            {"value": 75, "description": "Current exit rate holds. CoWoS yields improve ahead of schedule. No meaningful price competition on training. (NVDA guidance: mid-70% range for FY2027)"},
        ],
        resolution="NVDA Q4 FY2027 earnings release, GAAP gross margin line. ~November 2026.",
    ),
    FreeParameter(
        name="bear_multiple_probability",
        sensitivity=8.1,
        current_value=30.0,
        source="ASSUMED",
        unit="%",
        param_type="A",
        scale_min=5, scale_max=60, scale_step=5,
        question_text="What probability do you assign to NVDA's forward P/E compressing below 15x within 18 months?",
        anchors=[
            {"value": 10, "description": "P/E compressed below 15x in 0 of 5 years since 2020 — rare event"},
            {"value": 30, "description": "P/E compressed below 20x in 2022 (crypto winter) — hostile macro + demand shock"},
            {"value": 50, "description": "Would require event comparable to 2000 dot-com where CSCO went from 220x to 15x"},
        ],
        resolution="NVDA stock price / forward EPS. Observable continuously. Resolve at 18mo mark (September 2027).",
    ),
    FreeParameter(
        name="bull_revenue_probability",
        sensitivity=7.0,
        current_value=25.0,
        source="ASSUMED",
        unit="%",
        param_type="A",
        scale_min=10, scale_max=60, scale_step=5,
        question_text="What probability do you assign to NVDA FY2028 revenue exceeding $420B? (Analyst consensus: ~$389B. $420B = 8% above consensus. Historical base rate: mega-cap tech beats consensus by >8% in ~20-25% of years.)",
        anchors=[
            {"value": 15, "description": "Capex cycle peaks in 2026-2027, growth decelerates to 15-20%. Revenue ~$370-390B (consensus range). $420B not reached."},
            {"value": 30, "description": "Current growth trajectory moderates but stays above consensus. Custom silicon displaces inference but training demand holds. $420B is a stretch but possible."},
            {"value": 50, "description": "AI supercycle continues, sovereign AI + enterprise deployment wave sustains 30%+ CAGR. Blackwell + Vera Rubin both driving upgrade cycles. $420B achieved comfortably."},
        ],
        resolution="NVDA FY2028 annual earnings release. ~February 2028.",
    ),
    FreeParameter(
        name="custom_silicon_inference_share_2027",
        sensitivity=6.0,
        current_value=25.0,
        source="JUDGMENT",
        unit="%",
        param_type="D",
        scale_min=10, scale_max=50, scale_step=5,
        question_text="What share of AI inference compute runs on non-NVDA hardware (TPU, Trainium, AMD, custom ASIC) by Q4 2027?",
        anchors=[
            {"value": 15, "description": "Custom silicon stalls — similar to AMD GPU market share trajectory 2018-2022 (slow grind, never meaningful)"},
            {"value": 30, "description": "Current trajectory continues — OpenAI AMD + Anthropic TPU deploy on schedule but don't displace training workloads"},
            {"value": 45, "description": "Rapid displacement — similar to Apple M1 pace: announced 2020, primary platform by 2022, 2-year transition"},
        ],
        resolution="Deloitte/IDC AI accelerator market share report Q4 2027. Proxy: NVDA inference revenue as % of DC revenue in earnings.",
        conditional_on=None,  # merged Q1+Q4 from v5
    ),
    FreeParameter(
        name="capex_cycle_peak_quarter",
        sensitivity=5.0,
        current_value=2027.5,  # Q2 2027 as midpoint
        source="JUDGMENT",
        unit="quarter",
        param_type="C",
        scale_min=2026.25, scale_max=2029.0, scale_step=0.25,
        question_text="When does the hyperscaler AI capex cycle peak?",
        named_states=[
            {"value": "Q2_2026", "description": "Peaks this year — similar to cloud capex cuts H2 2022 (Amazon/Azure guided down)"},
            {"value": "Q4_2026", "description": "Peaks late this year — NBER 90% no-productivity finding triggers pullback"},
            {"value": "Q2_2027", "description": "Peaks mid-2027 — one more year of growth then normalization"},
            {"value": "Q4_2027", "description": "Peaks late 2027 — current cycle is longer than typical 3-4yr semiconductor cycle"},
            {"value": "2028+", "description": "No peak visible — this IS the 8-10yr supercycle BofA described"},
        ],
        resolution="Hyperscaler quarterly capex guidance in earnings calls. Observable quarterly. Peak defined as first QoQ decline in aggregate capex.",
    ),
    FreeParameter(
        name="regime_normalization_probability",
        sensitivity=4.0,
        current_value=40.0,
        source="ASSUMED",
        unit="%",
        param_type="A",
        scale_min=10, scale_max=80, scale_step=5,
        question_text="What probability do you assign to VIX normalizing below 18 and Fed cutting at least twice by end of 2026?",
        anchors=[
            {"value": 20, "description": "Iran escalation continues, oil stays above $100, Fed can't cut — extended hostile regime"},
            {"value": 40, "description": "Geopolitical de-escalation, Fed cuts once, VIX drifts to 18-22 — partial normalization"},
            {"value": 70, "description": "Rapid de-escalation, oil drops, Fed cuts 2-3x, VIX returns to 12-15 — full risk-on (similar to post-COVID 2021)"},
        ],
        resolution="VIX level + Fed funds rate. Observable continuously. Resolve by December 2026.",
    ),
]


# GOOGL free parameters
GOOGL_PARAMS = [
    FreeParameter(
        name="search_revenue_growth_fy2026",
        sensitivity=8.0,
        current_value=17.0,
        source="SEMI_EMPIRICAL",
        unit="% YoY",
        param_type="D",
        scale_min=5, scale_max=30, scale_step=1,
        question_text="What YoY growth rate does Google Search revenue achieve in FY2026?",
        anchors=[
            {"value": 8, "description": "CTR collapse finally outpaces monetization — similar to newspaper ad revenue decline 2008-2012"},
            {"value": 17, "description": "Current trajectory continues (Q4 2025 was +17% QoQ)"},
            {"value": 25, "description": "AI Overview ads fully compensate + query expansion — eMarketer projects +24%"},
        ],
        resolution="Alphabet FY2026 annual report, Google Search & Other revenue line. ~February 2027.",
    ),
    FreeParameter(
        name="gemini_annual_revenue_fy2027",
        sensitivity=5.0,
        current_value=5.0,
        source="JUDGMENT",
        unit="$B",
        param_type="D",
        scale_min=1, scale_max=25, scale_step=1,
        question_text="What total annual revenue does Gemini generate in FY2027 (enterprise seats + API + ads)?",
        anchors=[
            {"value": 2, "description": "Gemini stays mostly free, enterprise churn high — similar to Google+ trajectory (never monetized)"},
            {"value": 8, "description": "8M seats at $30/mo + modest API + early ads — similar to MSFT Copilot year-2 trajectory ($5-8B)"},
            {"value": 20, "description": "50M+ seats + significant ad inventory monetization — 750M MAU at even $2/user/mo ARPU"},
        ],
        resolution="Alphabet earnings — Gemini revenue may be broken out by 2027. Proxy: Google Cloud AI revenue disclosures.",
    ),
    FreeParameter(
        name="cloud_operating_margin_fy2027",
        sensitivity=6.0,
        current_value=30.0,
        source="SEMI_EMPIRICAL",
        unit="%",
        param_type="D",
        scale_min=15, scale_max=40, scale_step=1,
        question_text="What operating margin does Google Cloud achieve in FY2027?",
        anchors=[
            {"value": 18, "description": "$175B capex overwhelms revenue growth, margin regresses — the value-destructive scenario"},
            {"value": 30, "description": "Current Q4 2025 margin (30.1%) holds as Cloud scales — baseline trajectory"},
            {"value": 37, "description": "Cloud reaches AWS-like margins (37%+) as scale economics kick in and capex intensity normalizes"},
        ],
        resolution="Alphabet quarterly earnings, Google Cloud segment operating income / revenue. Observable quarterly.",
    ),
    FreeParameter(
        name="doj_remedy_severity",
        sensitivity=4.0,
        current_value=2,  # 1=mild, 2=moderate, 3=structural
        source="JUDGMENT",
        unit="state",
        param_type="C",
        scale_min=1, scale_max=3, scale_step=1,
        question_text="What severity of DOJ antitrust remedies survives the appeals process?",
        named_states=[
            {"value": "mild", "description": "Current behavioral remedies hold on appeal. No Chrome sale, data sharing only. Apple deal renegotiated but continues. (Market has priced this — stock +56%)"},
            {"value": "moderate", "description": "Appeals court strengthens remedies: Apple default deal banned, limited data sharing mandated. Google adapts but loses $15-20B/yr Apple payment."},
            {"value": "structural", "description": "Chrome or Android divestiture ordered. Google Search share drops below 80% within 3 years. Fundamental structural change."},
        ],
        resolution="Appeals court ruling. Expected 2027-2028. Interim: DOJ filings and oral arguments provide signal.",
    ),
    FreeParameter(
        name="gemini_engagement_ratio",
        sensitivity=3.5,
        current_value=0.65,  # 11min/17min = 0.65
        source="SEMI_EMPIRICAL",
        unit="ratio",
        param_type="D",
        scale_min=0.4, scale_max=1.2, scale_step=0.05,
        question_text="What is Gemini's daily engagement time as a ratio of ChatGPT's by end of 2026? (Currently 11min/17min = 0.65)",
        anchors=[
            {"value": 0.45, "description": "Gap widens — ChatGPT memory/personalization features create stickiness Gemini can't match"},
            {"value": 0.65, "description": "Current ratio holds — Gemini grows MAU but engagement per user stays lower"},
            {"value": 0.95, "description": "Gemini catches up — Android integration drives daily use, Workspace embeds it in work habits"},
            {"value": 1.1, "description": "Gemini overtakes — happened with Google Maps vs MapQuest (distribution won)"},
        ],
        resolution="SimilarWeb or Data.ai engagement metrics. Observable monthly.",
    ),
]


def validate_accounting(params: list[FreeParameter]) -> list[str]:
    """Check for accounting errors in question parameters."""
    errors = []
    for p in params:
        # Check margin questions use correct margin type
        if "margin" in p.name.lower() or "margin" in p.question_text.lower():
            if "net" in p.name.lower() or "net" in p.question_text.lower():
                # Net margin should be below gross margin
                # Typical tech net margins: 20-55%. Gross margins: 50-80%.
                if p.scale_max > 65:
                    errors.append(
                        f"ACCOUNTING ERROR: {p.name} claims to be net margin but scale_max={p.scale_max}% "
                        f"exceeds typical net margin range. Are you confusing with gross margin? "
                        f"Net margin = after tax, SBC, interest. Gross margin = revenue - COGS only."
                    )
                if p.current_value > 60:
                    errors.append(
                        f"ACCOUNTING ERROR: {p.name} current_value={p.current_value}% is very high for net margin. "
                        f"Verify: GAAP net income / total revenue. Not operating income or gross profit."
                    )
            if "gross" in p.name.lower() or "gross" in p.question_text.lower():
                if p.scale_min < 30:
                    errors.append(
                        f"ACCOUNTING WARNING: {p.name} gross margin scale_min={p.scale_min}% is very low. "
                        f"Most tech companies have gross margins >40%. Verify this is realistic."
                    )
            if "operating" in p.name.lower() or "operating" in p.question_text.lower():
                if p.scale_max > 50 and "cloud" not in p.name.lower():
                    errors.append(
                        f"ACCOUNTING WARNING: {p.name} operating margin scale_max={p.scale_max}% is very high. "
                        f"Verify against company's historical operating margin range."
                    )

        # Check revenue questions have reasonable ranges
        if "revenue" in p.name.lower() and p.unit == "$B":
            if p.scale_max > p.current_value * 5:
                errors.append(
                    f"SANITY CHECK: {p.name} scale_max=${p.scale_max}B is >5x current (${p.current_value}B). "
                    f"Is this realistic within the question timeframe?"
                )

        # Check probability questions are 0-100%
        if p.param_type == "A":
            if p.scale_min < 0 or p.scale_max > 100:
                errors.append(
                    f"TYPE ERROR: {p.name} is Type A (probability) but scale [{p.scale_min}, {p.scale_max}] "
                    f"is outside 0-100% range."
                )

    return errors


def check_dependencies(params: list[FreeParameter]) -> list[dict]:
    """Check pairwise independence of questions."""
    deps = []
    for i, p1 in enumerate(params):
        for j, p2 in enumerate(params):
            if i >= j:
                continue
            # Heuristic: check if parameters share causal mechanisms
            dep_level = "NONE"
            reason = ""

            # Known dependencies
            if p1.name == "custom_silicon_inference_share_2027" and p2.name == "net_margin_fy2027":
                dep_level = "MEDIUM"
                reason = "Custom silicon adoption drives competitive pricing pressure which affects margins"
            elif p1.name == "capex_cycle_peak_quarter" and p2.name == "bull_revenue_probability":
                dep_level = "MEDIUM"
                reason = "Capex cycle duration determines how long revenue growth sustains"
            elif p1.name == "search_revenue_growth_fy2026" and p2.name == "gemini_annual_revenue_fy2027":
                dep_level = "LOW"
                reason = "Gemini ad cannibalization could affect search — but mostly separate revenue streams"

            if dep_level != "NONE":
                deps.append({
                    "param1": p1.name, "param2": p2.name,
                    "level": dep_level, "reason": reason,
                    "resolution": "conditional" if dep_level == "MEDIUM" else "independent"
                })
    return deps


def score_question_set(params: list[FreeParameter], deps: list[dict]) -> dict:
    """Score the question set quality."""
    n = len(params)
    n_deps = len(deps)
    n_pairs = n * (n-1) / 2

    coverage = 1.0  # all free params have questions by construction
    independence = 1.0 - (len([d for d in deps if d["level"] == "HIGH"]) / max(1, n_pairs))
    resolvability = sum(1 for p in params if p.resolution) / n
    sensitivity_total = sum(p.sensitivity for p in params)
    sensitivity_coverage = sensitivity_total / max(1, sensitivity_total)  # all params included
    anchor_quality = sum(1 for p in params if len(p.anchors) >= 2) / n

    overall = (coverage * 0.2 + independence * 0.25 + resolvability * 0.25 +
               sensitivity_coverage * 0.15 + anchor_quality * 0.15)

    return {
        "coverage": coverage,
        "independence": independence,
        "resolvability": resolvability,
        "sensitivity_coverage": sensitivity_coverage,
        "anchor_quality": anchor_quality,
        "overall": overall,
        "pass": overall >= 0.70,
    }


def generate_questions(ticker: str) -> dict:
    params = {"NVDA": NVDA_PARAMS, "GOOGL": GOOGL_PARAMS}.get(ticker.upper(), [])
    if not params:
        return {"error": f"No parameters defined for {ticker}"}

    # Run accounting validation FIRST — before any other checks
    accounting_errors = validate_accounting(params)
    if accounting_errors:
        print("ACCOUNTING VALIDATION ERRORS:", file=sys.stderr)
        for e in accounting_errors:
            print(f"  {e}", file=sys.stderr)

    deps = check_dependencies(params)
    quality = score_question_set(params, deps)

    questions = []
    for p in sorted(params, key=lambda x: x.sensitivity, reverse=True):
        q = {
            "id": f"Q-{ticker.upper()}-{p.name}",
            "parameter": p.name,
            "sensitivity": p.sensitivity,
            "type": p.param_type,
            "unit": p.unit,
            "question": p.question_text,
            "scale_min": p.scale_min,
            "scale_max": p.scale_max,
            "scale_step": p.scale_step,
            "current_value": p.current_value,
            "anchors": p.anchors,
            "named_states": p.named_states,
            "resolution": p.resolution,
            "conditional_on": p.conditional_on,
        }
        questions.append(q)

    return {
        "ticker": ticker.upper(),
        "n_questions": len(questions),
        "questions": questions,
        "dependencies": deps,
        "quality": quality,
        "accounting_errors": accounting_errors,
    }


def print_questions(data: dict):
    ticker = data["ticker"]
    quality = data["quality"]

    print(f"\n{'='*60}")
    print(f"  INTUITION QUESTIONS — {ticker}")
    print(f"  Quality: {quality['overall']:.0%} ({'PASS' if quality['pass'] else 'FAIL'})")
    print(f"  Questions: {data['n_questions']}")
    print(f"{'='*60}\n")

    for i, q in enumerate(data["questions"]):
        print(f"  Q{i+1} [{q['type']}] sensitivity: {q['sensitivity']:.1f}% EV swing")
        print(f"  Parameter: {q['parameter']}")
        print(f"  {q['question']}")
        if q["named_states"]:
            for s in q["named_states"]:
                print(f"    [{s['value']}] {s['description']}")
        else:
            print(f"    Scale: {q['scale_min']}{q['unit']} — {q['scale_max']}{q['unit']} (step {q['scale_step']})")
        if q["anchors"]:
            for a in q["anchors"]:
                print(f"    Anchor {a['value']}{q['unit']}: {a['description']}")
        print(f"    Resolution: {q['resolution']}")
        if q["conditional_on"]:
            print(f"    CONDITIONAL ON: {q['conditional_on']}")
        print()

    if data["dependencies"]:
        print(f"  Dependencies found:")
        for d in data["dependencies"]:
            print(f"    {d['param1']} ↔ {d['param2']}: {d['level']} — {d['reason']}")
        print()


def main():
    parser = argparse.ArgumentParser(description="Question Generator for TFG v6")
    parser.add_argument("--ticker", required=True)
    parser.add_argument("--json", action="store_true", dest="output_json")
    args = parser.parse_args()

    data = generate_questions(args.ticker)

    if args.output_json:
        # Custom serialization for dataclass
        print(json.dumps(data, indent=2, default=str))
    else:
        print_questions(data)


if __name__ == "__main__":
    main()
