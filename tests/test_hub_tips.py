"""Tests for the Hub tip card system."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect, init_db  # noqa: E402


class HubTipsSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_hub_tips_table_columns(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT column_name, data_type
                       FROM information_schema.columns
                       WHERE table_name = 'hub_tips'
                       ORDER BY ordinal_position;"""
                )
                cols = cur.fetchall()
        names = [c[0] for c in cols]
        for required in ("id", "user_id", "date", "kind", "headline", "body",
                         "cta_label", "cta_route", "color", "dismissed_at", "created_at"):
            self.assertIn(required, names, f"hub_tips.{required} missing")

    def test_hub_tips_unique_user_date(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT 1 FROM information_schema.table_constraints
                       WHERE table_name = 'hub_tips'
                       AND constraint_type = 'UNIQUE';"""
                )
                self.assertIsNotNone(cur.fetchone(), "UNIQUE (user_id, date) missing")


from database import (  # noqa: E402
    get_hub_tip,
    insert_hub_tip,
    dismiss_hub_tip,
)


def _make_user(email: str = "hub_tips_test@coretriage.local") -> int:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) "
                "ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id;",
                (email, "x"),
            )
            uid = cur.fetchone()[0]
            cur.execute("DELETE FROM hub_tips WHERE user_id = %s;", (uid,))
        conn.commit()
    return uid


class HubTipsHelpersTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM hub_tips WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_get_returns_none_when_missing(self):
        self.assertIsNone(get_hub_tip(self.uid, "2026-05-17"))

    def test_insert_then_get(self):
        insert_hub_tip(self.uid, "2026-05-17", kind="overtraining",
                       headline="Take tomorrow off.", body="Five days on...",
                       cta_label="Open in Chat", cta_route="/chat",
                       color="#f7b03a")
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertIsNotNone(row)
        self.assertEqual(row["kind"], "overtraining")
        self.assertEqual(row["headline"], "Take tomorrow off.")
        self.assertEqual(row["color"], "#f7b03a")
        self.assertIsNone(row["dismissed_at"])

    def test_insert_is_idempotent(self):
        insert_hub_tip(self.uid, "2026-05-17", kind="overtraining",
                       headline="A", body="b", cta_label=None, cta_route=None, color="#000")
        insert_hub_tip(self.uid, "2026-05-17", kind="plateau_4w",
                       headline="B", body="b", cta_label=None, cta_route=None, color="#000")
        # Second insert is no-op via ON CONFLICT
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertEqual(row["kind"], "overtraining")

    def test_dismiss_sets_timestamp(self):
        insert_hub_tip(self.uid, "2026-05-17", kind="overtraining",
                       headline="A", body="b", cta_label=None, cta_route=None, color="#000")
        dismiss_hub_tip(self.uid, "2026-05-17")
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertIsNotNone(row["dismissed_at"])

    def test_dismiss_without_existing_row_inserts_sentinel(self):
        """If no tip row exists (e.g. user hits dismiss before fetching), the
        dismiss should still record so future loads short-circuit."""
        dismiss_hub_tip(self.uid, "2026-05-17")
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertIsNotNone(row, "dismiss should insert a sentinel row")
        self.assertIsNotNone(row["dismissed_at"])


from datetime import date, timedelta  # noqa: E402
from database import log_training, _connect  # noqa: E402
from src.hub_tips import detect_pattern  # noqa: E402


def _seed_training_log(uid: int, d: str, *, intensity: int = 7, climbs: dict = None):
    log_training(uid, {
        "date": d,
        "session_type": "bouldering",
        "duration_min": 60,
        "intensity": intensity,
        "climbs": climbs or {},
    })


def _clear_user_state(uid: int):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (uid,))
            cur.execute("DELETE FROM hub_tips WHERE user_id = %s;", (uid,))
            cur.execute("DELETE FROM sessions WHERE user_id = %s;", (uid,))
        conn.commit()


class PatternDetectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user(email="pattern_test@coretriage.local")

    def tearDown(self):
        _clear_user_state(self.uid)

    def test_no_match_returns_none(self):
        kind, ctx = detect_pattern(self.uid, "2026-05-17")
        self.assertIsNone(kind)
        self.assertIsNone(ctx)

    def test_overtraining_fires_at_5_day_streak(self):
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        kind, ctx = detect_pattern(self.uid, "2026-05-17")
        self.assertEqual(kind, "overtraining")
        self.assertEqual(ctx["streak"], 5)

    def test_overtraining_does_not_fire_at_4_day_streak(self):
        start = date(2026, 5, 14)
        for i in range(4):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        kind, _ = detect_pattern(self.uid, "2026-05-17")
        # 4 days isn't enough; plateau/return won't fire here either
        self.assertNotEqual(kind, "overtraining")

    def test_return_break_7d_fires_at_7_days_inactive(self):
        _seed_training_log(self.uid, "2026-05-10")  # 7 days ago from May 17
        kind, ctx = detect_pattern(self.uid, "2026-05-17")
        self.assertEqual(kind, "return_break_7d")
        self.assertEqual(ctx["days"], 7)

    def test_return_break_30d_fires_at_30_days_inactive(self):
        _seed_training_log(self.uid, "2026-04-17")  # 30 days ago
        kind, ctx = detect_pattern(self.uid, "2026-05-17")
        self.assertEqual(kind, "return_break_30d")

    def test_active_rehab_outranks_overtraining(self):
        """Rehab is priority 1; even with a 5-day streak, rehab tip wins."""
        # Insert an active triage row for a rehab region (Finger)
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO sessions (user_id, injury_area, pain_level, created_at)
                       VALUES (%s, 'Finger', 5, NOW() - INTERVAL '2 days');""",
                    (self.uid,),
                )
            conn.commit()
        # And log a 5-day streak
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        kind, _ = detect_pattern(self.uid, "2026-05-17")
        self.assertEqual(kind, "active_rehab")


