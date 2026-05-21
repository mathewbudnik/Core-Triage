# RPG Climber — Phase 4: Triage / Recover / Train / Chat re-chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-chrome the four remaining tabs — Triage, Recover, Train, Chat — and their composing components so they share the RPG outdoor aesthetic established in Phases 0–3 (forest-deep surfaces, terracotta accents, cream typography, `Surface` + `Eyebrow` primitives). All behavior is preserved. No data-layer or hook changes.

**Architecture:** Each component's outer wrapper moves to `<Surface>` where it currently uses `bg-panel`, `bg-bg/N`, `border-outline`, ad-hoc `rgba()` panel chrome. Header labels become `<Eyebrow>`. Body copy moves to `ct-cream` / `ct-cream/N`. Tier-c CSS vars get unhooked from chrome surfaces where they create a "competing palette" effect (per the Phase 3 ProgressTab fix) but are preserved on truly tier-reactive elements: BodyDiagram region colors, GradePyramidCard rows, TrainHeader's V-tier badge — these are data visualizations where tier color carries meaning. Buttons that today use `var(--tier-c)` for accent get swapped to `ct-terracotta`/`ct-terra-soft` (consistent with the Phase 3 Log button fix).

**Tech Stack:** React 18, Vite, Tailwind 3.4, Framer Motion 11, Vitest. No new deps.

---

## Components in scope (16 files)

### Triage (5)
- `TriageTab.jsx` — outer tab, modal mounts
- `TriageDiagnosis.jsx` — diagnosis result hero
- `triage/TriageWizard.jsx`, `triage/TriageHero.jsx`, `triage/TriageSectionCard.jsx` — wizard chrome (cards, chips, sliders)

### Recover (5)
- `RecoverTab.jsx`, `RecoverEmptyView.jsx`, `RecoverActiveView.jsx`, `RecoverExerciseCard.jsx`, `RecoverStatusPills.jsx`
- `RehabTab.jsx`, `RehabProtocol.jsx` (body-rehab pair)
- `BodyDiagram.jsx` — preserve region color reactivity, refresh container chrome only

### Train (3)
- `TrainTab.jsx` outer shell
- `train/TrainHeroCard.jsx`, `train/TrainHeader.jsx`, `train/TrainPlanArcChip.jsx`, `train/TrainStreakChip.jsx`, `train/TrainNextUpRow.jsx`, `train/TrainCalendar.jsx`, `train/TrainMonthGrid.jsx`, `train/TrainWeekStrip.jsx`, `train/PlanArcSheet.jsx`, `train/SessionDetailSheet.jsx`, `train/ExerciseTimer.jsx`

### Chat (3)
- `ChatTab.jsx`, `ChatPicker.jsx`, `AIChatView.jsx`, `CoachChat.jsx`, `CoachChatView.jsx`, `CoachInbox.jsx`, `CoachInboxView.jsx`

### Cross-cutting (3)
- `BodyExerciseCard.jsx` (Body tab — appears under Recover/Body)
- `BodyActiveView.jsx`
- `BodyTab.jsx`

That's ~25 files. The plan groups them into 8 batched tasks below.

---

## Task 1: Triage chrome pass

**Files:**
- Modify: `frontend/src/components/TriageTab.jsx`
- Modify: `frontend/src/components/TriageDiagnosis.jsx`
- Modify: `frontend/src/components/triage/TriageWizard.jsx`
- Modify: `frontend/src/components/triage/TriageHero.jsx`
- Modify: `frontend/src/components/triage/TriageSectionCard.jsx`

- [ ] **Step 1: Replace `bg-panel`, `bg-bg/N` panel patterns with `<Surface>`**

For each file, find the top-level card container that currently uses `bg-panel` or `bg-bg/85 backdrop-blur-md` or similar. Wrap in `<Surface tier="default" padding="md" rounded="rounded-2xl">` (or `tier="hero"` for primary heroes). Add the imports.

- [ ] **Step 2: Replace ad-hoc eyebrow labels with `<Eyebrow>`**

Any `<p|div className="text-[10..12]px font-bold uppercase tracking-...">` that acts as a section label becomes `<Eyebrow>...</Eyebrow>`.

- [ ] **Step 3: Replace `text-text` → `text-ct-cream` and `text-muted` → `text-ct-cream/60`**

Use replace_all only inside the specific files. Don't touch `text-muted-foreground` (different token).

- [ ] **Step 4: Where buttons or pills use `var(--tier-c)` purely as an accent (not for data viz), swap to ct-terracotta**

Specifically: TriageActionsBar's CTA button, TriageHero's region pill if it's currently tier-c-driven. The pain-severity slider color ramp STAYS reactive (data viz).

- [ ] **Step 5: Run tests + build**

