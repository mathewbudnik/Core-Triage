"""Synthetic climber accounts used to bootstrap the Train-tab leaderboard.

These accounts are inserted into the `users` table with is_seed=TRUE. They
have un-loginable bcrypt hashes (random bytes, no recoverable password) and
no working email. They appear naturally on the leaderboard via the existing
query — no special-casing in the API layer.

Spec: docs/superpowers/specs/2026-05-13-leaderboard-seed-climbers-design.md

EXCLUSION POINTS (where is_seed users must NOT appear):
- Login flow (defense-in-depth early return in main.py auth handler)
- Coach messaging routing (skip seed users — no inbox)
- Email sending (verification, password reset, marketing)
- User-count business metrics (admin dashboards, billing aggregates)
- Stripe / billing code paths (no seed user reaches them — no login)

TEARDOWN: `DELETE FROM users WHERE is_seed = TRUE;` cascades to
athlete_profiles, training_logs, seed_progression via FK.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class Persona:
    handle: str                            # display_name
    cohort: str                            # beginner | intermediate | advanced | elite
    avatar_icon: str                       # one of the existing avatar preset keys
    avatar_color: str                      # one of the existing palette swatches
    sessions_per_week: float               # avg, used for daily-tick probability
    session_min_range: tuple[int, int]     # min/max duration_min per session
    intensity_weights: dict[int, float]    # 1..5 → relative probability
    grade_pool: list[str]                  # grades_sent draws from this list
    session_types: list[tuple[str, float]] # (type, weight)
    rest_week_probability: float           # 0..1 chance a whole week is off


# Avatar preset/color keys reused from the existing profile customization
# (see _add_column_if_missing for users.avatar_icon and users.avatar_color
# around database.py:161-164). The exact keys here must match the frontend
# avatar palette — if you add a new preset and want it on a seed climber,
# add the key here.
_DEFAULT_SESSION_TYPES = [
    ("bouldering", 3.0),
    ("route_climbing", 2.0),
    ("hangboard", 1.0),
    ("antagonist", 1.0),
]

_HEAVY_BOULDERING = [
    ("bouldering", 4.0),
    ("hangboard", 2.0),
    ("antagonist", 1.0),
]


SEED_PERSONAS: list[Persona] = [
    # ── Beginners (3) ────────────────────────────────────────────────────
    Persona(
        handle="Mira K.",       cohort="beginner",
        avatar_icon="flame",    avatar_color="teal",
        sessions_per_week=2.0,  session_min_range=(45, 75),
        intensity_weights={1: 1, 2: 3, 3: 4, 4: 1, 5: 0},
        grade_pool=["V0", "V1", "V2", "5.7", "5.8"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.10,
    ),
    Persona(
        handle="Reza A.",       cohort="beginner",
        avatar_icon="mountain", avatar_color="amber",
        sessions_per_week=2.0,  session_min_range=(45, 70),
        intensity_weights={1: 2, 2: 3, 3: 3, 4: 1, 5: 0},
        grade_pool=["V0", "V1", "V2", "5.8", "5.9"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.10,
    ),
    Persona(
        handle="Lior B.",       cohort="beginner",
        avatar_icon="leaf",     avatar_color="green",
        sessions_per_week=2.5,  session_min_range=(50, 80),
        intensity_weights={1: 1, 2: 3, 3: 4, 4: 2, 5: 0},
        grade_pool=["V1", "V2", "V3", "5.8", "5.9"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.08,
    ),
    # ── Intermediates (3) ────────────────────────────────────────────────
    Persona(
        handle="Eshan P.",      cohort="intermediate",
        avatar_icon="bolt",     avatar_color="indigo",
        sessions_per_week=3.0,  session_min_range=(60, 90),
        intensity_weights={1: 1, 2: 2, 3: 4, 4: 3, 5: 1},
        grade_pool=["V3", "V4", "V5", "5.10a", "5.10b"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.07,
    ),
    Persona(
        handle="Yuki H.",       cohort="intermediate",
        avatar_icon="wave",     avatar_color="cyan",
        sessions_per_week=3.0,  session_min_range=(65, 95),
        intensity_weights={1: 0, 2: 2, 3: 4, 4: 3, 5: 1},
        grade_pool=["V3", "V4", "V5", "5.10b", "5.10c"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.07,
    ),
    Persona(
        handle="Tomi V.",       cohort="intermediate",
        avatar_icon="anchor",   avatar_color="rose",
        sessions_per_week=3.0,  session_min_range=(70, 100),
        intensity_weights={1: 0, 2: 1, 3: 4, 4: 4, 5: 1},
        grade_pool=["V4", "V5", "V6", "5.10c", "5.10d"],
        session_types=_DEFAULT_SESSION_TYPES,
        rest_week_probability=0.05,
    ),
    # ── Advanced (3) ─────────────────────────────────────────────────────
    Persona(
        handle="Ariadne L.",    cohort="advanced",
        avatar_icon="diamond",  avatar_color="violet",
        sessions_per_week=3.5,  session_min_range=(75, 100),
        intensity_weights={1: 0, 2: 1, 3: 3, 4: 4, 5: 2},
        grade_pool=["V5", "V6", "V7", "5.11a", "5.11b"],
        session_types=_HEAVY_BOULDERING,
        rest_week_probability=0.05,
    ),
    Persona(
        handle="Linnea S.",     cohort="advanced",
        avatar_icon="star",     avatar_color="gold",
        sessions_per_week=3.5,  session_min_range=(80, 105),
        intensity_weights={1: 0, 2: 1, 3: 3, 4: 4, 5: 2},
        grade_pool=["V5", "V6", "V7", "5.11b", "5.11c"],
        session_types=_HEAVY_BOULDERING,
        rest_week_probability=0.05,
    ),
    Persona(
        handle="Beck M.",       cohort="advanced",
        avatar_icon="compass",  avatar_color="slate",
        sessions_per_week=4.0,  session_min_range=(75, 95),
        intensity_weights={1: 0, 2: 1, 3: 3, 4: 5, 5: 2},
        grade_pool=["V6", "V7", "V8", "5.11c", "5.11d"],
        session_types=_HEAVY_BOULDERING,
        rest_week_probability=0.04,
    ),
    # ── Elite (1) ────────────────────────────────────────────────────────
    Persona(
        handle="Jasper M.",     cohort="elite",
        avatar_icon="crown",    avatar_color="crimson",
        sessions_per_week=5.0,  session_min_range=(80, 105),
        intensity_weights={1: 0, 2: 0, 3: 2, 4: 5, 5: 4},
        grade_pool=["V7", "V8", "V9", "5.12a", "5.12b"],
        session_types=_HEAVY_BOULDERING,
        rest_week_probability=0.03,
    ),
]


def _weighted_choice(weights: dict[int, float], rng: random.Random) -> int:
    """Pick a key from a weight-dict (key → relative weight)."""
    keys = list(weights.keys())
    w = [weights[k] for k in keys]
    return rng.choices(keys, weights=w, k=1)[0]


def _weighted_type(types: list[tuple[str, float]], rng: random.Random) -> str:
    return rng.choices([t for t, _ in types], weights=[w for _, w in types], k=1)[0]


def _pick_grades(grade_pool: list[str], rng: random.Random) -> str:
    """1-2 grades from the pool, comma-joined. Climbers usually log
    a couple of sends per session, not a full pyramid."""
    n = rng.choice([1, 1, 1, 2])  # weighted toward 1
    picks = rng.sample(grade_pool, k=min(n, len(grade_pool)))
    return ", ".join(picks)


def _pick_climbs(grade_pool: list[str], rng: random.Random) -> dict:
    """Structured climbs payload matching the persona's grade pool.
    Mirrors the shape produced by the climb log frontend: per-discipline
    grade buckets with {s, f, p} counters. Each session logs 1-2 grades
    with 1-3 sends each. Drives the sends-based leaderboard."""
    n = rng.choice([1, 1, 2])
    picks = rng.sample(grade_pool, k=min(n, len(grade_pool)))
    out: dict[str, dict[str, dict[str, int]]] = {}
    for g in picks:
        if g.startswith("V"):
            bucket = out.setdefault("boulder", {})
        else:
            bucket = out.setdefault("route", {})
        sends = rng.randint(1, 3)
        flashes = 1 if rng.random() < 0.15 else 0
        if flashes > sends:
            flashes = sends
        bucket[g] = {"s": sends, "f": flashes, "p": 0}
    return out


def _per_day_probability(persona: Persona) -> float:
    """Daily probability of training, capped at 0.95 to avoid certainty."""
    return min(0.95, persona.sessions_per_week / 7.0)


def _stable_seed(*parts) -> int:
    """SHA-256-based deterministic seed.

    Unlike Python's built-in `hash()` (which is randomized per process via
    PYTHONHASHSEED), this produces the same integer for the same inputs across
    separate script invocations. Required so re-running the init script
    inserts the same dates and ON CONFLICT correctly de-duplicates.
    """
    key = "|".join(str(p) for p in parts).encode("utf-8")
    return int(hashlib.sha256(key).hexdigest()[:8], 16)


def generate_initial_history(
    persona: Persona,
    days: int = 30,
    today: date | None = None,
    rng_seed: int | None = None,
) -> list[dict]:
    """Generate ~`days` days of training_logs for a persona, walking back from `today`.

    Returns a list of dicts ready to be inserted into the training_logs table.
    Each dict has: date, session_type, duration_min, intensity, grades_sent, notes.

    Idempotent in the sense that any (user_id, date) deduplication happens at
    the SQL layer (UNIQUE INDEX) — the generator itself yields at most one
    session per day.
    """
    if today is None:
        today = date.today()
    # Use a deterministic seed per-persona-per-window so re-running yields
    # the same backfill (avoids stochastic drift between runs).
    seed = rng_seed if rng_seed is not None else _stable_seed(persona.handle, days, today.toordinal())
    rng = random.Random(seed)

    rows: list[dict] = []
    per_day_p = _per_day_probability(persona)

    # Determine "rest weeks" up front so the pattern is realistic.
    rest_weeks = set()
    week_count = (days // 7) + 1
    for wk in range(week_count):
        if rng.random() < persona.rest_week_probability:
            rest_weeks.add(wk)

    for offset in range(days):
        d = today - timedelta(days=offset)
        week_index = offset // 7
        if week_index in rest_weeks:
            continue
        if rng.random() > per_day_p:
            continue
        duration = rng.randint(persona.session_min_range[0], persona.session_min_range[1])
        intensity = _weighted_choice(persona.intensity_weights, rng)
        stype = _weighted_type(persona.session_types, rng)
        grades = _pick_grades(persona.grade_pool, rng)
        climbs = _pick_climbs(persona.grade_pool, rng)
        rows.append({
            "date": d,
            "session_type": stype,
            "duration_min": duration,
            "intensity": intensity,
            "grades_sent": grades,
            "climbs": climbs,
            "notes": "",
        })
    return rows


def generate_today_session(
    persona: Persona,
    today: date | None = None,
    rng_seed: int | None = None,
) -> dict | None:
    """Probabilistically generate ONE training_log for today, or None if
    today is a rest day for this persona. Used by the daily tick script."""
    if today is None:
        today = date.today()
    # Deterministic per-persona-per-day seed so re-running the tick same day
    # makes the same choice (helps with idempotency even before the SQL
    # UNIQUE-INDEX layer kicks in).
    seed = rng_seed if rng_seed is not None else _stable_seed(persona.handle, today.toordinal())
    rng = random.Random(seed)

    if rng.random() > _per_day_probability(persona):
        return None

    return {
        "date": today,
        "session_type": _weighted_type(persona.session_types, rng),
        "duration_min": rng.randint(persona.session_min_range[0], persona.session_min_range[1]),
        "intensity": _weighted_choice(persona.intensity_weights, rng),
        "grades_sent": _pick_grades(persona.grade_pool, rng),
        "climbs": _pick_climbs(persona.grade_pool, rng),
        "notes": "",
    }
