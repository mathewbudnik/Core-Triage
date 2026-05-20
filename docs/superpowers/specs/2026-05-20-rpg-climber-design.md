# RPG Climber — Design Spec

**Date:** 2026-05-20
**Branch:** `redesign/rpg-climber` (off `main`)
**Status:** Approved direction, awaiting implementation plan

## 1. Context

CoreTriage today is a climbing rehab + training tool. It works, but the engagement loop is flat — climbers log sessions, see history, and move on. Sends and training are visible in History but don't *feel* rewarding. The tier system (Frost → Phoenix) exists but only as a label.

The redesign layers an RPG-style reward engine on top of the existing app: XP per send, a single Climber Level, a five-axis stat tree (Power · Crimpy · Dynamic · Technical · Mobility), daily quests, level-up unlocks, and tier-themed visual identity. The mechanic that holds it together: **the app reads your stat shape and rewards you more for working your weaknesses.** Power climbers earn bonus XP for technical sends; technicians earn bonus XP for powerful problems. The game mechanic solves the real coaching problem of working weaknesses, which most climbers know they should do but don't because it's less fun.

The aesthetic shifts to outdoor-brand: forest green base, terracotta accents, cream type, clean borders, bold sans-serif. Patagonia × REI feel. No video-game UI, no Disney mascot, no cartoon. Adult-credible, but with visible progression and stats you actually get to play with. Audience is 15+.

**Critically:** this is a reward layer over a climbing tool, not a climbing game. Every existing feature (Triage, Recover, Train, Chat, Progress, BodyDiagram, GradePyramidCard, SmartTriageCard, TrainingLogEntry, AwardsStrip, ProgressTierHero) keeps working unchanged. The chrome gets re-skinned. The reward engine is added on top. The two are independently shippable.

## 2. Goals

- **Make climbing progression visibly rewarding.** Every send earns XP; every level-up means something; the stat shape evolves with what you do.
- **Coach through reward, not lecture.** Stat-gap multipliers make working weaknesses the most XP-efficient choice. The math does the coaching.
- **Cohesive aesthetic across the app.** Same chrome on Hub, Triage, Recover, Train, Chat, Progress. Patagonia outdoor-brand feel everywhere.
- **Preserve every existing feature.** No flow is rebuilt. No semantic color system is removed. The reward engine is additive.
- **15+ audience friendly.** Fun and gamey without being childish. Adult-credible without being austere.
- **Friction-free logging.** Default log is 4 taps (~5 seconds). Optional depth earns bonus XP.

## 3. Non-goals

- Replacing or rebuilding any feature component (BodyDiagram, GradePyramidCard, SmartTriageCard, TrainingLogEntry, RehabProtocol, AwardsStrip, ProgressTierHero, all keep behavior and layout).
- Changing the navigation IA (Hub / Recover / Train / Chat tabs stay).
- Removing existing semantic color systems (tier color reactivity in Progress, hub accent colors per tool, gradient sliders, region-aware coloring in BodyDiagram).
- Backend changes. This is frontend-only — the reward engine state lives client-side initially.
- A mascot character, boss-fight cinematics, class titles ("Rockhound" etc), GPS coordinates, topographic decorations, or any other costuming explored and rejected during brainstorm.
- Premium/microtransaction implementation. Deferred (out of scope for this spec).
- Social/friend feed/leaderboards. Deferred.

## 4. Architecture

Four layers, built in order:

1. **Token spine + motion vocabulary** — `ct-*`-style color tokens for the forest/terracotta/cream palette; CSS type scale; motion timing constants in `frontend/src/lib/motion.js`. Establishes the chrome.
2. **Reward engine state** — `frontend/src/lib/xp.js` (XP formula + level thresholds), `frontend/src/lib/stats.js` (style chip → stat increments mapping, stat shape derivation), `frontend/src/lib/quests.js` (quest generation + completion tracking). Client-side state in `localStorage` for v1; sync to backend in a later phase.
3. **Primitive components + RPG surfaces** — small UI primitives (`Surface`, `Eyebrow`, `StatRadar`, `LevelMeter`, `StreakEmblem`, `QuestCard`, `RewardPreview`, `LumeChip`) in `frontend/src/components/ui/`. Plus higher-level surfaces (`HubHero`, `ClimberCard`, `LogSendQuick`, `LogSendDeep`, `TierThemeProvider`).
4. **Migration pass** — every visible screen touched once to swap ad-hoc Tailwind for primitives, wire the reward engine into log flows, and apply the new aesthetic chrome. Preservation contract (§10) enforced throughout.

