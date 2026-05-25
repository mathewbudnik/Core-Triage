# Learn tab redesign — Design Spec

**Status:** approved direction, awaiting implementation plan
**Owner:** Mathew Budnik
**Date:** 2026-05-25
**Supersedes (partially):** [2026-05-11-chat-tab-restructure-design.md](2026-05-11-chat-tab-restructure-design.md) — that spec produced the current `Chat` picker; this one evolves it past three equal cards.

## Context

The current `Chat` tab landing — implemented per the 2026-05-11 restructure spec at [frontend/src/components/ChatPicker.jsx](../../../frontend/src/components/ChatPicker.jsx) — shows three equal cards (Coach, AI, Movement Analyzer) with ~50 words of marketing copy each. The page does its job, but it reads as a feature buffet rather than a destination. Three weaknesses:

1. **The name `Chat` doesn't describe what the page is** — coaching, AI, and movement analysis aren't all "chat."
2. **The three-equal-cards layout flattens the value proposition** — every card carries the same visual weight and the same density of marketing copy. Nothing leads. Nothing earns a moment.
3. **The copy reads AI-generated** — multi-clause descriptions, badges ("Free trial," "Coaching," "Beta"), and "during your 14-day trial and with a subscription" all feel templated.

This spec rebuilds the page around a single hero-plus-switcher pattern that mirrors the live Hub anatomy, in setter voice, with cinematic per-option reveals.

## Goals

- **A name that describes the page.** Three things you can do to *learn* about your climbing — get a read from a real coach, ask an AI, or watch your own movement.
- **One focus at a time.** A hero panel that fully commits to one option; the others are quietly available below as switchers.
- **Setter voice everywhere.** Terse, observational, concrete. No marketing claims, no urgency words, no badges.
- **Hub-sibling chrome.** Reuse the live `ct-*` token system, `.ct-surface-hero` chrome, and the hero-panel-plus-tools-row anatomy from Hub. Zero new design primitives.
- **Cinematic reveals.** Each focused option gets a small, on-brand animation (Budnik portrait with glow, AI conversation streaming, Analyzer video frame with pose skeleton) — earns the hero real estate without crossing into marketing-page energy.

## Non-goals

- Renaming the URL `/chat → /learn` (kept as-is to avoid breaking the landing-hero welcome-panel deep link to `/chat`)
- Touching the sub-views themselves — `AIChatView`, `CoachChatView`, `CoachInboxView`, `MovementAnalyzerView` are unchanged
- Backend changes — no new endpoints, no new env vars, no DB migrations
- Server-side persistence of focused option (localStorage only, same key as today)
- Telemetry / analytics on which option gets focused (worth adding later; not blocking)
- A new design-system layer — this lives inside the existing RPG climber vocabulary on main

## Audience and scope of feedback

The page serves four user states, in this order of frequency:

1. **Free user (signed in, no sub, possibly in trial)** — most common. Default focus by the rule in §3.
2. **Anonymous visitor** — second most common. Default focus = Analyzer (the visually arresting option that still requires sign-in to use; we accept the sign-in wall on first paint for the first-impression payoff).
3. **Coaching subscriber** — focused on Budnik with a recent-message teaser.
4. **Budnik himself (coach role)** — bypasses the Learn page entirely; lands in `CoachInboxView` (current behavior preserved).

## 1. Information architecture

| Item | Value |
|---|---|
| Page name (display) | `Learn` |
| Sidebar nav label | `Learn` (replaces `Chat`) |
| Sidebar icon | `BookOpen` (lucide-react; replaces `MessageSquare`) |
| URL | `/chat` (unchanged) |
| Component file | `frontend/src/components/learn/LearnHub.jsx` (replaces `ChatPicker.jsx`) |
| Persisted-view localStorage key | `coretriage_chat_view` (unchanged for compat) |
| View values | `'coach' | 'ai' | 'analyzer' | 'inbox'` — the value `'picker'` from the old design is treated as "no persisted choice" so the focus rule runs |

The URL `/chat` is kept because the landing-hero spec ([2026-05-25-landing-hero-redesign-design.md §Hub welcome state](2026-05-25-landing-hero-redesign-design.md)) deep-links to it with `localStorage.setItem('coretriage_chat_view', 'analyzer')` set before navigation. Renaming the URL is a follow-up that requires coordinated changes; out of scope here.

