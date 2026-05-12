"""Logic + calibration tests for src/triage.py.

Run with:
    .venv/bin/python -m unittest tests.test_triage_calibration -v

Scope:
- Urgent climbing-relevant referral flags (bowstringing, distal bicep tear,
  locked knee, Achilles rupture, pec tear). The app no longer surfaces 911-tier
  emergencies — the disclaimer handles that case.
- Severity classifier thresholds: top tier is 'severe' (no emergency tier).
- Tone calibration and output gating.
"""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.triage import (  # noqa: E402
    Intake,
    Bucket,
    classify_severity,
    classify_severity_v2,
    classify_tone,
    get_urgent_flags,
    get_emergency_flags,  # back-compat alias
    red_flags,
    validate_tone_text,
    ToneValidationError,
    TONE_REASSURING,
    TONE_INFORMATIVE,
    TONE_URGENT,
    TONE_EMERGENCY,
    format_differentials_for_tone,
    format_red_flags_for_tone,
    format_rehab_for_tone,
    situation_weight,
    CLIMBING_SITUATIONS,
)


def make_intake(**kwargs):
    """Build an Intake with safe defaults; override fields via kwargs."""
    defaults = dict(
        region="Finger",
        onset="Gradual",
        pain_type="Dull/ache",
        severity=3,
        swelling="No",
        bruising="No",
        numbness="No",
        weakness="None",
        instability="No",
        mechanism="High volume pulling",
        free_text="",
    )
    defaults.update(kwargs)
    return Intake(**defaults)


# ─── Urgent climbing-relevant referrals ──────────────────────────────────────

class UrgentReferralTests(unittest.TestCase):
    def test_bowstringing_finger_urgent(self):
        i = make_intake(region="Finger", severity=5,
                        free_text="when i flex my finger the tendon is visibly lifting off the bone")
        flags = get_urgent_flags(i)
        self.assertTrue(any("bowstringing" in f.lower() for f in flags))
        # Must NOT contain 911/ER language
        joined = " ".join(flags).lower()
        self.assertNotIn("911", joined)
        self.assertNotIn("emergency department", joined)

    def test_distal_bicep_popeye_urgent(self):
        i = make_intake(region="Elbow", onset="Sudden", severity=7, mechanism="Campusing",
                        free_text="felt a pop and now i have a popeye deformity in my upper arm")
        flags = get_urgent_flags(i)
        self.assertTrue(any("distal biceps" in f.lower() or "biceps tendon" in f.lower() for f in flags))
        joined = " ".join(flags).lower()
        self.assertNotIn("911", joined)

    def test_locked_knee_urgent(self):
        i = make_intake(region="Knee", onset="Sudden", severity=5, mechanism="Heel hook",
                        free_text="my knee is locked and i cannot straighten it")
        flags = get_urgent_flags(i)
        self.assertTrue(any("locked" in f.lower() or "meniscal" in f.lower() for f in flags))
        joined = " ".join(flags).lower()
        self.assertNotIn("911", joined)

    def test_achilles_rupture_urgent(self):
        i = make_intake(region="Ankle", onset="Sudden", severity=7, weakness="Significant",
                        free_text="heard a snap behind the ankle, cannot push up on tiptoe")
        flags = get_urgent_flags(i)
        self.assertTrue(any("achilles" in f.lower() for f in flags))

    def test_pec_tear_urgent(self):
        i = make_intake(region="Chest", onset="Sudden", severity=7, mechanism="Dynamic / jumping move",
                        free_text="felt a pop in my armpit during a big cross")
        flags = get_urgent_flags(i)
        self.assertTrue(any("pectoralis" in f.lower() or "pec" in f.lower() for f in flags))

    def test_no_911_tier_for_cauda_equina(self):
        """The cauda equina branch was removed — this app is not for true ER emergencies."""
        i = make_intake(region="Lower Back", severity=6,
                        free_text="lower back pain with new bladder issues since yesterday")
        flags = get_urgent_flags(i)
        joined = " ".join(flags).lower()
        self.assertNotIn("cauda equina", joined)
        self.assertNotIn("911", joined)

    def test_no_911_tier_for_wrist_deformity(self):
        i = make_intake(region="Wrist", onset="Sudden", severity=8,
                        free_text="fell on outstretched hand, hand is cold and pulseless")
        flags = get_urgent_flags(i)
        joined = " ".join(flags).lower()
        self.assertNotIn("911", joined)
        self.assertNotIn("emergency", joined)

    def test_back_compat_alias(self):
        """get_emergency_flags is preserved as an alias for get_urgent_flags."""
        i = make_intake(region="Finger", severity=5,
                        free_text="tendon visibly lifting off the bone")
        self.assertEqual(get_emergency_flags(i), get_urgent_flags(i))

    def test_scaphoid_treat_as_fracture_in_red_flags(self):
        i = make_intake(region="Wrist", onset="Sudden", severity=6,
                        free_text="painful at the snuffbox after a fall yesterday")
        flags = red_flags(i)
        joined = " ".join(flags).lower()
        self.assertIn("treat as a scaphoid fracture", joined)


