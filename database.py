"""
Postgres persistence helpers for CoreTriage.

Core:
- init_db(): create tables and run migrations
- create_user(email, password_hash): insert a user and return id
- get_user_by_email(email): fetch user row (id, email, password_hash)
- save_session(row): insert a session and return id
- get_session(id): fetch a single session by id
- list_sessions(user_id, limit): fetch recent sessions for a user
- delete_session(id, user_id): remove a session owned by user

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

import psycopg2
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


def init_db() -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
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
            # Migration: add user_id to existing sessions table if missing
            cur.execute(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='sessions' AND column_name='user_id'
                    ) THEN
                        ALTER TABLE sessions
                        ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
                    END IF;
                END $$;
                """
            )
            # Athlete profile (one per user, upserted in place)
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
            # Training plans — full plan stored as JSONB
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
            # Daily training log (what was actually done)
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
            # Coach messaging
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
    """Returns (id, email, password_hash) or None."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, password_hash FROM users WHERE email = %s;",
                (email,),
            )
            return cur.fetchone()


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
            "id":          r[0],
            "user_id":     r[1],
            "email":       r[2],
            "status":      r[3],
            "updated_at":  str(r[4]),
            "last_msg":    r[5],
            "last_sender": r[6],
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
