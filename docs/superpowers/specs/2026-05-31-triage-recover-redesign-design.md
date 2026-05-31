# Triage + Recover redesign

**Date:** 2026-05-31
**Status:** Approved for plan-writing
**Scope:** Four user-facing surfaces (wizard, diagnosis result, Recover landing, screen-new sheet) + a new adaptive-progression engine on the back end.

## Goal

Replace the current triage and Recover surfaces — which inherit the pre-pivot navy/slate palette, fragmented card layout, and calendar-only rehab progression — with a unified design that reads as one premium app, and that actually adapts the rehab plan to the user's reported recovery.

Two problems being solved:

1. **Visual debt** — The Recover tab still looks like the old app. Cards are stacked, dense, low-contrast against the bg, and use chip vocabulary inconsistent with ProfileSetup and the rest of the RPG-palette suite.
2. **Static rehab progression** — Phase 1 → 2 → 3 transitions on calendar alone. A user whose finger is still inflamed at day 14 gets pushed into heavier loading anyway. A fast healer waits the full 14 days for no reason. The `progression_trigger` strings already authored in `frontend/src/data/exercises.js` are not consumed by any code.

## Architecture

Four surfaces, one shared visual vocabulary, one progression engine.

```
┌──────────────────────────────────────────────────────────────────┐
│  TRIAGE WIZARD                                                    │
│  (region selected → G1 progressive reveal)                        │
│         │                                                          │
│         ▼ submit                                                   │
│  DIAGNOSIS RESULT                                                  │
│  (most likely + reasoning + plan + CTA)                            │
│         │                                                          │
│         ▼ "Start your recovery plan"                               │
│  RECOVER LANDING ──────► daily check-in (Better/Same/Worse)        │
│  (4 states)                    │                                   │
│   • pre-check-in               ▼                                   │
│   • normal day            PROGRESSION ENGINE                       │
│   • phase advance ready   (rules below)                            │
│   • flare detected             │                                   │
│         │                      ├─► phase advance prompt            │
│         │                      ├─► flare warning                   │
│         │                      └─► per-exercise "ready" hints      │
│         │                                                          │
│         ▼ "Something new hurts?"                                   │
│  SCREEN-NEW SHEET                                                  │
│  (3 questions → flare or new-issue routing)                        │
└──────────────────────────────────────────────────────────────────┘
```

## Visual vocabulary (locked)

Mockups, in order of conversation:
`.superpowers/brainstorm/19424-1780202548/content/wizard-g1-premium.html`
`/diagnosis-result.html`
`/recover-locked.html` (no check-in) / `/recover-with-checkin.html` (with engine)
`/screen-new.html`

### Type

System sans throughout — no serif anywhere. Stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. Matches ProfileSetup and the rest of the app.

| Role | Treatment |
|------|-----------|
| Page hero | 28–76px, font-weight 800, letter-spacing `-0.025em` to `-0.045em`, line-height 0.92–1.1 |
| Body | 13–15px, weight 700 for emphasis, 600 default |
| Eyebrow | 10.5–11px, weight 800, letter-spacing 0.14–0.18em, uppercase, color `#efe7d660` |
| Helper | 13px, color `#efe7d680`, line-height 1.55 |

### Palette

| Token | Hex | Role |
|-------|-----|------|
| `ct-cream` | `#efe7d6` | Primary text |
| `ct-terracotta` | `#d97757` | Primary accent (CTAs, active state, progress) |
| `ct-amber` | `#f4b53c` | Streak / secondary accent / progress gradient end |
| `ct-moss` | `#6b9a7a` | Confirmation / "Better" state / phase advance |
| `ct-forest-deep` | `#0e1714` | Page base |
| `ct-forest-mid` | `#2c4a3a` | Bottom radial gradient |
| `ct-ember-shadow` | `#3a2a1f` | Top-right radial gradient |

Backgrounds are layered radial gradients on `#0e1714`, *not* solid panels. No boxed cards on dark cards.

### Background system

Every full-page surface uses the same composition:

```css
background:
  radial-gradient(110% 50% at var(--mesh-x, 50%) 100%, #2c4a3a 0%, transparent 55%),
  radial-gradient(70% 35% at var(--mesh-x2, 92%) 0%, #3a2a1f 0%, transparent 60%),
  #0e1714;
animation: meshBreathe 24s ease-in-out infinite alternate;
```

