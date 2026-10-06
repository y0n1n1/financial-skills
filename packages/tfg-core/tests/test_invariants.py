"""Invariants the methodology claims, asserted directly.

Fixture tests catch drift from a recorded answer. These catch violations of the
properties the documentation promises, which no single recorded answer pins down.
"""

from __future__ import annotations

import math

import pytest

from tfg_core import bayes, calibration, ev, fundamentals, options, prereg
from tfg_core.constants import LR_RANGES, POSTERIOR_CEILING, POSTERIOR_FLOOR


class TestBayes:
    def test_posterior_never_escapes_the_clamp(self):
        """No finite chain of ordinal evidence earns certainty."""
        for direction in ("STRONG_FOR", "STRONG_AGAINST"):
            result = bayes.run_chain(
                0.5, 0.1,
                [bayes.Update(direction, 1.0, f"s{i}") for i in range(200)],
                apply_bias_correction=False,
            )
            assert POSTERIOR_FLOOR <= result.posterior.mean <= POSTERIOR_CEILING

    def test_ambiguous_evidence_moves_nothing(self):
        """AMBIGUOUS has a unit LR and zero spread, so it cannot update anything."""
        baseline = bayes.run_chain(0.4, 0.08, [], apply_bias_correction=False)
        with_ambiguous = bayes.run_chain(
            0.4, 0.08,
            [bayes.Update("AMBIGUOUS", 0.9, "noise") for _ in range(5)],
            apply_bias_correction=False,
        )
        assert with_ambiguous.posterior.mean == baseline.posterior.mean
        assert with_ambiguous.posterior.std_raw == baseline.posterior.std_raw

    def test_supporting_evidence_raises_and_undermining_lowers(self):
        prior = 0.40
        up = bayes.run_chain(prior, 0.08, [bayes.Update("STRONG_FOR", 1.0)])
        down = bayes.run_chain(prior, 0.08, [bayes.Update("STRONG_AGAINST", 1.0)])
        assert up.posterior.mean > prior > down.posterior.mean

    def test_bias_correction_only_widens_the_interval(self):
        """Overconfidence inflation must never make a claim tighter."""
        updates = [bayes.Update("MODERATE_FOR", 0.8), bayes.Update("WEAK_AGAINST", 0.6)]
        corrected = bayes.run_chain(0.4, 0.08, updates, apply_bias_correction=True)
        raw = bayes.run_chain(0.4, 0.08, updates, apply_bias_correction=False)
        assert corrected.posterior.std_corrected > raw.posterior.std_corrected

    def test_inside_view_dampening_pulls_lr_toward_one(self):
        """Dampened evidence must move the posterior less, never more."""
        updates = [bayes.Update("STRONG_FOR", 1.0)]
        dampened = bayes.run_chain(0.4, 0.08, updates, apply_bias_correction=True)
        undampened = bayes.run_chain(0.4, 0.08, updates, apply_bias_correction=False)
        assert 0.4 < dampened.posterior.mean < undampened.posterior.mean

    def test_quality_scales_impact_monotonically(self):
        means = [
            bayes.run_chain(
                0.4, 0.08, [bayes.Update("STRONG_FOR", q)], apply_bias_correction=False,
            ).posterior.mean
            for q in (0.0, 0.25, 0.5, 0.75, 1.0)
        ]
        assert means == sorted(means)
        assert means[0] == pytest.approx(0.4), "zero-quality evidence must be inert"

    def test_lr_ranges_are_ordered_and_straddle_one(self):
        order = [
            "STRONG_AGAINST", "MODERATE_AGAINST", "WEAK_AGAINST",
            "AMBIGUOUS", "WEAK_FOR", "MODERATE_FOR", "STRONG_FOR",
        ]
        centrals = [LR_RANGES[d]["central"] for d in order]
        assert centrals == sorted(centrals)
        assert LR_RANGES["AMBIGUOUS"]["central"] == 1.0
        assert LR_RANGES["AMBIGUOUS"]["std"] == 0.0

    def test_crosses_detects_a_straddled_boundary(self):
        wide = bayes.Posterior(0.5, 0.2, 0.3, (0.2, 0.8), (0.0, 1.0))
        narrow = bayes.Posterior(0.2, 0.02, 0.03, (0.17, 0.23), (0.14, 0.26))
        assert wide.crosses(0.5)
        assert not narrow.crosses(0.5)

    def test_update_is_the_identity_at_unit_lr(self):
        for prior in (0.01, 0.25, 0.5, 0.99):
            assert bayes.update(prior, 1.0) == pytest.approx(prior)


