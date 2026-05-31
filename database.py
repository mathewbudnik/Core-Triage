"""
Postgres persistence helpers for CoreTriage.

Core:
- init_db(): create tables and run migrations
- create_user(email, password_hash): insert a user and return id
- get_user_by_email(email): fetch user row (id, email, password_hash, failed_login_attempts, locked_until, disclaimer_accepted)
- get_user_by_id(user_id): fetch (id, email, disclaimer_accepted) for current-user enrichment
- save_session(row): insert a session and return id
- get_session(id): fetch a single session by id
- list_sessions(user_id, limit): fetch recent sessions for a user
- delete_session(id, user_id): remove a session owned by user

Auth security:
- increment_failed_login(email): bump counter; lock for 15 min after 5 attempts
- reset_failed_login(user_id): clear counter and lockout on successful login
- update_last_login(user_id): stamp last_login timestamp
- accept_disclaimer(user_id): mark disclaimer accepted with timestamp
- log_security_event(event_type, ip_address, email_attempted): insert into security_log
- get_user_tier(user_id): return 'free' | 'core' | 'pro'
- set_user_tier(user_id, tier): admin helper to promote a user

Training/Coaching:
- save_profile(user_id, data): upsert athlete profile
- get_profile(user_id): fetch athlete profile dict
- save_plan(user_id, plan): deactivate old plan, insert new one, return id
- get_active_plan(user_id): fetch active training plan dict
- log_training(user_id, data): insert a training log entry, return id
- get_training_logs(user_id, limit): fetch recent training log entries
"""

import json
import os
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC
from typing import Any

from psycopg2 import pool

_pool: pool.ThreadedConnectionPool | None = None


def _db_params() -> dict[str, Any]:
    return {
        "host": os.getenv("CORETRIAGE_DB_HOST", "localhost"),
        "port": int(os.getenv("CORETRIAGE_DB_PORT", "5432")),
        "dbname": os.getenv("CORETRIAGE_DB_NAME", "coretriage_db"),
        "user": os.getenv("CORETRIAGE_DB_USER", "coretriage"),
        "password": os.getenv("CORETRIAGE_DB_PASSWORD", ""),
    }


def _get_pool() -> pool.ThreadedConnectionPool:
    global _pool
    if _pool is None or _pool.closed:
        _pool = pool.ThreadedConnectionPool(minconn=1, maxconn=10, **_db_params())
    return _pool


@contextmanager
def _connect() -> Generator:
    """Borrow a connection from the pool, auto-rollback on error, always return it."""
    p = _get_pool()
    conn = p.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        p.putconn(conn)


def _add_column_if_missing(cur, table: str, column: str, definition: str) -> None:
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s;
        """,
        (table, column),
    )
    if not cur.fetchone():
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition};")


def init_db() -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            # ── Core tables ────────────────────────────────────────────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    injury_area TEXT NOT NULL,
                    pain_level INT,
                    pain_type TEXT,
                    onset TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )

            # ── Users migrations ───────────────────────────────────────────
            _add_column_if_missing(cur, "sessions", "user_id",
                "INT REFERENCES users(id) ON DELETE CASCADE")
            # Full intake payload stored alongside the basic answer fields so
            # the History tab can re-derive the diagnosis (bucket list +
            # severity + plan) at view time. Optional — old rows have NULL
            # and the API falls back to the basic fields.
            _add_column_if_missing(cur, "sessions", "intake_json",
                "JSONB NULL")
            _add_column_if_missing(cur, "users", "failed_login_attempts",
                "INTEGER DEFAULT 0")
            _add_column_if_missing(cur, "users", "locked_until",
                "TIMESTAMPTZ NULL")
            _add_column_if_missing(cur, "users", "disclaimer_accepted",
                "BOOLEAN DEFAULT FALSE")
            _add_column_if_missing(cur, "users", "disclaimer_accepted_at",
                "TIMESTAMPTZ NULL")
            _add_column_if_missing(cur, "users", "last_login",
                "TIMESTAMPTZ NULL")
            _add_column_if_missing(cur, "users", "tier",
                "TEXT DEFAULT 'free'")
            _add_column_if_missing(cur, "users", "role",
                "TEXT DEFAULT 'user'")
            # Email verification
            _add_column_if_missing(cur, "users", "email_verified",
                "BOOLEAN DEFAULT FALSE")
            _add_column_if_missing(cur, "users", "email_verification_token",
                "TEXT NULL")
            _add_column_if_missing(cur, "users", "email_verification_sent_at",
                "TIMESTAMPTZ NULL")
            # Stripe billing
            _add_column_if_missing(cur, "users", "stripe_customer_id",
                "TEXT NULL")
            _add_column_if_missing(cur, "users", "stripe_subscription_id",
                "TEXT NULL")
            _add_column_if_missing(cur, "users", "subscription_status",
                "TEXT NULL")  # 'active' | 'trialing' | 'past_due' | 'canceled' | NULL
            _add_column_if_missing(cur, "users", "subscription_product",
                "TEXT NULL")  # 'pro' | 'coaching' | NULL
            _add_column_if_missing(cur, "users", "free_chat_used",
                "INT DEFAULT 0")
            # Train tab — leaderboard identity. display_name is what shows
            # in leaderboards; NULL until set (existing users get prompted
            # on next login). leaderboard_private hides the name but keeps
            # the user's stats in the cohort aggregate.
            _add_column_if_missing(cur, "users", "display_name",
                "TEXT NULL")
            _add_column_if_missing(cur, "users", "leaderboard_private",
                "BOOLEAN DEFAULT FALSE")
            # Profile customization — avatar_icon is the preset key (e.g.
            # "flame"); avatar_color overrides the preset's default bg
            # gradient with one of the palette swatches. Both NULL → fall
            # back to the generated initial chip on the frontend.
            _add_column_if_missing(cur, "users", "avatar_icon",
                "TEXT NULL")
            _add_column_if_missing(cur, "users", "avatar_color",
                "TEXT NULL")
            # Train tab — seed climbers (synthetic accounts for leaderboard
            # bootstrap). is_seed=TRUE marks an account that's not a real user;
            # they're excluded from business metrics and visible only on the
            # leaderboard. See docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md.
            _add_column_if_missing(cur, "users", "is_seed",
                "BOOLEAN NOT NULL DEFAULT FALSE")
            cur.execute("CREATE INDEX IF NOT EXISTS users_is_seed_idx ON users (is_seed) WHERE is_seed = TRUE;")
            # Case-insensitive uniqueness on display_name. Allows NULLs
            # (users who haven't set one yet) — partial index.
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS users_display_name_lower_idx
                ON users (LOWER(display_name))
                WHERE display_name IS NOT NULL;
                """
            )

            # Password reset — token is a bcrypt hash of the plaintext token
            # (we send plaintext via email, store only the hash). expires_at
            # bounds reuse risk; consume_password_reset_token() requires both
            # match AND not-expired AND clears the row on use.
            _add_column_if_missing(cur, "users", "password_reset_token_hash",
                "TEXT NULL")
            _add_column_if_missing(cur, "users", "password_reset_expires_at",
                "TIMESTAMPTZ NULL")
            # Per-user OpenAI daily token budget. tokens_today is incremented
            # by the chat endpoint; reset_date is rolled when we cross UTC midnight.
            _add_column_if_missing(cur, "users", "openai_tokens_today",
                "INT NOT NULL DEFAULT 0")
            _add_column_if_missing(cur, "users", "openai_tokens_reset_date",
                "DATE NULL")

            # Foreign key indexes for query performance
            cur.execute(
                "CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS training_logs_user_id_idx ON training_logs (user_id);"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS training_plans_user_id_idx ON training_plans (user_id);"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS security_log_created_at_idx ON security_log (created_at DESC);"
            )

            # ── Security log ───────────────────────────────────────────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS security_log (
                    id SERIAL PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    ip_address TEXT,
                    email_attempted TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )

            # ── Athlete profile ────────────────────────────────────────────
            # Body measurements (height_cm, ape_index_cm) and unit display
            # preference are stored here as the source of truth across the
            # app — used by the Movement Analyzer for body-relative rule
            # calibration AND by training-rec features that benefit from
            # body proportions.
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS athlete_profiles (
                    id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                    experience_level TEXT,
                    years_climbing INT,
                    primary_discipline TEXT,
                    max_grade_boulder TEXT,
                    max_grade_route TEXT,
                    days_per_week INT,
                    session_length_min INT,
                    equipment TEXT[],
                    weaknesses TEXT[],
                    primary_goal TEXT,
                    goal_grade TEXT,
                    height_cm INT,
                    ape_index_cm INT,
                    unit_preference TEXT,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )

            # ── Training plans ─────────────────────────────────────────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS training_plans (
                    id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    name TEXT,
                    phase TEXT,
                    duration_weeks INT,
                    start_date DATE DEFAULT CURRENT_DATE,
                    status TEXT DEFAULT 'active',
                    plan_data JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )

            # ── Training log ───────────────────────────────────────────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS training_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    date DATE DEFAULT CURRENT_DATE,
                    session_type TEXT,
                    duration_min INT,
                    intensity INT,
                    grades_sent TEXT,
                    notes TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )

            # Idempotency support for the seed-climbers daily tick — needed
            # so `INSERT ... ON CONFLICT (user_id, date) DO NOTHING` works.
            #
            # Wrapped in try/except: if real users somehow have legitimate
            # multi-session-per-day rows, the unique index can't be created.
            # In that case we log and continue — the tick will fail with a
            # clear UniqueViolation at runtime, signalling the operator to
            # clean up duplicates manually. Don't crash app startup.
            try:
                cur.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS training_logs_user_date_idx "
                    "ON training_logs (user_id, date);"
                )
            except Exception as e:
                # Common cause: pre-existing (user_id, date) duplicates.
                # Run the SELECT in the comment below to inspect them.
                # SELECT user_id, date, COUNT(*) FROM training_logs
                #   GROUP BY user_id, date HAVING COUNT(*) > 1;
                import logging
                logging.warning(
                    "Could not create training_logs_user_date_idx: %s. "
                    "Seed-climber tick script will fail until duplicates are cleaned.",
                    e,
                )

            # Climb-log feature: structured sends/flashes/projects per grade,
            # stored as JSONB keyed by discipline → grade → counters.
            _add_column_if_missing(
                cur,
                "training_logs",
                "climbs",
                "JSONB NOT NULL DEFAULT '{}'::jsonb",
            )

            # Training-days picker: lowercase weekday names the climber can
            # train on (e.g. ['monday','wednesday','saturday']). Replaces the
            # bare days_per_week count for plan generation — the array length
            # IS the days/week, and each session lands on the i-th day.
            _add_column_if_missing(
                cur,
                "athlete_profiles",
                "training_days",
                "TEXT[]",
            )

            # Body measurements live on the profile so they're shared
            # across features (Movement Analyzer, training rec). Stored
            # as INTEGER centimeters (canonical); the frontend toggles
            # cm/in display via unit_preference but always sends cm.
            _add_column_if_missing(cur, "athlete_profiles", "height_cm",       "INT")
            _add_column_if_missing(cur, "athlete_profiles", "ape_index_cm",    "INT")
            _add_column_if_missing(cur, "athlete_profiles", "unit_preference", "TEXT")

            # Seed-climber progression side table — stores per-seed nudges
            # (intensity bump, extra grades) that accumulate over time so
            # the activity generator can produce gradual improvement.
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS seed_progression (
                    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    intensity_bump REAL NOT NULL DEFAULT 0.0,
                    extra_grades TEXT[] NOT NULL DEFAULT '{}',
                    last_progressed_at TIMESTAMPTZ NULL
                );
                """
            )

            # Awards — milestones earned by the user (first V5, 10-day streak,
            # ×30 sends, etc.). The award engine in main.py runs at log commit
            # and inserts new rows here when predicates unlock.
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS awards (
                    id         SERIAL PRIMARY KEY,
                    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    kind       TEXT NOT NULL,
                    payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
                    earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, kind)
                );
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS awards_user_idx ON awards (user_id);")

            # Hub tip card — one row per user per day; cached AI-personalized
            # coaching tip. See docs/superpowers/specs/2026-05-17-hub-tip-card-design.md.
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS hub_tips (
                    id           SERIAL PRIMARY KEY,
                    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date         DATE NOT NULL,
                    kind         TEXT NOT NULL,
                    headline     TEXT NOT NULL DEFAULT '',
                    body         TEXT NOT NULL DEFAULT '',
                    cta_label    TEXT,
                    cta_route    TEXT,
                    color        TEXT NOT NULL DEFAULT '#94949f',
                    dismissed_at TIMESTAMPTZ NULL,
                    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, date)
                );
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS hub_tips_user_date_idx ON hub_tips (user_id, date);")

            # ── Coach messaging ────────────────────────────────────────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS coach_threads (
                    id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                    status TEXT DEFAULT 'open',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS coach_messages (
                    id SERIAL PRIMARY KEY,
                    thread_id INT REFERENCES coach_threads(id) ON DELETE CASCADE,
                    sender_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )

            # ── Rehab progress (daily checkoff) ────────────────────────────
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS rehab_progress (
                    id             SERIAL PRIMARY KEY,
                    user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    exercise_key   TEXT NOT NULL,
                    region         TEXT NOT NULL,
                    phase          INT NOT NULL,
                    completed_date DATE NOT NULL,
                    completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, exercise_key, completed_date)
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS rehab_progress_user_date_idx
                ON rehab_progress (user_id, completed_date);
                """
            )

            # ── Stripe webhook idempotency ─────────────────────────────────
            # Stripe retries failed deliveries. We dedupe by event_id so we
            # never apply the same subscription state change twice.
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS stripe_webhook_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    received_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
        conn.commit()


