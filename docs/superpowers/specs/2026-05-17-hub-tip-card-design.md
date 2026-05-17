# Hub contextual tip card (v1)

**Date:** 2026-05-17
**Owner:** Mathew
**Status:** Approved (brainstormed in conversation; mockups in `.superpowers/brainstorm/1760-1779036891/`)

## Problem

The app already coaches reactively (Body tab handles injury triage + rehab; Chat tab answers freeform questions) but never *proactively* surfaces a relevant tip when the climber's state warrants one. A user with a 5-day streak doesn't get a rest-day nudge. A user stuck at V5 for 8 weeks doesn't get plateau-breakthrough advice. A user who hasn't logged in 14 days doesn't get a soft re-entry suggestion. The leaderboard (just scrapped) was filling the wrong gap: social comparison instead of personal coaching.

This spec adds a single context-aware tip card to the Hub that reads the user's state, picks a topic from a curated 4-pattern catalog, and uses the existing OpenAI client to personalize one short paragraph.

## Solution

Hybrid pattern + AI: backend rules pick the topic, the OpenAI client writes the body and headline. Tip refreshes once per day (cached in a new `hub_tips` table). Card sits between the Rings card and Project card on the Hub. Dismissable with an X — hidden for that day only, re-fires tomorrow if the pattern still matches.

Explicitly **not** in this spec: notifications, plateau-aware drill libraries, weekly recaps, share-image export, multi-tip stacking, per-pattern user toggles, voice/tone customization.

## Pattern catalog (v1)

Four patterns, evaluated in priority order. First match wins. If none match, no tip card renders.

### 1. Active rehab (priority: 1, highest)

**Detection:** User has an `active_triage` (most recent `sessions` row within 90 days where `injury_area` is in REHAB_REGIONS).

**Topic identifier:** `active_rehab`

**AI system prompt skeleton:** "You're a climbing-rehab coach. The user has an active {injury_area} triage from {N} days ago. They're in Phase {phase}, day {dayInPhase} of {phaseLength}. Write a 2-sentence tip that (1) names today's focus for their rehab and (2) tells them what to avoid in their next climbing session. Be direct, warm, and brief."

**CTA:** "Open Body tab →" navigates to `/body`.

**Card color:** Coral (matches Body / triage system).

### 2. Overtraining / streak (priority: 2)

**Detection:** `computeStreak(user, today) >= 5` AND no plan rest day today.

**Topic identifier:** `overtraining`

**AI system prompt skeleton:** "You're a climbing coach watching for overtraining. The user has logged {streak} consecutive days of climbing. Their recent sessions are averaging RPE {avg_rpe}. Their hardest send last 30d is {hardest}. Write a 2-sentence tip that (1) recommends rest tomorrow and (2) reminds them why (finger pulley fatigue, CNS recovery) without being preachy. Friendly, climber-to-climber."

**CTA:** "Open in Chat →" navigates to `/chat` with a prefilled topic.

**Card color:** Honey/amber (the existing Flame-streak gold).

### 3. Plateau / grade-stuck (priority: 3)

**Detection:** User's `hardest_send` (boulder, 30-day window) has been the same V-grade for the last 4+ calendar weeks. Computed by querying max-grade-per-week across the last 4 weeks of `training_logs.climbs.boulder.*.s > 0`.