class TestOptions:
    @pytest.mark.parametrize("boundaries", [[100.0], [80.0, 120.0], [50.0, 90.0, 130.0, 200.0]])
    def test_probabilities_partition_the_line(self, boundaries):
        """Buckets are exhaustive and disjoint, so they must sum to exactly 1."""
        result = options.scenario_probabilities(
            spot=100.0, iv=0.35, rf=0.04, expiry_years=1.0,
            scenario_boundaries=boundaries, scenario_labels=[],
        )
        assert sum(s.probability for s in result.scenarios) == pytest.approx(1.0, abs=1e-12)
        assert len(result.scenarios) == len(boundaries) + 1

    def test_below_and_above_are_complementary(self):
        args = dict(S=100.0, K=115.0, T=1.0, r=0.04, sigma=0.3)
        below = options.probability_below(**args)
        above = options.probability_above(**args)
        assert below + above == pytest.approx(1.0, abs=1e-12)

    def test_higher_vol_fattens_both_tails(self):
        def tails(sigma):
            lo = options.probability_below(100.0, 60.0, 1.0, 0.04, sigma)
            hi = options.probability_above(100.0, 160.0, 1.0, 0.04, sigma)
            return lo + hi

        assert tails(0.6) > tails(0.3) > tails(0.15)

    def test_zero_horizon_has_no_width(self):
        assert options.probability_range(100.0, 90.0, 110.0, 0.0, 0.04, 0.3) == 0.0

    def test_unsorted_boundaries_are_handled(self):
        shuffled = options.scenario_probabilities(
            spot=100.0, iv=0.3, rf=0.04, expiry_years=1.0,
            scenario_boundaries=[130.0, 80.0, 105.0], scenario_labels=[],
        )
        ordered = options.scenario_probabilities(
            spot=100.0, iv=0.3, rf=0.04, expiry_years=1.0,
            scenario_boundaries=[80.0, 105.0, 130.0], scenario_labels=[],
        )
        assert [s.probability for s in shuffled.scenarios] == [
            s.probability for s in ordered.scenarios
        ]


class TestExpectedValue:
    def test_monte_carlo_mean_approaches_the_closed_form(self):
        """With no dispersion the simulation must reproduce the deterministic EV.

        Multiple noise still applies, so the agreement is statistical, not exact.
        """
        matrix = dict(
            current_mcap=4400.0,
            revenue_scenarios=[365.0, 300.0, 240.0, 180.0],
            revenue_probs=[0.20, 0.40, 0.25, 0.15],
            multiple_scenarios=[30.0, 22.0, 15.0],
            multiple_probs=[0.20, 0.50, 0.30],
        )
        closed = ev.deterministic_ev(margin=0.65, **matrix)
        simulated = ev.monte_carlo(
            revenue_stds=[0.0, 0.0, 0.0, 0.0], net_margin=0.65,
            n_simulations=200_000, seed=1, **matrix,
        ).ev_mean
        assert simulated == pytest.approx(closed, abs=0.02)

    def test_same_seed_reproduces_the_run(self):
        args = dict(
            current_mcap=1000.0, revenue_scenarios=[120.0, 90.0],
            revenue_probs=[0.6, 0.4], revenue_stds=[15.0, 10.0],
            multiple_scenarios=[25.0, 12.0], multiple_probs=[0.5, 0.5],
            net_margin=0.5, n_simulations=5_000,
        )
        assert ev.monte_carlo(seed=7, **args) == ev.monte_carlo(seed=7, **args)
        assert ev.monte_carlo(seed=7, **args) != ev.monte_carlo(seed=8, **args)

    def test_probabilities_sum_over_the_histogram(self):
        result = ev.monte_carlo(
            current_mcap=1000.0, revenue_scenarios=[120.0, 90.0],
            revenue_probs=[0.6, 0.4], revenue_stds=[15.0, 10.0],
            multiple_scenarios=[25.0, 12.0], multiple_probs=[0.5, 0.5],
            n_simulations=10_000,
        )
        assert sum(result.histogram.counts) == result.n_simulations
        assert len(result.histogram.edges) == len(result.histogram.counts) + 1
        assert result.p_positive + result.p_negative == pytest.approx(1.0, abs=1e-9)

    def test_percentiles_are_monotonic(self):
        p = ev.monte_carlo(
            current_mcap=4400.0, revenue_scenarios=[365.0, 240.0],
            revenue_probs=[0.5, 0.5], revenue_stds=[40.0, 25.0],
            multiple_scenarios=[30.0, 15.0], multiple_probs=[0.5, 0.5],
            n_simulations=50_000,
        ).percentiles
        values = [p.p5, p.p10, p.p25, p.p50, p.p75, p.p90, p.p95]
        assert values == sorted(values)

    def test_kelly_is_negative_when_the_bet_is_bad(self):
        """A wildly overvalued starting cap must fail the gate."""
        result = ev.monte_carlo(
            current_mcap=100_000.0, revenue_scenarios=[100.0],
            revenue_probs=[1.0], revenue_stds=[5.0],
            multiple_scenarios=[10.0], multiple_probs=[1.0],
            n_simulations=20_000,
        )
        assert result.ev_mean < 0
        assert result.kelly_fraction <= 0


