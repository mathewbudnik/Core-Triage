# Grand Seiko Design System — Design Spec

**Date:** 2026-05-20
**Branch:** `redesign/grand-seiko` (off `main`)
**Status:** Approved direction, awaiting implementation plan

## 1. Context

The codebase has grown to ~80 React components across Hub, Progress, Triage, Recover, Train, Chat, and auth/billing/modal flows. The visual chrome has drifted: components inline arbitrary Tailwind values (`text-[15px]`, `bg-panel/40`, `shadow-[0_0_18px_rgba(20,184,166,0.25)]`), motion timings vary call-by-call (`duration: 0.22`, `0.18`, `0.32`, `0.4`), and surface treatments differ between hubs (`bg-panel`, `bg-panel/40`, `bg-panel2/40`). The semantic systems are solid (tier colors, hub accent colors, gradient sliders) but the chrome around them competes with them.

The product owner wants the app to read as "professional, like buying a Grand Seiko" — premium watch-dial precision, restrained chrome, one signature accent moment per screen, and gliding motion. The audience is climbers nursing real injuries through triage and progressing real grades through training. Credibility matters; the aesthetic must not skew game-y.

This spec defines a design system that layers the Grand Seiko aesthetic over the existing app structure. No feature is rebuilt. No semantic color system is removed. The chrome is unified, the typography is codified, the motion vocabulary is named, and a small set of primitive components forces consistency at the call site.

## 2. Goals

- **Visual consistency.** Every surface, every label, every display number reads from a shared vocabulary. No more ad-hoc Tailwind values.
- **Premium feel.** Zaratsu-polished surfaces, refined typography, warm-gold lume accent, gliding motion. Watch-dial discipline.
- **Motion as a first-class layer.** Route transitions, surface reveals, icon micro-animations — all using the same named timings and easings.
- **Preserve dynamic systems.** Tier-color reactivity, hub accent color-coding, gradient sliders, region-aware coloring — all untouched.
- **Mechanically migratable.** Replacing ad-hoc styling with primitives is grep-and-replace work, not redesign-per-component.

## 3. Non-goals

- Replacing or rebuilding any feature component (BodyDiagram, GradePyramidCard, SmartTriageCard, RehabProtocol, TrainingLogEntry, ProgressTierHero, AwardsStrip, etc. all keep their behavior and layout exactly).
- Changing the navigation IA (Hub / Recover / Train / Chat tabs stay).
- Renaming or removing existing color tokens (`accent`, `accent2`, `accent3`, tier tokens).
- Backend changes. This is frontend-only.
- A separate component library, Storybook, or design tokens package. Primitives live in the app and ship with it.

## 4. Architecture

Four layers, built in order:

1. **Token spine** — Tailwind config + CSS additions. New color palette (`gs.*`), refined type scale, motion timing constants, spacing scale enforcement.
2. **Motion vocabulary** — Single source of truth for durations, easings, and named transitions. Lives in `frontend/src/lib/motion.js`. Every Framer Motion call in the app consumes from this.
3. **Primitive components** — Eight small components in `frontend/src/components/ui/` that codify the look. Cannot be misused.
4. **Migration pass** — Phased rollout. Each visible component is touched once to replace ad-hoc styling with primitives. Preservation contract (Section 9) is enforced throughout.

The four layers are buildable as an incremental sequence — layer 1 enables layer 2 enables layer 3 enables layer 4. Each can ship in isolation and tested.

## 5. Aesthetic direction — Grand Seiko (variant D)

Locked from brainstorm review: warm-gold lume (`#e8b94e` / `#f4d086`), 400-weight display numbers, restrained surface texture. The "warm gold + medium weight + light texture" combo.

**The recipe:**
- **Surfaces.** Zaratsu-polished — top inset highlight (white at 0.04 alpha), bottom inset darken (black at 0.35 alpha), hairline border (white at 0.06 alpha), outer soft drop shadow. Linear gradient body (`gs.charcoal` → `gs.graphite`). Reads as carved steel, not flat material.
- **Type.** Six sizes, all using `Inter` (existing). Tabular numerals on every numeric display. Tiny labels are 0.32em-tracked uppercase; display numbers are 78px / 400 / -0.040em; ref marks are 0.22em-tracked uppercase.
- **Color.** Existing palette stays. Warm-gold lume is added as the *chrome* accent. Applied once per screen on a featured CTA, a divider sweep, or a featured stat that isn't already carrying tier semantics.
- **Motion.** Default ease: `cubic-bezier(0.40, 0, 0.20, 1)` ("spring drive"). Default duration: 380ms. No springs or overshoots except on the dedicated `icon-settle` interaction (110ms tiny overshoot).
- **Personality moments.** Reference number marks on hero surfaces (`REF · WK 21 · 2026`). Sweep indicator bars under display numbers (the Spring Drive analog). Optional barely-visible radial texture on hero surfaces (the "snowflake dial").

