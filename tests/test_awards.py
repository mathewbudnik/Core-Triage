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
