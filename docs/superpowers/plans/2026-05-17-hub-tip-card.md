# Hub contextual tip card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proactive coaching tip card to the Hub. Backend rules detect one of four user states (active rehab / overtraining / plateau / return after break), the OpenAI client personalizes a 2-sentence body, cached once per day in a new `hub_tips` table, dismissable for the day.

**Architecture:** New `src/hub_tips.py` houses pattern detection + OpenAI orchestration. Detection rules read existing tables (`sessions`, `training_logs`); no schema changes needed for detection. A new `hub_tips` table caches one row per user per day with `UNIQUE(user_id, date)`. Two endpoints: `GET /api/hub/tip` (cache-aware) and `POST /api/hub/tip/dismiss`. Frontend adds a `HubTipCard` component between Rings and Project on Hub, fetched via the existing `useHubData` hook.

**Tech Stack:** Python 3 / FastAPI / Pydantic / Postgres (JSONB existing) / OpenAI Python SDK (`gpt-4o-mini`) / `unittest` / React 18 / Tailwind / lucide-react.

---

## File structure (locked before tasks)

**Backend — new code:**
- `src/hub_tips.py` — pattern detection, AI generation, cache orchestration, dismissal
- `tests/test_hub_tips.py` — TDD test suite

**Backend — modified:**
- `database.py` — `hub_tips` table migration + `get_hub_tip`, `insert_hub_tip`, `dismiss_hub_tip` helpers
- `main.py` — `GET /api/hub/tip` + `POST /api/hub/tip/dismiss` endpoints

**Frontend — new code:**
- `frontend/src/components/HubTipCard.jsx`
- `frontend/src/hooks/useHubTip.js`

**Frontend — modified:**
- `frontend/src/api.js` — `getHubTip(date)` + `dismissHubTip(date)`
- `frontend/src/hooks/useHubData.js` — add tip to the parallel fetch
- `frontend/src/components/HubTab.jsx` — render `<HubTipCard>` between rings and project

---

## Phase 1 — Backend

### Task 1: `hub_tips` table migration

**Files:**
- Modify: `database.py` (add CREATE TABLE inside `init_db()` after the `awards` migration)
- Test: `tests/test_hub_tips.py` (new)

- [ ] **Step 1: Write the failing schema test**

Create `tests/test_hub_tips.py`:

```python
"""Tests for the Hub tip card system."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import _connect, init_db  # noqa: E402


class HubTipsSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_hub_tips_table_columns(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT column_name, data_type
                       FROM information_schema.columns
                       WHERE table_name = 'hub_tips'
                       ORDER BY ordinal_position;"""
                )
                cols = cur.fetchall()
        names = [c[0] for c in cols]
        for required in ("id", "user_id", "date", "kind", "headline", "body",
                         "cta_label", "cta_route", "color", "dismissed_at", "created_at"):
            self.assertIn(required, names, f"hub_tips.{required} missing")

    def test_hub_tips_unique_user_date(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT 1 FROM information_schema.table_constraints
                       WHERE table_name = 'hub_tips'
                       AND constraint_type = 'UNIQUE';"""
                )
                self.assertIsNotNone(cur.fetchone(), "UNIQUE (user_id, date) missing")
```

- [ ] **Step 2: Run test, expect failure**

```bash
python -m unittest tests.test_hub_tips -v
```
Expected: FAIL — table doesn't exist.

- [ ] **Step 3: Add migration in `database.py`**

In `init_db()`, locate the existing `awards` table CREATE block (added in a prior feature). Directly after it (still inside the `with conn.cursor() as cur:` block), add:

```python
            # Hub tip card — one row per user per day; cached AI-personalized
            # coaching tip. See docs/superpowers/specs/2026-05-17-hub-tip-card-design.md.
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS hub_tips (
                    id           SERIAL PRIMARY KEY,
                    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date         DATE NOT NULL,
                    kind         TEXT NOT NULL,
                    headline     TEXT NOT NULL DEFAULT '',
                    body         TEXT NOT NULL DEFAULT '',
                    cta_label    TEXT,
                    cta_route    TEXT,
                    color        TEXT NOT NULL DEFAULT '#94949f',
                    dismissed_at TIMESTAMPTZ NULL,
                    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, date)
                );
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS hub_tips_user_date_idx ON hub_tips (user_id, date);")
```

- [ ] **Step 4: Run tests to verify pass**

```bash
python -m unittest tests.test_hub_tips -v
```
Expected: 2/2 pass.

- [ ] **Step 5: Commit**

```bash
git add database.py tests/test_hub_tips.py
git commit -m "feat(hub-tips): hub_tips table migration"
```

---

### Task 2: Database helpers (`get_hub_tip`, `insert_hub_tip`, `dismiss_hub_tip`)

**Files:**
- Modify: `database.py` (append helpers after `list_awards`)
- Test: `tests/test_hub_tips.py` (append `HubTipsHelpersTests`)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_hub_tips.py`:

```python
from database import (  # noqa: E402
    get_hub_tip,
    insert_hub_tip,
    dismiss_hub_tip,
)


def _make_user(email: str = "hub_tips_test@coretriage.local") -> int:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) "
                "ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id;",
                (email, "x"),
            )
            uid = cur.fetchone()[0]
            cur.execute("DELETE FROM hub_tips WHERE user_id = %s;", (uid,))
        conn.commit()
    return uid


class HubTipsHelpersTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user()

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM hub_tips WHERE user_id = %s;", (self.uid,))
            conn.commit()

    def test_get_returns_none_when_missing(self):
        self.assertIsNone(get_hub_tip(self.uid, "2026-05-17"))

    def test_insert_then_get(self):
        insert_hub_tip(self.uid, "2026-05-17", kind="overtraining",
                       headline="Take tomorrow off.", body="Five days on...",
                       cta_label="Open in Chat", cta_route="/chat",
                       color="#f7b03a")
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertIsNotNone(row)
        self.assertEqual(row["kind"], "overtraining")
        self.assertEqual(row["headline"], "Take tomorrow off.")
        self.assertEqual(row["color"], "#f7b03a")
        self.assertIsNone(row["dismissed_at"])

    def test_insert_is_idempotent(self):
        insert_hub_tip(self.uid, "2026-05-17", kind="overtraining",
                       headline="A", body="b", cta_label=None, cta_route=None, color="#000")
        insert_hub_tip(self.uid, "2026-05-17", kind="plateau_4w",
                       headline="B", body="b", cta_label=None, cta_route=None, color="#000")
        # Second insert is no-op via ON CONFLICT
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertEqual(row["kind"], "overtraining")

    def test_dismiss_sets_timestamp(self):
        insert_hub_tip(self.uid, "2026-05-17", kind="overtraining",
                       headline="A", body="b", cta_label=None, cta_route=None, color="#000")
        dismiss_hub_tip(self.uid, "2026-05-17")
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertIsNotNone(row["dismissed_at"])

    def test_dismiss_without_existing_row_inserts_sentinel(self):
        """If no tip row exists (e.g. user hits dismiss before fetching), the
        dismiss should still record so future loads short-circuit."""
        dismiss_hub_tip(self.uid, "2026-05-17")
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertIsNotNone(row, "dismiss should insert a sentinel row")
        self.assertIsNotNone(row["dismissed_at"])
```

- [ ] **Step 2: Run, expect ImportError**

```bash
python -m unittest tests.test_hub_tips.HubTipsHelpersTests -v
```
Expected: ImportError on `get_hub_tip`, `insert_hub_tip`, `dismiss_hub_tip`.

- [ ] **Step 3: Add helpers to `database.py`**

Append after the existing `list_awards` function:

```python
# ── Hub tip card helpers ─────────────────────────────────────────────


def get_hub_tip(user_id: int, date_iso: str) -> Optional[Dict[str, Any]]:
    """Return the user's tip row for a given date (or None)."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, kind, headline, body, cta_label, cta_route, color,
                       dismissed_at, created_at
                FROM hub_tips
                WHERE user_id = %s AND date = %s;
                """,
                (int(user_id), date_iso),
            )
            r = cur.fetchone()
    if not r:
        return None
    return {
        "id":           r[0],
        "kind":         r[1],
        "headline":     r[2],
        "body":         r[3],
        "cta_label":    r[4],
        "cta_route":    r[5],
        "color":        r[6],
        "dismissed_at": str(r[7]) if r[7] else None,
        "created_at":   str(r[8]),
    }


def insert_hub_tip(
    user_id: int,
    date_iso: str,
    *,
    kind: str,
    headline: str,
    body: str,
    cta_label: Optional[str],
    cta_route: Optional[str],
    color: str,
) -> Optional[int]:
    """Idempotent insert via ON CONFLICT (user_id, date) DO NOTHING.

    Returns the new row id if inserted, None if a row already existed.
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO hub_tips
                  (user_id, date, kind, headline, body, cta_label, cta_route, color)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, date) DO NOTHING
                RETURNING id;
                """,
                (int(user_id), date_iso, kind, headline, body,
                 cta_label, cta_route, color),
            )
            row = cur.fetchone()
        conn.commit()
    return int(row[0]) if row else None


def dismiss_hub_tip(user_id: int, date_iso: str) -> bool:
    """Mark today's tip as dismissed. If no row exists for today, insert
    a sentinel 'dismissed' row so future loads short-circuit.

    Returns True if a row was inserted or updated.
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            # UPSERT: try to update; if zero rows affected, insert sentinel
            cur.execute(
                """
                UPDATE hub_tips SET dismissed_at = NOW()
                WHERE user_id = %s AND date = %s
                RETURNING id;
                """,
                (int(user_id), date_iso),
            )
            updated = cur.fetchone() is not None
            if not updated:
                cur.execute(
                    """
                    INSERT INTO hub_tips
                      (user_id, date, kind, headline, body, color, dismissed_at)
                    VALUES (%s, %s, 'dismissed', '', '', '#94949f', NOW())
                    ON CONFLICT (user_id, date) DO UPDATE SET dismissed_at = NOW()
                    RETURNING id;
                    """,
                    (int(user_id), date_iso),
                )
                updated = cur.fetchone() is not None
        conn.commit()
    return updated
```

- [ ] **Step 4: Run tests**

```bash
python -m unittest tests.test_hub_tips -v
```
Expected: 7/7 pass.

- [ ] **Step 5: Commit**

```bash
git add database.py tests/test_hub_tips.py
git commit -m "feat(hub-tips): get/insert/dismiss hub_tips helpers"
```

---

### Task 3: Pattern detection (4 rules + priority resolver)

**Files:**
- Create: `src/hub_tips.py`
- Test: `tests/test_hub_tips.py` (append `PatternDetectionTests`)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_hub_tips.py`:

```python
from datetime import date, timedelta  # noqa: E402
from database import log_training, _connect  # noqa: E402
from src.hub_tips import detect_pattern  # noqa: E402


def _seed_training_log(uid: int, d: str, *, intensity: int = 7, climbs: dict = None):
    log_training(uid, {
        "date": d,
        "session_type": "bouldering",
        "duration_min": 60,
        "intensity": intensity,
        "climbs": climbs or {},
    })


def _clear_user_state(uid: int):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM training_logs WHERE user_id = %s;", (uid,))
            cur.execute("DELETE FROM hub_tips WHERE user_id = %s;", (uid,))
            cur.execute("DELETE FROM sessions WHERE user_id = %s;", (uid,))
        conn.commit()


class PatternDetectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user(email="pattern_test@coretriage.local")

    def tearDown(self):
        _clear_user_state(self.uid)

    def test_no_match_returns_none(self):
        kind, ctx = detect_pattern(self.uid, "2026-05-17")
        self.assertIsNone(kind)
        self.assertIsNone(ctx)

    def test_overtraining_fires_at_5_day_streak(self):
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        kind, ctx = detect_pattern(self.uid, "2026-05-17")
        self.assertEqual(kind, "overtraining")
        self.assertEqual(ctx["streak"], 5)

    def test_overtraining_does_not_fire_at_4_day_streak(self):
        start = date(2026, 5, 14)
        for i in range(4):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        kind, _ = detect_pattern(self.uid, "2026-05-17")
        # 4 days isn't enough; plateau/return won't fire here either
        self.assertNotEqual(kind, "overtraining")

    def test_return_break_7d_fires_at_7_days_inactive(self):
        _seed_training_log(self.uid, "2026-05-10")  # 7 days ago from May 17
        kind, ctx = detect_pattern(self.uid, "2026-05-17")
        self.assertEqual(kind, "return_break_7d")
        self.assertEqual(ctx["days"], 7)

    def test_return_break_30d_fires_at_30_days_inactive(self):
        _seed_training_log(self.uid, "2026-04-17")  # 30 days ago
        kind, ctx = detect_pattern(self.uid, "2026-05-17")
        self.assertEqual(kind, "return_break_30d")

    def test_active_rehab_outranks_overtraining(self):
        """Rehab is priority 1; even with a 5-day streak, rehab tip wins."""
        # Insert an active triage row for a rehab region (Finger)
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO sessions (user_id, injury_area, pain_level, created_at)
                       VALUES (%s, 'Finger', 5, NOW() - INTERVAL '2 days');""",
                    (self.uid,),
                )
            conn.commit()
        # And log a 5-day streak
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        kind, _ = detect_pattern(self.uid, "2026-05-17")
        self.assertEqual(kind, "active_rehab")
