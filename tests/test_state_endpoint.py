"""Tests for the /api/me/state endpoint that feeds the Hub identity strip."""
from __future__ import annotations

import os
import sys
import unittest

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect, init_db, log_training  # noqa: E402
from main import app  # noqa: E402


# Strong enough to satisfy the register endpoint: 8+ chars, digit, symbol.
_TEST_PASSWORD = "MeState!Test1pw"


def _cleanup_user(email: str) -> None:
    """Delete the test user (and any FK-cascaded rows like training_logs)."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE email = %s;", (email,))
        conn.commit()


def _register_and_login(email: str) -> str:
    """Register a fresh user via the real auth endpoints; return bearer token.

    The register response *does* include a token, but going via login mirrors
    the test in the plan and exercises the same code path the frontend uses.
    """
    client = TestClient(app)
    r = client.post("/api/auth/register", json={
        "email": email,
        "password": _TEST_PASSWORD,
    })
    # If the user already exists from a prior run we'll get 400; in that case
    # the cleanup helper should have run first. Treat 200 as the only OK path.
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    r = client.post("/api/auth/login", json={
        "email": email,
        "password": _TEST_PASSWORD,
    })
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    # The login response in this project uses `token`, not `access_token`.
    return r.json()["token"]


class MeStateEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "me_state_test@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.client = TestClient(app)

    def tearDown(self):
        _cleanup_user(self.email)

    def _auth(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}

    # ── Auth ───────────────────────────────────────────────────────────

    def test_me_state_requires_auth(self):
        # Use a separate client so the setUp registration doesn't leak headers.
        r = TestClient(app).get("/api/me/state")
        # FastAPI's HTTPBearer returns 403 when no Authorization header is
        # present — get_current_user raises 401 once it sees a missing/invalid
        # token. Accept either to match the rest of the codebase's behavior.
        self.assertIn(r.status_code, (401, 403))

    # ── New-user defaults ──────────────────────────────────────────────

    def test_me_state_returns_required_fields_for_new_user(self):
        r = self.client.get("/api/me/state", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        # Required fields — exact key names the Hub identity strip reads.
        for key in (
            "apex_grade",
            "tier",
            "streak_days_current",
            "streak_days_longest",
            "pentagon",
            "recent_sends",
            "archetype",
        ):
            self.assertIn(key, body)

        # New user defaults
        self.assertEqual(body["streak_days_current"], 0)
        self.assertEqual(body["streak_days_longest"], 0)
        # Apex grade is None when there are no sends.
        self.assertIsNone(body["apex_grade"])
        # No sends → no pentagon → archetype defaults to "Apprentice".
        self.assertIsNone(body["pentagon"])
        self.assertEqual(body["archetype"], "Apprentice")
        # tier defaults to the lowest band for ungraded climbers.
        self.assertEqual(body["tier"], "sandstone")
        self.assertEqual(body["recent_sends"], [])

    # ── With logged sends ──────────────────────────────────────────────

    def test_me_state_reports_apex_grade_after_a_send(self):
        # Look up the user id and seed one boulder send.
        with _connect() as conn, conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s;", (self.email,))
            uid = cur.fetchone()[0]
        log_training(uid, {
            "date": "2026-05-20",
            "session_type": "bouldering",
            "duration_min": 60,
            "intensity": 7,
            "climbs": {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}}},
        })

        r = self.client.get("/api/me/state", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        # V5 is the hardest send.
        self.assertEqual(body["apex_grade"], "V5")
        # V5 → 6th tier in the (sandstone..obsidian) ladder.
        self.assertEqual(body["tier"], "jade")
        # recent_sends should list it in the JS-friendly shape.
        self.assertGreaterEqual(len(body["recent_sends"]), 1)
        first = body["recent_sends"][0]
        self.assertIn("grade", first)
        self.assertIn("sentAt", first)
        self.assertIn("wallAngle", first)
        self.assertIn("isFirstAtGrade", first)
        self.assertIn("burnsBeforeSend", first)
        self.assertEqual(first["grade"], "V5")


if __name__ == "__main__":
    unittest.main()
