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
