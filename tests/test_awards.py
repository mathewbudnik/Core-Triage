"""Tests for the awards system."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect, init_db  # noqa: E402


class AwardsSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_awards_table_exists_with_columns(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT column_name, data_type, is_nullable
                       FROM information_schema.columns
                       WHERE table_name = 'awards'
                       ORDER BY ordinal_position;"""
                )
                cols = cur.fetchall()
        names = [c[0] for c in cols]
        for required in ("id", "user_id", "kind", "payload", "earned_at"):
            self.assertIn(required, names, f"awards.{required} missing")
        # payload is jsonb
        for name, dt, _ in cols:
            if name == "payload":
                self.assertEqual(dt, "jsonb")

    def test_unique_user_kind_constraint(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT 1 FROM information_schema.table_constraints
                       WHERE table_name = 'awards'
                       AND constraint_type = 'UNIQUE';"""
                )
                self.assertIsNotNone(cur.fetchone(), "UNIQUE (user_id, kind) missing")


from database import (  # noqa: E402
    log_training,
    insert_award,
    list_awards,
    compute_streak,
    count_sends,
)


def _make_user(email: str = "awards_test@coretriage.local") -> int:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) "
                "ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id;",
                (email, "x"),
            )
            uid = cur.fetchone()[0]
            cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (uid,))
            cur.execute("DELETE FROM awards WHERE user_id = %s;", (uid,))
        conn.commit()
    return uid


class AwardHelpersTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM awards WHERE user_id = %s;", (self.uid,))
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_insert_and_list(self):
        insert_award(self.uid, "first_send_v5", {"trigger_log_id": 1, "grade": "V5"})
        rows = list_awards(self.uid)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "first_send_v5")
        self.assertEqual(rows[0]["payload"]["grade"], "V5")

    def test_insert_is_idempotent(self):
        insert_award(self.uid, "first_send_v5", {"grade": "V5"})
        insert_award(self.uid, "first_send_v5", {"grade": "V5"})  # re-fire
        rows = list_awards(self.uid)
        self.assertEqual(len(rows), 1, "duplicate award not deduped")

    def test_count_sends_total(self):
        log_training(self.uid, {
            "date": "2026-05-10", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}},
        })
        log_training(self.uid, {
            "date": "2026-05-11", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V6": {"s": 2, "f": 0, "p": 0}}, "route": {"5.11a": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertEqual(count_sends(self.uid), 6)

    def test_compute_streak_consecutive(self):
        # 3 consecutive days = streak of 3
        for d in ("2026-05-14", "2026-05-15", "2026-05-16"):
            log_training(self.uid, {
                "date": d, "session_type": "bouldering",
                "duration_min": 60, "intensity": 7,
            })
        self.assertEqual(compute_streak(self.uid, today="2026-05-16"), 3)

    def test_compute_streak_breaks_on_gap(self):
        # Logged 14, 15, 16, then 18 → streak ending 18 is 1 day
        for d in ("2026-05-14", "2026-05-15", "2026-05-16", "2026-05-18"):
            log_training(self.uid, {
                "date": d, "session_type": "bouldering",
                "duration_min": 60, "intensity": 7,
            })
        self.assertEqual(compute_streak(self.uid, today="2026-05-18"), 1)

    def test_compute_streak_no_logs(self):
        self.assertEqual(compute_streak(self.uid, today="2026-05-16"), 0)


from src.awards_catalog import (  # noqa: E402
    AWARD_CATALOG,
    detect_new_awards,
)


class AwardEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user(email="award_engine@coretriage.local")

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM awards WHERE user_id = %s;", (self.uid,))
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_first_send_v3_fires_when_logged(self):
        log_training(self.uid, {
            "date": "2026-05-15", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V3": {"s": 1, "f": 0, "p": 0}}},
        })
        new = detect_new_awards(self.uid, "2026-05-15")
        kinds = {a["kind"] for a in new}
        self.assertIn("first_send_v3", kinds)

    def test_first_send_v3_idempotent(self):
        log_training(self.uid, {
            "date": "2026-05-15", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V3": {"s": 1, "f": 0, "p": 0}}},
        })
        detect_new_awards(self.uid, "2026-05-15")
        # Log another V3 — should NOT re-fire first_send_v3
        log_training(self.uid, {
            "date": "2026-05-16", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V3": {"s": 2, "f": 0, "p": 0}}},
        })
        new = detect_new_awards(self.uid, "2026-05-16")
        kinds = {a["kind"] for a in new}
        self.assertNotIn("first_send_v3", kinds)

    def test_first_flash_fires(self):
        log_training(self.uid, {
            "date": "2026-05-15", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V4": {"s": 1, "f": 1, "p": 0}}},
        })
        new = detect_new_awards(self.uid, "2026-05-15")
        self.assertIn("first_flash", {a["kind"] for a in new})

    def test_streak_10d_fires_at_day_10(self):
        from datetime import date, timedelta
        start = date(2026, 5, 6)
        for i in range(10):
            d = (start + timedelta(days=i)).isoformat()
            log_training(self.uid, {
                "date": d, "session_type": "bouldering",
                "duration_min": 60, "intensity": 7,
            })
        new = detect_new_awards(self.uid, "2026-05-15")
        self.assertIn("streak_10d", {a["kind"] for a in new})

    def test_volume_10_fires(self):
        log_training(self.uid, {
            "date": "2026-05-15", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V3": {"s": 10, "f": 0, "p": 0}}},
        })
        new = detect_new_awards(self.uid, "2026-05-15")
        self.assertIn("volume_10", {a["kind"] for a in new})

    def test_catalog_complete(self):
        # Sanity: catalog covers grade/streak/volume/style milestones
        kinds = {entry["kind"] for entry in AWARD_CATALOG}
        for required in ("first_send_v3", "first_send_v10", "streak_3d", "streak_100d",
                         "volume_10", "volume_500", "first_flash"):
            self.assertIn(required, kinds, f"catalog missing {required}")


from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402


def _auth_token(email: str) -> str:
    c = TestClient(app)
    pw = "ClimbTest!1pw"
    r = c.post("/api/auth/register", json={"email": email, "password": pw})
    if r.status_code == 400:
        r = c.post("/api/auth/login", json={"email": email, "password": pw})
    return r.json()["token"]


class LogSessionAwardsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.email = "log_awards@coretriage.local"
        cls.token = _auth_token(cls.email)
        cls.client = TestClient(app)

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM training_logs WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
                cur.execute(
                    "DELETE FROM awards WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
            conn.commit()

    def _post(self, body):
        return self.client.post(
            "/api/training", json=body,
            headers={"Authorization": f"Bearer {self.token}"},
        )

    def test_response_includes_tier_change_and_new_awards(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("tier_change", body)
        self.assertIn("new_awards", body)

    def test_first_send_v5_promotes_v0_to_v5(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        body = r.json()
        self.assertEqual(body["tier_change"], {"from": "v0", "to": "v5"})

    def test_no_tier_change_returns_none(self):
        self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertIsNone(r.json()["tier_change"])

    def test_first_send_v5_returns_award_in_response(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        body = r.json()
        kinds = [a["kind"] for a in body["new_awards"]]
        self.assertIn("first_send_v5", kinds)
