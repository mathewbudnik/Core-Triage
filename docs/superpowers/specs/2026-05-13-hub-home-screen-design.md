# Hub — personalized home screen (v1)

**Date:** 2026-05-13
**Owner:** Mathew
**Status:** Approved (mockup v5 in `.superpowers/brainstorm/15605-1778721603/content/hub-styled-v5.html`)

## Problem

After signing in, users land directly on `/triage`. That's wrong for returning users — they may be opening the app to log a session, check rehab progress, see their leaderboard rank, or just orient themselves. The app needs a central, adaptive landing that answers "what should I pay attention to right now?" in one screen.

Symptoms today:
- Returning healthy climbers have to click into Train to see their plan
- Injured users mid-rehab don't get a glanceable "Day 5 of 14" view
- New users land on a wizard with no context for what the app does post-login
- Streak / leaderboard hooks are buried in Train tab — no daily gravity

## Solution

Add a `/hub` route that becomes the default post-login destination, replacing `/triage` as the "Open App" target. The hub is an asymmetric, adaptive landing screen with five elements:

1. **Gradient greeting + streak pill** (top row) — identity and the single ambient stat
2. **Featured card** (large, ~60% width) — auto-selected by user state, rich content + primary CTA
3. **Three compact tool cards** (~40% width, stacked) — the remaining three tools, each carrying its own status
4. **Social strip** (bottom) — one-line leaderboard rank with a drill-in link

Each of the four tools has its own accent color AND its own subtle background pattern, so cards remain distinct even when two share an accent. The featured slot rotates based on user state; tapping any small card promotes it to featured (no auto-cycle).

Explicitly **not** in this phase: customizable hub layout, dismissable cards, featurable non-tool widgets (leaderboard / PRs / coach messages), auto-rotation, push notifications.

## Layout (mockup v5 locked)

Renders at `/hub`. Mounted in the standard sidebar/topbar shell (same as other tabs). Container `max-w-2xl` (672px) — same as Train tab for visual consistency.

```
┌───────────────────────────────────────────────────────────────┐
│  Welcome back,                                  [🔥 12 days]  │
│  MathewB                                                       │
│  Tuesday · Day 5 of finger pulley rehab                       │
│                                                                │
│  ┌──────────────────────────────┐  ┌──────────────────────┐  │
│  │ FEATURED CARD                 │  │ ⚡ Triage             │  │
│  │   [DUMBBELL icon, large]      │  │   ● 1 active · finger│  │
│  │   TODAY · TRAIN               │  ├──────────────────────┤  │
│  │   Hangboard · 60 min          │  │ 🩺 Rehab              │  │
│  │   Week 1 · Day 3 — open-hand  │  │   Day 5 of 14        │  │
│  │   5 sets · 3 sets · 6×6 curls │  ├──────────────────────┤  │
│  │   ▓▓▓░░░░░░░░░ Week 1 · 25%   │  │ 💬 Chat               │  │
│  │   [Start session →]           │  │   Ask about recovery │  │
│  └──────────────────────────────┘  └──────────────────────┘  │
│                                                                │
│  🏆 Ranked #4 this week · intermediate     See leaderboard ›  │
└───────────────────────────────────────────────────────────────┘
```

