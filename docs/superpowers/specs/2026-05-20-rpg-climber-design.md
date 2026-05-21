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

### 5.1 Brand voice & identity

**North Star:** **Climb Clean.** Two words. Real climber vocabulary. Captures both the value (skill over force) and the literal climbing usage (clean send — no falls, no dabs, no rests). This is the app's mission in a phrase.

**Voice register:** veteran routesetter watching from the floor. Observational, brief, concrete. The voice notices *how* a climber moved, not just *that* they sent. Speaks like a setter saying "that was tight" or "clean send" after watching a project go down. Confident through restraint, never performing.

**Author:** implicit. The app's voice is the creator's (a 5-year veteran setter) but their name does NOT appear in the product. No "by Budnik" signature, no public author credit. The quality of being-set-by-a-veteran comes through in vocabulary, opinions, and tone — climbers feel it without being told.

**Vocabulary that's IN:** clean, tight, floated, send, beta, project, slabby, crimps, dab, sandbag, overhang, gaston, dyno, redpoint, flash, the throw, the crux, the feet, working a problem.

**Vocabulary that's OUT:** "line" (when meaning a problem — too forced), "quiet" (overused, reads zen), generic fitness words ("workout", "session" used loosely), AI-default phrasings ("Today's quest", "Welcome back, climber").

**Rules of writing:**
- **No exclamation marks.** Anywhere. Even on PRs.
- **No "CRUSHED IT" energy.** Setters don't yell when their problems go down.
- **No meditation/zen abstractions.** "Find your center" is not in this app's mouth.
- **No cheerleader voice.** "You got this!" "Amazing job!" are out.
- **Concrete over abstract.** "Work the feet" > "Focus on technique."
- **Brief.** One observation per moment. Setters say "tight" not paragraphs.
- **Empathy on off days, no toxic positivity.** "Bad days happen" — not "every climb is progress!"
- **Climber humor when it earns its place.** "Sandbag yourself." (push quest)
- **Confidence through restraint.** Quiet over loud, always.

**Worked examples** (concrete instead of abstract):

| Generic / AI-y | In-voice |
|---|---|
| "Welcome back, Mathew!" | "Welcome back." |
| "Today's Quest" | "TODAY · SEND" |
| "Try a slab problem. You're light on Mobility (3)." | "Find something slabby. Work the feet." |
| "Personal best: 28 days" | "Best run: 28. Don't break it." |
| "21 day streak" | "21 day flow." |
| "Level up! You've reached Level 15!" | "Lv 15. Keep moving." |
| "Congratulations on your first V6!" | "Clean send. V6." or "Floated it. First V6." |
| "Nothing logged yet — start tracking your climbs!" | "Nothing logged. Send something." |
| "Quest complete! +50 XP" | "Tight. +50 XP." |
| "You haven't trained mobility in 7 days — keep it up!" | "Hips need it. You've been skipping." |

Every consumer of copy — quests.js, celebrations, empty states, hub headers, future feature components in Phase 1+ — inherits this voice. If a string sounds like a meditation app, a cheerleader, or a brand consultant wrote it: it's wrong. If it sounds like a setter making a brief observation from the floor: keep it.

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

## Phase 0 retrospective (added after implementation)

Phase 0 shipped clean on 2026-05-20 — 23 commits on `redesign/rpg-climber`, build green, all 35 tests passing, preservation contract held (zero existing feature components modified). Findings to inform Phase 1 planning:

- **`SCALE_FACTOR` in `stats.js` was tuned 4 → 10 during implementation.** Plan specified 4, but a single send under that value rounded all axes to 0 (`3/30 × 4 = 0.4 → 0`), making the "crimpy > power after one crimpy send" assertion fail. The spec explicitly notes this as a tuning constant (§8.3), and 10 produces sensible early-game progression (1 send → 1 stat unit, 50 sends/day → clamped at 10). Worth re-tuning empirically once Phase 1 ships and we have real session-volume data.
- **`xp.test.js` had a stylePrimary key mismatch caught by code review.** Tests passed `stylePrimary: 'power'` but the chip key is `'powerful'` (the only chip whose name differs from its axis). The tests still passed via the missing-key guard returning 1.0 (coincidentally correct for the non-weakness case). Fix committed at `af0c4c4` exercises the real code path. Lesson: when a chip→axis mapping has any non-identity entries, tests must use the exact chip key.
- **Tailwind namespace collision with the scrapped Grand Seiko spec.** Initial draft used `gs.*` tokens (Grand Seiko); the older spec on main still references those. Renamed to `ct.*` (CoreTriage) to match existing `ct-shimmer`, `ct_last_triage_v1` conventions and avoid confusion. Future namespacing should pick a unique prefix when older specs remain visible on main.
- **LottieFiles is hostile to direct scraping** — both preview pages and CDN return 403 to non-browser requests. Phase 0 ships SVG fallbacks for celebration moments; the `frontend/public/lottie/` README documents which files to grab manually. Worth a one-time browser session to pull 4-5 animations before Phase 1's celebration moments need them.
- **Vitest setup was smooth.** Single dev-dep install, two npm scripts, a four-line vite.config.js block. The Node environment is sufficient for the pure-logic reward engine; we'll need jsdom or happy-dom later if we want to test components.
- **Code-quality reviewer occasionally flags stylistic preferences as "needs changes."** Twice during Phase 0 the reviewer pushed back on the plan's intentional formatting choices (table-aligned color values, single-line CSS rules). These are deliberate spec-level decisions, not implementer errors. Worth pre-empting in the implementer prompts for Phase 1 by noting "the plan specifies the format; reviewer should not push back on that."
- **The dev-only `/design-system` route works as designed.** `import.meta.env.DEV` tree-shakes the route registration; the chunk file (15.68 kB / 4.85 kB gzip) still emits but is unreachable from production code (verified via grep on `dist/index.html`).

## Phase 1 retrospective (added after implementation)

Phase 1 shipped on 2026-05-20 — 17 commits on `redesign/rpg-climber` since the Phase 1 plan, build green, 62/62 tests passing, preservation contract held (no existing feature components modified in behavior; only HubTab restructured + TrainingLogEntry got an additive engine side effect).

- **Stat radar semantics shifted cleanly.** `deriveStatShape` rewrote from 30-day rolling mean to max-V-grade-per-style with V10+ cap and null axes for "no sends yet" — climbers see "V6" in the radar instead of an abstract 0-10 number. The XP formula in `xp.js` and quest generation in `quests.js` continued to work without modification because they only consume the shape's relative ordering, not its scale.
- **The plan referenced `AnimatedIcon` which doesn't exist in this branch's primitive set.** AnimatedIcon was a Grand Seiko Phase 0 primitive that didn't carry over to RPG Phase 0's 11 primitives. The Task 14 implementer correctly skipped the wrapper and used raw lucide icons. If we want hover-settle animations on Hub tiles in Phase 2, we'd need to first build AnimatedIcon.
- **`form.climbs` shape required real discovery during Task 17.** The plan assumed a simple array; reality is a two-level dict `{ boulder?: { [grade]: { s, f, p } }, route?: { ... } }` where `s`=sends, `f`=flashes, `p`=projects. The implementer walked this structure correctly. Style chip lives in `localStorage['ct_climb_style']` as ClimbLogSection-local state — that integration boundary is fragile and worth formalizing in Phase 2 (Logging UX) when we introduce `<LogSendQuick>`.
- **`useHubData` is now the source of truth for both `styleProfile` and `currentProject`.** This required passing `user` from App.jsx → HubTab → HubHero / HubProjectTile. Two existing concerns were dropped from the new HubTab (`useHubTip`, the wrapper TierThemeRoot, and the StyleMixSheet drill-in modal). The tip rotator was redundant with the QuestCard's "why" line (setter voice); TierThemeRoot was only wrapping the old Hub; StyleMixSheet's drill-in is deferred to a later phase if we want it back.
- **Reward-engine state lives in localStorage at `ct_reward_engine_v1`** with versioned schema. Climbers wipe to Level 1 on first open of the new Hub (per user direction) since the key is new and previously empty. The schema version field gives us a clean migration path if the shape ever changes.
- **Multi-send celebration prioritization** — Task 17's implementation tracks the LAST `xpEarned > 0` events and celebrates either its leveledUp or isPersonalRecord. In a multi-send session where an earlier climb levels up and a later climb is a PR, the level-up celebration is silently dropped. Edge case; non-blocking; worth refining in Phase 2 (per-send celebrations or a "session summary" overlay).
- **`currentProject` from useHubData is heuristic-derived** (no user-entered name; defaults to "Current project"). HubProjectTile renders this cleanly but the experience would be richer once the climber can name a project explicitly. Worth a follow-up.