# ---------------------------------------------------------------------------
# User helpers
# ---------------------------------------------------------------------------


def create_user(email: str, password_hash: str) -> int:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, password_hash)
                VALUES (%s, %s)
                RETURNING id;
                """,
                (email, password_hash),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    return int(new_id)


def get_user_by_email(email: str) -> tuple[Any, ...] | None:
    """Returns (id, email, password_hash, failed_login_attempts, locked_until, disclaimer_accepted) or None."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT id, email, password_hash,
                       COALESCE(failed_login_attempts, 0),
                       locked_until,
                       COALESCE(disclaimer_accepted, FALSE)
                FROM users WHERE email = %s;
                """,
            (email,),
        )
        return cur.fetchone()


def get_user_by_id(user_id: int) -> tuple[Any, ...] | None:
    """Returns (id, email, disclaimer_accepted, tier) or None — used to enrich /api/auth/me."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT id, email, COALESCE(disclaimer_accepted, FALSE),
                       COALESCE(tier, 'free')
                FROM users WHERE id = %s;
                """,
            (int(user_id),),
        )
        return cur.fetchone()


def increment_failed_login(email: str) -> None:
    """Bump failed_login_attempts. Lock account for 15 min after 5 consecutive failures."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
                    locked_until = CASE
                        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5
                        THEN NOW() + INTERVAL '15 minutes'
                        ELSE locked_until
                    END
                WHERE email = %s;
                """,
                (email,),
            )
        conn.commit()


def reset_failed_login(user_id: int) -> None:
    """Clear lockout state after a successful login."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET failed_login_attempts = 0,
                    locked_until = NULL
                WHERE id = %s;
                """,
                (int(user_id),),
            )
        conn.commit()


def update_last_login(user_id: int) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET last_login = NOW() WHERE id = %s;",
                (int(user_id),),
            )
        conn.commit()


def accept_disclaimer(user_id: int) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET disclaimer_accepted = TRUE,
                    disclaimer_accepted_at = NOW()
                WHERE id = %s;
                """,
                (int(user_id),),
            )
        conn.commit()


def delete_user(user_id: int) -> bool:
    """Delete a user and all data that cascades via FK.

    All tables that reference users(id) use ON DELETE CASCADE (see init_db),
    so a single DELETE here is sufficient: sessions, athlete_profiles,
    training_plans, training_logs, awards, rehab_progress, coach_threads
    (and their messages) all get removed.

    Returns True if a row was deleted, False if user_id didn't exist."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s;", (user_id,))
            deleted = cur.rowcount
        conn.commit()
    return deleted > 0


def log_security_event(event_type: str, ip_address: str, email_attempted: str) -> None:
    try:
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO security_log (event_type, ip_address, email_attempted)
                    VALUES (%s, %s, %s);
                    """,
                    (event_type, ip_address, email_attempted),
                )
            conn.commit()
    except Exception:
        pass  # security logging must never crash the request


# Length of the free trial granted to every new account, in days. Kept here
# so backend gates and the /me serializer share one source of truth.
TRIAL_DAYS = 14