## 2. Layout

### 2.1 Desktop (≥ 900px)

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEARN                                                              │
│  Three ways to get a read on your climbing.                         │
│                                                                     │
│  ╭───────────────────────────────────────────────────────────────╮  │
│  │  EYEBROW · GET A READ                                         │  │
│  │  Headline (focused option)                                    │  │
│  │  Body copy (focused option, ≤ 2 lines)                        │  │
│  │  Meta line                                                    │  │
│  │  [ tier-aware CTA ]               [ cinematic reveal canvas ] │  │
│  │                                                               │  │
│  ╰───────────────────────────────────────────────────────────────╯  │  ← .ct-surface-hero
│                                                                     │     min-height 420px
│  ╭───────────────╮  ╭───────────────╮  ╭───────────────╮            │
│  │ [B] Budnik    │  │ [✱] Ask the AI│  │ [▲] Movement  │            │  ← switcher row
│  │ one-line sub  │  │ one-line sub  │  │ one-line sub  │            │     3 tiles, .ct-surface
│  ╰───────────────╯  ╰───────────────╯  ╰───────────────╯            │     active = terracotta border
│                                                                     │
│  Educational only — not a medical diagnosis. …                      │
└─────────────────────────────────────────────────────────────────────┘
```

Hero panel is a two-column grid: `1fr 420px` with a `gap: 32px`, min-height 340px on the inner grid (so the canvas always has a fixed comfortable area regardless of copy length).

### 2.2 Mobile (< 900px)

Hero collapses to single column (text first, then canvas below). Switcher becomes a horizontal snap-scroll strip with `overflow-x: auto` and `scroll-snap-type: x mandatory`. Tapping a tile activates it AND scrolls it to center. No hover state on touch — tap is the only interaction.

### 2.3 Why this shape

- One focus, three ways in. The hero earns its cinematic reveal because it's not competing with two siblings.
- The switcher row mirrors [HubToolsGrid](../../../frontend/src/components/hub/HubToolsGrid.jsx) — a row of compact tiles below a hero panel. The brand cohesion is structural, not just visual.
- Mobile gets a native pattern (snap-scroll), not a contortion.

## 3. Focus rules (which option opens by default)

Evaluated top-to-bottom; first match wins. Evaluated once on `LearnHub` mount per session; stored in component state. Re-evaluated on page re-entry. Once the user explicitly clicks a switcher tile, the persisted localStorage value wins over the rule.

| Priority | Condition | Focus | Rationale |
|---|---|---|---|
| 1 | `user.is_coach === true` | (n/a — bypass to `CoachInboxView`) | Coach's own inbox is the answer; never show the Learn picker |
| 2 | Coaching subscriber has an unread Mathew reply | Coach | "Someone replied to you" beats everything |
| 3 | `user.tier === 'coaching'` | Coach | Their thread is the primary product they paid for |
| 4 | User has a row in the `sessions` table (triage history) in the last 30 days | Coach | Mid-rehab → conversation with a human is highest-value |
| 5 | User logged a session in the last 24 h | Analyzer | Recent climb → "want to see what your movement looked like?" |
| 6 | Anonymous (no user) | Analyzer | Visually arresting; sign-in wall on CTA is acceptable for first impression |
| 7 | Fallback | AI | Most common entry, lowest barrier |

### 3.1 Data dependencies

All required data hits existing endpoints. Where the response shape doesn't already include what we need, the addition is small and additive — not a new endpoint.

| Data | Source | Add needed? |
|---|---|---|
| `user.tier`, `user.is_coach`, `user.subscription_state` | `/api/auth/me`, already returned | No |
| Most recent triage session timestamp | `GET /api/sessions?limit=1` (existing) | No |
| Most recent training log timestamp | Preferred: add `last_training_log_at` field to `/api/auth/me` response (one extra `MAX(date) FROM training_logs WHERE user_id=$1` per `/me` call). Fallback if not added in this phase: `GET /api/training?limit=1` from the LearnHub mount. | Yes — preferred path adds one field to existing endpoint |
| Most recent Mathew message + unread flag (for coaching subs) | `GET /api/coach/thread` (existing) — already returns thread + messages | No |

### 3.2 Loading behavior

While focus-rule data is in flight on first paint, default to focus AI (the fallback). When data arrives, if the rule picks something else, smooth-transition to that option (one cross-fade, same motion as a manual tile switch). Users on fast networks see only the resolved state; slow-network users see one harmless flip, never a flash of wrong content.

### 3.3 Persisted-choice precedence

If `localStorage.coretriage_chat_view` is one of `'coach' | 'ai' | 'analyzer'`, that wins over the focus rule. The rule only runs when the key is missing OR equals the legacy `'picker'` value OR equals `'inbox'` (coach-only). This preserves "last picked view" for returning users.

## 4. Cinematic reveals — per option

Each reveal lives inside a 4:3 aspect-ratio canvas (`.reveal-canvas`) on the right side of the hero grid. Mobile: same canvas, full-width below the copy.

### 4.1 Budnik reveal

**Production:** a real portrait photo or short looped climbing clip of Budnik. The photo lives at `frontend/public/learn/budnik-portrait.{jpg,webm}` and is consumed via `<img>` or `<video autoplay muted loop playsinline>` depending on file type. The same media slot used by the landing-hero spec's §5 ("Built by Budnik") can be shared — one file, two consumers.

**Until assets land:** a styled placeholder — dashed terracotta border, portrait-aspect (3:4) frame, small camera glyph, label "Photo · pending upload", caption "Budnik · climbing portrait". A bottom-left corner caption ("V13 outdoor · Momentum Houston") gives the reveal a credibility anchor even without imagery.

**Coaching-subscriber variant:** the canvas swaps to show the most-recent Mathew message — single bubble, his avatar in the top-left, timestamp, and a "tap to open thread" affordance.

### 4.2 AI reveal

Looped animated conversation, ~14s cycle:

1. **400ms:** user-side bubble fades up: `"Should I rest an A2 pulley strain?"`
2. **1.4s:** typing-dots bubble appears (AI side)
3. **3.0s:** typing dots disappear; AI reply bubble appears empty
4. **3.0s → ~6s:** words stream into the reply at 70ms per word: `"Probably not full rest. Light hangs at 50% body weight, 10s on / 5s off, every other day. Pain stays under 3/10. Tape the finger H-style during climbs. If you hear a pop or it swells fast, see a hand specialist."`
5. **~6.5s:** source citation line fades in below the bubble: `▸ finger_pulley.md ▸ general_load_management.md`
6. **6.5s → 14s:** the conversation stays visible
7. **14s:** reset and loop

The example question is **A2 pulley strain** because it's the highest-frequency injury in the app's KB and the rehab guidance is concrete enough to demonstrate the AI's voice without being generic. The reply is hand-authored for the demo — it doesn't need to match what GPT-4o would actually return; it needs to *look like* a useful answer.

Reduced motion: skip the animation, show the final state (user bubble + AI reply + sources, all visible) on mount.

### 4.3 Analyzer reveal

**Production:** a short looped MP4/WebM of the actual Movement Analyzer running on a real climbing clip, with the on-device skeleton overlay visible. The same video slot the landing-hero spec specifies for its Movement tab (`frontend/public/landing/movement-loop.mp4`) can be reused — one file, two consumers.

**Until assets land:** a video-player frame chrome (black background, top-right "Video · pending upload" dashed tag, bottom timecode `0:08 / 0:24`, animated progress bar sweeping 12% ↔ 88% on a 6s loop, "Pose · 33 joints · on-device" caption) containing an animated SVG skeleton — 12 joints + bones in a climber pose, joints pulsing on staggered delays, whole figure swaying gently on a 4s ease-in-out loop.

The SVG skeleton is extracted as `frontend/src/components/learn/SkeletonOverlayAnimation.jsx` — shared with the landing-hero `MovementTabPane` per the landing-hero spec ([§Hero Movement tab](2026-05-25-landing-hero-redesign-design.md)). Two consumers, one component.

Reduced motion: static skeleton frame, no joint pulse, no sway, no progress bar.

## 5. Copy (setter voice)

Voice rules: terse, observational, concrete, imperative. No marketing claims. No "you'll love." No urgency words. Climber-to-climber, like a setter giving you beta.

### 5.1 Page chrome

| Element | Copy |
|---|---|
| Page title (top of main) | `Learn` |
| Page subtitle | `Three ways to get a read on your climbing.` |
| Bottom disclaimer | `Educational only — not a medical diagnosis. If symptoms are severe or worsening, seek professional evaluation.` |

### 5.2 Switcher tiles

| Tile | Icon | Title | Subline |
|---|---|---|---|
| Coach | AvatarChip "B" | `Budnik` | `Real coach. Your video.` |
| AI | `Sparkles` (lucide-react) | `Ask the AI` | `Climbing-trained. 5 free.` |
| Analyzer | `Activity` (lucide-react) | `Movement` | `Your beta, frame by frame.` |

Each tile is also a tag for what kind of feedback you get — *Real coach / AI / Movement.* Three kinds, three tiles.

### 5.3 Hero — Coach (focused, non-subscriber default)

| Slot | Copy |
|---|---|
| Eyebrow | `GET A READ · FROM A HUMAN` |
| Headline | `Send me a beta video.` |
| Body | `Beta breakdown. Return-to-climb calls. Plans shaped around your weaknesses.` |
| Meta | `Replies in 24–48h.` |
| CTA (anon) | `Sign in to apply` |
| CTA (free / pro) | `Apply — $89/mo →` |

### 5.4 Hero — Coach (coaching subscriber)

| Slot | Copy |
|---|---|
| Eyebrow | `GET A READ · FROM A HUMAN` |
| Headline | `Budnik replied yesterday.` *(relative time)* |
| Body | First 80 chars of most-recent Mathew message + `…` |
| Meta | *(omitted)* |
| CTA | `Open thread →` |

If the subscriber has no messages yet:

| Slot | Copy |
|---|---|
| Headline | `Send the first message.` |
| Body | `What are you working on? Send a clip if you've got one.` |
| CTA | `Open thread →` |

