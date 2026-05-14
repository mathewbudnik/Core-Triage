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

    def test_seed_progression_table_exists(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT column_name, data_type FROM information_schema.columns
                       WHERE table_name = 'seed_progression'
                       ORDER BY ordinal_position;"""
                )
                cols = {name: dtype for name, dtype in cur.fetchall()}
                self.assertIn("user_id", cols)
                self.assertIn("intensity_bump", cols)
                self.assertIn("extra_grades", cols)
                self.assertIn("last_progressed_at", cols)
                self.assertEqual(cols["intensity_bump"], "real")


class PersonaDefinitionTests(unittest.TestCase):
    """The 10 personas are the contract between the spec and the runtime."""

    def test_exactly_10_personas(self):
        from src.seed_climbers import SEED_PERSONAS
        self.assertEqual(len(SEED_PERSONAS), 10)

    def test_cohort_distribution_3_3_3_1(self):
        from src.seed_climbers import SEED_PERSONAS
        cohorts = [p.cohort for p in SEED_PERSONAS]
        self.assertEqual(cohorts.count("beginner"), 3)
        self.assertEqual(cohorts.count("intermediate"), 3)
        self.assertEqual(cohorts.count("advanced"), 3)
        self.assertEqual(cohorts.count("elite"), 1)

    def test_handles_unique(self):
        from src.seed_climbers import SEED_PERSONAS
        handles = [p.handle for p in SEED_PERSONAS]
        self.assertEqual(len(handles), len(set(handles)), "handles must be unique")

    def test_handles_dont_match_pattern_style(self):
        """No 'SnowyClimber42' / 'Crusher99' style names."""
        from src.seed_climbers import SEED_PERSONAS
        import re
        # Reject anything ending in 2+ digits or containing common climbing words
        bad_endings = re.compile(r"\d{2,}$")
        bad_words = ("Climber", "Crusher", "Sender", "Beast", "King", "Queen")
        for p in SEED_PERSONAS:
            self.assertIsNone(bad_endings.search(p.handle), f"{p.handle} ends in digits")
            for w in bad_words:
                self.assertNotIn(w, p.handle, f"{p.handle} contains '{w}'")

    def test_weekly_hours_capped_below_9(self):
        """'Not too competitive' — even the elite seed maxes around 8 hrs/week."""
        from src.seed_climbers import SEED_PERSONAS
        for p in SEED_PERSONAS:
            # avg_session_min × sessions_per_week / 60 ≤ 9
            avg_session_min = (p.session_min_range[0] + p.session_min_range[1]) / 2
            avg_hrs = (p.sessions_per_week * avg_session_min) / 60
            self.assertLessEqual(avg_hrs, 9.0,
                                 f"{p.handle} avg ~{avg_hrs:.1f} hrs/week exceeds 9-hr cap")

    def test_grade_pools_cohort_appropriate(self):
        """Beginner has no V5+; elite has no V0/V1."""
        from src.seed_climbers import SEED_PERSONAS
        for p in SEED_PERSONAS:
            if p.cohort == "beginner":
                for g in p.grade_pool:
                    if g.startswith("V"):
                        self.assertLess(int(g[1:]), 4, f"beginner {p.handle} has hard grade {g}")
            elif p.cohort == "elite":
                for g in p.grade_pool:
                    if g.startswith("V"):
                        self.assertGreaterEqual(int(g[1:]), 7, f"elite {p.handle} has easy grade {g}")