def get_user_tier(user_id: int) -> str:
    """Return the user's *effective* tier — trial-aware.

    Resolution order:
      1. If a paid subscription is active (`subscription_status` == 'active'
         or 'trialing' as Stripe defines it), use the stored tier.
      2. Otherwise, if the account is within its TRIAL_DAYS window from
         `created_at`, treat them as 'pro' so all existing tier gates
         (plan generation, unlimited AI chat, Phase 2/3 rehab, etc.)
         pass during the trial.
      3. Otherwise, return the stored tier (typically 'free' for trial-
         expired accounts).

    All existing `tier == 'pro'` checks throughout the codebase keep
    working without modification — the trial just makes new accounts
    look like paid Pro accounts for 14 days.
    """
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT
                    COALESCE(tier, 'free'),
                    subscription_status,
                    created_at
                FROM users WHERE id = %s;
                """,
            (int(user_id),),
        )
        row = cur.fetchone()
    if not row:
        return "free"
    stored_tier, sub_status, created_at = row
    # Active paying subscriber (or Stripe's "trialing" mid-checkout state) —
    # honor the stored tier directly.
    if sub_status in ("active", "trialing"):
        return str(stored_tier)
    # Free trial window — treat them as Pro so gates pass.
    if created_at is not None:
        from datetime import datetime, timedelta
        now = datetime.now(UTC)
        if now - created_at < timedelta(days=TRIAL_DAYS):
            return "pro"
    return str(stored_tier)


def get_subscription_state(user_id: int) -> dict[str, Any]:
    """Return the user-facing subscription state for the /me payload.

    Shape:
      { state: 'trial' | 'active' | 'expired' | 'coaching',
        days_remaining: int | None,   # only set during trial
        trial_ends_at:  iso str | None }

    Frontend uses this for trial-countdown badges, post-trial banners, and
    upgrade-CTA copy. The numeric tier field stays for backwards-compat with
    existing gating code.
    """
    from datetime import datetime, timedelta
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT
                    subscription_status,
                    subscription_product,
                    created_at
                FROM users WHERE id = %s;
                """,
            (int(user_id),),
        )
        row = cur.fetchone()
    if not row:
        return {"state": "expired", "days_remaining": None, "trial_ends_at": None}
    sub_status, sub_product, created_at = row
    # Coach-tier subscribers always read as 'coaching' regardless of trial.
    if sub_status in ("active", "trialing") and sub_product == "coaching":
        return {"state": "coaching", "days_remaining": None, "trial_ends_at": None}
    if sub_status in ("active", "trialing"):
        return {"state": "active",   "days_remaining": None, "trial_ends_at": None}
    # No paid subscription — figure out trial vs expired.
    if created_at is None:
        return {"state": "expired", "days_remaining": None, "trial_ends_at": None}
    trial_end = created_at + timedelta(days=TRIAL_DAYS)
    now = datetime.now(UTC)
    if now < trial_end:
        delta = trial_end - now
        return {
            "state": "trial",
            "days_remaining": max(1, delta.days + (1 if delta.seconds > 0 else 0)),
            "trial_ends_at": trial_end.isoformat(),
        }
    return {"state": "expired", "days_remaining": 0, "trial_ends_at": trial_end.isoformat()}


def set_user_tier(user_id: int, tier: str) -> None:
    """Admin helper — promote a user to core or pro."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET tier = %s WHERE id = %s;",
                (tier, int(user_id)),
            )
        conn.commit()


def get_user_role(user_id: int) -> str:
    """Return 'user' | 'coach' | 'admin' for the given user."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(role, 'user') FROM users WHERE id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return str(row[0]) if row else "user"


def set_user_role_by_email(email: str, role: str) -> bool:
    """Set a user's role by email. Returns True if a row was updated.
    Used for the one-time COACH_EMAIL → role='coach' seed on startup."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET role = %s WHERE email = %s AND role IS DISTINCT FROM %s;",
                (role, email, role),
            )
            updated = cur.rowcount > 0
        conn.commit()
    return updated


# ── Email verification ─────────────────────────────────────────────────────

def set_email_verification_token(user_id: int, token: str) -> None:
    """Store a verification token + timestamp for the user. Token is a random secret."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET email_verification_token = %s, email_verification_sent_at = NOW() WHERE id = %s;",
                (token, int(user_id)),
            )
        conn.commit()


def verify_email_with_token(token: str) -> int | None:
    """If the token matches an unverified user, mark them verified and return user_id.
    Returns None if no match or already verified. Tokens never expire (kept simple);
    if you want expiration, add an `email_verification_sent_at < NOW() - INTERVAL '24 hours'` clause."""
    if not token:
        return None
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET email_verified = TRUE,
                    email_verification_token = NULL
                WHERE email_verification_token = %s
                  AND email_verified = FALSE
                RETURNING id;
                """,
                (token,),
            )
            row = cur.fetchone()
        conn.commit()
    return int(row[0]) if row else None


def is_email_verified(user_id: int) -> bool:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(email_verified, FALSE) FROM users WHERE id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return bool(row and row[0])


# ── Password reset ──────────────────────────────────────────────────────────

def set_password_reset_token(user_id: int, ttl_minutes: int = 60) -> tuple[str, str]:
    """Generate a fresh password-reset token. Returns (bcrypt_hash, plaintext).

    Plaintext is what we email; bcrypt hash is what we persist."""
    import bcrypt
    import secrets
    from datetime import datetime, timedelta, timezone

    plaintext = secrets.token_urlsafe(32)
    token_hash = bcrypt.hashpw(plaintext.encode(), bcrypt.gensalt(rounds=10)).decode()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET password_reset_token_hash = %s, password_reset_expires_at = %s "
                "WHERE id = %s;",
                (token_hash, expires_at, user_id),
            )
        conn.commit()
    return token_hash, plaintext


def consume_password_reset_token(plaintext: str, new_password_hash: str) -> int | None:
    """Validate a reset token and update the password. Returns user_id on success,
    None on any failure (wrong token, expired, or already used)."""
    import bcrypt
    from datetime import datetime, timezone

    if not plaintext or len(plaintext) < 16 or len(plaintext) > 200:
        return None

    # Token is bcrypt-hashed so we can't index by it — scan rows with a non-null
    # reset hash. In practice this set is tiny (a few rows at any time).
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, password_reset_token_hash, password_reset_expires_at "
                "FROM users WHERE password_reset_token_hash IS NOT NULL;"
            )
            rows = cur.fetchall()
            for uid, token_hash, expires_at in rows:
                if not token_hash or not expires_at:
                    continue
                if expires_at < datetime.now(timezone.utc):
                    continue
                if bcrypt.checkpw(plaintext.encode(), token_hash.encode()):
                    cur.execute(
                        "UPDATE users SET password_hash = %s, "
                        "password_reset_token_hash = NULL, "
                        "password_reset_expires_at = NULL "
                        "WHERE id = %s;",
                        (new_password_hash, uid),
                    )
                    conn.commit()
                    return uid
    return None


# ── Stripe billing state ───────────────────────────────────────────────────

def consume_openai_tokens(user_id: int, tokens: int, daily_cap: int) -> tuple[bool, int]:
    """Atomically check + record OpenAI usage. Returns (allowed, remaining_after).

    Rolls the per-user counter at UTC midnight. If the call would exceed
    `daily_cap`, returns (False, remaining_today) without recording usage."""
    from datetime import date

    today = date.today()
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT openai_tokens_today, openai_tokens_reset_date FROM users WHERE id = %s;",
                (user_id,),
            )
            row = cur.fetchone()
            current = row[0] if row else 0
            reset_date = row[1] if row else None
            if reset_date != today:
                current = 0
            if current + tokens > daily_cap:
                remaining = max(0, daily_cap - current)
                return (False, remaining)
            new_total = current + tokens
            cur.execute(
                "UPDATE users SET openai_tokens_today = %s, openai_tokens_reset_date = %s WHERE id = %s;",
                (new_total, today, user_id),
            )
        conn.commit()
    return (True, daily_cap - new_total)


def get_stripe_customer_id(user_id: int) -> str | None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT stripe_customer_id FROM users WHERE id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return row[0] if row and row[0] else None


def set_stripe_customer_id(user_id: int, customer_id: str) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET stripe_customer_id = %s WHERE id = %s;",
                (customer_id, int(user_id)),
            )
        conn.commit()


def record_webhook_event(event_id: str, event_type: str) -> bool:
    """Insert a Stripe webhook event_id into the dedup table.

    Returns True if the event is new (we should process it), False if it's
    already been recorded (duplicate delivery — silently ignore). The PK
    constraint on event_id is what makes this race-safe across workers.
    """
    if not event_id:
        # Defensive: real Stripe events always have an id. If we get here
        # with no id, fall through and process — better to risk a duplicate
        # than to silently swallow a real event.
        return True
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO stripe_webhook_events (event_id, event_type)
                VALUES (%s, %s)
                ON CONFLICT (event_id) DO NOTHING;
                """,
                (event_id, event_type),
            )
            inserted = cur.rowcount > 0
        conn.commit()
    return inserted