### 5.5 Hero — AI (focused)

| Slot | Copy |
|---|---|
| Eyebrow | `GET A READ · CLIMBING-TRAINED` |
| Headline | `Ask anything climbing.` |
| Body | `Climbing-specific knowledge base. Technique, training, injury triage, recovery — answered with sources.` |
| Meta | `5 free answers · then unlimited on trial.` |
| CTA | `Start chatting →` |

### 5.6 Hero — Analyzer (focused)

| Slot | Copy |
|---|---|
| Eyebrow | `GET A READ · FROM YOUR VIDEO` |
| Headline | `Upload a clip. See your shape.` |
| Body | `Frame-by-frame pose overlay on your climbing video. Runs on your device — no upload to a server.` |
| Meta | `BETA · <30s clips work best.` |
| CTA (anon) | `Sign in to analyze` |
| CTA (expired sub) | `Upgrade to analyze` |
| CTA (everyone else) | `Get started →` |

The "Runs on your device — no upload to a server" line is load-bearing — it's the privacy/credibility hook that other movement-analysis tools can't claim. Keep verbatim.

### 5.7 What's gone (vs current ChatPicker.jsx)

- `"How do you want to chat?"` header — replaced by the focused hero's own headline + the page subtitle.
- `"Both options stay available — pick whichever fits right now."` — gone. The switcher row says this visually.
- The 50-word body paragraphs on each card — collapsed to one switcher-tile line + a 2-line hero body when focused.
- `"Free trial"` / `"Coaching"` / `"Beta"` badges — replaced by inline meta lines (`5 free answers`, `Replies in 24–48h`, `BETA · <30s clips work best`). Badges are decoration; setter voice doesn't badge.

