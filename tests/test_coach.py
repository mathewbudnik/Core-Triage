"""Unit tests for the coach.py exercise selection helpers.

Phase 1 of the personalised training library — verifies the filter +
fallback + tag-strip helpers behave correctly. Block-level and end-to-end
tests come in later tasks.
"""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.coach import (  # noqa: E402
    _EXPERIENCE_LEVELS,
    _filter_exercises,
    _select_with_fallback,
    _strip_tags,
)


# Test fixtures: minimal exercise dicts shaped like real entries
def _ex(name, disciplines, min_exp, max_exp=None, equipment=None):
    out = {
        "exercise": name,
        "detail": "test detail",
        "sets": 1,
        "reps": "1",
        "rest_seconds": 60,
        "effort_note": "test",
        "benchmark": "test",
        "disciplines": list(disciplines),
        "min_experience": min_exp,
    }
    if max_exp is not None:
        out["max_experience"] = max_exp
    out["equipment_needed"] = list(equipment) if equipment is not None else []
    return out


class FilterExercisesTests(unittest.TestCase):
    def test_includes_only_matching_discipline(self):
        pool = [
            _ex("A", ["bouldering"], "beginner"),
            _ex("B", ["sport"], "beginner"),
            _ex("C", ["bouldering", "sport"], "beginner"),
        ]
        result = _filter_exercises(pool, "beginner", "bouldering", [])
        names = [e["exercise"] for e in result]
        self.assertEqual(names, ["A", "C"])

    def test_excludes_below_min_experience(self):
        pool = [
            _ex("Adv only", ["bouldering"], "advanced"),
            _ex("Beg+", ["bouldering"], "beginner"),
        ]
        result = _filter_exercises(pool, "beginner", "bouldering", [])
        self.assertEqual([e["exercise"] for e in result], ["Beg+"])

    def test_excludes_above_max_experience(self):
        pool = [
            _ex("Beg only", ["bouldering"], "beginner", max_exp="intermediate"),
            _ex("Universal", ["bouldering"], "beginner"),
        ]
        result = _filter_exercises(pool, "advanced", "bouldering", [])
        self.assertEqual([e["exercise"] for e in result], ["Universal"])

    def test_equipment_any_of_semantics(self):
        pool = [
            _ex("Hang", ["bouldering"], "beginner", equipment=["hangboard"]),
            _ex("Hang or Home", ["bouldering"], "beginner", equipment=["hangboard", "home_wall"]),
            _ex("Universal", ["bouldering"], "beginner"),
        ]
        result = _filter_exercises(pool, "beginner", "bouldering", ["home_wall"])
        names = [e["exercise"] for e in result]
        # "Hang" excluded (no hangboard), "Hang or Home" included (any-of), "Universal" included
        self.assertEqual(names, ["Hang or Home", "Universal"])

    def test_empty_equipment_needed_means_universal(self):
        pool = [_ex("X", ["bouldering"], "beginner")]
        result = _filter_exercises(pool, "beginner", "bouldering", [])
        self.assertEqual(len(result), 1)

    def test_preserves_pool_order(self):
        pool = [
            _ex("Z", ["bouldering"], "beginner"),
            _ex("A", ["bouldering"], "beginner"),
        ]
        result = _filter_exercises(pool, "beginner", "bouldering", [])
        self.assertEqual([e["exercise"] for e in result], ["Z", "A"])


class SelectWithFallbackTests(unittest.TestCase):
    def test_returns_top_n_when_pool_has_more(self):
        pool = [_ex(f"E{i}", ["bouldering"], "beginner") for i in range(5)]
        result = _select_with_fallback(pool, "beginner", "bouldering", [], n=2)
        self.assertEqual(len(result), 2)
        self.assertEqual([e["exercise"] for e in result], ["E0", "E1"])

    def test_relaxes_equipment_when_strict_match_empty(self):
        # Pool has only hangboard exercises; user has no equipment.
        pool = [_ex("Hang", ["bouldering"], "beginner", equipment=["hangboard"])]
        result = _select_with_fallback(pool, "beginner", "bouldering", [], n=2)
        # Fallback step 1 drops equipment filter → "Hang" qualifies
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["exercise"], "Hang")

    def test_relaxes_discipline_when_equipment_relax_still_empty(self):
        # Pool has only sport exercises; user is a boulderer.
        pool = [_ex("SportThing", ["sport"], "beginner")]
        result = _select_with_fallback(pool, "beginner", "bouldering", [], n=2)
        # Fallback step 2 drops discipline filter → "SportThing" qualifies
        self.assertEqual(len(result), 1)

    def test_returns_at_least_one_even_if_only_experience_matches(self):
        # Final fallback: discipline + equipment dropped, only experience checked
        pool = [_ex("Niche", ["competition"], "beginner", equipment=["campus_board"])]
        result = _select_with_fallback(pool, "beginner", "trad", [], n=2)
        self.assertEqual(len(result), 1)

    def test_returns_empty_only_when_no_entry_matches_experience(self):
        # Pool has only elite exercises; user is beginner
        pool = [_ex("Elite", ["bouldering"], "elite")]
        result = _select_with_fallback(pool, "beginner", "bouldering", [], n=2)
        self.assertEqual(result, [])


class StripTagsTests(unittest.TestCase):
    def test_strips_tag_fields(self):
        ex = _ex("Half-crimp", ["bouldering"], "beginner", max_exp="intermediate", equipment=["hangboard"])
        stripped = _strip_tags(ex)
        self.assertNotIn("disciplines", stripped)
        self.assertNotIn("min_experience", stripped)
        self.assertNotIn("max_experience", stripped)
        self.assertNotIn("equipment_needed", stripped)

    def test_preserves_canonical_fields(self):
        ex = _ex("Half-crimp", ["bouldering"], "beginner")
        stripped = _strip_tags(ex)
        for key in ("exercise", "detail", "sets", "reps", "rest_seconds", "effort_note", "benchmark"):
            self.assertIn(key, stripped, f"{key} should survive strip")

    def test_does_not_mutate_input(self):
        ex = _ex("Half-crimp", ["bouldering"], "beginner")
        _strip_tags(ex)
        self.assertIn("disciplines", ex, "input should be untouched")


if __name__ == "__main__":
    unittest.main()