def update_subscription_state(
    customer_id: str,
    subscription_id: str | None,
    status: str | None,
    product: str | None,
    tier: str | None,
) -> None:
    """Webhook-driven update of subscription state for a Stripe customer.
    Sets stripe_subscription_id, subscription_status, subscription_product, and tier
    in one transaction. Pass tier=None to leave tier unchanged."""
    with _connect() as conn:
        with conn.cursor() as cur:
            if tier is not None:
                cur.execute(
                    """
                    UPDATE users
                    SET stripe_subscription_id = %s,
                        subscription_status = %s,
                        subscription_product = %s,
                        tier = %s
                    WHERE stripe_customer_id = %s;
                    """,
                    (subscription_id, status, product, tier, customer_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE users
                    SET stripe_subscription_id = %s,
                        subscription_status = %s,
                        subscription_product = %s
                    WHERE stripe_customer_id = %s;
                    """,
                    (subscription_id, status, product, customer_id),
                )
        conn.commit()


def get_user_email(user_id: int) -> str | None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT email FROM users WHERE id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return row[0] if row else None


def get_chat_used(user_id: int) -> int:
    """Return how many free AI chat messages this user has sent."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(free_chat_used, 0) FROM users WHERE id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return int(row[0]) if row else 0


def increment_chat_used(user_id: int) -> int:
    """Increment free_chat_used and return the new count."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET free_chat_used = COALESCE(free_chat_used, 0) + 1 WHERE id = %s RETURNING free_chat_used;",
                (int(user_id),),
            )
            row = cur.fetchone()
        conn.commit()
    return int(row[0]) if row else 1


def get_session_count(user_id: int) -> int:
    """Return the number of saved sessions for a user."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM sessions WHERE user_id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return int(row[0]) if row else 0


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------


def save_session(row: dict[str, Any]) -> int:
    injury_area = row.get("injury_area")
    pain_level = row.get("pain_level")
    pain_type = row.get("pain_type")
    onset = row.get("onset")
    user_id = row.get("user_id")
    intake_json = row.get("intake_json")  # optional full intake payload

    if not injury_area:
        raise ValueError("row['injury_area'] is required")

    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sessions (user_id, injury_area, pain_level, pain_type, onset, intake_json)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (user_id, injury_area, pain_level, pain_type, onset,
                 json.dumps(intake_json) if intake_json else None),
            )
            new_id = cur.fetchone()[0]
        conn.commit()

    return int(new_id)


def get_session(session_id: int) -> tuple[Any, ...] | None:
    """Returns (id, injury_area, pain_level, pain_type, onset, created_at, user_id, intake_json) or None."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, injury_area, pain_level, pain_type, onset, created_at, user_id, intake_json
                FROM sessions
                WHERE id = %s;
                """,
                (int(session_id),),
            )
            return cur.fetchone()


def list_sessions(user_id: int, limit: int = 50) -> list[tuple[Any, ...]]:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT id, injury_area, pain_level, pain_type, onset, created_at
                FROM sessions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s;
                """,
            (int(user_id), int(limit)),
        )
        return cur.fetchall()


def delete_session(session_id: int, user_id: int) -> None:
    """Delete a session only if it belongs to the given user."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM sessions WHERE id = %s AND user_id = %s;",
                (int(session_id), int(user_id)),
            )
        conn.commit()


# ---------------------------------------------------------------------------
# Athlete profile helpers
# ---------------------------------------------------------------------------


def save_profile(user_id: int, data: dict[str, Any]) -> None:
    """Upsert the athlete profile for a user."""
    with _connect() as conn:
        with conn.cursor() as cur:
            # Derive days_per_week from training_days when present so the
            # two fields stay in sync (picker is the source of truth).
            training_days = data.get("training_days") or []
            days_per_week = (
                len(training_days) if training_days
                else data.get("days_per_week")
            )
            cur.execute(
                """
                INSERT INTO athlete_profiles
                    (user_id, experience_level, years_climbing, primary_discipline,
                     max_grade_boulder, max_grade_route, days_per_week, session_length_min,
                     equipment, weaknesses, primary_goal, goal_grade, training_days,
                     height_cm, ape_index_cm, unit_preference, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    experience_level   = EXCLUDED.experience_level,
                    years_climbing     = EXCLUDED.years_climbing,
                    primary_discipline = EXCLUDED.primary_discipline,
                    max_grade_boulder  = EXCLUDED.max_grade_boulder,
                    max_grade_route    = EXCLUDED.max_grade_route,
                    days_per_week      = EXCLUDED.days_per_week,
                    session_length_min = EXCLUDED.session_length_min,
                    equipment          = EXCLUDED.equipment,
                    weaknesses         = EXCLUDED.weaknesses,
                    primary_goal       = EXCLUDED.primary_goal,
                    goal_grade         = EXCLUDED.goal_grade,
                    training_days      = EXCLUDED.training_days,
                    height_cm          = COALESCE(EXCLUDED.height_cm, athlete_profiles.height_cm),
                    ape_index_cm       = COALESCE(EXCLUDED.ape_index_cm, athlete_profiles.ape_index_cm),
                    unit_preference    = COALESCE(EXCLUDED.unit_preference, athlete_profiles.unit_preference),
                    updated_at         = NOW();
                """,
                (
                    int(user_id),
                    data.get("experience_level"),
                    data.get("years_climbing"),
                    data.get("primary_discipline"),
                    data.get("max_grade_boulder"),
                    data.get("max_grade_route"),
                    days_per_week,
                    data.get("session_length_min"),
                    data.get("equipment") or [],
                    data.get("weaknesses") or [],
                    data.get("primary_goal"),
                    data.get("goal_grade"),
                    training_days or None,
                    data.get("height_cm"),
                    data.get("ape_index_cm"),
                    data.get("unit_preference"),
                ),
            )
        conn.commit()


def save_body_measurements(
    user_id: int,
    *,
    height_cm: int | None = None,
    ape_index_cm: int | None = None,
    unit_preference: str | None = None,
) -> None:
    """Update ONLY the body-measurement columns on a user's profile row.

    Used by surfaces that need to write height/ape without re-sending the
    full wizard payload (e.g. the Movement Analyzer's calibration panel).
    Creates a thin profile row if none exists yet so the climber can save
    measurements before completing the full onboarding wizard.
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO athlete_profiles (user_id, height_cm, ape_index_cm, unit_preference, updated_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    height_cm       = COALESCE(EXCLUDED.height_cm, athlete_profiles.height_cm),
                    ape_index_cm    = COALESCE(EXCLUDED.ape_index_cm, athlete_profiles.ape_index_cm),
                    unit_preference = COALESCE(EXCLUDED.unit_preference, athlete_profiles.unit_preference),
                    updated_at      = NOW();
                """,
                (int(user_id), height_cm, ape_index_cm, unit_preference),
            )
        conn.commit()


def get_profile(user_id: int) -> dict[str, Any] | None:
    """Return athlete profile as a dict, or None if not set up."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT experience_level, years_climbing, primary_discipline,
                       max_grade_boulder, max_grade_route, days_per_week, session_length_min,
                       equipment, weaknesses, primary_goal, goal_grade, training_days,
                       height_cm, ape_index_cm, unit_preference, updated_at
                FROM athlete_profiles WHERE user_id = %s;
                """,
            (int(user_id),),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {
        "experience_level":   row[0],
        "years_climbing":     row[1],
        "primary_discipline": row[2],
        "max_grade_boulder":  row[3],
        "max_grade_route":    row[4],
        "days_per_week":      row[5],
        "session_length_min": row[6],
        "equipment":          list(row[7]) if row[7] else [],
        "weaknesses":         list(row[8]) if row[8] else [],
        "primary_goal":       row[9],
        "goal_grade":         row[10],
        "training_days":      list(row[11]) if row[11] else [],
        "height_cm":          row[12],
        "ape_index_cm":       row[13],
        "unit_preference":    row[14],
        "updated_at":         str(row[15]) if row[15] else None,
    }


# ---------------------------------------------------------------------------
# Training plan helpers
# ---------------------------------------------------------------------------


