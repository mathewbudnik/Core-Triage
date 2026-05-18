# Train Tab Redesign Design

**Date:** 2026-05-17
**Status:** Design — pending user review
**Related work:**
- [Climbing progression UI redesign](2026-05-17-climbing-progression-ui-redesign-design.md) — tier system + Hub aesthetic this builds on
- [Hub home screen](2026-05-13-hub-home-screen-design.md) — visual baseline (radial backdrop, glass cards, hairline borders)

## Problem

The current Train tab is functional but visually disconnected from the rest of the app. It uses the legacy `bg-panel` / `border-outline` palette while Hub and Progress already speak the new tier-themed glass-card language (radial backdrop, hairline `border-white/[0.08]` strokes, 22px radii, SF Pro tabular numerics, Cove teal accents). Inside Train itself:

- The week selector (1-2-3-4 chevrons) buries the most-asked question — "what am I doing today?" — three taps deep.
- Sessions render as a vertical accordion in greyscale; nothing about the screen tells you whether today is a power day, a rest day, or something else without reading the title.
- The "Generate plan" empty state and the profile summary chip eat real estate above the fold on phones.
- There is no integration with the climber's working tier — the screen feels generic where Hub feels personal.

Goal: rebuild Train to match Hub/Progress (Apple Fitness-pristine, minimalist, tier-themed) and put **today's session** at the visual center with one tap to start.

## Non-goals

- No changes to plan generation, profile setup flow, or session-logging API. The backend `/api/plans/*` endpoints are untouched.
- No new session types or programming logic.
- No leaderboard or social features (per established direction — personal coaching, not grade-chasing).
- Multi-week swipeable plan view is out of scope for this spec; the multi-week plan remains accessible via a compact eyebrow chip that opens a bottom sheet listing the four weeks.

## Visual baseline

Inherits from the Hub:
- Page-level radial backdrop tinted by the user's working tier (`var(--tier-c)` at ~22% alpha at `circle at 50% -10%`).
- Glass cards: `bg-black/35 backdrop-blur-md`, `rounded-2xl` (22px), `border-[0.5px] border-white/[0.10]`.
- Typography: SF Pro Display for titles, SF Pro Text for body. Tabular numerics on every numeric value (dates, durations, day numbers).
- All icons via lucide-react. No emoji anywhere.

## Components

The Train tab is composed of six new components. Each has one clear responsibility.

### `TrainTab.jsx` (rewritten)

Orchestrator. Owns the state machine (`loading | no-auth | setup | generating | ready | error`), fetches profile + active plan, holds the currently-selected day, mounts the page-level `TierThemeRoot` wrapper.

Selected-day state defaults to today's date (ISO `YYYY-MM-DD`). Persisted in component state only — not in URL or localStorage.

### `TrainHeader.jsx`

