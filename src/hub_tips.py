"""Hub tip engine — pattern detection + OpenAI personalization.

Public API:
  detect_pattern(user_id, today_iso) → (kind, context) | (None, None)
  generate_tip(kind, context, openai_client) → {headline, body}
  get_or_create_tip(user_id, today_iso, openai_client) → tip dict | None
  dismiss_tip(user_id, today_iso) → bool

Pattern priority (first match wins): active_rehab → overtraining → plateau → return_break.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, Optional, Tuple

from database import (
    _connect,
    compute_streak,
    dismiss_hub_tip,
    get_hub_tip,
    get_user_hardest,
    insert_hub_tip,
)


REHAB_REGIONS = {
    "Finger", "Wrist", "Elbow", "Shoulder", "Knee", "Hip", "Ankle",
    "Chest", "Abs", "Neck", "Triceps", "Lats", "Glutes", "Hamstrings",
    "Calves", "Lower Back", "Upper Back", "General",
}


# ── Detection rules ───────────────────────────────────────────────────


def _detect_active_rehab(user_id: int, today_iso: str) -> Tuple[bool, Dict[str, Any]]:
    """Match if user has a triage within 90 days where injury_area is in
    REHAB_REGIONS."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT injury_area, created_at
                FROM sessions
                WHERE user_id = %s
                  AND created_at >= NOW() - INTERVAL '90 days'
                ORDER BY created_at DESC
                LIMIT 1;
                """,
                (int(user_id),),
            )
            row = cur.fetchone()
    if not row:
        return False, {}
    injury_area, created_at = row
    if injury_area not in REHAB_REGIONS:
        return False, {}
    days_since = (date.today() - created_at.date()).days
    return True, {"injury_area": injury_area, "days_since": days_since}


def _detect_overtraining(user_id: int, today_iso: str) -> Tuple[bool, Dict[str, Any]]:
    """Match if compute_streak >= 5 days."""
    streak = compute_streak(user_id, today=today_iso)
    if streak < 5:
        return False, {}
    hardest = get_user_hardest(user_id, window="all")
    return True, {
        "streak": streak,
        "hardest_send": hardest.get("boulder") or hardest.get("route") or "no logged sends",
    }


def _detect_plateau(user_id: int, today_iso: str) -> Tuple[bool, Dict[str, Any]]:
    """Match if hardest_send_per_week has been the same V-grade for the
    last 4+ calendar weeks. Returns kind 'plateau_4w' or 'plateau_8w'."""
    # Get hardest boulder send per ISO week for the last 12 weeks
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    date_trunc('week', tl.date)::date AS wk,
                    MAX(CAST(SUBSTRING(grade FROM 2) AS INTEGER)) AS max_v
                FROM training_logs tl,
                     LATERAL jsonb_each(tl.climbs -> 'boulder') AS pairs(grade, val)
                WHERE tl.user_id = %s
                  AND tl.date >= (CURRENT_DATE - INTERVAL '12 weeks')
                  AND (val ->> 's')::int > 0
                GROUP BY wk
                ORDER BY wk DESC;
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
    if len(rows) < 4:
        return False, {}
    # Check whether the most recent 4 weeks all have the same max V-grade
    recent_maxes = [r[1] for r in rows[:4]]
    if len(set(recent_maxes)) != 1:
        return False, {}
    stuck_v = recent_maxes[0]
    # Check whether it goes back 8 weeks
    weeks = 4
    if len(rows) >= 8 and all(r[1] == stuck_v for r in rows[:8]):
        weeks = 8
    return True, {
        "hardest_v": f"V{stuck_v}",
        "weeks": weeks,
    }


def _detect_return_break(user_id: int, today_iso: str) -> Tuple[bool, Dict[str, Any]]:
    """Match if days_since_last_log >= 7. Bands: 7d / 14d / 30d."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT MAX(date) FROM training_logs WHERE user_id = %s;
                """,
                (int(user_id),),
            )
            r = cur.fetchone()
    last = r[0] if r else None
    if not last:
        return False, {}
    today = date.fromisoformat(today_iso)
    days = (today - last).days
    if days < 7:
        return False, {}
    band = "30d" if days >= 30 else ("14d" if days >= 14 else "7d")
    hardest = get_user_hardest(user_id, window="all")
    return True, {
        "days": days,
        "band": band,
        "hardest_lifetime": hardest.get("boulder") or hardest.get("route") or "no logged sends",
    }


# Priority resolver — first match wins
_PRIORITY = [
    ("active_rehab",  _detect_active_rehab),
    ("overtraining",  _detect_overtraining),
    ("plateau",       _detect_plateau),
    ("return_break",  _detect_return_break),
]


def detect_pattern(user_id: int, today_iso: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """Run detectors in priority order; return (kind, context) or (None, None).

    For plateau, kind is 'plateau_4w' or 'plateau_8w' (refined from context).
    For return_break, kind is 'return_break_7d' / '14d' / '30d'.
    """
    for kind, fn in _PRIORITY:
        matched, ctx = fn(user_id, today_iso)
        if matched:
            if kind == "plateau":
                kind = f"plateau_{ctx['weeks']}w"
            elif kind == "return_break":
                kind = f"return_break_{ctx['band']}"
            return kind, ctx
    return None, None
