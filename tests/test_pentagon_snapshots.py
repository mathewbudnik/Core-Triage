"""Tests for pentagon_snapshots table + DB helpers."""
from __future__ import annotations

import datetime as dt
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import (  # noqa: E402
    _connect,
    get_pentagon_snapshots,
    init_db,
    save_pentagon_snapshot,
)


def _make_user(email: str = "pentagon_snapshots_test@coretriage.local") -> int:
    """Insert or fetch a dedicated test user; clean their snapshots."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) "
                "ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id;",
                (email, "x"),
            )
            uid = cur.fetchone()[0]
            cur.execute("DELETE FROM pentagon_snapshots WHERE user_id = %s;", (uid,))
        conn.commit()
    return uid


@pytest.fixture
def user_id():
    init_db()
    uid = _make_user()
    yield uid
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM pentagon_snapshots WHERE user_id = %s;", (uid,))
        conn.commit()


def test_save_and_get_pentagon_snapshot(user_id):
    axes = {"power": 7.4, "crimpy": 8.6, "dynamic": 6.2, "technical": 7.8, "mobility": 5.1}
    captured_at = dt.datetime(2026, 5, 1, tzinfo=dt.UTC)
    save_pentagon_snapshot(user_id, captured_at, axes, archetype="Crimper")

    rows = get_pentagon_snapshots(user_id, limit=5)
    assert len(rows) == 1
    assert rows[0]["axes"] == axes
    assert rows[0]["archetype"] == "Crimper"


def test_get_pentagon_snapshots_returns_most_recent_first(user_id):
    base = dt.datetime(2026, 1, 1, tzinfo=dt.UTC)
    for i in range(6):
        save_pentagon_snapshot(
            user_id,
            base + dt.timedelta(days=30 * i),
            {"power": 5, "crimpy": 5, "dynamic": 5, "technical": 5, "mobility": 5},
            archetype="Apprentice",
        )
    rows = get_pentagon_snapshots(user_id, limit=3)
    assert len(rows) == 3
    # Most recent first
    assert rows[0]["captured_at"] > rows[1]["captured_at"] > rows[2]["captured_at"]


def test_save_pentagon_snapshot_is_idempotent_per_month(user_id):
    """Saving twice in the same calendar month for the same user updates rather than duplicates."""
    base = dt.datetime(2026, 5, 5, tzinfo=dt.UTC)
    save_pentagon_snapshot(
        user_id, base,
        {"power": 5, "crimpy": 5, "dynamic": 5, "technical": 5, "mobility": 5},
        archetype="X",
    )
    save_pentagon_snapshot(
        user_id, base + dt.timedelta(days=10),
        {"power": 6, "crimpy": 7, "dynamic": 6, "technical": 7, "mobility": 6},
        archetype="Y",
    )
    rows = get_pentagon_snapshots(user_id, limit=5)
    # One row, latest values
    assert len(rows) == 1
    assert rows[0]["archetype"] == "Y"