## 6. Token spine

### 6.1 Color tokens

Added to `frontend/tailwind.config.js` under `theme.extend.colors`:

```js
gs: {
  obsidian:    '#0a0e1a',                       // app background
  charcoal:    '#131a2a',                       // surface top
  graphite:    '#1a2235',                       // surface bottom
  text:        '#ecf1fb',                       // primary text
  'text-soft': '#b6c2db',                       // secondary text
  muted:       '#6b7896',                       // tertiary / labels
  hairline:    'rgba(232,238,252,0.06)',        // hairline borders
  rim:         'rgba(232,238,252,0.12)',        // stronger rim borders (CTAs)
  lume:        '#e8b94e',                       // warm gold accent
  'lume-soft': '#f4d086',                       // warm gold gradient end
}
```

Added to `frontend/tailwind.config.js` under `theme.extend.boxShadow`:

```js
'gs-surface':         '0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.35) inset, 0 12px 30px rgba(0,0,0,0.35)',
'gs-surface-hero':    '0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.35) inset, 0 22px 60px rgba(0,0,0,0.45)',
'gs-lume':            '0 0 8px rgba(232,185,78,0.45)',
```

Existing tokens are unchanged. `accent`, `accent2`, `accent3`, `bg`, `panel`, `text`, `muted`, `outline` all stay (used by legacy components and tier system).

### 6.2 Type scale

Added to `frontend/src/index.css` under `@layer components`:

```css
.gs-display     { font-size: 78px; font-weight: 400; letter-spacing: -0.040em; line-height: 0.95; font-variant-numeric: tabular-nums; }
.gs-display-sm  { font-size: 56px; font-weight: 400; letter-spacing: -0.038em; line-height: 0.95; font-variant-numeric: tabular-nums; }
.gs-stat        { font-size: 24px; font-weight: 500; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; }
.gs-eyebrow     { font-size: 10px; font-weight: 700; letter-spacing: 0.32em; text-transform: uppercase; color: theme(colors.gs.muted); }
.gs-ref         { font-size: 10px; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: theme(colors.gs.muted); font-variant-numeric: tabular-nums; }
.gs-title       { font-size: 15px; font-weight: 600; letter-spacing: -0.015em; color: theme(colors.gs.text); }
.gs-body-soft   { font-size: 13px; color: theme(colors.gs.text-soft); line-height: 1.55; }
.gs-tnum        { font-variant-numeric: tabular-nums; }
```

### 6.3 Spacing

Existing Tailwind 4px scale is canonical. `p-2 p-3 p-4 p-5 p-6 p-8 p-10` and same for `m-*`, `gap-*`. Arbitrary values (`p-[14px]`, `gap-2.5`, `mt-[18px]`) are removed during migration and rounded to the scale. Acceptable carveouts: dimensions tied to typography or icon sizes where the value is intentionally precise (e.g., `h-[18px]` for a 18px-tall bar matched to label line-height).

## 7. Motion vocabulary

New file `frontend/src/lib/motion.js`:

```js
export const DURATIONS = {
  glide: 0.38,   // default — surfaces, panels, hero stats
  micro: 0.18,   // hovers, chip activations, icon settle
  sweep: 0.60,   // long bar fills, counter sweeps
  pulse: 1.40,   // ambient loops (shimmer, breathing)
}

export const EASE = {
  spring_drive: [0.40, 0.00, 0.20, 1.00],  // default — pure glide
  decel:        [0.00, 0.00, 0.20, 1.00],  // entries
  accel:        [0.40, 0.00, 1.00, 1.00],  // exits
  settle:       [0.34, 1.56, 0.64, 1.00],  // tiny overshoot, ONLY for icon-settle interaction
}

export const TRANSITIONS = {
  surface_rise:    { duration: DURATIONS.glide, ease: EASE.decel },
  surface_exit:    { duration: DURATIONS.micro, ease: EASE.accel },
  number_count:    { duration: DURATIONS.sweep, ease: EASE.spring_drive },
  bar_fill:        { duration: DURATIONS.sweep, ease: EASE.spring_drive },
  icon_settle:     { duration: DURATIONS.micro, ease: EASE.settle },
  hover_lift:      { duration: DURATIONS.micro, ease: EASE.spring_drive },
  route:           { duration: DURATIONS.glide, ease: EASE.decel },
}

// Reduced-motion fallbacks — every TRANSITION above becomes { duration: 0 }
// when prefers-reduced-motion is set. Components consume via the
// useReducedMotion() hook + a small selector helper.
```