Plus:
- **Drifting motes** — 5 terra-colored radial-gradient dots rising bottom-to-top, 22s loop with offsets (0s, 7s, 13s, 18s, 21s). Each rises once before re-entering at a new x position. Subtle warmth, not a status indicator.
- **SVG noise grain** — `feTurbulence` baseFrequency 0.85, opacity 0.55, `mix-blend-mode: overlay`. Static. Reduces flat-color CG feel.
- **Mesh breathing** — `--mesh-x` shifts 50% → 58% over 24s, `--mesh-x2` shifts 92% → 86%. Imperceptible per-frame, presence over time.

### Motion vocabulary

Per `design-motion-principles` skill: Jakub-weighted (production polish, mobile) with Emil-weighted restraint for high-frequency interactions.

| Moment | Recipe | Duration | Easing |
|--------|--------|----------|--------|
| Element enter | opacity + translateY(12px → 0) + blur(6px → 0) | 540ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Element exit | opacity + translateY(0 → -8px) + scale(1 → 0.985) + blur(0 → 4px) | 320ms | `cubic-bezier(0.4, 0, 1, 0.6)` |
| Chip activate | scale 0.94 → 1.04 → 1, ring + outer glow | 380ms | `cubic-bezier(0.34, 1.3, 0.34, 1)` |
| Progress bar fill | width with terra→amber gradient + terracotta glow | 540ms | `cubic-bezier(0.34, 1.3, 0.34, 1)` |
| Submit "bloom" | opacity + translateY + scale + warm shadow bloom | 720ms | `cubic-bezier(0.34, 1.3, 0.34, 1)` |
| Press | scale(1 → 0.98) | 120ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Reasoning expand | max-height + opacity, chev rotate 90° | 380ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Sheet slide-up | translateY(100% → 0) + opacity | 460ms | `cubic-bezier(0.2, 0, 0, 1)` |

Staggered entrances allowed once per surface (the page load), 60ms intervals — single moment per anti-checklist guidance. **No infinite pulses, no breathing dots, no hover-scale-on-everything, no per-list stagger spam.** All motion gated by `@media (prefers-reduced-motion: no-preference)`.

## Surface 1: Wizard

**Pattern:** G1 — progressive reveal, single page, no navigation.

### Layout

```
┌─ topbar ─────────────────────────────────────┐
│ ‹  ━━━━━━━━━━━━━━━━━━━━━━━━━━━           3/7│
├──────────────────────────────────────────────┤
│ Region    Finger                       Edit  │ ← answered, hairline summary
│ Onset     Suddenly                     Edit  │
│                                              │
│ HOW IT HAPPENED                              │ ← current focused question
│ What were you doing?                         │
│ Tap anything that fits. More than one OK.    │
│ [Crimping*] [Pocket] [Sloper] [Dyno*] ...    │
│                                              │
│ ··· Pain · Anything else                     │ ← pending hint
├──────────────────────────────────────────────┤
│ 2 left                    See diagnosis →    │ ← submit gates on validation
└──────────────────────────────────────────────┘
```

### Behavior

- Single-tap row answers auto-advance. Multi-select chip answers (mechanism) auto-advance after a 600ms idle (user picked everything they want) — *or* on tap of submit-area edge.
- Answered question slides up into a summary row above; new focused question rises into place. No page transitions, no Continue button.
- Tap any summary row's "Edit" → that question becomes the focused one; subsequent answers re-stack behind it.
- Top bar progress = `answered / total`. Step counter (e.g., "3 / 7") is informational, not a tap target.
- Submit bottom-right: disabled at 0.35 opacity until all required answered → blooms in with warm shadow when ready.

### Step types

- **Single-select row** (e.g., onset) — hairline-bordered rows with terra dot on active. Auto-advance on tap.
- **Multi-select chip grid** (e.g., mechanism) — pill chips, terra-tinted on active with the pop animation. Auto-advance idle 600ms or on explicit "Continue" tap if many picked.
- **Pain slider/grid** — 6 tiles in 3-color tonal gradient (mild moss-green / moderate amber / severe terra). Pre-existing slider can stay or be swapped for chips per implementation preference.
- **Region picker** (pre-wizard) — body diagram, out of scope for this spec (keep current implementation, restyled to match palette in a follow-up).

## Surface 2: Diagnosis result

**Trigger:** wizard `onSubmit` → navigate to result page. Persists via existing `sessionStorage` mechanism + (signed-in) DB write.

### Layout