**Topic identifier:** `plateau_4w` (or `plateau_8w` if it's been ≥8 weeks — same prompt template, different urgency phrase).

**AI system prompt skeleton:** "You're a climbing coach. The user has been stuck at {hardest_v} for {weeks} weeks. Their pyramid this month: {pyramid_summary}. Write a 2-sentence tip that (1) names a likely bottleneck (power, technique-on-this-style, finger strength, projecting tactics) based on the pyramid shape and (2) gives one concrete action for next session. Specific, no platitudes."

**CTA:** "Get a drill →" opens Chat prefilled with "Help me break through my V{X} plateau."

**Card color:** Teal (CoreTriage primary — feels diagnostic).

### 4. Return after break (priority: 4, lowest)

**Detection:** `daysSinceLastLog >= 7` (counted from today's date).

**Topic identifier:** `return_break_7d` / `return_break_14d` / `return_break_30d` — three bands. Same prompt template; band is passed in.

**AI system prompt skeleton:** "You're a climbing coach welcoming the user back. They haven't logged a session in {days} days. Their hardest send (lifetime) is {hardest}. Write a 2-sentence tip that (1) suggests an easy re-entry session (mobility warmup, grades 2 below their max, low volume) and (2) sets expectations that the first session back will feel hard and that's normal. Warm, no shame."

**CTA:** None — just a "Got it" / dismiss. (Future: link to a mobility warmup library.)

**Card color:** Coral (matches the "ease back in" Body palette).

### Priority resolution

When multiple patterns match (e.g. a user who's been away 14 days AND has an open injury triage), the first one in the list above wins. Active rehab outranks everything because injuries are time-sensitive.

## Visual design

Card sits between the Rings card and the Project card on the Hub, inside the existing `space-y-3` stack.

```
┌─────────────────────────────────────┐
│  Greeting (existing)                │
├─────────────────────────────────────┤
│  Rings card (existing)              │
├─────────────────────────────────────┤
│  Tip card   ◄── NEW                 │
│    ▸ topic eyebrow + icon           │
│    ▸ 1-line headline (bold)         │
│    ▸ 2-3 sentence body              │
│    ▸ CTA link + dismiss X           │
├─────────────────────────────────────┤
│  Project card (existing, if any)    │
├─────────────────────────────────────┤
│  Week strip (existing)              │
├─────────────────────────────────────┤
│  Feed (existing)                    │
└─────────────────────────────────────┘
```

Component: `HubTipCard.jsx`. Props:
```ts
{
  tip:      { kind, headline, body, cta_label, cta_route, color },
  onDismiss: () => void,   // POSTs dismiss; locally hides card
  onCta:     () => void,   // navigate to cta_route + dismiss
}
```

Visual styling:
- Background: `linear-gradient(135deg, {color}20%, {color}05%)` (rgba with low opacity)
- Border: `0.5px solid {color}30%`
- Eyebrow: 11px ALL CAPS with topic-icon (Flame for streak, Stethoscope for rehab, etc.), letter-spacing 0.08em, color matches topic
- Headline: 15px bold, white, -0.01em tracking
- Body: 12px regular, white 78%, leading 1.4
- CTA: 11px font-semibold, color matches topic
- Dismiss X: top-right, 18px hit area, muted opacity

## API

### `GET /api/hub/tip`

Returns today's tip for the current user, or `null` if no pattern matches OR the user has dismissed today's tip.

Response shape:
```json
{
  "tip": {
    "id":         123,
    "kind":       "overtraining",
    "headline":   "Take tomorrow off.",
    "body":       "Five days on means your fingers are fried before they feel it. One rest day now = a stronger session Monday than two grindy ones today.",
    "cta_label":  "Open in Chat",
    "cta_route":  "/chat?topic=overtraining",
    "color":      "#f7b03a"
  }
}
```

Or `{ "tip": null }` when no tip applies today.

Behavior:
- Check `hub_tips` table for today's row for this user.
  - If row exists AND `dismissed_at IS NULL` → return cached tip.
  - If row exists AND `dismissed_at IS NOT NULL` → return `null`.
- If no row exists → run pattern detection. If a pattern matches → call OpenAI with the topic's prompt + user state → insert row → return tip. If no pattern matches → insert sentinel row (`kind = 'none'`) → return `null`.

The sentinel-row pattern avoids re-running pattern detection + AI on every Hub load when nothing applies today.

### `POST /api/hub/tip/dismiss`

Marks today's tip as dismissed.

Body: empty (the row to dismiss is implicit: today's row for the auth'd user).
Response: `{ "ok": true }`.

Behavior:
- `UPDATE hub_tips SET dismissed_at = NOW() WHERE user_id = %s AND date = %s` (user's local date — sent as `date` query param? Or computed server-side as `CURRENT_DATE`? See "Open questions" below).

## Data model

### New table: `hub_tips`

```sql
CREATE TABLE IF NOT EXISTS hub_tips (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,           -- user-local YYYY-MM-DD
  kind         TEXT NOT NULL,           -- 'active_rehab' | 'overtraining' | 'plateau_4w' | 'plateau_8w' | 'return_break_7d' | 'return_break_14d' | 'return_break_30d' | 'none'
  headline     TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  cta_label    TEXT,
  cta_route    TEXT,
  color        TEXT NOT NULL,           -- hex like '#f7b03a'
  dismissed_at TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);
CREATE INDEX hub_tips_user_date_idx ON hub_tips (user_id, date);
```

- `UNIQUE (user_id, date)` makes the cache idempotent.
- `kind = 'none'` rows are sentinels: "checked today, no pattern matched, don't re-check until tomorrow."
- `date` is the user-local YYYY-MM-DD passed from the frontend (matches existing `training_logs.date` convention).

### No new columns on `users` or `athlete_profiles`.

## Backend implementation

### New file: `src/hub_tips.py`

```python
"""Hub tip engine — pattern detection + OpenAI personalization.

Public API:
  detect_pattern(user_id, today_iso) → ('kind', context_dict) | (None, None)
  generate_tip(kind, context, openai_client) → { headline, body, cta_label, cta_route, color }
  get_or_create_tip(user_id, today_iso, openai_client) → tip dict | None
  dismiss_tip(user_id, today_iso) → bool
"""
```

Function responsibilities:

- `detect_pattern(user_id, today_iso)` runs the 4 detection rules in priority order. Returns the FIRST match's kind + context (data needed for the AI prompt). Returns `(None, None)` if no match.

- `generate_tip(kind, context, openai_client)` builds the system prompt from a per-kind template (literals in this file), sends to OpenAI gpt-4o-mini (cheaper than gpt-4o for short personalization tasks), and parses the response into `{ headline, body }`. Hard-codes `cta_label`, `cta_route`, `color` from a per-kind table.

- `get_or_create_tip(user_id, today_iso, openai_client)`:
  1. Check `hub_tips` for `(user_id, today_iso)`.
  2. If row exists and not dismissed → return tip from row.
  3. If row exists and dismissed → return `None`.
  4. No row → call `detect_pattern`. If `None` → insert sentinel row, return `None`. Otherwise call `generate_tip` and insert the row, return the tip.

- `dismiss_tip(user_id, today_iso)` updates `dismissed_at = NOW()` on the row. If no row exists, insert a sentinel `kind='dismissed'` row so future Hub loads short-circuit.

### Database helpers in `database.py`

- `_init_db` migration: create `hub_tips` table (idempotent).
- `get_hub_tip(user_id, date_iso) → dict | None`: returns the row (including `dismissed_at`) or None.
- `insert_hub_tip(user_id, date_iso, **fields) → int`: idempotent via `ON CONFLICT (user_id, date) DO NOTHING`.
- `dismiss_hub_tip(user_id, date_iso) → bool`: UPDATE-or-insert.

### Endpoints in `main.py`

- `@app.get("/api/hub/tip")` calls `get_or_create_tip` and returns `{tip}`. Date is `req.query.date` (YYYY-MM-DD) — frontend passes user-local date to match `training_logs.date` convention.
- `@app.post("/api/hub/tip/dismiss")` calls `dismiss_tip`. Same date param.

Both endpoints are rate-limited at `30/minute`.

### Detection rule signatures

```python
# In src/hub_tips.py — each returns (matches: bool, context: dict)

def _detect_active_rehab(user_id: int, today_iso: str) -> Tuple[bool, Dict]:
    """Match if user has a triage within 90 days where injury_area is in
    REHAB_REGIONS. Context: { injury_area, days_since, phase, day_in_phase, phase_length }"""

def _detect_overtraining(user_id: int, today_iso: str) -> Tuple[bool, Dict]:
    """Match if streak >= 5 days. Context: { streak, avg_rpe, hardest_send }"""

def _detect_plateau(user_id: int, today_iso: str) -> Tuple[bool, Dict]:
    """Match if hardest_send_per_week has been the same V-grade for 4+ weeks.
    Context: { hardest_v, weeks, pyramid_summary }"""

def _detect_return_break(user_id: int, today_iso: str) -> Tuple[bool, Dict]:
    """Match if days_since_last_log >= 7. Context: { days, hardest_lifetime, band: '7d'|'14d'|'30d' }"""
```

Priority order in `detect_pattern`: rehab → overtraining → plateau → return.

### OpenAI integration

Uses the existing `_openai_client` from `main.py` (gpt-4o currently; the tip engine uses `model='gpt-4o-mini'` because the task is short).

The system prompt asks for the response in a strict JSON format:
```json
{ "headline": "Take tomorrow off.", "body": "Five days on..." }
```

The engine parses the response and falls back to a hardcoded template per kind if JSON parsing fails. If the OpenAI call fails entirely (network, key missing, rate limit), the engine still inserts a row using the hardcoded fallback so the Hub never blank-renders.

## Frontend implementation

### New files

- `frontend/src/components/HubTipCard.jsx` — the card component (see Visual design above)
- `frontend/src/hooks/useHubTip.js` — fetches today's tip + exposes dismiss

### Modified files

- `frontend/src/api.js` — add `getHubTip(date)` and `dismissHubTip(date)`
- `frontend/src/hooks/useHubData.js` — fetch tip alongside other Hub data (add to the `Promise.allSettled` block)
- `frontend/src/components/HubTab.jsx` — render `<HubTipCard tip={data.tip} ...>` between `<HubRingsCard>` and `<HubProjectCard>`

### Per-topic styling (frontend lookup)

Defined in `HubTipCard.jsx` since the backend returns the color but the icon + topic label are frontend concerns:

| Kind | Icon | Eyebrow label |
|---|---|---|
| `active_rehab` | `Stethoscope` | "Today's focus · Rehab" |
| `overtraining` | `Flame` | "Today's focus · Recovery" |
| `plateau_4w`, `plateau_8w` | `TrendingUp` | "Today's focus · Plateau" |
| `return_break_*` | `Sunrise` | "Today's focus · Welcome back" |

## Edge cases + safety

- **OpenAI unavailable** → fall back to per-kind hardcoded copy (lower quality but always renders).
- **Pattern match but generation fails** → cache the row with the fallback copy so the user doesn't see a missing card.
- **User dismisses then their pattern changes** (e.g. dismissed overtraining tip in the morning, then they hurt themselves) → tomorrow's tip will be the rehab tip; we don't re-evaluate within a day.
- **Tier promotion takeover and tip card on the same page load** → both can show. The takeover dismisses on its own. No conflict.
- **Rate limits / cost** → the once-per-day cache means at most 1 OpenAI call per user per day. Cheap.

## Out of scope (v2+)

- **Notifications** ("you've been on a 7-day streak — rest day reminder") via push or email
- **Per-pattern user mute** ("never show me plateau tips") — global dismiss is enough for v1
- **More patterns** — flash-rate, pyramid imbalance, post-PR recovery, project-momentum, tier-promotion welcome — each a separate spec
- **Drill libraries** — when plateau tip CTA opens Chat, Chat must answer well; a curated drill library lives in a separate spec
- **Tip history** — past tips aren't surfaced anywhere; the `hub_tips` table is the source of truth but no UI shows it
- **Tip share / save** — no
- **Voice / tone customization** — no
- **Multi-tip stacking** (show 2 cards on the same day) — no; one tip, one day
- **Manual refresh button** — no; tomorrow's load triggers a fresh tip

## Open questions

- **Date handling** — frontend sends user-local YYYY-MM-DD; backend uses it directly. If user travels timezones mid-day they could trigger a second tip generation. Acceptable for v1.
- **OpenAI model** — `gpt-4o-mini` is the recommended starting point. If quality is insufficient we can flip to `gpt-4o` (existing default elsewhere in the app).
