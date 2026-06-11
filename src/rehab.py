"""Pure rehab progress math: phase estimate, check-off streak, 7-day adherence.

No DB, no FastAPI — unit-testable and safe to import anywhere. `rehab_phase`
mirrors the frontend `lib/rehabHeuristic.js` thresholds exactly:
  Phase 1: days 0-13 (length 14), Phase 2: 14-41 (length 28), Phase 3: 42+ (length 28).

The streak/adherence are ADHERENCE signals (did the climber show up), never a
clinical recovery claim.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta


def _to_date(v) -> date | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v)
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
    except Exception:
        try:
            return date.fromisoformat(s[:10])
        except Exception:
            return None


def rehab_phase(plan_started, today=None) -> dict | None:
    """Days-since-start phase estimate. Returns
    {phase, day_in_phase (1-indexed), phase_length, days} or None."""
    start = _to_date(plan_started)
    if start is None:
        return None
    t = _to_date(today) or date.today()
    days = max(0, (t - start).days)
    if days < 14:
        phase, di, plen = 1, days, 14
    elif days < 42:
        phase, di, plen = 2, days - 14, 28
    else:
        phase, di, plen = 3, days - 42, 28
    return {"phase": phase, "day_in_phase": di + 1, "phase_length": plen, "days": days}


def rehab_streak(checkoff_dates, today: str) -> int:
    """Consecutive calendar days ending today (or yesterday — a one-day grace so a
    not-yet-done today doesn't break the streak) that have >=1 check-off."""
    s = {str(d)[:10] for d in checkoff_dates}
    t = date.fromisoformat(today)
    cur = t if t.isoformat() in s else (t - timedelta(days=1))
    if cur.isoformat() not in s:
        return 0
    streak = 0
    while cur.isoformat() in s:
        streak += 1
        cur -= timedelta(days=1)
    return streak


def rehab_last7(checkoff_dates, today: str) -> dict:
    """{count, days:[bool x7]} for the last 7 days incl. today, oldest -> newest."""
    s = {str(d)[:10] for d in checkoff_dates}
    t = date.fromisoformat(today)
    days = [(t - timedelta(days=i)).isoformat() in s for i in range(6, -1, -1)]
    return {"count": sum(days), "days": days}
