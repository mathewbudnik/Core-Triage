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
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional, Tuple

from psycopg2 import pool


_pool: Optional[pool.ThreadedConnectionPool] = None


def _db_params() -> Dict[str, Any]:
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


def get_user_by_email(email: str) -> Optional[Tuple[Any, ...]]:
    """Returns (id, email, password_hash, failed_login_attempts, locked_until, disclaimer_accepted) or None."""
    with _connect() as conn:
        with conn.cursor() as cur:
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


def get_user_by_id(user_id: int) -> Optional[Tuple[Any, ...]]:
    """Returns (id, email, disclaimer_accepted, tier) or None — used to enrich /api/auth/me."""
    with _connect() as conn:
        with conn.cursor() as cur:
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


def get_user_tier(user_id: int) -> str:
    """Return 'free' | 'core' | 'pro' for the given user."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COALESCE(tier, 'free') FROM users WHERE id = %s;",
                (int(user_id),),
            )
            row = cur.fetchone()
    return str(row[0]) if row else "free"


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
    with _connect() as conn:
        with conn.cursor() as cur:
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


def verify_email_with_token(token: str) -> Optional[int]:
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
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COALESCE(email_verified, FALSE) FROM users WHERE id = %s;",
                (int(user_id),),
            )
            row = cur.fetchone()
    return bool(row and row[0])


# ── Stripe billing state ───────────────────────────────────────────────────

def get_stripe_customer_id(user_id: int) -> Optional[str]:
    with _connect() as conn:
        with conn.cursor() as cur:
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
    subscription_id: Optional[str],
    status: Optional[str],
    product: Optional[str],
    tier: Optional[str],
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


def get_user_email(user_id: int) -> Optional[str]:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT email FROM users WHERE id = %s;",
                (int(user_id),),
            )
            row = cur.fetchone()
    return row[0] if row else None


def get_chat_used(user_id: int) -> int:
    """Return how many free AI chat messages this user has sent."""
    with _connect() as conn:
        with conn.cursor() as cur:
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
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM sessions WHERE user_id = %s;",
                (int(user_id),),
            )
            row = cur.fetchone()
    return int(row[0]) if row else 0


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------


def save_session(row: Dict[str, Any]) -> int:
    injury_area = row.get("injury_area")
    pain_level = row.get("pain_level")
    pain_type = row.get("pain_type")
    onset = row.get("onset")
    user_id = row.get("user_id")

    if not injury_area:
        raise ValueError("row['injury_area'] is required")

    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sessions (user_id, injury_area, pain_level, pain_type, onset)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (user_id, injury_area, pain_level, pain_type, onset),
            )
            new_id = cur.fetchone()[0]
        conn.commit()

    return int(new_id)


def get_session(session_id: int) -> Optional[Tuple[Any, ...]]:
    """Returns (id, injury_area, pain_level, pain_type, onset, created_at, user_id) or None."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, injury_area, pain_level, pain_type, onset, created_at, user_id
                FROM sessions
                WHERE id = %s;
                """,
                (int(session_id),),
            )
            return cur.fetchone()


def list_sessions(user_id: int, limit: int = 50) -> List[Tuple[Any, ...]]:
    with _connect() as conn:
        with conn.cursor() as cur:
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


def save_profile(user_id: int, data: Dict[str, Any]) -> None:
    """Upsert the athlete profile for a user."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO athlete_profiles
                    (user_id, experience_level, years_climbing, primary_discipline,
                     max_grade_boulder, max_grade_route, days_per_week, session_length_min,
                     equipment, weaknesses, primary_goal, goal_grade, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
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
                    updated_at         = NOW();
                """,
                (
                    int(user_id),
                    data.get("experience_level"),
                    data.get("years_climbing"),
                    data.get("primary_discipline"),
                    data.get("max_grade_boulder"),
                    data.get("max_grade_route"),
                    data.get("days_per_week"),
                    data.get("session_length_min"),
                    data.get("equipment") or [],
                    data.get("weaknesses") or [],
                    data.get("primary_goal"),
                    data.get("goal_grade"),
                ),
            )
        conn.commit()


def get_profile(user_id: int) -> Optional[Dict[str, Any]]:
    """Return athlete profile as a dict, or None if not set up."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT experience_level, years_climbing, primary_discipline,
                       max_grade_boulder, max_grade_route, days_per_week, session_length_min,
                       equipment, weaknesses, primary_goal, goal_grade, updated_at
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
        "updated_at":         str(row[11]) if row[11] else None,
    }


# ---------------------------------------------------------------------------
# Training plan helpers
# ---------------------------------------------------------------------------


def save_plan(user_id: int, plan: Dict[str, Any]) -> int:
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


def get_active_plan(user_id: int) -> Optional[Dict[str, Any]]:
    """Return the active training plan as a dict, or None."""
    with _connect() as conn:
        with conn.cursor() as cur:
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


def log_training(user_id: int, data: Dict[str, Any]) -> int:
    """Insert a training log entry and return its id."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO training_logs (user_id, date, session_type, duration_min, intensity, grades_sent, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (
                    int(user_id),
                    data.get("date"),
                    data.get("session_type"),
                    data.get("duration_min"),
                    data.get("intensity"),
                    data.get("grades_sent"),
                    data.get("notes"),
                ),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    return int(new_id)


def get_training_logs(user_id: int, limit: int = 30) -> List[Dict[str, Any]]:
    """Return recent training log entries for a user, newest first."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, date, session_type, duration_min, intensity, grades_sent, notes, created_at
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
            "created_at":   str(r[7]),
        }
        for r in rows
    ]


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


def get_thread_messages(thread_id: int) -> List[Dict[str, Any]]:
    """Return all messages for a thread ordered oldest first."""
    with _connect() as conn:
        with conn.cursor() as cur:
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


def list_coach_threads() -> List[Dict[str, Any]]:
    """Admin: return all threads with user email and latest message preview."""
    with _connect() as conn:
        with conn.cursor() as cur:
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


def get_thread_by_user(user_id: int) -> Optional[Dict[str, Any]]:
    """Return thread metadata for a user, or None if they haven't messaged yet."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, status, created_at FROM coach_threads WHERE user_id = %s;",
                (int(user_id),),
            )
            row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "status": row[1], "created_at": str(row[2])}
