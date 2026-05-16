"""Tests for the climb log + grade pyramid feature."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.climb_grades import (  # noqa: E402
    grade_order,
    validate_climbs,
    format_climbs_summary,
    compute_hardest,
)


class GradeOrderTests(unittest.TestCase):
    def test_v_scale_ascending(self):
        self.assertLess(grade_order("V0"), grade_order("V5"))
        self.assertLess(grade_order("V5"), grade_order("V13"))
        self.assertLess(grade_order("V13"), grade_order("V17"))

    def test_yds_ascending(self):
        self.assertLess(grade_order("5.6"), grade_order("5.10a"))
        self.assertLess(grade_order("5.10a"), grade_order("5.10d"))
        self.assertLess(grade_order("5.10d"), grade_order("5.11a"))
        self.assertLess(grade_order("5.11a"), grade_order("5.15d"))

    def test_invalid_grade_raises(self):
        with self.assertRaises(ValueError):
            grade_order("V99")
        with self.assertRaises(ValueError):
            grade_order("5.16")


class ValidateClimbsTests(unittest.TestCase):
    def test_empty_ok(self):
        validate_climbs({})

    def test_valid_boulder_ok(self):
        validate_climbs({"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}})

    def test_valid_route_ok(self):
        validate_climbs({"route": {"5.11a": {"s": 1, "f": 0, "p": 2}}})

    def test_bad_top_level_key(self):
        with self.assertRaises(ValueError):
            validate_climbs({"trad": {"5.10a": {"s": 1, "f": 0, "p": 0}}})

    def test_bad_v_grade(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V18": {"s": 1, "f": 0, "p": 0}}})

    def test_bad_yds_grade(self):
        with self.assertRaises(ValueError):
            validate_climbs({"route": {"5.16": {"s": 1, "f": 0, "p": 0}}})

    def test_flashes_exceed_sends(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": 1, "f": 2, "p": 0}}})

    def test_negative_count(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": -1, "f": 0, "p": 0}}})

    def test_non_int_count(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": "three", "f": 0, "p": 0}}})

    def test_missing_counter_key(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": 1}}})


class FormatSummaryTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(format_climbs_summary({}), "")

    def test_boulder_only(self):
        self.assertEqual(
            format_climbs_summary({"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}}),
            "Boulder: V5×3 (1 flash)",
        )

    def test_boulder_with_project(self):
        self.assertEqual(
            format_climbs_summary({"boulder": {"V7": {"s": 0, "f": 0, "p": 3}}}),
            "Boulder: V7 projecting (3 tries)",
        )

    def test_multiple_disciplines(self):
        out = format_climbs_summary({
            "boulder": {"V5": {"s": 3, "f": 1, "p": 0}, "V6": {"s": 1, "f": 0, "p": 0}},
            "route":   {"5.11a": {"s": 1, "f": 0, "p": 0}},
        })
        self.assertIn("Boulder: V5×3 (1 flash), V6×1", out)
        self.assertIn("Route: 5.11a×1", out)


class ComputeHardestTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(compute_hardest({}), {"boulder": None, "route": None})

    def test_boulder_max(self):
        c = {"boulder": {"V3": {"s": 1, "f": 1, "p": 0}, "V6": {"s": 1, "f": 0, "p": 0}}}
        self.assertEqual(compute_hardest(c)["boulder"], "V6")

    def test_project_does_not_count_as_send(self):
        # Hardest SEND, not hardest attempted.
        c = {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}, "V7": {"s": 0, "f": 0, "p": 3}}}
        self.assertEqual(compute_hardest(c)["boulder"], "V5")


from database import _connect, init_db  # noqa: E402


class SchemaMigrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_training_logs_has_climbs_jsonb(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT data_type, column_default, is_nullable
                       FROM information_schema.columns
                       WHERE table_name = 'training_logs' AND column_name = 'climbs';"""
                )
                row = cur.fetchone()
        self.assertIsNotNone(row, "climbs column missing")
        data_type, default, nullable = row
        self.assertEqual(data_type, "jsonb")
        self.assertIn("'{}'", default or "")
        self.assertEqual(nullable, "NO")


from database import log_training, get_training_logs  # noqa: E402