class TestFundamentals:
    def test_score_bands(self):
        assert fundamentals.classify(9) is fundamentals.Quality.STRONG
        assert fundamentals.classify(7) is fundamentals.Quality.STRONG
        assert fundamentals.classify(6) is fundamentals.Quality.MODERATE
        assert fundamentals.classify(4) is fundamentals.Quality.MODERATE
        assert fundamentals.classify(3) is fundamentals.Quality.WEAK
        assert fundamentals.classify(0) is fundamentals.Quality.WEAK

    def test_subtotals_sum_to_the_total(self):
        result = fundamentals.compute_fscore(
            roa_current=0.65, roa_prior=0.55, cfo_current=97.0,
            net_income_current=73.0, ltd_ratio_current=0.07, ltd_ratio_prior=0.08,
            current_ratio_current=3.91, current_ratio_prior=3.50,
            shares_current=24400.0, shares_prior=24500.0,
            gross_margin_current=0.75, gross_margin_prior=0.73,
            asset_turnover_current=0.85, asset_turnover_prior=0.80,
        )
        assert result.total_score == 9
        assert (
            result.profitability_score + result.leverage_score + result.efficiency_score
            == result.total_score
        )
        assert len(result.signals) == 9
        assert all(s.score in (0, 1) for s in result.signals)

    def test_flat_period_scores_only_the_sign_checks(self):
        """Identical periods fail every improvement test but pass the level tests."""
        result = fundamentals.compute_fscore(
            roa_current=0.10, roa_prior=0.10, cfo_current=50.0,
            net_income_current=40.0, ltd_ratio_current=0.2, ltd_ratio_prior=0.2,
            current_ratio_current=2.0, current_ratio_prior=2.0,
            shares_current=1000.0, shares_prior=1000.0,
            gross_margin_current=0.5, gross_margin_prior=0.5,
            asset_turnover_current=1.0, asset_turnover_prior=1.0,
        )
        # ROA > 0, CFO > 0, CFO > NI, and no dilution (shares equal) all pass.
        assert result.total_score == 4


class TestCalibration:
    def test_brier_bounds(self):
        assert calibration.brier_score(1.0, 1) == 0.0
        assert calibration.brier_score(0.0, 0) == 0.0
        assert calibration.brier_score(1.0, 0) == 1.0
        assert calibration.brier_score(0.5, 1) == 0.25

    def test_perfect_forecaster_scores_zero(self):
        report = calibration.score_calibration([
            calibration.Forecast(1.0, 1), calibration.Forecast(0.0, 0),
            calibration.Forecast(1.0, 1),
        ])
        assert report.mean_brier == 0.0
        assert report.verdict == "GOOD"

    def test_empty_input_is_reported_not_crashed(self):
        report = calibration.score_calibration([])
        assert report.n_resolved == 0
        assert math.isnan(report.mean_brier)
        assert not report.sufficient_data

    def test_buckets_cover_every_forecast(self):
        pairs = [(0.05, 0), (0.3, 1), (0.5, 0), (0.7, 1), (0.95, 1), (1.0, 1)]
        report = calibration.score_calibration(
            [calibration.Forecast(p, o) for p, o in pairs]
        )
        assert sum(b.count for b in report.buckets) == len(pairs), (
            "a forecast of exactly 1.0 must still land in a bucket"
        )

    def test_overconfidence_is_flagged(self):
        confident_and_wrong = [calibration.Forecast(0.9, 0)] * 8
        assert calibration.score_calibration(confident_and_wrong).overconfident

        confident_and_right = [calibration.Forecast(0.9, 1)] * 8
        assert not calibration.score_calibration(confident_and_right).overconfident


class TestPrereg:
    def test_drift_against_the_declared_lean_is_never_flagged(self):
        """The check exists to catch confirmation, not disconfirmation."""
        for direction, actual in (("bullish", 0.05), ("bearish", 0.95)):
            result = prereg.compare(0.50, actual, direction)
            assert not result.motivated_reasoning_flag
            assert abs(result.divergence) > 0.15, "a large move, yet still unflagged"

    def test_confirming_drift_is_flagged_sooner_than_undirected_drift(self):
        assert prereg.compare(0.40, 0.52, "bullish").motivated_reasoning_flag
        assert not prereg.compare(0.40, 0.52, "neutral").motivated_reasoning_flag

    def test_divergence_sign_follows_the_posterior(self):
        assert prereg.compare(0.40, 0.55, "neutral").divergence == pytest.approx(0.15)
        assert prereg.compare(0.40, 0.25, "neutral").divergence == pytest.approx(-0.15)