Top header row inside the `ready` state. Three pieces:
- **Left column:** day-of-week eyebrow (`Sunday · May 17`), bold "Train." title (period included), tier-pill below (`V5 · Cove · Power phase` — V-grade, tier name, current plan phase from `plan.phase`).
- **Right side:** `TrainStreakChip` — gold-tinted pill with lucide `Flame` icon + day count (`5d`). Hidden when `streakDays < 2`. Reads `streakDays` from the Hub-data hook (shared with HubTab so the value matches what's shown on Hub).

Tier pill uses `var(--tier-c)` at 10% bg and 30% border, light tone for text (`var(--tier-light)`).

### `TrainWeekStrip.jsx`

Seven-day strip (Monday-start, configurable later if needed but starts on Monday for now). Renders one tile per day with:
- Day letter (`M`, `T`, `W`, ...).
- Date number (`12`, `13`, ...) — tabular nums.
- Single status dot underneath.

Tile states:
- **Active** (selected day) — teal gradient background, dot with teal halo, day letter in tier light.
- **Today** (W in current week) — day letter in tier light, dot in tier light if also active.
- **Past** — date number at 55% opacity, dot filled in `var(--tier-c)` if a session was logged that day, dot at 14% white if rest day.
- **Future** — date number at 85% opacity, dot in 14% white.
- **Rest** — date number at 30% opacity, no dot.

The dot is single-color (tier color or neutral) — the previous v3 prototype's session-type-colored dots were rejected as too busy. Type indication lives in the hero, not the strip.

Tap a tile → calls `onSelectDay(isoDate)`. Tapping today's tile is allowed and resets selection to today. Active state is purely a UI affordance — the underlying selected-day state lives in `TrainTab`.

Width math: `grid-cols-7 gap-1.5`, each tile flexes equally. Tile padding `py-2.5`. Active background uses `linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 18%, transparent), color-mix(in srgb, var(--tier-c) 4%, transparent))` and `border-[0.5px]` at 42% tier alpha.

### `TrainHeroCard.jsx`

The dominant card on screen. Always backgrounded in tier color regardless of which day is selected — the user's color is the canvas.

Props: `{ session, dayStatus, plan }` where `session` is the session object for the selected day (or `null` if rest day / no session), and `dayStatus` is `'past' | 'today' | 'future' | 'rest'`.

Hero contents:
- **Type-dotted eyebrow.** Small colored dot (7×7px) followed by uppercase text. The dot's color comes from `SESSION_TYPE_COLOR[session.session_type]` (table below). The text reads:
  - `Today · Power` when `dayStatus === 'today'`
  - `Mon · Completed` when `dayStatus === 'past'`
  - `Thursday · Endurance` (full day name + session type) when `dayStatus === 'future'`
  - `Friday · Rest day` when `dayStatus === 'rest'` — dot hidden.
- **Title** — `<session_type> session` rendered as a two-line h1 (28px font-extrabold, -0.025em letter-spacing, line-height 1.05). On rest days: "Rest day".
- **Subtitle** — single line: `<duration> min · <session description>`. On rest days: a calmer line ("Mobility + sleep are the work" or copy from `plan.rest_copy` if present).
- **CTA button:**
  - `dayStatus === 'today'`: solid tier-color "Start session →" (opens session detail sheet).
  - `dayStatus === 'past'`: ghost "View session →" with a "✓ Completed" inline tag to the right (lucide `Check` icon).
  - `dayStatus === 'future'`: ghost "View session →".
  - `dayStatus === 'rest'`: no CTA.

Hero background gradient (today / past / future):
```css
background:
  radial-gradient(circle at 28% 0%, color-mix(in srgb, var(--tier-c) 40%, transparent) 0%, transparent 60%),
  radial-gradient(circle at 95% 100%, color-mix(in srgb, var(--tier-light) 16%, transparent) 0%, transparent 70%),
  linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 10%, transparent), color-mix(in srgb, var(--tier-deep) 20%, transparent));
border: 0.5px solid color-mix(in srgb, var(--tier-c) 22%, transparent);
```

Rest-day variant uses neutral white-alpha gradients (no tier color), `border-white/[0.10]`. This is the only state where the hero loses the tier glow — rest days read as a different mode.

### `SessionDetailSheet.jsx`

Full-height bottom sheet shown when the user taps the hero CTA or a future-day "View session" button. Slides up from the bottom via framer-motion (`initial={{ y: '100%' }} animate={{ y: 0 }}`), with backdrop dim. Closes on backdrop tap, swipe-down on the drag handle, or the X button.

Contents:
- Drag handle at the top (small horizontal pill).
- Session title + duration + RPE in the header.
- Per-block exercise list using the existing `ExerciseCard` component (already in `PlanView.jsx`), restyled to match the new glass aesthetic (move from `bg-panel` to `bg-black/35 backdrop-blur-md` with hairline border).
- Sticky bottom bar: "Log this session" button (solid tier color) — opens the existing `TrainingLogEntry` component pre-filled with session metadata.

Bottom-sheet height: `max-h-[88vh]` with internal scroll for long sessions. iOS-safe bottom inset honored via `env(safe-area-inset-bottom)`.

### `TrainNextUpRow.jsx`

Thin row beneath the hero. Single-line text:
> Next: **Thursday · Endurance · 75 min** ›

Computed by walking forward from the selected day through the week, skipping `rest` and `past` days. If no upcoming non-rest session remains, shows "End of the week — review your plan ›" (italic, dim). Tapping the row selects that day in the week strip (programmatic equivalent of tapping the day tile).

No colored swatch — earlier v3 prototype's per-type swatch was pulled for minimalism.

### `TrainPlanArcChip.jsx`

Compact chip rendered at the very top of `ready` state, above the header:
> Week 2 of 4 · Power phase ›

Tap opens a `PlanArcSheet` bottom sheet listing all four weeks with their phase labels and a small completion indicator (`Week 1 ✓`, `Week 2 ●`, `Week 3 ◯`, `Week 4 ◯`). User can tap any week to jump the week strip to that week's Monday. Closes on backdrop tap.

This replaces the current week-selector chevrons — multi-week navigation is one tap away but never crowds the today-first frame.

## Session-type color tokens

Pulled from the tier palette so the colors stay coherent across the app:

| Session type | Token color (c) | Light | Deep | Source |
|---|---|---|---|---|
| Power | `#fb7185` | `#fda4af` | `#7f1d2c` | v10 Phoenix |
| Limit | `#ff7a3d` | `#ffa97a` | `#802811` | v2 Ember |
| Endurance | `#14b8a6` | `#5eead4` | `#0a4f48` | v5 Cove |
| Hangboard | `#c5e637` | `#d9f06a` | `#5a6810` | v3 Bramble |
| Strength | `#f7b03a` | `#fbd470` | `#7c5a14` | v1 Halo |
| Mobility | `#8466ff` | `#ad95ff` | `#3a2580` | v8 Veil |
| Rest | `transparent` (hide dot) | — | — | — |

Lives in `frontend/src/lib/sessionType.js` as `SESSION_TYPE_COLOR`. Exposes a single helper `getSessionTypeColor(type)` that returns `{ c, light, deep }` with `Endurance` as the fallback for unknown types.

Session-type color appears in exactly one place: the type-dotted eyebrow inside the hero. Tapping a different day re-tints that single dot — nothing else on the screen changes color.

The week-strip status dots use tier color (`var(--tier-c)`) when a day has a logged session, neutral white-alpha otherwise. Session-type-colored dots in the strip were prototyped (v3-v4) and rejected as too busy.

Tier color appears everywhere else — backdrop, hero gradient, CTA fill, week-tile active state, tier pill, status dots, nav active state.

## State machine

The state machine is unchanged from the existing TrainTab (`loading | no-auth | setup | generating | ready | error`); only the visual treatment differs.

- **loading** — centered spinner using lucide `Loader2`, no glass card.
- **no-auth** — full-screen empty state, lucide `Dumbbell` icon, primary CTA "Log in or create account" in tier teal.
- **setup** — wraps the existing `ProfileSetup` component, mounted inside `TierThemeRoot`. No other styling changes in this PR.
- **generating** — centered spinner + "Building your plan…" — restyled to match the empty-state visual hierarchy.
- **error** — full-screen empty state, error message, "Retry" button.
- **ready** — the full redesign (plan-arc chip + header + week strip + hero + next-up + bottom-sheet on tap).
- **ready, no plan yet** — same header + week strip rendered for visual continuity, but the hero becomes a "Ready to build your plan" CTA card in tier color with lucide `Sparkles` icon and a "Generate my plan" button.

## Data flow

```
TrainTab
  ├── useEffect on mount → getProfile() + getActivePlan()
  ├── state.selectedDay (default: today's ISO date)
  ├── state.session = useMemo(() => sessionForDay(plan, selectedDay), [plan, selectedDay])
  │
  └── render:
      ├── <TierThemeRoot hardest={hardestSends} global>
      ├── <TrainPlanArcChip plan={plan} onOpen={openPlanSheet} />
      ├── <TrainHeader user={user} streakDays={streakDays} plan={plan} />
      ├── <TrainWeekStrip
      │     weekDates={currentWeekDates}
      │     plan={plan}
      │     loggedDates={loggedDates}
      │     selectedDay={selectedDay}
      │     onSelectDay={setSelectedDay} />
      ├── <TrainHeroCard
      │     session={session}
      │     dayStatus={dayStatusFor(selectedDay, plan)}
      │     onStart={() => setSheetOpen(true)} />
      ├── <TrainNextUpRow plan={plan} fromDay={selectedDay} onSelectDay={setSelectedDay} />
      └── <SessionDetailSheet open={sheetOpen} session={session} onClose={...} />
```

### `sessionForDay(plan, isoDate)` helper

Lives in `frontend/src/lib/trainSessions.js`. Maps an ISO date to the plan's session by computing `(date - plan.start_date) / 7 + 1` = week, and the weekday within that week, then finding the session matching `(week, day_index)` in `plan.plan_data.sessions`. Returns `null` if no session for that day (e.g., rest day in a plan that only has 4 sessions/week).

### `dayStatusFor(isoDate, plan)` helper

Returns one of `'past' | 'today' | 'future' | 'rest'`:
- `'past'` if the date is before today's ISO date.
- `'today'` if equal to today.
- `'rest'` if no session is scheduled for that date in the plan.
- `'future'` otherwise.

### Logged-dates fetch

`loggedDates` (set of ISO date strings the user has training logs for in the current week) comes from a new lightweight endpoint or — if simpler — reuse `useHubData`'s `weekLoggedDates` field, which already aggregates training_logs for the current week.

Decision: reuse `useHubData.weekLoggedDates` to avoid a duplicate fetch. TrainTab calls `useHubData(user)` to grab `streakDays`, `hardestSends`, and `weekLoggedDates`. This couples Train to the same data path as Hub — intentional, since both screens visualize the same underlying week.

## Mobile-first interaction details

- Week tiles have a minimum tap target of 44×44px (Apple HIG). Tile height ≥ 56px including padding.
- The hero CTA is full-height-on-press via framer-motion `whileTap={{ scale: 0.97 }}` matching the triage actions bar.
- Bottom sheet has snap-points: closed, half-open (50%), fully-open (88%). Drag-down past closed threshold dismisses. (Implementation note: framer-motion's `drag="y"` with constraints, not a library — keeping bundle small.)
- The plan-arc chip uses native iOS-style chevron (lucide `ChevronRight` at 12px).
- All numeric values use `tabular-nums` so digit width is uniform (date numbers, durations, week numbers).

## Backwards compatibility

- The existing `PlanView` component is **superseded** by the new components. We delete it after migration — not kept as a fallback. (Per project policy: no compat shims.)
- The existing `SessionDetail` and `SessionCard` subcomponents in `PlanView.jsx` are extracted into their own files (`SessionDetailSheet.jsx` and the exercise-row internals) during this rebuild so they're testable in isolation.
- `WeekSummary` component is removed — its content (total sessions, total time, RPE avg for the week) is folded into the new design as either inline metadata in the plan-arc sheet or dropped entirely. Decision: dropped from this redesign. The week's load is implicit from the week strip dots; an aggregated stat doesn't earn its real estate in the today-first frame.

## Accessibility

- Week strip tiles have `role="button"` and `aria-label="Wednesday May 14, today's session: Power"`.
- The plan-arc chip is keyboard-focusable with `tabIndex={0}`.
- The bottom sheet traps focus when open, returns focus to the originating button on close.
- `prefers-reduced-motion` honored on sheet slide animations.

## Testing

- Component tests (Vitest + Testing Library):
  - `TrainWeekStrip` — renders 7 tiles, marks today correctly, highlights selected day, calls `onSelectDay` with ISO date.
  - `TrainHeroCard` — renders all four day-status variants, shows correct CTA per status, hides CTA on rest days.
  - `SessionDetailSheet` — opens/closes, traps focus, lists exercises.
  - `TrainNextUpRow` — skips rest and past days correctly, handles end-of-week.
- Helper tests:
  - `sessionForDay` — maps dates to sessions across all 4 weeks, returns null for rest days.
  - `dayStatusFor` — correctly classifies past/today/future/rest.
- Manual phone verification (Task 11-style hands-on):
  - iPhone 13 mini width (375px) — no horizontal overflow.
  - Tap targets ≥ 44px.
  - Color tokens render correctly under both light and dark system themes (app forces dark, but check anyway).

## File structure

**Create:**
- `frontend/src/components/train/TrainHeader.jsx`
- `frontend/src/components/train/TrainStreakChip.jsx`
- `frontend/src/components/train/TrainWeekStrip.jsx`
- `frontend/src/components/train/TrainHeroCard.jsx`
- `frontend/src/components/train/TrainNextUpRow.jsx`
- `frontend/src/components/train/TrainPlanArcChip.jsx`
- `frontend/src/components/train/PlanArcSheet.jsx`
- `frontend/src/components/train/SessionDetailSheet.jsx`
- `frontend/src/lib/sessionType.js`
- `frontend/src/lib/trainSessions.js`
- Test files in `frontend/src/__tests__/train/` (one per component / helper)

**Modify:**
- `frontend/src/components/TrainTab.jsx` — full rewrite to orchestrate the new components.

**Delete (after migration):**
- `frontend/src/components/PlanView.jsx` — superseded.

The `frontend/src/components/train/` directory is new and is the home for all Train-specific components going forward.

## Open question (already answered, recorded for the plan)

- **Multi-week navigation:** compact eyebrow chip + bottom sheet. (Answered earlier in brainstorming.)
- **Session detail expansion:** bottom sheet. (Answered earlier in brainstorming.)
- **Reward-loop integration (HubStreakChip / HubUnlockPill / TierBurst / glow log button):** out of scope for this spec. That work is paused as a separate effort; this redesign reuses the same `streakDays` value but doesn't add the burst/unlock-pill components. They'll be folded in as a follow-up.

## Success criteria

A first-time user on an iPhone 13 mini opens Train and:
- Sees today's session as the dominant element on screen, with one-tap "Start session" in their tier color, within 2 seconds of load.
- Can tap any other day in the week strip and the hero updates inline — no scroll, no extra navigation.
- Can tap the week chip to jump to a different week.
- Reads the screen as visually consistent with Hub and Progress (same backdrop, same card style, same fonts).
- Encounters no emoji anywhere.
