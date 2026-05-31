"""Tests for tier mapping helpers."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.climb_grades import (  # noqa: E402
    TIER_NAMES,
    V_TIERS,
    v_grade_to_tier,
    working_tier_from_hardest,
    yds_to_tier,
)


class VTierTests(unittest.TestCase):
    def test_v_grades_unique_through_v9(self):
        self.assertEqual(v_grade_to_tier("V0"), "v0")
        self.assertEqual(v_grade_to_tier("V5"), "v5")
        self.assertEqual(v_grade_to_tier("V9"), "v9")

    def test_v10_and_above_collapse_to_v10(self):
        self.assertEqual(v_grade_to_tier("V10"), "v10")
        self.assertEqual(v_grade_to_tier("V12"), "v10")
        self.assertEqual(v_grade_to_tier("V17"), "v10")

    def test_invalid_grade_raises(self):
        with self.assertRaises(ValueError):
            v_grade_to_tier("V99")
        with self.assertRaises(ValueError):
            v_grade_to_tier("not a grade")


class YDSTierTests(unittest.TestCase):
    def test_easy_routes_v0(self):
        self.assertEqual(yds_to_tier("5.6"), "v0")
        self.assertEqual(yds_to_tier("5.10d"), "v0")

    def test_511a_v1(self):
        self.assertEqual(yds_to_tier("5.11a"), "v1")

    def test_511b_through_511c_v2(self):
        self.assertEqual(yds_to_tier("5.11b"), "v2")
        self.assertEqual(yds_to_tier("5.11c"), "v2")

    def test_511d_v3(self):
        self.assertEqual(yds_to_tier("5.11d"), "v3")

    def test_512_band(self):
        self.assertEqual(yds_to_tier("5.12a"), "v4")
        self.assertEqual(yds_to_tier("5.12b"), "v4")
        self.assertEqual(yds_to_tier("5.12c"), "v5")
        self.assertEqual(yds_to_tier("5.12d"), "v5")

    def test_513_band(self):
        self.assertEqual(yds_to_tier("5.13a"), "v6")
        self.assertEqual(yds_to_tier("5.13b"), "v7")
        self.assertEqual(yds_to_tier("5.13c"), "v8")
        self.assertEqual(yds_to_tier("5.13d"), "v9")

    def test_514_plus_v10(self):
        self.assertEqual(yds_to_tier("5.14a"), "v10")
        self.assertEqual(yds_to_tier("5.15d"), "v10")

    def test_invalid_yds_raises(self):
        with self.assertRaises(ValueError):
            yds_to_tier("5.0")
        with self.assertRaises(ValueError):
            yds_to_tier("5.16a")
        with self.assertRaises(ValueError):
            yds_to_tier("V5")


class WorkingTierTests(unittest.TestCase):
    def test_no_sends_defaults_to_v0(self):
        self.assertEqual(working_tier_from_hardest({"boulder": None, "route": None}), "v0")

    def test_picks_higher_of_boulder_and_route(self):
        # V5 boulder vs 5.11a route (V1) → V5 wins
        self.assertEqual(
            working_tier_from_hardest({"boulder": "V5", "route": "5.11a"}),
            "v5",
        )
        # V3 boulder vs 5.13a route (V6) → V6 wins
        self.assertEqual(
            working_tier_from_hardest({"boulder": "V3", "route": "5.13a"}),
            "v6",
        )

    def test_only_route(self):
        self.assertEqual(
            working_tier_from_hardest({"boulder": None, "route": "5.12c"}),
            "v5",
        )

    def test_only_boulder(self):
        self.assertEqual(
            working_tier_from_hardest({"boulder": "V8", "route": None}),
            "v8",
        )


class TierConstantsTests(unittest.TestCase):
    def test_v_tiers_list_length(self):
        self.assertEqual(len(V_TIERS), 11)
        self.assertEqual(V_TIERS[0], "v0")
        self.assertEqual(V_TIERS[-1], "v10")

    def test_tier_names_complete(self):
        for tier in V_TIERS:
            self.assertIn(tier, TIER_NAMES)
        # Spot check names
        self.assertEqual(TIER_NAMES["v0"], "Frost")
        self.assertEqual(TIER_NAMES["v7"], "Vault")
        self.assertEqual(TIER_NAMES["v10"], "Phoenix")