# ─── Severity classifier thresholds ──────────────────────────────────────────

class SeverityClassifierTests(unittest.TestCase):
    def test_no_emergency_tier_returned(self):
        """The classifier never returns 'emergency' — top tier is severe."""
        i = make_intake(region="Finger", severity=5,
                        free_text="tendon visibly lifting off the bone")
        sev = classify_severity_v2(i)
        self.assertNotEqual(sev["level"], "emergency")
        self.assertEqual(sev["level"], "severe")

    def test_severe_urgent_flag(self):
        i = make_intake(region="Knee", onset="Sudden", severity=5, mechanism="Heel hook",
                        free_text="knee is locked, cannot straighten")
        self.assertEqual(classify_severity_v2(i)["level"], "severe")

    def test_severe_audible_pop(self):
        i = make_intake(region="Finger", onset="Sudden", severity=4,
                        free_text="heard a clear pop on a hard crimp", pop_reported=True)
        self.assertEqual(classify_severity_v2(i)["level"], "severe")

    def test_severe_pain_seven(self):
        i = make_intake(region="Finger", severity=7)
        self.assertEqual(classify_severity_v2(i)["level"], "severe")

    def test_severe_neuro(self):
        i = make_intake(region="Lower Back", severity=4, numbness="Yes")
        self.assertEqual(classify_severity_v2(i)["level"], "severe")

    def test_severe_bilateral_with_neuro(self):
        """Bilateral symptoms ESCALATE via neuro path only when paired with
        actual neuro signs (numbness or weakness). Bilateral alone is overuse."""
        i = make_intake(region="Neck", severity=3, bilateral_symptoms=True, numbness="Yes")
        self.assertEqual(classify_severity_v2(i)["level"], "severe")

    def test_bilateral_alone_does_not_escalate(self):
        """Bilateral aches alone (no neuro signs) should NOT trigger severe.
        This was changed in the conservative-neuro recalibration to prevent
        overuse from being mistaken for spinal cord involvement."""
        i = make_intake(region="Elbow", severity=3, bilateral_symptoms=True)
        self.assertNotEqual(classify_severity_v2(i)["level"], "severe")

    def test_transient_numbness_does_not_escalate(self):
        """Numbness=Yes with low pain and no functional limit should NOT
        trigger severe. Hand falling asleep once shouldn't stop someone from climbing."""
        i = make_intake(region="Wrist", severity=3, numbness="Yes")
        self.assertNotEqual(classify_severity_v2(i)["level"], "severe")

    def test_moderate_pain_five(self):
        i = make_intake(region="Elbow", severity=5)
        self.assertEqual(classify_severity_v2(i)["level"], "moderate")

    def test_moderate_acute_no_pop(self):
        i = make_intake(region="Knee", onset="Sudden", severity=3, mechanism="Heel hook")
        self.assertEqual(classify_severity_v2(i)["level"], "moderate")

    def test_chronic_mild_stays_mild(self):
        """8 weeks of low-pain chronic discomfort no longer auto-escalates to severe.
        It now lands in moderate (chronic >= 4 weeks) — not a false alarm."""
        i = make_intake(region="Foot", onset="Gradual", severity=3,
                        free_text="heel pain first thing in the morning, no trauma",
                        duration_weeks=8)
        self.assertEqual(classify_severity_v2(i)["level"], "moderate")

    def test_mild_full_match(self):
        i = make_intake(region="Finger", onset="Gradual", severity=2,
                        free_text="dull ache after a high volume session")
        self.assertEqual(classify_severity_v2(i)["level"], "mild")