def save_plan(user_id: int, plan: dict[str, Any]) -> int:
    """Deactivate any existing active plan then insert a new one. Returns new plan id."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE training_plans SET status = 'completed' WHERE user_id = %s AND status = 'active';",
                (int(user_id),),
            )
            cur.execute(
                """
                INSERT INTO training_plans (user_id, name, phase, duration_weeks, start_date, status, plan_data)
                VALUES (%s, %s, %s, %s, %s, 'active', %s::jsonb)
                RETURNING id;
                """,
                (
                    int(user_id),
                    plan.get("name"),
                    plan.get("phase"),
                    plan.get("duration_weeks"),
                    plan.get("start_date"),
                    json.dumps(plan.get("plan_data", {})),
                ),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    return int(new_id)


def get_active_plan(user_id: int) -> dict[str, Any] | None:
    """Return the active training plan as a dict, or None."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT id, name, phase, duration_weeks, start_date, status, plan_data, created_at
                FROM training_plans
                WHERE user_id = %s AND status = 'active'
                ORDER BY created_at DESC LIMIT 1;
                """,
            (int(user_id),),
        )
        row = cur.fetchone()
    if not row:
        return None
    plan_data = row[6]
    if isinstance(plan_data, str):
        plan_data = json.loads(plan_data)
    return {
        "id":             row[0],
        "name":           row[1],
        "phase":          row[2],
        "duration_weeks": row[3],
        "start_date":     str(row[4]),
        "status":         row[5],
        "plan_data":      plan_data,
        "created_at":     str(row[7]),
    }


# ---------------------------------------------------------------------------
# Training log helpers
# ---------------------------------------------------------------------------


def _merge_climbs(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    """Sum counter values per (discipline, grade) across two climbs dicts.
    Each climbs dict has shape: { boulder|route: { '<grade>': { s, f, p, styles? } } }.

    Same-day re-logs ADD to the day's totals — never replace — so the
    grade pyramid keeps accumulating as the user logs multiple sessions.
    The f <= s invariant is preserved because both counters increase
    together. The optional `styles` sub-map (power/dynamic/technical/
    endurance) is summed per-key so style attribution survives multi-log
    days.
    """
    out: dict[str, dict[str, dict[str, Any]]] = {}
    for discipline in ("boulder", "route"):
        a = (existing or {}).get(discipline) or {}
        b = (incoming or {}).get(discipline) or {}
        grades_merged: dict[str, dict[str, Any]] = {}
        for grade in set(a.keys()) | set(b.keys()):
            ac = a.get(grade) or {}
            bc = b.get(grade) or {}
            entry: dict[str, Any] = {
                "s": int(ac.get("s", 0)) + int(bc.get("s", 0)),
                "f": int(ac.get("f", 0)) + int(bc.get("f", 0)),
                "p": int(ac.get("p", 0)) + int(bc.get("p", 0)),
            }
            # Merge the optional styles map by summing per-key. If neither
            # side has a styles map, omit the key so legacy logs stay legacy.
            ac_styles = ac.get("styles") if isinstance(ac.get("styles"), dict) else None
            bc_styles = bc.get("styles") if isinstance(bc.get("styles"), dict) else None
            if ac_styles or bc_styles:
                merged_styles: dict[str, int] = {}
                for key in set((ac_styles or {}).keys()) | set((bc_styles or {}).keys()):
                    merged_styles[key] = (
                        int((ac_styles or {}).get(key, 0))
                        + int((bc_styles or {}).get(key, 0))
                    )
                entry["styles"] = merged_styles
            grades_merged[grade] = entry
        if grades_merged:
            out[discipline] = grades_merged
    return out


def log_training(user_id: int, data: dict[str, Any]) -> int:
    """Insert or merge a training log entry; return its id.

    When a row for (user_id, date) already exists, climb counters are
    ADDED to the existing row (cumulative day totals), duration is summed,
    intensity uses max, and other fields take the latest value. Otherwise
    a new row is inserted.
    """
    from src.climb_grades import format_climbs_summary  # local import to avoid circular

    incoming_climbs = data.get("climbs") or {}
    session_date = data.get("date")
    incoming_duration = data.get("duration_min")
    incoming_intensity = data.get("intensity")

    with _connect() as conn:
        with conn.cursor() as cur:
            # Pull existing row's climbs + duration + intensity so we can
            # merge counters rather than overwrite the day's totals.
            cur.execute(
                "SELECT climbs, duration_min, intensity FROM training_logs WHERE user_id = %s AND date = %s;",
                (int(user_id), session_date),
            )
            existing = cur.fetchone()

    if existing:
        existing_climbs    = existing[0] or {}
        existing_duration  = existing[1] or 0
        existing_intensity = existing[2] or 0
        if isinstance(existing_climbs, str):
            existing_climbs = json.loads(existing_climbs)
        climbs = _merge_climbs(existing_climbs, incoming_climbs)
        # Duration: sum across same-day logs (more time climbed = more time).
        merged_duration = (existing_duration or 0) + (incoming_duration or 0) if incoming_duration is not None else existing_duration
        # Intensity: take max (peak intensity of the day).
        merged_intensity = max(existing_intensity or 0, incoming_intensity or 0) if incoming_intensity is not None else existing_intensity
    else:
        climbs = incoming_climbs
        merged_duration = incoming_duration
        merged_intensity = incoming_intensity

    # Regenerate grades_sent from the merged climb totals so the human-
    # readable summary always matches the persisted JSONB.
    grades_sent = data.get("grades_sent") or ""
    if climbs:
        grades_sent = format_climbs_summary(climbs)

    # Upsert by (user_id, date). The frontend's counter logger sends the
    # day's full current state on every save, so a re-save should overwrite
    # — not 500 with a UniqueViolation on training_logs_user_date_idx.
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO training_logs (user_id, date, session_type, duration_min, intensity, grades_sent, notes, climbs)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                ON CONFLICT (user_id, date) DO UPDATE SET
                    session_type = EXCLUDED.session_type,
                    duration_min = EXCLUDED.duration_min,
                    intensity    = EXCLUDED.intensity,
                    grades_sent  = EXCLUDED.grades_sent,
                    notes        = EXCLUDED.notes,
                    climbs       = EXCLUDED.climbs
                RETURNING id;
                """,
                (
                    int(user_id),
                    session_date,
                    data.get("session_type"),
                    merged_duration,
                    merged_intensity,
                    grades_sent,
                    data.get("notes"),
                    json.dumps(climbs),
                ),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    return int(new_id)


def get_training_logs(user_id: int, limit: int = 30) -> list[dict[str, Any]]:
    """Return recent training log entries for a user, newest first."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT id, date, session_type, duration_min, intensity,
                       grades_sent, notes, climbs, created_at
                FROM training_logs
                WHERE user_id = %s
                ORDER BY date DESC, created_at DESC
                LIMIT %s;
                """,
            (int(user_id), int(limit)),
        )
        rows = cur.fetchall()
    return [
        {
            "id":           r[0],
            "date":         str(r[1]),
            "session_type": r[2],
            "duration_min": r[3],
            "intensity":    r[4],
            "grades_sent":  r[5],
            "notes":        r[6],
            "climbs":       r[7] or {},
            "created_at":   str(r[8]),
        }
        for r in rows
    ]


def get_user_hardest(user_id: int, window: str = "all") -> dict[str, str | None]:
    """Return the user's hardest *sent* grade per discipline.

    `window` ∈ {'month', 'all'}. 'month' = last 30 days rolling.
    Sends-only (counters where s > 0); projects (p) don't qualify.
    """
    from src.climb_grades import grade_order  # local import

    if window not in ("month", "all"):
        raise ValueError("window must be 'month' or 'all'")
    where_window = "" if window == "all" else "AND created_at >= NOW() - INTERVAL '30 days'"

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
                SELECT climbs FROM training_logs
                WHERE user_id = %s AND climbs <> '{{}}'::jsonb {where_window};
                """,
            (int(user_id),),
        )
        rows = cur.fetchall()

    best: dict[str, str | None] = {"boulder": None, "route": None}
    for (climbs,) in rows:
        for discipline in ("boulder", "route"):
            grades = (climbs or {}).get(discipline, {})
            for g, c in grades.items():
                if c.get("s", 0) <= 0:
                    continue
                if best[discipline] is None or grade_order(g) > grade_order(best[discipline]):
                    best[discipline] = g
    return best


def get_pyramid(user_id: int, window: str = "month") -> dict[str, Any]:
    """Aggregate the user's climbs JSONB into a discipline-keyed pyramid.

    `window` ∈ {'month', 'all'}. Output shape:
      {"window": str,
       "boulder": {"hardest_send": str|None, "hardest_flash": str|None,
                   "grades": [{"grade": str, "s": int, "f": int, "p": int}, ...]},
       "route": ... }
    `grades` is sorted ascending; only grades with non-zero counters are returned.
    """
    from src.climb_grades import grade_order  # local import

    if window not in ("month", "all"):
        raise ValueError("window must be 'month' or 'all'")
    where_window = "" if window == "all" else "AND created_at >= NOW() - INTERVAL '30 days'"

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
                SELECT climbs FROM training_logs
                WHERE user_id = %s AND climbs <> '{{}}'::jsonb {where_window};
                """,
            (int(user_id),),
        )
        rows = cur.fetchall()

    out: dict[str, Any] = {"window": window}
    for discipline in ("boulder", "route"):
        # accumulate counters per grade
        agg: dict[str, dict[str, int]] = {}
        for (climbs,) in rows:
            grades = (climbs or {}).get(discipline, {})
            for g, c in grades.items():
                slot = agg.setdefault(g, {"s": 0, "f": 0, "p": 0})
                slot["s"] += int(c.get("s", 0))
                slot["f"] += int(c.get("f", 0))
                slot["p"] += int(c.get("p", 0))
        # drop fully-zero rows
        nonzero = {g: c for g, c in agg.items() if c["s"] or c["f"] or c["p"]}
        sorted_grades = sorted(nonzero.keys(), key=grade_order)

        sends_only  = [g for g in sorted_grades if nonzero[g]["s"] > 0]
        flashes_only = [g for g in sorted_grades if nonzero[g]["f"] > 0]
        out[discipline] = {
            "hardest_send":  sends_only[-1]  if sends_only  else None,
            "hardest_flash": flashes_only[-1] if flashes_only else None,
            "grades": [
                {"grade": g, **nonzero[g]} for g in sorted_grades
            ],
        }
    return out


