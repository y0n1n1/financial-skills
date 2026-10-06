"""The four algorithms that existed only as prose before this package.

Each is checked twice: against the shared fixtures, and against the worked
example written into the methodology doc it implements. The doc examples are the
stronger test — they were computed independently of this code.
"""

from __future__ import annotations

import math
from dataclasses import asdict

import pytest

from conftest import cases
from tfg_core import fmea, information, kelly, reliability
from test_against_fixtures import assert_close


# --------------------------------------------------------------------------
# Fixture agreement
# --------------------------------------------------------------------------

@pytest.mark.parametrize("name,inp,expected,tol", cases("kelly"))
def test_kelly_fixtures(name, inp, expected, tol):
    result = kelly.evaluate(**inp)
    assert_close(asdict(result) | {"passes": result.passes}, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("kelly_breakeven"))
def test_kelly_helper_fixtures(name, inp, expected, tol):
    fn = inp.pop("fn")
    actual = {
        "breakeven_probability": lambda: kelly.breakeven_probability(inp["win_loss_ratio"]),
        "growth_rate": lambda: kelly.growth_rate(
            inp["probability"], inp["win_loss_ratio"], inp["fraction"]
        ),
    }[fn]()
    assert_close(actual, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("reliability_ppv"))
def test_reliability_fixtures(name, inp, expected, tol):
    pv = reliability.evaluate_lens(inp["lens"], inp["base_rate"])
    assert_close(asdict(pv) | {"ppv_lift": pv.ppv_lift}, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("reliability_tally"))
def test_tally_fixtures(name, inp, expected, tol):
    assert_close(asdict(reliability.weighted_tally(inp["verdicts"])), expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("information"))
def test_information_fixtures(name, inp, expected, tol):
    actual = information.score(
        f"{inp['n_consistent']} of {inp['n_hypotheses']}",
        inp["n_hypotheses"], inp["n_consistent"],
    )
    assert_close(asdict(actual), expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("information_entropy"))
def test_entropy_fixtures(name, inp, expected, tol):
    fn = inp.pop("fn")
    actual = {
        "entropy": lambda: information.entropy(inp["probabilities"]),
        "entropy_reduction": lambda: information.entropy_reduction(
            inp["prior"], inp["posterior"]
        ),
    }[fn]()
    assert_close(actual, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("fmea_rpn"))
def test_fmea_rank_fixtures(name, inp, expected, tol):
    triggers = [fmea.Trigger(**t) for t in inp["triggers"]]
    assert_close([asdict(s) for s in fmea.rank(triggers)], expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("fmea_independence"))
def test_fmea_audit_fixtures(name, inp, expected, tol):
    triggers = [fmea.Trigger(**t) for t in inp["triggers"]]
    assert_close(asdict(fmea.audit_independence(triggers)), expected, tol, name)


# --------------------------------------------------------------------------
# Agreement with the documented worked examples
# --------------------------------------------------------------------------

class TestDocumentedExamples:
    def test_lens_reliability_ppv_example(self):
        """theory/lens-reliability.md: sens 0.80, spec 0.70, base rate 35% -> 59%."""
        ppv = reliability.positive_predictive_value(0.80, 0.70, 0.35)
        assert round(ppv, 2) == 0.59

    def test_information_content_examples(self):
        """theory/information-content.md lists all four values for N=4."""
        assert information.information_content(4, 1) == 2.0
        assert information.information_content(4, 2) == 1.0
        assert round(information.information_content(4, 3), 2) == 0.42
        assert information.information_content(4, 4) == 0.0

    def test_information_bands_match_the_table(self):
        assert information.band_for(0.0) is information.Band.ZERO
        assert information.band_for(0.42) is information.Band.LOW
        assert information.band_for(0.8) is information.Band.MEDIUM
        assert information.band_for(1.2) is information.Band.HIGH
        assert information.band_for(1.6) is information.Band.CRITICAL

    def test_kelly_formula_example(self):
        """sizing/kelly.md: f* = (p*b - q) / b."""
        p, b = 0.60, 2.0
        expected = (p * b - (1 - p)) / b
        assert kelly.kelly_fraction(p, b) == pytest.approx(expected)
        assert kelly.kelly_fraction(p, b) == pytest.approx(0.40)

    def test_fmea_rpn_bands_match_the_table(self):
        assert fmea.priority_for(25) is fmea.Priority.LOW
        assert fmea.priority_for(50) is fmea.Priority.LOW
        assert fmea.priority_for(140) is fmea.Priority.MODERATE
        assert fmea.priority_for(216) is fmea.Priority.HIGH
        assert fmea.priority_for(450) is fmea.Priority.CRITICAL
        assert fmea.priority_for(1000) is fmea.Priority.EXTREME

    def test_independence_grades_follow_the_table_not_the_example(self):
        """parameters/defense-independence.md's own example mislabels 57% as B.

        Its grade table puts 40-60% at C, which is what this implements.
        """
        assert fmea.grade_for(4 / 7) is fmea.Grade.C
        assert fmea.grade_for(0.85) is fmea.Grade.A
        assert fmea.grade_for(0.70) is fmea.Grade.B
        assert fmea.grade_for(0.30) is fmea.Grade.D


