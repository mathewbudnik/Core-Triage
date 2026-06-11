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
from database import (  # noqa: E402
    get_active_prescription,
    create_prescription,
    complete_prescription,
    check_prescription_drill,
    get_prescription_checkoffs,
)
from main import app  # noqa: E402

# These tests churn register/login many times; disable rate limiting for the
# test process so the auth limiter (5/min) doesn't reject setup registrations.
app.state.limiter.enabled = False

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


class PrescriptionDbHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rx_db_test@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.uid = _user_id(self.email)

    def tearDown(self):
        _cleanup_user(self.email)

    def test_create_and_get_active(self):
        drills = [{"key": "silent_feet", "name": "Silent feet", "target": 3}]
        pid = create_prescription(self.uid, "technique", drills, source="auto")
        self.assertIsInstance(pid, int)
        active = get_active_prescription(self.uid)
        self.assertIsNotNone(active)
        self.assertEqual(active["id"], pid)
        self.assertEqual(active["axis"], "technique")
        self.assertEqual(active["status"], "active")
        self.assertEqual(active["drills_json"][0]["key"], "silent_feet")

    def test_creating_a_second_block_completes_the_first(self):
        first = create_prescription(self.uid, "technique", [{"key": "silent_feet", "target": 3}])
        second = create_prescription(self.uid, "mobility", [{"key": "shoulder_cars", "target": 3}])
        active = get_active_prescription(self.uid)
        self.assertEqual(active["id"], second)
        self.assertNotEqual(active["id"], first)

    def test_checkoff_is_idempotent_per_day(self):
        pid = create_prescription(self.uid, "technique", [{"key": "silent_feet", "target": 3}])
        r1 = check_prescription_drill(self.uid, pid, "silent_feet", "2026-06-11")
        r2 = check_prescription_drill(self.uid, pid, "silent_feet", "2026-06-11")
        self.assertFalse(r1["already_existed"])
        self.assertTrue(r2["already_existed"])
        rows = get_prescription_checkoffs(self.uid, pid)
        self.assertEqual(len(rows), 1)

    def test_checkoffs_accumulate_across_days(self):
        pid = create_prescription(self.uid, "technique", [{"key": "silent_feet", "target": 3}])
        check_prescription_drill(self.uid, pid, "silent_feet", "2026-06-11")
        check_prescription_drill(self.uid, pid, "silent_feet", "2026-06-12")
        rows = get_prescription_checkoffs(self.uid, pid)
        self.assertEqual(len(rows), 2)

    def test_complete_prescription_clears_active(self):
        pid = create_prescription(self.uid, "technique", [{"key": "silent_feet", "target": 3}])
        complete_prescription(pid)
        self.assertIsNone(get_active_prescription(self.uid))


class GetPrescriptionEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rx_get_test@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.uid = _user_id(self.email)
        self.client = TestClient(app)

    def tearDown(self):
        _cleanup_user(self.email)

    def _auth(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_new_user_has_no_prescription(self):
        r = self.client.get("/api/me/prescription?date=2026-06-11", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIsNone(body["gap_axis"])
        self.assertIsNone(body["prescription"])

    def test_auto_generates_block_for_gap(self):
        _seed_technique_gap(self.uid)
        r = self.client.get("/api/me/prescription?date=2026-06-11", headers=self._auth())
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["gap_axis"], "technique")
        presc = body["prescription"]
        self.assertIsNotNone(presc)
        self.assertEqual(presc["axis"], "technique")
        self.assertEqual(len(presc["drills"]), 3)
        for d in presc["drills"]:
            self.assertIn("done", d)
            self.assertEqual(d["done"], 0)
        self.assertEqual(presc["progress"]["current"], 0)
        self.assertGreater(presc["progress"]["total"], 0)

    def test_second_fetch_reuses_the_same_active_block(self):
        _seed_technique_gap(self.uid)
        a = self.client.get("/api/me/prescription?date=2026-06-11", headers=self._auth()).json()
        b = self.client.get("/api/me/prescription?date=2026-06-11", headers=self._auth()).json()
        self.assertEqual(a["prescription"]["id"], b["prescription"]["id"])

    def test_requires_auth(self):
        r = TestClient(app).get("/api/me/prescription?date=2026-06-11")
        self.assertIn(r.status_code, (401, 403))


class CheckPrescriptionEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.email = "rx_check_test@coretriage.local"
        _cleanup_user(self.email)
        self.token = _register_and_login(self.email)
        self.uid = _user_id(self.email)
        self.client = TestClient(app)
        _seed_technique_gap(self.uid)  # auto block on first fetch
        self.presc = self.client.get(
            "/api/me/prescription?date=2026-06-11", headers=self._auth()
        ).json()["prescription"]

    def tearDown(self):
        _cleanup_user(self.email)

    def _auth(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_check_increments_progress_and_is_idempotent(self):
        key = self.presc["drills"][0]["key"]
        r1 = self.client.post("/api/prescriptions/check",
                              json={"drill_key": key, "date": "2026-06-11"},
                              headers=self._auth())
        self.assertEqual(r1.status_code, 200, r1.text)
        body1 = r1.json()
        self.assertFalse(body1["completed"])
        self.assertEqual(body1["prescription"]["progress"]["current"], 1)
        # Same drill, same day -> no double count.
        r2 = self.client.post("/api/prescriptions/check",
                              json={"drill_key": key, "date": "2026-06-11"},
                              headers=self._auth())
        self.assertEqual(r2.json()["prescription"]["progress"]["current"], 1)

    def test_block_completes_at_100_percent(self):
        # 3 drills x target 3 = 9 checkoffs across 3 distinct days.
        days = ["2026-06-11", "2026-06-12", "2026-06-13"]
        last = None
        for d in self.presc["drills"]:
            for day in days:
                last = self.client.post("/api/prescriptions/check",
                                        json={"drill_key": d["key"], "date": day},
                                        headers=self._auth()).json()
        self.assertTrue(last["completed"])
        self.assertEqual(last["xp"], 250)
        self.assertEqual(last["prescription"]["progress"]["pct"], 100)
        # The completed block is no longer active; a new gap may auto-generate.
        again = self.client.get("/api/me/prescription?date=2026-06-14",
                                headers=self._auth()).json()
        if again["prescription"]:
            self.assertNotEqual(again["prescription"]["id"], self.presc["id"])

    def test_rejects_drill_not_in_block(self):
        r = self.client.post("/api/prescriptions/check",
                             json={"drill_key": "not_a_real_drill", "date": "2026-06-11"},
                             headers=self._auth())
        self.assertEqual(r.status_code, 400, r.text)


def _make_coach(email: str) -> str:
    """Register a user and promote them to the coach role; return bearer token."""
    token = _register_and_login(email)
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("UPDATE users SET role = 'coach' WHERE email = %s;", (email,))
        conn.commit()
    return token


class CoachPrescriptionEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.client_email = "rx_client_test@coretriage.local"
        self.coach_email = "rx_coach_test@coretriage.local"
        _cleanup_user(self.client_email)
        _cleanup_user(self.coach_email)
        self.client_token = _register_and_login(self.client_email)
        self.client_uid = _user_id(self.client_email)
        self.coach_token = _make_coach(self.coach_email)

    def tearDown(self):
        _cleanup_user(self.client_email)
        _cleanup_user(self.coach_email)

    def _coach_auth(self):
        return {"Authorization": f"Bearer {self.coach_token}"}

    def _client_auth(self):
        return {"Authorization": f"Bearer {self.client_token}"}

    def test_non_coach_is_forbidden(self):
        r = TestClient(app).get(
            f"/api/admin/coach/clients/{self.client_uid}/prescription",
            headers=self._client_auth(),
        )
        self.assertEqual(r.status_code, 403)

    def test_coach_sees_client_block(self):
        _seed_technique_gap(self.client_uid)
        r = TestClient(app).get(
            f"/api/admin/coach/clients/{self.client_uid}/prescription",
            headers=self._coach_auth(),
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["gap_axis"], "technique")

    def test_coach_assigns_a_block(self):
        r = TestClient(app).post(
            f"/api/admin/coach/clients/{self.client_uid}/prescription",
            json={"axis": "mobility", "drill_keys": ["shoulder_cars", "deep_squat_hip_opener", "wrist_loading_prep"]},
            headers=self._coach_auth(),
        )
        self.assertEqual(r.status_code, 200, r.text)
        presc = r.json()["prescription"]
        self.assertEqual(presc["axis"], "mobility")
        self.assertEqual(presc["source"], "coach")
        # The client now sees the coach-assigned block.
        seen = TestClient(app).get(
            "/api/me/prescription?date=2026-06-11", headers=self._client_auth()
        ).json()["prescription"]
        self.assertEqual(seen["axis"], "mobility")
        self.assertEqual(seen["source"], "coach")


if __name__ == "__main__":
    unittest.main()
