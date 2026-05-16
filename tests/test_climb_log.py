"""Tests for the climb log + grade pyramid feature."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.climb_grades import (  # noqa: E402
    grade_order,
    validate_climbs,
    format_climbs_summary,
    compute_hardest,
)


class GradeOrderTests(unittest.TestCase):
    def test_v_scale_ascending(self):
        self.assertLess(grade_order("V0"), grade_order("V5"))
        self.assertLess(grade_order("V5"), grade_order("V13"))
        self.assertLess(grade_order("V13"), grade_order("V17"))

    def test_yds_ascending(self):
        self.assertLess(grade_order("5.6"), grade_order("5.10a"))
        self.assertLess(grade_order("5.10a"), grade_order("5.10d"))
        self.assertLess(grade_order("5.10d"), grade_order("5.11a"))
        self.assertLess(grade_order("5.11a"), grade_order("5.15d"))

    def test_invalid_grade_raises(self):
        with self.assertRaises(ValueError):
            grade_order("V99")
        with self.assertRaises(ValueError):
            grade_order("5.16")


class ValidateClimbsTests(unittest.TestCase):
    def test_empty_ok(self):
        validate_climbs({})

    def test_valid_boulder_ok(self):
        validate_climbs({"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}})

    def test_valid_route_ok(self):
        validate_climbs({"route": {"5.11a": {"s": 1, "f": 0, "p": 2}}})

    def test_bad_top_level_key(self):
        with self.assertRaises(ValueError):
            validate_climbs({"trad": {"5.10a": {"s": 1, "f": 0, "p": 0}}})

    def test_bad_v_grade(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V18": {"s": 1, "f": 0, "p": 0}}})

    def test_bad_yds_grade(self):
        with self.assertRaises(ValueError):
            validate_climbs({"route": {"5.16": {"s": 1, "f": 0, "p": 0}}})

    def test_flashes_exceed_sends(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": 1, "f": 2, "p": 0}}})

    def test_negative_count(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": -1, "f": 0, "p": 0}}})

    def test_non_int_count(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": "three", "f": 0, "p": 0}}})

    def test_missing_counter_key(self):
        with self.assertRaises(ValueError):
            validate_climbs({"boulder": {"V5": {"s": 1}}})


class FormatSummaryTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(format_climbs_summary({}), "")

    def test_boulder_only(self):
        self.assertEqual(
            format_climbs_summary({"boulder": {"V5": {"s": 3, "f": 1, "p": 0}}}),
            "Boulder: V5×3 (1 flash)",
        )

    def test_boulder_with_project(self):
        self.assertEqual(
            format_climbs_summary({"boulder": {"V7": {"s": 0, "f": 0, "p": 3}}}),
            "Boulder: V7 projecting (3 tries)",
        )

    def test_multiple_disciplines(self):
        out = format_climbs_summary({
            "boulder": {"V5": {"s": 3, "f": 1, "p": 0}, "V6": {"s": 1, "f": 0, "p": 0}},
            "route":   {"5.11a": {"s": 1, "f": 0, "p": 0}},
        })
        self.assertIn("Boulder: V5×3 (1 flash), V6×1", out)
        self.assertIn("Route: 5.11a×1", out)


class ComputeHardestTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(compute_hardest({}), {"boulder": None, "route": None})

    def test_boulder_max(self):
        c = {"boulder": {"V3": {"s": 1, "f": 1, "p": 0}, "V6": {"s": 1, "f": 0, "p": 0}}}
        self.assertEqual(compute_hardest(c)["boulder"], "V6")

    def test_project_does_not_count_as_send(self):
        # Hardest SEND, not hardest attempted.
        c = {"boulder": {"V5": {"s": 1, "f": 0, "p": 0}, "V7": {"s": 0, "f": 0, "p": 3}}}
        self.assertEqual(compute_hardest(c)["boulder"], "V5")
