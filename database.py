"""
Postgres persistence helpers for CoreTriage.

- init_db(): create tables and run migrations
- create_user(email, password_hash): insert a user and return id
- get_user_by_email(email): fetch user row (id, email, password_hash)
- save_session(row): insert a session and return id
- get_session(id): fetch a single session by id
- list_sessions(user_id, limit): fetch recent sessions for a user
- delete_session(id, user_id): remove a session owned by user
"""

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
