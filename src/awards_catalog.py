"""Award catalog + engine — predicates that decide when each award unlocks.

Each catalog entry is a dict: { kind, category, label, predicate }.
`predicate(uid, today_iso)` returns `(unlocked: bool, payload: dict)`.

`detect_new_awards(uid, today_iso)` runs every catalog entry against the
user's current state, inserts unlocked entries via `insert_award`, and
returns the list of newly-inserted rows.
"""
from __future__ import annotations

from typing import Any, Callable, Dict, List, Tuple

from database import (
    _connect,
    count_sends,
    compute_streak,
    insert_award,
    list_awards,
)


# ── Predicates ─────────────────────────────────────────────────────────


def _user_has_send_at_v(uid: int, target_v: str) -> bool:
    """True if user has any send at the given V-grade across all logs."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM training_logs
                WHERE user_id = %s
                  AND (climbs -> 'boulder' -> %s ->> 's')::int > 0
                LIMIT 1;
                """,
                (int(uid), target_v),
            )
            return cur.fetchone() is not None


def _user_has_any_flash(uid: int) -> bool:
    """True if user has any flash logged in any discipline / any grade."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT climbs FROM training_logs
                WHERE user_id = %s AND climbs <> '{}'::jsonb;
                """,
                (int(uid),),
            )
            for (climbs,) in cur.fetchall():
                for discipline in ("boulder", "route"):
                    for c in (climbs or {}).get(discipline, {}).values():
                        if int(c.get("f", 0) or 0) > 0:
                            return True
    return False


def _make_first_send_predicate(target_v: str, label: str) -> Callable:
    def pred(uid: int, today_iso: str):
        if _user_has_send_at_v(uid, target_v):
            return True, {"grade": target_v}
        return False, {}
    pred.__name__ = f"pred_first_send_{target_v.lower()}"
    return pred


def _make_streak_predicate(n_days: int) -> Callable:
    def pred(uid: int, today_iso: str):
        streak = compute_streak(uid, today=today_iso)
        return streak >= n_days, {"days": streak}
    pred.__name__ = f"pred_streak_{n_days}d"
    return pred


def _make_volume_predicate(n_sends: int) -> Callable:
    def pred(uid: int, today_iso: str):
        total = count_sends(uid)
        return total >= n_sends, {"sends": total}
    pred.__name__ = f"pred_volume_{n_sends}"
    return pred


def _pred_first_flash(uid: int, today_iso: str):
    if _user_has_any_flash(uid):
        return True, {}
    return False, {}


# ── Catalog ────────────────────────────────────────────────────────────

AWARD_CATALOG: List[Dict[str, Any]] = [
    # Grade milestones — V3 through V10+
    *[
        {"kind": f"first_send_v{n}", "category": "grade",
         "label": f"First V{n}", "predicate": _make_first_send_predicate(f"V{n}", f"First V{n}")}
        for n in (3, 4, 5, 6, 7, 8, 9, 10)
    ],
    # Streak milestones
    {"kind": "streak_3d",   "category": "streak", "label": "3-day streak",   "predicate": _make_streak_predicate(3)},
    {"kind": "streak_10d",  "category": "streak", "label": "10-day streak",  "predicate": _make_streak_predicate(10)},
    {"kind": "streak_30d",  "category": "streak", "label": "30-day streak",  "predicate": _make_streak_predicate(30)},
    {"kind": "streak_100d", "category": "streak", "label": "100-day streak", "predicate": _make_streak_predicate(100)},
    # Volume milestones
    {"kind": "volume_10",   "category": "volume", "label": "10 sends",   "predicate": _make_volume_predicate(10)},
    {"kind": "volume_30",   "category": "volume", "label": "30 sends",   "predicate": _make_volume_predicate(30)},
    {"kind": "volume_50",   "category": "volume", "label": "50 sends",   "predicate": _make_volume_predicate(50)},
    {"kind": "volume_100",  "category": "volume", "label": "100 sends",  "predicate": _make_volume_predicate(100)},
    {"kind": "volume_500",  "category": "volume", "label": "500 sends",  "predicate": _make_volume_predicate(500)},
    # Style milestones
    {"kind": "first_flash", "category": "style",  "label": "First flash", "predicate": _pred_first_flash},
]


def detect_new_awards(uid: int, today_iso: str) -> List[Dict[str, Any]]:
    """Run every catalog predicate. For each that unlocks AND isn't already
    in `awards`, insert it and return the new rows."""
    earned_kinds = {a["kind"] for a in list_awards(uid)}
    new_awards: List[Dict[str, Any]] = []
    for entry in AWARD_CATALOG:
        if entry["kind"] in earned_kinds:
            continue
        unlocked, payload = entry["predicate"](uid, today_iso)
        if unlocked:
            insert_award(uid, entry["kind"], payload)
            new_awards.append({
                "kind": entry["kind"],
                "label": entry["label"],
                "category": entry["category"],
                "payload": payload,
            })
    return new_awards