## 6. State machine + CTA matrix

### 6.1 CTAs by user state

| User state | Coach CTA | AI CTA | Analyzer CTA |
|---|---|---|---|
| Anonymous | `Sign in to apply` → `onLoginClick()` opens AuthModal | `Start chatting →` → AIChatView (5-free localStorage limit applies) | `Sign in to analyze` → `onLoginClick()` |
| Free (no sub) | `Apply — $89/mo →` → UpgradeModal(`trigger="coaching"`) | `Start chatting →` → AIChatView (5/day rate-limited) | `Get started →` → MovementAnalyzerView |
| Free in trial (first 14d) | `Apply — $89/mo →` → UpgradeModal(`trigger="coaching"`) | `Start chatting →` (unlimited during trial) | `Get started →` |
| Pro | `Apply — $89/mo →` → UpgradeModal(`trigger="coaching"`) | `Start chatting →` (unlimited) | `Get started →` |
| Coaching subscriber | `Open thread →` → CoachChatView; hero shows recent-message teaser | `Start chatting →` | `Get started →` |
| Trial expired | `Apply — $89/mo →` | `Start chatting →` (5/day limit returns) | `Upgrade to analyze` → UpgradeModal(`trigger="analyzer"`) |
| Budnik (coach role) | (LearnHub bypassed entirely → CoachInboxView) | n/a | n/a |

