# CoreTriage · Identity System + Brand World Redesign

**Author:** brainstormed with the user
**Date:** 2026-06-05
**Status:** design locked, ready for implementation planning

## Context

CoreTriage has the features (movement analyzer, training rec, recover, profile, RPG climber) but doesn't have a *brand world*. Every surface uses commodity UI vocabulary (Tailwind defaults, lucide-react icons, soft shadows, rounded pills). The user described the feeling as "every AI app looks like this" — competitor parity in features is inevitable, so the moat has to be the visible product *identity*.

The single most differentiated thing already in the app is the **5-axis stat pentagon** (power · crimpy · dynamic · technical · mobility). It lives as a small card on the Hub. The redesign promotes it to the centerpiece of a data-driven identity system and rebuilds the surrounding chrome around a *field-log* brand world.

This spec is the full visual-language redesign — every primary surface gets touched. Not a Hub-only polish pass.

## The big idea

> Your pentagon is *who you are as a climber*. It evolves over months. The app names you, tracks your habit streak, and lets you export your identity as a shareable card.

Four data-driven surfaces stack into one identity story:

1. **Pentagon Morph Timeline** — your pentagon shape rendered at 6 points across the past year. You visibly watch yourself becoming a specific kind of climber.
2. **Identity Label** — a generated three-part phrase: `[STYLE] + [ARCHETYPE] + [PHASE]`. Example: *"Crimpy Crimper, mid-cave phase."* Style from dominant pentagon axis; archetype from overall shape; phase from last 5 sends.
3. **Streak Flame** — consecutive days with logged activity. Animated SVG flame, color escalates with longer streaks (warm → foil at 30+ days).
4. **Sharable Card** — Instagram-Story-format PNG export bundling all of the above. Auto-prompts on milestones. Year-end Wrapped rolls 12 cards into a story sequence.

All four are wrapped in a **gemstone tier system** — your apex grade unlocks tier-specific visual treatments (foil escalation on the pentagon, the label, the streak, the card). Top tier (Obsidian, V11+) unlocks app-wide dark mode.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Identity primitive | The pentagon — promoted from Hub-card to Hub-hero |
| Identity engine | Pentagon morph + identity label + streak flame + sharable card |
| Tier system | 12 gemstone ranks, one per V-grade (V0=Sandstone, V11+=Obsidian) |
| Tier representation | Wordmark + tier color + tier material treatment (no drawn icons) |
| Brand aesthetic | Field-log paper world + Fraunces serif + Caveat marginalia + forest/terracotta/foil palette |
| Iconography path | Climbing-culture motifs (chalk, shoe, quickdraw, etc.) sourced from game-icons.net (CC-BY 3.0) and recolored — NOT custom illustration. Replaces lucide-react across the app. |
| Voice | Observational, editorial, second-person — "The Cartographer" persona signs LLM-generated text |
| Lexicon | Settings → Provisions, Save → Pin to log, Cancel → Bail, Loading → Inking…, etc. |
| Out of scope | Audio / sound design, custom illustration commission, multiplayer/social, Year-2 backlog (page weathering, sub-personas, daily dispatch) |
| Trial gating | Inherits existing `user.subscription_state` model — no new gating logic |

## Brand world

### Palette

| Token | Hex | Role |
|---|---|---|
| `paper-base` | `#e8dcc4` | Page background — warm field-log paper |
| `paper-mid` | `#ddd0b3` | Secondary surface |
| `ink` | `#1a2620` | Primary text + outlines |
| `ink-soft` | `#2b3a32` | Body text |
| `ink-quiet` | `rgba(26,38,32,0.55)` | Meta / labels |
| `cream` | `#f4ecdf` | Inverse text (on dark) |
| `terracotta` | `#c75e3a` | Primary accent / CTA |
| `terra-deep` | `#a44a2a` | Deep accent / hover |
| `terra-tint` | `rgba(199,94,58,0.12)` | Surfaces, badges |
| `mint` | `#2da283` | Success / wins |
| `obs-foil` (gradient) | `#b88a3a → #c75e3a → #7a4a8e → #2f4ea8 → #b88a3a` | Prestige/grail accent |

