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
