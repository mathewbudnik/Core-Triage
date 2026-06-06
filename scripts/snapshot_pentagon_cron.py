"""
Monthly pentagon snapshot job.

Run via crontab or scheduled task on the 1st of each month at 03:00 UTC:
    0 3 1 * * cd /path/to/coretriage && /path/to/venv/bin/python -m scripts.snapshot_pentagon_cron

For each user with at least one send in the past 90 days, computes their
current pentagon and writes a row to pentagon_snapshots (idempotent per
calendar month thanks to the unique constraint).
"""
from __future__ import annotations

import datetime as dt
import logging
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("snapshot_pentagon_cron")


def run_snapshots(now: dt.datetime | None = None) -> int:
    """Snapshot every user active in the past 90 days. Returns rows written."""
    from database import _connect, save_pentagon_snapshot
    from main import _compute_archetype_py, _compute_current_pentagon

    now = now or dt.datetime.now(tz=dt.UTC)
    log.info(f"Running monthly pentagon snapshot at {now.isoformat()}")

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT user_id FROM training_logs
            WHERE created_at >= %s
            """,
            (now - dt.timedelta(days=90),),
        )
        user_ids = [r[0] for r in cur.fetchall()]

    log.info(f"Active users to snapshot: {len(user_ids)}")
    written = 0
    for user_id in user_ids:
        try:
            pentagon = _compute_current_pentagon(user_id)
            if not pentagon:
                continue
            archetype = _compute_archetype_py(pentagon)
            save_pentagon_snapshot(user_id, now, pentagon, archetype)
            written += 1
        except Exception as e:
            log.error(f"Snapshot failed for user {user_id}: {e}")
    log.info(f"Wrote {written} snapshots")
    return written


if __name__ == "__main__":
    run_snapshots()
