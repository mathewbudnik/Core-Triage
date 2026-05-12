"""Unit tests for the Bucket dataclass and Bucket.from_id factory."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.triage import Bucket  # noqa: E402


class BucketFactoryTests(unittest.TestCase):
    def test_from_id_no_qualifier_uses_base_title(self):
        b = Bucket.from_id("_test_placeholder")
        self.assertEqual(b.id, "_test_placeholder")
        self.assertEqual(b.title, "Test Bucket")
        self.assertEqual(b.why, "test why")
        self.assertEqual(b.matches_if, ["bullet a", "bullet b", "bullet c"])
        self.assertEqual(b.not_likely_if, ["bullet x"])
        self.assertEqual(b.quick_test, "test self-check sentence.")

    def test_from_id_with_qualifier_appends_em_dash_suffix(self):
        b = Bucket.from_id("_test_placeholder", qualifier="most likely")
        self.assertEqual(b.title, "Test Bucket — most likely")
        # base data fields unchanged
        self.assertEqual(b.why, "test why")

    def test_from_id_unknown_id_raises_keyerror(self):
        with self.assertRaises(KeyError):
            Bucket.from_id("definitely_not_a_real_id")

    def test_from_id_empty_string_qualifier_treated_as_no_qualifier(self):
        """An empty-string qualifier should produce just the base title — no trailing em-dash."""
        b = Bucket.from_id("_test_placeholder", qualifier="")
        self.assertEqual(b.title, "Test Bucket")


if __name__ == "__main__":
    unittest.main()