Forest + terracotta + cream + mint stay as the working palette (already established in the codebase). Foil gradient is the new prestige addition — used sparingly for Obsidian tier and milestone moments.

### Typography

| Family | Source | Role |
|---|---|---|
| **Fraunces** (display serif) | Google Fonts | Hero typography, identity labels, gem names, ceremonies |
| **Caveat** (handwriting) | Google Fonts | Marginalia, qualifier phrases ("in the cave phase"), field-log voice |
| **JetBrains Mono** | Google Fonts | Metadata, grades, coordinates, tracked-caps labels |
| **Inter** (existing) | Google Fonts | Body text, UI labels |

Type scale lives as CSS custom properties under `--ct-type-*` (display-xl, display, h1, h2, body, caption, mono-meta).

### Texture library

Five reusable SVG patterns in a shared defs file at `frontend/src/components/ui/texture-defs.tsx`:

1. `hatch-diag` — parallel ink lines at 45° (subtle background fill)
2. `hatch-cross` — cross-hatching (denser shadow fill)
3. `stipple` — ink dot stippling (paper grain)
4. `striate` — wavy contour lines (topographic motif)
5. `ink-blot` — hand-drawn imperfect circle (severity dots, vertex markers)

Applied via `<rect fill="url(#hatch-diag)" />` or `background-image` for CSS. Same five patterns repeat across every surface that needs texture.

### Iconography

The bespoke icon set replaces lucide-react. Sourced from **game-icons.net (CC-BY 3.0)** as the MVP path; recolored to palette. Approximate inventory:

- Climbing-culture: chalk, shoe, quickdraw, locker, cam, sloper, crimp, pinch, topo, heel-hook, hangboard, summit (12 — used as gemstone tier handles)
- Field-log: compass, waypoint, north-arrow, page, pin, scissors, scroll
- UI workhorses: chevron, x, plus, minus, search, filter, settings, share
- Status: send-check, burn-x, flash-bolt, project-circle

Total ~40 icons. Stored as single-path SVG symbols in `frontend/src/components/ui/icons/`. One `<Icon name="…" />` wrapper component.

### Voice / lexicon

Climbing-cultural nomenclature replaces commodity UI strings:

| Generic | CoreTriage |
|---|---|
| Settings | Provisions |
| Profile | The card |
| Save | Pin to log |
| Cancel | Bail |
| Delete | Strike through |
| Sign out | Close camp |
| Notifications | Dispatches |
| Loading… | Inking… |
| Error | Off-route |
| Search | Field index |
| Year in review | The annual volume |

LLM-generated prose (coach notes, ceremony captions, finding annotations) signs off as **"the Cartographer"** — observational, editorial, never exclamation marks.

## Identity engine

### Pentagon Morph Timeline

Component: `<PentagonMorphTimeline />`. Renders 6 pentagon snapshots across the past 11–12 months.

**Data input:**
```ts
type PentagonSnapshot = {
  capturedAt: Date              // monthly snapshot
  axes: {                       // 0–10 each
    power: number
    crimpy: number
    dynamic: number
    technical: number
    mobility: number
  }
  archetype: ArchetypeName      // computed at capture time
}
```

**Snapshot policy:** the backend takes a monthly snapshot of each user's pentagon at month-end, persisted in a new `pentagon_snapshots` table (`user_id`, `captured_at`, `axes_json`, `archetype`). The timeline reads the last 5 monthly snapshots + the current live pentagon — 6 cells total, with the rightmost cell representing "NOW."

**Visual:**
- Grid of 6 cells (mobile: 3-cell row × 2 stack; desktop: 6-cell row in one strip)
- Each cell: small pentagon SVG (~80–120px) + month label (mono) + archetype label (serif italic)
- "NOW" cell pulses with `transform: scale()` animation and has a foil-gradient stroke
- Caption below the row summarizes the arc ("11 months. Apprentice → Slabber → Crimper. Crimpy axis grew 4.2 points. Mobility stayed quiet — that's the next push.")

