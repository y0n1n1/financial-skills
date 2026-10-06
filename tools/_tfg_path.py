"""Make ``tfg_core`` importable when running from a bare checkout.

Prefers an installed copy (``pip install packages/tfg-core``); falls back to the
in-repo source so every CLI in this directory stays runnable after a plain
``git clone`` with no install step.
"""

from __future__ import annotations

import os
import sys


def ensure_tfg_core_importable() -> None:
    """Add the in-repo package root to ``sys.path`` if ``tfg_core`` is missing."""
    try:
        import tfg_core  # noqa: F401
    except ModuleNotFoundError:
        here = os.path.dirname(os.path.abspath(__file__))
        package_root = os.path.join(os.path.dirname(here), "packages", "tfg-core")
        if package_root not in sys.path:
            sys.path.insert(0, package_root)
