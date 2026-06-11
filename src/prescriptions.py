"""Skill-prescription catalog and gap logic.

A *prescription* is a one-week block of 3 drills targeting the climber's
weakest Pentagon axis (the "gap"). This module is pure (no DB, no FastAPI) so
it is unit-testable and safe to import anywhere.

Canonical axis keys are ``power | crimp | dynamic | technique | mobility``
(matching frontend ``lib/skills.js``). The backend pentagon emits the legacy
keys ``crimpy``/``technical`` — reconcile ONLY via ``canon_axis``.
"""
from __future__ import annotations

SKILL_AXES = ("power", "crimp", "dynamic", "technique", "mobility")

# legacy backend pentagon keys -> canonical
_AXIS_ALIASES = {"crimpy": "crimp", "technical": "technique"}


def canon_axis(key: str) -> str:
    """Map a (possibly legacy) axis key onto its canonical form."""
    return _AXIS_ALIASES.get(key, key)


def compute_gap_axis(pentagon: dict | None) -> str | None:
    """Return the weakest present canonical axis strictly below the strongest.

    Mirrors the rule in ``frontend/src/lib/identity.js`` ``identityPhrase``:
    a gap only exists when some axis is strictly below the strongest. Ties for
    weakest (or strongest) resolve deterministically by canonical ``SKILL_AXES``
    order. Returns ``None`` for an empty/None pentagon or a balanced one.
    """
    if not pentagon:
        return None
    vals: dict[str, float] = {}
    for raw, v in pentagon.items():
        if isinstance(v, (int, float)):
            vals[canon_axis(raw)] = float(v)
    present = [a for a in SKILL_AXES if a in vals]
    if len(present) < 2:
        return None
    strongest = max(present, key=lambda a: vals[a])  # ties -> first in SKILL_AXES order
    weakest = min(present, key=lambda a: vals[a])     # ties -> first in SKILL_AXES order
    if vals[weakest] >= vals[strongest]:
        return None
    return weakest


def select_block(axis: str, exclude_keys: list[str] | None = None) -> list[dict]:
    """Pick 3 drills for ``axis``, preferring keys not in ``exclude_keys``.

    Deterministic (takes the first matching drills in catalog order) so blocks
    are reproducible and rotate on repeat. Falls back to repeats if the pool is
    smaller than 3 after exclusion.
    """
    axis = canon_axis(axis)
    pool = AXIS_TO_DRILLS.get(axis, [])
    if not pool:
        return []
    exclude = set(exclude_keys or [])
    chosen = [d for d in pool if d["key"] not in exclude][:3]
    if len(chosen) < 3:
        for d in pool:
            if len(chosen) >= 3:
                break
            if d not in chosen:
                chosen.append(d)
    return chosen[:3]


