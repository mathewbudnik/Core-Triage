"""Coverage test: every bucket that bucket_possibilities() can emit must
have a corresponding entry in BUCKET_CONTENT. Sweeps a representative
intake matrix across all body regions and mechanisms.

Also asserts content-quality bounds for fully-authored buckets (Phase 1:
finger region) — at least 3 matches_if bullets, non-empty quick_test, etc.
"""
from __future__ import annotations

import os
import sys
import unittest
from itertools import product

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.triage import Intake, bucket_possibilities  # noqa: E402
from src.bucket_content import BUCKET_CONTENT  # noqa: E402

REGIONS = [
    "Finger", "Wrist", "Elbow", "Shoulder", "Knee", "Hip", "Tricep",
    "Upper back", "Lat", "Glute", "Hamstring", "Calf", "Lower back",
    "Ankle", "Foot", "Chest", "Neck",
]
MECHANISMS = [
    "Hard crimp", "Dynamic catch", "Pocket", "High volume pulling",
    "Steep climbing/board", "Asymmetric hold", "Fall", "Hard lock-off",
    "Campusing", "Heel hook", "Drop knee", "High step / rockover",
    "Stemming / bridging", "Dyno", "Compression", "Dynamic / jumping move",
    "Powerful move / slap", "Approach", "High volume hiking",
    "Small holds", "Tight shoes", "High volume climbing",
]
ONSETS = ["Sudden", "Gradual"]
SEVERITIES = [3, 7]  # below + at-or-above the acute_tissue_injury threshold

# Free-text variants that trigger conditional buckets (rib/breath/twist for
# costovertebral; pop/snap/tear for tennis_leg; approach/hiking for posterior
# tibial). Empty string is also tested via the main sweep.
FREE_TEXT_VARIANTS = [
    "",
    "felt a pop in my calf",
    "deep breath hurts in my back",
    "long approach hike then it started",
    "morning heel pain plantar",
    "can't straighten my pip joint",
]


def _intake(region, mechanism, onset, severity, free_text="", **overrides):
    base = dict(
        region=region, onset=onset, pain_type="Sharp", severity=severity,
        swelling="No", bruising="No", numbness="No", weakness="No",
        instability="No", mechanism=mechanism, free_text=free_text,
    )
    base.update(overrides)
    return Intake(**base)


class BucketContentCoverageTests(unittest.TestCase):
    def test_every_emitted_bucket_has_content(self):
        """Sweep region × mechanism × onset × severity × free_text and assert
        every emitted Bucket.id exists in BUCKET_CONTENT. This guards against
        a Bucket.from_id call referencing an id with no content entry."""
        missing = set()
        for region, mech, onset, sev, ft in product(
            REGIONS, MECHANISMS, ONSETS, SEVERITIES, FREE_TEXT_VARIANTS
        ):
            for b in bucket_possibilities(_intake(region, mech, onset, sev, free_text=ft)):
                if b.id not in BUCKET_CONTENT:
                    missing.add(b.id)
        self.assertFalse(
            missing,
            f"Bucket IDs emitted by triage but missing from BUCKET_CONTENT: {sorted(missing)}",
        )

    def test_numbness_branches_emit_known_ids(self):
        # numbness="Yes" triggers branches in elbow, lower back, neck
        for region in ("Elbow", "Lower back", "Neck"):
            intake = _intake(region, "Hard crimp", "Sudden", 5, numbness="Yes")
            for b in bucket_possibilities(intake):
                self.assertIn(b.id, BUCKET_CONTENT,
                              f"{region} numbness=Yes emitted unknown id: {b.id}")

    def test_instability_branch_emits_known_id(self):
        intake = _intake("Shoulder", "Hard crimp", "Sudden", 5, instability="Yes")
        for b in bucket_possibilities(intake):
            self.assertIn(b.id, BUCKET_CONTENT)

    def test_free_text_pulley_signal_emits_known_id(self):
        intake = _intake("Finger", "Approach", "Gradual", 3, free_text="I think it's my a2 pulley")
        ids = [b.id for b in bucket_possibilities(intake)]
        self.assertIn("pulley_a2", ids)

    def test_free_text_boutonniere_signal_emits_known_id(self):
        intake = _intake("Finger", "Hard crimp", "Sudden", 6, free_text="my pip can't straighten")
        ids = [b.id for b in bucket_possibilities(intake)]
        self.assertIn("boutonniere", ids)

    def test_all_content_entries_have_required_shape(self):
        """Every entry in BUCKET_CONTENT must have all five fields, correctly typed."""
        for bucket_id, entry in BUCKET_CONTENT.items():
            self.assertIsInstance(entry.get("base_title"), str, f"{bucket_id}: base_title")
            self.assertIsInstance(entry.get("why"), str, f"{bucket_id}: why")
            self.assertIsInstance(entry.get("matches_if", []), list, f"{bucket_id}: matches_if")
            self.assertIsInstance(entry.get("not_likely_if", []), list, f"{bucket_id}: not_likely_if")
            self.assertIsInstance(entry.get("quick_test", ""), str, f"{bucket_id}: quick_test")


class FingerContentQualityTests(unittest.TestCase):
    """Phase 1 ships full content for the finger region. Enforce content bounds
    on those entries specifically. Task 5 turns these tests green by authoring
    the content; if you're seeing failures here BEFORE Task 5, that's expected."""

    FINGER_IDS_WITH_FULL_CONTENT = (
        "pulley_a2",
        "lumbrical_tear",
        "flexor_tenosynovitis",
        "collateral_ligament_finger",
        "boutonniere",
        "acute_tissue_injury",
        "overuse_load_spike",
    )

    def test_finger_buckets_have_at_least_three_matches_if(self):
        for bid in self.FINGER_IDS_WITH_FULL_CONTENT:
            entry = BUCKET_CONTENT[bid]
            self.assertGreaterEqual(
                len(entry["matches_if"]), 3,
                f"{bid}: matches_if should have at least 3 bullets, has {len(entry['matches_if'])}",
            )

    def test_finger_buckets_have_at_least_one_not_likely_if(self):
        for bid in self.FINGER_IDS_WITH_FULL_CONTENT:
            entry = BUCKET_CONTENT[bid]
            self.assertGreaterEqual(
                len(entry["not_likely_if"]), 1,
                f"{bid}: not_likely_if should have at least 1 bullet",
            )

    def test_finger_buckets_have_quick_test(self):
        for bid in self.FINGER_IDS_WITH_FULL_CONTENT:
            entry = BUCKET_CONTENT[bid]
            self.assertTrue(
                entry["quick_test"].strip(),
                f"{bid}: quick_test should be non-empty",
            )


class NewFingerBucketsPresentTests(unittest.TestCase):
    """Coverage check: every bucket ID referenced by the rewritten
    Finger classifier branch must have a BUCKET_CONTENT entry."""

    EXPECTED_NEW_IDS = [
        "pulley_a3", "pulley_a4", "volar_plate", "trigger_finger",
        "mallet_finger", "jersey_finger", "sagittal_band_rupture",
        "hamate_hook_fracture", "pip_synovitis",
    ]

    def test_all_new_finger_bucket_ids_present(self):
        for bid in self.EXPECTED_NEW_IDS:
            self.assertIn(bid, BUCKET_CONTENT, f"missing bucket id: {bid}")
            entry = BUCKET_CONTENT[bid]
            self.assertIn("base_title", entry)
            self.assertIn("why", entry)
            self.assertGreater(len(entry["base_title"]), 0)
            self.assertGreater(len(entry["why"]), 0)


if __name__ == "__main__":
    unittest.main()