Run: `cd frontend && npm test -- --run && npm run build`
Expected: 80/80 PASS, build clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/TriageTab.jsx frontend/src/components/TriageDiagnosis.jsx frontend/src/components/triage/
git commit -m "feat(triage): re-chrome on Surface + Eyebrow + RPG palette"
```

---

## Task 2: Recover + Rehab chrome pass

**Files:**
- Modify: `frontend/src/components/RecoverTab.jsx`
- Modify: `frontend/src/components/RecoverEmptyView.jsx`
- Modify: `frontend/src/components/RecoverActiveView.jsx`
- Modify: `frontend/src/components/RecoverExerciseCard.jsx`
- Modify: `frontend/src/components/RecoverStatusPills.jsx`
- Modify: `frontend/src/components/RehabTab.jsx`
- Modify: `frontend/src/components/RehabProtocol.jsx`

- [ ] **Step 1: Same Surface + Eyebrow + ct-cream pass as Task 1**

Apply identical patterns. RecoverExerciseCard's per-exercise tile should use `Surface tier="default"`. Status pills should use ct-moss for "active" / ct-cream/40 for "pending" rather than tier-c.

- [ ] **Step 2: RehabProtocol's step list**

The step rows should become flat `ct-surface-flat` rows (rounded-md) inside a default Surface.

- [ ] **Step 3: Tests + build**

Run: `cd frontend && npm test -- --run && npm run build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Recover*.jsx frontend/src/components/Rehab*.jsx
git commit -m "feat(recover): re-chrome Recover + Rehab on Surface + Eyebrow + RPG palette"
```

---

## Task 3: Body tab chrome pass (preserve region reactivity)

**Files:**
- Modify: `frontend/src/components/BodyTab.jsx`
- Modify: `frontend/src/components/BodyActiveView.jsx`
- Modify: `frontend/src/components/BodyExerciseCard.jsx`
- Modify: `frontend/src/components/BodyDiagram.jsx` (chrome ONLY — region colors must stay)

- [ ] **Step 1: Same Surface + Eyebrow + ct-cream pass**

- [ ] **Step 2: For BodyDiagram, only refresh the OUTER container chrome**

The SVG region fills MUST stay tier-c / severity-color reactive — those are data viz. Only the outer wrapper border/bg changes.

- [ ] **Step 3: Tests + build**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Body*.jsx
git commit -m "feat(body): re-chrome Body tab — region colors preserved"
```

---

## Task 4: Train tab outer chrome + hero card

**Files:**
- Modify: `frontend/src/components/TrainTab.jsx`
- Modify: `frontend/src/components/train/TrainHeader.jsx`
- Modify: `frontend/src/components/train/TrainHeroCard.jsx`
- Modify: `frontend/src/components/train/TrainPlanArcChip.jsx`
- Modify: `frontend/src/components/train/TrainStreakChip.jsx`
- Modify: `frontend/src/components/train/TrainNextUpRow.jsx`

- [ ] **Step 1: Header refresh**

`TrainHeader` becomes ct-cream typography; tier-badge stays tier-c-reactive (it's a tier indicator, that's data). PlanArcChip + StreakChip both move off tier-c to terracotta/moss respectively.

- [ ] **Step 2: TrainHeroCard becomes `<Surface tier="hero">`**

Same fix as ProgressTierHero — strip tier-dynamic gradient/border, let `ct-surface-hero` carry the look. Keep V-tier badge inside as tier-reactive.

- [ ] **Step 3: TrainNextUpRow chrome — Surface flat tier**

- [ ] **Step 4: Tests + build**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/TrainTab.jsx frontend/src/components/train/TrainHeader.jsx frontend/src/components/train/TrainHeroCard.jsx frontend/src/components/train/TrainPlanArcChip.jsx frontend/src/components/train/TrainStreakChip.jsx frontend/src/components/train/TrainNextUpRow.jsx
git commit -m "feat(train): re-chrome outer shell + hero card + chips on RPG palette"
```

---

## Task 5: Train calendar + month grid + week strip

**Files:**
- Modify: `frontend/src/components/train/TrainCalendar.jsx`
- Modify: `frontend/src/components/train/TrainMonthGrid.jsx`
- Modify: `frontend/src/components/train/TrainWeekStrip.jsx`
- Modify: `frontend/src/components/train/PlanArcSheet.jsx`

- [ ] **Step 1: Calendar cell chrome**

Day cells today use `bg-panel/border-outline`. Move to `ct-surface-flat` for unselected, `ct-surface` with a terracotta accent border for the selected day.

- [ ] **Step 2: PlanArcSheet — full chrome refresh, preserve drag-to-dismiss**

Same pattern as StyleMixSheet in Phase 3 (don't wrap in Surface — it's a full-screen modal with its own framing). Just refresh internal eyebrows + typography to ct-* tokens.

- [ ] **Step 3: Tests + build**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/train/TrainCalendar.jsx frontend/src/components/train/TrainMonthGrid.jsx frontend/src/components/train/TrainWeekStrip.jsx frontend/src/components/train/PlanArcSheet.jsx
git commit -m "feat(train): re-chrome calendar + month grid + plan arc sheet"
```