This matrix matches the existing tier-aware logic in [ChatPicker.jsx:26-34](../../../frontend/src/components/ChatPicker.jsx#L26) — same business rules, new framing.

### 6.2 Two-click model

Clicking a switcher **tile** changes focus (in-page, no navigation). Clicking the hero **CTA** enters the sub-view (or opens AuthModal / UpgradeModal). Two different actions, one component. The persisted `coretriage_chat_view` localStorage value is written on tile-click, not on CTA-click — so a user who explored several reveals before committing keeps the last reveal they looked at as their default next time.

**Behavior change vs current ChatPicker.jsx:** the current code persists the chosen view only when the user clicks a CTA and enters a sub-view ([ChatTab.jsx:43-50](../../../frontend/src/components/ChatTab.jsx#L43)). The new behavior persists on tile-click too. This is intentional — an "explorer" user who taps Coach, then AI, then Analyzer should land on Analyzer next time (their last expressed interest), not on whatever they last committed to weeks ago. Users who actively want to "reset" can tap a different tile on a return visit.

## 7. Motion

All timings sourced from [frontend/src/lib/motion.js](../../../frontend/src/lib/motion.js) constants — `DURATIONS.snap` (160ms), `DURATIONS.glide` (320ms), `EASE.decel`.

### 7.1 On page mount

1. Focus rule resolves → focused option determined
2. Hero panel fades + slides up 8px (`DURATIONS.glide`, `EASE.decel`)
3. Switcher tiles slide-up-fade-in with 60ms stagger (`DURATIONS.snap`)
4. Focused tile's border lights to terracotta at the same time its hero arrives — visual link
5. Focused tile's icon gets a one-time scale pulse (`DURATIONS.snap`, EASE settle)

### 7.2 On tile switch

1. Old hero content cross-fades out (`DURATIONS.snap`, ease-in)
2. New hero content cross-fades in (`DURATIONS.glide`, `EASE.decel`)
3. Old tile border fades from terracotta → hairline (`DURATIONS.snap`)
4. New tile border lights terracotta + icon pulses once (`DURATIONS.snap`)
5. `localStorage.setItem('coretriage_chat_view', <option>)`

### 7.3 Ambient (focused-tile idle)

The focused tile's icon: very subtle terracotta glow loop, 10% opacity oscillation on a 2.4s sine wave. Only the focused tile. Quiet, not blinky.

### 7.4 Reveal-internal motion

- **Coach:** photo glow ring oscillates on a 2.4s sine (or video autoplays muted loop if `<video>`)
- **AI:** the 14s conversation loop per §4.2
- **Analyzer:** skeleton joints pulse on staggered delays; whole figure sways on a 4s ease-in-out; bottom progress bar sweeps 12% ↔ 88% on a 6s loop; timecode updates (if real video) or stays at `0:08 / 0:24` (placeholder)

### 7.5 Reduced motion (`prefers-reduced-motion: reduce`)

- All transitions → 0ms
- Cycling AI conversation → freezes on the final state (user msg + AI reply + sources visible)
- Analyzer skeleton → static frame, no joint pulse, no sway, no progress bar
- Coach reveal → no glow ring oscillation
- Icon pulse → no-op
- Page mount = instant final state

The existing global `@media (prefers-reduced-motion: reduce)` rule in [frontend/src/index.css](../../../frontend/src/index.css) plus the `<MotionConfig reducedMotion="user">` wrapper in [main.jsx](../../../frontend/src/main.jsx) handle most of this automatically; the reveal-internal CSS animations need explicit `animation-duration: 0` overrides.

## 8. Accessibility

- Switcher tiles: `<button role="tab">` inside a `<div role="tablist">`
- Arrow Left / Arrow Right cycles focus through tiles (wraps); Enter / Space activates
- Hero panel gets `role="tabpanel"` with `aria-labelledby` pointing to the active tile's id
- Active tile carries `aria-selected="true"`, others `aria-selected="false"`
- Cinematic-reveal SVGs and the photo placeholder have `aria-hidden="true"` (decorative)
- AI streaming reply: the final reply text is in a visually-hidden `aria-live="polite"` region so screen readers hear it once when the streaming completes (not per-word, which would be unbearable)
- Bottom disclaimer: standard text, no aria needed
- Color contrast: every text-on-color pairing passes WCAG AA against forest-deep background — cream on `#243530` clears 12:1, cream-soft on `#243530` clears 8.7:1
- Keyboard tab order: page header → switcher tile 1 → tile 2 → tile 3 → hero CTA → disclaimer

## 9. Design tokens and primitives — reuses, does not invent

The redesign uses only what already exists on `main`. No new tokens, no new primitives.

- **Colors:** `ct-forest`, `ct-forest-deep`, `ct-forest-soft`, `ct-cream`, `ct-cream-soft`, `ct-moss`, `ct-hairline`, `ct-rim`, `ct-terracotta`, `ct-terra-soft`, `ct-terra-tint` (from [frontend/tailwind.config.js](../../../frontend/tailwind.config.js))
- **Type scale:** `.ct-eyebrow`, `.ct-title`, `.ct-display`, `.ct-body`, `.ct-body-soft`, `.ct-meta` (from [frontend/src/index.css](../../../frontend/src/index.css))
- **Surfaces:** `.ct-surface-hero` for the hero panel, `.ct-surface` for switcher tiles
- **Buttons:** `.btn-primary` for hero CTAs
- **Primitives:** `<Surface>` (existing), `<AvatarChip>` (existing) — for the Coach tile icon
- **Motion vocabulary:** `DURATIONS.snap`, `DURATIONS.glide`, `EASE.decel` from `lib/motion.js`
- **Icons:** `BookOpen` (sidebar), `Sparkles` (AI tile), `Activity` (Analyzer tile) — all already imported elsewhere via `lucide-react`

## 10. Files affected

### 10.1 New files

| Path | Purpose | LOC est. |
|---|---|---|
| `frontend/src/components/learn/LearnHub.jsx` | Orchestrator. Replaces `ChatPicker.jsx`. Holds focused-option state, renders hero + switcher row. | ~120 |
| `frontend/src/components/learn/LearnRevealCoach.jsx` | Cinematic reveal for Coach. Default copy + portrait slot, OR recent-message teaser for coaching subs. | ~80 |
| `frontend/src/components/learn/LearnRevealAI.jsx` | Cinematic reveal for AI. Animated conversation loop per §4.2. | ~120 |
| `frontend/src/components/learn/LearnRevealAnalyzer.jsx` | Cinematic reveal for Analyzer. Video frame chrome + shared SVG skeleton. | ~70 |
| `frontend/src/components/learn/LearnSwitcherTile.jsx` | One tile primitive, three usages. | ~70 |
| `frontend/src/components/learn/SkeletonOverlayAnimation.jsx` | Shared animated SVG skeleton, also consumed by landing-hero `MovementTabPane`. | ~110 |
| `frontend/src/hooks/useLearnFocus.js` | Pure-function hook: returns focused option given user + recent-activity inputs. | ~50 |
| `frontend/src/components/learn/__tests__/useLearnFocus.test.js` | Unit tests for every focus-rule branch. | ~140 |
| `frontend/public/learn/.gitkeep` | Placeholder dir for Budnik portrait + Analyzer demo video assets | 0 |

### 10.2 Modified files

| Path | Change |
|---|---|
| `frontend/src/components/ChatTab.jsx` | Swap `import ChatPicker` for `import LearnHub`. Treat legacy `'picker'` localStorage value as "no persisted choice" for migration. |
| `frontend/src/App.jsx` | Sidebar nav: relabel `Chat` → `Learn`, swap icon `MessageSquare` → `BookOpen`. |

### 10.3 Deleted files

| Path | Reason |
|---|---|
| `frontend/src/components/ChatPicker.jsx` | Replaced by `learn/LearnHub.jsx`. |

### 10.4 Unchanged (preservation contract)

- `AIChatView.jsx`, `CoachChatView.jsx`, `CoachInboxView.jsx`, `MovementAnalyzerView.jsx` — all sub-views untouched
- `UpgradeModal.jsx`, `AuthModal.jsx` — unchanged
- All backend (`main.py`, `database.py`, `src/*.py`) — zero changes
- No new env vars, no migrations, no API contract changes

## 11. Media slots — capture list

Each slot ships as a styled placeholder until a real asset lands. Placeholders use the same dashed-terracotta convention the landing-hero spec uses. Each slot is one `<img>` / `<video>` swap when ready.

| Slot | Type | Location | Aspect | Notes |
|---|---|---|---|---|
| L1 | photo or video | Coach reveal canvas | 3:4 portrait | Climbing portrait or short looped clip. Can share landing-hero §5 headshot. |
| L2 | video | Analyzer reveal canvas | 4:3 | Real Movement Analyzer running on a climbing clip with on-device skeleton overlay. **Share with landing-hero §Hero Movement tab** (`frontend/public/landing/movement-loop.mp4`) — one file, two consumers. |

Storage: `frontend/public/learn/` for Learn-specific assets; shared assets live in `frontend/public/landing/` and the Learn components import them from there.

## 12. Acceptance criteria

The redesign is done when:

1. Sidebar label reads `Learn`, icon is `BookOpen`, route `/chat` still resolves
2. First paint, signed-in user: exactly one option's reveal is in focus, picked by the focus rule (verifiable via the matrix in §3)
3. First paint, anonymous user: Analyzer reveal in focus
4. Coach role: bypasses LearnHub entirely → CoachInboxView (current behavior preserved)
5. Coaching subscriber: Coach reveal shows recent-message teaser if a message exists; default copy if not
6. Tile click: hero cross-fades to that option's reveal; tile border lights terracotta; `coretriage_chat_view` localStorage key updated
7. Hero CTA click: transitions to the appropriate sub-view (or opens AuthModal / UpgradeModal per §6.1 matrix)
8. Deep-link compat: navigating to `/chat` with `localStorage.coretriage_chat_view === 'analyzer'` (from landing-hero welcome panel) focuses Analyzer
9. Legacy compat: `localStorage.coretriage_chat_view === 'picker'` is treated as "no persisted choice" — focus rule runs
10. Keyboard: Arrow-Left/Right cycles switcher focus, Enter activates tile, Tab moves to hero CTA
11. Reduced motion: zero transitions, conversation/skeleton animations frozen on the final state
12. Mobile: switcher row becomes horizontal snap-scroll; tap-to-focus works
13. Shared SVG: `SkeletonOverlayAnimation` renders identically in `LearnRevealAnalyzer` and landing-hero `MovementTabPane` (visual diff = zero)
14. No backend changes: `git diff main..feature -- 'main.py' 'src/' 'database.py' 'kb/'` is empty
15. `useLearnFocus` unit tests cover all 7 priority branches in §3 + the anonymous case + the trial-expired edge case

## 13. Out of scope

- Renaming the `/chat` URL to `/learn` (depends on whether you want indefinite deep-link compat)
- `BookOpen` favicon / browser-tab title change
- Coach-side experience changes (CoachInboxView is unchanged)
- Per-option onboarding tutorials inside the sub-views
- Renaming the `coretriage_chat_view` localStorage key (kept as-is to avoid logging users out of their last-picked view)
- Telemetry on which option gets focused (worth adding later; not blocking)
- A separate Learn route under `/learn` (could come later)
- AI conversation example becoming dynamic (rotating example questions in the AI reveal) — current spec hard-codes the A2 example, which is the highest-impact single demonstration

## 14. Open questions

None blocking. Two to revisit after first render:

1. **A2 vs other example question for the AI reveal.** Hard-coded to A2 pulley because it's the highest-frequency injury in the KB. If user feedback says it's too narrow, swap to a rotation of 3–4 prompts (technique, injury, training, finger anatomy) on a longer cycle.
2. **Coaching-subscriber recent-message teaser format.** Spec shows "Budnik replied yesterday" + first 80 chars. Could be richer (his AvatarChip + message preview + timestamp + unread-dot). Revisit when the variant is live and we see it in practice.
