# CoreTriage — Phase 0: Design System Foundation

**Date:** 2026-06-09
**Status:** Direction approved (via visual mockups). Pending spec sign-off → implementation plan.
**Scope:** Frontend only. No backend changes.

---

## 1. Why this exists

CoreTriage accreted several UI iterations. Three visual systems are live at once — a dark **forest** Tailwind theme (`tailwind.config.js`), a warm **paper/ink** token set (`brand-tokens.css`), and inline per-tier CSS variables — plus leftovers from a first-iteration **blue/teal** theme. New work was added *beside* old work instead of replacing it ("stacking UIs"; e.g. the new Pentagon strip rendered directly above the legacy `HubHero` on the same page). The information architecture compounds it: Hub, Train, and Progress all present "progression," and Chat bundles three unrelated tools.

**Phase 0 establishes ONE design system (tokens + primitives) and ONE information architecture, then migrates the whole app onto them — deleting the old as it goes.** This is the foundation that makes later work (the Pentagon loop, the supplement flows) impossible to "stack." It is not a feature phase.

**Product spine (context, not built here):** an all-in-one climbing *progression* app. The Pentagon skill-card is the centerpiece — it diagnoses what kind of climber you are and prescribes the gaps. Triage, coaching, and movement analysis are supplements. Phase 1 builds the Pentagon diagnose→prescribe loop; Phase 2 cleans up the supplements. Phase 0 is foundation only.

---

## 2. Visual direction — "Almanac"

A parchment, editorial **field-guide / newspaper** aesthetic: warm, outdoorsy, clean, fun. Print craft is the differentiator that keeps it from reading as generic: paper grain, registration marks, hairline rules, box-score data treatment, occasional handwritten annotations, and a foil "prestige" gradient for rare moments.

---

## 3. Design tokens (single source of truth)

### Surfaces
| Token | Hex | Use |
|---|---|---|
| `paper` | `#e7ddc6` | App background |
| `side` | `#e0d4b6` | Sidebar surface |
| `card` | `#f4ecdb` | Cards / panels |
| `edge` | `#bcae8a` | Card borders |
| `hairline` | `rgba(42,39,34,0.13)` | Internal dividers |

### Ink (text)
| Token | Hex | Use |
|---|---|---|
| `ink` | `#2a2722` | Primary text (warm charcoal — **not** green) |
| `ink-soft` | `#5f594c` | Secondary text |
| `ink-muted` | `#8d8472` | Mono labels, meta |
| `cream` | `#fdf6ea` | Text on clay/colored fills |

### Accents
| Token | Hex | Use |
|---|---|---|
| `clay` | `#c58a77` | **The** primary action / active-nav color |
| `clay-deep` | `#b06a4f` | Pressed / emphasis |
| `ochre` | `#d7ac5b` | Warm highlight, XP |
| `sage` | `#97a886` | Calm/positive |
| `sage-deep` | `#5f7a4e` | Sage text |
| `foil` | `linear-gradient(135deg,#b88a3a,#c75e3a,#7a4a8e,#2f4ea8,#b88a3a)` | Prestige only (PRs, tier-ups) — used sparingly |

### Skill colors — **semantic; the same color everywhere a skill appears**
| Skill | Hex |
|---|---|
| Power | `#b85c44` (brick) |
| Crimp | `#c79a3c` (ochre) |
| Dynamic | `#5f87a0` (slate) |
| Technique | `#7f9466` (sage) |
| Mobility | `#a06f8a` (plum) |

Used in: Pentagon (spokes, vertices, labels, values), the box-score stat line, style tags on logged climbs, and anywhere a skill is named. **Not** used as decorative nav coloring (tried and rejected — it competes with the semantic meaning).

---

## 4. Typography

| Role | Family | Notes |
|---|---|---|
| Display / headlines | **Fraunces** (serif) | Optical sizing; italic for sub-identity lines |
| Body / UI | **Inter** | |
| Labels / data / eyebrows / stat lines | **JetBrains Mono** | Uppercase + tracked for eyebrows |
| Hand annotations (sparing) | **Caveat** | e.g. "shore this up →" |

Type scale carried from `brand-tokens.css` (`display-xl` `clamp(2.5rem,5vw,3.4rem)` → `mono-meta` `0.75rem`). Decision for the plan: Google Fonts vs self-host (perf).

---

## 5. Texture & motifs

- **Newspaper grain:** a fine print-dot base (`radial-gradient`, 3px tile) **plus** an organic SVG turbulence overlay (~0.2 opacity, `mix-blend-mode: multiply`) over the whole page including cards. Must be visibly present.
- **Registration crosshairs** at corners of prestige/field-card surfaces.
- **Hairline rules** + **box-score** stat rows (mono, divided cells, skill-colored).
- **Eyebrow** labels (mono, uppercase, tracked).

---

## 6. Core primitives

