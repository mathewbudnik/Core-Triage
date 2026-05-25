# Landing + Hero Redesign — Design Spec

**Status:** approved for implementation
**Owner:** Mathew Budnik
**Date:** 2026-05-25

## Context

The current landing page at [frontend/src/components/Landing.jsx](../../../frontend/src/components/Landing.jsx) was written before CoreTriage grew into a full climbing app. It still pitches "Train. Recover. Progress." behind three generic feature cards (Training Plans, Recover, AI Assistant) and a coaching CTA. It says nothing about the new Movement Analyzer, nothing about the tier system / leaderboard / awards, nothing about the Hub dashboard, and shows zero real product or sport imagery. A first-time visitor walks away with a much smaller idea of the app than the app actually is.

This spec replaces that page with an interactive product tour that showcases the full surface — and refreshes the first-time Hub experience that a brand-new account lands in after signup so the onboarding feels continuous with the marketing page.

## Audience and goals

**Primary goal:** showcase the product surface. A first-time visitor should grok the breadth of CoreTriage in 30 seconds.

**Audiences (all three, none excluded):**

1. **Climber sent by another climber** — already climbing, knows V-grade vocab, wants to see if it's the real deal.
2. **Climber searching for an injury fix** — found via Google ("a2 pulley pain climbing"), pain is the entry point.
3. **Climbing-curious / new climber** — needs structure, wants training plans more than rehab.

The hero copy stays climber-native ("Made for climbers") so segments 1 and 2 feel home immediately; segment 3 is served by the breadth of the surface and the "Where does it hurt?" / Try-it-free low-friction entries.

**Secondary goal:** make the page feel unmistakably *CoreTriage* — built by a real climber for real climbers. The credibility lever is Budnik's profile (V13 outdoor boulderer, sets at Momentum Houston, ~decade in the sport) plus real climbing imagery throughout. Six media slots are reserved for that and rendered as styled placeholders until real assets ship.

**Non-goals:** SEO landing variants per body region; pricing comparison tables; testimonials carousel; FAQ. Those can come later. This pass is structure + chrome + media slots.

## Page structure (top to bottom)

| § | Section | Purpose |
|---|---|---|
| 1 | **Nav** | Logo + Sign in + "Start free" CTA |
| 2 | **Hero — 3-tab product tour** | Auto-cycling preview pane (Movement → Recover → Progress), pauses on hover/click |
| 3 | **What's inside grid** | Train · Hub · AI Assistant · Awards & tier — the features not in the hero |
| 4 | **Full-bleed section-break photo** | Atmospheric climbing image, no copy. Media Slot 3. |
| 5 | **Built by Budnik** | Headshot + credibility copy. Media Slot 4. |
| 6 | **Coaching tier** | Photo panel + benefits + Apply CTA. Media Slot 5. |
| 7 | **Where does it hurt?** | Body-region chip cloud — keeps the existing low-friction Recover entry |
| 8 | **Final CTA** | "Make the climbing app you've been wanting." + Start free button with faded photo backdrop. Media Slot 6. |
| 9 | **Footer** | Educational disclaimer + links |

## Hero

The hero is the only non-trivial interactive component on the page. It is a two-column layout (single-column on mobile, stacked):

- **Left column:** eyebrow label · headline · subhead · primary + secondary CTAs · Media Slot 1 backdrop fades behind text from the right edge
- **Right column:** product-tour preview pane — three tabs above a content region

### Tabs and rotation

- Three tabs: **Movement** (default / frame 1) · **Recover** · **Progress** — in that order left-to-right.
- Auto-cycles every **6 seconds**, pauses on:
  - hover over the preview pane or any tab
  - keyboard focus on any tab
  - explicit click on a tab (locks the view for the rest of the session)
- A 4 px progress underline on the active tab animates toward the next rotation point so the auto-advance is visible without being distracting.
- Respects `prefers-reduced-motion`: when set, auto-cycle is disabled and the user must click to switch.
- All three tab panes mount on first render so the rotation never flashes a loading state.

### Tab content

**Movement tab (default).** Media Slot 2 — a 15–20 second muted, autoplaying, looped MP4/WebM of real climbing footage with the actual MediaPipe skeleton overlay running. Until the asset ships, the slot renders an animated SVG skeleton (the one in the 04 mockup) on top of a dark gradient with a "live overlay · 0:14" label and a faux progress bar at the bottom. Caption beneath: *"Your climbing clip, with on-device pose detection."*

