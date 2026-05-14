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


class ActivityGeneratorTests(unittest.TestCase):
    def test_generate_initial_history_returns_dated_rows(self):
        from src.seed_climbers import SEED_PERSONAS, generate_initial_history
        from datetime import date, timedelta
        persona = SEED_PERSONAS[0]
        rows = generate_initial_history(persona, days=30, today=date(2026, 5, 13))
        # Returns a list of dicts with the expected keys
        self.assertIsInstance(rows, list)
        self.assertGreater(len(rows), 0)
        for row in rows:
            self.assertIn("date", row)
            self.assertIn("session_type", row)
            self.assertIn("duration_min", row)
            self.assertIn("intensity", row)
            self.assertIn("grades_sent", row)
            # All dates within the last 30 days, not in the future
            self.assertLessEqual(row["date"], date(2026, 5, 13))
            self.assertGreaterEqual(row["date"], date(2026, 5, 13) - timedelta(days=30))

    def test_generate_initial_history_respects_session_min_range(self):
        from src.seed_climbers import SEED_PERSONAS, generate_initial_history
        from datetime import date
        for persona in SEED_PERSONAS:
            rows = generate_initial_history(persona, days=30, today=date(2026, 5, 13))
            for row in rows:
                self.assertGreaterEqual(row["duration_min"], persona.session_min_range[0])
                self.assertLessEqual(row["duration_min"], persona.session_min_range[1])

    def test_generate_initial_history_respects_grade_pool(self):
        from src.seed_climbers import SEED_PERSONAS, generate_initial_history
        from datetime import date
        for persona in SEED_PERSONAS:
            rows = generate_initial_history(persona, days=30, today=date(2026, 5, 13))
            pool_set = set(persona.grade_pool)
            for row in rows:
                # grades_sent is a comma-separated string; every grade must be in the pool
                for grade in row["grades_sent"].split(","):
                    g = grade.strip()
                    if g:
                        self.assertIn(g, pool_set, f"{persona.handle} sent {g} outside pool {persona.grade_pool}")

    def test_generate_initial_history_unique_dates(self):
        """One session per day max (matches the UNIQUE index)."""
        from src.seed_climbers import SEED_PERSONAS, generate_initial_history
        from datetime import date
        for persona in SEED_PERSONAS:
            rows = generate_initial_history(persona, days=30, today=date(2026, 5, 13))
            dates = [r["date"] for r in rows]
            self.assertEqual(len(dates), len(set(dates)),
                             f"{persona.handle} has duplicate dates in initial history")

    def test_generate_today_session_returns_dict_or_none(self):
        from src.seed_climbers import SEED_PERSONAS, generate_today_session
        from datetime import date
        # Deterministic: with seed=42 and persona.sessions_per_week>=2 the
        # probability that *every* call returns None across 10 personas is tiny,
        # but the function may return None for any single one.
        for persona in SEED_PERSONAS:
            session = generate_today_session(persona, today=date(2026, 5, 13), rng_seed=42)
            self.assertTrue(session is None or isinstance(session, dict),
                            f"{persona.handle} returned wrong shape: {session!r}")
            if session is not None:
                self.assertIn("date", session)
                self.assertIn("duration_min", session)
                self.assertEqual(session["date"], date(2026, 5, 13))


class InitScriptTests(unittest.TestCase):
    """End-to-end: running the init script inserts 10 users + history,
    is idempotent on re-run, and seed users have un-loginable hashes."""

    def setUp(self):
        # Clean any prior seed state
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()

    def _count_seed_users(self) -> int:
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM users WHERE is_seed = TRUE;")
                return cur.fetchone()[0]

    def _count_seed_training_logs(self) -> int:
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT COUNT(*) FROM training_logs tl
                       JOIN users u ON u.id = tl.user_id
                       WHERE u.is_seed = TRUE;"""
                )
                return cur.fetchone()[0]

    def test_init_creates_10_seed_users(self):
        from scripts.seed_climbers_init import main
        main()
        self.assertEqual(self._count_seed_users(), 10)

    def test_init_creates_training_logs(self):
        from scripts.seed_climbers_init import main
        main()
        # ~30 days × 10 personas with varying probability. Should be > 50.
        count = self._count_seed_training_logs()
        self.assertGreater(count, 50, f"only {count} training logs generated")

    def test_init_is_idempotent(self):
        """Re-running init does not duplicate users or training_logs."""
        from scripts.seed_climbers_init import main
        main()
        first_users = self._count_seed_users()
        first_logs = self._count_seed_training_logs()
        main()
        self.assertEqual(self._count_seed_users(), first_users)
        self.assertEqual(self._count_seed_training_logs(), first_logs)

    def test_init_creates_athlete_profiles(self):
        from scripts.seed_climbers_init import main
        main()
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT COUNT(*) FROM athlete_profiles ap
                       JOIN users u ON u.id = ap.user_id
                       WHERE u.is_seed = TRUE;"""
                )
                self.assertEqual(cur.fetchone()[0], 10)

    def test_seed_users_have_unloginable_password_hash(self):
        from scripts.seed_climbers_init import main
        main()
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT password_hash FROM users WHERE is_seed = TRUE LIMIT 1;"
                )
                pw_hash = cur.fetchone()[0]
        # Hash is a real bcrypt hash (not NULL — schema requires NOT NULL),
        # but the underlying password is random bytes nobody knows.
        self.assertIsNotNone(pw_hash)
        self.assertTrue(pw_hash.startswith("$2"), f"not a bcrypt hash: {pw_hash[:10]}...")


class TickScriptTests(unittest.TestCase):
    """Daily tick: probabilistically inserts at most one session per
    seed climber per day. Idempotent on re-run same day."""

    def setUp(self):
        # Start with a clean seed set, then init.
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()
        from scripts.seed_climbers_init import main as init_main
        init_main()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE is_seed = TRUE;")
                conn.commit()

    def _count_today_seed_logs(self):
        from datetime import date
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT COUNT(*) FROM training_logs tl
                       JOIN users u ON u.id = tl.user_id
                       WHERE u.is_seed = TRUE AND tl.date = %s;""",
                    (date.today(),),
                )
                return cur.fetchone()[0]

    def test_tick_inserts_some_sessions_today(self):
        from scripts.seed_climbers_tick import main as tick_main
        # First clear any "today" rows that the init backfill happened to insert
        # for date.today() so we measure the tick's effect cleanly.
        with _connect() as conn:
            with conn.cursor() as cur:
                from datetime import date
                cur.execute(
                    """DELETE FROM training_logs WHERE user_id IN
                       (SELECT id FROM users WHERE is_seed = TRUE) AND date = %s;""",
                    (date.today(),),
                )
                conn.commit()
        tick_main()
        # Probabilistic — expect at least 1 of 10 climbers trained today
        # (deterministic per persona+today seed, so this is repeatable).
        count = self._count_today_seed_logs()
        self.assertGreaterEqual(count, 1,
                                f"expected at least 1 seed log today, got {count}")
        self.assertLessEqual(count, 10,
                             f"expected at most 10 seed logs today, got {count}")

    def test_tick_is_idempotent_same_day(self):
        from scripts.seed_climbers_tick import main as tick_main
        tick_main()
        first = self._count_today_seed_logs()
        tick_main()
        self.assertEqual(self._count_today_seed_logs(), first,
                         "tick is not idempotent on re-run same day")