**Caption generation:** templated client-side from snapshot diff — no LLM call. Detects archetype changes and the most-changed axis.

**Interaction:**
- Tap a cell → modal opens with that month's stats + sample sends
- Tap "NOW" → opens Wrapped-style animated story (one cell per second, foil reveal on the latest)

### Identity Label

Component: `<IdentityLabel pentagon={} recentSends={} />`. Generates a three-part phrase: `[STYLE] + [ARCHETYPE] + [PHASE]`.

**Style** (single word, from dominant pentagon axis):

| Pattern | Style |
|---|---|
| `crimpy > 7 ∧ crimpy − max(others) > 1` | "Crimpy" |
| `technical > 7 ∧ technical − max(others) > 1` | "Technical" |
| `power > 7 ∧ power − max(others) > 1` | "Powerful" |
| `dynamic > 7 ∧ dynamic − max(others) > 1` | "Dynamic" |
| `mobility > 7 ∧ mobility − max(others) > 1` | "Mobile" |
| `dynamic < 5 ∧ crimpy > 6` | "Static" |
| `range(all axes) ≤ 1.5` | "All-Round" |
| otherwise | "" (omit the prefix) |

**Archetype** (noun, from overall pentagon shape — already exists in current codebase as the title engine):

`Apprentice · Slabber · Crimper · Dynamo · Brute · Spider · Acrobat · All-Rounder`

Rules already documented in `frontend/src/components/MovementAnalyzer.jsx` archetype work. Lift them into a shared utility at `frontend/src/lib/identity/archetype.ts`.

**Phase** (qualifier from last 5 sends):

| Trigger | Phase |
|---|---|
| ≥ 4 sends overhang or roof | "cave phase" |
| ≥ 4 sends slab or vertical | "slab phase" |
| No sends in ≥ 7 days | "on rest" |
| ≥ 3 V-grade promotions (first-time sends at a new grade) in 30 days | "on a heater" |
| Just sent a project after ≥ 5 burns | "patience rewarded" |
| First send at a new grade in last 24h | "promoted" |
| ≥ 8 sends in last 14 days, no tier-up | "grinding" |
| otherwise | "" (omit) |

**Composition:** `${style} ${archetype}, ${phase}` — with style omitted if empty, phase prefixed with "in the" or styled in Caveat handwriting depending on surface. Examples:

- "Crimpy Crimper, in the cave phase"
- "Technical Slabber, on a heater"
- "All-Round Climber, grinding"
- "Powerful Dynamo, patience rewarded"

**Rule data lives in** `frontend/src/lib/identity/labelRules.ts`. Pure function, no LLM call. Recomputed each Hub mount.

### Streak Flame

Component: `<StreakFlame days={} />`. Animated SVG flame with day count.