# --------------------------------------------------------------------------
# Invariants
# --------------------------------------------------------------------------

class TestKellyInvariants:
    def test_breakeven_is_where_the_fraction_crosses_zero(self):
        for b in (0.5, 1.0, 2.0, 5.0):
            p_star = kelly.breakeven_probability(b)
            assert kelly.kelly_fraction(p_star, b) == pytest.approx(0.0, abs=1e-12)
            assert kelly.kelly_fraction(p_star + 0.01, b) > 0
            assert kelly.kelly_fraction(p_star - 0.01, b) < 0

    def test_full_kelly_maximises_growth(self):
        """The defining property: no other fraction grows the bankroll faster."""
        p, b = 0.60, 2.0
        f_star = kelly.kelly_fraction(p, b)
        best = kelly.growth_rate(p, b, f_star)
        for delta in (-0.2, -0.1, -0.05, 0.05, 0.1, 0.2):
            assert kelly.growth_rate(p, b, f_star + delta) < best

    def test_overbetting_eventually_destroys_the_bankroll(self):
        p, b = 0.60, 2.0
        assert kelly.growth_rate(p, b, 0.99) < 0
        assert kelly.growth_rate(p, b, 1.0) == float("-inf")

    def test_fractional_multiples_are_consistent(self):
        result = kelly.evaluate(0.632, 0.523, 0.25)
        assert result.half == pytest.approx(result.fraction / 2)
        assert result.quarter == pytest.approx(result.fraction / 4)

    def test_excluded_positions_do_not_pass(self):
        assert not kelly.evaluate(0.40, 0.20, 0.30).passes
        assert kelly.evaluate(0.70, 0.60, 0.20).passes

    def test_zero_downside_is_rejected_not_rewarded(self):
        """A riskless bet is a modelling error, not an infinite-size opportunity."""
        result = kelly.evaluate(0.80, 0.50, 0.0)
        assert result.gate == kelly.Gate.EXCLUDED.value
        assert not result.passes
        assert result.fraction == 0.0
        assert "positive magnitude" in result.reason

    def test_negative_downside_is_also_rejected(self):
        result = kelly.evaluate(0.80, 0.50, -0.25)
        assert result.gate == kelly.Gate.EXCLUDED.value
        assert result.fraction == 0.0


class TestReliabilityInvariants:
    def test_ppv_falls_as_the_base_rate_falls(self):
        """The medical-testing insight: a good lens is weak on rare theories."""
        ppvs = [
            reliability.positive_predictive_value(0.80, 0.70, br)
            for br in (0.05, 0.20, 0.35, 0.50, 0.80)
        ]
        assert ppvs == sorted(ppvs)

    def test_ppv_equals_base_rate_for_an_uninformative_lens(self):
        """Sensitivity + specificity = 1 means the lens is a coin flip."""
        for br in (0.1, 0.35, 0.9):
            assert reliability.positive_predictive_value(0.5, 0.5, br) == pytest.approx(br)
            assert reliability.evaluate_lens("fundamental", br).ppv_lift > 0

    def test_a_perfect_lens_is_certain(self):
        assert reliability.positive_predictive_value(1.0, 1.0, 0.35) == 1.0
        assert reliability.negative_predictive_value(1.0, 1.0, 0.35) == 1.0

    def test_contrarian_check_outweighs_sentiment_and_technical_combined(self):
        """The doc claims this explicitly; it should be true of the weights."""
        lenses = reliability.LENSES
        assert lenses["contrarian_check"].weight > (
            lenses["sentiment"].weight + lenses["technical"].weight
        ) * 0.99

    def test_weighting_reveals_weaker_support_than_raw_counting(self):
        verdicts = {
            "fundamental": "SUPPORTS", "technical": "SUPPORTS",
            "competitive_moat": "SUPPORTS", "macro_sector": "SUPPORTS",
            "sentiment": "SUPPORTS", "contrarian_check": "UNDERMINES",
        }
        tally = reliability.weighted_tally(verdicts)
        assert tally.raw_support == pytest.approx(5 / 6)
        assert tally.weighted_support < tally.raw_support
        assert tally.divergence < 0

    def test_unanimous_support_is_full_marks(self):
        verdicts = {k: "SUPPORTS" for k in ("fundamental", "technical", "sentiment")}
        assert reliability.weighted_tally(verdicts).weighted_support == pytest.approx(1.0)

    def test_empty_verdicts_do_not_divide_by_zero(self):
        tally = reliability.weighted_tally({})
        assert tally.weighted_support == 0.0
        assert tally.raw_support == 0.0


