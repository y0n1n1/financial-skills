"""Every algorithm, checked against the shared golden vectors.

These are regression tests with a second job: the same files are consumed by the
TypeScript suite, so passing here and there means the two implementations agree.
"""

from __future__ import annotations

from dataclasses import asdict

import pytest

from conftest import cases
from tfg_core import (
    bayes,
    calibration,
    ev,
    fundamentals,
    intuition,
    options,
    portfolio,
    prereg,
    sensitivity,
)


def assert_close(actual, expected, tol: float, path: str = "") -> None:
    """Recursively compare nested structures within tolerance.

    Numbers are compared with tolerance; everything else must be equal, so a
    changed label or verdict string fails as loudly as a changed number.
    """
    if isinstance(expected, dict):
        assert isinstance(actual, dict), f"{path}: expected a mapping, got {type(actual)}"
        assert set(actual) == set(expected), (
            f"{path}: key mismatch — missing {set(expected) - set(actual)}, "
            f"unexpected {set(actual) - set(expected)}"
        )
        for key in expected:
            assert_close(actual[key], expected[key], tol, f"{path}.{key}")
    elif isinstance(expected, (list, tuple)):
        assert len(actual) == len(expected), f"{path}: length {len(actual)} != {len(expected)}"
        for i, (a, e) in enumerate(zip(actual, expected)):
            assert_close(a, e, tol, f"{path}[{i}]")
    elif isinstance(expected, bool) or expected is None:
        assert actual == expected, f"{path}: {actual!r} != {expected!r}"
    elif isinstance(expected, (int, float)):
        assert actual == pytest.approx(expected, abs=tol, rel=tol), (
            f"{path}: {actual!r} != {expected!r}"
        )
    else:
        assert actual == expected, f"{path}: {actual!r} != {expected!r}"


@pytest.mark.parametrize("name,inp,expected,tol", cases("bayes_chain"))
def test_bayes_chain(name, inp, expected, tol):
    result = bayes.run_chain(
        prior_mean=inp["prior_mean"],
        prior_std=inp["prior_std"],
        updates=[bayes.Update(**u) for u in inp["updates"]],
        apply_bias_correction=inp["apply_bias_correction"],
    )
    actual = {
        "chain": [asdict(s) for s in result.chain],
        "posterior": {
            "mean": result.posterior.mean,
            "std_raw": result.posterior.std_raw,
            "std_corrected": result.posterior.std_corrected,
            "ci_68": list(result.posterior.ci_68),
            "ci_95": list(result.posterior.ci_95),
        },
        "crosses_50": result.posterior.crosses(0.5),
    }
    assert_close(actual, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("bayes_primitives"))
def test_bayes_primitives(name, inp, expected, tol):
    fn = inp.pop("fn")
    actual = {
        "update": lambda: bayes.update(inp["prior"], inp["lr"]),
        "dampen_lr": lambda: bayes.dampen_lr(inp["raw_lr"], inp["quality"]),
        "evidence_quality": lambda: bayes.evidence_quality(
            inp["source_tier"], inp["days_old"], inp["sample_n"], inp["is_primary"]
        ),
    }[fn]()
    assert_close(actual, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("ev_deterministic"))
def test_deterministic_ev(name, inp, expected, tol):
    assert_close(ev.deterministic_ev(**inp), expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("ev_monte_carlo"))
def test_monte_carlo(name, inp, expected, tol):
    result = ev.monte_carlo(**inp)
    actual = {
        "ev_mean": result.ev_mean,
        "ev_median": result.ev_median,
        "ev_std": result.ev_std,
        "p_positive": result.p_positive,
        "p_negative": result.p_negative,
        "percentiles": asdict(result.percentiles),
        "kelly_fraction": result.kelly_fraction,
    }
    # Python owns the reference stream, so it is held to exact equality here even
    # though the cross-language tolerance is loose.
    assert_close(actual, expected, 1e-12, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("sensitivity"))
def test_sensitivity(name, inp, expected, tol):
    actual = [asdict(s) for s in sensitivity.run_sensitivity(**inp)]
    assert_close(actual, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("options"))
def test_options(name, inp, expected, tol):
    result = options.scenario_probabilities(**inp)
    actual = {
        "scenarios": result.as_dicts(),
        "ev": result.ev,
        "probability_sum": sum(s.probability for s in result.scenarios),
    }
    assert_close(actual, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("portfolio"))
def test_black_litterman(name, inp, expected, tol):
    assert_close(asdict(portfolio.black_litterman(**inp)), expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("fundamentals"))
def test_fscore(name, inp, expected, tol):
    assert_close(asdict(fundamentals.compute_fscore(**inp)), expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("calibration"))
def test_calibration(name, inp, expected, tol):
    report = calibration.score_calibration(
        [calibration.Forecast(**f) for f in inp["forecasts"]]
    )
    actual = {
        "n_resolved": report.n_resolved,
        "mean_brier": report.mean_brier,
        "verdict": report.verdict,
        "sufficient_data": report.sufficient_data,
        "overconfident": report.overconfident,
        "buckets": [dict(asdict(b), calibrated=b.calibrated) for b in report.buckets],
    }
    assert_close(actual, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("intuition"))
def test_intuition(name, inp, expected, tol):
    divergence = intuition.Divergence(
        parameter=inp["parameter"],
        model_recommendation=inp["model_recommendation"],
        human_answer=inp["human_answer"],
        certainty=inp["certainty"],
    )
    resolution = intuition.resolve(divergence, inp["actual"])
    actual = {
        "category": divergence.category,
        "divergence": divergence.divergence,
        **asdict(resolution),
    }
    assert_close(actual, expected, tol, name)


@pytest.mark.parametrize("name,inp,expected,tol", cases("prereg"))
def test_prereg(name, inp, expected, tol):
    assert_close(asdict(prereg.compare(**inp)), expected, tol, name)
