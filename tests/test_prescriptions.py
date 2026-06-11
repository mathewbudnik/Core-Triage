"""Pure-function tests for the skill-prescription catalog and gap logic.

No database — safe to run in CI (which provisions no Postgres).
"""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.prescriptions import (  # noqa: E402
    SKILL_AXES,
    AXIS_TO_DRILLS,
    canon_axis,
    compute_gap_axis,
    select_block,
)


class CatalogShapeTests(unittest.TestCase):
    def test_five_canonical_axes(self):
        self.assertEqual(SKILL_AXES, ("power", "crimp", "dynamic", "technique", "mobility"))

    def test_each_axis_has_at_least_three_drills(self):
        for axis in SKILL_AXES:
            self.assertIn(axis, AXIS_TO_DRILLS)
            self.assertGreaterEqual(len(AXIS_TO_DRILLS[axis]), 3, axis)

    def test_every_drill_has_required_fields_and_unique_keys(self):
        seen = set()
        for axis in SKILL_AXES:
            for d in AXIS_TO_DRILLS[axis]:
                for field in ("key", "name", "detail", "sets", "reps", "target"):
                    self.assertIn(field, d, f"{axis}:{d.get('key')} missing {field}")
                self.assertIsInstance(d["sets"], int)
                self.assertIsInstance(d["reps"], str)
                self.assertIsInstance(d["target"], int)
                self.assertNotIn(d["key"], seen, f"duplicate key {d['key']}")
                seen.add(d["key"])


class CanonAxisTests(unittest.TestCase):
    def test_aliases_legacy_keys(self):
        self.assertEqual(canon_axis("crimpy"), "crimp")
        self.assertEqual(canon_axis("technical"), "technique")

    def test_passes_canonical_through(self):
        self.assertEqual(canon_axis("power"), "power")
        self.assertEqual(canon_axis("mobility"), "mobility")


class GapAxisTests(unittest.TestCase):
    def test_picks_weakest_present_axis_below_strongest(self):
        axes = {"power": 9.0, "crimpy": 7.0, "dynamic": 6.0, "technical": 3.0, "mobility": 4.0}
        self.assertEqual(compute_gap_axis(axes), "technique")  # legacy 'technical' -> canonical

    def test_none_when_balanced(self):
        axes = {"power": 5.0, "crimpy": 5.0, "dynamic": 5.0, "technical": 5.0, "mobility": 5.0}
        self.assertIsNone(compute_gap_axis(axes))

    def test_none_when_empty_or_missing(self):
        self.assertIsNone(compute_gap_axis(None))
        self.assertIsNone(compute_gap_axis({}))

    def test_tie_for_weakest_resolves_by_canonical_order(self):
        # power and mobility tie for weakest; power comes first in SKILL_AXES.
        axes = {"power": 2.0, "crimp": 8.0, "dynamic": 8.0, "technique": 8.0, "mobility": 2.0}
        self.assertEqual(compute_gap_axis(axes), "power")


class SelectBlockTests(unittest.TestCase):
    def test_returns_three_distinct_drills(self):
        block = select_block("technique")
        self.assertEqual(len(block), 3)
        self.assertEqual(len({d["key"] for d in block}), 3)

    def test_prefers_keys_not_excluded(self):
        first_keys = [d["key"] for d in select_block("crimp")]
        second_keys = [d["key"] for d in select_block("crimp", exclude_keys=first_keys)]
        pool_keys = [d["key"] for d in AXIS_TO_DRILLS["crimp"]]
        fresh = [k for k in pool_keys if k not in first_keys]  # the 2 not used first time
        # Every fresh (non-excluded) key is preferred into the next block.
        for k in fresh:
            self.assertIn(k, second_keys)
        # 5 drills, block of 3 -> at most one forced repeat (can't be fully disjoint).
        self.assertLessEqual(len(set(first_keys) & set(second_keys)), 1)

    def test_falls_back_to_repeats_when_pool_exhausted(self):
        all_keys = [d["key"] for d in AXIS_TO_DRILLS["power"]]
        block = select_block("power", exclude_keys=all_keys)
        self.assertEqual(len(block), 3)  # still 3 even though everything is excluded

    def test_accepts_legacy_axis_key(self):
        self.assertEqual(len(select_block("technical")), 3)