Visual language matches Landing and TrainStatsHero:
- Dark `bg-bg` with ambient blurred orbs (teal + coral) in the top corners
- Gradient text on the greeting (`accent → text → accent2`, matching Landing's headline)
- Soft accent-tinted card backgrounds + accent-colored glow orbs per card
- Lucide-style stroke icons (matches existing components)
- 12px inter-card gap, 14–16px border-radius, generous internal padding

## Featured-card auto-pick logic

Priority order — first match wins. Recomputed on hub mount and after any tap-to-swap.

| Priority | Condition | Featured | CTA |
|---|---|---|---|
| 1 | Active triage within last 14 days AND that region exists in `EXERCISES` | **Rehab** | "Continue rehab" |
| 2 | Active training plan exists AND today's session not yet logged | **Train** | "Start session" |
| 3 | Active training plan exists AND today's session already logged | **Train** | "View today's session" |
| 4 | Active triage within last 90 days (older than 14) AND region exists in `EXERCISES` | **Rehab** | "Open rehab plan" |
| 5 | None of the above | **Triage** | "Where does it hurt?" |

**Definitions**

- *Active triage* = the most recent record returned by `/api/sessions?limit=1`, if any.
- *Active training plan* = `/api/plans/active` returns a plan whose `start_date` ≤ today.
- *Today's session* = computed locally from the active plan: same logic [PlanView.jsx](frontend/src/components/PlanView.jsx) already uses (`sessionDate()` helper). "Logged today" = a `training_logs` entry exists with `date = today` for the current user — derive from the existing `/api/training/stats` `this_week.sessions` count plus a check against the most recent log's date. (If we need finer granularity, add a `today_logged: bool` field to the stats payload — flagged as a possible follow-up.)
- *Region exists in EXERCISES* = the triage `injury_area` string maps to a key in `frontend/src/data/exercises.js`.

**No backend rehab progress tracking exists today.** "Continue rehab" / "Day X of Y" content uses a heuristic — see next section.

## Rehab heuristic (no progress tracking in v1)

The app does not currently store per-user rehab progress (current phase, current day in phase). The Rehab tab is a library, gated only by tier. The hub fakes a progress signal from data we already have:

- `days_since_triage = floor((today - lastTriage.created_at) / 86400)` (UTC)
- `phase` = 1 if `days_since_triage < 14`, 2 if `< 42`, 3 otherwise
- `day_in_phase` = `days_since_triage` (Phase 1), `days_since_triage - 14` (Phase 2), `days_since_triage - 42` (Phase 3)
- `phase_length` = 14 / 28 / 28 (Phase 1 / 2 / 3 nominal lengths)

Display formats:
- Small Rehab card status: `"Phase {N} · Day {X}"` (e.g. "Phase 1 · Day 5")
- Mini progress bar: `day_in_phase / phase_length` clamped to [0, 1]
- Featured Rehab card detail line: `"Phase {N} of finger pulley rehab — week {ceil(day/7)} of {ceil(length/7)}"`

A proper rehab-progress backend is v2 work. The heuristic is good enough to give the user a sense of where they are without overstating accuracy.

## Featured Train card content

When Featured = Train, the featured card pulls from the active plan's session for today (via PlanView's existing `sessionDate` helper):

- **Eyebrow:** `"Today · Train"`
- **Title:** `"{TYPE_LABEL[session.type]} · {session.duration_min} min"` (e.g. "Hangboard · 60 min")
- **Detail line:** week + day context, e.g. `"Week {session.week} · Day {session.day_in_week}"`
- **Sub-detail:** first 2–3 exercise names from `session.main[].exercise`, joined with `·`
- **Progress bar:** `session.session_index / plan.plan_data.sessions.length` (overall plan completion)
- **CTA:** `"Start session"` → navigates to `/train` and auto-selects today in PlanView (use a query param like `?session={index}`)

## Rotation behavior