These layers are buildable as an incremental sequence. Each is independently testable.

## 5. Aesthetic direction — Outdoor Brand (Patagonia × REI)

Locked from brainstorm: forest green base, terracotta accents, cream type, clean borders, no glow, bold sans-serif (Inter).

**The recipe:**
- **Surfaces.** Linear gradient `ct-forest-deep → ct-forest-soft` (charcoal-y greens), hairline border (white at 6-10% alpha), no inset highlights or shadows. Flat-but-warm material. Reads as honest outdoor athletic chrome, not premium watch or video game.
- **Type.** Inter throughout. Bold 800 for titles, semibold 700 for chips/labels, regular 500 for body. Tabular numerals on every numeric display. Tiny labels are 0.22em-tracked uppercase.
- **Color.** Forest green chrome + terracotta (`#d97757`) primary accent + cream (`#f0f5ed`) text. Existing tier colors (teal, coral, gold, violet, the V-grade tier palette in `lib/tier.js`) stay in data only. Terracotta is the chrome accent — used for CTAs, active states, XP highlights, the level number.
- **Motion.** Default ease: `cubic-bezier(0.4, 0, 0.2, 1)`. Default duration: 320ms. Snappier than the Grand Seiko 380ms — feels more responsive for a daily-use tool. Springs are reserved for celebration moments (level-up, send-complete).
- **No decoration costuming.** No topographic contour lines, no GPS coordinates, no mascot, no class titles. The palette and type do the work; the chrome stays clean.

## 6. Token spine

### 6.1 Color tokens

Added to `frontend/tailwind.config.js` under `theme.extend.colors`:

```js
ct: {
  forest:        '#1c2520',                    // app background
  'forest-deep': '#243530',                    // surface top
  'forest-soft': '#1f2924',                    // surface bottom
  cream:         '#f0f5ed',                    // primary text
  'cream-soft':  '#c8d3c4',                    // secondary text
  moss:          '#95a698',                    // tertiary / labels / muted
  hairline:      'rgba(230,237,228,0.10)',     // hairline borders
  rim:           'rgba(230,237,228,0.18)',     // stronger rim borders
  terracotta:    '#d97757',                    // primary accent / CTAs
  'terra-soft':  '#f0a875',                    // accent gradient end / highlights
  'terra-tint':  'rgba(217,119,87,0.06)',      // tinted backgrounds
}
```

Existing tokens unchanged. `accent`, `accent2`, `accent3`, the V-grade tier color tokens from `frontend/src/lib/tier.js` — all stay (semantic, used in data viz).

### 6.2 Type scale

Added to `frontend/src/index.css` under `@layer components`:

```css
.ct-eyebrow    { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: theme(colors.ct.moss); }
.ct-title      { font-size: 15px; font-weight: 700; letter-spacing: -0.015em; color: theme(colors.ct.cream); }
.ct-display    { font-size: 36px; font-weight: 800; letter-spacing: -0.030em; line-height: 1; color: theme(colors.ct.terracotta); font-variant-numeric: tabular-nums; }
.ct-stat-num   { font-size: 24px; font-weight: 800; letter-spacing: -0.025em; color: theme(colors.ct.terracotta); font-variant-numeric: tabular-nums; }
.ct-body       { font-size: 13px; color: theme(colors.ct.cream); line-height: 1.5; }
.ct-body-soft  { font-size: 12px; color: theme(colors.ct.cream-soft); line-height: 1.55; }
.ct-meta       { font-size: 10px; color: theme(colors.ct.moss); letter-spacing: 0.05em; }
.ct-tnum       { font-variant-numeric: tabular-nums; }
```

Six core sizes. Replaces ad-hoc `text-[15px]`, `text-[11px]` etc. across the app.

### 6.3 Surface utility classes

```css
.ct-surface {
  @apply border border-ct-hairline rounded-lg;
  background-image: linear-gradient(180deg, theme(colors.ct.forest-deep) 0%, theme(colors.ct.forest-soft) 100%);
}

.ct-surface-hero {
  @apply ct-surface;
  background-image: linear-gradient(180deg, #2a3a34 0%, theme(colors.ct.forest-soft) 100%);
  border-color: rgba(217,119,87,0.20);
}

.ct-surface-flat {
  @apply border border-ct-hairline bg-ct-forest rounded-md;
}
```

