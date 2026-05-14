"""Tests for the leaderboard seed climbers feature.
Covers: schema migration, persona definitions, activity generator,
idempotency, auth block, leaderboard surfacing, and cleanup."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect, init_db  # noqa: E402


class SchemaMigrationTests(unittest.TestCase):
    """Ensure the migrations needed for seed climbers run cleanly."""

    @classmethod
    def setUpClass(cls):
        # Make sure migrations have run (idempotent).
        init_db()

    def test_users_has_is_seed_column(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT data_type, column_default, is_nullable
                       FROM information_schema.columns
                       WHERE table_name = 'users' AND column_name = 'is_seed';"""
                )
                row = cur.fetchone()
                self.assertIsNotNone(row, "users.is_seed column missing")
                data_type, default, nullable = row
                self.assertEqual(data_type, "boolean")
                self.assertEqual(nullable, "NO")
                # Default should resolve to FALSE
                self.assertIn("false", (default or "").lower(),
                              f"expected FALSE default, got {default!r}")

    def test_training_logs_has_user_date_unique_index(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT indexname, indexdef FROM pg_indexes
                       WHERE tablename = 'training_logs'
                         AND indexname = 'training_logs_user_date_idx';"""
                )
                rows = cur.fetchall()
                self.assertEqual(len(rows), 1,
                                 "expected a UNIQUE index named training_logs_user_date_idx")
                self.assertIn("UNIQUE", rows[0][1].upper())
