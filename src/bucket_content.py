"""Content map for triage buckets.

Each entry is keyed by a stable, snake_case bucket ID and provides:
- base_title: canonical injury name (qualifier suffix added at runtime)
- why: one-line plain-language reason this bucket surfaced
- matches_if: 3-5 bullets the user can self-check against
- not_likely_if: 1-3 bullets that argue AGAINST this bucket
- quick_test: a single-sentence palpation or movement self-check

Phase 1 of the rollout fills full content for the finger region only.
All other region buckets ship with base_title + why and empty list/string
fields for the new content; their cards render as non-interactive (no chevron)
in the UI until content is authored in Phase 2.
"""
from __future__ import annotations

BUCKET_CONTENT: dict[str, dict] = {
    # Placeholder used only by Task 1's tests. Replaced/expanded in Task 2.
    "_test_placeholder": {
        "base_title": "Test Bucket",
        "why": "test why",
        "matches_if": ["bullet a", "bullet b", "bullet c"],
        "not_likely_if": ["bullet x"],
        "quick_test": "test self-check sentence.",
    },
}
