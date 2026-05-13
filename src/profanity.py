"""Display-name profanity guard.

Intentionally small + obvious — a hardcoded blocklist of ~30 terms used as
case-insensitive substring matches. v1 is a starter list; rely on user
reports for the long tail. Imports nothing.

Why substring (not regex word-boundary)?
Users embed slurs inside otherwise-innocent handles ("xx_slur_xx"). Substring
matching catches that pattern. Cost: a few false positives like "assess"
matching "ass". Tolerable in display names (3-20 chars, low ambiguity).
"""
from __future__ import annotations

# Obvious slurs / profanity. Kept short on purpose — easier to review.
# Order doesn't matter. All checks are case-insensitive substring.
_BLOCKED_TERMS = frozenset({
    # Racial / ethnic slurs
    "nigg", "chink", "spic", "kike", "wetback", "gook", "raghead", "towelhead",
    # Homophobic / transphobic slurs
    "fag", "tranny", "dyke", "homo",
    # Misogynist slurs
    "whore", "slut", "cunt",
    # Generic profanity (sexual/scatological)
    "fuck", "shit", "asshole", "bitch", "bastard", "dick", "cock", "pussy",
    # Hate group / Nazi terminology
    "nazi", "hitler", "ku klux", "kkk", "1488", "wpww",
    # Impersonation guard — block app/admin handles
    "admin", "coretriage", "moderator", "mathewbudnik",
})


def is_clean(name: str) -> bool:
    """Return True if the name is free of blocked substrings.

    Empty/None returns True (the length validator will catch empty names).
    """
    if not name:
        return True
    low = name.lower().strip()
    return not any(term in low for term in _BLOCKED_TERMS)


def find_first_match(name: str) -> str | None:
    """Returns the first blocked term that hit, or None. Useful for tests."""
    if not name:
        return None
    low = name.lower().strip()
    for term in _BLOCKED_TERMS:
        if term in low:
            return term
    return None
