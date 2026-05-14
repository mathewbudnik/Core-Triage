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

from dataclasses import dataclass
from typing import Tuple, Dict, List


@dataclass(frozen=True)
class Persona:
    handle: str                            # display_name
    cohort: str                            # beginner | intermediate | advanced | elite
    avatar_icon: str                       # one of the existing avatar preset keys
    avatar_color: str                      # one of the existing palette swatches
    sessions_per_week: float               # avg, used for daily-tick probability
    session_min_range: Tuple[int, int]     # min/max duration_min per session
    intensity_weights: Dict[int, float]    # 1..5 → relative probability
    grade_pool: List[str]                  # grades_sent draws from this list
    session_types: List[Tuple[str, float]] # (type, weight)
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


SEED_PERSONAS: List[Persona] = [
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
