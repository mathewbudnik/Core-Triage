"""Pure helpers for climb grade validation, ordering, and summarisation.

Grades supported:
  - V-scale (bouldering): V0–V17
  - YDS    (sport/trad):  5.6–5.9, 5.10a–5.15d

Discipline keys: 'boulder', 'route'.
Per-grade counter shape: {'s': sends, 'f': flashes, 'p': projects}.
Invariant: f <= s (a flash is a send on first try).
"""
from __future__ import annotations

import re
from typing import Dict, Optional, Any


BOULDER_RE = re.compile(r"^V([0-9]|1[0-7])$")
# YDS: 5.6-5.9 OR 5.10a-5.15d
ROUTE_RE = re.compile(r"^5\.(?:[6-9]|1[0-5][a-d])$")

_DISCIPLINES = ("boulder", "route")
_COUNTER_KEYS = ("s", "f", "p")

# Numeric YDS letter offsets so 5.10a < 5.10b < 5.10c < 5.10d
_YDS_LETTER = {"a": 0, "b": 1, "c": 2, "d": 3}


def grade_order(grade: str) -> int:
    """Return a sortable integer rank for `grade`. Lower = easier.

    Boulder grades start at 0; route grades start at 1000 so they never
    collide with boulder ranks (we never mix the two in a single sort).
    """
    m = BOULDER_RE.match(grade)
    if m:
        return int(m.group(1))
    m = ROUTE_RE.match(grade)
    if m:
        # "5.6" → 6 ; "5.10a" → 10*4 + 0 = 40 ; "5.15d" → 15*4 + 3 = 63
        body = grade[2:]  # strip "5."
        if len(body) == 1:  # 5.6..5.9
            return 1000 + int(body) * 4
        # 5.10a–5.15d
        num = int(body[:-1])
        letter = _YDS_LETTER[body[-1]]
        return 1000 + num * 4 + letter
    raise ValueError(f"invalid grade: {grade}")


def validate_climbs(climbs: Any) -> None:
    """Raise ValueError if `climbs` is not a well-formed climb dict."""
    if not isinstance(climbs, dict):
        raise ValueError("climbs must be a JSON object")
    for discipline, grades in climbs.items():
        if discipline not in _DISCIPLINES:
            raise ValueError("discipline must be boulder or route")
        if not isinstance(grades, dict):
            raise ValueError(f"{discipline} grades must be an object")
        regex = BOULDER_RE if discipline == "boulder" else ROUTE_RE
        for grade, counters in grades.items():
            if not regex.match(grade):
                kind = "V-scale" if discipline == "boulder" else "YDS"
                raise ValueError(f"invalid {kind} grade: {grade}")
            if not isinstance(counters, dict):
                raise ValueError(f"counters for {grade} must be an object")
            for key in _COUNTER_KEYS:
                if key not in counters:
                    raise ValueError(f"missing counter '{key}' for {grade}")
                v = counters[key]
                if not isinstance(v, int) or isinstance(v, bool) or v < 0:
                    raise ValueError("counts must be non-negative integers")
            if counters["f"] > counters["s"]:
                raise ValueError(f"flashes cannot exceed sends for {grade}")


def format_climbs_summary(climbs: Dict[str, Dict[str, Dict[str, int]]]) -> str:
    """Render `climbs` as a human-readable single-line summary."""
    if not climbs:
        return ""
    parts = []
    for discipline_label, discipline_key in (("Boulder", "boulder"), ("Route", "route")):
        grades = climbs.get(discipline_key, {})
        if not grades:
            continue
        # Sort grades ascending for stable output.
        sorted_grades = sorted(grades.keys(), key=grade_order)
        entries = []
        for g in sorted_grades:
            c = grades[g]
            s, f, p = c["s"], c["f"], c["p"]
            if s > 0:
                if f > 0:
                    entries.append(f"{g}×{s} ({f} flash)")
                else:
                    entries.append(f"{g}×{s}")
            elif p > 0:
                entries.append(f"{g} projecting ({p} tries)")
        if entries:
            parts.append(f"{discipline_label}: {', '.join(entries)}")
    return ". ".join(parts)


def compute_hardest(climbs: Dict[str, Dict[str, Dict[str, int]]]) -> Dict[str, Optional[str]]:
    """Return the hardest *sent* grade per discipline. Projects don't count."""
    out: Dict[str, Optional[str]] = {"boulder": None, "route": None}
    for discipline in _DISCIPLINES:
        grades = climbs.get(discipline, {})
        sent = [g for g, c in grades.items() if c.get("s", 0) > 0]
        if sent:
            out[discipline] = max(sent, key=grade_order)
    return out


# ── Tier system (V0–V9 unique + V10+ Coral) ───────────────────────────

V_TIERS = ["v0", "v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10"]

TIER_NAMES = {
    "v0":  "Ivory",
    "v1":  "Honey",
    "v2":  "Apricot",
    "v3":  "Acid Lime",
    "v4":  "Jade",
    "v5":  "Teal",
    "v6":  "Electric Sky",
    "v7":  "Cobalt",
    "v8":  "Iris",
    "v9":  "Magenta",
    "v10": "Coral",
}


def v_grade_to_tier(grade: str) -> str:
    """Map a V-grade ('V0'..'V17') to a tier id.
    V10 and harder all collapse to 'v10' (Coral)."""
    m = BOULDER_RE.match(grade)
    if not m:
        raise ValueError(f"invalid V-grade: {grade}")
    n = int(m.group(1))
    return f"v{min(n, 10)}"


# YDS -> tier per the chart in the design spec
_YDS_TIER_MAP = {
    "5.6": "v0", "5.7": "v0", "5.8": "v0", "5.9": "v0",
    "5.10a": "v0", "5.10b": "v0", "5.10c": "v0", "5.10d": "v0",
    "5.11a": "v1",
    "5.11b": "v2", "5.11c": "v2",
    "5.11d": "v3",
    "5.12a": "v4", "5.12b": "v4",
    "5.12c": "v5", "5.12d": "v5",
    "5.13a": "v6",
    "5.13b": "v7",
    "5.13c": "v8",
    "5.13d": "v9",
    # 5.14a..5.15d all coral
    "5.14a": "v10", "5.14b": "v10", "5.14c": "v10", "5.14d": "v10",
    "5.15a": "v10", "5.15b": "v10", "5.15c": "v10", "5.15d": "v10",
}


def yds_to_tier(grade: str) -> str:
    """Map a YDS grade ('5.6'..'5.15d') to a tier id.

    Strictly enumerated — any grade outside the chart raises ValueError.
    If the chart ever grows (e.g. 5.16a), add it to `_YDS_TIER_MAP`.
    """
    if grade not in _YDS_TIER_MAP:
        raise ValueError(f"invalid YDS grade: {grade}")
    return _YDS_TIER_MAP[grade]


def _tier_index(tier: str) -> int:
    """Return the position of a tier id in V_TIERS; used for max() comparison."""
    try:
        return V_TIERS.index(tier)
    except ValueError:
        return -1


def working_tier_from_hardest(hardest: Dict[str, Optional[str]]) -> str:
    """Return the user's working tier from a `get_user_hardest()` result.

    Picks the higher of the boulder and route tier mappings. Defaults
    to 'v0' if both are None.
    """
    boulder = hardest.get("boulder")
    route   = hardest.get("route")
    tiers = []
    if boulder:
        tiers.append(v_grade_to_tier(boulder))
    if route:
        tiers.append(yds_to_tier(route))
    if not tiers:
        return "v0"
    return max(tiers, key=_tier_index)
