"""Hub tip engine — pattern detection + OpenAI personalization.

Public API:
  detect_pattern(user_id, today_iso) → (kind, context) | (None, None)
  generate_tip(kind, context, openai_client) → {headline, body}
  get_or_create_tip(user_id, today_iso, openai_client) → tip dict | None
  dismiss_tip(user_id, today_iso) → bool

Pattern priority (first match wins): active_rehab → overtraining → plateau → return_break.
"""
from __future__ import annotations

import json
import logging
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


logger = logging.getLogger(__name__)


# Per-kind static metadata: CTA + color. Frontend uses `color` for the
# card gradient and border.
TIP_META: Dict[str, Dict[str, Any]] = {
    "active_rehab": {
        "cta_label": "Open Body",
        "cta_route": "/body",
        "color":     "#fb7185",
    },
    "overtraining": {
        "cta_label": "Open in Chat",
        "cta_route": "/chat?topic=overtraining",
        "color":     "#f7b03a",
    },
    "plateau_4w": {
        "cta_label": "Get a drill",
        "cta_route": "/chat?topic=plateau",
        "color":     "#14b8a6",
    },
    "plateau_8w": {
        "cta_label": "Get a drill",
        "cta_route": "/chat?topic=plateau",
        "color":     "#14b8a6",
    },
    "return_break_7d":  {"cta_label": None, "cta_route": None, "color": "#fb7185"},
    "return_break_14d": {"cta_label": None, "cta_route": None, "color": "#fb7185"},
    "return_break_30d": {"cta_label": None, "cta_route": None, "color": "#fb7185"},
}


# Static fallback copy when OpenAI is unavailable. Quality is lower than
# the personalized version but the Hub never blank-renders.
FALLBACK_COPY: Dict[str, Dict[str, str]] = {
    "active_rehab": {
        "headline": "Today's rehab focus",
        "body":     "Open the Body tab for today's exercises. Keep pain at or below 3/10 and skip anything that aggravates the area.",
    },
    "overtraining": {
        "headline": "Take tomorrow off.",
        "body":     "Several climbing days in a row stack fatigue on fingers and tendons faster than you feel it. One rest day now beats a forced one later.",
    },
    "plateau_4w": {
        "headline": "Plateau detected.",
        "body":     "You've been at the same grade for a month. Mix terrain (slab vs steep), try a deload week, or pick a specific weakness drill.",
    },
    "plateau_8w": {
        "headline": "Two months at the same grade.",
        "body":     "Time to break the loop — try a structured deload, switch projecting tactics, or target one weakness for two weeks.",
    },
    "return_break_7d": {
        "headline": "Welcome back.",
        "body":     "Start easy: mobility warmup, two grades below your max, low volume. The first session always feels harder than it is.",
    },
    "return_break_14d": {
        "headline": "It's been a couple weeks.",
        "body":     "Warm up extra long today — mobility, easy traverses, then a few V0–V2s. Treat the first session as recalibration, not a benchmark.",
    },
    "return_break_30d": {
        "headline": "Long absence — ease back in.",
        "body":     "A month off means your skin, tendons, and head are all rusty. Plan two sessions a week below 80% effort before pushing.",
    },
}


def _build_prompt(kind: str, context: Dict[str, Any]) -> str:
    """Build the user message describing the situation for OpenAI."""
    if kind == "active_rehab":
        return (
            f"Climber has an active {context['injury_area']} triage from "
            f"{context['days_since']} days ago. Write a 2-sentence tip: (1) "
            f"today's rehab focus, (2) what to avoid in their next climbing "
            f"session. Direct, warm, brief."
        )
    if kind == "overtraining":
        return (
            f"Climber has logged {context['streak']} consecutive days. "
            f"Hardest send is {context['hardest_send']}. Write a 2-sentence "
            f"tip: (1) recommend rest tomorrow, (2) briefly remind why "
            f"(finger pulley fatigue, CNS recovery). Friendly, no preaching."
        )
    if kind in ("plateau_4w", "plateau_8w"):
        weeks = 4 if kind == "plateau_4w" else 8
        return (
            f"Climber has been stuck at {context['hardest_v']} for {weeks} weeks. "
            f"Write a 2-sentence tip: (1) name a likely bottleneck (power, "
            f"technique, finger strength, projecting tactics), (2) give one "
            f"concrete action for next session. Specific, no platitudes."
        )
    if kind.startswith("return_break_"):
        return (
            f"Climber hasn't logged a session in {context['days']} days. "
            f"Hardest send lifetime: {context['hardest_lifetime']}. Write a "
            f"2-sentence tip: (1) suggest an easy re-entry session "
            f"(mobility, V0–V2 warmup, low volume), (2) tell them the first "
            f"session back feels hard and that's normal. Warm, no shame."
        )
    return f"Write a brief climbing coaching tip for situation: {kind}."


