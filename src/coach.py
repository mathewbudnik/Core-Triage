"""
CoreTriage coaching engine.

generate_plan(profile, injury_flags, openai_client=None) -> plan dict

Plan structure follows the SESSION_SCHEMA defined in the architecture plan:
- Sessions indexed by session_index + week + day_in_week (not day names)
- Every exercise has: exercise, detail, sets, reps, rest_seconds, effort_note, benchmark
- Injury flags gate certain exercise types (hangboard, heel-hooks, etc.)
- GPT-4o used for coach_note if client available, otherwise falls back to static text
"""

from __future__ import annotations

import json
from datetime import date
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Exercise selection helpers
# ---------------------------------------------------------------------------

_EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "elite"]

_TAG_KEYS = ("disciplines", "min_experience", "max_experience", "equipment_needed")


def _filter_exercises(
    pool: List[Dict],
    experience: str,
    discipline: str,
    equipment: List[str],
) -> List[Dict]:
    """Return entries from `pool` that match all four constraints.

    Filtering is conjunctive: experience window AND discipline AND equipment.
    Order is preserved — pool authors control priority via list order.
    Returns an empty list if nothing matches. Callers should use
    `_select_with_fallback` if they want a graceful degradation chain.
    """
    user_idx = _EXPERIENCE_LEVELS.index(experience)
    out: List[Dict] = []
    for ex in pool:
        min_idx = _EXPERIENCE_LEVELS.index(ex["min_experience"])
        max_idx = _EXPERIENCE_LEVELS.index(ex.get("max_experience", "elite"))
        if not (min_idx <= user_idx <= max_idx):
            continue
        if discipline not in ex["disciplines"]:
            continue
        needed = ex.get("equipment_needed", [])
        if needed and not any(e in equipment for e in needed):
            continue
        out.append(ex)
    return out


def _select_with_fallback(
    pool: List[Dict],
    experience: str,
    discipline: str,
    equipment: List[str],
    n: int,
) -> List[Dict]:
    """Pick up to `n` exercises from `pool` with graceful fallback.

    Tries the strict filter first. If it returns empty:
    1. Drop the equipment filter (user has gear gaps but exercise still valuable)
    2. Drop the discipline filter (give them a generic, common-sense alternative)

    Always strips tag fields from the returned dicts so the generated plan
    dict matches the legacy shape. Returns an empty list only if no exercise
    in the pool matches the user's experience level at all (caller bug).
    """
    # Step 1: strict filter
    strict = _filter_exercises(pool, experience, discipline, equipment)
    if strict:
        return [_strip_tags(ex) for ex in strict[:n]]
    # Step 2: relax equipment — same filter minus the equipment step
    user_idx = _EXPERIENCE_LEVELS.index(experience)
    relaxed_equipment: List[Dict] = []
    for ex in pool:
        min_idx = _EXPERIENCE_LEVELS.index(ex["min_experience"])
        max_idx = _EXPERIENCE_LEVELS.index(ex.get("max_experience", "elite"))
        if not (min_idx <= user_idx <= max_idx):
            continue
        if discipline not in ex["disciplines"]:
            continue
        relaxed_equipment.append(ex)
    if relaxed_equipment:
        return [_strip_tags(ex) for ex in relaxed_equipment[:n]]
    # Step 3: relax discipline too — only experience window remains
    relaxed_all: List[Dict] = []
    for ex in pool:
        min_idx = _EXPERIENCE_LEVELS.index(ex["min_experience"])
        max_idx = _EXPERIENCE_LEVELS.index(ex.get("max_experience", "elite"))
        if not (min_idx <= user_idx <= max_idx):
            continue
        relaxed_all.append(ex)
    return [_strip_tags(ex) for ex in relaxed_all[:n]]


def _strip_tags(exercise: Dict) -> Dict:
    """Return a copy of `exercise` with tag-only fields removed.

    The tag fields (`disciplines`, `min_experience`, `max_experience`,
    `equipment_needed`) are authoring metadata for selection logic; they
    don't belong in the generated plan dict that gets saved to the database
    and rendered in the UI.
    """
    return {k: v for k, v in exercise.items() if k not in _TAG_KEYS}


# ---------------------------------------------------------------------------
# Exercise library blocks
# ---------------------------------------------------------------------------