**Recover tab.** A small anatomical body diagram (left of the panel) with one region highlighted in terracotta. Every 1.8 seconds the highlighted region cycles through a short sequence: **Right elbow → Index finger A2 → Right shoulder → Left knee → Lower back**. The right side of the panel updates in lockstep with the region:
- Eyebrow label (the region name)
- Short diagnosis line (e.g. "Lateral epicondylitis")
- One-sentence summary (e.g. "Likely overuse from compression moves. 3-phase rehab plan inside.")
- A three-segment phase bar (Phase 1 filled, Phase 2 half-filled, Phase 3 empty) to imply progression

The body diagram is hand-built SVG keyed to the same region tokens the real triage wizard uses — pulled from `frontend/src/components/triage/` so it stays in sync with what the app actually offers. The SVG must support every region the real triage covers, but the demo only cycles through the five listed above; the other regions render but stay neutral.

The region cycle also pauses on hover and respects `prefers-reduced-motion`.

**Progress tab.** A static demo user named **`alex_sends_v8`** with:
- Tier badge: **V7 Sapphire**, "8 sends to V8" sublabel, glow halo
- "#42 worldwide" rank chip
- 9-bar grade pyramid (V0 → V8) showing many V3–V5 sends, a few V6–V7, no V8 yet — a realistic intermediate-strong account
- Three awards chips below: `14-day streak`, `First V7`, `100 sends`

This is a static composition (no animation) — visitors should be able to read it. The bars use the same `ct-display`/`ct-terra-soft`/`ct-terra` gradient stops that the real Progress tab uses.

### Headline + copy

- **Eyebrow:** `Climbing app · built by a V13 boulderer` (`.ct-eyebrow` styling, moss color, 0.18em tracking)
- **Headline:** `Train, recover, and climb harder.` with second line `Made for climbers.` (terracotta accent on the second line)
- **Subhead:** `Triage an injury, log your sends, analyse your beta, watch your tier climb — one app, built by a V13 outdoor boulderer.`
- **Primary CTA:** `Start free` → opens AuthModal in signup mode
- **Secondary CTA:** `See how it works` → smooth-scrolls to the "What's inside" grid

The headline copy is intentionally plain — the *visuals* carry the differentiation. If a future copy pass wants to swap it, the component takes the headline + subhead as constants at the top of the file for easy editing.

## Sections below the hero

### What's inside (§3)

Four-card grid (4 cols desktop, 2 cols tablet, 1 col mobile). Each card uses `.ct-surface` styling with the existing card pattern from `HubTab.jsx`. Card content:

- **Train** — *"Log sends, build a pyramid, plan your weeks."* → links to `/train` (gated by signup)
- **Hub** — *"One dashboard — streaks, today's plan, tier badge."* → links to `/hub` (gated by signup)
- **AI Assistant** — *"Ask anything, grounded in a climbing-specific knowledge base."* → links to `/chat` (works unauthenticated, free tier)
- **Awards & tier** — *"Rookie to Apex — unlocks on real send milestones."* → links to `/progress` (gated by signup)

Each card has a small icon (lucide-react: `Dumbbell`, `Home`, `MessageSquare`, `Trophy`) and a subtle right-aligned chevron that brightens on hover. No emojis (per existing project preference).

### Section-break photo (§4)

Full-bleed photo strip, fixed aspect ratio (16:5 desktop, 4:3 mobile), media Slot 3. Pure atmosphere — no copy overlay, no CTA. Color-graded warm to match the forest/terracotta palette. Lazy-loaded.

### Built by Budnik (§5)

Two-column section: circular headshot left (80×80 desktop, 64×64 mobile, Media Slot 4), copy right.

Headline: `Built by a V13 outdoor boulderer.`
Body: `A decade in the sport. Climbs V13 outdoors, sets at Momentum Houston, and built CoreTriage because the climbing app that should exist… didn't.`

Sits inside a `.ct-surface` with a soft terracotta border on hover (the existing pattern). No CTA — credibility section, not conversion section.

### Coaching tier (§6)