_SYSTEM_PROMPT = (
    "You are a climbing coach writing a single brief coaching tip for the user's "
    "Hub dashboard. Respond with strict JSON: "
    '{"headline": "...", "body": "..."}. '
    "Headline is one short imperative sentence (≤8 words). Body is exactly 2 sentences. "
    "Tone: climber-to-climber, warm, specific, no platitudes, no emojis."
)


def generate_tip(kind: str, context: Dict[str, Any], openai_client: Optional[Any]) -> Dict[str, Any]:
    """Personalize a tip via OpenAI; fall back to static copy on any error.

    Returns: { headline, body, cta_label, cta_route, color }
    """
    meta = TIP_META.get(kind, {"cta_label": None, "cta_route": None, "color": "#94949f"})
    fb   = FALLBACK_COPY.get(kind, {"headline": "Today's focus", "body": ""})
    out  = {
        "headline":  fb["headline"],
        "body":      fb["body"],
        "cta_label": meta["cta_label"],
        "cta_route": meta["cta_route"],
        "color":     meta["color"],
    }

    if openai_client is None:
        return out

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": _build_prompt(kind, context)},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=200,
        )
        content = resp.choices[0].message.content
        parsed = json.loads(content)
        headline = (parsed.get("headline") or "").strip()
        body     = (parsed.get("body") or "").strip()
        if headline and body:
            out["headline"] = headline
            out["body"]     = body
    except Exception as e:
        logger.warning("Hub tip OpenAI generation failed for kind=%s: %s", kind, e)
        # Keep fallback copy already in `out`

    return out


def get_or_create_tip(
    user_id: int,
    today_iso: str,
    openai_client: Optional[Any],
) -> Optional[Dict[str, Any]]:
    """Cache-aware entry point. Returns the tip dict or None.

    1. If `hub_tips` has today's row and it's dismissed → return None.
    2. If `hub_tips` has today's row and kind='none' → return None (sentinel).
    3. If `hub_tips` has today's row with content → return it (cached).
    4. Otherwise: run pattern detection.
       - No match → insert sentinel kind='none' row, return None.
       - Match → call generate_tip + insert row + return tip.
    """
    existing = get_hub_tip(user_id, today_iso)
    if existing:
        if existing["dismissed_at"] or existing["kind"] in ("none", "dismissed"):
            return None
        return {
            "id":        existing["id"],
            "kind":      existing["kind"],
            "headline":  existing["headline"],
            "body":      existing["body"],
            "cta_label": existing["cta_label"],
            "cta_route": existing["cta_route"],
            "color":     existing["color"],
        }

    kind, context = detect_pattern(user_id, today_iso)
    if not kind:
        # Insert sentinel so we don't re-detect for the rest of today
        insert_hub_tip(
            user_id, today_iso,
            kind="none", headline="", body="",
            cta_label=None, cta_route=None, color="#94949f",
        )
        return None

    tip = generate_tip(kind, context, openai_client)
    new_id = insert_hub_tip(
        user_id, today_iso,
        kind=kind,
        headline=tip["headline"],
        body=tip["body"],
        cta_label=tip["cta_label"],
        cta_route=tip["cta_route"],
        color=tip["color"],
    )
    return {
        "id":        new_id,
        "kind":      kind,
        "headline":  tip["headline"],
        "body":      tip["body"],
        "cta_label": tip["cta_label"],
        "cta_route": tip["cta_route"],
        "color":     tip["color"],
    }


def dismiss_tip(user_id: int, today_iso: str) -> bool:
    """Mark today's tip as dismissed. Idempotent."""
    return dismiss_hub_tip(user_id, today_iso)
