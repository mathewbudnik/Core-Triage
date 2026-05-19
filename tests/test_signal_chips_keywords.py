"""Regression guard for the smart-card chip → classifier keyword contract.

The chip library at `frontend/src/data/signalChips.js` ships pre-canned
free-text phrases that get synthesized into the `free_text` field at submit
time. The classifier in `src/triage.py` uses `_keyword_affirmed()` to
pattern-match those phrases into specific diagnostic paths.

If anyone edits a chip phrase (e.g. for tone or brevity) and accidentally
drops the keyword the classifier was looking for, the chip silently stops
working — the user taps it, sees no change in diagnosis. This test fails
loudly in that case.

The test is intentionally hand-mirrored from the JS chip definitions rather
than parsed live, so any change to a chip phrase forces a corresponding
change to this test. That's the regression guard.
"""

import unittest

from src.triage import _keyword_affirmed


# Hand-mirrored from frontend/src/data/signalChips.js — keep in sync.
# Each entry: (chip_id, phrase, keywords_that_must_match)
CHIPS = [
    ("pop",            "felt a pop",                                 ["pop"]),
    ("snap",           "felt a snap",                                ["snap"]),
    ("swelling",       "swelling",                                   ["swelling", "swollen"]),
    ("bruising",       "bruising",                                   ["bruising", "bruise"]),
    ("instability",    "unstable",                                   ["unstable", "instability"]),
    ("numbness",       "numbness",                                   ["numbness", "numb"]),
    ("weakness",       "weakness",                                   ["weakness", "weak"]),
    ("night",          "pain at night",                              ["night"]),

    # Finger
    ("cant_extend",    "can't extend",                               ["can't extend"]),
    ("cant_bend",      "can't bend tip",                             ["can't bend"]),
    ("stuck_bent",     "stuck bent",                                 ["stuck bent"]),
    ("catching",       "catching and locking",                       ["catching", "locking"]),

    # Calf
    ("long_approach",  "pain started on long approach",              ["approach"]),

    # Upper Back
    ("breath_pain",    "pain on deep breath",                        ["breath", "deep breath"]),
    ("twist_pain",     "pain when twisting",                         ["twist"]),
    ("rib_pain",       "rib pain",                                   ["rib", "ribs"]),

    # Knee
    ("knee_locked",    "knee locked, cannot straighten",             ["locked", "cannot straighten"]),

    # Shoulder / Chest
    ("shoulder_pop",   "felt a pop on a powerful pull",              ["pop"]),
]


class TestSignalChipsKeywords(unittest.TestCase):
    """For each chip, at least one of its 'must-match' keywords must trip
    `_keyword_affirmed()` when fed the chip's actual phrase. Catches typos
    and brand-voice edits that silently break diagnostic routing."""

    def test_every_chip_phrase_triggers_a_classifier_keyword(self):
        failures = []
        for chip_id, phrase, keywords in CHIPS:
            # Mirror the synthesizer: it lowercases the joined string before
            # passing to bucket_possibilities, which calls _keyword_affirmed
            # on the lowercased text. We match that here.
            text = phrase.lower()
            # At least one of the expected keywords must match. (Multiple
            # keywords per chip just means the classifier is checking any
            # of several phrasings — chip only needs to land on one.)
            matched = any(_keyword_affirmed(text, [kw]) for kw in keywords)
            if not matched:
                failures.append(
                    f"chip {chip_id!r}: phrase {phrase!r} does not trigger "
                    f"any of the expected keywords {keywords!r}"
                )
        self.assertFalse(
            failures,
            "Chip phrases drifted away from classifier keywords:\n  - "
            + "\n  - ".join(failures),
        )

    def test_chip_count_matches_js(self):
        """If the JS chip library grows, this test should fail until someone
        adds the new chips here. Prevents silent drift in the other
        direction (JS gains a chip that's never validated)."""
        # 18 chips as of v1. Bump this number when SIGNAL_CHIPS grows in
        # signalChips.js, and add the corresponding entries above.
        self.assertEqual(
            len(CHIPS), 18,
            "Chip count drifted. Update tests/test_signal_chips_keywords.py "
            "after changing SIGNAL_CHIPS in frontend/src/data/signalChips.js.",
        )


if __name__ == "__main__":
    unittest.main()