from src.hub_tips import generate_tip, TIP_META, FALLBACK_COPY  # noqa: E402


class _FakeOpenAIClient:
    """Stub openai client. Returns canned JSON or raises on demand."""
    def __init__(self, response_json: str = None, raise_exc: Exception = None):
        self._json = response_json
        self._raise = raise_exc
        self.chat = self
        self.completions = self
    def create(self, **kwargs):
        if self._raise:
            raise self._raise
        class _Choice:
            def __init__(self, content):
                self.message = type("M", (), {"content": content})()
        class _R:
            def __init__(self, content):
                self.choices = [_Choice(content)]
        return _R(self._json)


class GenerateTipTests(unittest.TestCase):
    def test_each_kind_has_metadata_and_fallback(self):
        for kind in ("active_rehab", "overtraining", "plateau_4w", "plateau_8w",
                     "return_break_7d", "return_break_14d", "return_break_30d"):
            self.assertIn(kind, TIP_META, f"TIP_META missing {kind}")
            self.assertIn(kind, FALLBACK_COPY, f"FALLBACK_COPY missing {kind}")
            self.assertIn("color", TIP_META[kind])

    def test_generate_returns_openai_content_when_json_valid(self):
        client = _FakeOpenAIClient(response_json='{"headline":"Take it easy.","body":"Rest tomorrow."}')
        tip = generate_tip("overtraining", {"streak": 5, "hardest_send": "V5"}, client)
        self.assertEqual(tip["headline"], "Take it easy.")
        self.assertEqual(tip["body"], "Rest tomorrow.")
        self.assertEqual(tip["cta_label"], TIP_META["overtraining"]["cta_label"])
        self.assertEqual(tip["color"], TIP_META["overtraining"]["color"])

    def test_generate_falls_back_when_openai_raises(self):
        client = _FakeOpenAIClient(raise_exc=RuntimeError("network down"))
        tip = generate_tip("overtraining", {"streak": 5, "hardest_send": "V5"}, client)
        self.assertEqual(tip["headline"], FALLBACK_COPY["overtraining"]["headline"])
        self.assertEqual(tip["body"], FALLBACK_COPY["overtraining"]["body"])

    def test_generate_falls_back_when_openai_returns_invalid_json(self):
        client = _FakeOpenAIClient(response_json="not json at all")
        tip = generate_tip("overtraining", {"streak": 5, "hardest_send": "V5"}, client)
        self.assertEqual(tip["headline"], FALLBACK_COPY["overtraining"]["headline"])

    def test_generate_with_none_client_uses_fallback(self):
        tip = generate_tip("overtraining", {"streak": 5, "hardest_send": "V5"}, None)
        self.assertEqual(tip["headline"], FALLBACK_COPY["overtraining"]["headline"])


from src.hub_tips import get_or_create_tip, dismiss_tip  # noqa: E402


class OrchestrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user(email="orchestration_test@coretriage.local")

    def tearDown(self):
        _clear_user_state(self.uid)

    def test_no_match_returns_none_and_inserts_sentinel(self):
        client = _FakeOpenAIClient(response_json='{"headline":"x","body":"y"}')
        tip = get_or_create_tip(self.uid, "2026-05-17", client)
        self.assertIsNone(tip)
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertIsNotNone(row, "sentinel row should be inserted on no-match")
        self.assertEqual(row["kind"], "none")

    def test_overtraining_match_returns_personalized_tip(self):
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        client = _FakeOpenAIClient(response_json='{"headline":"Rest up.","body":"Your fingers need it."}')
        tip = get_or_create_tip(self.uid, "2026-05-17", client)
        self.assertIsNotNone(tip)
        self.assertEqual(tip["kind"], "overtraining")
        self.assertEqual(tip["headline"], "Rest up.")
        self.assertEqual(tip["color"], "#f7b03a")

    def test_subsequent_calls_return_cached_tip_without_calling_openai(self):
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        client = _FakeOpenAIClient(response_json='{"headline":"First.","body":"Body."}')
        first = get_or_create_tip(self.uid, "2026-05-17", client)
        # Swap client to one that would raise — proves we didn't hit it
        broken = _FakeOpenAIClient(raise_exc=RuntimeError("must not call"))
        second = get_or_create_tip(self.uid, "2026-05-17", broken)
        self.assertEqual(second["headline"], first["headline"])

    def test_dismissed_tip_returns_none_on_subsequent_load(self):
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        client = _FakeOpenAIClient(response_json='{"headline":"x","body":"y"}')
        get_or_create_tip(self.uid, "2026-05-17", client)
        dismiss_tip(self.uid, "2026-05-17")
        tip = get_or_create_tip(self.uid, "2026-05-17", client)
        self.assertIsNone(tip)