- **No auto-cycle.** The featured slot is stable across a visit; it changes when user taps a small card or when the underlying user state changes (e.g., logging today's session next visit).
- **Tap-to-swap.** Tapping any small card promotes it to the featured slot. The previously featured card moves to the position the tapped card vacated. Animation: Framer Motion `layoutId` per card (~180ms `easeInOut`).
- **State-pick is run on mount only.** Once the user has manually swapped, their choice sticks for the rest of the session (in-memory, no persistence to backend for v1).

## Tool card content (all four)

Each card always shows: accent-colored icon box · label · single-line status. Live dot appears when state is actionable.

| Card | Populated status | Empty / fallback |
|---|---|---|
| **Triage** (coral · pulse pattern) | `● {region}` (live dot) — most recent triage's region | `No active triage` (no live dot) |
| **Rehab** (teal · dot grid pattern) | `Phase {N} · Day {X}` + mini progress bar `day_in_phase / phase_length` | `No active rehab` (no progress bar) |
| **Train** (teal · diagonal stripes) | `● Today's session ready` (live dot) / `Logged today` ✓ / `Rest day` | `Build a plan` (no live dot) |
| **Chat** (gold · speech-bubble pattern) | `● Unread coach reply` (live dot, coaching tier only) / `Ask about recovery` (if active triage) | `Ask anything` |

**Train card status precedence** (first match):
1. No active plan → `Build a plan`
2. Today not in the plan's day schedule (rest day) → `Rest day`
3. Logged today (a `training_logs` row exists for today) → `Logged today`
4. Today's session exists and not logged → `● Today's session ready`

## Empty states (composite)

**Brand-new user (no triage, no profile, no plan)**
- Featured: **Triage** — "Where does it hurt?" with Start-triage CTA
- Small cards: Rehab ("No active rehab"), Train ("Build a plan" → Train tab), Chat ("Ask anything")
- Streak pill hidden
- Social strip: "Log your first session to see how you stack up" (no rank)

**Healthy user with plan, no injury**
- Featured: **Train**
- Triage card: "No active triage" (no live dot, dimmer)
- Streak + social shown normally

**Injured user, no plan**
- Featured: **Rehab**
- Train card: "Build a plan"

## Streak rules

- Streak pill renders only if `current_streak_days >= 2`. A streak of 1 doesn't get the spotlight; a streak of 0 hides entirely.
- Pulled from existing `/api/training/stats` (`current_streak_days`).
- Tap behavior: no-op for v1 (visual only). A "streak history" drill-in is v2.

## Routing

| Path | Authenticated behavior | Unauthenticated behavior |
|---|---|---|
| `/` | Redirect to `/hub` | Show Landing |
| `/hub` | Render HubTab | Redirect to `/` |
| `/triage`, `/rehab`, etc. | Unchanged | Unchanged |

Implementation:
- New `<Route path="/hub/*" element={<HubTab ... />} />` in `App.jsx`
- New `TABS` entry — `{ id: 'hub', label: 'Hub', icon: Home }` — inserted as the first item (left-most in sidebar and bottom mobile nav)
- Landing's `onEnter(tab)` callback: change the no-arg default from `/triage` to `/hub`
- App.jsx top-level guard: if `user && location.pathname === '/'`, `<Navigate to="/hub" replace />`
- Unknown-path fallback in `<Routes>` becomes `<Navigate to="/hub" replace />` (was `/triage`)

### Sidebar logo as a hub link

The CoreTriage logo + brand name block in the sidebar header (currently a static `<div>` in [App.jsx](frontend/src/App.jsx) around the `<Logo size={32} dark />` element) becomes a clickable link to `/hub`. Standard "home" affordance — users expect the brand mark to return them to the landing surface.

- Wrap the logo + brand-name span in a `<NavLink to="/hub">` (or plain anchor if NavLink's active styling isn't wanted)
- On mobile, the click also closes the sidebar drawer (call `setSidebarOpen(false)`)
- The "Training, rehab & coaching for climbers" tagline stays outside the link — only the logo + brand are interactive
- Visual treatment: no hover underline; subtle opacity transition (`hover:opacity-90`) so it doesn't feel like text content
- Accessibility: `aria-label="Go to hub"` on the link

## API surface

**Reuses existing endpoints** — no new backend work required for v1.

The HubTab loads these in parallel (`Promise.all`) on mount:
- `/api/auth/me` — already loaded by App.jsx, passed via prop (no extra fetch)
- `/api/sessions?limit=1` — most recent triage (for the active-triage state and rehab heuristic)
- `/api/plans/active` — active training plan (404 = none)
- `/api/training/stats` — `current_streak_days`, `this_week.sessions` (streak pill, Train fallbacks)
- `/api/training?limit=5` — recent logs, used client-side to detect "logged today" (any row with `date == today`)
- `/api/training/leaderboard?window=week&limit=1` — user's rank for the social strip

Failures degrade gracefully: any single endpoint's failure collapses its dependent UI element to its empty state, never blocks the rest of the hub from rendering. 404 / "no active plan" is normal and is not surfaced as an error.

## Mobile responsive

Asymmetric layout collapses at `<768px` (Tailwind `md` breakpoint).

**Mobile (`< 768px`)**:
- Greeting font scales to 22px; streak pill wraps below greeting on a new line if needed (`flex-wrap`)
- Featured card and small-card stack collapse to a single column, full-width
- Featured card stays first, small cards follow vertically — still tappable to promote, but the swap is less spatially "asymmetric" on a narrow screen
- Social strip stays full-width at the bottom
- Internal padding reduces from 24px to 16px

**Tablet (`768px–1023px`)**:
- Asymmetric layout active. Grid `1.4fr 1fr` (slightly narrower featured)
- Greeting 26px, full mockup styling

**Desktop (`≥ 1024px`)**:
- Full mockup styling. Grid `1.55fr 1fr`
- Greeting 28px

Touch targets on all interactive elements: min 44×44px (small cards meet this at default 86px height; streak pill / social-strip link get extra padding on `<md`).

## Frontend changes

### New components

```
frontend/src/components/
├─ HubTab.jsx               (page-level — data loading, featured-pick, mounts the others)
├─ HubGreeting.jsx          (gradient greeting + sub + streak pill)
├─ HubFeaturedCard.jsx      (large card — props: tool, status, ctaLabel, onCta)
├─ HubToolCard.jsx          (small card — props: tool, status, isLive, onTap)
├─ HubSocialStrip.jsx       (leaderboard rank line)
└─ HubPatterns.jsx          (4 inline-SVG pattern components, one per tool)
```

`HubFeaturedCard` and `HubToolCard` share a `tool` prop (`'triage' | 'rehab' | 'train' | 'chat'`) that drives accent color + pattern + icon. Tool metadata (color, pattern component, icon, default route) lives in a single `hubTools.js` config.

### Modified files

- `frontend/src/App.jsx` — new TABS entry (Hub, first), new `/hub/*` route, redirect `/` → `/hub` for authed users, Landing `onEnter` default → `/hub`
- `frontend/src/components/Landing.jsx` — change `onEnter()` default arg from `'/triage'` to `'/hub'`; "Open App" navigates to `/hub`

### Data shape (HubTab local state)

```ts
type HubData = {
  user: { display_name: string|null, ... }
  lastTriage: { id, injury_area, created_at } | null
  activePlan: Plan | null
  todaySession: PlanSession | null     // computed from activePlan + today
  todayLogged: boolean                  // computed
  stats: { current_streak_days, this_week, ... } | null
  rank: { rank: number, hours: number } | null
}
```

Featured-pick selector: `function pickFeatured(data: HubData): 'triage' | 'rehab' | 'train' | 'chat'`

## Animation

- Tap-to-swap: Framer Motion `<motion.div layoutId={tool}>` on each card. Two cards swap positions via FLIP automatically.
- Initial mount: stagger the cards with `delay: i * 0.04` so they cascade in.
- Streak pill: optional subtle pulse on the flame icon (`animate-pulse-slow` from tailwind config).

## Out of scope (v2+)

- Auto-rotation carousel of the featured card
- Featuring non-tool widgets (leaderboard, PRs, coach messages, exercise of the day)
- Customizable hub (user picks which cards / order)
- Persisting the user's manual featured pick across sessions
- "Streak history" drill-in modal
- Push / email "you broke your streak" notifications
- Hub-level search ("jump to anything")

## Open questions

None — design fully resolved through five mockup iterations. Implementation details (exact Framer Motion configuration, exact SVG pattern sizing, mobile copy tweaks) are downstream of writing-plans.