AXIS_TO_DRILLS: dict[str, list[dict]] = {
    "power": [
        {"key": "campus_1_3_5", "name": "Campus board 1-3-5",
         "detail": "Start on rung 1, skip to 3, skip to 5, no feet. Each move explosive — if it's slow, rest more. Progress toward 1-4-7 over the cycle.",
         "sets": 5, "reps": "3 ladders each arm leading", "target": 3, "equipment": ["campus_board"], "level": "intermediate"},
        {"key": "reactive_pullups", "name": "Reactive pull-ups",
         "detail": "From a dead hang, pull as fast as possible to chest with an explosive concentric phase. Trains rate of force development for dynos and dynamic catches.",
         "sets": 4, "reps": "5 reps", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "no_foot_overhang", "name": "No-foot moves on overhang",
         "detail": "On a steep board or overhang, set sequences where you release feet and pull dynamically to the next hold. Core tension plus dynamic upper-body strength on real holds.",
         "sets": 4, "reps": "4-6 attempts per sequence", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "frog_hops", "name": "Frog hops on the board",
         "detail": "On a moonboard or system board, both hands matched on a starting hold, jump to a higher matched position, settle, repeat. Each rep near max for symmetrical power output.",
         "sets": 5, "reps": "4 reps per set", "target": 3, "equipment": ["home_wall", "system_wall"], "level": "intermediate"},
        {"key": "campus_1_5_8", "name": "Campus board 1-5-8",
         "detail": "Max-distance campus ladders, both arms. Full rest between sets — this is CNS-intensive, don't rush. 1-5-9 is the elite benchmark.",
         "sets": 6, "reps": "3 ladders each arm", "target": 3, "equipment": ["campus_board"], "level": "advanced"},
    ],
    "crimp": [
        {"key": "max_half_crimp_hangs", "name": "Max-weight half-crimp hangs",
         "detail": "20mm edge, half-crimp, add weight via belt/vest. True max — you should barely complete 10s. Log the added weight (intermediate: typically +5-15 kg).",
         "sets": 5, "reps": "10s on / 50s off", "target": 3, "equipment": ["hangboard"], "level": "intermediate"},
        {"key": "repeaters_7_3", "name": "Repeaters (7s on / 3s off)",
         "detail": "20mm edge, half-crimp or open-hand, bodyweight. 6 reps continuous = one set. By the last 2 reps you should be near failure. Build to 6 clean reps before adding weight.",
         "sets": 4, "reps": "6 x (7s on / 3s off)", "target": 3, "equipment": ["hangboard"], "level": "intermediate"},
        {"key": "open_hand_density", "name": "Open-hand density hangs",
         "detail": "18mm edge, open hand, bodyweight. Accumulate time under tension, pacing evenly across all 6 reps. If you can't complete 6, drop to 5 and build over weeks.",
         "sets": 4, "reps": "6 x (7s on / 3s off)", "target": 3, "equipment": ["hangboard"], "level": "intermediate"},
        {"key": "max_pinch_hangs", "name": "Max-weight pinch hangs",
         "detail": "Pinch block or wide pinch on board, add weight. Target >= 120% body weight across all grip positions over the mesocycle. Pinch at bodyweight is the elite baseline.",
         "sets": 5, "reps": "10s on / 50s off", "target": 3, "equipment": ["hangboard"], "level": "advanced"},
        {"key": "one_arm_lockoff_hangs", "name": "One-arm lock-off hangs",
         "detail": "Assisted one-arm on 20mm, assistance via pulley or foot loop. Reduce assistance each session and track assistance weight. Goal: unassisted 5s one-arm hang in 6-8 weeks.",
         "sets": 4, "reps": "5s per arm", "target": 3, "equipment": ["hangboard"], "level": "elite"},
    ],
    "dynamic": [
        {"key": "dynamic_moves_wall", "name": "Dynamic moves on the wall",
         "detail": "Pick boulder problems or sequences with explosive moves — dynos, lunges, throws — and make limit-style attempts. Explosive contact strength: quality over quantity, full rest between attempts.",
         "sets": 4, "reps": "5 attempts per move", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "feet_on_campusing", "name": "Feet-on campusing",
         "detail": "Use campus rungs with feet on, matching each rung before moving up. Explosive pull from the lats — keep hips in, don't muscle through slowly.",
         "sets": 4, "reps": "5 moves", "target": 3, "equipment": ["campus_board"], "level": "beginner"},
        {"key": "double_dynos", "name": "Double dynos",
         "detail": "Jump both hands simultaneously to a higher pair of rungs. Commit fully — half-committed dynos cause injuries. Most intermediates hit 2-rung; target 3-rung by end of phase.",
         "sets": 4, "reps": "4 attempts", "target": 3, "equipment": ["campus_board"], "level": "intermediate"},
        {"key": "commitment_dyno", "name": "Commitment dyno (controlled exposure)",
         "detail": "Find a safe dyno with a good landing and make dedicated attempts. The goal is full commitment and fall comfort, not send rate — rewires the half-commit habit under safe conditions.",
         "sets": 1, "reps": "5 attempts", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "campus_skip_ladders", "name": "Campus skip ladders (1-4-7)",
         "detail": "Max-distance skip ladders on the campus board, no feet, progressing the reach span across the cycle. CNS-intensive — full rest between sets, every move must feel explosive.",
         "sets": 5, "reps": "3 ladders each arm leading", "target": 3, "equipment": ["campus_board"], "level": "advanced"},
    ],
    "technique": [
        {"key": "silent_feet", "name": "Silent feet drill",
         "detail": "Climb a moderate route or problem making no sound when placing feet; reset if you hear a foot. Slow down — this is technique, not training to failure. Pays off at every level.",
         "sets": 3, "reps": "5 problems", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "slab_smearing", "name": "Slab technique — smearing",
         "detail": "Work 3-4 slab sequences that require smearing, focusing on hip position. Weight over feet, trust the rubber, lean into the discomfort of slab. Transfers to overhang too.",
         "sets": 2, "reps": "10 min", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "edging_precision", "name": "Edging precision drill",
         "detail": "On vertical or slightly overhanging wall, place each foot on the smallest possible point with no re-adjusting after placement. Climb slow — the failure mode is shifting feet, not the move.",
         "sets": 3, "reps": "5 problems", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "dual_tex", "name": "Dual-tex drill",
         "detail": "Climb the same problem twice — once in stiff shoes, once in soft — and notice the difference in foot feel. Develops shoe-feel and rubber-trust so you know what your footwear gives you.",
         "sets": 2, "reps": "3 problems each shoe", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "redpoint_visualisation", "name": "Redpoint visualisation",
         "detail": "Sit quietly with eyes closed and mentally rehearse a project start to finish — every hold, breath, and move. Mental rehearsal consolidates skill; do it the night before a hard attempt.",
         "sets": 1, "reps": "5-10 min per session", "target": 3, "equipment": [], "level": "intermediate"},
    ],
    "mobility": [
        {"key": "shoulder_cars", "name": "Shoulder CARs (controlled articular rotations)",
         "detail": "Standing, trace the largest pain-free circle with each arm, moving slowly through full internal and external rotation. Builds active overhead range for high steps and gastons.",
         "sets": 2, "reps": "5 slow circles each direction per arm", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "deep_squat_hip_opener", "name": "Deep squat hip opener",
         "detail": "Sink into a flat-foot deep squat, elbows inside the knees, and gently press the knees outward while lengthening the spine. Opens the hips for high steps, drop-knees, and heel hooks.",
         "sets": 3, "reps": "45s hold", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "wrist_loading_prep", "name": "Wrist mobility & loaded prep",
         "detail": "On all fours, rock weight forward and back over palms (fingers forward, then reversed), then add slow wrist circles. Prepares wrists for mantles, slopers, and palming on slab.",
         "sets": 2, "reps": "10 rocks each position", "target": 3, "equipment": [], "level": "beginner"},
        {"key": "thoracic_extension_opener", "name": "Thoracic extension opener",
         "detail": "Over a foam roller or rolled towel under the mid-back, support the head and extend the upper back over the roller, breathing into the stretch. Restores the extension lost from rounded climbing posture.",
         "sets": 2, "reps": "8 slow extensions", "target": 3, "equipment": [], "level": "intermediate"},
        {"key": "antagonist_band_complex", "name": "Antagonist band complex",
         "detail": "With a light resistance band, superset wrist extensions, reverse wrist curls, and band pull-aparts for the rear shoulder. Balances the pulling-dominant climber and protects elbows and finger pulleys.",
         "sets": 3, "reps": "15 reps per movement", "target": 3, "equipment": ["resistance_band"], "level": "intermediate"},
    ],
}
