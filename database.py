"""
Postgres persistence helpers for CoreTriage.

- init_db(): create table if it doesn't exist
- save_session(row): insert a session and return id
- get_session(id): fetch a single session by id
- list_sessions(limit): fetch recent sessions
- delete_session(id): remove a session by id
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
                CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    injury_area TEXT NOT NULL,
                    pain_level INT,
                    pain_type TEXT,
                    onset TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
        conn.commit()


def save_session(row: Dict[str, Any]) -> int:
    injury_area = row.get("injury_area")
    pain_level = row.get("pain_level")
    pain_type = row.get("pain_type")
    onset = row.get("onset")

    if not injury_area:
        raise ValueError("row['injury_area'] is required")

    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sessions (injury_area, pain_level, pain_type, onset)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
                """,
                (injury_area, pain_level, pain_type, onset),
            )
            new_id = cur.fetchone()[0]
        conn.commit()

    return int(new_id)


def get_session(session_id: int) -> Optional[Tuple[Any, ...]]:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, injury_area, pain_level, pain_type, onset, created_at
                FROM sessions
                WHERE id = %s;
                """,
                (int(session_id),),
            )
            return cur.fetchone()


def list_sessions(limit: int = 50) -> List[Tuple[Any, ...]]:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, injury_area, pain_level, pain_type, onset, created_at
                FROM sessions
                ORDER BY created_at DESC
                LIMIT %s;
                """,
                (int(limit),),
            )
            return cur.fetchall()


def delete_session(session_id: int) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM sessions WHERE id = %s;", (int(session_id),))
        conn.commit()