The existing coaching block from [Landing.jsx:171-203](../../../frontend/src/components/Landing.jsx#L171) is refreshed:

- Two-column inside the `.ct-surface-hero` card: photo panel left (Media Slot 5 — coaching/setting still), copy + CTA right
- Headline: `Inside knowledge, climber to climber.`
- Body kept close to current ("Send video of your project. Get a beta breakdown, a plan shaped around your weaknesses, and direct messaging on the things an AI can't help with.")
- Removed the "Budnik climbs V13 outdoors, sets at Momentum Houston, and has spent a decade…" sentence — that fact now lives in §5 and shouldn't be repeated three feet later.
- CTA: `Apply for coaching` → opens the existing `UpgradeModal` with `trigger="coaching"` (unchanged behavior)
- Sublabel: `$89/mo · application only` (drops the "4 spots open" scarcity copy — too marketing-y for this brand)

### Where does it hurt? (§7)

The existing 16-chip body-region cloud from [Landing.jsx:206-221](../../../frontend/src/components/Landing.jsx#L206) is kept as-is. Each chip routes to `/recover` with that region preselected if the route supports a query param; otherwise just to `/recover` (current behavior).

### Final CTA (§8)

Centered block, Media Slot 6 (outdoor send shot) lives behind the content at 20% opacity with a forest-tone overlay so contrast is preserved.

- Headline: `Make the climbing app you've been wanting.`
- Sub: `Free to use. No card required.`
- CTA: `Start free →` opens AuthModal in signup mode (same as hero primary CTA)

### Footer (§9)

Same disclaimer line as today: *"CoreTriage is an educational tool and does not provide medical diagnosis or treatment."* Plus minimal links (Sign in, Coaching, About). No social icons for this pass.

## Hub welcome state (first-time signed-in user)

The brand-new account currently lands on the standard Hub with stats showing zeros and no climbs to display. The redesign adds a first-run welcome state that mirrors the landing's tone so the transition from signup → first-time-in feels intentional.

**Trigger:** user has zero entries in `training_logs` AND zero entries in `sessions` (the two tables that get populated by the first real action). Once either has any row, the welcome state never renders again.

**Layout:** replaces the normal Hub hero panel with a single full-width `.ct-surface-hero` card containing:

- Eyebrow: `Welcome in.`
- Headline: `Pick a way in.` (small, 18px)
- Body: one short paragraph — *"You can do a quick injury triage, log your first climb, or upload a clip for the Movement Analyzer. Or just nose around — everything's free for 14 days."*
- Three large action buttons in a row (stack on mobile):
  - `Triage an injury` → `/recover`
  - `Log my first climb` → `/train`
  - `Try Movement Analyzer` → `/chat` with `localStorage.setItem('coretriage_chat_view', 'analyzer')` set before navigation, so [ChatTab.jsx](../../../frontend/src/components/ChatTab.jsx) (which reads `VIEW_KEY` on mount) opens the Movement Analyzer view directly. The hub welcome reuses the exact key/value the picker already writes when a user selects that view.
- A small dismiss link below: `I'll figure it out` — sets a `hub_welcome_dismissed_at` flag in localStorage so the welcome doesn't return even if both tables stay empty.

Everything below the hero on Hub (today's tip, projects, etc.) renders normally even in the welcome state, since most of those panels have their own empty-state copy.

## Media slots — capture list

Each slot ships as a styled placeholder until a real asset is dropped in. Placeholders use a dashed terracotta border, a small camera/video glyph, the slot number, and a one-line description so anyone landing on the page sees that an asset is intentional but pending. Each slot is one `<img>` / `<video>` swap when ready.

| Slot | Type | Location | Aspect | Notes |
|---|---|---|---|---|
| 1 | photo | Hero backdrop, right edge fade | wide / 16:9 | Cinematic outdoor climb, silhouette OK, will be color-graded |
| 2 | video | Movement tab pane | square or 4:5 | 15–20s muted loop, autoplay, with MediaPipe skeleton overlay. Provide MP4 + WebM |
| 3 | photo | §4 full-bleed strip | 16:5 desktop, 4:3 mobile | No copy on it, atmosphere only |
| 4 | photo | §5 headshot circle | 1:1, 320×320 min | Climbing portrait or clean head/shoulders |
| 5 | photo | §6 coaching panel | 4:3 portrait | Setting at Momentum or beta-breakdown still |
| 6 | photo | §8 CTA backdrop | wide / 16:9 | Outdoor send, fades to 20% opacity behind text |

Storage strategy: put assets in `frontend/public/landing/` (`hero-bg.jpg`, `movement-loop.mp4`, `section-break.jpg`, `headshot.jpg`, `coaching.jpg`, `cta-bg.jpg`). Component imports them from there so swapping is a single file replace.

## Design tokens and components

The redesign reuses, does not invent:

- **Colors:** `ct-forest`, `ct-forest-deep`, `ct-forest-soft`, `ct-cream`, `ct-cream-soft`, `ct-moss`, `ct-terracotta`, `ct-terra-soft`, `hairline`, `rim`
- **Type scale:** `.ct-eyebrow`, `.ct-title`, `.ct-display`, `.ct-body`, `.ct-body-soft`, `.ct-meta`
- **Surfaces:** `.ct-surface` (default cards), `.ct-surface-hero` (hero pane + coaching tier card)
- **Buttons:** `.btn-primary` (Start free, Apply for coaching), `.btn-secondary` (See how it works)
- **Motion:** `animate-fade-in`, `animate-slide-up` for the staggered hero entry; tab cross-fade is a 240ms opacity transition

No new tokens, no new utility classes. The grade-pyramid bars in the Progress tab pane reuse the gradient stops from `ProgressTab.jsx`'s real pyramid.

## Accessibility

- Hero tabs use `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `tabindex` cycling — full keyboard navigation with arrow keys
- Auto-cycle paused on focus into any tab
- All decorative SVGs (skeleton overlay placeholder, body diagram) have `aria-hidden="true"`
- Body diagram cycling region change announced via a visually-hidden `aria-live="polite"` text node so screen readers hear "Right elbow", "Index finger A2", etc.
- Color contrast: every text-on-color combination passes WCAG AA against the dark forest background (cream on forest-deep clears 12:1)
- `prefers-reduced-motion`: disables both tab auto-cycle and body-region cycle; keeps cross-fade transitions at 0ms

## Out of scope

The following are explicitly not part of this pass:

- Real photo/video assets (slots ship as placeholders, captured separately)
- Per-region landing pages for SEO
- A/B testing infrastructure
- Testimonials / social proof carousel
- Pricing comparison table
- Newsletter / email capture
- Coaching application form (still uses the existing UpgradeModal → mailto flow)
- Sign-in / sign-up redesign (existing AuthModal is reused as-is)

## Files affected

**New:**
- `frontend/src/components/landing/HeroProductTour.jsx` — the 3-tab auto-cycling component
- `frontend/src/components/landing/RecoverTabPane.jsx` — body-diagram cycling pane
- `frontend/src/components/landing/MovementTabPane.jsx` — video + skeleton overlay placeholder pane
- `frontend/src/components/landing/ProgressTabPane.jsx` — static demo-user composition
- `frontend/src/components/landing/MediaPlaceholder.jsx` — reusable styled-placeholder component (used by Slots 1, 3, 4, 5, 6)
- `frontend/src/components/HubWelcomePanel.jsx` — first-time signed-in welcome
- `frontend/public/landing/.gitkeep` — placeholder dir for future assets

**Modified:**
- `frontend/src/components/Landing.jsx` — replaced contents with the new structure outlined above
- `frontend/src/components/HubTab.jsx` — conditional render of HubWelcomePanel when both training_logs and sessions are empty AND the dismiss flag isn't set

**Unchanged:**
- `frontend/src/components/AuthModal.jsx` (reused)
- `frontend/src/components/UpgradeModal.jsx` (reused for coaching CTA)
- Routing in `App.jsx` (the `/` route still renders `<Landing />`, signed-in users still redirect to `/hub`)

## Open questions

None blocking. Two questions to revisit after first render:

1. **"Start free" CTA wording** — ships as `Start free` in all three locations (nav, hero, final CTA). Defined as a single constant in the new Landing.jsx so swapping is one edit. Re-evaluate after first render.
2. **Section-break photo (§4) placement** — feels right between "What's inside" and "Built by Budnik" but could also sit between coaching and "Where does it hurt?" to break up the long middle. Re-evaluate visually after assets land.