### 6.4 Motion vocabulary

New file `frontend/src/lib/motion.js`:

```js
import { useReducedMotion } from 'framer-motion'

export const DURATIONS = {
  snap:  0.16,   // chip tap, hover
  glide: 0.32,   // surfaces, page transitions (default)
  sweep: 0.50,   // bar fills, counter sweeps
  celebrate: 0.80,  // level-up, send-celebrate moments
}

export const EASE = {
  out:    [0.40, 0.00, 0.20, 1.00],  // default
  spring: [0.34, 1.56, 0.64, 1.00],  // celebration overshoot
  decel:  [0.00, 0.00, 0.20, 1.00],  // entries
}

export const TRANSITIONS = {
  surface_rise: { duration: DURATIONS.glide, ease: EASE.decel },
  number_count: { duration: DURATIONS.sweep, ease: EASE.out },
  bar_fill:     { duration: DURATIONS.sweep, ease: EASE.out },
  chip_tap:     { duration: DURATIONS.snap,  ease: EASE.out },
  celebrate:    { duration: DURATIONS.celebrate, ease: EASE.spring },
  route:        { duration: DURATIONS.glide, ease: EASE.decel },
}

const INSTANT = { duration: 0 }

export function useReducedTransition(transition) {
  const shouldReduce = useReducedMotion()
  return shouldReduce ? INSTANT : transition
}
```

## 7. Reward engine

### 7.1 XP formula

```
sendXP = baseGradeXP(grade)
       × modalityMult(modality)
       × flashMult(outcome)
       × prMult(isPersonalRecord)
       × gapMult(stylePrimary, climberStatShape)
       × deepBonus(isDeepLog)
       + chainBonus(sessionPosition)
```

**Base XP per V-grade (boulder):**

| Grade | Base XP | Grade | Base XP |
|---|---|---|---|
| V0 | 10  | V6  | 130 |
| V1 | 20  | V7  | 180 |
| V2 | 35  | V8  | 240 |
| V3 | 55  | V9  | 310 |
| V4 | 80  | V10 | 400 |
| V5 | 105 | V11+ | 500 |

**For route grades (5.x):** same scaling, mapped via existing `ydsToTier()` to the V-grade equivalents in `frontend/src/lib/tier.js`.

**Multipliers:**

| Multiplier | Trigger | Value |
|---|---|---|
| `modalityMult` | system board | × 1.25 |
| `modalityMult` | indoor (default) | × 1.00 |
| `modalityMult` | outdoor | × 1.50 |
| `modalityMult` | competition | × 1.40 |
| `flashMult` | flash | × 2.00 |
| `flashMult` | redpoint | × 1.00 |
| `flashMult` | project (not sent) | × 0.10 (effort credit) |
| `prMult` | first time at this grade | × 1.50 |
| `prMult` | grade already ticked | × 1.00 |
| `gapMult` | style targets your weakest stat | × 1.50 |
| `gapMult` | style targets your second-weakest stat | × 1.20 |
| `gapMult` | style targets a non-weakness | × 1.00 |
| `deepBonus` | logged with deep 1-5 stat ratings | × 1.25 |
| `chainBonus` | additive | +5 XP per send in the session, capped at +30 |

**Numbers are v1 arbitrary.** They will be tuned post-launch based on real session data and target leveling cadence.

### 7.2 Level thresholds

XP-to-level curve uses a soft exponential:

```
xpForLevel(n) = floor(100 * n^1.45)
```

| Level | XP for next | Level | XP for next |
|---|---|---|---|
| 1 → 2 | 100 | 10 → 11 | 2,818 |
| 2 → 3 | 273 | 14 → 15 | 4,560 |
| 5 → 6 | 1,058 | 20 → 21 | 7,840 |

Approximate cadence: a regular climber (2-3 sessions/week, 6-8 sends/session averaging V3) reaches Level 5 in ~3 weeks, Level 14 in ~6 months. Tunable.

### 7.3 Stat increments per send

Each send increments stats based on its style classification. Mapping is centralized in `frontend/src/lib/stats.js`.