# ─── Tone validator ──────────────────────────────────────────────────────────

class ToneValidatorTests(unittest.TestCase):
    def test_validator_rejects_banned_word_for_reassuring(self):
        with self.assertRaises(ToneValidationError):
            validate_tone_text("This is an emergency, see help.", TONE_REASSURING)

    def test_validator_rejects_banned_word_for_informative(self):
        with self.assertRaises(ToneValidationError):
            validate_tone_text("You may need surgical evaluation.", TONE_INFORMATIVE)

    def test_validator_accepts_safe_text_for_reassuring(self):
        validate_tone_text("Most climbers recover fully with simple load reduction.", TONE_REASSURING)

    def test_validator_skips_validation_for_urgent(self):
        validate_tone_text("Surgical referral may be urgent.", TONE_URGENT)


# ─── Calibration scenarios ───────────────────────────────────────────────────

class CalibrationToneTests(unittest.TestCase):
    # REASSURING ----------------------------------------------------------
    def test_reassuring_ring_finger_mild_volume(self):
        i = make_intake(region="Finger", onset="Gradual", severity=2,
                        free_text="ring finger ache after a high volume session, full ROM")
        self.assertEqual(classify_tone(i), TONE_REASSURING)

    def test_reassuring_medial_elbow_stiffness(self):
        i = make_intake(region="Elbow", onset="Gradual", severity=3,
                        free_text="medial elbow stiff after hangboard, no nerve symptoms")
        self.assertEqual(classify_tone(i), TONE_REASSURING)

    def test_reassuring_neck_stiffness_no_arm_symptoms(self):
        i = make_intake(region="Neck", onset="Gradual", severity=2,
                        free_text="neck stiff after belaying, no arm tingling")
        self.assertEqual(classify_tone(i), TONE_REASSURING)

    # INFORMATIVE ---------------------------------------------------------
    def test_informative_chronic_heel_pain(self):
        """8wk of mild heel pain with no other symptoms — informative, not urgent."""
        i = make_intake(region="Foot", onset="Gradual", severity=3,
                        free_text="heel pain first thing in the morning, no trauma",
                        duration_weeks=8)
        self.assertEqual(classify_tone(i), TONE_INFORMATIVE)

    def test_informative_ring_finger_pain_at_base(self):
        i = make_intake(region="Finger", onset="Sudden", severity=5, swelling="Yes",
                        free_text="ring finger pain at base, slight swelling, no pop")
        self.assertEqual(classify_tone(i), TONE_INFORMATIVE)

    def test_informative_lateral_knee_drop_knee(self):
        i = make_intake(region="Knee", onset="Gradual", severity=4, mechanism="Drop knee",
                        free_text="lateral knee pain after drop knee session")
        self.assertEqual(classify_tone(i), TONE_INFORMATIVE)

    def test_informative_shoulder_overhead_ache(self):
        i = make_intake(region="Shoulder", onset="Gradual", severity=5,
                        free_text="shoulder ache after overhead session, no instability")
        self.assertEqual(classify_tone(i), TONE_INFORMATIVE)

    # URGENT --------------------------------------------------------------
    def test_urgent_finger_pop_with_swelling(self):
        i = make_intake(region="Finger", onset="Sudden", severity=7, swelling="Yes",
                        free_text="audible pop and swelling within 30 minutes",
                        pop_reported=True)
        self.assertEqual(classify_tone(i), TONE_URGENT)

    def test_urgent_knee_locked(self):
        """Locked knee is now urgent (not emergency) — no 911 alarm."""
        i = make_intake(region="Knee", onset="Sudden", severity=6, mechanism="Heel hook",
                        functional_check="no",
                        free_text="knee locked after heel hook, cannot fully extend")
        self.assertEqual(classify_tone(i), TONE_URGENT)

    def test_urgent_wrist_snuffbox_after_fall(self):
        i = make_intake(region="Wrist", onset="Sudden", severity=6,
                        free_text="fell on outstretched hand, snuffbox tender")
        self.assertEqual(classify_tone(i), TONE_URGENT)

    def test_urgent_back_bilateral_neuro(self):
        """Bilateral leg neuro symptoms → urgent (severe via neuro path)."""
        i = make_intake(region="Neck", severity=6, bilateral_symptoms=True,
                        numbness="Yes", weakness="Significant",
                        free_text="neck pain after fall, both arms tingling")
        self.assertEqual(classify_tone(i), TONE_URGENT)