```
┌── topbar ──────────────────────────────────┐
│ ‹       TRIAGE COMPLETE              Save  │
├────────────────────────────────────────────┤
│ MOST LIKELY                                 │
│ Flexor tendon tenosynovitis                 │
│ [Moderate] · [Likely]                       │
│                                             │
│ WHY THIS MIGHT BE YOU              ›        │ ← expandable
│   • Gradual onset · pain built over weeks   │
│   • Diffuse swelling · whole-finger ...     │
│                                             │
│ ALSO POSSIBLE                               │
│ [A2 pulley strain] [PIP capsulitis]         │
│                                             │
│ RIGHT NOW                                   │
│ Three days minimum before next session.     │
│ ↓ Drop intensity for 72 hours               │
│ ~ Light flexor stretching, 2–3× daily       │
│ ! See hand specialist if it worsens         │
│ + Start your 14-day recovery plan           │
├────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐│
│ │ Start your recovery plan        →       ││ ← bloom on entrance
│ └─────────────────────────────────────────┘│
│       Doesn't sound right? Re-screen        │
└────────────────────────────────────────────┘
```

### Entrance choreography

| ms | Element |
|----|---------|
| 0 | "MOST LIKELY" eyebrow rises |
| 80 | Condition name materializes |
| 200 | Severity + confidence pills |
| 300 | Reasoning panel border draws in |
| 380 | "ALSO POSSIBLE" row |
| 480 | Plan section header |
| 540 | Plan sub copy |
| 600–780 | 4 plan items, 60ms intervals |
| 860 | Primary CTA blooms (warm shadow) |
| 960 | Re-screen footer |