_HANGBOARD_POOL: List[Dict] = [
    {
        "exercise": "One-arm lock-off hangs",
        "detail": "Assisted one-arm on 20mm, assistance via pulley or foot loop",
        "sets": 4,
        "reps": "5s per arm",
        "rest_seconds": 120,
        "effort_note": "Reduce assistance each session — track assistance weight",
        "benchmark": "Goal: unassisted 5s one-arm hang within 6–8 weeks",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "elite",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Max-weight pinch hangs",
        "detail": "Pinch block or wide pinch on board, add weight",
        "sets": 5,
        "reps": "10s on / 50s off",
        "rest_seconds": 180,
        "effort_note": "Target ≥ 120% body weight across all grip positions over the mesocycle",
        "benchmark": "Elite: pinch at bodyweight is the baseline — train beyond",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "advanced",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Repeaters (7s on / 3s off)",
        "detail": "20mm edge, half-crimp or open-hand, bodyweight. 6 reps continuous = one set.",
        "sets": 4,
        "reps": "6 × (7s on / 3s off)",
        "rest_seconds": 180,
        "effort_note": "By the last 2 reps of each set you should be near failure. Pick edge depth and grip type accordingly.",
        "benchmark": "The classic endurance hangboard protocol. Build to 6 reps clean before adding weight.",
        "disciplines": ["sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "10-second endurance hangs",
        "detail": "20mm edge, half-crimp, at +50–60% body weight added (or bodyweight if that's enough). Long-duration capacity work.",
        "sets": 5,
        "reps": "10s on / 30s off",
        "rest_seconds": 180,
        "effort_note": "Sustainable hangs — should feel like the 8th rep of a normal set, not a max-effort hang.",
        "benchmark": "Sport-climbing analogue of route-length grip endurance. Progress by reducing rest before adding weight.",
        "disciplines": ["sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Max-weight half-crimp hangs",
        "detail": "20mm edge, add weight via belt/vest",
        "sets": 5,
        "reps": "10s on / 50s off",
        "rest_seconds": 180,
        "effort_note": "True max — you should barely complete 10s. Log the added weight.",
        "benchmark": "Intermediate: typically +5–15 kg on 20mm at 10s",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Open-hand density hangs",
        "detail": "18mm edge, open hand, bodyweight",
        "sets": 4,
        "reps": "6 × (7s on / 3s off)",
        "rest_seconds": 180,
        "effort_note": "Accumulate time under tension — pace yourself evenly across all 6 reps",
        "benchmark": "If you can't complete 6 reps, drop to 5 and build over weeks",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Half-crimp hangs",
        "detail": "Shoulder-width on 20mm edge, half-crimp grip",
        "sets": 4,
        "reps": "7s on / 3s off",
        "rest_seconds": 120,
        "effort_note": "~80% of max — you should be able to complete all reps but feel challenged",
        "benchmark": "Beginner target: hang 7s at 80–90% body weight on a 20mm edge",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "max_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "Open-hand hangs",
        "detail": "Same edge, open-hand position — gentler on pulleys",
        "sets": 3,
        "reps": "7s on / 3s off",
        "rest_seconds": 120,
        "effort_note": "Should feel distinct from half-crimp — don't white-knuckle",
        "benchmark": "This position recruits the A2 pulley less — use it as a recovery set",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "max_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
]


def _hangboard_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_HANGBOARD_POOL, experience, discipline, equipment, n=2)


_POWER_POOL: List[Dict] = [
    {
        "exercise": "Campus board 1-5-8",
        "detail": "Max-distance campus ladders, both arms",
        "sets": 6,
        "reps": "3 ladders each arm",
        "rest_seconds": 240,
        "effort_note": "Full rest between sets — this is CNS-intensive, don't rush",
        "benchmark": "Advanced/elite: 1-5-8 is baseline. 1-5-9 is the benchmark for elite fingerboarders.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "advanced",
        "equipment_needed": ["campus_board"],
    },
    {
        "exercise": "Frog hops on the board",
        "detail": "Use moonboard or system board. Both hands matched on a starting hold, jump to a higher matched position, settle, repeat.",
        "sets": 5,
        "reps": "4 reps per set",
        "rest_seconds": 180,
        "effort_note": "Maintains symmetrical max-power output across multiple matches. Each rep should feel near max.",
        "benchmark": "Boulder-focused power-endurance variant — uses real holds rather than the campus board.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["home_wall", "system_wall"],
    },
    {
        "exercise": "Campus board 1-3-5",
        "detail": "Start on rung 1, skip to 3, skip to 5. No feet.",
        "sets": 5,
        "reps": "3 ladders each arm leading",
        "rest_seconds": 180,
        "effort_note": "Each move should feel explosive — if it's slow, rest more",
        "benchmark": "Intermediate: 1-3-5 is the baseline. Progress to 1-4-7 over the cycle.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["campus_board"],
    },
    {
        "exercise": "Double dynos",
        "detail": "Jump both hands simultaneously to a higher pair of rungs",
        "sets": 4,
        "reps": "4 attempts",
        "rest_seconds": 180,
        "effort_note": "Commit fully — half-committed dynos cause injuries",
        "benchmark": "Most intermediate climbers hit 2-rung dynos; target 3-rung by end of phase",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["campus_board"],
    },
    {
        "exercise": "No-foot moves on overhang",
        "detail": "On overhang or a steep board, find or set sequences where you release feet and pull dynamically to the next hold.",
        "sets": 4,
        "reps": "4–6 attempts per sequence",
        "rest_seconds": 180,
        "effort_note": "Core tension + dynamic upper-body strength. Drop the feet, generate, catch the hold.",
        "benchmark": "Transferable to real climbing because it uses actual holds rather than campus rungs.",
        "disciplines": ["bouldering", "sport", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Reactive pull-ups",
        "detail": "Pull-up bar. From a dead hang, pull as fast as possible to chest. Aim for an explosive concentric phase.",
        "sets": 4,
        "reps": "5 reps",
        "rest_seconds": 180,
        "effort_note": "Trains rate of force development. Add a clap mid-rep if you've mastered the basic — or weight for advanced.",
        "benchmark": "Builds reactive strength for dynos and dynamic catches. Universal — every climber benefits.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Dynamic moves on the wall",
        "detail": "Pick boulder problems or sequences with explosive moves — dynos, lunges, throws. Limit-style attempts.",
        "sets": 4,
        "reps": "5 attempts per move",
        "rest_seconds": 180,
        "effort_note": "Explosive contact strength — quality over quantity. Rest fully between attempts.",
        "benchmark": "More accessible than campusing — no specialised gear needed. Core power-building drill.",
        "disciplines": ["bouldering", "sport", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Feet-on campusing",
        "detail": "Use campus rungs with feet on. Match each rung before moving up.",
        "sets": 4,
        "reps": "5 moves",
        "rest_seconds": 120,
        "effort_note": "Explosive pull — don't muscle through slowly",
        "benchmark": "Beginner: focus on keeping hips in and generating power from lats",
        "disciplines": ["bouldering", "sport", "competition"],
        "min_experience": "beginner",
        "max_experience": "intermediate",
        "equipment_needed": ["campus_board"],
    },
]


def _power_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_POWER_POOL, experience, discipline, equipment, n=2)


_ENDURANCE_POOL: List[Dict] = [
    {
        "exercise": "Boulder power endurance — 6×4 min on routes",
        "detail": "Climb continuously on a route or set sequence for 4 minutes. Rest 4 minutes. Repeat 6 rounds.",
        "sets": 6,
        "reps": "4 min on / 4 min off",
        "rest_seconds": 240,
        "effort_note": "Sustained high intensity. Forearms should be deeply pumped by round 3.",
        "benchmark": "Boulder/comp power-endurance protocol. Most useful for competition climbers and hard boulderers.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "advanced",
        "equipment_needed": [],
    },
    {
        "exercise": "ARCing (aerobic restoration and capillarity)",
        "detail": "20–40 min of continuous easy climbing (50–60% effort). No stopping.",
        "sets": 1,
        "reps": "20–40 min",
        "rest_seconds": 0,
        "effort_note": "You should be able to hold a full conversation throughout — this is recovery training",
        "benchmark": "If you're breathing hard, you're going too hard. The adaptation is in the sustained duration.",
        "disciplines": ["sport", "trad", "competition"],
        "min_experience": "advanced",
        "equipment_needed": [],
    },
    {
        "exercise": "Climbing intervals — 3 on / 3 off × 5",
        "detail": "Climb for 3 minutes continuously, then rest 3 minutes. Five rounds total.",
        "sets": 5,
        "reps": "3 min on / 3 min off",
        "rest_seconds": 180,
        "effort_note": "Aerobic–anaerobic crossover work. Targets the energy system most used in long sport routes.",
        "benchmark": "Sport/trad endurance staple. Pace yourself — should be hard but sustainable across all 5 rounds.",
        "disciplines": ["sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "4×4s",
        "detail": "Pick 4 boulder problems 2–3 grades below max. Climb all 4 back to back, rest 3 min, repeat 4 rounds.",
        "sets": 4,
        "reps": "4 problems continuous",
        "rest_seconds": 180,
        "effort_note": "The last round should feel very hard — if it's easy, the problems are too easy",
        "benchmark": "Your forearms should be noticeably pumped after round 2. Full pump by round 4.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Linked route laps",
        "detail": "Climb a moderate route, immediately downclimb or lower and repeat",
        "sets": 3,
        "reps": "5 laps per route",
        "rest_seconds": 300,
        "effort_note": "Pace yourself — the goal is maintaining technique under fatigue, not sprinting",
        "benchmark": "Intermediate: maintain footwork quality on laps 4–5. Beginners: 3 laps is the target.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]


def _endurance_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_ENDURANCE_POOL, experience, discipline, equipment, n=3)


def _pullup_benchmark(experience: str) -> str:
    return {
        "beginner": "Bodyweight pull-ups with full ROM. Use assistance band if needed.",
        "intermediate": "Add 5–10 kg. Archer pull-ups count as assisted one-arm.",
        "advanced": "Add 20+ kg. Progress toward one-arm pull-ups.",
        "elite": "One-arm pull-up training is the standard.",
    }.get(experience, "Full ROM, controlled descent")


_STRENGTH_POOL: List[Dict] = [
    {
        "exercise": "Weighted lock-offs at 90° / 120°",
        "detail": "Hold the pull-up bar with elbows at 90° (or 120° for the harder version). Add weight via belt.",
        "sets": 4,
        "reps": "5–10s holds, alternating arms leading",
        "rest_seconds": 180,
        "effort_note": "Pure isometric strength — climbing's most relevant pulling position.",
        "benchmark": "Bouldering benchmark: hold +20 kg at 90° for 5s. Builds the strength behind hard lock-off moves.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "High-rep pull-ups",
        "detail": "Strict pull-ups, sustained effort. Forearm and lat endurance.",
        "sets": 3,
        "reps": "15+ reps",
        "rest_seconds": 120,
        "effort_note": "Pump-building — the last rep of each set should be hard but achievable.",
        "benchmark": "Sport-climber's pull-up: high reps at bodyweight. 15–20 per set is the target.",
        "disciplines": ["sport", "trad"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Hanging leg raises",
        "detail": "From dead hang on the bar, lift legs to L-sit position or higher (toes-to-bar for advanced).",
        "sets": 3,
        "reps": "8–12 reps",
        "rest_seconds": 90,
        "effort_note": "Core-into-pull pattern that mirrors steep climbing demands. Control the eccentric.",
        "benchmark": "Beginners: bent-knee raises. Intermediate: straight-leg L-sit. Advanced: toes-to-bar.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Pull-up variations",
        "detail": "Weighted pull-ups or archer pull-ups depending on level",
        "sets": 4,
        "reps": "5-8",
        "rest_seconds": 180,
        "effort_note": "Last rep should be hard but form must stay clean — no kipping",
        "benchmark": "Full ROM, controlled descent",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Front lever progressions",
        "detail": "Tuck → advanced tuck → straddle → full. Hold each for 3×5s.",
        "sets": 4,
        "reps": "3 × 5s holds",
        "rest_seconds": 120,
        "effort_note": "Hold the position where you're working — don't sacrifice form for a harder position",
        "benchmark": "Intermediate: advanced tuck. Advanced: straddle. Elite: full front lever.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Core tension: hollow body holds",
        "detail": "Supine, arms overhead, press low back flat to floor, lift legs to ~30°",
        "sets": 3,
        "reps": "30s",
        "rest_seconds": 60,
        "effort_note": "If low back lifts off the floor, raise legs higher — quality over quantity",
        "benchmark": "Beginners: 15s is a solid starting point. Build to 45s over the phase.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]


def _strength_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    selected = _select_with_fallback(_STRENGTH_POOL, experience, discipline, equipment, n=3)
    # Patch the pull-up entry with experience-specific sets/reps/benchmark
    for ex in selected:
        if ex["exercise"] == "Pull-up variations":
            ex["sets"] = 4 if experience != "beginner" else 3
            ex["reps"] = "5" if experience in ("advanced", "elite") else "8"
            ex["benchmark"] = _pullup_benchmark(experience)
    return selected


_FOOTWORK_POOL: List[Dict] = [
    {
        "exercise": "Dual-tex drill",
        "detail": "Climb the same problem twice — once in stiff shoes, once in soft. Notice the difference in foot feel.",
        "sets": 2,
        "reps": "3 problems each shoe",
        "rest_seconds": 60,
        "effort_note": "Develops shoe-feel and rubber-trust. Helps you learn what your footwear actually gives you.",
        "benchmark": "Many climbers fail on foot-sensitive routes because they don't know what their shoes do — address it directly.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Edging precision drill",
        "detail": "On vertical or slightly overhanging wall, place your foot on the smallest possible point of each hold. No re-adjusting after placement.",
        "sets": 3,
        "reps": "5 problems",
        "rest_seconds": 60,
        "effort_note": "Pure precision work — climb slow. The failure mode is shifting feet after placement, not the move itself.",
        "benchmark": "Universal drill — pays off at every level. Even pros benefit.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Silent feet drills",
        "detail": "Climb a moderate route/problem — no sound when placing feet. Reset if you hear a foot.",
        "sets": 3,
        "reps": "5 problems",
        "rest_seconds": 90,
        "effort_note": "Slow down — this is technique, not training to failure",
        "benchmark": "Even V8+ climbers benefit from this drill. Precision > speed at all levels.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Slab technique — smearing",
        "detail": "Find or set 3–4 slab sequences that require smearing. Focus on hip position.",
        "sets": 2,
        "reps": "10 min",
        "rest_seconds": 120,
        "effort_note": "Weight over feet, trust the rubber — lean into the discomfort of slab",
        "benchmark": "Most climbers undertrain slab. 10 min of focused slab work pays dividends on overhang too.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]


def _footwork_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_FOOTWORK_POOL, experience, discipline, equipment, n=2)


_MENTAL_POOL: List[Dict] = [
    {
        "exercise": "Gear-placement drill on toprope",
        "detail": "On toprope, climb your project. Place gear at every reasonable opportunity. Have a partner critique placements.",
        "sets": 1,
        "reps": "2 laps of project on toprope",
        "rest_seconds": 0,
        "effort_note": "Build placement instinct under low stakes. Translates directly to leading harder routes.",
        "benchmark": "Specifically for trad climbers. Aim for 8/10 placements that an experienced partner would clip without hesitation.",
        "disciplines": ["trad"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Commitment dyno (controlled exposure)",
        "detail": "Find a safe dyno with a good landing. Make 5 dedicated attempts. The goal is committing, not necessarily sending.",
        "sets": 1,
        "reps": "5 attempts",
        "rest_seconds": 180,
        "effort_note": "Most climbers half-commit dynos. This drill builds the mental pattern of full commitment under safe conditions.",
        "benchmark": "Boulder-specific. The goal is fall comfort, not send rate.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Headpoint practice",
        "detail": "Take a route/problem at your limit. Rehearse the crux moves on TR or with padding first, then commit.",
        "sets": 1,
        "reps": "2–3 attempts from the ground",
        "rest_seconds": 300,
        "effort_note": "The goal is committing to the move — falling is part of the process",
        "benchmark": "Most climbers avoid this drill. Scheduling it makes it happen.",
        "disciplines": ["sport", "trad"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Redpoint visualisation",
        "detail": "Sit quietly with eyes closed. Mentally rehearse your project from start to finish — every hold, every breath, every move.",
        "sets": 1,
        "reps": "5–10 min per session",
        "rest_seconds": 0,
        "effort_note": "Mental rehearsal is well-documented in sport science — equivalent to physical practice for skill consolidation.",
        "benchmark": "Sport/trad climbers especially benefit. Do this the night before a hard redpoint attempt.",
        "disciplines": ["sport", "trad"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Breath reset drill",
        "detail": "Before each attempt, take 3 slow diaphragmatic breaths. On the wall, breathe at every rest hold.",
        "sets": 1,
        "reps": "Every attempt in the session",
        "rest_seconds": 0,
        "effort_note": "This is a habit drill — the reps are every single attempt, not a separate exercise block",
        "benchmark": "Most climbers forget to breathe on hard moves. This drill rewires that pattern.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]


def _mental_block(experience: str, discipline: str, equipment: List[str]) -> List[Dict]:
    return _select_with_fallback(_MENTAL_POOL, experience, discipline, equipment, n=2)


# ---------------------------------------------------------------------------
# Warm-up / cool-down templates
# ---------------------------------------------------------------------------

WARM_UP_BASE = [
    "5 min light cardio (jumping jacks, easy cycling, or brisk walk)",
    "Joint rotations: wrists × 20, elbows × 10, shoulders × 10 each direction",
    "Finger tendon glides: 10 reps each finger individually",
    "2–3 easy problems/routes well below max (warm-up, not training)",
]

COOL_DOWN_BASE = [
    "Forearm flexor stretch: wrist extension, 30s per arm × 2",
    "Forearm extensor stretch: wrist flexion, 30s per arm × 2",
    "Doorway chest opener: 30s",
    "Lat stretch (overhead on a bar or strap), 30s per side",
    "Optional: 5 min easy walking or light cycling",
]


# ---------------------------------------------------------------------------
# Static coach notes (fallback when no OpenAI)
# ---------------------------------------------------------------------------

STATIC_COACH_NOTES = {
    "hangboard": (
        "Finger strength is the highest-leverage adaptation for most climbers. "
        "The key is consistency over months, not intensity in one session. "
        "Log your weights and hang times every session — small increments compound."
    ),
    "power": (
        "Power work recruits fast-twitch fibers that endurance climbing ignores. "
        "Full rest between sets is non-negotiable — undertested power is just endurance. "
        "If you're tired from yesterday, skip this session and come back fresh."
    ),
    "endurance": (
        "Pump tolerance is built in the discomfort zone. The last round should be genuinely hard. "
        "If it isn't, the problems are too easy or you're resting too long between sets. "
        "Keep a training journal — progress is easier to see over 4–6 weeks than session to session."
    ),
    "strength": (
        "Pulling strength underpins everything from dynos to long lock-offs. "
        "Train it fresh, at the start of a session, with full rest. "
        "Strength doesn't need volume — it needs quality and progressive overload."
    ),
    "technique": (
        "Technique sessions pay the biggest long-term dividends but feel the least productive in the moment. "
        "Slow down intentionally — the goal is rewiring movement patterns, not getting pumped. "
        "Video yourself occasionally: what you feel and what you do are often very different."
    ),
    "rest": (
        "Rest days are when adaptation happens — the session just creates the stimulus. "
        "Light walking, mobility work, or easy stretching is fine. "
        "Protect your sleep: finger tendons rebuild primarily during deep sleep."
    ),
    "project": (
        "Project sessions should feel like play with a purpose. "
        "Try moves in isolation, find new beta, and commit to attempts you'd normally back off. "
        "The breakthroughs usually come after a rest day — trust the process."
    ),
}


# ---------------------------------------------------------------------------
# Injury gating
# ---------------------------------------------------------------------------

FINGER_REGIONS = {"finger", "a2 pulley", "pulley", "hand", "wrist"}
SHOULDER_REGIONS = {"shoulder", "rotator cuff", "bicep", "elbow"}
KNEE_REGIONS = {"knee", "ankle", "hip", "leg"}


def _is_injured(region: str, injury_flags: List[str]) -> bool:
    region_lower = region.lower()
    return any(region_lower in flag.lower() for flag in injury_flags)


def _finger_injured(injury_flags: List[str]) -> bool:
    return any(
        any(r in flag.lower() for r in FINGER_REGIONS)
        for flag in injury_flags
    )


def _shoulder_injured(injury_flags: List[str]) -> bool:
    return any(
        any(r in flag.lower() for r in SHOULDER_REGIONS)
        for flag in injury_flags
    )


def _knee_injured(injury_flags: List[str]) -> bool:
    return any(
        any(r in flag.lower() for r in KNEE_REGIONS)
        for flag in injury_flags
    )


# ---------------------------------------------------------------------------
# Plan templates
# ---------------------------------------------------------------------------

# Template: (session_type, primary_blocks_fn) pairs per week
# Each entry is a list of day descriptors for that week structure

def _goal_template(
    goal: str,
    days: int,
    experience: str,
    injury_flags: List[str],
    discipline: str,
    equipment: List[str],
) -> List[Dict]:
    """
    Build a 4-week plan as a flat list of session dicts.
    Returns sessions ordered by session_index.
    """
    sessions = []
    idx = 0

    finger_ok = not _finger_injured(injury_flags)
    shoulder_ok = not _shoulder_injured(injury_flags)

    for week in range(1, 5):
        is_deload = (week == 4)

        for day_in_week in range(1, days + 1):
            session_type, main_blocks = _pick_session(
                goal, day_in_week, days, week, is_deload,
                experience, finger_ok, shoulder_ok, injury_flags,
                discipline, equipment,
            )

            coach_note = STATIC_COACH_NOTES.get(session_type, STATIC_COACH_NOTES["project"])

            sessions.append({
                "session_index": idx,
                "week": week,
                "day_in_week": day_in_week,
                "type": session_type,
                "duration_min": _duration(session_type, experience, is_deload),
                "warm_up": WARM_UP_BASE,
                "main": main_blocks,
                "cool_down": COOL_DOWN_BASE,
                "coach_note": coach_note,
            })
            idx += 1

    return sessions


def _pick_session(
    goal: str, day: int, total_days: int,
    week: int, is_deload: bool,
    experience: str, finger_ok: bool, shoulder_ok: bool,
    injury_flags: List[str],
    discipline: str,
    equipment: List[str],
) -> tuple[str, List[Dict]]:
    """Return (session_type, main_blocks) for a given day slot."""

    volume_scale = 0.6 if is_deload else 1.0

    if goal == "grade_progression":
        schedule = {
            1: ("hangboard", lambda: _hangboard_block(experience, discipline, equipment) if finger_ok else _strength_block(experience, discipline, equipment)),
            2: ("power", lambda: _power_block(experience, discipline, equipment) if finger_ok else _endurance_block(experience, discipline, equipment)),
            3: ("project", lambda: [_footwork_block(experience, discipline, equipment)[0], _mental_block(experience, discipline, equipment)[0]]),
            4: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            5: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
        }
    elif goal == "route_endurance":
        schedule = {
            1: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
            2: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            3: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
            4: ("technique", lambda: _footwork_block(experience, discipline, equipment)),
            5: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
        }
    elif goal == "competition":
        schedule = {
            1: ("power", lambda: _power_block(experience, discipline, equipment) if finger_ok else _strength_block(experience, discipline, equipment)),
            2: ("hangboard", lambda: _hangboard_block(experience, discipline, equipment) if finger_ok else _endurance_block(experience, discipline, equipment)),
            3: ("project", lambda: _mental_block(experience, discipline, equipment)),
            4: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            5: ("power", lambda: _power_block(experience, discipline, equipment) if finger_ok else _footwork_block(experience, discipline, equipment)),
        }
    elif goal == "injury_prevention":
        schedule = {
            1: ("technique", lambda: _footwork_block(experience, discipline, equipment)),
            2: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            3: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
            4: ("technique", lambda: _footwork_block(experience, discipline, equipment) + _mental_block(experience, discipline, equipment)),
            5: ("strength", lambda: _strength_block(experience, discipline, equipment)),
        }
    else:  # general
        schedule = {
            1: ("hangboard", lambda: _hangboard_block(experience, discipline, equipment) if finger_ok else _strength_block(experience, discipline, equipment)),
            2: ("endurance", lambda: _endurance_block(experience, discipline, equipment)),
            3: ("technique", lambda: _footwork_block(experience, discipline, equipment)),
            4: ("strength", lambda: _strength_block(experience, discipline, equipment)),
            5: ("project", lambda: _mental_block(experience, discipline, equipment)),
        }

    slot = ((day - 1) % len(schedule)) + 1
    session_type, blocks_fn = schedule.get(slot, schedule[1])
    blocks = blocks_fn()

    if is_deload:
        blocks = blocks[:max(1, len(blocks) // 2)]

    return session_type, blocks


def _duration(session_type: str, experience: str, is_deload: bool) -> int:
    base = {
        "hangboard": 60,
        "power": 75,
        "project": 90,
        "strength": 60,
        "endurance": 75,
        "technique": 60,
        "rest": 0,
    }.get(session_type, 60)
    if experience == "beginner":
        base = min(base, 60)
    if is_deload:
        base = int(base * 0.7)
    return base


# ---------------------------------------------------------------------------
# Plan metadata
# ---------------------------------------------------------------------------

GOAL_NAMES = {
    "grade_progression": "Grade Progression",
    "route_endurance": "Route Endurance",
    "competition": "Competition Peak",
    "injury_prevention": "Injury Prevention",
    "general": "General Fitness",
}

GOAL_PHASES = {
    "grade_progression": "power",
    "route_endurance": "base",
    "competition": "performance",
    "injury_prevention": "base",
    "general": "base",
}

# Per-week focus for each goal type (weeks 1–4, week 4 is always deload)
WEEK_META: Dict[str, List[Dict]] = {
    "grade_progression": [
        {
            "goal": "Establish baseline",
            "desc": "Calibrate your max hang intensity and dial in movement quality. The numbers you record this week will set your targets for weeks 2 and 3. Don't go to failure — accurate data matters more than heroics.",
            "focus_tags": ["Finger strength", "Max intensity", "Movement quality"],
        },
        {
            "goal": "Load accumulation",
            "desc": "Volume and intensity both increase this week. You'll feel tired — that's the point. Log every session so you can track adaptation. Sleep and nutrition are training inputs, not extras.",
            "focus_tags": ["Higher volume", "Progressive overload", "Consistency"],
        },
        {
            "goal": "Peak load week",
            "desc": "Your hardest week of the cycle. Push to your limit on the key sessions, but don't chase failure — aim for quality reps at near-max intensity. A good week 3 sets up a meaningful deload.",
            "focus_tags": ["Maximum effort", "Quality over quantity", "Recovery between sessions"],
        },
        {
            "goal": "Deload — absorb and adapt",
            "desc": "Volume drops 40%. This is not optional — adaptation happens during rest, not during effort. Light sessions only. If you feel fresh and strong by the end of the week, the deload worked.",
            "focus_tags": ["Reduced volume", "Active recovery", "Preparation for next cycle"],
        },
    ],
    "route_endurance": [
        {
            "goal": "Build aerobic base",
            "desc": "Long moderate-intensity climbing — stay below the pump threshold. The goal is time on wall, not grade. If you're getting pumped quickly you're going too hard. Dial it back and keep moving.",
            "focus_tags": ["Sustained effort", "Below pump threshold", "Time on wall"],
        },
        {
            "goal": "Push your lactate threshold",
            "desc": "This week you'll work harder for longer. The discomfort you feel during endurance sets is the zone you need to develop. Controlled breathing and pacing matter more than raw strength here.",
            "focus_tags": ["Higher intensity endurance", "Pacing", "Breath control"],
        },
        {
            "goal": "Performance — link it all together",
            "desc": "Attempt routes at your current limit and focus on sequencing efficiently when pumped. This is the payoff week. You won't always feel your best — learn to climb anyway.",
            "focus_tags": ["Route attempts", "Performance under fatigue", "Sequencing"],
        },
        {
            "goal": "Deload — absorb and adapt",
            "desc": "Short easy sessions. Your forearms have taken a lot over the past three weeks. Let the capillary and aerobic adaptations consolidate. Active movement is fine — intensity is not.",
            "focus_tags": ["Reduced volume", "Easy movement", "Rest priority"],
        },
    ],
    "competition": [
        {
            "goal": "Power foundation",
            "desc": "Explosive, high-quality movement on difficult boulders and routes. Every move should be intentional. Competition climbing rewards power-to-weight and precision — build both from the ground up.",
            "focus_tags": ["Explosive movement", "Movement precision", "High intensity"],
        },
        {
            "goal": "Simulate competition conditions",
            "desc": "Work on reading moves quickly, committing to sequences, and performing under self-imposed pressure. Timed reads, onsight attempts, and mental rehearsal are as important as the climbing itself.",
            "focus_tags": ["Onsight reading", "Mental performance", "Pressure simulation"],
        },
        {
            "goal": "Peak sharpness",
            "desc": "Maintain intensity but reduce volume — you're trying to arrive sharp, not tired. A few high-quality attempts per session. Stop before you're worked. Confidence comes from doing less, better.",
            "focus_tags": ["Sharp quality", "Low volume", "Confidence building"],
        },
        {
            "goal": "Taper — arrive rested and ready",
            "desc": "Very short sessions, no new hard attempts. Your fitness is locked in. The goal now is to let your nervous system recover so you can access everything you've built. Trust the training.",
            "focus_tags": ["Minimal volume", "Mental prep", "Rest priority"],
        },
    ],
    "injury_prevention": [
        {
            "goal": "Rehabilitation base",
            "desc": "Gentle loading and technique focus. Monitor your body closely — any sharp or novel pain means stop. The goal is to move well, not to push hard. Consistency over weeks matters more than effort today.",
            "focus_tags": ["Gentle loading", "Technique focus", "Monitor response"],
        },
        {
            "goal": "Progressive loading",
            "desc": "Carefully increase the demands on the affected area. You're looking for a 3/10 discomfort maximum — anything above that and you back off. Two steps forward, one step back is still progress.",
            "focus_tags": ["Controlled progression", "Load management", "Pain monitoring"],
        },
        {
            "goal": "Return to performance",
            "desc": "Reintroduce climbing-specific demands at a managed intensity. You may feel strong — resist the urge to go full effort. The structures that were injured need more time than you feel they do.",
            "focus_tags": ["Climbing-specific load", "Controlled intensity", "Patience"],
        },
        {
            "goal": "Consolidation — assess and plan",
            "desc": "Light sessions and honest reflection. How did the past three weeks feel? What aggravated things, what helped? Use this week to set a realistic plan for the next cycle.",
            "focus_tags": ["Easy sessions", "Self-assessment", "Plan next cycle"],
        },
    ],
    "general": [
        {
            "goal": "Establish habits and baseline",
            "desc": "The hardest part of any training cycle is showing up consistently. This week is about building the habit, not the fitness. Keep intensity manageable and focus on quality movement across all session types.",
            "focus_tags": ["Consistency", "Habit building", "All-round development"],
        },
        {
            "goal": "Find your limits",
            "desc": "Increase the challenge across all sessions. You should start to feel where your weaknesses are — that's valuable information. Hard training should feel hard. If everything feels easy, go up a grade.",
            "focus_tags": ["Increased challenge", "Identify weaknesses", "Progressive overload"],
        },
        {
            "goal": "Apply it in real climbing",
            "desc": "Put the fitness you've built to work on actual routes and problems. Onsight, redpoint, work moves you've been avoiding. This is what the training is for — not the gym, the rock.",
            "focus_tags": ["Real climbing", "Project work", "Application"],
        },
        {
            "goal": "Deload — reflect and recover",
            "desc": "Easy sessions. Think about what worked and what you'd change next cycle. The adaptation from weeks 1–3 is still happening — let it finish. You'll come back stronger if you rest now.",
            "focus_tags": ["Reduced volume", "Reflection", "Preparation"],
        },
    ],
}


# ---------------------------------------------------------------------------
# GPT-4o coach note enrichment
# ---------------------------------------------------------------------------

def _enrich_coach_notes(sessions: List[Dict], profile: Dict, openai_client: Any) -> None:
    """Replace static coach notes with GPT-4o generated ones (in-place)."""
    if not openai_client:
        return

    try:
        for session in sessions[:3]:  # enrich first 3 sessions to limit tokens
            prompt = (
                f"You are an expert climbing coach. Write a 2-sentence motivational coach note "
                f"for this training session. Be specific, practical, and encouraging.\n\n"
                f"Athlete: {profile.get('experience_level')} climber, "
                f"{profile.get('years_climbing')} years, "
                f"goal: {profile.get('primary_goal')}.\n"
                f"Session type: {session['type']}, week {session['week']} of 4.\n"
                f"Main exercises: {', '.join(e['exercise'] for e in session['main'][:3])}."
            )
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=120,
                timeout=15,
            )
            session["coach_note"] = response.choices[0].message.content.strip()
    except Exception:
        pass  # fall through to static notes already in place


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_plan(
    profile: Dict[str, Any],
    injury_flags: List[str],
    openai_client: Any = None,
) -> Dict[str, Any]:
    """
    Generate a 4-week personalized training plan.

    Args:
        profile: athlete profile dict from get_profile()
        injury_flags: list of injury area strings from recent triage sessions
        openai_client: optional OpenAI client for GPT-4o coach notes

    Returns:
        plan dict ready to be passed to save_plan()
    """
    goal = profile.get("primary_goal", "general")
    experience = profile.get("experience_level", "beginner")
    days = max(1, min(6, profile.get("days_per_week", 3)))
    discipline = profile.get("primary_discipline") or "bouldering"
    equipment = profile.get("equipment") or []

    sessions = _goal_template(goal, days, experience, injury_flags, discipline, equipment)

    if openai_client:
        _enrich_coach_notes(sessions, profile, openai_client)

    injury_note = ""
    if injury_flags:
        injury_note = (
            f" Some exercises have been adjusted based on recent injury history "
            f"({', '.join(injury_flags[:3])})."
        )

    week_meta = WEEK_META.get(goal, WEEK_META["general"])

    return {
        "name": f"{GOAL_NAMES.get(goal, 'Custom')} — {experience.title()} Plan",
        "phase": GOAL_PHASES.get(goal, "base"),
        "duration_weeks": 4,
        "start_date": str(date.today()),
        "plan_data": {
            "sessions": sessions,
            "week_meta": week_meta,
            "injury_note": injury_note,
            "goal": goal,
            "experience": experience,
            "days_per_week": days,
        },
    }
