# Climbing-progression UI redesign (Hub + Progress + tier system)

**Date:** 2026-05-17
**Owner:** Mathew
**Status:** Approved (brainstormed via visual-companion mockups; mockups persist in `.superpowers/brainstorm/87404-1778991383/`)

## Problem

The Hub and Progress page were just shipped and the user is unsatisfied. The Hub reads as a navigation shortcut (three tool cards covering destinations already in the bottom nav) rather than a climbing dashboard. The Progress page renders the existing `TrainStatsPanel` + `GradePyramidCard` but doesn't feel "personal" — no identity, no celebration of the user's current climbing level, no live response to logged climbs. The whole experience is unopinionated. Two reference apps (Apple Fitness, Runna) make a strong case for: a primary visual hook that reads at-a-glance, a sense of identity that the app reflects back, and live feedback when something meaningful happens.

The redesign builds a climbing-progression dashboard that:
- Gives every user a **tier identity** based on their hardest recent send
- Re-themes the Hub + Progress pages in the tier's color
- Surfaces three "rings" (Sends / Climb days / Push grade) as the visual hook
- Folds in their current project, weekly calendar, and recent climbs
- Restructures Progress around a tier hero + grade pyramid + awards + leaderboard + trend
- Adds an award system with medals + live-feedback moments (promotion takeover, award toast, PR toast refresh, greeting variants)

## Solution

The Hub and Progress pages are rebuilt against a new **tier theming system**. The user's working tier (derived from `get_user_hardest(user_id, window='month')`) drives a set of CSS custom properties read by all themed components. The Hub composition is rebuilt around a Rings hero + Project + Weekly Calendar + Recent Climbs feed. The Progress page is rebuilt around a Tier Hero (with promotion progress) + Pyramid + Awards + Leaderboard + Trend graph. Four live-feedback patterns layer on top.

Explicitly **not** in this spec: climb-level (per-problem) logging, project-creation UI, custom user-defined awards, re-theming Train/Body/Chat per tier, push notifications.

## Tier color system

Eleven tiers, ten unique colors for V0–V9 plus one apex tier covering V10+. Each tier has a name and three hex tokens (light / mid / deep) used to construct gradients and glows. The mid value is the canonical "tier color."

| Tier | Grade | Light | Mid | Deep |
|---|---|---|---|---|
| Ivory | V0 | `#f5f4ec` | `#e8e6dc` | `#6b685a` |
| Honey | V1 | `#fbd470` | `#f7b03a` | `#7c5a14` |
| Apricot | V2 | `#ffa97a` | `#ff7a3d` | `#802811` |
| Acid Lime | V3 | `#d9f06a` | `#c5e637` | `#5a6810` |
| Jade | V4 | `#6bf0c9` | `#2dd4a5` | `#105e48` |
| Teal | V5 | `#5eead4` | `#14b8a6` | `#0a4f48` |
| Electric Sky | V6 | `#7cc3ff` | `#3aa1ff` | `#0d3d70` |
| Cobalt | V7 | `#9598fa` | `#5b5ff2` | `#1d1f7a` |
| Iris | V8 | `#ad95ff` | `#8466ff` | `#3a2580` |
| Magenta | V9 | `#ea7df5` | `#d946ef` | `#6c1a7f` |
| Coral | V10+ | `#fda4af` | `#fb7185` | `#7f1d2c` |

### Working-tier derivation

The user's working tier is determined by `getWorkingTier(user_id)`:
1. Compute `hardest = get_user_hardest(user_id, window='month')` (already exists from the climb-log feature)
2. Take the higher tier between `hardest.boulder` and `hardest.route` (route grades map to V-tiers via the YDS chart below)
3. Cap at V10+ (Coral) — every grade V10 and above shares the Coral tier
4. If no qualifying sends in 30 days, fall back to V0 Ivory

### YDS → V-tier mapping