Total ~1s, fires once on mount. Replay disabled (real users don't need it; mockup has a debug "Replay" button only).

### Behavior

- Tap "Why this might be you" → chev rotates 90°, panel expands 380ms.
- Tap an "Also possible" chip → opens a modal/sheet with that alternative's reasoning + action plan (out of scope detail — implement as basic info reveal v1).
- Primary CTA writes the rehab plan record + navigates to Recover landing with the diagnosis in `location.state` (existing pattern, preserved).
- Re-screen returns to wizard root (drops the in-progress diagnosis).
- Top-right "Save" — for signed-out users, opens auth modal with the diagnosis context preserved in sessionStorage (existing pattern).

## Surface 3: Recover landing

**Replaces:** `RecoverActiveView.jsx` (194 lines). Keeps `useRehabProgress` hook + `/api/rehab/progress` backend. Adds check-in widget, progression-state UI, exercise progression hints, and phase-advance / flare moments.

### Four states

| State | Trigger | Hero |
|-------|---------|------|
| ① Pre-check-in | First open of the day, no check-in submitted | Check-in question + Better/Same/Worse chips |
| ② Normal day | Check-in submitted, no advance/flare triggered | Day N/M anchor + exercise list (+ "Ready to progress" hints where unlocked) |
| ③ Phase advance ready | Engine determines all advance gates met | Moss-green "Ready for Phase 2" prompt |
| ④ Flare detected | Engine detects flare (rules below) | Terra-tinted "Symptoms flared" warning + paused plan |

### State ① — Pre-check-in

```
┌── topbar ──────────────────────────────────┐
│ PHASE 1 · RECOVER         ▪5d   9 days left │
├────────────────────────────────────────────┤
│ DAY 5 OF 14                                 │
│                                             │
│ How does the hand feel today?               │ ← question IS the hero
│                                             │
│ Quick read — used to pace your plan.        │
│                                             │
│ [ Better ↑ ]  [ Same → ]  [ Worse ↓ ]       │ ← tonal: moss / cream / terra
├────────────────────────────────────────────┤
│  Something new hurts?  Re-screen            │
└────────────────────────────────────────────┘
```

Tap any chip → activates with tonal glow (380ms), persists to backend, transitions to State ② (or ④ if "Worse" + flare gates met).

### State ② — Normal day

```
┌── topbar ──────────────────────────────────┐
│ PHASE 1 · RECOVER         ▪5d   9 days left │
├────────────────────────────────────────────┤
│ TODAY'S CHECK-IN              Better · day 5│ ← collapsed summary, tappable
│                                             │
│ Day 5 / 14                                  │ ← anchor returns
│ 4 exercises · ~12 min. Working through      │
│ flexor tendon tenosynovitis.                │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━     1 / 4 today │
│                                             │
│ i  ̶W̶r̶i̶s̶t̶ ̶f̶l̶e̶x̶o̶r̶ ̶s̶t̶r̶e̶t̶c̶h̶              ●  │ ← done: line-through, terra dot
│ ii Wrist extensor stretch                ○  │
│    3 × 30s · 2–3× daily                     │
│    ◉ Ready to progress →                    │ ← per-exercise hint
│ iii Wrist circles                        ○  │
│ iv  Light grip warm-up                   ○  │
│                                             │
│ ┌ Two more "Better" days and you'll be ──┐  │ ← ramp forecast
│ │ ready to ramp up to Phase 2.           │  │
│ └────────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  Something new hurts?  Re-screen            │
└────────────────────────────────────────────┘
```

### State ③ — Phase advance ready

```
│ TODAY'S CHECK-IN              Better · day 12│
│                                              │
│ Day 12 / 14                                  │ ← day anchor smaller, contextual
│ You've hit your progression triggers.        │
│                                              │
│ ┌── PHASE ADVANCE READY ──────────────────┐  │ ← moss-green prompt card
│ │ Ready for Phase 2 — light loading.      │  │
│ │ 3 "Better" check-ins this week, 86%     │  │
│ │ completion. Phase 2 brings heavier      │  │
│ │ wrist/finger loading and hangboard      │  │
│ │ reintroduction over 4 weeks.            │  │
│ │ [ Start Phase 2 → ]  [ Stay on P1 ]     │  │
│ └─────────────────────────────────────────┘  │
```

Primary "Start Phase 2 →" writes phase advance to backend; the displayed exercise list pulls from `EXERCISES[region][phase]` with the new phase.
Secondary "Stay on Phase 1" defers; engine re-evaluates in 3 days.

### State ④ — Flare detected

```
│ TODAY'S CHECK-IN              Worse · day 6 │ ← copy in terra
│                                             │
│ ┌── SYMPTOMS FLARED ──────────────────────┐ │ ← terra-tinted warning
│ │ Step back to lighter exercises for      │ │
│ │ 5 days?                                 │ │
│ │ 3 "Worse" check-ins in 5 days. Pain     │ │
│ │ trending up 4 points vs baseline.       │ │
│ │ [ Step back to lighter set ] [ Re-screen ]│
│ └─────────────────────────────────────────┘ │
│                                             │
│ Day 6 / 14  (dimmed)                        │ ← plan paused
│ Plan paused until you choose how to proceed.│
```

Primary "Step back" → swaps current exercises to a lighter set drawn from prior phase or Phase 1's gentlest entries. Logs the regression with reason.
Secondary "Re-screen" → screen-new sheet (Surface 4).

### Streak chip

Top-right, amber pill: "▪ 5d". Bumps when both conditions met that day:
- Daily check-in submitted (any answer)
- At least 80% of prescribed exercises checked off

No infinite pulses, no day-1 celebration spam. Optional one-time moment at 7d / 30d streaks (out of scope for v1).

## Surface 4: Screen-new sheet

**Trigger:** "Something new hurts? Re-screen" pill on Recover landing.

**Pattern:** Bottom sheet slides up over a dimmed (blurred + brightness 0.55) Recover backdrop.

### Flow

```
┌── grab bar ────────────────────────────────┐
│      QUICK CHECK                       ×    │
│ ●━━ ━━━ ━━━ ━━━                              │ ← step dots
├────────────────────────────────────────────┤
│ WHERE                                       │
│ Where's the new pain?                       │
│                                             │
│ [● Same finger (current plan)            ›] │
│ [+ Different finger or hand spot         ›] │
│ [~ Somewhere completely different        ›] │
└────────────────────────────────────────────┘
```

3 questions, all auto-advance, 0 Continue buttons:

| Step | Question | Options |
|------|----------|---------|
| 1 | Where's the new pain? | Same area / Different hand spot / Somewhere else |
| 2 | How sudden? | Right now (sharp) / Today gradually / Already there worsening |
| 3 | How bad right now? | 6 tiles: 1–2 / 3–4 / 5–6 / 7–8 / 9–10 / Not sure |

### Routing

Engine combines the three answers into one of two result states:

**State 4a — Likely a flare (moss-green card)**
- Same area AND (gradual onset OR already-there) AND pain ≤ 6
- "Same pattern as your current plan. Logged as flare on day N."
- Actions: `Keep my plan →` (primary) / `Re-screen anyway`

**State 4b — Pattern doesn't match (amber card)**
- Different area OR sharp onset OR pain ≥ 7
- "This looks different. Worth running a full triage."
- Actions: `Run full triage →` (primary, routes to wizard with new region pre-selected if applicable) / `Keep current plan, track separately`

"Somewhere completely different" routes straight to step 4b without asking the other two — visibly different region is always new-issue territory.

## Progression engine (the new logic)

### Daily check-in capture

- Required: status (`better` | `same` | `worse`)
- Optional: pain score (0–10 integer)
- Persisted to new table `rehab_checkins` (schema below)
- Skipped check-in = treated as `same` for advancement logic but contributes to a "stalled" counter (3+ consecutive skips → soft nudge in UI to check in)

### Phase advancement (Phase N → Phase N+1)

All of:
- ≥ minimum days in phase: P1 = 10 of 14, P2 = 21 of 28, P3 = ongoing (no auto-advance, manual exit only)
- ≥ 70% completion rate over last 7 days (`done_exercises / prescribed_exercises`)
- ≥ 3 "Better" check-ins in last 7 days
- Zero "Worse" check-ins in last 3 days

When all met → State ③ surfaces. User confirms or defers; defer re-evaluates after 3 days.

### Phase regression (Phase N → lighter set)

Either:
- ≥ 3 "Worse" check-ins in last 5 days
- Pain score Δ ≥ +3 vs trailing 7-day baseline

Triggers State ④. Stepping back swaps the exercise list to Phase 1's lightest set for 5 days, then engine re-evaluates.

### Within-phase weekly ramp

Each phase has week-blocks. Week-2 of a phase may:
- Add one rep range to an existing exercise (e.g., 3×30s → 4×30s)
- Add one new exercise (sourced from `exercises.js` phase entries marked `week: 2`)
- Progress an existing exercise to a harder variant

Gated by the same "zero Worse in last 3 days" check. Ramp transitions are silent — no UI prompt — but a "Today's exercises evolved" line appears once on the first day post-ramp.

### Per-exercise progression

The `progression_trigger` strings in `frontend/src/data/exercises.js` now mean something. For each exercise with a defined trigger:
- Track consecutive painless completion days per `exercise_key`
- When trigger condition met (parsed from the string per exercise — `5_consecutive_painless`, `painless_through_full_range`, etc.) AND no "Worse" check-in in last 3 days → "◉ Ready to progress →" hint appears on the row
- Tap "Ready to progress" → opens a small bottom sheet asking "Move to [next variant]?" — confirm swaps it in for tomorrow's list, defer keeps current

### Streak

```
streak_today = streak_yesterday + 1 if (
  check_in_submitted_today AND
  completion_today >= 0.80
) else 0
```

Visible only on Recover landing (top-right amber chip).

## Data model

### New table

```sql
CREATE TABLE rehab_checkins (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region        TEXT NOT NULL,
  date          DATE NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('better', 'same', 'worse')),
  pain_score    SMALLINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, region, date)
);

CREATE INDEX rehab_checkins_user_date_idx ON rehab_checkins (user_id, date DESC);
```

### New endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/rehab/checkins` | Upsert today's check-in (body: `{ region, status, pain_score? }`). Returns updated engine state. |
| `GET` | `/api/rehab/checkins?region=&from=&to=` | Range query for engine evaluation + history surfacing. |
| `GET` | `/api/rehab/state?region=` | Returns the current engine state: `{ phase, day_in_phase, can_advance, advance_blockers, flare_detected, streak, ready_to_progress: [exercise_keys] }`. |
| `POST` | `/api/rehab/advance` | Confirms a phase advance. Body: `{ region, to_phase }`. Persists the transition + writes a `rehab_phase_transitions` row. |
| `POST` | `/api/rehab/regress` | Steps back to lighter set. Body: `{ region, reason }`. |

The existing `/api/rehab/progress` (daily check-offs) stays unchanged. `useRehabProgress` hook stays unchanged.

### New hook

`useRehabEngine(region)` — calls `GET /api/rehab/state` on mount + after every check-in or check-off. Returns the engine state object above. Recover landing reads from this to decide which of the 4 states to render.

## Migration

| Current | Replaced by |
|---------|-------------|
| `TriageTab.jsx` (multi-step autoscroll wizard) | New `TriageWizard` (G1 progressive reveal) |
| `TriageDiagnosis.jsx` (426 lines) | New `DiagnosisResult` component |
| `RecoverActiveView.jsx` (sticky header + status pills + checklist) | New `RecoverActiveView` with check-in widget + engine state |
| `rehabHeuristic.js` (calendar-only `rehabProgress(triageCreatedAt)`) | New `useRehabEngine` hook calling `/api/rehab/state` |
| "Something new hurts? Screen →" sticky bottom button | "Re-screen" pill at the bottom; sheet opens over dimmed Recover |

Files that stay:
- `frontend/src/data/exercises.js` (3,376 lines) — keep the data, the engine now consumes `progression_trigger`
- `useRehabProgress.js` — daily check-off persistence works as-is
- `/api/rehab/progress` — unchanged
- `EXERCISES[region][phase]` lookup pattern — unchanged
- `RecoverEmptyView.jsx` — minor restyle pass to match palette, no behavior change

## Out of scope

- Region picker (body diagram) — keeps current implementation, restyle in a follow-up
- Hub / Profile / Movement Analyzer / Learn tab — separate work
- Auth flows + saved-to-history banner — keep current behavior
- Animated illustrations (anatomy diagrams, etc.) — v2+
- Body diagram with affected-region highlight — v2+
- Push notifications for "you haven't checked in today" — v2+
- Streak celebrations beyond the static chip — v2+
- Internationalization — all copy currently English

## Implementation phasing

This is a coordinated 4-surface redesign + a backend engine. Recommended split into three plans, each shippable independently:

**Phase A — Visual vocabulary + wizard + diagnosis result**
- New `<TriageWizard>` (G1 progressive reveal, all 4 states of motion)
- New `<DiagnosisResult>` component + staggered entrance choreography
- Shared atoms: `<ProgressBar>`, `<ChipGroup>`, `<DriftingMotes>`, `<MeshBackground>`, `<NoiseGrain>` (each their own small file)
- Pure frontend, no backend changes. Ships independently.

**Phase B — Recover redesign + progression engine**
- Backend: `rehab_checkins` table, new endpoints, `/api/rehab/state` evaluator
- Frontend: new `<RecoverActiveView>` with `useRehabEngine` hook + 4 states
- New components: `<DailyCheckin>`, `<PhaseAdvancePrompt>`, `<FlareWarning>`, `<ExerciseProgressionHint>`, `<StreakChip>`
- Migrates from `rehabHeuristic.js` calendar-only to engine-driven

**Phase C — Screen-new sheet**
- New `<ScreenNewSheet>` component (bottom sheet with backdrop)
- New endpoint: `/api/rehab/flare-classify` or do the classification client-side from existing state (TBD by implementer)
- Routing: replaces current `navigate('/triage')` from the "Something new hurts?" button

Each phase has its own plan written via the `writing-plans` skill.

## Testing

Per phase:
- **Phase A** — Snapshot + interaction tests on wizard step transitions, chip multi-select state, progressive-reveal summary edit, submit gating. Visual regression on the diagnosis entrance choreography.
- **Phase B** — Engine evaluator: unit tests for every advancement / regression / ramp rule, including boundary cases (exactly 10 days, exactly 3 Worse, exactly 70% completion). Integration tests for the four Recover states.
- **Phase C** — End-to-end: tap Re-screen → 3 questions → routing decision lands in the right card. Test both the "Same finger" + gradual + low-pain → flare path and the "Different finger" → escalate path.

Accessibility (every phase):
- `prefers-reduced-motion` disables all motion at the root
- Color is never the sole signal (severity has a label, not just a color)
- All interactive elements ≥ 44×44px tap targets
- Focus order matches visual order
- Screen reader: progress bars have `aria-valuenow`, check-in chips have `aria-checked`

## Open questions for plan-writing

1. Should the check-in chips capture pain score in the same tap, or only after Better/Same/Worse is chosen (expand to slider on tap-hold)?
2. Should "Worse" with low pain (≤4) still trigger flare gates, or should pain ≥ a threshold be required?
3. For first-time users (day 0, no prior check-ins), do we show State ① immediately, or auto-set "Same" to skip the friction?
4. Phase C — does "Run full triage" pre-fill region if the user picked "Different finger" in step 1? Probably yes, but flag for plan.
5. `progression_trigger` strings in `exercises.js` are currently natural-language English ("No pain at all during the stretch for 5 days in a row"). They need a structured representation for the engine to consume — either a normalization pass (add a `trigger_kind` enum + parameters per exercise) or keep English strings and add a separate per-exercise rule table. Decide in Phase B planning.
