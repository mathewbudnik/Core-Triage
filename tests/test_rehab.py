"""Pure-function tests for rehab phase / streak / adherence. No DB — CI-safe."""
from __future__ import annotations

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.rehab import rehab_phase, rehab_streak, rehab_last7  # noqa: E402


class RehabPhaseTests(unittest.TestCase):
    def test_phase_boundaries(self):
        start = date(2026, 1, 1)
        self.assertEqual(rehab_phase(start, date(2026, 1, 1))["phase"], 1)   # day 0
        self.assertEqual(rehab_phase(start, date(2026, 1, 14))["phase"], 1)  # day 13
        self.assertEqual(rehab_phase(start, date(2026, 1, 15))["phase"], 2)  # day 14
        self.assertEqual(rehab_phase(start, date(2026, 2, 11))["phase"], 2)  # day 41
        self.assertEqual(rehab_phase(start, date(2026, 2, 12))["phase"], 3)  # day 42

    def test_day_in_phase_is_one_indexed(self):
        start = date(2026, 1, 1)
        p = rehab_phase(start, date(2026, 1, 1))
        self.assertEqual(p["day_in_phase"], 1)
        self.assertEqual(p["phase_length"], 14)

    def test_accepts_iso_strings_and_clamps_negative(self):
        self.assertEqual(rehab_phase("2026-01-01", "2026-01-20")["phase"], 2)
        # a future start clamps days to 0 -> phase 1
        self.assertEqual(rehab_phase(date(2026, 2, 1), date(2026, 1, 1))["days"], 0)

    def test_none_start_returns_none(self):
        self.assertIsNone(rehab_phase(None, date(2026, 1, 1)))


class RehabStreakTests(unittest.TestCase):
    def test_consecutive_days_including_today(self):
        dates = ["2026-06-11", "2026-06-10", "2026-06-09"]
        self.assertEqual(rehab_streak(dates, "2026-06-11"), 3)

    def test_grace_when_today_not_done_but_yesterday_is(self):
        dates = ["2026-06-10", "2026-06-09"]
        self.assertEqual(rehab_streak(dates, "2026-06-11"), 2)

    def test_zero_when_gap(self):
        dates = ["2026-06-08"]  # 3 days ago
        self.assertEqual(rehab_streak(dates, "2026-06-11"), 0)

    def test_dedupes_same_day_rows(self):
        dates = ["2026-06-11", "2026-06-11", "2026-06-10"]
        self.assertEqual(rehab_streak(dates, "2026-06-11"), 2)


class RehabLast7Tests(unittest.TestCase):
    def test_count_and_days_oldest_to_newest(self):
        # done today, yesterday, and 4 days ago
        dates = ["2026-06-11", "2026-06-10", "2026-06-07"]
        out = rehab_last7(dates, "2026-06-11")
        self.assertEqual(out["count"], 3)
        self.assertEqual(len(out["days"]), 7)
        self.assertTrue(out["days"][6])   # today (newest, last)
        self.assertTrue(out["days"][5])   # yesterday
        self.assertTrue(out["days"][2])   # 4 days ago (index 6-4)
        self.assertFalse(out["days"][0])  # 6 days ago

    def test_ignores_days_older_than_7(self):
        dates = ["2026-06-01"]  # 10 days ago
        out = rehab_last7(dates, "2026-06-11")
        self.assertEqual(out["count"], 0)