Every Framer Motion call in the app reads from these constants. Inline `duration:` and `ease:` arrays are removed during migration.

## 8. Primitive components

Lives in new directory `frontend/src/components/ui/`. Each primitive is small (under 100 lines), accepts only the props it needs, and codifies the aesthetic so call sites cannot drift.

### 8.1 `<Surface>`

```jsx
<Surface tier="elevated" padding="lg" className="...">…</Surface>
```

- `tier`: `'flat' | 'elevated' | 'hero'`
  - `flat`: solid `gs.charcoal`, hairline border, no inner shadow
  - `elevated`: charcoal→graphite gradient, hairline border, inset-top highlight + bottom darken, soft outer shadow (`shadow-gs-surface`)
  - `hero`: like `elevated` + barely-visible radial dial texture in warm-gold tint at top-right; deeper outer shadow (`shadow-gs-surface-hero`)
- `padding`: `'sm' | 'md' | 'lg' | 'xl'` → maps to `p-3 p-4 p-5 p-6`
- `rounded`: defaults to `rounded-2xl`; override allowed
- `as`: defaults to `div`; allow `as={motion.div}` so consumers can attach motion props
- Replaces every `bg-panel border border-outline rounded-xl p-*` pattern

### 8.2 `<Eyebrow>`

```jsx
<Eyebrow divider>This week · climbing</Eyebrow>
```

- Single component, single style (`.gs-eyebrow`)
- `divider` prop adds a bottom hairline border + padding-bottom for the watch-dial section break

### 8.3 `<DisplayNumber>`

```jsx
<DisplayNumber value={12.4} unit="Hours" size="lg" countOnMount />
```

- `size`: `'sm' | 'md' | 'lg'` → maps to `.gs-stat` (500 weight) / `.gs-display-sm` (400 weight) / `.gs-display` (400 weight). `sm` is heavier on purpose — at 24px, 500 weight stays readable on dense layouts where 400 reads anemic.
- `unit`: rendered inline, uppercase, 0.10em-tracked
- `countOnMount`: when true, animates from 0 → value over `TRANSITIONS.number_count`. Uses Framer Motion's `useMotionValue` + `useTransform` for the count.
- Always tabular nums

### 8.4 `<RefMark>`

```jsx
<RefMark>REF · WK 21 · 2026</RefMark>
<RefMark date={new Date()} />
```

- Renders 10px / 0.22em-tracked uppercase muted text
- When `date` prop is passed (Date object), auto-formats as `REF · WK ${ISOWeek} · ${year}`
- Children path lets consumers compose arbitrary `REF · ...` strings

### 8.5 `<LumeBar>`

```jsx
<LumeBar progress={0.62} animateOnMount />
```

- Horizontal 2px-tall bar, hairline background, warm-gold gradient fill
- `progress`: 0..1
- `animateOnMount`: width animates from 0 → `progress` over `TRANSITIONS.bar_fill`
- Used under display numbers in heroes; the Spring Drive analog

### 8.6 `<LumeChip>`

```jsx
<LumeChip>On track</LumeChip>
```

- Pill-shaped, warm-gold border on hairline-background tint, warm-gold text
- Used for the *one* accent moment per screen — never alongside another LumeChip in the same view
- Design guidance enforces "one per screen"; not enforced in code

### 8.7 `<AnimatedIcon>`

```jsx
<AnimatedIcon as={Stethoscope} interaction="hover-settle" size={20} />
```

- Wraps any `lucide-react` icon
- `interaction`:
  - `'hover-settle'`: scale 1.0 → 1.08 → 1.0 with `EASE.settle` on hover. Default for interactive icons.
  - `'draw-in'`: stroke-dasharray draw-in animation on mount over `TRANSITIONS.surface_rise`. Used on hero icons and tab icons (one per screen).
  - `'pulse-once'`: opacity + scale pulse, fires once when a `pulseToken` prop changes. For "look at this" moments (notification dots, achievement unlocks).
  - `'none'`: passthrough, no motion
- `size`: forwards to underlying lucide icon
- Always uses `currentColor` so consumers can wrap in colored containers

### 8.8 `<RouteTransition>`