# ── Awards helpers ────────────────────────────────────────────────────


def insert_award(user_id: int, kind: str, payload: dict[str, Any]) -> int | None:
    """Insert a new award row, idempotent via UNIQUE (user_id, kind).

    Returns the new row id if inserted, None if it already existed.
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO awards (user_id, kind, payload)
                VALUES (%s, %s, %s::jsonb)
                ON CONFLICT (user_id, kind) DO NOTHING
                RETURNING id;
                """,
                (int(user_id), kind, json.dumps(payload or {})),
            )
            row = cur.fetchone()
        conn.commit()
    return int(row[0]) if row else None


def list_awards(user_id: int) -> list[dict[str, Any]]:
    """Return the user's earned awards, newest first."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT id, kind, payload, earned_at
                FROM awards WHERE user_id = %s
                ORDER BY earned_at DESC;
                """,
            (int(user_id),),
        )
        rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "kind": r[1],
            "payload": r[2] or {},
            "earned_at": str(r[3]),
        }
        for r in rows
    ]


# ── Hub tip card helpers ─────────────────────────────────────────────


def get_hub_tip(user_id: int, date_iso: str) -> dict[str, Any] | None:
    """Return the user's tip row for a given date (or None)."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT id, kind, headline, body, cta_label, cta_route, color,
                       dismissed_at, created_at
                FROM hub_tips
                WHERE user_id = %s AND date = %s;
                """,
            (int(user_id), date_iso),
        )
        r = cur.fetchone()
    if not r:
        return None
    return {
        "id":           r[0],
        "kind":         r[1],
        "headline":     r[2],
        "body":         r[3],
        "cta_label":    r[4],
        "cta_route":    r[5],
        "color":        r[6],
        "dismissed_at": str(r[7]) if r[7] else None,
        "created_at":   str(r[8]),
    }


def insert_hub_tip(
    user_id: int,
    date_iso: str,
    *,
    kind: str,
    headline: str,
    body: str,
    cta_label: str | None,
    cta_route: str | None,
    color: str,
) -> int | None:
    """Idempotent insert via ON CONFLICT (user_id, date) DO NOTHING.

    Returns the new row id if inserted, None if a row already existed.
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO hub_tips
                  (user_id, date, kind, headline, body, cta_label, cta_route, color)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, date) DO NOTHING
                RETURNING id;
                """,
                (int(user_id), date_iso, kind, headline, body,
                 cta_label, cta_route, color),
            )
            row = cur.fetchone()
        conn.commit()
    return int(row[0]) if row else None


def dismiss_hub_tip(user_id: int, date_iso: str) -> bool:
    """Mark today's tip as dismissed. If no row exists for today, insert
    a sentinel 'dismissed' row so future loads short-circuit.

    Returns True if a row was inserted or updated.
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            # UPSERT: try to update; if zero rows affected, insert sentinel
            cur.execute(
                """
                UPDATE hub_tips SET dismissed_at = NOW()
                WHERE user_id = %s AND date = %s
                RETURNING id;
                """,
                (int(user_id), date_iso),
            )
            updated = cur.fetchone() is not None
            if not updated:
                cur.execute(
                    """
                    INSERT INTO hub_tips
                      (user_id, date, kind, headline, body, color, dismissed_at)
                    VALUES (%s, %s, 'dismissed', '', '', '#94949f', NOW())
                    ON CONFLICT (user_id, date) DO UPDATE SET dismissed_at = NOW()
                    RETURNING id;
                    """,
                    (int(user_id), date_iso),
                )
                updated = cur.fetchone() is not None
        conn.commit()
    return updated


def count_sends(user_id: int) -> int:
    """Total count of sends across all `training_logs.climbs` rows for a user.
    Sums `s` across every grade across both disciplines."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT climbs FROM training_logs
                WHERE user_id = %s AND climbs <> '{}'::jsonb;
                """,
            (int(user_id),),
        )
        rows = cur.fetchall()
    total = 0
    for (climbs,) in rows:
        for discipline in ("boulder", "route"):
            grades = (climbs or {}).get(discipline, {})
            for c in grades.values():
                total += int(c.get("s", 0) or 0)
    return total


def compute_streak(user_id: int, today: str) -> int:
    """Return the user's current consecutive-day streak ending at `today`.

    `today` is a YYYY-MM-DD string in the user's local timezone (matches the
    `training_logs.date` column convention). A streak is the number of
    consecutive calendar days ending at today with at least one training_logs
    row. Zero if today has no log.
    """
    from datetime import date, timedelta

    def parse(s: str) -> date:
        y, m, d = s.split("-")
        return date(int(y), int(m), int(d))

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT DISTINCT date FROM training_logs WHERE user_id = %s;
                """,
            (int(user_id),),
        )
        dates_set = {r[0] for r in cur.fetchall()}

    cursor_date = parse(today)
    streak = 0
    while cursor_date in dates_set:
        streak += 1
        cursor_date = cursor_date - timedelta(days=1)
    return streak


# ---------------------------------------------------------------------------
# Train stats + leaderboard helpers
# ---------------------------------------------------------------------------


# Window → SQL filter snippet. "all" means no time filter.
_WINDOW_SQL = {
    "week":  "tl.created_at >= NOW() - INTERVAL '7 days'",
    "month": "tl.created_at >= NOW() - INTERVAL '30 days'",
    "all":   "TRUE",
}


def _hours_in_window(user_id: int, window: str) -> dict[str, Any]:
    """Sum of training-log duration (hours) + session count for one user in
    the given window. Window must be one of: week, month, all."""
    where = _WINDOW_SQL.get(window, _WINDOW_SQL["week"])
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
                SELECT COALESCE(SUM(tl.duration_min), 0) / 60.0 AS hours,
                       COUNT(tl.id) AS sessions
                FROM training_logs tl
                WHERE tl.user_id = %s AND {where};
                """,
            (int(user_id),),
        )
        row = cur.fetchone()
    return {"hours": round(float(row[0]), 1), "sessions": int(row[1])}


def _current_streak_days(user_id: int) -> int:
    """Count of consecutive calendar days ending today (or yesterday if no
    log today) where the user has at least one training_log entry."""
    from datetime import date, timedelta
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') AS d
                FROM training_logs
                WHERE user_id = %s
                ORDER BY d DESC
                LIMIT 365;
                """,
            (int(user_id),),
        )
        days = [r[0] for r in cur.fetchall()]
    if not days:
        return 0
    today = date.today()
    # Today or yesterday counts as the anchor (user might not have logged today yet).
    if days[0] != today and days[0] != today - timedelta(days=1):
        return 0
    streak = 1
    for i in range(1, len(days)):
        if days[i] == days[i - 1] - timedelta(days=1):
            streak += 1
        else:
            break
    return streak