```

- [ ] **Step 2: Run tests, expect ImportError on `src.hub_tips`**

```bash
python -m unittest tests.test_hub_tips.PatternDetectionTests -v
```

- [ ] **Step 3: Create `src/hub_tips.py`**

```python
"""Hub tip engine — pattern detection + OpenAI personalization.

Public API:
  detect_pattern(user_id, today_iso) → (kind, context) | (None, None)
  generate_tip(kind, context, openai_client) → {headline, body}
  get_or_create_tip(user_id, today_iso, openai_client) → tip dict | None
  dismiss_tip(user_id, today_iso) → bool

Pattern priority (first match wins): active_rehab → overtraining → plateau → return_break.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, Optional, Tuple

from database import (
    _connect,
    compute_streak,
    dismiss_hub_tip,
    get_hub_tip,
    get_user_hardest,
    insert_hub_tip,
)


REHAB_REGIONS = {
    "Finger", "Wrist", "Elbow", "Shoulder", "Knee", "Hip", "Ankle",
    "Chest", "Abs", "Neck", "Triceps", "Lats", "Glutes", "Hamstrings",
    "Calves", "Lower Back", "Upper Back", "General",
}


# ── Detection rules ───────────────────────────────────────────────────


def _detect_active_rehab(user_id: int, today_iso: str) -> Tuple[bool, Dict[str, Any]]:
    """Match if user has a triage within 90 days where injury_area is in
    REHAB_REGIONS."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT injury_area, created_at
                FROM sessions
                WHERE user_id = %s
                  AND created_at >= NOW() - INTERVAL '90 days'
                ORDER BY created_at DESC
                LIMIT 1;
                """,
                (int(user_id),),
            )
            row = cur.fetchone()
    if not row:
        return False, {}
    injury_area, created_at = row
    if injury_area not in REHAB_REGIONS:
        return False, {}
    days_since = (date.today() - created_at.date()).days
    return True, {"injury_area": injury_area, "days_since": days_since}


def _detect_overtraining(user_id: int, today_iso: str) -> Tuple[bool, Dict[str, Any]]:
    """Match if compute_streak >= 5 days."""
    streak = compute_streak(user_id, today=today_iso)
    if streak < 5:
        return False, {}
    hardest = get_user_hardest(user_id, window="all")
    return True, {
        "streak": streak,
        "hardest_send": hardest.get("boulder") or hardest.get("route") or "no logged sends",
    }


def _detect_plateau(user_id: int, today_iso: str) -> Tuple[bool, Dict[str, Any]]:
    """Match if hardest_send_per_week has been the same V-grade for the
    last 4+ calendar weeks. Returns kind 'plateau_4w' or 'plateau_8w'."""
    # Get hardest boulder send per ISO week for the last 12 weeks
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    date_trunc('week', tl.date)::date AS wk,
                    MAX(CAST(SUBSTRING(grade FROM 2) AS INTEGER)) AS max_v
                FROM training_logs tl,
                     LATERAL jsonb_each(tl.climbs -> 'boulder') AS pairs(grade, val)
                WHERE tl.user_id = %s
                  AND tl.date >= (CURRENT_DATE - INTERVAL '12 weeks')
                  AND (val ->> 's')::int > 0
                GROUP BY wk
                ORDER BY wk DESC;
                """,
                (int(user_id),),
            )
            rows = cur.fetchall()
    if len(rows) < 4:
        return False, {}
    # Check whether the most recent 4 weeks all have the same max V-grade
    recent_maxes = [r[1] for r in rows[:4]]
    if len(set(recent_maxes)) != 1:
        return False, {}
    stuck_v = recent_maxes[0]
    # Check whether it goes back 8 weeks
    weeks = 4
    if len(rows) >= 8 and all(r[1] == stuck_v for r in rows[:8]):
        weeks = 8
    return True, {
        "hardest_v": f"V{stuck_v}",
        "weeks": weeks,
    }


def _detect_return_break(user_id: int, today_iso: str) -> Tuple[bool, Dict[str, Any]]:
    """Match if days_since_last_log >= 7. Bands: 7d / 14d / 30d."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT MAX(date) FROM training_logs WHERE user_id = %s;
                """,
                (int(user_id),),
            )
            r = cur.fetchone()
    last = r[0] if r else None
    if not last:
        return False, {}
    today = date.fromisoformat(today_iso)
    days = (today - last).days
    if days < 7:
        return False, {}
    band = "30d" if days >= 30 else ("14d" if days >= 14 else "7d")
    hardest = get_user_hardest(user_id, window="all")
    return True, {
        "days": days,
        "band": band,
        "hardest_lifetime": hardest.get("boulder") or hardest.get("route") or "no logged sends",
    }