Refactor of the existing route-transition wrapper in [App.jsx](frontend/src/App.jsx). No behavior change except:
- Uses `TRANSITIONS.route` instead of inline values
- Adds `prefers-reduced-motion` fallback (instant transition when set)
- Lives as its own primitive so other places (e.g., modal opens) can reuse the same animation profile

## 9. Preservation contract

**These systems are untouchable during the migration. No commit may modify their behavior or their semantic color output.**

| System | File(s) | Status |
|---|---|---|
| Tier color system (`TIER_TOKENS`, `vGradeToTier`, `ydsToTier`, `tokenForGrade`) | `src/lib/tier.js` | Untouched |
| Grade Pyramid tier-colored bars + gold flash overlay + hardest-grade callout | `src/components/GradePyramidCard.jsx` (data layer only — surface chrome changes) | Data layer untouched |
| Hub `ACCENT_CLASSES` per-tool color (teal/coral/gold/violet) | `src/data/hubTools.js` | Untouched |
| Hub tile color-coded accents (icon background, progress bar, dot) | `src/components/HubToolCard.jsx` and consumers | Accent colors untouched; only surface chrome migrates |
| Pain / intensity gradient sliders (teal→amber→coral) | `src/components/TrainingLogEntry.jsx`, `src/components/triage/SmartTriageCard.jsx` | Gradient logic and draggable pill geometry untouched |
| `ProgressTierHero` — live tier color from current PR | `src/components/ProgressTierHero.jsx` | Dynamic tier color untouched |
| `AwardsStrip` / `AwardMedal` tier badges | `src/components/AwardsStrip.jsx`, `src/components/AwardMedal.jsx` | Untouched |
| Body diagram region colors + pain-color slider sync | `src/components/BodyDiagram.jsx` | Untouched |
| `--tier-c` CSS variable reactivity in TrainingLogEntry | `src/components/TrainingLogEntry.jsx` | Untouched |
| Bottom-nav active-tab indicator tier color | Nav components | Untouched |
| Backend behavior of every API call | `src/api.js` and all `src/*.py` | Untouched |
| Triage classifier behavior | `src/triage.py` | Untouched |
| The `signalChips.js` chip→keyword contract | `src/data/signalChips.js` | Untouched |

**The rule that governs lume usage:**

> Warm-gold lume is the *chrome* accent. It appears once per screen on a featured CTA, a divider sweep, or a featured stat **that isn't already carrying tier semantics**. Wherever the tier system, the hub accent system, or the gradient slider system is doing semantic work, those colors win. Lume defers.

## 10. Migration plan (phased)

The plan is decomposed into seven phases. Each phase may ship as its own PR off `redesign/grand-seiko`, or several phases may bundle into one PR — the phasing exists to give shipping flexibility, not to mandate it. Phase 0 (Foundation) is mandatory before any other phase. Phase 1 (Hub) is recommended next because it's the highest-visibility surface; Phases 2-6 are independent of each other and may be ordered to taste.

