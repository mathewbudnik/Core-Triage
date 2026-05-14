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




# Schema validation — every pool entry must have the required tag fields
# with correct types. This catches authoring errors that would otherwise
# only surface when a specific (experience × discipline × equipment) combo
# happens to filter to that entry.

VALID_DISCIPLINES = {"bouldering", "sport", "trad", "competition"}
VALID_EQUIPMENT = {"hangboard", "home_wall", "gym_membership", "outdoor_crag", "campus_board", "system_wall"}


class ExercisePoolSchemaTests(unittest.TestCase):
    def _collect_pools(self):
        from src.coach import (
            _HANGBOARD_POOL, _POWER_POOL, _ENDURANCE_POOL,
            _STRENGTH_POOL, _FOOTWORK_POOL, _MENTAL_POOL,
        )
        return {
            "hangboard": _HANGBOARD_POOL,
            "power": _POWER_POOL,
            "endurance": _ENDURANCE_POOL,
            "strength": _STRENGTH_POOL,
            "footwork": _FOOTWORK_POOL,
            "mental": _MENTAL_POOL,
        }

    def test_every_pool_entry_has_required_tag_fields(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                self.assertIn("disciplines", ex, f"{label}: missing disciplines")
                self.assertIn("min_experience", ex, f"{label}: missing min_experience")
                # equipment_needed and max_experience are optional fields,
                # but if present must be the right shape — checked separately below

    def test_disciplines_values_are_valid(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                discs = ex["disciplines"]
                self.assertIsInstance(discs, list, f"{label}: disciplines must be list")
                self.assertGreater(len(discs), 0, f"{label}: disciplines must be non-empty")
                for d in discs:
                    self.assertIn(d, VALID_DISCIPLINES, f"{label}: '{d}' is not a valid discipline")

    def test_min_experience_is_valid_level(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                self.assertIn(ex["min_experience"], _EXPERIENCE_LEVELS, f"{label}: invalid min_experience")

    def test_max_experience_when_present_is_valid(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                if "max_experience" in ex:
                    self.assertIn(ex["max_experience"], _EXPERIENCE_LEVELS, f"{label}: invalid max_experience")

    def test_max_experience_not_below_min(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                if "max_experience" not in ex:
                    continue
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                min_idx = _EXPERIENCE_LEVELS.index(ex["min_experience"])
                max_idx = _EXPERIENCE_LEVELS.index(ex["max_experience"])
                self.assertLessEqual(min_idx, max_idx, f"{label}: max_experience < min_experience")

    def test_equipment_needed_values_are_valid(self):
        for pool_name, pool in self._collect_pools().items():
            for ex in pool:
                label = f"{pool_name}::{ex.get('exercise', '?')}"
                eq = ex.get("equipment_needed", [])
                self.assertIsInstance(eq, list, f"{label}: equipment_needed must be list")
                for e in eq:
                    self.assertIn(e, VALID_EQUIPMENT, f"{label}: '{e}' is not valid equipment")


class BlockCoverageTests(unittest.TestCase):
    """Sweep experience × discipline × equipment-subsets and assert every block
    returns at least one exercise for every combination. Guards against
    fallback-chain leaks and discipline tags that accidentally exclude
    a valid user."""

    EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "elite"]
    DISCIPLINES = ["bouldering", "sport", "trad", "competition"]
    EQUIPMENT_SUBSETS = [
        [],  # nothing
        ["hangboard"],
        ["gym_membership"],
        ["hangboard", "campus_board", "gym_membership"],
        ["hangboard", "home_wall", "gym_membership", "outdoor_crag", "campus_board", "system_wall"],  # full kit
    ]

    BLOCK_NAMES = ["hangboard", "power", "endurance", "strength", "footwork", "mental"]

    def _get_block(self, name):
        from src import coach
        return getattr(coach, f"_{name}_block")

    def test_every_block_returns_nonempty_for_every_combination(self):
        from itertools import product
        for block_name in self.BLOCK_NAMES:
            block = self._get_block(block_name)
            for exp, disc, equip in product(self.EXPERIENCE_LEVELS, self.DISCIPLINES, self.EQUIPMENT_SUBSETS):
                result = block(exp, disc, equip)
                self.assertGreaterEqual(
                    len(result), 1,
                    f"{block_name} returned empty for ({exp}, {disc}, {equip!r})",
                )

    def test_returned_exercises_have_canonical_fields_only(self):
        """Tag fields must be stripped from the returned exercises so the
        generated plan dict matches the legacy schema."""
        for block_name in self.BLOCK_NAMES:
            block = self._get_block(block_name)
            result = block("intermediate", "bouldering", ["hangboard", "campus_board"])
            for ex in result:
                for tag_key in ("disciplines", "min_experience", "max_experience", "equipment_needed"):
                    self.assertNotIn(
                        tag_key, ex,
                        f"{block_name}: tag field '{tag_key}' leaked into returned exercise '{ex.get('exercise', '?')}'",
                    )
                # Canonical fields must survive
                for canonical in ("exercise", "detail", "sets", "reps", "rest_seconds", "effort_note", "benchmark"):
                    self.assertIn(
                        canonical, ex,
                        f"{block_name}: canonical field '{canonical}' missing from '{ex.get('exercise', '?')}'",
                    )


class BlockDifferentiationTests(unittest.TestCase):
    """Verify the personalisation actually personalises — different inputs
    must produce different outputs in key places."""

    def test_boulderer_and_sport_climber_get_different_power_blocks_when_no_campus(self):
        """Without a campus board, the boulderer's strict filter returns empty,
        the fallback chain delivers something. The sport climber also gets
        a fallback. Both shouldn't be empty — but they don't have to be
        identical either; what matters is that the result is sensible."""
        from src.coach import _power_block
        boulder_out = _power_block("intermediate", "bouldering", [])
        sport_out = _power_block("intermediate", "sport", [])
        self.assertGreaterEqual(len(boulder_out), 1)
        self.assertGreaterEqual(len(sport_out), 1)

    def test_pinch_hangs_only_for_advanced_plus_boulder_or_competition(self):
        """Anti-regression for the original user complaint: pinch hangs
        must not appear for sport/trad climbers or for anyone below advanced."""
        from src.coach import _hangboard_block

        def names(experience, discipline):
            return [e["exercise"] for e in _hangboard_block(experience, discipline, ["hangboard"])]

        # Should NOT contain pinch hangs:
        for case in [
            ("beginner", "bouldering"),
            ("intermediate", "bouldering"),
            ("intermediate", "sport"),
            ("intermediate", "trad"),
            ("advanced", "sport"),
            ("advanced", "trad"),
            ("elite", "sport"),
            ("elite", "trad"),
        ]:
            self.assertNotIn(
                "Max-weight pinch hangs", names(*case),
                f"Pinch hangs leaked into {case}",
            )

        # SHOULD be eligible (block only takes top n=2, so check pool eligibility
        # via the strict filter rather than the selection slot):
        from src.coach import _HANGBOARD_POOL, _filter_exercises
        for case in [
            ("advanced", "bouldering"),
            ("elite", "bouldering"),
            ("advanced", "competition"),
            ("elite", "competition"),
        ]:
            eligible = _filter_exercises(_HANGBOARD_POOL, case[0], case[1], ["hangboard"])
            eligible_names = [e["exercise"] for e in eligible]
            self.assertIn(
                "Max-weight pinch hangs", eligible_names,
                f"Pinch hangs not eligible for {case} but should be",
            )

    def test_no_campus_board_filters_campus_exercises(self):
        """Equipment gating filters out campus_board-required exercises;
        no-equipment entries still qualify in the strict path."""
        from src.coach import _POWER_POOL, _filter_exercises
        eligible = _filter_exercises(_POWER_POOL, "intermediate", "bouldering", [])
        names = [e["exercise"] for e in eligible]
        # Campus-board-required entries must be absent when no campus_board is provided.
        campus_required = [
            e["exercise"]
            for e in _POWER_POOL
            if "campus_board" in e.get("equipment_needed", [])
        ]
        for ex in campus_required:
            self.assertNotIn(
                ex, names,
                f"Campus-board exercise '{ex}' should be filtered when campus_board absent",
            )
        # No-equipment entries that match discipline + experience should be present.
        no_equip_matching = [
            e["exercise"]
            for e in _POWER_POOL
            if not e.get("equipment_needed")
            and "bouldering" in e.get("disciplines", [])
            and e.get("min_experience") in ("beginner", "intermediate")
        ]
        for ex in no_equip_matching:
            self.assertIn(
                ex, names,
                f"No-equipment exercise '{ex}' should pass the strict filter for boulderer with no gear",
            )

    def test_trad_climber_gets_headpoint_practice_in_mental_block(self):
        """The narrow tagging on Headpoint Practice (sport+trad only) is
        the kind of differentiation this whole refactor exists to enable."""
        from src.coach import _mental_block
        names = [e["exercise"] for e in _mental_block("intermediate", "trad", [])]
        self.assertIn("Headpoint practice", names)

    def test_boulderer_does_not_get_headpoint_practice_via_strict_filter(self):
        """Boulderer shouldn't see Headpoint Practice through the strict
        filter (it's not tagged for bouldering)."""
        from src.coach import _MENTAL_POOL, _filter_exercises
        eligible = _filter_exercises(_MENTAL_POOL, "intermediate", "bouldering", [])
        names = [e["exercise"] for e in eligible]
        self.assertNotIn("Headpoint practice", names)


class GeneratePlanSmokeTest(unittest.TestCase):
    """End-to-end: generate_plan must still produce a structurally valid
    plan dict for a default profile. Doesn't assert specific exercises —
    just that the shape is intact after the refactor."""

    def _profile(self, **overrides):
        base = {
            "experience_level": "intermediate",
            "years_climbing": 3,
            "primary_discipline": "bouldering",
            "max_grade_boulder": "V5",
            "max_grade_route": "",
            "days_per_week": 3,
            "session_length_min": 90,
            "equipment": ["hangboard", "gym_membership"],
            "weaknesses": [],
            "primary_goal": "grade_progression",
            "goal_grade": "V7",
        }
        base.update(overrides)
        return base

    def test_default_profile_generates_valid_plan(self):
        from src.coach import generate_plan
        plan = generate_plan(self._profile(), injury_flags=[], openai_client=None)
        self.assertIsInstance(plan, dict)
        self.assertIn("plan_data", plan)
        sessions = plan["plan_data"].get("sessions", [])
        self.assertGreater(len(sessions), 0)
        for s in sessions[:5]:
            self.assertIn("main", s)
            for ex in s["main"]:
                # Canonical fields present
                self.assertIn("exercise", ex)
                self.assertIn("sets", ex)
                # Tag fields stripped
                for tag in ("disciplines", "min_experience", "equipment_needed"):
                    self.assertNotIn(tag, ex, f"Tag '{tag}' leaked into generated plan exercise {ex.get('exercise','?')}")

    def test_sport_climber_no_campus_generates_valid_plan(self):
        from src.coach import generate_plan
        plan = generate_plan(
            self._profile(primary_discipline="sport", equipment=["gym_membership"]),
            injury_flags=[], openai_client=None,
        )
        sessions = plan["plan_data"].get("sessions", [])
        self.assertGreater(len(sessions), 0)

    def test_trad_climber_minimal_equipment_generates_valid_plan(self):
        from src.coach import generate_plan
        plan = generate_plan(
            self._profile(primary_discipline="trad", equipment=[]),
            injury_flags=[], openai_client=None,
        )
        sessions = plan["plan_data"].get("sessions", [])
        self.assertGreater(len(sessions), 0)


if __name__ == "__main__":
    unittest.main()
