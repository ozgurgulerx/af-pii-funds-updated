#!/usr/bin/env python3
"""
Runtime configuration helpers for local development and deployment.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

SRC_ROOT = Path(__file__).resolve().parent
REPO_ROOT = SRC_ROOT.parent


@lru_cache(maxsize=1)
def load_local_env() -> None:
    """Load repository-local dotenv files when they exist."""
    for env_path in (
        REPO_ROOT / ".env",
        REPO_ROOT / ".env.local",
        SRC_ROOT / ".env",
        SRC_ROOT / ".env.local",
    ):
        if env_path.exists():
            load_dotenv(env_path, override=False)


def default_sqlite_path() -> Path:
    """Return the best local SQLite path for the current checkout."""
    load_local_env()

    candidates = []
    configured_path = os.getenv("SQLITE_PATH")
    if configured_path:
        candidates.append(Path(configured_path).expanduser())

    candidates.extend((
        SRC_ROOT / "nport_funds.db",
        REPO_ROOT / "nport_funds.db",
        REPO_ROOT / "data" / "nport_funds.db",
    ))

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0]