class TestInformationInvariants:
    def test_ic_decreases_as_evidence_fits_more_hypotheses(self):
        bits = [information.information_content(8, n) for n in (1, 2, 4, 8)]
        assert bits == sorted(bits, reverse=True)

    def test_universal_evidence_is_worthless(self):
        for n in (2, 4, 8, 100):
            assert information.information_content(n, n) == 0.0
            assert not information.score("x", n, n).admissible

    def test_admission_threshold_gates_the_chain(self):
        assert not information.score("3 of 4", 4, 3).admissible, "0.42 bits is below 0.5"
        assert information.score("2 of 4", 4, 2).admissible, "1.0 bits clears 0.5"
        assert information.score("1 of 4", 4, 1).material

    def test_invalid_hypothesis_counts_are_rejected(self):
        with pytest.raises(ValueError):
            information.information_content(0, 1)
        with pytest.raises(ValueError):
            information.information_content(4, 5)

    def test_entropy_is_maximal_when_uniform(self):
        uniform = information.entropy([0.25] * 4)
        assert uniform == pytest.approx(2.0)
        assert information.entropy([0.7, 0.2, 0.07, 0.03]) < uniform
        assert information.entropy([1.0, 0.0, 0.0, 0.0]) == 0.0

    def test_entropy_reduction_can_be_negative(self):
        """An analysis that widened the field should report that honestly."""
        reduction = information.entropy_reduction([0.9, 0.1], [0.5, 0.5])
        assert reduction < 0


class TestFmeaInvariants:
    def test_rpn_is_the_product(self):
        t = fmea.Trigger("x", severity=7, occurrence=5, detection=4)
        assert t.rpn == 140

    def test_rpn_spans_the_documented_range(self):
        assert fmea.Trigger("min", 1, 1, 1).rpn == 1
        assert fmea.Trigger("max", 10, 10, 10).rpn == 1000

    def test_worse_detection_raises_risk(self):
        """Detection is inverted, so a higher D must mean a higher RPN."""
        base = fmea.Trigger("a", 5, 5, 2).rpn
        worse = fmea.Trigger("b", 5, 5, 9).rpn
        assert worse > base

    def test_out_of_range_scores_are_rejected(self):
        for bad in ({"severity": 0}, {"severity": 11}, {"occurrence": -1}, {"detection": 99}):
            kwargs = {"severity": 5, "occurrence": 5, "detection": 5} | bad
            with pytest.raises(ValueError):
                fmea.Trigger("x", **kwargs)

    def test_ranking_is_descending(self):
        triggers = [
            fmea.Trigger("low", 2, 2, 2), fmea.Trigger("high", 9, 8, 7),
            fmea.Trigger("mid", 5, 5, 4),
        ]
        rpns = [s.rpn for s in fmea.rank(triggers)]
        assert rpns == sorted(rpns, reverse=True)

    def test_clustered_triggers_are_one_layer_not_many(self):
        same = [
            fmea.Trigger(f"F{i}", 5, 5, 4, cluster="EARNINGS") for i in range(1, 8)
        ]
        audit = fmea.audit_independence(same)
        assert audit.n_clusters == 1
        assert audit.independence == pytest.approx(1 / 7)
        assert audit.grade == fmea.Grade.D.value
        assert "EARNINGS" in audit.redundant_clusters

    def test_fully_independent_triggers_grade_a(self):
        distinct = [
            fmea.Trigger(f"T{i}", 5, 5, 4, cluster=f"C{i}") for i in range(5)
        ]
        audit = fmea.audit_independence(distinct)
        assert audit.independence == 1.0
        assert audit.grade == fmea.Grade.A.value
        assert audit.redundant_clusters == []

    def test_consolidation_keeps_the_best_detector(self):
        triggers = [
            fmea.Trigger("slow", 5, 5, 8, cluster="EARNINGS"),
            fmea.Trigger("fast", 5, 5, 2, cluster="EARNINGS"),
            fmea.Trigger("medium", 5, 5, 5, cluster="EARNINGS"),
        ]
        audit = fmea.audit_independence(triggers)
        consolidation = [r for r in audit.recommendations if "Consolidate" in r]
        assert len(consolidation) == 1
        assert "fast" in consolidation[0], "lowest D is the best detector"

    def test_unclustered_triggers_are_not_assumed_redundant(self):
        audit = fmea.audit_independence([
            fmea.Trigger("a", 5, 5, 4), fmea.Trigger("b", 5, 5, 4),
        ])
        assert audit.independence == 1.0
        assert audit.clusters == {}

    def test_empty_set_does_not_divide_by_zero(self):
        audit = fmea.audit_independence([])
        assert audit.independence == 0.0
        assert audit.n_triggers == 0

    def test_undetectable_risks_are_surfaced(self):
        audit = fmea.audit_independence([fmea.Trigger("fraud", 10, 2, 10)])
        assert any("leading indicator" in r for r in audit.recommendations)
