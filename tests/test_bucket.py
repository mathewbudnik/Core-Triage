"""Unit tests for the Bucket dataclass and Bucket.from_id factory."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.triage import Bucket  # noqa: E402


class BucketFactoryTests(unittest.TestCase):
    def test_from_id_no_qualifier_uses_base_title(self):
        b = Bucket.from_id("pulley_a2")
        self.assertEqual(b.id, "pulley_a2")
        self.assertEqual(b.title, "Pulley strain/rupture (A2)")
        self.assertIn("Pain on palm-side", b.why)

    def test_from_id_with_qualifier_appends_em_dash_suffix(self):
        b = Bucket.from_id("pulley_a2", qualifier="most likely")
        self.assertEqual(b.title, "Pulley strain/rupture (A2) — most likely")

    def test_from_id_with_qualifier_possible(self):
        b = Bucket.from_id("tfcc", qualifier="possible")
        self.assertEqual(b.title, "TFCC irritation / tear — possible")

    def test_from_id_empty_string_qualifier_treated_as_no_qualifier(self):
        """An empty-string qualifier should produce just the base title — no trailing em-dash."""
        b = Bucket.from_id("pulley_a2", qualifier="")
        self.assertEqual(b.title, "Pulley strain/rupture (A2)")

    def test_from_id_unknown_id_raises_keyerror(self):
        with self.assertRaises(KeyError):
            Bucket.from_id("definitely_not_a_real_id")

    def test_all_entries_have_required_keys(self):
        from src.bucket_content import BUCKET_CONTENT
        for bucket_id, entry in BUCKET_CONTENT.items():
            self.assertIn("base_title", entry, f"{bucket_id} missing base_title")
            self.assertIn("why", entry, f"{bucket_id} missing why")
            self.assertIsInstance(entry["base_title"], str, f"{bucket_id} base_title not str")
            self.assertIsInstance(entry["why"], str, f"{bucket_id} why not str")


if __name__ == "__main__":
    unittest.main()