# Priority resolver — first match wins
_PRIORITY = [
    ("active_rehab",  _detect_active_rehab),
    ("overtraining",  _detect_overtraining),
    ("plateau",       _detect_plateau),
    ("return_break",  _detect_return_break),
]


def detect_pattern(user_id: int, today_iso: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """Run detectors in priority order; return (kind, context) or (None, None).

    For plateau, kind is 'plateau_4w' or 'plateau_8w' (refined from context).
    For return_break, kind is 'return_break_7d' / '14d' / '30d'.
    """
    for kind, fn in _PRIORITY:
        matched, ctx = fn(user_id, today_iso)
        if matched:
            if kind == "plateau":
                kind = f"plateau_{ctx['weeks']}w"
            elif kind == "return_break":
                kind = f"return_break_{ctx['band']}"
            return kind, ctx
    return None, None
```

- [ ] **Step 4: Run tests**

```bash
python -m unittest tests.test_hub_tips.PatternDetectionTests -v
```
Expected: 6/6 pass.

- [ ] **Step 5: Commit**

```bash
git add src/hub_tips.py tests/test_hub_tips.py
git commit -m "feat(hub-tips): pattern detection + priority resolver"
```

---

### Task 4: Fallback copy + OpenAI generation

**Files:**
- Modify: `src/hub_tips.py` (append metadata + `generate_tip`)
- Test: `tests/test_hub_tips.py` (append `GenerateTipTests`)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_hub_tips.py`:

```python
from src.hub_tips import generate_tip, TIP_META, FALLBACK_COPY  # noqa: E402


class _FakeOpenAIClient:
    """Stub openai client. Returns canned JSON or raises on demand."""
    def __init__(self, response_json: str = None, raise_exc: Exception = None):
        self._json = response_json
        self._raise = raise_exc
        self.chat = self
        self.completions = self
    def create(self, **kwargs):
        if self._raise:
            raise self._raise
        class _Choice:
            def __init__(self, content):
                self.message = type("M", (), {"content": content})()
        class _R:
            def __init__(self, content):
                self.choices = [_Choice(content)]
        return _R(self._json)


class GenerateTipTests(unittest.TestCase):
    def test_each_kind_has_metadata_and_fallback(self):
        for kind in ("active_rehab", "overtraining", "plateau_4w", "plateau_8w",
                     "return_break_7d", "return_break_14d", "return_break_30d"):
            self.assertIn(kind, TIP_META, f"TIP_META missing {kind}")
            self.assertIn(kind, FALLBACK_COPY, f"FALLBACK_COPY missing {kind}")
            self.assertIn("color", TIP_META[kind])

    def test_generate_returns_openai_content_when_json_valid(self):
        client = _FakeOpenAIClient(response_json='{"headline":"Take it easy.","body":"Rest tomorrow."}')
        tip = generate_tip("overtraining", {"streak": 5, "hardest_send": "V5"}, client)
        self.assertEqual(tip["headline"], "Take it easy.")
        self.assertEqual(tip["body"], "Rest tomorrow.")
        self.assertEqual(tip["cta_label"], TIP_META["overtraining"]["cta_label"])
        self.assertEqual(tip["color"], TIP_META["overtraining"]["color"])

    def test_generate_falls_back_when_openai_raises(self):
        client = _FakeOpenAIClient(raise_exc=RuntimeError("network down"))
        tip = generate_tip("overtraining", {"streak": 5, "hardest_send": "V5"}, client)
        self.assertEqual(tip["headline"], FALLBACK_COPY["overtraining"]["headline"])
        self.assertEqual(tip["body"], FALLBACK_COPY["overtraining"]["body"])

    def test_generate_falls_back_when_openai_returns_invalid_json(self):
        client = _FakeOpenAIClient(response_json="not json at all")
        tip = generate_tip("overtraining", {"streak": 5, "hardest_send": "V5"}, client)
        self.assertEqual(tip["headline"], FALLBACK_COPY["overtraining"]["headline"])

    def test_generate_with_none_client_uses_fallback(self):
        tip = generate_tip("overtraining", {"streak": 5, "hardest_send": "V5"}, None)
        self.assertEqual(tip["headline"], FALLBACK_COPY["overtraining"]["headline"])
```

- [ ] **Step 2: Run, expect ImportError on TIP_META / FALLBACK_COPY / generate_tip**

```bash
python -m unittest tests.test_hub_tips.GenerateTipTests -v
```

- [ ] **Step 3: Add metadata + `generate_tip` to `src/hub_tips.py`**

Append to `src/hub_tips.py`:

```python
import json
import logging

logger = logging.getLogger(__name__)


# Per-kind static metadata: CTA + color. Frontend uses `color` for the
# card gradient and border.
TIP_META: Dict[str, Dict[str, Any]] = {
    "active_rehab": {
        "cta_label": "Open Body",
        "cta_route": "/body",
        "color":     "#fb7185",
    },
    "overtraining": {
        "cta_label": "Open in Chat",
        "cta_route": "/chat?topic=overtraining",
        "color":     "#f7b03a",
    },
    "plateau_4w": {
        "cta_label": "Get a drill",
        "cta_route": "/chat?topic=plateau",
        "color":     "#14b8a6",
    },
    "plateau_8w": {
        "cta_label": "Get a drill",
        "cta_route": "/chat?topic=plateau",
        "color":     "#14b8a6",
    },
    "return_break_7d":  {"cta_label": None, "cta_route": None, "color": "#fb7185"},
    "return_break_14d": {"cta_label": None, "cta_route": None, "color": "#fb7185"},
    "return_break_30d": {"cta_label": None, "cta_route": None, "color": "#fb7185"},
}


# Static fallback copy when OpenAI is unavailable. Quality is lower than
# the personalized version but the Hub never blank-renders.
FALLBACK_COPY: Dict[str, Dict[str, str]] = {
    "active_rehab": {
        "headline": "Today's rehab focus",
        "body":     "Open the Body tab for today's exercises. Keep pain at or below 3/10 and skip anything that aggravates the area.",
    },
    "overtraining": {
        "headline": "Take tomorrow off.",
        "body":     "Several climbing days in a row stack fatigue on fingers and tendons faster than you feel it. One rest day now beats a forced one later.",
    },
    "plateau_4w": {
        "headline": "Plateau detected.",
        "body":     "You've been at the same grade for a month. Mix terrain (slab vs steep), try a deload week, or pick a specific weakness drill.",
    },
    "plateau_8w": {
        "headline": "Two months at the same grade.",
        "body":     "Time to break the loop — try a structured deload, switch projecting tactics, or target one weakness for two weeks.",
    },
    "return_break_7d": {
        "headline": "Welcome back.",
        "body":     "Start easy: mobility warmup, two grades below your max, low volume. The first session always feels harder than it is.",
    },
    "return_break_14d": {
        "headline": "It's been a couple weeks.",
        "body":     "Warm up extra long today — mobility, easy traverses, then a few V0–V2s. Treat the first session as recalibration, not a benchmark.",
    },
    "return_break_30d": {
        "headline": "Long absence — ease back in.",
        "body":     "A month off means your skin, tendons, and head are all rusty. Plan two sessions a week below 80% effort before pushing.",
    },
}


def _build_prompt(kind: str, context: Dict[str, Any]) -> str:
    """Build the user message describing the situation for OpenAI."""
    if kind == "active_rehab":
        return (
            f"Climber has an active {context['injury_area']} triage from "
            f"{context['days_since']} days ago. Write a 2-sentence tip: (1) "
            f"today's rehab focus, (2) what to avoid in their next climbing "
            f"session. Direct, warm, brief."
        )
    if kind == "overtraining":
        return (
            f"Climber has logged {context['streak']} consecutive days. "
            f"Hardest send is {context['hardest_send']}. Write a 2-sentence "
            f"tip: (1) recommend rest tomorrow, (2) briefly remind why "
            f"(finger pulley fatigue, CNS recovery). Friendly, no preaching."
        )
    if kind in ("plateau_4w", "plateau_8w"):
        weeks = 4 if kind == "plateau_4w" else 8
        return (
            f"Climber has been stuck at {context['hardest_v']} for {weeks} weeks. "
            f"Write a 2-sentence tip: (1) name a likely bottleneck (power, "
            f"technique, finger strength, projecting tactics), (2) give one "
            f"concrete action for next session. Specific, no platitudes."
        )
    if kind.startswith("return_break_"):
        return (
            f"Climber hasn't logged a session in {context['days']} days. "
            f"Hardest send lifetime: {context['hardest_lifetime']}. Write a "
            f"2-sentence tip: (1) suggest an easy re-entry session "
            f"(mobility, V0–V2 warmup, low volume), (2) tell them the first "
            f"session back feels hard and that's normal. Warm, no shame."
        )
    return f"Write a brief climbing coaching tip for situation: {kind}."


_SYSTEM_PROMPT = (
    "You are a climbing coach writing a single brief coaching tip for the user's "
    "Hub dashboard. Respond with strict JSON: "
    '{"headline": "...", "body": "..."}. '
    "Headline is one short imperative sentence (≤8 words). Body is exactly 2 sentences. "
    "Tone: climber-to-climber, warm, specific, no platitudes, no emojis."
)


def generate_tip(kind: str, context: Dict[str, Any], openai_client: Optional[Any]) -> Dict[str, Any]:
    """Personalize a tip via OpenAI; fall back to static copy on any error.

    Returns: { headline, body, cta_label, cta_route, color }
    """
    meta = TIP_META.get(kind, {"cta_label": None, "cta_route": None, "color": "#94949f"})
    fb   = FALLBACK_COPY.get(kind, {"headline": "Today's focus", "body": ""})
    out  = {
        "headline":  fb["headline"],
        "body":      fb["body"],
        "cta_label": meta["cta_label"],
        "cta_route": meta["cta_route"],
        "color":     meta["color"],
    }

    if openai_client is None:
        return out

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": _build_prompt(kind, context)},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=200,
        )
        content = resp.choices[0].message.content
        parsed = json.loads(content)
        headline = (parsed.get("headline") or "").strip()
        body     = (parsed.get("body") or "").strip()
        if headline and body:
            out["headline"] = headline
            out["body"]     = body
    except Exception as e:
        logger.warning("Hub tip OpenAI generation failed for kind=%s: %s", kind, e)
        # Keep fallback copy already in `out`

    return out
```

- [ ] **Step 4: Run tests**

```bash
python -m unittest tests.test_hub_tips.GenerateTipTests -v
```
Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/hub_tips.py tests/test_hub_tips.py
git commit -m "feat(hub-tips): OpenAI generation + per-kind fallback copy"
```

---

### Task 5: `get_or_create_tip` orchestrator + `dismiss_tip`

**Files:**
- Modify: `src/hub_tips.py` (append orchestrators)
- Test: `tests/test_hub_tips.py` (append `OrchestrationTests`)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_hub_tips.py`:

```python
from src.hub_tips import get_or_create_tip, dismiss_tip  # noqa: E402


class OrchestrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.uid = _make_user(email="orchestration_test@coretriage.local")

    def tearDown(self):
        _clear_user_state(self.uid)

    def test_no_match_returns_none_and_inserts_sentinel(self):
        client = _FakeOpenAIClient(response_json='{"headline":"x","body":"y"}')
        tip = get_or_create_tip(self.uid, "2026-05-17", client)
        self.assertIsNone(tip)
        row = get_hub_tip(self.uid, "2026-05-17")
        self.assertIsNotNone(row, "sentinel row should be inserted on no-match")
        self.assertEqual(row["kind"], "none")

    def test_overtraining_match_returns_personalized_tip(self):
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        client = _FakeOpenAIClient(response_json='{"headline":"Rest up.","body":"Your fingers need it."}')
        tip = get_or_create_tip(self.uid, "2026-05-17", client)
        self.assertIsNotNone(tip)
        self.assertEqual(tip["kind"], "overtraining")
        self.assertEqual(tip["headline"], "Rest up.")
        self.assertEqual(tip["color"], "#f7b03a")

    def test_subsequent_calls_return_cached_tip_without_calling_openai(self):
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        client = _FakeOpenAIClient(response_json='{"headline":"First.","body":"Body."}')
        first = get_or_create_tip(self.uid, "2026-05-17", client)
        # Swap client to one that would raise — proves we didn't hit it
        broken = _FakeOpenAIClient(raise_exc=RuntimeError("must not call"))
        second = get_or_create_tip(self.uid, "2026-05-17", broken)
        self.assertEqual(second["headline"], first["headline"])

    def test_dismissed_tip_returns_none_on_subsequent_load(self):
        start = date(2026, 5, 13)
        for i in range(5):
            _seed_training_log(self.uid, (start + timedelta(days=i)).isoformat())
        client = _FakeOpenAIClient(response_json='{"headline":"x","body":"y"}')
        get_or_create_tip(self.uid, "2026-05-17", client)
        dismiss_tip(self.uid, "2026-05-17")
        tip = get_or_create_tip(self.uid, "2026-05-17", client)
        self.assertIsNone(tip)
```

- [ ] **Step 2: Run, expect ImportError on get_or_create_tip / dismiss_tip**

```bash
python -m unittest tests.test_hub_tips.OrchestrationTests -v
```

- [ ] **Step 3: Append orchestrators to `src/hub_tips.py`**

Append:

```python
def get_or_create_tip(
    user_id: int,
    today_iso: str,
    openai_client: Optional[Any],
) -> Optional[Dict[str, Any]]:
    """Cache-aware entry point. Returns the tip dict or None.

    1. If `hub_tips` has today's row and it's dismissed → return None.
    2. If `hub_tips` has today's row and kind='none' → return None (sentinel).
    3. If `hub_tips` has today's row with content → return it (cached).
    4. Otherwise: run pattern detection.
       - No match → insert sentinel kind='none' row, return None.
       - Match → call generate_tip + insert row + return tip.
    """
    existing = get_hub_tip(user_id, today_iso)
    if existing:
        if existing["dismissed_at"] or existing["kind"] in ("none", "dismissed"):
            return None
        return {
            "id":        existing["id"],
            "kind":      existing["kind"],
            "headline":  existing["headline"],
            "body":      existing["body"],
            "cta_label": existing["cta_label"],
            "cta_route": existing["cta_route"],
            "color":     existing["color"],
        }

    kind, context = detect_pattern(user_id, today_iso)
    if not kind:
        # Insert sentinel so we don't re-detect for the rest of today
        insert_hub_tip(
            user_id, today_iso,
            kind="none", headline="", body="",
            cta_label=None, cta_route=None, color="#94949f",
        )
        return None

    tip = generate_tip(kind, context, openai_client)
    new_id = insert_hub_tip(
        user_id, today_iso,
        kind=kind,
        headline=tip["headline"],
        body=tip["body"],
        cta_label=tip["cta_label"],
        cta_route=tip["cta_route"],
        color=tip["color"],
    )
    return {
        "id":        new_id,
        "kind":      kind,
        "headline":  tip["headline"],
        "body":      tip["body"],
        "cta_label": tip["cta_label"],
        "cta_route": tip["cta_route"],
        "color":     tip["color"],
    }


def dismiss_tip(user_id: int, today_iso: str) -> bool:
    """Mark today's tip as dismissed. Idempotent."""
    return dismiss_hub_tip(user_id, today_iso)
```

- [ ] **Step 4: Run all tests**

```bash
python -m unittest tests.test_hub_tips -v
```
Expected: ~22 tests pass (2 schema + 5 helpers + 6 detection + 5 generate + 4 orchestration).

- [ ] **Step 5: Commit**

```bash
git add src/hub_tips.py tests/test_hub_tips.py
git commit -m "feat(hub-tips): get_or_create_tip orchestrator + dismiss_tip"
```

---

### Task 6: API endpoints — `GET /api/hub/tip` + `POST /api/hub/tip/dismiss`

**Files:**
- Modify: `main.py` (add 2 endpoints after `/api/awards`)
- Test: `tests/test_hub_tips.py` (append `EndpointTests`)

- [ ] **Step 1: Append failing tests**

Append to `tests/test_hub_tips.py`:

```python
from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402


def _auth_token(email: str) -> str:
    c = TestClient(app)
    pw = "HubTipsTest!1pw"
    r = c.post("/api/auth/register", json={"email": email, "password": pw})
    if r.status_code == 400:
        r = c.post("/api/auth/login", json={"email": email, "password": pw})
    return r.json()["token"]


class EndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.email = "hub_tip_endpoint@coretriage.local"
        cls.token = _auth_token(cls.email)
        cls.client = TestClient(app)

    def tearDown(self):
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM hub_tips WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
                cur.execute(
                    "DELETE FROM training_logs WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
                cur.execute(
                    "DELETE FROM sessions WHERE user_id IN "
                    "(SELECT id FROM users WHERE email = %s);", (self.email,))
            conn.commit()

    def _h(self):
        return {"Authorization": f"Bearer {self.token}"}

    def test_get_returns_null_when_no_pattern_matches(self):
        r = self.client.get("/api/hub/tip?date=2026-05-17", headers=self._h())
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["tip"])

    def test_get_missing_date_param_returns_400(self):
        r = self.client.get("/api/hub/tip", headers=self._h())
        self.assertEqual(r.status_code, 400)

    def test_dismiss_then_get_returns_null(self):
        self.client.post("/api/hub/tip/dismiss?date=2026-05-17", headers=self._h())
        r = self.client.get("/api/hub/tip?date=2026-05-17", headers=self._h())
        self.assertIsNone(r.json()["tip"])
```

- [ ] **Step 2: Run, expect 404 / 405**

```bash
python -m unittest tests.test_hub_tips.EndpointTests -v
```

- [ ] **Step 3: Add endpoints to `main.py`**

Find the existing `@app.get("/api/awards")` endpoint in `main.py`. Append directly after its function body:

```python
@app.get("/api/hub/tip")
@limiter.limit("30/minute")
def fetch_hub_tip(
    request: Request,
    date: Optional[str] = None,
    user: Dict = Depends(get_current_user),
):
    if not date or not _DATE_RE.match(date):
        raise HTTPException(status_code=400, detail="date param required as YYYY-MM-DD")
    from src.hub_tips import get_or_create_tip
    tip = get_or_create_tip(user["id"], date, _openai_client)
    return {"tip": tip}


@app.post("/api/hub/tip/dismiss")
@limiter.limit("30/minute")
def dismiss_hub_tip_endpoint(
    request: Request,
    date: Optional[str] = None,
    user: Dict = Depends(get_current_user),
):
    if not date or not _DATE_RE.match(date):
        raise HTTPException(status_code=400, detail="date param required as YYYY-MM-DD")
    from src.hub_tips import dismiss_tip
    dismiss_tip(user["id"], date)
    return {"ok": True}
```

`_DATE_RE` is already defined in `main.py` (used by the rehab progress endpoints). It matches `^\d{4}-\d{2}-\d{2}$`.

- [ ] **Step 4: Run tests**

```bash
python -m unittest tests.test_hub_tips -v
```
Expected: 25/25 pass (22 from prior + 3 endpoint).

- [ ] **Step 5: Run full backend suite to catch regressions**

```bash
python -m unittest discover tests 2>&1 | tail -3
```
Expected: all pass (existing + ~25 new).

- [ ] **Step 6: Commit**

```bash
git add main.py tests/test_hub_tips.py
git commit -m "feat(hub-tips): GET /api/hub/tip + POST /api/hub/tip/dismiss endpoints"
```

---

## Phase 2 — Frontend

### Task 7: API client + useHubTip hook

**Files:**
- Modify: `frontend/src/api.js` (append `getHubTip`, `dismissHubTip`)
- Create: `frontend/src/hooks/useHubTip.js`

- [ ] **Step 1: Add API helpers**

In `frontend/src/api.js`, after the existing `getAwards` line, append:

```jsx
// Hub contextual tip card
export const getHubTip = (date) =>
  request('GET', `/api/hub/tip?date=${encodeURIComponent(date)}`)
export const dismissHubTip = (date) =>
  request('POST', `/api/hub/tip/dismiss?date=${encodeURIComponent(date)}`)
```

- [ ] **Step 2: Create the hook**

Create `frontend/src/hooks/useHubTip.js`:

```jsx
import { useEffect, useState, useCallback } from 'react'
import { getHubTip, dismissHubTip } from '../api'

/**
 * Fetch + manage today's Hub tip.
 *
 * Returns:
 *   { tip, loading, dismiss }
 *
 * `tip` is null when no pattern matches OR user dismissed today's tip.
 * `dismiss()` optimistically hides the card and POSTs to the backend.
 */
export function useHubTip(user) {
  const [tip, setTip] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!user) {
      setLoading(false); setTip(null); return
    }
    let cancelled = false
    setLoading(true)
    getHubTip(today)
      .then((data) => { if (!cancelled) setTip(data?.tip || null) })
      .catch(() => { if (!cancelled) setTip(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, today])

  const dismiss = useCallback(() => {
    setTip(null)  // optimistic
    dismissHubTip(today).catch(() => {})  // best-effort
  }, [today])

  return { tip, loading, dismiss }
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npx vite build 2>&1 | tail -3 && cd ..
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api.js frontend/src/hooks/useHubTip.js
git commit -m "feat(hub-tips): api helpers + useHubTip hook"
```

---

### Task 8: `HubTipCard` component

**Files:**
- Create: `frontend/src/components/HubTipCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Flame, TrendingUp, Sunrise, ChevronRight, X } from 'lucide-react'

const TOPIC_META = {
  active_rehab:    { icon: Stethoscope, label: "Today's focus · Rehab" },
  overtraining:    { icon: Flame,       label: "Today's focus · Recovery" },
  plateau_4w:      { icon: TrendingUp,  label: "Today's focus · Plateau" },
  plateau_8w:      { icon: TrendingUp,  label: "Today's focus · Plateau" },
  return_break_7d: { icon: Sunrise,     label: "Today's focus · Welcome back" },
  return_break_14d:{ icon: Sunrise,     label: "Today's focus · Welcome back" },
  return_break_30d:{ icon: Sunrise,     label: "Today's focus · Welcome back" },
}

/**
 * Contextual coaching tip — sits between Rings and Project on Hub.
 *
 * Props:
 *   tip:        { kind, headline, body, cta_label, cta_route, color } | null
 *   onDismiss:  () => void
 */
export default function HubTipCard({ tip, onDismiss }) {
  const navigate = useNavigate()
  if (!tip) return null
  const meta = TOPIC_META[tip.kind] || { icon: Flame, label: "Today's focus" }
  const Icon = meta.icon
  const c = tip.color || '#94949f'

  return (
    <div
      className="relative rounded-2xl p-4"
      style={{
        background: `linear-gradient(135deg, ${c}26, ${c}08)`,
        border: `0.5px solid ${c}4d`,
        boxShadow: `inset 0 0 24px ${c}10`,
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss tip"
        className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-md text-muted/40 hover:text-muted hover:bg-white/5"
      >
        <X size={13} />
      </button>

      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] font-bold pr-7"
           style={{ color: c }}>
        <Icon size={11} strokeWidth={2.4} />
        {meta.label}
      </div>

      <div className="text-[15px] font-bold text-text -tracking-[0.01em] mt-1.5">
        {tip.headline}
      </div>
      <div className="text-[12px] text-text/78 leading-snug mt-1">
        {tip.body}
      </div>

      {tip.cta_label && tip.cta_route && (
        <button
          type="button"
          onClick={() => { navigate(tip.cta_route); onDismiss?.() }}
          className="inline-flex items-center gap-1 mt-3 text-[11px] font-semibold"
          style={{ color: c }}
        >
          {tip.cta_label}
          <ChevronRight size={11} />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npx vite build 2>&1 | tail -3 && cd ..
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/HubTipCard.jsx
git commit -m "feat(hub-tips): HubTipCard component with per-topic icons"
```

---

### Task 9: Wire `<HubTipCard>` into `HubTab.jsx`

**Files:**
- Modify: `frontend/src/components/HubTab.jsx`

- [ ] **Step 1: Add the import + hook usage + render**

Replace `frontend/src/components/HubTab.jsx` entirely with:

```jsx
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useHubData } from '../hooks/useHubData'
import { useHubTip } from '../hooks/useHubTip'
import { workingTierFromHardest } from '../lib/tier'
import TierThemeRoot from './TierThemeRoot'
import HubGreeting from './HubGreeting'
import HubRingsCard from './HubRingsCard'
import HubTipCard from './HubTipCard'
import HubProjectCard from './HubProjectCard'
import HubWeekStrip from './HubWeekStrip'
import HubFeedCard from './HubFeedCard'

export default function HubTab({ user }) {
  const navigate = useNavigate()
  const data = useHubData(user)
  const { tip, dismiss } = useHubTip(user)
  const tierId = workingTierFromHardest(data.hardestSends)
  const today = new Date().toISOString().slice(0, 10)

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="text-accent animate-spin" />
      </div>
    )
  }

  return (
    <TierThemeRoot hardest={data.hardestSends} global>
      <div className="relative px-4 py-6 md:py-8 max-w-2xl mx-auto"
           style={{
             background:
               'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--tier-c) 28%, transparent) 0%, transparent 55%)',
           }}>
        <HubGreeting user={user} data={data} tierId={tierId} />

        <div className="space-y-3">
          <HubRingsCard
            sends={data.ringSends}
            climbDays={data.ringClimbDays}
            pushAttempts={data.ringPushAttempts}
            streakDays={data.streakDays}
          />
          <HubTipCard tip={tip} onDismiss={dismiss} />
          {data.currentProject && (
            <HubProjectCard
              project={data.currentProject}
              onContinue={() => navigate('/train')}
            />
          )}
          <HubWeekStrip
            loggedDates={data.weekLoggedDates}
            todayIso={today}
          />
          <HubFeedCard items={data.feedItems} />
        </div>
      </div>
    </TierThemeRoot>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npx vite build 2>&1 | tail -3 && cd ..
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/HubTab.jsx
git commit -m "feat(hub-tips): mount HubTipCard between rings and project"
```

---

## Phase 3 — Verification

### Task 10: Full backend test sweep

- [ ] **Step 1: Run all backend tests**

```bash
python -m unittest discover tests 2>&1 | tail -5
```
Expected: 100% pass, total count up by ~25 from the new `test_hub_tips.py`.

- [ ] **Step 2: Restart uvicorn so the new endpoints are live**

```bash
lsof -ti :8000 | xargs kill 2>/dev/null
sleep 1
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn-coretriage.log 2>&1 &
sleep 2
curl -s -o /dev/null -w "health: %{http_code}\n" http://localhost:8000/api/health
```
Expected: `health: 200`.

- [ ] **Step 3: Curl-test the new endpoint**

```bash
# Should 400 without date param
curl -s -o /dev/null -w "no date: %{http_code}\n" \
  http://localhost:8000/api/hub/tip \
  -H "Authorization: Bearer $TOKEN"
# Should 200 with valid date (returns {"tip": null} for a fresh user)
curl -s "http://localhost:8000/api/hub/tip?date=2026-05-17" \
  -H "Authorization: Bearer $TOKEN" | head
```
(Use a real token from an authenticated session; this is exploratory.)

---

### Task 11: Phone e2e verification

- [ ] **Step 1: Restart vite if needed**

```bash
lsof -ti :5173 | xargs kill 2>/dev/null
cd frontend && nohup npx vite --host 0.0.0.0 --port 5173 --clearScreen false > /tmp/vite.log 2>&1 & cd ..
sleep 3
```

- [ ] **Step 2: Smoke test on phone (LAN)**

Open `http://10.50.157.135:5173/hub` on phone, hard-refresh.

Scenarios to walk through (log sessions via the Progress tab as needed to trigger each):

1. **No tip** — fresh account, no logs, no triage → Hub renders without the tip card.
2. **Overtraining** — log 5 sessions on consecutive dates (use the date picker to backfill) → tip card appears between rings and project with Flame icon, headline "Take tomorrow off." (or AI-personalized variant). Tap "Open in Chat ›" → navigates to `/chat?topic=overtraining`.
3. **Return after break** — wipe training_logs, then log a session dated 7 days ago → tip card appears with Sunrise icon, "Welcome back." copy. No CTA.
4. **Active rehab** — submit a triage in Body tab → tip card appears with Stethoscope icon, "Open Body" CTA.
5. **Dismiss** — tap the X on any tip → card disappears immediately. Reload Hub → card stays gone. Wait until tomorrow OR temporarily change system date to next day → tip can re-appear if pattern still matches.

- [ ] **Step 3: Commit any fixes**

If any scenario shows the wrong copy / wrong icon / missing data, fix and commit as scoped follow-ups:

```bash
git add <files>
git commit -m "fix(hub-tips): <specific fix>"
```

---

## Spec coverage check

| Spec section | Tasks |
|---|---|
| `hub_tips` table | 1 |
| DB helpers (get/insert/dismiss) | 2 |
| Pattern catalog (4 patterns) | 3 |
| Priority resolver | 3 |
| AI integration (OpenAI gpt-4o-mini) | 4 |
| Per-kind fallback copy | 4 |
| Cache orchestrator (`get_or_create_tip`) | 5 |
| Dismiss flow | 2, 5, 6 |
| `GET /api/hub/tip` | 6 |
| `POST /api/hub/tip/dismiss` | 6 |
| `useHubTip` hook | 7 |
| `getHubTip` / `dismissHubTip` API helpers | 7 |
| `HubTipCard` component (visual + topic icons + dismiss) | 8 |
| Wire into Hub between rings and project | 9 |
| Edge case: OpenAI unavailable → fallback | 4 |
| Edge case: dismissed tip suppresses today | 5, 11 |
| Edge case: no pattern match → sentinel | 5 |
| Backend test sweep | 10 |
| Manual e2e | 11 |
