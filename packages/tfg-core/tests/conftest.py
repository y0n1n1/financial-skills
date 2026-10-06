"""Shared fixture loading.

Test vectors live in ``packages/fixtures`` rather than in this package, because
the TypeScript port reads the same files. A fixture change that breaks one
language breaks both suites, which is the point.
"""

from __future__ import annotations

import json
import os
from typing import Any

import pytest

FIXTURE_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "fixtures")
)


#: Inverse of the sentinel map in scripts/generate_fixtures.py.
NON_FINITE_SENTINELS = {
    "__Infinity__": float("inf"),
    "__-Infinity__": float("-inf"),
    "__NaN__": float("nan"),
}


def decode(value: Any) -> Any:
    """Recursively restore non-finite floats from their string sentinels."""
    if isinstance(value, str) and value in NON_FINITE_SENTINELS:
        return NON_FINITE_SENTINELS[value]
    if isinstance(value, dict):
        return {k: decode(v) for k, v in value.items()}
    if isinstance(value, list):
        return [decode(v) for v in value]
    return value


def load_fixture(name: str) -> dict[str, Any]:
    """Read one shared fixture file by name (without the .json suffix)."""
    with open(os.path.join(FIXTURE_DIR, f"{name}.json")) as f:
        return decode(json.load(f))


def cases(name: str) -> list[tuple[str, dict, Any, float]]:
    """Flatten a fixture into ``(case_name, input, expected, tolerance)`` tuples."""
    data = load_fixture(name)
    tol = data["tolerance"]
    return [(c["name"], c["input"], c["expected"], tol) for c in data["cases"]]


@pytest.fixture(scope="session")
def fixture_dir() -> str:
    """Absolute path to the shared fixture directory."""
    return FIXTURE_DIR