A primitive library already exists on the old dark theme (`src/components/ui/`: `Surface`, `StatRadar`, `LevelMeter`, `StreakEmblem`, `TierBadge`, `Eyebrow`, logging components; plus `lib/` reward/XP/quest/stats engines). **Re-tokenize these to Almanac where possible; don't rebuild from scratch.** Consolidate the two competing Pentagon implementations (`ui/StatRadar` + `lib/stats` vs the newer `Pentagon` + `me-state`) into one.

| Primitive | Purpose |
|---|---|
| Token layer | Tailwind config + CSS vars — the source of truth |
| `Surface` / `Card` | Parchment card: edge, grain, shadow |
| `Eyebrow` | Mono uppercase section label |
| `Tag` / `SkillTag` | Chip; `SkillTag` maps skill → its color |
| `Button` | Primary (clay), ghost; sizes |
| `StatScoreLine` | Box-score mono stat row, skill-colored |
| `Pentagon` | Radar: skill-colored spokes/vertices/labels/values, weak-axis emphasis, empty state. Mini variant = specimen emblem |
| `SpecimenCard` | Mini Pentagon + name + level/XP meter (sidebar identity) |
| `FieldCard` | Identity hero: Fraunces identity line + Pentagon + score line + Rx cue + annotation |
| `AppShell` | Sidebar (brand · specimen · nav · week dots · coaching CTA · footer) + header (title · dateline · streak · "+ Log" · account) + content. Responsive: mobile bottom nav |
| `Nav` | Clay active "stamp", neutral inactive; full `Dumbbell` icon for Train |
| `ListRow` | Grade + `SkillTag` + meta (recent sends, etc.) |
| `InfoCard` | Rx / quest card variants |
| `LevelMeter`, `StreakIndicator`, `WeekDots` | Gamification atoms |
| Toast / overlay | PR / award / tier styling in-language (Phase 1 deepens) |

---

## 7. Information architecture

**Five primary tabs, one job each:**

| Tab | Job | Contains |
|---|---|---|
| **Home** | Who you are + today | Field card (Pentagon), today's Rx, quest, streak, recent activity |
| **Train** | Do the work | Log climbs/sessions, training plans. Global **"+ Log a climb"** lives here |
| **Progress** | The record | Grade pyramid, tiers/XP, Pentagon-over-time, awards, leaderboard, history |
| **Coach** | Get help & feedback | AI assistant, 1:1 human coaching, movement analysis |
| **Recover** | When you're hurt | Triage + rehab. Auto-surfaces on Home when an injury is active |

- **Secondary** (not in primary nav): Settings, About, legal → account menu / footer.
- **Global action:** "+ Log a climb" in the header on every tab.
- **Chrome:** parchment sidebar (desktop) + 5-tab bottom nav (mobile); clay active state.

**Where today's scattered pieces land:** Triage → Recover · Awards/Leaderboard/Pyramid/History/Pentagon-timeline → Progress · Movement analyzer → Coach · Settings/About → account menu.

---

## 8. Migration scope (what Phase 0 actually changes)

1. Replace the dark-forest theme entirely (`ct-forest`/`ct-cream`/bg `#1c2520`, etc.) with Almanac tokens.
2. Remove first-iteration blue/teal remnants (`accent #14b8a6`, `accent2 #fb7185`, cold casts).
3. Unify the two palettes (`brand-tokens.css` paper/ink + Tailwind forest) into one token set; retire inline tier-color vars in favor of tokens.
4. Remove hardcoded color literals (e.g. the repeated `rgba(217,119,87,…)` terracotta inline in `App.jsx`) in favor of tokens.
5. Delete confirmed-dead components (orphan Hub cards: `HubStyleMixCard`, `HubGreeting`, `HubProjectCard`, `HubRingsCard`, `HubFeedCard`, `HubTipCard`, `HubWeekStrip`; dead `RehabTab`) — verify zero imports before deleting.
6. Re-tokenize existing `ui/` primitives to Almanac.
7. Rebuild `AppShell` (sidebar + header + nav) and apply it across all routes; rename Hub → Home; restructure to the new 5-tab IA; fold Chat's sub-views into Coach.

---

## 9. Non-goals (later phases)

- **Phase 1:** Pentagon diagnose→prescribe logic, Home content redesign, the progression/quest/XP loop deepening.
- **Phase 2:** triage→recover seam, coaching + movement-analysis flow cleanup.
- **Backend:** no changes. The data model is solid; `me-state` / `pentagon-snapshots` already feed the field card.

---

## 10. Success criteria

- One token source. `grep` finds **zero** references to old forest / teal / blue palettes.
- Every route renders inside the Almanac shell; no screen mixes old + new styles.
- Nav = 5 tabs, each owning one job; "+ Log" global.
- Dead components removed; `npm run build` and `npm test` pass.
- Visual smoke check: Home, Train, Progress, Coach, Recover all read as one product.

---

## 11. Open questions / assumptions

- **Mobile** keeps a 5-tab bottom nav (matches current). _Assume yes._
- **Dark mode** is out of scope — Almanac is a single light theme. _Assume yes._
- **Fonts:** Google Fonts vs self-host — decided in the implementation plan (perf trade-off).
