"""Smoke test for the monthly pentagon snapshot cron job."""
from __future__ import annotations

import datetime as dt
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import init_db  # noqa: E402
from scripts.snapshot_pentagon_cron import run_snapshots  # noqa: E402


@pytest.fixture(autouse=True)
def ensure_schema():
    init_db()
    yield


def test_run_snapshots_handles_no_active_users():
    """With a `now` far in the future, no real training_logs fall inside the
    past-90-days window, so the job runs cleanly and writes 0 snapshots."""
    # 2099-01-01 — any real training_logs.created_at is well before
    # (2099-01-01 - 90d = 2098-10-03), so the "past 90 days" filter
    # catches nothing.
    result = run_snapshots(now=dt.datetime(2099, 1, 1, tzinfo=dt.UTC))
    assert result == 0
