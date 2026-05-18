"""User context for chat personalization.

Builds a small structured snapshot of who's chatting — grade, recent
sends, training streak, active rehab — so the system prompt can ground
answers in the user's actual climbing. Without this, the model gives
the same generic answer to a V2 gym climber and a V10 outdoor climber.

Public API:
  build_user_context(user_id)       → dict | None     — structured fields
  format_for_prompt(ctx)            → str             — system-prompt block
"""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, Optional

from database import (
    compute_streak,
    get_profile,
    get_user_hardest,
    list_sessions,
)


# Triage regions that imply an active rehab plan. Matches what /body uses.
_REHAB_REGIONS = {
    "Finger", "Wrist", "Elbow", "Shoulder", "Knee", "Hip", "Ankle",
    "Chest", "Abs", "Neck", "Lower Back", "Upper Back",
}


def build_user_context(user_id: int) -> Optional[Dict[str, Any]]:
    """Return a structured context dict, or None if the user has no usable
    data yet. Each field is independently optional — a brand-new account
    might only have a display name."""
    if not user_id:
        return None

    ctx: Dict[str, Any] = {}

    profile = get_profile(user_id) or {}
    name = profile.get("display_name") or profile.get("name")
    if name:
        ctx["display_name"] = name

    # Recent hardest (rolling 30d) and all-time hardest. Both useful — recent
    # tells us where they're working, all-time tells us their experience ceiling.
    recent = get_user_hardest(user_id, window="month") or {}
    alltime = get_user_hardest(user_id, window="all") or {}

    if recent.get("boulder") or recent.get("route"):
        ctx["recent_hardest"] = {
            "boulder": recent.get("boulder"),
            "route":   recent.get("route"),
        }
    if alltime.get("boulder") or alltime.get("route"):
        ctx["alltime_hardest"] = {
            "boulder": alltime.get("boulder"),
            "route":   alltime.get("route"),
        }

    today_iso = date.today().isoformat()
    try:
        streak = int(compute_streak(user_id, today=today_iso) or 0)
        if streak > 0:
            ctx["streak_days"] = streak
    except Exception:  # noqa: BLE001 — never let context blow up the chat
        pass

    # Most recent triage (treat anything <= 90 days old as still relevant).
    try:
        sessions = list_sessions(user_id, limit=1) or []
        if sessions:
            sess = sessions[0]
            # list_sessions row shape: (id, injury_area, pain_level, pain_type, onset, created_at)
            injury_area = sess[1]
            created_at = sess[5]
            if hasattr(created_at, "date"):
                days_since = (date.today() - created_at.date()).days
                if days_since <= 90 and injury_area in _REHAB_REGIONS:
                    ctx["active_rehab"] = {
                        "injury_area": injury_area,
                        "days_since":  days_since,
                    }
    except Exception:  # noqa: BLE001
        pass

    return ctx or None


def format_for_prompt(ctx: Optional[Dict[str, Any]]) -> str:
    """Render the context block for system-prompt injection. Returns ''
    if the context is empty or None."""
    if not ctx:
        return ""

    lines = []
    if (name := ctx.get("display_name")):
        lines.append(f"- Name: {name}")

    recent = ctx.get("recent_hardest") or {}
    parts = []
    if recent.get("boulder"): parts.append(f"{recent['boulder']} boulder")
    if recent.get("route"):   parts.append(f"{recent['route']} route")
    if parts:
        lines.append(f"- Hardest send (last 30 days): {', '.join(parts)}")

    alltime = ctx.get("alltime_hardest") or {}
    parts = []
    if alltime.get("boulder"): parts.append(f"{alltime['boulder']} boulder")
    if alltime.get("route"):   parts.append(f"{alltime['route']} route")
    # Only mention all-time if different from recent (otherwise it's noise).
    recent_b = recent.get("boulder")
    recent_r = recent.get("route")
    alltime_b = alltime.get("boulder")
    alltime_r = alltime.get("route")
    if parts and (alltime_b != recent_b or alltime_r != recent_r):
        lines.append(f"- All-time hardest: {', '.join(parts)}")

    if (streak := ctx.get("streak_days")):
        lines.append(f"- Current training streak: {streak} day(s)")

    rehab = ctx.get("active_rehab")
    if rehab:
        days = rehab["days_since"]
        when = "today" if days == 0 else f"{days} day(s) ago"
        lines.append(f"- Most recent triage: {rehab['injury_area']} ({when})")

    if not lines:
        return ""

    header = "USER CONTEXT (ground specifics in this data when relevant; do not quote it back verbatim)"
    return header + "\n" + "\n".join(lines) + "\n"
