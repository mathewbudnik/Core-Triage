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