def _make_seed_user(email: str = "climb_test@coretriage.local") -> int:
    """Create (or reuse) a test user, return its id. Cleans up rows."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) "
                "ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id;",
                (email, "x"),
            )
            uid = cur.fetchone()[0]
            cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (uid,))
        conn.commit()
    return uid


class LogTrainingClimbsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_seed_user()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_insert_with_climbs_writes_jsonb(self):
        log_training(self.uid, {
            "date": "2026-05-15",
            "session_type": "bouldering",
            "duration_min": 90,
            "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}},
            "notes": "",
        })
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT climbs, grades_sent FROM training_logs WHERE user_id = %s;",
                    (self.uid,),
                )
                row = cur.fetchone()
        climbs, grades_sent = row
        self.assertEqual(climbs, {"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}})
        self.assertEqual(grades_sent, "Boulder: V5×3 (1 flash)")

    def test_insert_without_climbs_is_unchanged(self):
        log_training(self.uid, {
            "date": "2026-05-15",
            "session_type": "hangboard",
            "duration_min": 30,
            "intensity": 6,
            "grades_sent": "manual text",
            "notes": "",
        })
        rows = get_training_logs(self.uid)
        self.assertEqual(rows[0]["grades_sent"], "manual text")


from database import get_user_hardest  # noqa: E402


class HardestSendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_seed_user(email="hardest_test@coretriage.local")

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_no_logs_returns_none(self):
        out = get_user_hardest(self.uid, window="all")
        self.assertEqual(out, {"boulder": None, "route": None})

    def test_picks_max_send_across_logs(self):
        log_training(self.uid, {
            "date": "2026-05-10", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 2, "f": 0, "p": 0}}},
        })
        log_training(self.uid, {
            "date": "2026-05-12", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V7": {"s": 1, "f": 0, "p": 0}}},
        })
        log_training(self.uid, {
            "date": "2026-05-14", "session_type": "routes",
            "duration_min": 60, "intensity": 7,
            "climbs": {"route": {"5.11c": {"s": 1, "f": 0, "p": 0}}},
        })
        out = get_user_hardest(self.uid, window="all")
        self.assertEqual(out, {"boulder": "V7", "route": "5.11c"})

    def test_projects_dont_count(self):
        log_training(self.uid, {
            "date": "2026-05-10", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V7": {"s": 0, "f": 0, "p": 5}}},
        })
        out = get_user_hardest(self.uid, window="all")
        self.assertIsNone(out["boulder"])

    def test_invalid_window_raises(self):
        with self.assertRaises(ValueError):
            get_user_hardest(self.uid, window="week")


from database import get_pyramid  # noqa: E402


class PyramidTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_seed_user(email="pyramid_test@coretriage.local")

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_empty_user(self):
        out = get_pyramid(self.uid, window="all")
        self.assertEqual(out, {
            "window": "all",
            "boulder": {"hardest_send": None, "hardest_flash": None, "grades": []},
            "route":   {"hardest_send": None, "hardest_flash": None, "grades": []},
        })

    def test_sums_across_logs_and_sorts(self):
        log_training(self.uid, {
            "date": "2026-05-10", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 2, "f": 1, "p": 0}, "V6": {"s": 0, "f": 0, "p": 2}}},
        })
        log_training(self.uid, {
            "date": "2026-05-12", "session_type": "bouldering",
            "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}, "V7": {"s": 1, "f": 0, "p": 0}}},
        })
        out = get_pyramid(self.uid, window="all")
        self.assertEqual(out["boulder"]["hardest_send"], "V7")
        self.assertEqual(out["boulder"]["hardest_flash"], "V5")
        # Grades sorted ascending; counters summed.
        grades = out["boulder"]["grades"]
        self.assertEqual(grades, [
            {"grade": "V5", "s": 3, "f": 1, "p": 0},
            {"grade": "V6", "s": 0, "f": 0, "p": 2},
            {"grade": "V7", "s": 1, "f": 0, "p": 0},
        ])


from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402


def _auth_token_for(email: str) -> str:
    """Register or log in a user, return bearer token."""
    client = TestClient(app)
    payload = {"email": email, "password": "ClimbTest!1pw"}
    r = client.post("/api/auth/register", json=payload)
    if r.status_code == 400:
        r = client.post("/api/auth/login", json=payload)
    return r.json()["token"]


class LogSessionEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.email = "endpoint_climb@coretriage.local"
        cls.token = _auth_token_for(cls.email)
        cls.client = TestClient(app)

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM training_logs WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
            conn.commit()

    def _post(self, body):
        return self.client.post(
            "/api/training", json=body,
            headers={"Authorization": f"Bearer {self.token}"},
        )

    def test_no_climbs_returns_no_prs(self):
        r = self._post({
            "session_type": "hangboard", "duration_min": 30, "intensity": 6,
        })
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("id", body)
        self.assertEqual(body.get("new_prs"), {"boulder": None, "route": None})

    def test_first_boulder_send_sets_pr(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["new_prs"], {"boulder": "V5", "route": None})

    def test_lower_grade_does_not_set_pr(self):
        # First, set a V7 PR
        self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V7": {"s": 1, "f": 0, "p": 0}}},
        })
        # Now send a V5 — not a PR
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 2, "f": 0, "p": 0}}},
        })
        self.assertEqual(r.json()["new_prs"], {"boulder": None, "route": None})

    def test_invalid_grade_returns_400(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V99": {"s": 1, "f": 0, "p": 0}}},
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn("V99", r.json()["detail"])

    def test_flashes_exceed_sends_returns_400(self):
        r = self._post({
            "session_type": "bouldering", "duration_min": 60, "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 2, "p": 0}}},
        })
        self.assertEqual(r.status_code, 400)


class PyramidEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.email = "pyr_endpoint@coretriage.local"
        cls.token = _auth_token_for(cls.email)
        cls.client = TestClient(app)

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM training_logs WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
            conn.commit()

    def test_empty_user(self):
        r = self.client.get(
            "/api/training/pyramid?window=all",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["window"], "all")
        self.assertEqual(body["boulder"]["grades"], [])

    def test_aggregates_sends(self):
        self.client.post(
            "/api/training", json={
                "session_type": "bouldering", "duration_min": 60, "intensity": 7,
                "climbs": {"boulder": {"V5": {"s": 2, "f": 1, "p": 0}}},
            },
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.client.post(
            "/api/training", json={
                "session_type": "bouldering", "duration_min": 60, "intensity": 7,
                "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}, "V6": {"s": 0, "f": 0, "p": 2}}},
            },
            headers={"Authorization": f"Bearer {self.token}"},
        )
        r = self.client.get(
            "/api/training/pyramid?window=all",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["boulder"]["hardest_send"], "V5")
        self.assertEqual(body["boulder"]["grades"], [
            {"grade": "V5", "s": 3, "f": 1, "p": 0},
            {"grade": "V6", "s": 0, "f": 0, "p": 2},
        ])

    def test_invalid_window(self):
        r = self.client.get(
            "/api/training/pyramid?window=year",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(r.status_code, 400)
