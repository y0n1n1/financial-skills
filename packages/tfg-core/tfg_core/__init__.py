"""Pure quantitative primitives behind The Financial Gauntlet.

Every function here is deterministic given its arguments: no file IO, no network
calls, no printing. Data acquisition and presentation live in ``tools/``, which
makes this layer testable and portable — the TypeScript port in
``packages/core-ts`` mirrors it function for function, verified against shared
fixtures in ``packages/fixtures``.

Modules
-------
``bayes``        posterior chains with confidence intervals propagated throughout
``ev``           Monte Carlo and closed-form expected value over revenue x multiple
``sensitivity``  one-at-a-time input perturbation, ranked by EV impact
``options``      Black-Scholes implied scenario probabilities
``portfolio``    Black-Litterman allocation
``fundamentals`` Piotroski F-Score
``calibration``  Brier scoring and reliability buckets
``intuition``    scoring of human overrides against outcomes
``prereg``       motivated-reasoning detection from pre-registered expectations
``kelly``        Kelly fraction as a binary entry gate
``reliability``  per-lens diagnostic reliability and base-rate-dependent PPV
``information``  Shannon information content of evidence, in bits
``fmea``         failure-mode RPN scoring and defense-independence grading

The last four implement methods that ``theory/`` and ``parameters/`` specify in
prose but that had no executable form before this package.
"""

from __future__ import annotations

__version__ = "0.1.0"

from . import (
    bayes,
    calibration,
    constants,
    ev,
    fmea,
    fundamentals,
    information,
    intuition,
    kelly,
    options,
    portfolio,
    prereg,
    reliability,
    sensitivity,
)

__all__ = [
    "bayes",
    "calibration",
    "constants",
    "ev",
    "fmea",
    "fundamentals",
    "information",
    "intuition",
    "kelly",
    "options",
    "portfolio",
    "prereg",
    "reliability",
    "sensitivity",
    "__version__",
]
