"""Tests for the rewritten Finger branch in bucket_possibilities()
and the new wizard fields (which_finger, finger_location, grip_mode)."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.triage import Intake, bucket_possibilities  # noqa: E402


def _intake(**overrides) -> Intake:
    """Build an Intake with safe defaults; override only the fields a test cares about."""
    base = dict(
        region="Finger", onset="Sudden", pain_type="Sharp", severity=5,
        swelling="No", bruising="No", numbness="No", weakness="None",
        instability="No", mechanism="Hard crimp", free_text="",
    )
    base.update(overrides)
    return Intake(**base)


class IntakeNewFieldDefaultsTests(unittest.TestCase):
    def test_intake_accepts_new_fields(self):
        i = _intake(which_finger="Ring", finger_location="palm_mid", grip_mode="full_crimp")
        self.assertEqual(i.which_finger, "Ring")
        self.assertEqual(i.finger_location, "palm_mid")
        self.assertEqual(i.grip_mode, "full_crimp")

    def test_intake_new_fields_default_blank(self):
        i = _intake()
        self.assertEqual(i.which_finger, "")
        self.assertEqual(i.finger_location, "")
        self.assertEqual(i.grip_mode, "")


class IntakeRequestForwardingTests(unittest.TestCase):
    """The FastAPI IntakeRequest must accept and forward the three new fields."""

    def test_intake_request_accepts_new_fields(self):
        from main import IntakeRequest
        req = IntakeRequest(
            region="Finger", onset="Sudden", pain_type="Sharp", severity=5,
            swelling="No", bruising="No", numbness="No", weakness="None",
            instability="No", mechanism="Hard crimp", free_text="",
            which_finger="Ring", finger_location="palm_mid", grip_mode="full_crimp",
        )
        self.assertEqual(req.which_finger, "Ring")
        self.assertEqual(req.finger_location, "palm_mid")
        self.assertEqual(req.grip_mode, "full_crimp")

    def test_intake_request_new_fields_default_blank(self):
        from main import IntakeRequest
        req = IntakeRequest(
            region="Finger", onset="Sudden", pain_type="Sharp", severity=5,
            swelling="No", bruising="No", numbness="No", weakness="None",
            instability="No", mechanism="Hard crimp",
        )
        self.assertEqual(req.which_finger, "")
        self.assertEqual(req.finger_location, "")
        self.assertEqual(req.grip_mode, "")


class FingerUrgentPatternTests(unittest.TestCase):
    """Urgent finger patterns must surface first, regardless of other signals."""

    def test_mallet_finger_text_trigger(self):
        i = _intake(free_text="my fingertip droops and I can't extend tip")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("mallet_finger", ids)
        self.assertEqual(ids.index("mallet_finger"), 0,
                         f"mallet_finger should surface first; got {ids}")

    def test_jersey_finger_ring_sudden_text(self):
        i = _intake(
            which_finger="Ring", onset="Sudden",
            free_text="grabbed a hold and now I can't bend tip on my ring finger",
        )
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("jersey_finger", ids)


class FingerPulleyPatternTests(unittest.TestCase):
    def test_a2_ring_full_crimp_palm_mid(self):
        i = _intake(which_finger="Ring", finger_location="palm_mid", grip_mode="full_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a2", ids)

    def test_a4_palm_tip_full_crimp(self):
        i = _intake(finger_location="palm_tip", grip_mode="full_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a4", ids)
        self.assertNotIn("pulley_a2", ids,
                         "A2 should not surface when location is palm_tip")

    def test_a3_palm_mid_half_crimp_pinky(self):
        # Pinky at palm_mid with half-crimp — not the A2 pattern (wrong finger),
        # not the A4 pattern (wrong location), should be A3.
        i = _intake(which_finger="Pinky", finger_location="palm_mid", grip_mode="half_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a3", ids)


class FingerJointAndPocketPatternTests(unittest.TestCase):
    def test_lumbrical_pocket_palm_base(self):
        i = _intake(finger_location="palm_base", grip_mode="pocket_1")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("lumbrical_tear", ids)

    def test_collateral_side_jam(self):
        i = _intake(finger_location="side", grip_mode="jam", onset="Sudden")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("collateral_ligament_finger", ids)

    def test_volar_plate_dorsal_hyperextend_text(self):
        i = _intake(finger_location="dorsal", free_text="finger got jammed back hard")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("volar_plate", ids)


class FingerRemainingPatternTests(unittest.TestCase):
    def test_sagittal_band_middle_dorsal_pop_top(self):
        i = _intake(
            which_finger="Middle", finger_location="dorsal",
            free_text="felt a pop on top of my knuckle",
        )
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("sagittal_band_rupture", ids)

    def test_hamate_hook_pinky_jam(self):
        i = _intake(which_finger="Pinky", grip_mode="jam")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("hamate_hook_fracture", ids)

    def test_trigger_finger_gradual_catch(self):
        i = _intake(onset="Gradual", free_text="finger catches when I close my hand")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("trigger_finger", ids)

    def test_pip_synovitis_gradual_palm_mid_swelling(self):
        i = _intake(onset="Gradual", finger_location="palm_mid", swelling="Yes")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pip_synovitis", ids)


class FingerFallbackTests(unittest.TestCase):
    """When the user skips the new finger drill-down (blank fields),
    we fall back to legacy generic buckets so old clients still work."""

    def test_legacy_fallback_blank_fields_still_surfaces_pulley(self):
        # All new fields blank — should fall back to legacy logic.
        i = _intake(mechanism="Hard crimp", free_text="")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("pulley_a2", ids,
                      "blank new fields should fall back and surface pulley_a2")
        self.assertIn("flexor_tenosynovitis", ids,
                      "legacy fallback should always surface generic tenosynovitis")

    def test_tail_catch_all_for_unmatched_specific_combo(self):
        # Pinky + palm_mid + full_crimp — no specific pulley rule matches
        # (A2 needs Ring/Middle/Index; A4 needs palm_tip; A3 needs half/open).
        # Tail catch-all should ensure flexor_tenosynovitis still surfaces.
        i = _intake(which_finger="Pinky", finger_location="palm_mid", grip_mode="full_crimp")
        ids = [b.id for b in bucket_possibilities(i)]
        self.assertIn("flexor_tenosynovitis", ids,
                      "tail catch-all should surface generic bucket when no pattern matches")