def _trend_8_weeks(user_id: int, cohort: str | None) -> list[dict[str, Any]]:
    """User hours per week for the last 8 ISO weeks (oldest first) plus the
    cohort's mean hours per user for the same week. Missing weeks → 0."""
    from datetime import date, timedelta
    today = date.today()
    weeks = []
    for i in range(7, -1, -1):
        start = today - timedelta(days=today.weekday()) - timedelta(weeks=i)
        end = start + timedelta(days=7)
        weeks.append((start, end))

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT
                    DATE(created_at AT TIME ZONE 'UTC') AS d,
                    SUM(duration_min) / 60.0 AS h
                FROM training_logs
                WHERE user_id = %s
                  AND created_at >= %s
                GROUP BY d
                ORDER BY d;
                """,
            (int(user_id), weeks[0][0]),
        )
        user_by_day = {r[0]: float(r[1]) for r in cur.fetchall()}

        peer_avgs = {}
        if cohort and cohort != "global":
            cur.execute(
                """
                    SELECT wk, AVG(per_user_hours)
                    FROM (
                        SELECT
                            tl.user_id,
                            DATE_TRUNC('week', tl.created_at AT TIME ZONE 'UTC')::date AS wk,
                            SUM(tl.duration_min) / 60.0 AS per_user_hours
                        FROM training_logs tl
                        JOIN athlete_profiles p ON p.user_id = tl.user_id
                        WHERE p.experience_level = %s
                          AND tl.created_at >= %s
                        GROUP BY tl.user_id, wk
                    ) sub
                    GROUP BY wk;
                    """,
                (cohort, weeks[0][0]),
            )
            for r in cur.fetchall():
                peer_avgs[r[0]] = float(r[1])

    result = []
    for start, end in weeks:
        user_hours = sum(h for d, h in user_by_day.items() if start <= d < end)
        peer_avg = peer_avgs.get(start, 0.0)
        result.append({
            "week_start":     str(start),
            "hours":          round(user_hours, 1),
            "peer_avg_hours": round(peer_avg, 1),
        })
    return result


def _percentile_in_cohort(user_id: int, cohort: str | None, window: str) -> int:
    """User's hours-percentile within their cohort, in the given window.
    0–100 (100 = at top). Returns 0 if cohort is empty / global."""
    where = _WINDOW_SQL.get(window, _WINDOW_SQL["week"])
    if not cohort or cohort == "global":
        return 0
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                WITH user_hours AS (
                    SELECT p.user_id,
                           COALESCE(SUM(tl.duration_min), 0) / 60.0 AS h
                    FROM athlete_profiles p
                    LEFT JOIN training_logs tl
                      ON tl.user_id = p.user_id AND {where}
                    WHERE p.experience_level = %s
                    GROUP BY p.user_id
                )
                SELECT
                    (SELECT h FROM user_hours WHERE user_id = %s) AS my,
                    COUNT(*) AS total,
                    SUM(CASE WHEN h < (SELECT h FROM user_hours WHERE user_id = %s) THEN 1 ELSE 0 END) AS below
                FROM user_hours;
                """,
                (cohort, int(user_id), int(user_id)),
            )
            row = cur.fetchone()
    if not row or not row[1]:
        return 0
    my, total, below = row[0], int(row[1]), int(row[2] or 0)
    if my is None or total <= 1:
        return 0
    return int(round(100 * below / max(total - 1, 1)))


def _personal_records(user_id: int) -> dict[str, Any]:
    """All-time records: longest streak, most hours in a calendar week,
    most sessions in a calendar week."""
    from datetime import timedelta
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') AS d
                FROM training_logs
                WHERE user_id = %s
                ORDER BY d;
                """,
            (int(user_id),),
        )
        days = [r[0] for r in cur.fetchall()]
        longest = 0
        run = 0
        for i, d in enumerate(days):
            if i == 0 or d != days[i - 1] + timedelta(days=1):
                run = 1
            else:
                run += 1
            longest = max(longest, run)

        cur.execute(
            """
                SELECT
                    DATE_TRUNC('week', created_at AT TIME ZONE 'UTC') AS wk,
                    SUM(duration_min) / 60.0 AS hours,
                    COUNT(*) AS sessions
                FROM training_logs
                WHERE user_id = %s
                GROUP BY wk;
                """,
            (int(user_id),),
        )
        rows = cur.fetchall()
        most_hours    = max((float(r[1]) for r in rows), default=0.0)
        most_sessions = max((int(r[2])  for r in rows), default=0)

    return {
        "longest_streak_days":   int(longest),
        "most_hours_in_week":    round(most_hours, 1),
        "most_sessions_in_week": int(most_sessions),
    }


def get_user_cohort(user_id: int) -> str | None:
    """The user's experience_level from athlete_profiles, or None if
    they haven't set up a profile yet."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT experience_level FROM athlete_profiles WHERE user_id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return row[0] if row and row[0] else None


def get_training_stats(user_id: int) -> dict[str, Any]:
    """Full personal-dashboard payload — see /api/training/stats."""
    cohort = get_user_cohort(user_id)
    return {
        "this_week":             _hours_in_window(user_id, "week"),
        "this_month":            _hours_in_window(user_id, "month"),
        "all_time":              _hours_in_window(user_id, "all"),
        "current_streak_days":   _current_streak_days(user_id),
        "trend_8_weeks":         _trend_8_weeks(user_id, cohort),
        "percentile_this_week":  _percentile_in_cohort(user_id, cohort, "week"),
        "cohort":                cohort,
        "personal_records":      _personal_records(user_id),
    }


# Send goals per leaderboard window (Apple-Fitness-style: leaderboard ranks
# by % of send goal closed, capped at 200%). Equalizing — a casual climber
# closing 100% beats an athlete closing 95%. Future iteration: per-user
# customizable goals on athlete_profiles.
WEEKLY_SEND_GOAL  = 10
MONTHLY_SEND_GOAL = 40
PCT_CAP = 200


def _sends_sql_expr(alias: str = "tl") -> str:
    """Return a SQL expression summing total sends + flashes across both
    disciplines for a single training_logs row. Works on JSONB column
    `{alias}.climbs` shaped as {boulder: {V5: {s,f,p}, ...}, route: {...}}."""
    return f"""(
        COALESCE((
            SELECT SUM(COALESCE((value ->> 's')::int, 0) + COALESCE((value ->> 'f')::int, 0))
            FROM jsonb_each({alias}.climbs -> 'boulder')
        ), 0)
        +
        COALESCE((
            SELECT SUM(COALESCE((value ->> 's')::int, 0) + COALESCE((value ->> 'f')::int, 0))
            FROM jsonb_each({alias}.climbs -> 'route')
        ), 0)
    )"""


def _goal_for_window(window: str) -> int | None:
    """Send goal for the given leaderboard window. None for 'all' — no cap."""
    if window == "week":  return WEEKLY_SEND_GOAL
    if window == "month": return MONTHLY_SEND_GOAL
    return None


def _pct_closed(sends: int, goal: int | None) -> int | None:
    """Pct of goal closed, capped at PCT_CAP. None when no goal (all-time)."""
    if goal is None or goal <= 0:
        return None
    return min(int(round(sends * 100 / goal)), PCT_CAP)


