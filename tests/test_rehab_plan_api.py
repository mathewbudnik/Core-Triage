"""Real-DB tests for the rehab-plan helpers + endpoints."""
from __future__ import annotations

import os
import sys
import unittest

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import (  # noqa: E402
    _connect, init_db,
    save_session,
    create_or_reuse_rehab_plan,
    get_active_rehab_plan,
    get_rehab_checkoff_dates,
    check_rehab_exercise,
)
from main import app  # noqa: E402

app.state.limiter.enabled = False  # churn register/login without tripping the 5/min auth limit

_TEST_PASSWORD = "Rehab!Test1pw"


def _cleanup_user(email: str) -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE email = %s;", (email,))
        conn.commit()


def _register_and_login(email: str) -> str:
    c = TestClient(app)
    r = c.post("/api/auth/register", json={"email": email, "password": _TEST_PASSWORD})
    assert r.status_code == 200, r.text
    r = c.post("/api/auth/login", json={"email": email, "password": _TEST_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _uid(email: str) -> int:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
        return cur.fetchone()[0]


class RehabPlanHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rehab_plan_db@coretriage.local"
        _cleanup_user(self.email)
        _register_and_login(self.email)
        self.uid = _uid(self.email)

    def tearDown(self):
        _cleanup_user(self.email)

    def test_create_and_get_active(self):
        plan = create_or_reuse_rehab_plan(self.uid, None, "Finger")
        self.assertEqual(plan["region"], "Finger")
        self.assertEqual(plan["status"], "active")
        active = get_active_rehab_plan(self.uid)
        self.assertEqual(active["id"], plan["id"])

    def test_same_region_reuses_and_preserves_start(self):
        first = create_or_reuse_rehab_plan(self.uid, None, "Finger")
        again = create_or_reuse_rehab_plan(self.uid, None, "Finger")
        self.assertEqual(first["id"], again["id"])
        self.assertEqual(first["plan_started_at"], again["plan_started_at"])

    def test_different_region_supersedes(self):
        first = create_or_reuse_rehab_plan(self.uid, None, "Finger")
        second = create_or_reuse_rehab_plan(self.uid, None, "Shoulder")
        self.assertNotEqual(first["id"], second["id"])
        active = get_active_rehab_plan(self.uid)
        self.assertEqual(active["id"], second["id"])
        self.assertEqual(active["region"], "Shoulder")

    def test_checkoff_dates_distinct_desc(self):
        check_rehab_exercise(self.uid, "Finger:1:A", "Finger", 1, "2026-06-10")
        check_rehab_exercise(self.uid, "Finger:1:B", "Finger", 1, "2026-06-10")  # same day
        check_rehab_exercise(self.uid, "Finger:1:A", "Finger", 1, "2026-06-11")
        dates = get_rehab_checkoff_dates(self.uid)
        self.assertEqual(dates, ["2026-06-11", "2026-06-10"])