# ─── Output gating helpers ───────────────────────────────────────────────────

class OutputGatingTests(unittest.TestCase):
    def test_mild_shows_one_differential(self):
        buckets = [
            Bucket.from_id("pulley_a2"),
            Bucket.from_id("boutonniere"),
            Bucket.from_id("tfcc"),
        ]
        out = format_differentials_for_tone(buckets, TONE_REASSURING)
        self.assertEqual(len(out["items"]), 1)
        self.assertIn("common climbing injury", out["lead"])

    def test_moderate_shows_two_differentials(self):
        buckets = [
            Bucket.from_id("pulley_a2"),
            Bucket.from_id("boutonniere"),
            Bucket.from_id("tfcc"),
        ]
        out = format_differentials_for_tone(buckets, TONE_INFORMATIVE)
        self.assertEqual(len(out["items"]), 2)

    def test_severe_shows_three_differentials(self):
        buckets = [
            Bucket.from_id("pulley_a2"),
            Bucket.from_id("boutonniere"),
            Bucket.from_id("tfcc"),
            Bucket.from_id("de_quervain"),
        ]
        out = format_differentials_for_tone(buckets, TONE_URGENT)
        self.assertEqual(len(out["items"]), 3)

    def test_severe_suppresses_rehab(self):
        out_severe = format_rehab_for_tone({"P1": ["a"]}, TONE_URGENT)
        self.assertFalse(out_severe["show"])

    def test_mild_rehab_shows_with_lead(self):
        out = format_rehab_for_tone({"P1": ["a"]}, TONE_REASSURING)
        self.assertTrue(out["show"])
        self.assertIn("right now", out["lead"])

    def test_red_flag_urgent_primary(self):
        out = format_red_flags_for_tone(["x"], TONE_URGENT)
        self.assertTrue(out["primary"])

    def test_red_flag_mild_caps_at_three(self):
        out = format_red_flags_for_tone(["a", "b", "c", "d", "e"], TONE_REASSURING)
        self.assertEqual(len(out["items"]), 3)


# ─── Climbing situation weighting ────────────────────────────────────────────

class ClimbingSituationTests(unittest.TestCase):
    def test_weight_2x_when_in_map(self):
        self.assertEqual(situation_weight("heel_hook", "patellar_tendinopathy"), 2.0)

    def test_weight_1x_when_not_in_map(self):
        self.assertEqual(situation_weight("heel_hook", "a2_pulley"), 1.0)

    def test_full_crimp_weights_pulleys(self):
        self.assertEqual(situation_weight("full_crimp_small_hold", "a2_pulley"), 2.0)
        self.assertEqual(situation_weight("full_crimp_small_hold", "a4_pulley"), 2.0)

    def test_situation_map_all_keys_present(self):
        for key in ("full_crimp_small_hold", "campus_board", "heel_hook",
                    "drop_knee", "fall_outstretched_hand", "slab_smearing"):
            self.assertIn(key, CLIMBING_SITUATIONS)


# ─── Legacy classify_severity sanity ─────────────────────────────────────────

class LegacyClassifierTests(unittest.TestCase):
    def test_legacy_no_emergency_tier(self):
        """Legacy classifier no longer returns 'emergency' even for old triggers."""
        i = make_intake(region="Lower Back", severity=5,
                        free_text="back pain with bladder changes today")
        self.assertNotEqual(classify_severity(i)["level"], "emergency")

    def test_legacy_urgent_flag_escalates_severe(self):
        i = make_intake(region="Finger", severity=4,
                        free_text="tendon visibly lifting off the bone when i flex")
        self.assertEqual(classify_severity(i)["level"], "severe")

    def test_legacy_no_dead_end(self):
        i = make_intake(region="Unknown", onset="Gradual", severity=0)
        self.assertIn(classify_severity(i)["level"], {"mild", "moderate", "severe"})


if __name__ == "__main__":
    unittest.main(verbosity=2)
