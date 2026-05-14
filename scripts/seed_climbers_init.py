"""One-time idempotent seed for leaderboard synthetic climbers.

Run with:
    .venv/bin/python -m scripts.seed_climbers_init

Safe to re-run: skips users that already exist (by email) and skips
training_logs that already exist (by user_id+date UNIQUE INDEX).

See docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md
"""
from __future__ import annotations

import secrets
import sys
import os
from datetime import datetime, timedelta

# Make the project root importable when running as `python -m`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import bcrypt

from database import _connect, init_db
from src.seed_climbers import SEED_PERSONAS, generate_initial_history


def _unloginable_hash() -> str:
    """A real bcrypt hash of random bytes nobody can know."""
    return bcrypt.hashpw(secrets.token_bytes(32), bcrypt.gensalt(rounds=4)).decode()


def main() -> None:
    # Ensure migrations are in place before we insert anything.
    init_db()

    inserted_users = 0
    inserted_logs = 0

    with _connect() as conn:
        with conn.cursor() as cur:
            for i, persona in enumerate(SEED_PERSONAS, start=1):
                email = f"seed+{i}@coretriage.local"
                pw_hash = _unloginable_hash()
                created_at = datetime.utcnow() - timedelta(days=30)

                # 1. Insert user (ON CONFLICT email DO NOTHING)
                cur.execute(
                    """
                    INSERT INTO users (
                        email, password_hash, is_seed, display_name,
                        avatar_icon, avatar_color, leaderboard_private, tier,
                        disclaimer_accepted, disclaimer_accepted_at,
                        email_verified, created_at
                    )
                    VALUES (%s, %s, TRUE, %s, %s, %s, FALSE, 'free',
                            TRUE, NOW(), FALSE, %s)
                    ON CONFLICT (email) DO NOTHING
                    RETURNING id;
                    """,
                    (email, pw_hash, persona.handle, persona.avatar_icon,
                     persona.avatar_color, created_at),
                )
                row = cur.fetchone()
                if row is None:
                    # User already exists — look up id
                    cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
                    user_id = cur.fetchone()[0]
                else:
                    user_id = row[0]
                    inserted_users += 1

                # 2. Insert athlete_profile (ON CONFLICT user_id DO NOTHING)
                cur.execute(
                    """
                    INSERT INTO athlete_profiles (user_id, experience_level)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id) DO NOTHING;
                    """,
                    (user_id, persona.cohort),
                )

                # 3. Backfill training_logs (ON CONFLICT user_id+date DO NOTHING)
                history = generate_initial_history(persona, days=30)
                for row in history:
                    cur.execute(
                        """
                        INSERT INTO training_logs
                            (user_id, date, session_type, duration_min, intensity, grades_sent, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, date) DO NOTHING;
                        """,
                        (user_id, row["date"], row["session_type"],
                         row["duration_min"], row["intensity"],
                         row["grades_sent"], row["notes"]),
                    )
                    if cur.rowcount > 0:
                        inserted_logs += 1

        conn.commit()

    print(f"Seed climbers init complete: {inserted_users} new users, {inserted_logs} new training_logs.")


if __name__ == "__main__":
    main()
