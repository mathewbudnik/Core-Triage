"""Daily cron entrypoint for seed climbers.

Run with:
    .venv/bin/python -m scripts.seed_climbers_tick

For each seed persona, probabilistically inserts ONE training_log for today.
Idempotent: UNIQUE(user_id, date) on training_logs makes re-runs a no-op.

Schedule via Railway scheduled tasks (or any cron):
    0 6 * * *   .venv/bin/python -m scripts.seed_climbers_tick

See docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md
"""
from __future__ import annotations

import sys
import os
from datetime import date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect
from src.seed_climbers import SEED_PERSONAS, generate_today_session


def main() -> None:
    today = date.today()
    inserted = 0
    skipped_rest = 0

    with _connect() as conn:
        with conn.cursor() as cur:
            for i, persona in enumerate(SEED_PERSONAS, start=1):
                email = f"seed+{i}@coretriage.local"

                # Look up user_id; skip if persona row doesn't exist yet
                # (this can happen if tick runs before init).
                cur.execute("SELECT id FROM users WHERE email = %s AND is_seed = TRUE;",
                            (email,))
                row = cur.fetchone()
                if row is None:
                    continue
                user_id = row[0]

                session = generate_today_session(persona, today=today)
                if session is None:
                    skipped_rest += 1
                    continue

                cur.execute(
                    """
                    INSERT INTO training_logs
                        (user_id, date, session_type, duration_min, intensity, grades_sent, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, date) DO NOTHING;
                    """,
                    (user_id, session["date"], session["session_type"],
                     session["duration_min"], session["intensity"],
                     session["grades_sent"], session["notes"]),
                )
                if cur.rowcount > 0:
                    inserted += 1

        conn.commit()

    print(f"Seed climbers tick complete: {inserted} new logs, {skipped_rest} rest days.")


if __name__ == "__main__":
    main()