## Phase 2 retrospective (added after implementation)

Phase 2 shipped on 2026-05-20 — 13 commits on `redesign/rpg-climber` since the Phase 2 plan, build green, 75/75 tests passing.

- **The 4-chip vs 5-chip taxonomy divergence was a latent Phase 0/1 bug.** Discovered during plan research: `lib/styleColors.js` shipped with the legacy 4-chip vocab (`power, dynamic, technical, endurance`) while the RPG engine in `xp.js`/`stats.js` expected the spec-§7.3 5-chip vocab (`powerful, crimpy, dynamic, technical, mobility`). The chip-to-axis lookup silently degraded to `undefined`, the gap multiplier always returned 1.0, and the stat radar never saw "power" or "endurance" sends. Tasks 1–5 reconciled this with a migration shim (`lib/styleStore.js`) that promotes old localStorage values on first read. Worth pre-checking on every primitive layer in future phases — `xp.test.js`'s stylePrimary mismatch flagged in Phase 0 was a leading indicator that the vocabulary hadn't fully migrated.
- **`sendPreview.js` had to mirror engine semantics exactly to be useful.** First implementer pass treated fresh climbers as "no PR" and used `null` for `climberStatShape`. The engine actually treats every first-time send as a PR (`!state.sends.some(...)` on `[]` is true) and always passes `deriveStatShape(state.sends)` (which is `NULL_SHAPE` for fresh climbers, giving gap=1.5). Preview drifted by ~2.2x. Fixed in commit `5269f6d`. Lesson: preview helpers must consume the exact same code path the engine does, not approximations.
- **`styleProfile.js` had hardcoded 4-chip objects** (`{ power: 0, dynamic: 0, technical: 0, endurance: 0 }`) used as accumulators. After Task 1's vocabulary widening, iterating `STYLE_ORDER` would write to `counts[s]` where `s='powerful'` — but the starting object's `counts.powerful` is `undefined`, so `counts.powerful += value` produced `NaN`. No test covered this. Fixed in Task 13 by initializing both `counts` and `pct` as `Object.fromEntries(STYLE_ORDER.map((s) => [s, 0]))`. Adding a `styleProfile.test.js` is a worthwhile follow-up.
- **`ProfileSetup.jsx` still references the legacy `'power'`/`'endurance'` chip values** in its onboarding select options (lines 37-38, 280). Not user-blocking — `styleStore`'s migration shim promotes anything stored as `'power'` to `'powerful'` on read — but the labels and select values are visibly stale. Deferred to Phase 6 (Auth / modals / landing re-chrome).
- **`grades_sent` text field removed from Train UI.** Task 11 implementer noticed it was a free-text grade input that Quick + Deep modes superseded. The form field stays at `''` in the payload (backend tolerates), but if backend code reads `grades_sent` for any side effect, that path is now dead. Worth a grep on the backend before Phase 4.
- **Inline self-review beats subagent review for trivial mechanical tasks.** Phase 0 retrospective predicted that code-quality reviewers would flag intentional spec-level decisions; this happened on Task 1 (color-name comments). For Tasks 2 and onward I verified compliance inline by reading the diff directly — faster, no false positives, and the only meaningful issue (sendPreview semantics divergence in Task 6) I caught myself by reading the implementer's commit before the reviewer would have.
- **AnimatedIcon was deferred again** — Phase 1 retro noted it for hover-settle on Hub tiles. Phase 2 didn't need it (Quick chips use Framer's `whileTap` directly), so still deferred to Phase 4 if needed.
- **Final-review catch: SessionSummaryOverlay never rendered in v1 of Task 11.** `performSave` called `onSave?.()` synchronously before the async API call, which unmounted the form. The summary's `setSummaryOpen(true)` then fired on an unmounted component. Fixed in commit `b2d1f29` by lifting `onSave?.()` to the overlay's own dismiss button (and only firing early when there's nothing to celebrate). Side effect: the modal now stays mounted 1–3s longer during the API call. Acceptable because that's the celebration moment we're shipping. Same final review also caught: Quick-mode sends weren't being merged into the API payload (spec invariant violation — backend never saw them), `LogSendDeep` previews were missing `isDeepLog: true` (20% underestimate), `LogSendDeep` ignored style chip changes inside `ClimbLogSection` (stale total until next counter tap), and `defaultTab` had been silently dropped. All fixed in the same commit.
- **Known divergence: PR semantics differ between preview and engine.** The engine treats every first-time `(grade, style)` pair as a PR (`!state.sends.some(s => s.gradeNum === gradeNum && s.stylePrimary === style)`). The preview can't reproduce this exactly without the full sends list — it has access only to `bestPerStyle`, so it uses "grade > best" (a new high watermark in that style). For a climber whose best in style `powerful` is V5, logging V3 powerful for the first time: engine awards PR×1.5, preview shows no PR (~33% underestimate for that one send). Acceptable for v1 because the surprise is positive (climber gets more XP than promised), and the design intent of the preview is "set the climber's expectation" not "lock in exact award." If we want exact parity, factor the engine's PR check into a pure helper and call it from both sides.
- **Minor punch-list deferred to Phase 4 chrome pass.** GradeCounterRow's `EMPTY_STYLES` still hardcodes the 4-key shape (transient mixed-shape on first counter increment, normalized to 5 keys on next read — no crash); LogSendQuick's grade picker is V-grades only regardless of session type; plausibility check still walks `form.climbs` only (Quick sends bypass it server-side now that they're merged into the API payload, but local check still ignores them); pending-send `×` button lacks `aria-label`. None block Phase 2.

## Phase 3 retrospective (added after implementation)

Phase 3 shipped on 2026-05-20 — 8 commits on `redesign/rpg-climber` since the Phase 3 plan, build green, 80/80 tests passing.

- **Task 2 was a no-op when planned.** Plan called for adding `xpEarned` to `sendRecord` in `addSend`. On inspection that field was already there (committed earlier in Phase 1 or 2). Marked complete without a commit. Worth pre-reading consumer-state before scheduling tiny migration tasks — saves a dispatch round.
- **`<Surface>` `overflow-hidden` clips child horizontal scrolls.** `AwardsStrip`'s award carousel uses `overflow-x-auto` and its scrollbar/edge fade was being clipped by Surface's enforced `overflow-hidden`. Fix was `className="!overflow-visible"` on the Surface, but this suggests Surface should probably grow a `clip` prop in Phase 4 if other panels hit the same issue.
- **`ct-display` is too big for bottom-sheet headings.** Used it for `StyleMixSheet`'s "Last 30 days" — was visibly disproportionate inside a constrained sheet. Reverted to inline `text-[19px] font-extrabold` for that specific surface. Worth introducing a `ct-title` or `ct-display-sm` typography token before more sheet/modal surfaces are re-skinned.
- **Inline implementation beat subagent dispatch for Tasks 6–9.** Four sequential surface-wrap edits (`AwardsStrip`, `ProgressTrendGraph`, `StyleMixSheet`, `ProgressTab`) were near-identical mechanical patterns. Doing them inline with `Edit` was faster than four subagent dispatches and didn't pollute context — total diff for all four was 17 lines.
- **`StyleMixSheet` did NOT need a Surface wrap.** It's a full-screen modal with its own backdrop and positioning — wrapping it would have broken the drag-to-dismiss / ESC handler / backdrop-click path. Touched only the typography inside the sheet. Reviewer confirmed all sheet behavior intact.
- **`ProgressTrendGraph` eyebrow now reads "Last 8 weeks · climbing volume"** but the underlying `buildWeeks` only walks `climbs.boulder` — routes aren't counted. Pre-existing data-scope limitation that the new copy makes more visible. Worth either expanding buildWeeks to include routes or tightening the label to "boulder volume" in Phase 4 chrome pass.
- **`StatTrends7Day` reads `useRewardEngine()` independently of `<TrainingLogEntry>`'s instance.** Both call the same hook but get separate local state objects backed by the same localStorage. Since `StatTrends7Day` only reads `state` (never `logSend`), there's no double-write or sync issue — but if a future panel ever mutated engine state from Progress, we'd need a context-shared instance.

## Phase 4 retrospective (added after implementation)

Phase 4 shipped on 2026-05-20 — 7 commits on `redesign/rpg-climber` since the Phase 4 plan, build green, 80/80 tests passing. ~35 files modified across 4 tabs (Triage, Recover, Body, Train, Chat).

- **The "competing palette" fix from Phase 3's ProgressTab generalized cleanly.** Every tab had at least one surface using `var(--tier-c)` for chrome (panel bg, button accent) — stripping those and letting `<Surface>`'s default tier-* classes carry, plus swapping CTAs to `ct-terracotta`, produced visual coherence across the whole app without losing the tier indicators that genuinely convey meaning (TrainHeader's tier badge, BodyDiagram region fills, GradePyramid rows).
- **Body tab files (BodyTab/BodyActiveView/BodyExerciseCard) no longer exist.** Phase 4 plan listed them because the initial git status showed them as Modified. On inspection they'd been deleted in some earlier RPG-phase commit; the `/body/*` route redirects to `/recover` and the Rehab pair (`RehabTab`/`RehabProtocol`) replaced their function. BodyDiagram is the only Body* surface left. Worth pruning the spec's §10 preservation contract reference to BodyTab next time we touch it.
- **Three sheet/modal components correctly weren't wrapped in Surface.** PlanArcSheet, SessionDetailSheet, StyleMixSheet (Phase 3), ExerciseTimer (turns out to be embedded, not modal) — each has its own framing. The implementer agents identified this distinction reliably without needing repeated guidance.
- **Inline subtle inline styles for data-viz had to be left alone repeatedly.** BodyDiagram region fills (`#FF4444`/`#CC3333`/`#C8A84B` for severity), PainSlider gradient (`#10b981` to `#f59e0b` to `#ef4444`), TrainHeader tier badge, StreakChip's gold fire palette — all kept their inline `style.fill` / `style.background` because the color IS the data. Each task prompt called this out explicitly and it worked.
- **`text-text/N` and `text-muted/N` opacity fractions had no clean 1:1 mapping** — `text-text/40` mapped to `text-ct-cream/30`, `text-muted/70` mapped to `text-ct-cream/50`. The mapping was contextual (preserving relative contrast hierarchy). Documenting these tokens in `index.css` with a canonical mapping for next phases would speed things up.
- **TrainStreakChip needed zero changes.** Already used gold/fire palette which is a separate "streak" indicator language, not the chrome palette. Worth a one-liner in the spec acknowledging this is intentional (separate identity for streak rewards vs grade tiers vs RPG chrome).
- **Several files had Surface imported but not directly used after conversion** (AIChatView, CoachInbox) because user/assistant bubbles needed inline `bg-ct-terra-tint` classes rather than full Surface wraps. The import is harmless but not strictly necessary. Cleanup opportunity for the next sweep.

## Phase 5 retrospective (added after implementation)

Phase 5 shipped on 2026-05-20 — 2 commits on `redesign/rpg-climber` since the Phase 5 plan, build green, 80/80 tests passing.

**Scope reduction documented:** spec §11 called for per-tier app-wide chrome themes ("Frost"/"Slatehold"/"Ember"/"Phoenix" palettes swapping the entire chrome layer on tier promotion). User explicitly chose a unified RPG palette during Phase 3 ("top stack only") and Phase 4 (whole-app chrome unification). Per-tier chrome theming was DELIBERATELY deferred.

What shipped:
- `<TierThemeProvider>` extended (not rewritten — the Phase 0 stub already existed with a `themeKey/setThemeKey/CSS-var` machinery). Now also accepts a `tier` prop and exposes `{ tier, tierTokens, tierName }` via the same context. Legacy consumers (DesignSystem) keep working without changes.
- Provider wired at App root inside the authenticated route tree. Any descendant of any tab can `useTierTheme()` to read the climber's current working tier without prop drilling.
- `TierPromotionTakeover` copy refresh to setter voice. The tier-colored radial splash itself stays unchanged — that's a celebration moment where the tier color IS the data being revealed, not chrome.

What did NOT ship (deferred):
- Per-tier CSS variable swap on chrome surfaces — would undo Phases 3 + 4 palette unification.
- A "themes unlocked" picker UI — deferred indefinitely.
- Tier-themed celebration sound effects.

**Naming clash hazard noted:** there are now TWO `useTierTheme` hooks in the codebase — one in `components/ui/TierThemeProvider.jsx` (no args, returns the context value) and one in `hooks/useTierTheme.js` (takes a `hardest` arg, returns `{ tokens }` — used by `TierThemeRoot`). They have unrelated APIs. Calling code disambiguates via import path. Worth renaming the older one to `useTierTokens(hardest)` next time we touch it — the name better reflects what it does.

**No subagent dispatches needed for Phase 5.** All three tasks were small enough to execute inline without polluting the parent agent's context. Single commit covered all the implementation.

## Phase 6 retrospective (added after implementation)

Phase 6 shipped on 2026-05-20 — 4 commits on `redesign/rpg-climber` since the Phase 6 plan, build green, 80/80 tests passing. ~18 files modified.

- **Guardrails held cleanly.** `BillingReturnPage.jsx` was NOT modified (`git diff` confirmed 0 lines). AuthModal's auth submit handlers (`authLogin`, `authRegister`), session storage writes, OAuth flows, magic-link triggers, success redirects — all preserved exactly. Only CSS classes and inline styles moved. The strict separation between chrome and behavior worked.
- **`Logo.jsx` was a no-op.** It's a plain `<img src="/logo.png">` with no palette tokens. Implementer correctly skipped it and noted the skip — no false commit was made.
- **TipCard's multi-color rotating tips got flattened to one terracotta color.** Pre-Phase 6, each tip had its own accent (teal / amber / coral / violet). Phase 6 collapsed these to a single `ct-terra-soft` for visual coherence. This loses some category differentiation — worth revisiting if users want categorical color cues back. Captured as a follow-up.
- **Coachmark's arrow border** needed inline-style override because Tailwind doesn't have a `border-l-ct-terracotta/40` shorthand for the triangle CSS-border trick. Set via `style={{ borderRightColor: 'rgba(217,119,87,0.40)' }}`. Worked, but slightly inconsistent with the rest of the file. Acceptable.
- **TrialStatusBanner's per-state semantic colors preserved.** Active = ct-terracotta (was teal). Expired = red-400 (was already red). Expiring soon = amber. Implementer correctly recognized these are status indicators, not chrome, and only refreshed the surrounding surface.
- **AwardUnlockToast removed an inline backdrop-blur** in favor of class-based blur. Visually identical, cleaner code.
- **`btn-primary` and `btn-secondary` class references** existed throughout the auth + identity modals and got replaced with explicit `bg-ct-terracotta` / `bg-ct-hairline` patterns. These two utility classes are still defined in `index.css` (or wherever — they might be defined now but only used in non-RPG-touched code). Worth a follow-up grep to see if any consumers remain and either fix-up or delete the classes.
- **`AboutTab.jsx` had a hero-gradient that was previously coral-toned** (#ff7a3d → #fbbf24 → #f0f5ed). Phase 6 unified it to terracotta (#d97757 → #f0a875 → #f0f5ed). The visual change is subtle (both warm), but the new palette is consistent with the rest of the app.
- **`PlausibilityConfirmModal`'s "Confirm" button had used `var(--tier-c)`** — confirming a high-grade send was being themed by the tier the user was reaching. Felt like a clever touch but inconsistent with the unified palette decision. Swapped to terracotta per spec direction.
- **AccountMenu correctly preserved the "Manage subscription" billing portal trigger.** `handleBilling()` calls `openBillingPortal()` from `api.js`. Implementer touched ONLY the CSS class on the button, not the handler. Verified clean.

Phase 6 closes out the chrome re-skin pass started in Phase 3. Hub, Progress, Triage, Recover, Train, Chat, Landing, Auth, Account, About — all now read as one design.

## Overnight wake-up summary (2026-05-20 → 2026-05-21)

Three phases shipped overnight: **Phase 4, Phase 5, Phase 6**. 27 commits on `redesign/rpg-climber` total. 80/80 tests passing, build clean throughout, no remote pushes, dev server not restarted. All guardrails respected.

**What you'll see on first open:**

- Hub and Progress: same as before bed (Phase 3 was already done).
- **Triage tab** → re-chromed (forest surface + terracotta accents). Smart card, region pills, action chips, severity slider all updated.
- **Recover + Rehab tabs** → re-chromed. Exercise cards, status pills, rehab protocol steps.
- **Body diagram** → outer chrome refreshed; region severity colors preserved as data viz.
- **Train tab** → re-chromed end-to-end. Header, hero card, plan-arc chip, streak chip, calendar, month grid, week strip, SessionDetailSheet, ExerciseTimer.
- **Chat tab** → re-chromed. AI view, Coach view, picker, inbox, message bubbles.
- **Auth modals** (sign-in, sign-up, display name, avatar, disclaimer, legal, plausibility) → re-chromed. **Auth behavior identical** — no functional changes.
- **Account menu** → re-chromed drawer with terracotta accents.
- **About tab** → re-chromed hero, feature cards, coach bio.
- **Landing page** → re-chromed marketing hero with terracotta CTAs.
- **Banners + toasts** (verification, trial, saved-to-history, award-unlock) → re-chromed.
- **Tier promotion celebration** → setter-voice copy: "You climbed clean into {name}. Keep moving."
- **TierThemeProvider** infrastructure available app-wide for future opt-in use.

**Things worth a look first thing:**

1. **Auth flow.** Open the app in an incognito window and try logging in. Chrome should look new (forest surface, terracotta button), behavior should be identical. If sign-in breaks, the issue is in commit `c38f73d` (Phase 6 Task 1) — revert that one commit to restore.
2. **`BillingReturnPage.jsx` was NOT modified** per guardrail. It'll look out of sync with the new chrome until you give the go-ahead.
3. **Landing page** got a real visual change (was previously coral-toned, now terracotta). Make sure the marketing read still lands the way you want.
4. **TipCard** lost its per-tip categorical colors (all terracotta now). If you wanted to keep the variety, that's a one-line revert.
5. **Two `useTierTheme` hooks** exist with different APIs (one in `hooks/`, one in `ui/TierThemeProvider.jsx`). Documented as a naming hazard in Phase 5 retro. Not blocking, but worth a future rename.

**Out of scope from spec (deliberate deferrals, all documented in retros):**

- Per-tier app-wide chrome themes (spec §11) — you chose unified palette in Phase 3/4 and stuck with it.
- BillingReturnPage chrome — guardrail.
- ProfileSetup's lingering 4-chip references — still on the Phase 6 follow-up list (it doesn't break anything; just visibly stale on that one surface).

**Run state when you wake up:**

- Backend (uvicorn) at http://localhost:8000 — STILL RUNNING (was already up; guardrail said don't restart).
- Frontend (vite) at http://localhost:5174 — STILL RUNNING.
- Both will hot-reload to the new state when you refresh the browser.
- Bearer-of-my-grace project still on :5173, untouched.

**Phases 4, 5, 6 commit list** (newest → oldest):

```
5f682e2 docs(spec): Phase 6 retrospective
2157fec feat(landing): re-chrome Landing + TipCard + Coachmark + CrashFallback
ad9cb5a feat(notify): re-chrome banners + AwardUnlockToast on RPG palette
f50e67f feat(account): re-chrome AccountMenu + About + Logo on RPG palette
c38f73d feat(auth): re-chrome auth + identity modals on RPG palette
7a2bd7a docs(plan): Phase 6 — auth/modals/landing re-chrome
babd113 docs(spec): Phase 5 retrospective
29eae65 feat(theme): Phase 5 — TierThemeProvider wired + promotion copy refresh
30329f3 docs(plan): Phase 5 — TierThemeProvider + tier-unlock celebration
fc84f5a docs(spec): Phase 4 retrospective
21eb555 feat(chat): re-chrome Chat tab + AI + Coach views on RPG palette
5859e22 feat(train): re-chrome SessionDetailSheet + ExerciseTimer
8ff7d6b feat(train): re-chrome calendar + month grid + plan arc sheet
4d9d5a2 feat(train): re-chrome outer shell + hero card + chips on RPG palette
e32dcc7 feat(body): re-chrome Body tab — region colors preserved
c8b6b74 feat(recover): re-chrome Recover + Rehab on Surface + Eyebrow + RPG palette
f78a9d6 feat(triage): re-chrome on Surface + Eyebrow + RPG palette
0930d73 docs(plan): Phase 4 — re-chrome Triage/Recover/Train/Chat tabs
```

Nothing pushed. Everything local on `redesign/rpg-climber`. You can `git reset --soft` any commit you want to redo.





