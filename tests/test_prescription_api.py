"""Real-DB tests for the skill-prescription endpoints.

Mirror tests/test_state_endpoint.py: register/login via the real auth
endpoints, hit a real Postgres (whatever CORETRIAGE_DB_* points at),
clean up by deleting the user (FK cascade clears child rows).
"""
from __future__ import annotations

import os
import sys
import unittest

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect, init_db, log_training  # noqa: E402
from main import app  # noqa: E402

_TEST_PASSWORD = "Rx!Test1password"


def _cleanup_user(email: str) -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE email = %s;", (email,))
        conn.commit()


def _register_and_login(email: str) -> str:
    client = TestClient(app)
    r = client.post("/api/auth/register", json={"email": email, "password": _TEST_PASSWORD})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    r = client.post("/api/auth/login", json={"email": email, "password": _TEST_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _user_id(email: str) -> int:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
        return cur.fetchone()[0]


def _seed_send(uid: int, grade: str, styles: dict, date: str = "2026-05-20") -> None:
    """Log one boulder send tagged with the given styles (e.g. {'technical': 1})."""
    log_training(uid, {
        "date": date,
        "session_type": "bouldering",
        "duration_min": 60,
        "intensity": 7,
        "climbs": {"boulder": {grade: {"s": 1, "f": 0, "p": 0, "styles": styles}}},
    })


def _seed_technique_gap(uid: int) -> None:
    """Seed sends so the gap axis is unambiguously ``technique``.

    The pentagon floors every axis at 30% of apex, so an *untagged* axis sits
    lower than a lightly-tagged one. Tag power/crimp/dynamic/mobility and leave
    'technical' untagged => technique is the unique weakest axis.
    """
    _seed_send(uid, "V8", {"powerful": 1}, date="2026-05-20")
    _seed_send(uid, "V5", {"crimpy": 1}, date="2026-05-21")
    _seed_send(uid, "V5", {"dynamic": 1}, date="2026-05-22")
    _seed_send(uid, "V5", {"mobility": 1}, date="2026-05-23")


class GapAxisOnStateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rx_gap_test@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.client = TestClient(app)

    def tearDown(self):
        _cleanup_user(self.email)

    def _auth(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_state_has_gap_axis_key_null_for_new_user(self):
        r = self.client.get("/api/me/state", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIn("gap_axis", body)
        self.assertIsNone(body["gap_axis"])  # no sends -> no pentagon -> no gap

    def test_state_gap_axis_is_canonical_when_a_gap_exists(self):
        uid = _user_id(self.email)
        _seed_technique_gap(uid)  # technique left untagged => the gap
        r = self.client.get("/api/me/state", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        gap = r.json()["gap_axis"]
        # canonical key, not the legacy 'technical'
        self.assertIn(gap, ("power", "crimp", "dynamic", "technique", "mobility"))
        self.assertEqual(gap, "technique")


if __name__ == "__main__":
    unittest.main()