**Streak definition:** consecutive calendar days (in user's timezone) with at least one logged training entry OR send. Resets to 0 if a day is missed.

**Visual tiers:**

| Days | Treatment |
|---|---|
| 0–6 | Solid terracotta flame, gentle flicker (2.8s scale animation) |
| 7–29 | Warm gradient flame (terracotta → orange → cream) |
| 30+ | Foil-gradient flame, glow filter, animated foil shimmer |

**Data:** computed client-side from the user's training log + sends. Backend exposes `streak_days_current` and `streak_days_longest` as part of the `/api/me/state` payload (new endpoint).

**Placement:**
- Hub hero strip — beside identity label
- Stat strip on Climber's Card
- Sharable card footer

## Gemstone tier system

12 named ranks, one per V-grade. Tier is determined by **apex grade** (the climber's hardest logged send ever). Permanent achievement — does not regress when a climber stops climbing. If the user deletes their apex send, the apex grade recomputes from the next-hardest remaining send.

| Rank | V-grade | YDS | Tier family |
|---|---|---|---|
| Sandstone | V0 | 5.7–5.8 | rock |
| Granite | V1 | 5.9 | rock |
| Basalt | V2 | 5.10a | rock |
| Quartz | V3 | 5.10c | crystal |
| Jasper | V4 | 5.11a | crystal |
| **Jade** ★ | V5 | 5.11b | gemstone (cool threshold) |
| Topaz | V6 | 5.11d | gemstone |
| Garnet | V7 | 5.12a | gemstone |
| Emerald | V8 | 5.12c | precious |
| Ruby | V9 | 5.13a | precious |
| Diamond | V10 | 5.13d | precious |
| **Obsidian** | V11+ | 5.14+ | grail (prestige) |

★ **Cool threshold at V5 (Jade)** — visible divider in the Hub ladder surface. Below = rock tier (humble). At and above = gemstone (precious).

### Tier material treatment

Each rank applies a CSS-variable-driven material to:
- The pentagon stroke + vertex dots
- The CTA button accent
- The streak flame color (for 30+ day streak)
- The sharable card foil intensity
- The Hub hero strip accent border

Five material families (CSS custom properties keyed off the user's tier):

| Family | Tiers | Visual moves |
|---|---|---|
| **Rock** | V0–V2 (Sandstone, Granite, Basalt) | Flat tier color · single hairline rim · no animation |
| **Crystal** | V3–V4 (Quartz, Jasper) | Flat color + ink-hatch overlay · double rim · no animation |
| **Gemstone** | V5–V7 (Jade, Topaz, Garnet) | Radial gradient · light-sweep animation (5s loop) · stronger rim |
| **Precious** | V8–V10 (Emerald, Ruby, Diamond) | Gradient + gilded double rim + outer glow · sparkle bursts (4s loop) |
| **Grail** | V11+ (Obsidian) | Dark base + iridescent foil rim + continuous shimmer · **app-wide dark mode unlock** |

Implemented as `data-tier="amber"` attribute on `<html>` (document root). CSS reads `:root[data-tier=...]` selectors and sets `--tier-c`, `--tier-deep`, `--tier-glow`, `--tier-material` accordingly. One attribute swap reskins the entire app.

### Promotion ceremony

Crossing into a new tier triggers a full-screen ceremony moment:

1. Backdrop dims
2. New gemstone's wordmark fades in (foil-gradient if at gemstone tier or above)
3. Pentagon morphs to the new tier's stroke treatment
4. Identity label updates to new archetype (if changed)
5. Sharable card auto-prompts: "Share your new rank?"

Animation: ~3 seconds total. Skippable. Triggered server-side when `apex_grade` crosses a threshold; the Hub poll catches it and renders the ceremony modal.

### Climbing-handle (tier subtitle)

Each gemstone gets a climbing-culture "handle" in Caveat handwriting as a secondary identifier:

| Rank | Handle |
|---|---|
| Sandstone | "the chalk" |
| Granite | "the shoe" |
| Basalt | "the quickdraw" |
| Quartz | "the locker" |
| Jasper | "the cam" |
| Jade | "the sloper" |
| Topaz | "the crimp" |
| Garnet | "the pinch" |
| Emerald | "the topo line" |
| Ruby | "the heel hook" |
| Diamond | "the hangboard" |
| Obsidian | "the summit" |

Optional flavor element. Surfaces beside the rank name in identity labels and the sharable card. Climbers can say "I'm Topaz" or "I'm on the crimp" — both work.

## Sharable Card export

Component: `<SharableCard />` rendered both on the client (preview modal) and server (PNG export endpoint).

**Format:** 1080 × 1920 portrait (Instagram Story spec).

**Layout (top → bottom):**

```
┌─────────────────────────────────┐
│  Core/Triage · field log · DATE │  ← wordmark + ISO date, foil-gradient if Obsidian
├─────────────────────────────────┤
│                                 │
│       [Pentagon — 75% width]    │  ← current pentagon with tier stroke
│                                 │
├─────────────────────────────────┤
│      [Identity Label hero]      │  ← Fraunces italic, foil text if Obsidian
│       "phase qualifier"         │  ← Caveat handwriting
├─────────────────────────────────┤
│   V8       247       11 mo      │  ← apex / sends / arc — mono labels
│   apex    sends      arc        │
├─────────────────────────────────┤
│       🔥 11 day streak          │  ← streak flame (rendered SVG)
├─────────────────────────────────┤
│   core/triage · climbing id     │  ← footer wordmark (attribution)
└─────────────────────────────────┘
```

**Backdrop:** dark gradient (`#0a0810 → #1a1018`) with subtle foil sweep animation in the preview. Static PNG export drops the animation.

**Tier styling on the card:** the pentagon stroke + footer band match the user's tier material. Obsidian gets full foil treatment (animated in preview, gradient bake-in for PNG).

### Trigger sources

| Trigger | Behavior |
|---|---|
| User taps **Share** button on any identity surface | Opens preview modal → "Download" + "Copy link" actions |
| **Tier-up ceremony** | Auto-prompts after the ceremony resolves |
| **30-day streak hit** | One-time notification "Your streak just hit Foil. Share it?" |
| **New apex grade** | Auto-prompts after the send is logged |
| **Year-end** (Dec 31) | "Annual Volume" rolls 12 monthly cards into a story sequence |

### Server endpoint

`POST /api/identity/share-card` → returns `{ url, expires_at }` where `url` is a signed CDN link to a freshly rendered PNG. Uses headless browser rendering (Playwright or Puppeteer — pick at implementation time) of a server-side `<SharableCard mode="export" snapshot={…} />` route.

Snapshot is materialized server-side at request time — embeds pentagon axes, label string, streak days, apex grade. Card URL expires 24h.

## Responsive system

Same aesthetic, two containers.

| Element | Mobile (375px) | Desktop (1200px+) |
|---|---|---|
| Binder hole-punch decoration | Hidden | Left margin (30px) |
| Masthead | Compact wordmark + 2-line meta | Larger wordmark + full edition meta |
| Pentagon + identity label | Stacked vertically, pentagon ~70% viewport width | Side-by-side, pentagon left, label block right |
| Stat strip | 5-column compact row under pentagon | Inline mono meta beside altitude block |
| Today's session | Single full-width card with topo + CTA | Two-column: topo left, prescription right |
| Recent log strip | Horizontal scroll, 130px cards | 3-column grid, full-width cards |
| Navigation | Bottom tab bar, 5 items, 18px icons + 7px labels | Left sidebar (existing) or top nav with full labels |
| Marginalia (Caveat) | Inline below pentagon as qualifier phrase | Rotated annotations beside pentagon |
| Display serif sizes | 2.25rem hero | 2.75–3.4rem hero |
| Climbing-line redraw | Auto-plays once on view; tap to replay | Auto-plays + hover to replay |
| Touch targets | All buttons ≥ 44pt height | Smaller buttons OK; hover states active |

The texture library (SVG patterns), bespoke icons, and paper world all scale natively. The redesign is responsive by default.

## Per-surface plan

The full app gets rebranded. Each surface has a primary focus area for the rebuild. **Movement Analyzer, Settings, and Auth are explicitly in scope.**

### Hub (`HubTab.jsx`)

**The flagship surface.** Becomes the identity hero strip:

- Masthead: wordmark + edition meta (date, weather if available)
- Hero row: Pentagon (now) + Identity Label + tier accent
- Stats row: streak flame + apex grade + total sends
- Pentagon Morph Timeline (collapsible — shows 6 cells + caption)
- Today's session card (existing topo treatment from analyzer work)
- Recent log strip (3 cards, link to Progress)
- Bottom nav (mobile) or left nav (desktop)

### Progress (`ProgressTab.jsx`)

**The Ladder + Constellation + Tick List.**

- Top: full 12-rank ladder showing user's current position with "YOU ARE HERE" marker
- Send constellation (data viz from earlier Pattern C) — every send plotted as a star on grade × style grid
- Tick list of sends grouped by month
- Geographic filter dropdown (where you climbed — no map surface, list filter only)

### Train (`TrainTab.jsx`)

**Sessions rendered as field-log entries.**

- Each plan / session as a "page" with binder treatment
- Session prescription in the field-log voice
- Exercise cards use the new card chrome (cream paper + ink border + ornament corners)
- Replace lucide icons with bespoke set

### Recover (`RecoverTab.jsx`)

**Anatomical leaf motifs + field-log entries.**

- Body diagram retained but restyled with ink-line strokes
- Each rehab plan = a field-log entry with paper background
- Daily progress as ink-stamp completion marks (replaces checkboxes)

### Chat → "The Cartographer" (`ChatTab.jsx`)

**Companion persona.**

- Chat picker (existing) gets restyled card chrome
- Every assistant message signs off with "— the Cartographer" footer
- Avatar: hand-drawn pen-and-ink portrait (sourced asset)
- AI Chat label becomes "The Cartographer" throughout

### Movement Analyzer (`MovementAnalyzer.jsx`)

**Topo-as-content layer.**

- Every send video becomes a "personal topo" entry with the climber's center-of-mass path rendered as a terracotta line over the stylized wall
- Finding cards restyled to match new card chrome
- Pentagon delta on each topo poster (shows shape shift from this climb)
- Ink-redraw animation on the climbing line when an old entry is opened

### Settings → "Provisions" (`SettingsPage.jsx`)

**Lexicon applied + Climber's Card surface.**

- Page title: "Provisions"
- New top section: full Climber's Card preview with Share button
- All section labels apply lexicon (e.g., "Close camp" instead of "Sign out")
- Strike-through delete treatment for archived items

### Auth + Landing (`Landing.jsx`, `AuthShell.jsx`, `AuthModal.jsx`)

**Magazine-spread treatment.**

- Landing: masthead + hero "Train like the route remembers you" + value prop sections + ceremonial CTA
- Sign in / sign up screens use AuthShell with new paper + Fraunces type
- Email verification page gets ink-stamp "verified" treatment

## Implementation contracts

The components below need to be built. Props listed are the contract — implementation details left to the writing-plans phase.

### `<Pentagon />` (lift / generalize existing `StatRadar.jsx`)

```ts
type Props = {
  axes: { power, crimpy, dynamic, technical, mobility }  // 0-10 each
  size?: number            // default 240
  tier?: TierName          // for stroke + vertex styling
  animate?: boolean        // breathe/pulse animation
  showLabels?: boolean     // axis labels
  showValues?: boolean     // numeric values near vertices
}
```

### `<PentagonMorphTimeline />`

```ts
type Props = {
  snapshots: PentagonSnapshot[]  // last 6 monthly + current = 7
  tier: TierName
  onCellClick?: (snapshot) => void
}
```

### `<IdentityLabel />`

```ts
type Props = {
  pentagon: PentagonAxes
  recentSends: SendSummary[]   // last 5
  variant?: 'inline' | 'card' | 'shareable'  // typography weight + caveat usage
}
// Outputs: { style, archetype, phase, composed: string }
```

### `<StreakFlame />`

```ts
type Props = {
  days: number
  size?: 'sm' | 'md' | 'lg'
  showLongest?: boolean    // shows longest streak as ghost number
}
```

### `<TierAccent />` (provider component)

```ts
type Props = {
  apexGrade: VGrade
  children: ReactNode
}
// Sets data-tier on document root + CSS custom props
```

### `<SharableCard />`

```ts
type Props = {
  pentagon: PentagonAxes
  identityLabel: ComposedLabel
  streakDays: number
  apexGrade: VGrade
  totalSends: number
  arcMonths: number
  tier: TierName
  mode: 'preview' | 'export'  // preview animates; export is static
}
```

### `<RankSeal />` (the wordmark stamp from v6)

```ts
type Props = {
  tier: TierName
  size?: 'sm' | 'md' | 'lg'
  showHandle?: boolean   // e.g. "the crimp"
}
```

### Icon registry

```ts
<Icon name="chalk" size={20} />
// Loads from frontend/src/components/ui/icons/{name}.svg
```

### Texture defs

Single `<TextureDefs />` component mounted once at app root. Defines `<defs>` block with all 5 patterns + foil gradient. Referenced by other SVGs via `fill="url(#hatch-diag)"`.

## Data + backend additions

| Endpoint | Purpose |
|---|---|
| `GET /api/me/state` | Returns: `apex_grade`, `tier`, `streak_days_current`, `streak_days_longest`, `pentagon`, `recent_sends[]`, `archetype`. Single payload for Hub hero strip. |
| `GET /api/me/pentagon-snapshots?limit=6` | Last 6 monthly snapshots for the morph timeline |
| `POST /api/identity/share-card` | Returns `{ url, expires_at }` for the PNG export |
| `POST /api/identity/ceremony-seen` | Marks tier-up ceremony as viewed (don't re-trigger) |

New tables:

| Table | Purpose |
|---|---|
| `pentagon_snapshots` | `user_id`, `captured_at`, `axes_json`, `archetype`. Monthly cron writes one row per user. |
| `tier_promotions` | `user_id`, `from_tier`, `to_tier`, `promoted_at`, `ceremony_seen_at`. Append-only. |
| `share_card_renders` | `user_id`, `rendered_at`, `s3_url`, `expires_at`. Cache for export endpoint. |

## Out of scope (Year-2 backlog)

- Custom-commissioned illustrations (we use game-icons.net for MVP)
- Annual hardcover-book PDF export
- Sound design (pen scratch, page turn, wax seal)
- Sub-personas (Cartographer reviews sends; Editor writes coach notes; Apothecary handles recover)
- Free-form field notes (user-written Caveat captions per entry)
- Daily dispatch (Cartographer-signed morning message)
- Page weathering (old entries yellow over time)
- Wet-ink treatment for fresh entries
- Climber Constellation social / leaderboards
- Custom illustrated hand-drawn portrait avatars

## Verification

The redesign ships in phases (defined in the implementation plan). Per-phase success criteria:

| Phase | Success signal |
|---|---|
| **0 · Foundation** | New palette + typography + texture defs render in Storybook / DesignSystem dev route. Lighthouse contrast checks pass. |
| **1 · Hub redesign** | New Hub hero strip lives in the app. Pentagon Morph Timeline shows 6 cells. Identity Label renders correctly for 8 test profiles. Streak Flame computes correctly across timezone edge cases. |
| **2 · Tier system** | `data-tier="..."` swaps the whole app's accent palette. Promotion ceremony fires on tier-up. Obsidian dark-mode unlocks for V11+ users. |
| **3 · Sharable Card** | `/api/identity/share-card` returns a valid 1080×1920 PNG within 4 seconds p95. Auto-prompt fires on milestones. Year-end Wrapped renders for accounts with ≥ 6 months of data. |
| **4 · Per-surface rebrand** | All primary tabs (Hub, Train, Progress, Recover, Chat, Movement Analyzer, Settings, Auth) ship with new chrome. Lexicon pass complete. No remaining lucide-react imports outside icon registry. |
| **5 · QA pass** | All 12 tiers tested end-to-end. Sharable cards regression-tested across all tiers. Mobile + desktop screenshots reviewed for responsive correctness. |

## Open questions (for implementation plan to resolve)

1. **Snapshot backfill** — for users with > 6 months of history but no recorded snapshots, do we backfill from training-log data, or just show "starting now"?
2. **Share card rendering infrastructure** — Playwright vs Puppeteer vs Satori? (Satori is appealing for simple SVG-to-PNG without a browser dependency.)
3. **Promotion ceremony skippability** — auto-dismiss after 6s, or require user dismissal?
4. **Tier regression policy** — if we ever surface a "current rank" vs "apex rank" distinction, do tier accents follow current or apex? (Current spec: apex only.)
5. **PWA caching** — sharable card PNG storage: server-side cache or device-side IndexedDB?

These don't block the spec — they're concrete decisions the implementation plan will lock.

---

**End of spec.** Ready for self-review, user review, and hand-off to the writing-plans phase for an implementation plan with phased rollout.