def get_leaderboard(
    *,
    viewer_user_id: int,
    window: str = "week",
    cohort: str | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    """Top N + the viewer's own row. cohort=None defaults to viewer's
    own experience_level. Pass cohort='global' to skip the cohort filter.

    Metric is total CLIMB SENDS (s+f across both disciplines, summed across
    all training_logs in the window). Frontend renders pct = sends / goal,
    capped at 200%.
    """
    where_time = _WINDOW_SQL.get(window, _WINDOW_SQL["week"])
    is_global = cohort == "global"
    effective_cohort = cohort if cohort is not None else get_user_cohort(viewer_user_id)
    sends_expr = _sends_sql_expr("tl")
    goal = _goal_for_window(window)

    cohort_join   = "JOIN athlete_profiles p ON p.user_id = u.id" if not is_global else "LEFT JOIN athlete_profiles p ON p.user_id = u.id"
    cohort_filter = "" if is_global else "AND p.experience_level = %(cohort)s"

    # CTE: per-user total sends in the window
    user_sends_cte = f"""
        user_sends AS (
            SELECT tl.user_id, COALESCE(SUM({sends_expr}), 0) AS sends
            FROM training_logs tl
            WHERE {where_time}
            GROUP BY tl.user_id
        )
    """

    base = f"""
        WITH {user_sends_cte}
        SELECT
            u.id,
            u.display_name,
            u.leaderboard_private,
            COALESCE(us.sends, 0) AS sends,
            u.avatar_icon,
            u.avatar_color
        FROM users u
        {cohort_join}
        LEFT JOIN user_sends us ON us.user_id = u.id
        WHERE u.display_name IS NOT NULL
          {cohort_filter}
          AND COALESCE(us.sends, 0) > 0
        ORDER BY sends DESC
    """

    params = {"cohort": effective_cohort}

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(base + " LIMIT %(limit)s;", {**params, "limit": int(limit)})
        top_rows = cur.fetchall()
        top = [
            {
                "rank":         i + 1,
                "user_id":      int(r[0]),
                "display_name": "Private climber" if r[2] else r[1],
                "is_private":   bool(r[2]),
                "sends":        int(r[3]),
                "goal":         goal,
                "pct":          _pct_closed(int(r[3]), goal),
                "avatar_icon":  None if r[2] else r[4],
                "avatar_color": None if r[2] else r[5],
            }
            for i, r in enumerate(top_rows)
        ]

        cur.execute(
            f"""
                WITH {user_sends_cte},
                ranked AS (
                    SELECT
                        u.id,
                        u.display_name,
                        u.leaderboard_private,
                        u.avatar_icon,
                        u.avatar_color,
                        COALESCE(us.sends, 0) AS sends,
                        RANK() OVER (ORDER BY COALESCE(us.sends, 0) DESC) AS r
                    FROM users u
                    {cohort_join}
                    LEFT JOIN user_sends us ON us.user_id = u.id
                    WHERE u.display_name IS NOT NULL
                      {cohort_filter}
                )
                SELECT id, display_name, leaderboard_private, sends, r, avatar_icon, avatar_color
                FROM ranked
                WHERE id = %(viewer)s;
                """,
            {**params, "viewer": int(viewer_user_id)},
        )
        mr = cur.fetchone()

    me = None
    if mr:
        my_sends = int(mr[3])
        me = {
            "rank":         int(mr[4]) if my_sends > 0 else None,
            "user_id":      int(mr[0]),
            "display_name": "Private climber" if mr[2] else mr[1],
            "is_private":   bool(mr[2]),
            "sends":        my_sends,
            "goal":         goal,
            "pct":          _pct_closed(my_sends, goal),
            "avatar_icon":  mr[5],
            "avatar_color": mr[6],
        }

    return {"window": window, "cohort": effective_cohort or "global", "top": top, "me": me, "goal": goal}


def set_display_name(user_id: int, display_name: str) -> bool:
    """Save the user's display name. Caller validates; uniqueness violation
    surfaces as psycopg2.errors.UniqueViolation (sqlstate 23505)."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET display_name = %s WHERE id = %s;",
                (display_name, int(user_id)),
            )
            updated = cur.rowcount > 0
        conn.commit()
    return updated


def get_display_name(user_id: int) -> str | None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT display_name FROM users WHERE id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return row[0] if row else None


def set_leaderboard_private(user_id: int, private: bool) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET leaderboard_private = %s WHERE id = %s;",
                (bool(private), int(user_id)),
            )
        conn.commit()


def get_leaderboard_private(user_id: int) -> bool:
    """Whether the user's leaderboard rows show as 'Private climber'."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(leaderboard_private, FALSE) FROM users WHERE id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return bool(row[0]) if row else False


def set_avatar(user_id: int, icon: str | None, color: str | None) -> None:
    """Save the user's chosen avatar preset + optional color override.
    Caller validates against the allowed sets."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET avatar_icon = %s, avatar_color = %s WHERE id = %s;",
                (icon, color, int(user_id)),
            )
        conn.commit()


def get_avatar(user_id: int) -> tuple[str | None, str | None]:
    """Return (avatar_icon, avatar_color) for the user. Either may be None."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT avatar_icon, avatar_color FROM users WHERE id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    return (row[0], row[1]) if row else (None, None)


# ---------------------------------------------------------------------------
# Rehab progress helpers (daily checkoff)
# ---------------------------------------------------------------------------


def get_rehab_progress(user_id: int, date: str) -> list[dict[str, Any]]:
    """Return rows checked off for the user on a given local date (YYYY-MM-DD)."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT exercise_key, region, phase, completed_at
                FROM rehab_progress
                WHERE user_id = %s AND completed_date = %s
                ORDER BY completed_at ASC;
                """,
            (int(user_id), date),
        )
        rows = cur.fetchall()
    return [
        {
            "exercise_key": r[0],
            "region":       r[1],
            "phase":        int(r[2]),
            "completed_at": str(r[3]),
        }
        for r in rows
    ]


def check_rehab_exercise(
    user_id: int,
    exercise_key: str,
    region: str,
    phase: int,
    date: str,
) -> dict[str, Any]:
    """Insert a checkoff event. Idempotent via UNIQUE (user_id, exercise_key,
    completed_date). Returns {id, already_existed}."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO rehab_progress
                    (user_id, exercise_key, region, phase, completed_date)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, exercise_key, completed_date) DO NOTHING
                RETURNING id;
                """,
                (int(user_id), exercise_key, region, int(phase), date),
            )
            row = cur.fetchone()
            already_existed = row is None
            if already_existed:
                # Re-fetch to return the existing row's id.
                cur.execute(
                    """
                    SELECT id FROM rehab_progress
                    WHERE user_id = %s AND exercise_key = %s AND completed_date = %s;
                    """,
                    (int(user_id), exercise_key, date),
                )
                row = cur.fetchone()
        conn.commit()
    return {"id": int(row[0]) if row else None, "already_existed": already_existed}


def uncheck_rehab_exercise(user_id: int, exercise_key: str, date: str) -> bool:
    """Delete the user's checkoff row for an exercise on a given date.
    Returns True if a row was deleted, False if nothing matched."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM rehab_progress
                WHERE user_id = %s AND exercise_key = %s AND completed_date = %s;
                """,
                (int(user_id), exercise_key, date),
            )
            deleted = cur.rowcount > 0
        conn.commit()
    return deleted


# ---------------------------------------------------------------------------
# Coach messaging helpers
# ---------------------------------------------------------------------------


def get_or_create_thread(user_id: int) -> int:
    """Return existing thread id for user or create a new one."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM coach_threads WHERE user_id = %s;",
                (int(user_id),),
            )
            row = cur.fetchone()
            if row:
                return int(row[0])
            cur.execute(
                "INSERT INTO coach_threads (user_id) VALUES (%s) RETURNING id;",
                (int(user_id),),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    return int(new_id)


def send_coach_message(thread_id: int, sender_type: str, content: str) -> int:
    """Insert a coach message and bump thread updated_at. Returns message id."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO coach_messages (thread_id, sender_type, content)
                VALUES (%s, %s, %s) RETURNING id;
                """,
                (int(thread_id), sender_type, content),
            )
            new_id = cur.fetchone()[0]
            cur.execute(
                "UPDATE coach_threads SET updated_at = NOW() WHERE id = %s;",
                (int(thread_id),),
            )
        conn.commit()
    return int(new_id)


def get_thread_messages(thread_id: int) -> list[dict[str, Any]]:
    """Return all messages for a thread ordered oldest first."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT id, sender_type, content, created_at
                FROM coach_messages
                WHERE thread_id = %s
                ORDER BY created_at ASC;
                """,
            (int(thread_id),),
        )
        rows = cur.fetchall()
    return [
        {
            "id":          r[0],
            "sender_type": r[1],
            "content":     r[2],
            "created_at":  str(r[3]),
        }
        for r in rows
    ]


def list_coach_threads() -> list[dict[str, Any]]:
    """Admin: return all threads with user email and latest message preview."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
                SELECT ct.id, ct.user_id, u.email, ct.status, ct.updated_at,
                       (SELECT content FROM coach_messages
                        WHERE thread_id = ct.id
                        ORDER BY created_at DESC LIMIT 1) AS last_msg,
                       (SELECT sender_type FROM coach_messages
                        WHERE thread_id = ct.id
                        ORDER BY created_at DESC LIMIT 1) AS last_sender,
                       (SELECT COUNT(*) FROM coach_messages
                        WHERE thread_id = ct.id AND sender_type = 'user'
                        AND created_at > COALESCE(
                            (SELECT MAX(created_at) FROM coach_messages
                             WHERE thread_id = ct.id AND sender_type = 'coach'),
                            '1970-01-01'
                        )) AS unread_count
                FROM coach_threads ct
                JOIN users u ON u.id = ct.user_id
                ORDER BY ct.updated_at DESC;
                """,
        )
        rows = cur.fetchall()
    return [
        {
            "id":           r[0],
            "user_id":      r[1],
            "email":        r[2],
            "status":       r[3],
            "updated_at":   str(r[4]),
            "last_msg":     r[5],
            "last_sender":  r[6],
            "unread_count": int(r[7]),
        }
        for r in rows
    ]


def get_thread_by_user(user_id: int) -> dict[str, Any] | None:
    """Return thread metadata for a user, or None if they haven't messaged yet."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, status, created_at FROM coach_threads WHERE user_id = %s;",
            (int(user_id),),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "status": row[1], "created_at": str(row[2])}