**Phase 0 — Foundation.** Token spine (Section 6), motion vocabulary (Section 7), primitive components (Section 8). Zero visible app changes to production routes. Verification: an internal `/design-system` route (gated by `import.meta.env.DEV` so it doesn't ship to production builds) renders every primitive in isolation with sample data. No existing components migrated in this phase.

**Phase 1 — Hub migration.** Migrate `HubTab`, `HubToolCard`, `HubFeaturedCard`, `HubFeedCard`, `HubGreeting`, `HubProjectCard`, `HubRingsCard`, `HubStyleMixCard`, `HubTipCard`, `HubWeekStrip`, `HubPatterns`. Each component swaps ad-hoc `bg-panel*` + `border-outline` + `rounded-*` + `text-[*px]` for `<Surface>`, `<Eyebrow>`, `<DisplayNumber>`, `<RefMark>`. Hub accent system untouched per Section 9.

**Phase 2 — Progress migration.** `ProgressTab`, `ProgressTierHero`, `ProgressTrendGraph`, `GradePyramidCard`, `StyleMixSheet`, `AwardsStrip`. Pyramid bars, tier hero color, awards tier coloring all preserved.

**Phase 3 — Triage / Recover migration.** `TriageTab`, `SmartTriageCard` and its sub-components, `TriageDiagnosis`, `DiagnosisSkeleton`, `BodyTab`, `BodyActiveView`, `BodyEmptyView`, `BodyExerciseCard`, `RecoverTab`, `RecoverActiveView`, `RecoverEmptyView`, `RecoverExerciseCard`, `RecoverStatusPills`, `RehabProtocol`, `RehabTab`, `BodyDiagram` chrome (region colors untouched). Pain slider gradient preserved.

**Phase 4 — Train migration.** `TrainingLogEntry`, `ClimbLogSection`, `GradeCounterRow`, `SessionDetailSheet`, History sheet styling. Intensity slider gradient preserved.

**Phase 5 — Chat migration.** `ChatTab`, `ChatPicker`, `AIChatView`, `CoachChat`, `CoachChatView`, `CoachInbox`, `CoachInboxView`.

**Phase 6 — Auth / modals / landing migration.** `Landing`, `AboutTab`, `AccountMenu`, `AuthModal`, `DisplayNamePromptModal`, `PlausibilityConfirmModal`, `LegalModal`, `DisclaimerModal`, `BillingReturnPage`, `UpgradeModal`, `AvatarPickerModal`, `EmailVerificationBanner`, `SavedToHistoryBanner`, `Coachmark`, `CrashFallback`, `AvatarChip`, `Logo`. Marketing landing page gets a refined Grand Seiko hero.

**Cross-cutting (during every phase):**
- Replace every Framer Motion inline `transition={{ ... }}` with a `TRANSITIONS.*` reference
- Replace every lucide icon usage with `<AnimatedIcon as={...} interaction="...">`
- Round arbitrary spacing to the 4px scale per Section 6.3
- Remove `bg-panel/40`, `bg-panel2/40` and the variant tints in favor of `<Surface tier="...">`

## 11. Acceptance criteria

The implementation is complete when:

1. **No app file outside `src/components/ui/`, `src/lib/motion.js`, `src/index.css`, and `tailwind.config.js` defines colors, durations, easings, or font-sizes inline.** Audit via grep: zero matches for `text-\[[0-9]+px\]`, `duration: 0\.[0-9]+`, `ease: \[`, `bg-panel/[0-9]+`, `shadow-\[`, `text-\[#[0-9a-f]+\]` in non-primitive files.
2. **Every Framer Motion `transition` prop reads from the motion vocabulary.** Either it spreads a `TRANSITIONS.*` preset, or it composes from `DURATIONS.*` and `EASE.*` constants. Inline `duration: 0.X` numerics and inline `ease: [...]` arrays are disallowed outside `frontend/src/lib/motion.js`. Verified by grep — zero matches for `transition=\{\{[^}]*duration:\s*0\.` or `transition=\{\{[^}]*ease:\s*\[` outside the motion file.
3. **Every lucide-react icon import that renders an actual icon is wrapped in `<AnimatedIcon>`** (except inside primitive components themselves).
4. **The preservation contract holds.** Tier-color reactivity verified on Progress (change PR grade → tier hero recolors), TrainingLogEntry slider (verify intensity gradient unchanged), Hub tiles (verify per-tool accent colors unchanged).
5. **Reduced motion is respected.** With OS-level reduced motion enabled, every `TRANSITIONS.*` falls back to `{ duration: 0 }` and no springs/cascades play.
6. **Routes still transition.** Cross-tab navigation animates with the route transition profile (380ms fade-rise). In-tab sub-route changes do not re-trigger the global fade.
7. **Build and tests pass.** `npm run build` clean; existing component tests pass; new primitives have minimal smoke tests.

## 12. Risks and mitigations

- **Risk: visible regressions during migration.** Mitigation: each phase ships as its own PR with a screenshot diff before merge.
- **Risk: tier-color reactivity broken by accident during a migration commit.** Mitigation: preservation contract is explicit; reviewer for each phase confirms the contract holds.
- **Risk: 400-weight display reads light at small sizes.** Mitigation: `.gs-stat` is 500 weight (not 400) for the 24px size where weight readability matters most.
- **Risk: AnimatedIcon wrapping adds noticeable re-renders.** Mitigation: AnimatedIcon uses `React.memo` and only re-mounts when `interaction` or `pulseToken` changes. Validated under React DevTools profiler.
- **Risk: scope creep.** Mitigation: any "while we're in here" change outside the preservation contract or migration target is explicitly out of scope. Logged for a follow-up spec.
- **Risk: branch divergence with `main`.** Mitigation: `main` is rebased into the branch after each phase merges to the branch, so divergence stays small.

## 13. Open follow-ups (out of scope for this spec)

- A separate Storybook or component-library extraction (could come later if we want to share the design system with a marketing site).
- Sound design / haptics layer to match the motion vocabulary (out of scope; deferred to a separate spec).
- Light-mode support (the current app is dark-only; this spec is dark-only).
- Refactoring `ACCENT_CLASSES` into a smaller pattern (current shape is fine; not worth touching here).