| YDS | V-tier |
|---|---|
| 5.6 – 5.9 | V0 |
| 5.10a – 5.10d | V0 |
| 5.11a | V1 |
| 5.11b – 5.11c | V2 |
| 5.11d | V3 |
| 5.12a – 5.12b | V4 |
| 5.12c – 5.12d | V5 |
| 5.13a | V6 |
| 5.13b | V7 |
| 5.13c | V8 |
| 5.13d | V9 |
| 5.14a+ | V10+ |

Implemented as a pure function `routeGradeToVTier(yds: string) → 'v0' | 'v1' | ... | 'v10'` in `src/climb_grades.py`. The frontend mirror lives in `frontend/src/lib/tier.js`.

## Theme scope

The tier color drives the visual accent in three places only:

1. **Hub (`/hub`)** — phone-frame backdrop radial gradient, rings outer ring stroke, eyebrows on Today card + week strip, today-cell highlight on the week strip, tier pill on the greeting, headline text-shadow, glow inside cards
2. **Progress page (`/progress`)** — same backdrop, tier-hero card background + border + promotion bar fill, leaderboard "you" row highlight
3. **Nav active indicator** — sidebar active row + mobile bottom-nav active tab use the tier color (replaces the existing `bg-accent/15` + `text-accent` active styles when the active tab is one that's themed)

Train, Body, Chat keep their tool-specific accents. The Sidebar's logo gradient, the disclaimer modal, and modals like Upgrade do not re-theme.

## Hub layout

The Hub renders top to bottom (mobile-first):

### 1. Greeting

- Eyebrow line: `<weekday> · <Mon D>` in all-caps, 0.08em tracking
- Title: SF Pro 28pt, `-0.025em` tracking. Copy is **context-aware** — see Live-feedback §4 for variants
- Tier pill below: `<grade> · working grade` with a tier-color dot + glow
- Avatar circle on the right (M for "Mathew" initial, gradient from tier light → coral)

### 2. Rings card

Apple Fitness DNA, climbing metrics:

- Outer ring (largest, tier color): **Sends** — count of `s+f` climbs logged this week vs goal
- Middle ring (coral always): **Climb days** — distinct logged days this week vs goal (default 4)
- Inner ring (gold always): **Push grade** — attempts at a grade above the user's working tier this week vs goal (default 3)
- 116×116px SVG, drop-shadow on the active arc
- Streak chip in the card header: `Flame` lucide icon + `N day streak` count

Goal numbers default to: `4 climb days`, `10 sends`, `3 push attempts`. Stored per user, future spec for personalization. v1 hardcodes defaults.

### 3. Current project card

Coral always (semantic: project = the climb-ahead-of-you, fixed identity):

- Eyebrow: `Current project` in coral
- Title: project name + grade ("The Sentinel · V8")
- Try-by-try dots row: red dots for prior tap-outs, gold ring on "current go," empty for future tries
- "Try N →" CTA

If no current project exists (heuristic: no log in last 7 days with `p > 0` on any grade above working tier), this card is omitted.

### 4. This week card

Mon–Sun horizontal strip, 7 cells:

- Dow label (M/T/W/T/F/S/S) — today's dow is tier-color
- Day-of-month number
- Logged-day dot (tier-color glow if logged, muted dot if empty)
- Today's cell has a tier-color background + 0.5px tier-color border

### 5. Recent climbs feed

Most-recent climbs, hairline-separated rows inside one card. Each row:

- 36×36px **grade chip** colored by its own V-tier (NOT the user's working tier) — V5 chip is Teal, V6 chip is Electric Sky, V7 chip is Cobalt, etc.
- Title: "V5 send" / "V5 × 2 sends" / "V7 project tries" with optional "Flash" pill in tier color
- Sub: "Wed · Session 3 of this week" / "Wed · 4th go" etc.
- Chevron on the right

Source: `getTrainingLogs(limit=8)` filtered to entries with non-empty `climbs`. Multi-grade sessions expand into one row per grade.

### Removed from Hub

- The three tool cards (Body / Train / Chat) — redundant with the 5-tab nav
- The HubProgressCard at the bottom — replaced by the dedicated Progress tab now in nav

## Progress page

Top to bottom:

### 1. Page header

- "Progress" title (28pt SF Pro)
- Subtitle: "Leaderboard, grade pyramid, and your stats"

### 2. Tier hero (new)

Large card with tier-color gradient background + inset glow:

- Eyebrow: "Current tier" in tier-light color
- Title: "V7 · Cobalt" (24pt, tier-color text-shadow)
- Meta line: "Hardest send last 30 days · N V7s · M V8 attempts"
- **Promotion progress bar**: shows progress toward next tier. Logic: count `s > 0` sends at `currentTier+1` in last 30 days. Goal: **5 sends** at the next tier consolidates the promotion.
- "X more V8 sends within 30 days to advance to Iris" sub-text below the bar

Edge case: at V10+ Coral (apex), the bar becomes a static "Apex tier — V10+ Coral" affirmation, no promotion shown.

### 3. Grade pyramid

The existing `GradePyramidCard` redesigned with grade-colored bars:

- Per-grade row with: grade chip (in that grade's tier color) + bar (filled in that grade's color) + count text on the right ("4 sends" / "12 sends · 4 fl" / "0 send · 2 proj")
- Window toggle: Month / All-time (existing)
- Sorted descending by grade (hardest at top)

### 4. Awards strip

New horizontal-scroll card:

- Eyebrow: "Awards"
- Strip of medals (96px wide each), earned ones glow, locked ones dashed-bezel + lock icon
- Tap a medal → modal with award details + the climb that triggered it

See "Award system" below for medal catalog.

### 5. Leaderboard

Existing `TrainLeaderboard` lifted into Progress with tier-aware styling:

- Week / All toggle
- Each row: rank, avatar (tier-color gradient from the leader's working tier), name, hours total
- The current user's row tier-highlighted with the user's working tier color

### 6. Last 8 weeks trend graph

New replacement for the existing flat trend chart:

- 8 weekly columns
- Each column is a stacked bar where each segment is colored by V-tier — V3 acid-lime at the bottom, V8 iris at the top, etc.
- Visual story: the stack shifts up as the user climbs harder grades
- Sub-text: a single AI-style observation ("You've been climbing harder grades each week — the stack is shifting up.") computed at render-time, not via the LLM

## Award system

### Medal styling

All medals share the v2 styling:

- Outer body: linear gradient `medal-light → medal-mid → medal-deep` (top to bottom)
- Top inner highlight: radial-gradient ellipse at 50% 18%, white 55% → transparent
- Inner bezel: `inset 6px` ring, 0.5px white-25% border, soft inner shadow
- Starburst behind icon: conic-gradient of 12 evenly spaced rays, white 10% alpha, masked to a ring (`mask: radial-gradient(circle, transparent 35%, black 70%)`)
- Drop shadow: `0 6px 18px -2px tier-mid-60%` + `0 2px 4px black-40%` (asymmetric, light-from-above)
- Inset shadow: `inset 0 -3px 6px black-40%` (depth) + `inset 0 2px 3px white-35%` (polish)

Content inside: a lucide-react SVG icon + optional label below. Locked variants: dashed bezel, gray gradient (`#2a2a35 → #0c0c12`), Lock icon, muted text.

### Medal catalog (v1)

Each award has: `kind` (string enum), `predicate` (when it unlocks), `medal_gradient` (which tier colors), `icon` (lucide name), `label` (text inside the medal).

**Grade milestones** (gradient: working-tier color):
- `first_send_v3` through `first_send_v10` — first-ever send at this grade. Icon: `Mountain`. Label: the V-grade.
- `first_route_5_11a` through `first_route_5_14a` — first-ever YDS send. Icon: `Mountain`. Label: the YDS grade.

**Streak milestones** (gradient: Honey palette — light `#fbd470` → mid `#f7b03a` → deep `#7c5a14`):
- `streak_3d`, `streak_10d`, `streak_30d`, `streak_100d`. Icon: `Flame`. Label: "Nd".
- A streak is defined as consecutive calendar days with at least one `training_logs` row. Computed from the user's local timezone (the `date` column on `training_logs` is already user-local YYYY-MM-DD).

**Volume milestones** (gradient: Coral palette — light `#fda4af` → mid `#fb7185` → deep `#7f1d2c`):
- `volume_10`, `volume_30`, `volume_50`, `volume_100`, `volume_500` — count of total sends across all sessions. Sum across `training_logs.climbs.{boulder,route}.{grade}.s`. Icon: `Check`. Label: "×N".

**Style milestones** (gradient: Electric Sky palette — light `#7cc3ff` → mid `#3aa1ff` → deep `#0d3d70`):
- `first_flash` — first flash at any grade. Predicate: any `climbs.{boulder,route}.{grade}.f > 0` for the first time. Icon: `Zap`. Label: none (icon only).
- `first_redpoint` — first send (`s > 0`) at a grade that has prior `p > 0` entries logged for the same user. Icon: `Target`. Label: none.

Locked badges appear after the user has earned at least one badge in that category. e.g., user with `first_send_v5` earned will see locked `first_send_v6` placeholder next to it.

## Live-feedback patterns

### 1. Tier-promotion takeover

Fires when `getWorkingTier()` advances after a log commit (i.e., the user just logged the send that pushes their 30-day hardest into a higher tier, OR the 5th send at the next tier consolidates a promotion).

Visual: full-screen modal overlay (z-index above everything except the disclaimer):
- Phone-frame inner: radial gradient from new-tier color at top, fading to black at bottom
- Centered 168px tier medal (gradient `light → mid → deep`, all medal v2 effects)
- Below: eyebrow "New working tier", title "{Tier Name}" (30pt SF Pro), sub "{N sends at V{X}} in 30 days. You've stepped into the {Tier Name} tier — the app's identity is now yours."
- 7 confetti dots in mixed tier colors as decoration (radial-gradient bg)
- "Tap to continue" hint

Behavior: holds for 3 seconds with `auto-dismiss`, then tap-anywhere or auto-dismiss closes. Body scroll locked while open. Framer Motion enter: opacity + scale 0.95 → 1, 0.5s ease-out.

Dispatched via window event `ct:tier-promotion` from the `/api/training` POST response (response gains a `tier_change: { from, to } | null` field). App-level listener mounts the takeover.

### 2. Award unlock toast

Fires when the award engine detects one or more new unlocks at log commit. One toast per unlock; if multiple unlock in one session, queue them (5 sec each, slide out → next slides in).

Visual: top-center slide-in card
- 40×40px mini-medal (same v2 styling, smaller)
- Title: "{Award name}" + "Earned" pill in award-category color
- Sub: "{Trigger context}" (e.g., "V5 first-go on Tropic Wave · tap to view")
- Chevron on right

Behavior: 5-second hold, tap → navigate to `/progress` with awards section scrolled into view (router state flag).

Dispatched via window event `ct:award-unlocked` with `detail: { kind, name, sub, medal_props }`.

### 3. PR toast (refresh)

The existing PR toast (already shipped, currently uses 🎉 emoji) is restyled to remove the emoji and use the tier system:

- Lucide `Trophy` icon in a 28×28 tier-color rounded background on the left
- Title: "New PR — {grade} {discipline}"
- Sub: "Tap to view progress ›"
- Background: linear-gradient `tier-c 25% → coral 15%` with `tier-c 45%` border + `tier-c` glow
- 4-second hold, tap → /progress

Reuses the existing `ct:new-pr` window event listener in App.jsx. Only the toast styling changes.

### 4. Greeting variants

The 28pt greeting title's copy is replaced by context-aware variants:

| Condition (eval in order; first match wins) | Copy |
|---|---|
| First log of the calendar week | New week, fresh starts. |
| Logged within last 24h AND set a PR yesterday | Yesterday was a breakthrough. |
| Logged today already | Logged. Let it sink in. |
| 10+ day streak active | {N} days in. You're showing up. |
| 3+ day streak active | Day {N} of a strong week. |
| Today is a plan rest day | Recovery is training too. |
| 7+ days inactive | Ready when you are. |
| Default | Welcome back. |

Implemented as a pure function `greetingFor(state) → string` in `frontend/src/lib/hubGreeting.js`. Inputs: `streakDays`, `lastLogIso`, `lastPrIso`, `todayIsRestDay`, `isFirstLogOfWeek`.

## Data model + API

### New backend additions

**Working-tier helper** (`src/climb_grades.py`):

```python
V_TIERS = ["v0", "v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10"]

def v_grade_to_tier(grade: str) -> str:
    """Map a V-grade (V0..V17) to a tier id. V10+ all collapse to 'v10'."""
    # implementation maps V0→v0, V1→v1, ..., V9→v9, V10..V17→v10

def yds_to_tier(grade: str) -> str:
    """Map a YDS grade (5.6..5.15d) to a tier id following the chart."""
    # implementation per the YDS → V-tier table above

def working_tier(hardest: Dict[str, Optional[str]]) -> str:
    """Return the higher of boulder/route mapped tiers, or 'v0' if both None."""
```

`working_tier` is the entry point most callers use. It takes the dict returned by `get_user_hardest(window='month')` and returns a tier id like `'v7'`.

**Awards** — new table:

```sql
CREATE TABLE IF NOT EXISTS awards (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  earned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, kind)
);
CREATE INDEX awards_user_idx ON awards (user_id);
```

`kind` is one of the catalog enums (`first_send_v3` etc.). `payload` stores the trigger context: `{ trigger_log_id, grade, climb_name }`.

**Award engine** — runs at the end of `POST /api/training`:

```python
def detect_new_awards(user_id: int, new_climbs: Dict) -> List[Dict]:
    """Returns list of new award rows (kind, payload) that just unlocked.
    Idempotent — checks awards table to avoid re-firing."""
    # implementation runs through all catalog predicates
```

The POST response gains:
```json
{
  "id": 1234,
  "new_prs": { "boulder": "V7", "route": null },
  "tier_change": { "from": "v6", "to": "v7" },
  "new_awards": [
    { "kind": "first_send_v7", "name": "First V7", "sub": "V7 send on …" }
  ]
}
```

**New endpoints:**

- `GET /api/awards` — returns `{ earned: [...], locked: [...] }`. Earned rows include `earned_at` and `payload`. Locked rows are computed from the catalog minus earned, with `progress: { current, goal }` if applicable.

### New frontend additions

**Hook + provider** (`frontend/src/hooks/useTierTheme.js`):

```js
function useTierTheme() {
  // reads working_tier from useHubData (which fetches it inline)
  // returns { tierId, tierName, tokens: { c, light, deep, glow } }
}
```

**CSS-var application** (`frontend/src/components/TierThemeRoot.jsx`):
- Wraps a subtree and sets `--tier-c`, `--tier-light`, `--tier-deep`, `--tier-glow` based on the working tier
- Used by HubTab and ProgressTab; nav active-indicator reads vars set globally on `document.documentElement` by a tiny side-effect inside HubTab/ProgressTab so the indicator updates even on Train/Body/Chat tabs

**Greeting variants** (`frontend/src/lib/hubGreeting.js`):
- Pure function as described in Live-feedback §4

**Awards API client** (`frontend/src/api.js`):
- `getAwards()` → `request('GET', '/api/awards')`

**App event listeners** (`frontend/src/App.jsx`):
- `ct:tier-promotion` → mount TierPromotionTakeover
- `ct:award-unlocked` → push award toast (queue if multiple)
- `ct:new-pr` → existing PR toast (restyled)

## Frontend file structure

**New components:**
- `frontend/src/components/HubGreeting.jsx` — already exists; modify for greeting variants + tier pill + avatar
- `frontend/src/components/HubRingsCard.jsx` — new, the rings + streak chip card
- `frontend/src/components/HubProjectCard.jsx` — new, the current-project card with try dots
- `frontend/src/components/HubWeekStrip.jsx` — new, the Mon-Sun week calendar
- `frontend/src/components/HubFeedCard.jsx` — new, recent-climbs feed (graded chips)
- `frontend/src/components/ProgressTierHero.jsx` — new, tier hero + promotion bar
- `frontend/src/components/ProgressTrendGraph.jsx` — new, 8-week stacked grade-colored bars
- `frontend/src/components/AwardsStrip.jsx` — new, horizontal-scroll awards on Progress
- `frontend/src/components/AwardMedal.jsx` — new, the reusable medal component (size variants: 40 / 84 / 168)
- `frontend/src/components/AwardUnlockToast.jsx` — new, the slide-in toast
- `frontend/src/components/TierPromotionTakeover.jsx` — new, the full-screen takeover
- `frontend/src/components/TierThemeRoot.jsx` — new, CSS-var applier

**New libs:**
- `frontend/src/lib/tier.js` — tier id/name/token lookup, V→tier and YDS→tier mappers (mirrors `src/climb_grades.py` helpers)
- `frontend/src/lib/hubGreeting.js` — greeting variant selector
- `frontend/src/lib/awardCatalog.js` — award catalog metadata (kind → name, icon, gradient)

**New hooks:**
- `frontend/src/hooks/useTierTheme.js` — exposes working tier + token bundle
- `frontend/src/hooks/useAwards.js` — fetch + cache awards list

**Modified components:**
- `frontend/src/components/HubTab.jsx` — replace existing layout with new composition; wrap in `TierThemeRoot`
- `frontend/src/components/ProgressTab.jsx` — replace existing layout with the 6-section structure; wrap in `TierThemeRoot`
- `frontend/src/components/TrainingLogEntry.jsx` — dispatch `ct:tier-promotion` + `ct:award-unlocked` events from `logTraining` response
- `frontend/src/App.jsx` — add event listeners for tier-promotion + award-unlocked; restyle PR toast; expose nav-active-indicator CSS var
- `frontend/src/hooks/useHubData.js` — fetch working tier alongside existing data

**Modified backend:**
- `src/climb_grades.py` — add `V_TIERS`, `v_grade_to_tier`, `yds_to_tier`, `working_tier`
- `database.py` — `awards` table migration, `insert_award`, `list_awards`, `compute_locked_awards`
- `main.py` — `AwardsResponse` model + `GET /api/awards` endpoint; extend POST /api/training response with `tier_change` + `new_awards`

**Removed:**
- `frontend/src/components/HubProgressCard.jsx` — superseded by the 5th nav tab
- The current Hub tool cards remain in `HubTab.jsx` but the JSX is replaced by the new composition

## Out of scope (v2+)

- **Climb-level (per-problem) logging** — current session-level JSONB structure stays
- **Project creation UI** — the "Current project" card uses heuristic detection (last grade with `p > 0` above working tier) for v1; explicit project create/edit/complete is a separate spec
- **Custom user-defined awards** — only the v1 catalog
- **Badge sharing** (export / social) — defer
- **Re-theming Train / Body / Chat** — tools keep their existing accents
- **Push notifications** for streak preservation
- **Configurable ring goals** — defaults are hardcoded (`4 climb days`, `10 sends`, `3 push tries`)
- **Tier demotion** — if a user's 30-day hardest drops, the working tier follows. There is no demotion takeover (only promotion gets the moment). Award medals are never revoked.
- **Per-discipline tier** (separate tier for boulder vs route) — v1 uses the single higher tier
- **Animation/sound on ring close** — silent ring closure for v1; animation polish is a future iteration

## Open questions

None. All eight decisions resolved during brainstorm:

1. Hub hero composition — Rings + Streak chip inside + Project card below
2. Hub body — Weekly calendar + Recent climbs feed (drop tool cards)
3. Tier color system — 11 named designer-palette tiers
4. Working tier definition — hardest send last 30 days
5. Theme scope — Hub + Progress + nav active indicator
6. Progress page structure — page-header + tier hero + pyramid + awards + leaderboard + trend
7. Medal styling + icon taxonomy — bezel + starburst + lucide icons per category
8. Live-feedback set — tier promotion + award toast + PR refresh + greeting variants