---

## Task 6: SessionDetailSheet + ExerciseTimer

**Files:**
- Modify: `frontend/src/components/train/SessionDetailSheet.jsx`
- Modify: `frontend/src/components/train/ExerciseTimer.jsx`

- [ ] **Step 1: SessionDetailSheet chrome — preserve "Log this session" CTA behavior**

DON'T wrap the outer modal in Surface — it's a sheet with its own framing (like StyleMixSheet). Refresh internal coach-note card, phase-list section labels, and exercise tile chrome to use ct-* tokens + Eyebrow.

The terminal "Log this session →" button (currently uses `var(--tier-c)` background): swap to `bg-ct-terracotta text-ct-cream` for consistency with Hub CTA.

- [ ] **Step 2: ExerciseTimer chrome — surface refresh**

Wrap the timer modal in Surface or refresh inline. The countdown digits stay large + bold. Start/Pause buttons move to terracotta.

- [ ] **Step 3: Tests + build**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/train/SessionDetailSheet.jsx frontend/src/components/train/ExerciseTimer.jsx
git commit -m "feat(train): re-chrome SessionDetailSheet + ExerciseTimer"
```

---

## Task 7: Chat tab chrome pass

**Files:**
- Modify: `frontend/src/components/ChatTab.jsx`
- Modify: `frontend/src/components/ChatPicker.jsx`
- Modify: `frontend/src/components/AIChatView.jsx`
- Modify: `frontend/src/components/CoachChat.jsx`
- Modify: `frontend/src/components/CoachChatView.jsx`
- Modify: `frontend/src/components/CoachInbox.jsx`
- Modify: `frontend/src/components/CoachInboxView.jsx`

- [ ] **Step 1: Chat tab outer + picker**

ChatPicker becomes `Surface tier="default"` with ct-cream typography. The user/coach selector pills use terracotta active state, ct-cream/60 idle.

- [ ] **Step 2: AIChatView + CoachChatView — message bubbles**

User bubbles: `ct-surface-flat` with terra-tint bg. Assistant bubbles: `ct-surface` (forest gradient). Keep avatar + role label intact.

- [ ] **Step 3: CoachInbox row tiles**

Each inbox row becomes a `ct-surface-flat` tile with terracotta unread dot if applicable.

- [ ] **Step 4: Tests + build**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ChatTab.jsx frontend/src/components/ChatPicker.jsx frontend/src/components/AIChatView.jsx frontend/src/components/CoachChat.jsx frontend/src/components/CoachChatView.jsx frontend/src/components/CoachInbox.jsx frontend/src/components/CoachInboxView.jsx
git commit -m "feat(chat): re-chrome Chat tab + AI + Coach views on RPG palette"
```

---

## Task 8: Phase 4 regression sweep + retro

- [ ] **Step 1: Full sweep**

Run: `cd frontend && npm test -- --run && npm run build`
Expected: 80/80 PASS, build clean.

- [ ] **Step 2: Append Phase 4 retro to spec**

Open `docs/superpowers/specs/2026-05-20-rpg-climber-design.md`. Add:

```markdown
## Phase 4 retrospective (added after implementation)

Phase 4 shipped on 2026-05-20 — N commits on `redesign/rpg-climber` since the Phase 4 plan, build green, M/M tests passing.

- [findings filled in by reviewer or implementer]
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-20-rpg-climber-design.md
git commit -m "docs(spec): Phase 4 retrospective stub"
```

---

## Critical invariants

- **No backend changes.** `src/triage.py`, `src/training.py`, `src/chat.py` untouched.
- **No behavior changes.** All routes, hooks, navigation, API calls, form submissions, save handlers preserved exactly.
- **Data-viz tier reactivity preserved.** BodyDiagram region colors, GradePyramid rows, TierBadge, tier indicators in TrainHeader/Hub continue to use `var(--tier-c)`. Only CHROME (panel bgs, borders, accent buttons) moves off tier theming.
- **Sheets stay sheets.** PlanArcSheet, SessionDetailSheet, StyleMixSheet, ExerciseTimer (if modal) are NOT wrapped in Surface — they have their own modal framing.
- **Auth/billing chrome OUT OF SCOPE for Phase 4** — that's Phase 6.
- All motion respects `prefers-reduced-motion`.

---

## Out of scope for Phase 4

- TierThemeProvider implementation (Phase 5).
- Auth modals, Landing, AccountMenu, Billing, Upgrade modal (Phase 6).
- ProfileSetup legacy chip references (Phase 6).
- Backend logic of any kind.