**Style chip → stat increment mapping (Quick log):**

```js
STYLE_CHIP_TO_STATS = {
  powerful:  { power: 3, crimpy: 1, dynamic: 1, technical: 0, mobility: 0 },
  crimpy:    { power: 1, crimpy: 3, dynamic: 0, technical: 1, mobility: 0 },
  dynamic:   { power: 1, crimpy: 0, dynamic: 3, technical: 1, mobility: 1 },
  technical: { power: 0, crimpy: 1, dynamic: 1, technical: 3, mobility: 1 },
  mobility:  { power: 0, crimpy: 0, dynamic: 1, technical: 1, mobility: 3 },
}
```

**Deep log (1-5 per axis):** climber sets each axis directly. Increments are computed from the deltas to the climber's current stat shape, scaled to avoid runaway.

**Stat shape (radar values):** 30-day rolling mean of style increments per axis, normalized to a 0-10 scale. Recomputed on every log.

### 7.4 Training XP

Training sessions also feed the Climber Level so a training-heavy week still feels like progress. Mapping by session type (from `TrainingLogEntry`'s `session_type`):

| Type | Base XP | Stat boost |
|---|---|---|
| hangboard | 60 | crimpy +2 |
| strength | 60 | power +2 |
| endurance | 50 | power +1 (closest proxy — endurance axis was scrapped) |
| mobility | 40 | mobility +2 |
| climbing | computed per-send (above) | per-send |
| rest | 10 | none (consistency reward) |

Duration multiplier: scaled mildly (0.8× under 30min, 1.0× 30-60min, 1.1× 60+ min).

## 8. Stat system

### 8.1 Five axes

1. **Power** — overhang, pull strength, body tension on small holds
2. **Crimpy** — finger strength on small edges
3. **Dynamic** — throws, deadpoints, paddle moves, parkour-y movement
4. **Technical** — footwork, balance, sequence reading, body positioning
5. **Mobility** — flexibility, range of motion, dropknee depth, high-step ability

### 8.2 Visualization

**v1:** Radar pentagon. Five axes, 0-10 each, terracotta-tinted fill on hairline grid.

**Future (deferred):** "Stat tree" — literal branching tree where each branch grows with the stat. Bigger investment; ships when we have design bandwidth to render it well. The data model behind the radar already supports rendering as a tree later — no migration cost.

### 8.3 Computation

Stat shape is recomputed client-side on every log. Algorithm:

```
for each axis:
  rolling30dayMean = sum(stylePoints[axis] across last 30 days) / 30
  normalized = clip(0, 10, rolling30dayMean * scaleFactor)
  stat[axis] = normalized
```

`scaleFactor` is tuned so an average climber sits around 4-5 across axes, with stronger axes pushing toward 7-8.

## 9. Quest system

### 9.1 Daily quests

One quest active at a time. Generated nightly at local midnight or first app open. Optional — climbers can skip.

**Quest pool:**

| Type | Example | XP | Trigger |
|---|---|---|---|
| Stat-gap | "Try a slab problem" (Mobility ↑) | +50 | When player's weakest stat ≤ 3 |
| Stat-gap | "Send 3 on crimps" (Crimpy ↑) | +75 | When Crimpy ≤ 4 |
| Volume | "Log 5 sends today" | +40 | Default fallback |
| Variety | "Log a session in 3 different styles" | +60 | When stat shape is asymmetric |
| Training | "Log a 20-min mobility session" | +50 | When no mobility training in 7 days |
| Push | "Send something one grade above your average" | +80 | When recent sends are all at-grade |
| Outdoor | "Log an outdoor session this week" | +120 | When no outdoor in 30 days |

Generation logic: 60% chance stat-gap, 30% chance variety/push/training, 10% chance volume fallback. Capped at one quest per day. Player can re-roll twice per week (later).

### 9.2 Weekly missions

Deferred to a later phase. Spec captures the concept but v1 ships daily quests only.

## 10. Preservation contract

**Untouchable during this redesign. No commit may modify their semantic behavior.**

| System | File(s) | Status |
|---|---|---|
| V-grade tier system (`TIER_TOKENS`, `vGradeToTier`, `ydsToTier`, `tokenForGrade`) | `src/lib/tier.js` | **Untouched.** Drives both the V-grade tier badge AND the tier-themed palette set (§11). |
| Grade Pyramid tier-colored bars + gold flash overlay | `src/components/GradePyramidCard.jsx` (data layer) | Data layer untouched; surface chrome re-skinned. |
| Hub `ACCENT_CLASSES` per-tool color (teal/coral/gold/violet) | `src/data/hubTools.js` | **Untouched.** Tool color-coding remains. |
| Pain / intensity gradient sliders (teal→amber→coral) | `TrainingLogEntry.jsx`, `SmartTriageCard.jsx` | Gradient logic and draggable pill geometry untouched. |
| `ProgressTierHero` — live tier color from current PR | `ProgressTierHero.jsx` | Dynamic tier color untouched; the tier hero block becomes the V-grade theme anchor. |
| `AwardsStrip` / `AwardMedal` tier badges | `AwardsStrip.jsx`, `AwardMedal.jsx` | Untouched. |
| Body diagram region colors + pain-color slider sync | `BodyDiagram.jsx` | Untouched. |
| Triage classifier + chip→keyword contract | `signalChips.js`, `src/triage.py` | Untouched. |
| Backend behavior of every API call | `src/api.js` and all `src/*.py` | Untouched. |
| Existing route IA + bottom nav | `App.jsx` | Tabs and structure unchanged; new RPG surfaces integrate inside existing tabs. |

## 11. Theme system (V-grade-tier unlocks)

Default theme is the forest/terracotta locked in §5. As a climber progresses through V-grade tiers (Frost → Slatehold → Ember → Phoenix), they unlock the matching tier theme as an optional skin.

| Tier | V-grade range | Theme palette (chrome only — data viz colors unchanged) |
|---|---|---|
| **Frost** | V0-V1 | cool blue base + ice white + steel accents |
| **Slatehold** | V2-V3 | gray base + stone + cool copper |
| **Ember** | V4-V5 | warm green + terracotta (← matches v1 default) |
| **Phoenix** | V6+ | black + fire gold + ember red |

**Mechanics:**
- Default at install is **Ember** (matches the v1 default chrome).
- New tier reached → tier theme unlocks. UI shows a one-time "New theme unlocked" celebration.
- Theme switching is in Settings; user can pick any unlocked theme any time.
- Themes are implemented as CSS variable swaps via `<TierThemeProvider>` reading from `localStorage`.
- Same `Surface` / `Eyebrow` / `LumeChip` / etc. primitives — only the underlying CSS variable values change per theme.

Premium / microtransaction themes (monochrome, neon, sandstone, etc.) are explicitly deferred.

## 12. Celebration moments

Triggered by:
- **PR sends** — first send at a grade
- **New-grade ticks** — first time at V-grade or beyond
- **Awards unlocked** — via existing award engine
- **Level-ups** — Climber Level transitions
- **New theme unlocked** — tier transition

**What it looks like (v1):**
- Brief overlay (~1.2 seconds) on the screen of action.
- Centered: a Lottie animation (file path conventions in `frontend/public/lottie/README.md`).
- Animation falls back to an SVG + Framer Motion equivalent if the Lottie file is missing.
- Below animation: terse copy ("V6 sent. +180 XP."  / "Level 15 — new quest tier unlocked.")
- Tap anywhere to dismiss; auto-dismiss after 2.5s.

**Animation slots:**
- `level-up.json` — level-up celebration
- `send-celebration.json` — PR / new-grade send
- `achievement-unlock.json` — award unlocked
- `streak-fire.json` — looping streak emblem on Hub
- `loading-climber.json` — optional themed loading state

## 13. Logging UX

### 13.1 Quick mode (default)

Four taps, ~5 seconds:

1. Pick climb name (text input, last-used pre-filled, optional)
2. Pick grade (V-chip row, V0-V11+)
3. Pick outcome (Flash / Redpoint / Project)
4. Pick one style chip (Powerful / Crimpy / Dynamic / Technical / Mobility)
5. Submit

Reward preview at the bottom shows computed XP with the multiplier breakdown ("V6 × flash × indoor → +180 XP") for transparency.

### 13.2 Deep mode (optional)

Activated by tapping "▾ DIAL IN STATS · +25% XP" expander below the style chips. Replaces the style chip step with a 1-5 rating row per axis (Power / Crimpy / Dynamic / Technical / Mobility). One tap per axis. Earns `deepBonus × 1.25`.

When the user expands from Quick to Deep, the deep ratings pre-fill from the selected style chip's `STYLE_CHIP_TO_STATS` profile so they're refining, not starting fresh.

### 13.3 Logging surface

`LogSendQuick` lives inside the existing `TrainingLogEntry` flow — added as a new entry point at the top of the log screen, doesn't replace the structured-form path (which stays for training sessions, non-climb activities, multi-send batch logs).

## 14. Hub layout (integrated)

Hub becomes the RPG-identity surface. From the brainstorm mockup:

1. **Hero panel** — greeting + climber name (left) + V-grade tier badge (right). Below: radar pentagon + Climber Level + XP-to-next bar + 5-axis stat strip.
2. **Streak panel** — current streak count + best, with a small fire glyph (Lottie when present, SVG fallback otherwise).
3. **Today's Quest** — one quest active, with terracotta border, multiplier callout, progress bar, "why this matters" coaching line.
4. **Tools grid** — Recover / Train / Ask coach as smaller tiles. They're tools you reach for, not the centerpiece.
5. **Recent sends** — last 3-5 sends with grade badge + name + XP earned per row.

Existing Hub tiles (`HubFeaturedCard`, `HubProjectCard`, `HubRingsCard`, etc.) are restyled but not removed. Some may be deprioritized (moved below the fold or behind a "more" expander) if the RPG layer fills the space; that's a design call during migration, not a spec mandate.

## 15. New components / primitives

In `frontend/src/components/ui/`:

- `<Surface>` — the outdoor-card. Three tiers (`flat`, `default`, `hero`). Replaces ad-hoc `bg-panel + border-outline` patterns.
- `<Eyebrow>` — wide-tracked uppercase label.
- `<LevelMeter>` — XP bar + numeric "620 / 1,000" + level number callout.
- `<StatRadar>` — pentagon SVG, takes a `{power, crimpy, dynamic, technical, mobility}` shape and renders the radar. Optional `previousShape` prop animates between values on shape change.
- `<StatStrip>` — horizontal 5-cell strip with axis labels + values. Compact alternative to radar.
- `<StreakEmblem>` — fire glyph + streak count + best. Lottie if available, SVG otherwise.
- `<QuestCard>` — daily quest with multiplier callout, progress bar, "why" line, completion celebration.
- `<RewardPreview>` — the multiplier-breakdown XP estimate shown in the log flow.
- `<TierBadge>` — pill with tier name + glow dot. Picks color from active tier theme.
- `<CelebrationOverlay>` — the 1.2s celebration moment surface; takes an animation slot + copy.
- `<LogSendQuick>` / `<LogSendDeep>` — the new logging UX surfaces.
- `<TierThemeProvider>` — context provider for the active theme; swaps CSS variables.

## 16. Migration plan (phased)

Decomposed into six phases. Each phase ships as its own PR off `redesign/rpg-climber`. Phases 0 and 1 are mandatory before any later phase.

**Phase 0 — Foundation.** Token spine (§6), motion vocabulary (§6.4), reward engine state (`xp.js`, `stats.js`, `quests.js`), primitive components (§15), dev-only `/design-system` showcase route. Zero visible app changes to production routes. Verified via the showcase.

**Phase 1 — Hub redesign + reward engine wiring.** New Hub layout (§14) becomes the default home screen. Reward engine begins tracking from existing send/training history. Onboarding for new climbers: V0 starts with all stats at 0; first 10 sends grow the radar visibly fast (early-game dopamine).

**Phase 2 — Logging UX.** `<LogSendQuick>` added to `TrainingLogEntry` flow as the primary entry. `<LogSendDeep>` accessible via expander. Reward preview shows computed XP. Stat increments and level XP fire on submit.

**Phase 3 — Progress redesign.** `ProgressTab`, `ProgressTierHero` (becomes the V-grade theme anchor), `GradePyramidCard` (chrome re-skin, data layer untouched), `StyleMixSheet`, `AwardsStrip`, new "Stat trends · 7 day" panel.

**Phase 4 — Triage / Recover / Train / Chat re-chrome.** `TriageTab`, `SmartTriageCard`, `TriageDiagnosis`, `BodyTab`, `BodyActiveView`, `RecoverTab`, `RecoverActiveView`, `RecoverExerciseCard`, `RehabProtocol`, `TrainingLogEntry`, `ClimbLogSection`, `SessionDetailSheet`, `ChatTab`, `ChatPicker`, `AIChatView`, `CoachChat`, `CoachInbox`. All chrome only; behavior unchanged. `Vaul` replaces existing modals/sheets where it improves the mobile feel.

**Phase 5 — Theme system + tier-unlocked themes.** `<TierThemeProvider>` introduced; CSS variable swap; tier-themed palettes (§11) ship; "Theme unlocked" celebration moment fires on first reaching a new tier.

**Phase 6 — Auth / modals / landing re-chrome.** `Landing`, `AboutTab`, `AccountMenu`, `AuthModal`, `DisplayNamePromptModal`, `PlausibilityConfirmModal`, `BillingReturnPage`, `UpgradeModal`, `AvatarPickerModal`, `EmailVerificationBanner`, `Coachmark`, `CrashFallback`, `Logo`. Marketing landing page gets a refined outdoor-brand hero.

## 17. Acceptance criteria

The implementation is complete when:

1. **No app file outside `src/components/ui/`, `src/lib/{motion,xp,stats,quests}.js`, `src/index.css`, and `tailwind.config.js` defines colors, durations, easings, or font-sizes inline.** Audit via grep: zero matches for `text-\[[0-9]+px\]`, `duration: 0\.[0-9]+`, `ease: \[`, `bg-panel/[0-9]+`, `shadow-\[`, in non-primitive files.
2. **Every Framer Motion `transition` prop reads from the motion vocabulary** — either spreads a `TRANSITIONS.*` preset or composes from `DURATIONS.*` and `EASE.*`.
3. **Reward engine works end-to-end.** Logging a send via Quick mode produces correct XP per the formula; level transitions fire the celebration overlay; stat shape updates in the radar; daily quests progress when their conditions are met.
4. **The preservation contract holds (§10).** Verified: tier-color reactivity on Progress, TrainingLogEntry slider intensity gradient, Hub per-tool accent colors, BodyDiagram region colors.
5. **Reduced motion is respected.** With OS-level reduced motion enabled, every `TRANSITIONS.*` falls back to `{ duration: 0 }` and celebration overlays render without animation.
6. **Build clean, no console errors on any route.** `npm run build` + smoke walk of Hub, Triage, Recover, Train, Chat, Progress.
7. **Themes switch correctly.** Switching from Ember → Frost in Settings recolors the chrome app-wide without breaking any data viz.

## 18. Risks and mitigations

- **Risk: visible regressions during the migration.** Mitigation: each phase ships as its own PR with screenshot diff before merge.
- **Risk: reward engine state corruption (localStorage-only in v1).** Mitigation: versioned localStorage schema with a one-way migration path; engine treats missing/corrupted state as "fresh climber" rather than crashing.
- **Risk: stat shape feels wrong at low session counts** (too volatile or too flat). Mitigation: scaleFactor tuning during Phase 1 with real data; designed to be a single-constant change in `stats.js`.
- **Risk: XP curve feels grindy or trivially easy.** Mitigation: numbers in §7 are explicitly arbitrary v1. Post-launch dashboard tracks median XP/week and time-to-Lv-10; tune the curve constant.
- **Risk: tier theme switching breaks existing tier-colored data viz.** Mitigation: §10 preservation contract — data viz reads from `lib/tier.js`, which is theme-independent. Themes only change chrome CSS variables; the tier color tokens used by GradePyramidCard etc. are untouched.
- **Risk: Lottie asset availability.** Mitigation: every celebration moment has an SVG + Framer Motion fallback in primitives. Missing Lottie files degrade gracefully.

## 19. Open follow-ups (out of scope for this spec)

- Weekly missions (deferred from §9)
- Premium / microtransaction themes (deferred from §11)
- Friend feed / social layer / leaderboards (deferred)
- Backend sync of XP/stat/quest state (currently localStorage-only)
- Deep stat sub-axes (e.g., Power → Static Power + Dynamic Power)
- Onboarding tutorial / first-time-user flow (Phase 1 has a minimal version; richer one is later)
- Light-mode support (dark only for v1, matches existing app)
- Achievements re-think — existing `AwardsStrip` keeps working but could grow into a richer collection later
