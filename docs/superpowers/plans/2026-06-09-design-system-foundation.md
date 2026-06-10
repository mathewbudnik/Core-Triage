# Phase 0 — Design System Foundation (Almanac) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire CoreTriage frontend onto one design system — the parchment "Almanac" aesthetic — and one information architecture (5 tabs), removing every trace of the old dark-forest / teal-blue / inline-terracotta UI.

**Architecture:** The app is built on Tailwind `ct-*` color tokens + `.ct-*` utility classes in `index.css` (125 files use them). The migration's leverage is to **remap the token *values*** (forest→paper, cream→ink, terracotta→clay) so those 125 files re-skin automatically, then (a) build the new shell + primitives, (b) restructure routing/IA, (c) sweep the 64 files that hardcode old hex literals, (d) verify with a grep gate that no old palette remains. Spec: `docs/superpowers/specs/2026-06-09-design-system-foundation-design.md`. Approved visual source of truth: the mockups in `.superpowers/brainstorm/74748-1781060608/content/` (esp. `refined-shell-v2.html`, `sidebar-final-v2.html`).

**Tech Stack:** React 18 + Vite, Tailwind CSS, framer-motion, lucide-react, react-router-dom. Fonts: Fraunces / Inter / JetBrains Mono / Caveat.

**Verification model:** This is a visual migration, so unit tests cover only the bits with logic (skill-color map, Pentagon geometry, IA route table). Everything else is verified by `npm run build`, `npm run lint`, a **grep gate** (zero old-palette references), and a per-tab visual smoke check. Commit after every task.

---

## Canonical token mapping (the heart of the migration)

Every later task references this table. "Legacy token" = existing Tailwind/CSS name; "Almanac value" = its new hex.

| Legacy token / literal | Old value | → Almanac value | Almanac role |
|---|---|---|---|
| `ct.forest`, `bg`, body bg | `#1c2520` | `#e7ddc6` | `paper` (app bg) |
| `ct.forest-deep`, `panel` | `#243530` | `#f4ecdb` | `card` |
| `ct.forest-soft`, `panel2` | `#1f2924` | `#e0d4b6` | `side` (sidebar) |
| `ct.cream`, `text` | `#f0f5ed` | `#2a2722` | `ink` (primary text) |
| `ct.cream-soft` | `#c8d3c4` | `#5f594c` | `ink-soft` |
| `ct.moss`, `muted` | `#95a698` | `#8d8472` | `ink-muted` |
| `ct.hairline` | `rgba(230,237,228,0.10)` | `rgba(42,39,34,0.13)` | `hairline` |
| `ct.rim`, `outline` | `rgba(230,237,228,0.18)` | `#bcae8a` | `edge` (card border) |
| `ct.terracotta`, `accent` | `#d97757` / `#14b8a6` | `#c58a77` | `clay` (primary action) |
| `ct.terra-soft` | `#f0a875` | `#b06a4f` | `clay-deep` |
| `accent2` | `#fb7185` | `#97a886` | `sage` |
| `accent3` | `#fbbf24` | `#d7ac5b` | `ochre` |
| (new) | — | `#fdf6ea` | `cream` (text ON clay/colored fills) |
| (new) | — | `#5f7a4e` | `sage-deep` |
| `ct.terra-tint` | `rgba(217,119,87,0.06)` | `rgba(197,138,119,0.10)` | `clay-tint` |

**Skill colors (new, semantic):** `power #b85c44` · `crimp #c79a3c` · `dynamic #5f87a0` · `technique #7f9466` · `mobility #a06f8a`.

**Critical nuance — inverse text:** in the old dark theme `text-ct-cream` meant "light text on dark." After remap, `ct-cream→ink` makes it dark text on light surfaces, which is *correct everywhere except on colored fills* (clay buttons, the active nav, badges). Those specific spots must switch from `text-ct-cream` to the new `text-cream` (`#fdf6ea`). Task 13's grep finds them: `grep -rn "text-ct-cream" | grep -iE "bg-ct-terracotta|bg-clay|btn-primary|active"`.

---

## Task 1: Almanac token layer (Tailwind config)

**Files:** Modify `frontend/tailwind.config.js`

- [ ] **Step 1: Replace the `theme.extend.colors` and related blocks** using the mapping table.

```js
// tailwind.config.js — theme.extend
fontFamily: {
  serif:  ['Fraunces', 'Georgia', 'serif'],
  sans:   ['Inter', '-apple-system', 'sans-serif'],
  mono:   ['JetBrains Mono', 'ui-monospace', 'monospace'],
  script: ['Caveat', 'cursive'],
},
colors: {
  // Almanac surfaces / ink
  bg:     '#e7ddc6',  paper:  '#e7ddc6',
  side:   '#e0d4b6',
  panel:  '#f4ecdb',  card:   '#f4ecdb',
  panel2: '#efe6d2',
  text:   '#2a2722',  ink:    '#2a2722',
  muted:  '#8d8472',
  cream:  '#fdf6ea',          // text on colored fills
  // accents (legacy names remapped so existing usages flip correctly)
  accent:  '#c58a77',  accent2: '#97a886',  accent3: '#d7ac5b',
  clay:    '#c58a77',  'clay-deep': '#b06a4f',
  ochre:   '#d7ac5b',  sage: '#97a886', 'sage-deep': '#5f7a4e',
  ct: {
    forest:        '#e7ddc6',
    'forest-deep': '#f4ecdb',
    'forest-soft': '#e0d4b6',
    cream:         '#2a2722',   // NB: now ink — see "inverse text" nuance
    'cream-soft':  '#5f594c',
    moss:          '#8d8472',
    hairline:      'rgba(42,39,34,0.13)',
    rim:           '#bcae8a',
    edge:          '#bcae8a',
    terracotta:    '#c58a77',
    'terra-soft':  '#b06a4f',
    'terra-tint':  'rgba(197,138,119,0.10)',
  },
  // semantic skill colors
  skill: {
    power: '#b85c44', crimp: '#c79a3c', dynamic: '#5f87a0',
    technique: '#7f9466', mobility: '#a06f8a',
  },
  // keep tier tokens referenced by lib/tier.js (re-paletted in Task 6)
},
borderColor: { outline: 'rgba(42,39,34,0.13)' },
boxShadow: {
  glow:        '0 0 24px rgba(197,138,119,0.22)',
  'glow-coral':'0 0 24px rgba(176,106,79,0.22)',
  'glow-gold': '0 0 24px rgba(215,172,91,0.20)',
},
backgroundImage: {
  'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  'ct-foil': 'linear-gradient(135deg, #b88a3a, #c75e3a, #7a4a8e, #2f4ea8, #b88a3a)',
},
// keep existing animation/keyframes block unchanged
```

- [ ] **Step 2: Verify build compiles.** Run `cd frontend && npm run build`. Expected: success (it may still look wrong until index.css — Task 2 — lands; that's fine).
- [ ] **Step 3: Commit.** `git add frontend/tailwind.config.js && git commit -m "feat(design): Almanac color tokens in Tailwind config"`

---

## Task 2: Base layer + `.ct-*` utilities (index.css)

**Files:** Modify `frontend/src/index.css`

- [ ] **Step 1: Update `@layer base`** — `:root` accent vars, body, scrollbars.

```css
@layer base {
  :root { --color-accent:#c58a77; --color-accent2:#97a886; --color-accent3:#d7ac5b; }
  * { box-sizing: border-box; }
  html, body { touch-action: manipulation; overscroll-behavior: none; -webkit-text-size-adjust:100%; -webkit-tap-highlight-color: transparent; }
  body {
    background-color:#e7ddc6; color:#2a2722;
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    -webkit-font-smoothing:antialiased;
    /* newspaper print-dot base */
    background-image: radial-gradient(circle, rgba(42,39,34,0.05) 0.5px, transparent 0.6px);
    background-size: 3px 3px;
  }
  /* organic grain overlay — fixed, covers viewport, multiply */
  body::before {
    content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
    opacity:0.18; mix-blend-mode:multiply;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");
  }
  #root { position:relative; z-index:1; }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:#e0d4b6; }
  ::-webkit-scrollbar-thumb { background:rgba(42,39,34,0.18); border-radius:3px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(197,138,119,0.6); }
}
```

- [ ] **Step 2: Update `@layer components`** — buttons, surfaces, typography. Note `btn-primary` now uses `text-cream` (light) not `text-ct-cream` (now ink).

```css
@layer components {
  .input-base { @apply w-full bg-card border border-ct-rim rounded-lg px-3 py-2 text-ink text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-clay focus:border-clay transition-colors duration-200; }
  .btn-primary { @apply px-5 py-2.5 rounded-lg font-semibold text-sm text-cream bg-clay hover:brightness-105 active:brightness-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed; box-shadow:0 2px 0 #b06a4f; }
  .btn-secondary { @apply px-4 py-2 rounded-lg font-medium text-sm text-ink bg-card border border-ct-rim hover:border-clay/50 hover:text-clay-deep transition-all duration-200; }
  .btn-danger { @apply px-4 py-2 rounded-lg font-medium text-sm text-red-700 bg-card border border-ct-rim hover:border-red-500/40 hover:bg-red-500/10 transition-all duration-200; }
  .card { @apply ct-surface p-5 transition-all duration-300; }
  .label { @apply block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide; font-family:'JetBrains Mono',monospace; }

  .ct-eyebrow  { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:#8d8472; }
  .ct-title    { font-family:'Fraunces',serif; font-size:16px; font-weight:600; letter-spacing:-0.01em; color:#2a2722; }
  .ct-display  { font-family:'Fraunces',serif; font-size:34px; font-weight:600; letter-spacing:-0.02em; line-height:1.02; color:#2a2722; }
  .ct-stat-num { font-family:'JetBrains Mono',monospace; font-size:24px; font-weight:600; letter-spacing:-0.01em; color:#b06a4f; font-variant-numeric:tabular-nums; }
  .ct-body     { font-size:13px; color:#2a2722; line-height:1.5; }
  .ct-body-soft{ font-size:12px; color:#5f594c; line-height:1.55; }
  .ct-meta     { font-family:'JetBrains Mono',monospace; font-size:10px; color:#8d8472; letter-spacing:0.05em; }
  .ct-tnum     { font-variant-numeric:tabular-nums; }

  .ct-surface      { @apply border border-ct-rim rounded-lg; background-color:#f4ecdb; box-shadow:0 4px 14px rgba(42,39,34,0.07); }
  .ct-surface-hero { @apply border rounded-lg; border-color:#bcae8a; background-color:#f4ecdb; box-shadow:0 8px 22px rgba(42,39,34,0.10); }
  .ct-surface-flat { @apply border border-ct-hairline rounded-md; background-color:#efe6d2; }
}
```

- [ ] **Step 3: Build + eyeball.** `cd frontend && npm run dev`, open `/`, confirm parchment background + grain + dark text. Run `npm run build`. Expected: success.
- [ ] **Step 4: Commit.** `git commit -am "feat(design): Almanac base layer + .ct-* utilities + grain"`

---

## Task 3: Fonts + splash (index.html)

**Files:** Modify `frontend/index.html`

- [ ] **Step 1: Swap the Google Fonts link** to add Inter + JetBrains Mono:

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Caveat:wght@500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Re-skin the splash** — replace the dark `#0b1220`/teal splash with parchment + clay. In the inline `<style>`: `body` background `#e7ddc6` color `#2a2722`; `.ct-splash` background `#e7ddc6`; `.ct-wordmark` gradient → `linear-gradient(90deg,#b85c44,#c58a77,#d7ac5b)`; `.ct-spinner` border `rgba(42,39,34,0.15)` / border-top `#c58a77`. Update `<meta name="theme-color">` to `#e7ddc6`.
- [ ] **Step 3: Build + verify splash** shows parchment, not dark blue. `npm run build`.
- [ ] **Step 4: Commit.** `git commit -am "feat(design): Almanac fonts + splash screen"`

---

## Task 4: Skill-colors module

**Files:** Create `frontend/src/lib/skills.js`, `frontend/src/lib/skills.test.js`

- [ ] **Step 1: Write the failing test.**

```js
import { describe, it, expect } from 'vitest'
import { SKILLS, SKILL_KEYS, skillColor, skillLabel } from './skills'
describe('skills', () => {
  it('has the 5 canonical skills in order', () => {
    expect(SKILL_KEYS).toEqual(['power','crimp','dynamic','technique','mobility'])
  })
  it('maps each skill to its locked color', () => {
    expect(skillColor('power')).toBe('#b85c44')
    expect(skillColor('mobility')).toBe('#a06f8a')
  })
  it('is case-insensitive and falls back to ink for unknown', () => {
    expect(skillColor('POWER')).toBe('#b85c44')
    expect(skillColor('nope')).toBe('#2a2722')
  })
  it('labels are title-case', () => { expect(skillLabel('crimp')).toBe('Crimp') })
})
```

- [ ] **Step 2: Run, verify fail.** `cd frontend && npx vitest run src/lib/skills.test.js` → FAIL (module missing).
- [ ] **Step 3: Implement.**

```js
// src/lib/skills.js — single source of truth for the 5 climbing skills + colors
export const SKILLS = {
  power:     { key:'power',     label:'Power',     color:'#b85c44' },
  crimp:     { key:'crimp',     label:'Crimp',     color:'#c79a3c' },
  dynamic:   { key:'dynamic',   label:'Dynamic',   color:'#5f87a0' },
  technique: { key:'technique', label:'Technique', color:'#7f9466' },
  mobility:  { key:'mobility',  label:'Mobility',  color:'#a06f8a' },
}
export const SKILL_KEYS = ['power','crimp','dynamic','technique','mobility']
const INK = '#2a2722'
export function skillColor(key) { return SKILLS[String(key||'').toLowerCase()]?.color ?? INK }
export function skillLabel(key) { return SKILLS[String(key||'').toLowerCase()]?.label ?? '' }
```

- [ ] **Step 4: Run, verify pass.** `npx vitest run src/lib/skills.test.js` → PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat(design): skill-colors module (semantic source of truth)"`

---

## Task 5: Re-palette tier tokens (kill remaining neon teal/blue)

**Files:** Modify `frontend/src/lib/tier.js` (`TIER_TOKENS` only)

The Bronze→Diamond tier ladder currently uses neon jewel hexes (teal `#14b8a6`, sapphire `#3b82f6`, etc.) that reintroduce the "blue/teal" the user removed. Re-palette to muted, Almanac-harmonious jewel tones. **Names, keys, and structure unchanged** — only the three hexes per tier.

- [ ] **Step 1: Replace `TIER_TOKENS` values** with muted equivalents (keep `{light,c,deep}` shape). Use earthy, desaturated stone tones that read against parchment, e.g. `rookie` warm-stone `{light:'#d9cdb8',c:'#b3a589',deep:'#6b6149'}`, and so on through `v10`. Keep adjacent-tier contrast. (Executor: pick muted analogues of each named stone; verify none are pure teal/blue/neon.)
- [ ] **Step 2: Grep guard.** `grep -nE "#14b8a6|#3b82f6|#22c55e|#8b5cf6|#67e8f9|#ec4899" src/lib/tier.js` → no matches.
- [ ] **Step 3: Build.** `npm run build` → success.
- [ ] **Step 4: Commit.** `git commit -am "feat(design): mute tier palette to Almanac range"`

---

## Task 6: Primitives — Eyebrow, Button, SkillTag, StatScoreLine

**Files:** Modify `frontend/src/components/ui/Eyebrow.jsx`; Create `frontend/src/components/ui/Button.jsx`, `SkillTag.jsx`, `StatScoreLine.jsx`. `Surface.jsx` needs no change (inherits via `.ct-surface`).

- [ ] **Step 1: Eyebrow** already uses `.ct-eyebrow` (now mono/ink-muted via Task 2) — no code change; just confirm it renders mono uppercase. No commit needed for Eyebrow alone.
- [ ] **Step 2: Button** — `src/components/ui/Button.jsx`:

```jsx
const VARIANT = {
  primary:   'text-cream bg-clay hover:brightness-105 active:brightness-95 shadow-[0_2px_0_#b06a4f]',
  secondary: 'text-ink bg-card border border-ct-rim hover:border-clay/50 hover:text-clay-deep',
  ghost:     'text-ink-soft hover:bg-[rgba(42,39,34,0.05)]',
}
export default function Button({ variant='primary', className='', as:Tag='button', ...rest }) {
  return <Tag className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 ${VARIANT[variant]} ${className}`} {...rest} />
}
```

- [ ] **Step 3: SkillTag** — `src/components/ui/SkillTag.jsx` (uses `skills.js`):

```jsx
import { skillColor, skillLabel } from '../../lib/skills'
export default function SkillTag({ skill, children, className='' }) {
  const c = skillColor(skill)
  return <span className={`inline-block font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded ${className}`}
    style={{ color:c, background:`color-mix(in srgb, ${c} 18%, transparent)` }}>{children ?? skillLabel(skill)}</span>
}
```

- [ ] **Step 4: StatScoreLine** — `src/components/ui/StatScoreLine.jsx` renders the box-score row (`POW 9 · CRMP 7 …`) with skill colors, dividers via hairline. Iterate `SKILL_KEYS`, abbreviations `{power:'POW',crimp:'CRMP',dynamic:'DYN',technique:'TEC',mobility:'MOB'}`, each `<span style={{color:skillColor(k)}}>`.
- [ ] **Step 5: Build + render in `/design-system`** (DEV route) — add the three new primitives to `DesignSystem.jsx` sections. `npm run build` → success.
- [ ] **Step 6: Commit.** `git commit -am "feat(design): Button, SkillTag, StatScoreLine primitives"`

---

## Task 7: Consolidate the Pentagon

**Files:** Modify `frontend/src/components/identity/Pentagon.jsx` (canonical); deprecate `ui/StatRadar.jsx` usages. Create `frontend/src/components/identity/Pentagon.geometry.test.js`.

There are two radar implementations (`identity/Pentagon` + `ui/StatRadar`). Make `identity/Pentagon` the single one: skill-colored spokes/vertices/labels/values, weak-axis emphasis, empty state, and a `size`/`mini` prop for the sidebar emblem. Pull exact geometry + colors from `.superpowers/brainstorm/74748-1781060608/content/refined-shell-v2.html` (the approved hero + mini emblem).

- [ ] **Step 1: Write geometry test** — pentagon vertex for `(axis index, value)` matches expected coords (top vertex at value 10 → `(100,20)` in the 200-box). Assert the 5 angles are 72° apart starting at -90°.
- [ ] **Step 2: Run → fail.** `npx vitest run src/components/identity/Pentagon.geometry.test.js`
- [ ] **Step 3: Implement** geometry helper + component (skill colors from `skills.js`, values at vertices, weak-axis ring highlight, `mini` variant без labels). Port markup from the mockup.
- [ ] **Step 4: Run → pass.** Then `grep -rl "StatRadar" src/` and repoint any live usage to `Pentagon`.
- [ ] **Step 5: Build + commit.** `git commit -am "feat(design): unified skill-colored Pentagon + mini emblem"`

---

## Task 8: AppShell — Sidebar

**Files:** Create `frontend/src/components/shell/Sidebar.jsx`, `SpecimenCard.jsx`, `NavItem.jsx`, `WeekDots.jsx`. Source markup: `sidebar-final-v2.html`.

- [ ] **Step 1: Build `SpecimenCard`** — mini `Pentagon` + name + level + XP bar (port from `sidebar-final-v2.html .sf-spec`). Props: `name`, `identity`, `level`, `xpInLevel`, `xpForNext`, `axes`.
- [ ] **Step 2: Build `NavItem`** — `to`, `icon`, `label`; active = clay stamp (`bg-clay text-cream` + reg-tick), inactive = `text-ink-soft hover:bg-[rgba(42,39,34,0.05)]`. Use `NavLink`.
- [ ] **Step 3: Build `WeekDots`** — 7 dots, filled (`bg-clay`) per active day.
- [ ] **Step 4: Build `Sidebar`** — brand wordmark (Fraunces), `SpecimenCard`, nav (the 5 `NavItem`s using lucide `Home, Dumbbell, TrendingUp, MessageCircle, Stethoscope`), `WeekDots`, coaching CTA, footer links. Use Almanac tokens; no inline old hex.
- [ ] **Step 5: Build + commit.** `git commit -am "feat(shell): Almanac sidebar (specimen, nav, week dots)"`

---

## Task 9: AppShell — Header, bottom nav, assembly

**Files:** Create `frontend/src/components/shell/Header.jsx`, `BottomNav.jsx`, `AppShell.jsx`. Modify `frontend/src/App.jsx` to render `AppShell` instead of the inline sidebar/header/nav.

- [ ] **Step 1: Header** — Fraunces page title + mono dateline (left); streak (lucide `Flame`) + "+ Log a climb" `Button` + account avatar (right); ochre hairline accent under. Port from `refined-shell-v2.html .v6-head`.
- [ ] **Step 2: BottomNav** (mobile) — the 5 tabs, clay active, lucide icons.
- [ ] **Step 3: AppShell** — composes `Sidebar` + `Header` + `<Outlet/>`/children + `BottomNav`. Move the toast/modal/award/promotion overlay JSX from `App.jsx` into here unchanged (re-tokenizing their inline hex in Task 13).
- [ ] **Step 4: Wire into `App.jsx`** — replace the giant inline `<aside>`/`<header>`/bottom-`<nav>` blocks (App.jsx ~lines 557-982) with `<AppShell>`. Keep the routing `<Routes>` (rewired in Task 10).
- [ ] **Step 5: Build + dev smoke** — every tab renders inside the parchment shell. `npm run build`.
- [ ] **Step 6: Commit.** `git commit -am "feat(shell): Almanac header + bottom nav + AppShell assembly"`

---

## Task 10: Information architecture (routes + tab rename)

**Files:** Modify `frontend/src/App.jsx` (TABS + Routes), create `frontend/src/components/CoachTab.jsx` (rename/replace `ChatTab`), `frontend/src/lib/nav.js` + `nav.test.js`.

- [ ] **Step 1: Write `nav.js` + test** — export `TABS` = `[{id:'home',label:'Home',icon:'Home'},{id:'train',...},{id:'progress',...},{id:'coach',...},{id:'recover',...}]` and `PRIMARY_TAB_IDS`. Test asserts exactly these 5 ids in order and that each has a label+icon.
- [ ] **Step 2: Rename Hub→Home** — route `/home` renders the Hub component (keep the component, rename file/route later in Phase 1); `'/'` and unknown → `/home`. Update `Landing onEnter` default to `/home`.
- [ ] **Step 3: Fold Chat→Coach** — rename `ChatTab`→`CoachTab` at route `/coach`; keep its internal sub-views (AI / Coach / Inbox / Analyzer). Movement Analyzer stays a sub-view of Coach.
- [ ] **Step 4: Remove dead routes** — delete `/rehab` redirect + `/rehab/:region` + the `RehabTab` lazy import (Task 12 deletes the file). Keep `/recover`, `/triage`, `/history`, `/progress/awards`, `/settings`, `/about`.
- [ ] **Step 5: Build + click every tab.** `npm run build`; `npm run lint`.
- [ ] **Step 6: Commit.** `git commit -am "feat(ia): 5-tab structure (Home/Train/Progress/Coach/Recover)"`

---

## Task 11: Delete dead components

**Files:** Delete `frontend/src/components/HubStyleMixCard.jsx`, `HubGreeting.jsx`, `HubProjectCard.jsx`, `HubRingsCard.jsx`, `HubFeedCard.jsx`, `HubTipCard.jsx`, `HubWeekStrip.jsx`, `RehabTab.jsx`, `RehabProtocol.jsx` (only if now unused).

- [ ] **Step 1: Re-confirm zero imports** for each: `grep -rl "<Name>" src/ | grep -v "/<Name>.jsx"` → empty (RehabTab import already removed in Task 10; confirm RehabProtocol unused after).
- [ ] **Step 2: Delete the files.** `git rm` each confirmed-dead file.
- [ ] **Step 3: Build.** `npm run build` → success (no missing-import errors).
- [ ] **Step 4: Commit.** `git commit -am "chore: remove dead Hub cards + legacy Rehab components"`

---

## Task 12: Literal-cleanup sweep (the 64 files)

**Files:** The 64 files from the grep, **prioritized by offender count**: `ProfileSetup.jsx (32)` → `App.jsx leftovers (29)` → `TipCard.jsx (20)` → settings/* → triage/* → train/* → auth/* → ui/* → the long tail (≤3 each).

**Procedure per file (apply the canonical mapping table):**
1. Open the file; find each old literal: `217,119,87` / `#d97757` / `#f0a875` → clay tokens; `#1c2520`/`#243530`/`#1f2924` → paper/card/side; `#f0f5ed`/`#c8d3c4` → ink/ink-soft; `#14b8a6`/`#fb7185`/`#fbbf24` → clay/sage/ochre; `#95a698` → ink-muted.
2. Prefer a Tailwind class (`bg-card`, `text-ink`, `border-ct-rim`, `text-clay-deep`) over an inline style; only keep inline `style` where dynamic.
3. Fix any `text-ct-cream` sitting on a colored fill → `text-cream`.
4. After each file: it must contain **zero** literals from the table.

- [ ] **Step 1: ProfileSetup.jsx** — replace all 32 literals per table; build.
- [ ] **Step 2: TipCard.jsx** — replace all 20; build.
- [ ] **Step 3: settings/* (ClimbingProfileSection, SettingsSidebar, SubscriptionSection, SettingsMobileTabs)** — replace; build.
- [ ] **Step 4: triage/* (PainSlider, TriageWizard, TriageHero) + train/* (TrainWeekStrip, TrainMonthGrid, TrainHeader, ExerciseTimer)** — replace; build.
- [ ] **Step 5: auth/* (AuthShell, ForgotPasswordPage, ResetPasswordPage) + remaining ≤3-literal files** (run the grep from Task 13 to get the live list) — replace; build.
- [ ] **Step 6: identity/Pentagon.jsx + ui/* (TierThemeProvider, StreakEmblem, CelebrationOverlay) + RecoverEmptyView, ChatPicker, PlausibilityConfirmModal** — replace; build.
- [ ] **Step 7: Commit per logical group** (e.g. `git commit -am "refactor(design): re-tokenize settings + triage to Almanac"`). Frequent commits.

---

## Task 13: Verification gate

**Files:** none (verification only)

- [ ] **Step 1: Grep gate — MUST be empty.**

```bash
cd frontend
grep -rnE "217,119,87|#d97757|#f0a875|#1c2520|#243530|#1f2924|#f0f5ed|#c8d3c4|#14b8a6|#fb7185|#fbbf24|#0b1220|#7dd3c0|#95a698" \
  --include="*.jsx" --include="*.js" --include="*.css" --include="*.html" src index.html
```
Expected: **no output**. Any hit → return to Task 12 for that file. (Allowed exception: comments referencing old values — none should remain.)

- [ ] **Step 2: Inverse-text gate.** `grep -rn "text-ct-cream" src | grep -iE "bg-clay|bg-ct-terracotta|btn-primary|active"` → empty.
- [ ] **Step 3: Build + lint + unit tests.** `npm run build` (success), `npm run lint` (no new errors), `npx vitest run` (skills + Pentagon + nav tests pass).
- [ ] **Step 4: Visual smoke check** — `npm run dev`, walk all 5 tabs (Home, Train, Progress, Coach, Recover) + Triage + Settings + Landing + auth modal. Confirm: parchment bg + grain everywhere; no dark-forest/teal/neon anywhere; one shell; nav clay-active; skill colors only on Pentagon/tags/scores. Note any screen that still looks "old."
- [ ] **Step 5: Final commit + push branch.** `git commit -am "test(design): Phase 0 verification gate green"` then `git push -u origin feat/design-system-almanac` (only if the user approves pushing).

---

## Self-review notes (author)

- **Spec coverage:** §3 tokens→Task 1/2; §4 type→Task 2/3; §5 grain/motifs→Task 2 + primitives; §6 primitives→Task 6/7/8/9; §7 IA→Task 10; §8 migration scope→Tasks 1-2 (themes), 5 (tier neon), 11 (dead code), 12 (literals); §10 success criteria→Task 13 gate. All covered.
- **Out of scope (correctly deferred):** Pentagon *diagnose→prescribe logic*, Home content redesign, supplement flow fixes = Phases 1-2. This plan only restyles + restructures.
- **Assumption:** re-paletting tiers (Task 5) is in-scope because neon teal/blue tiers violate "no blue/teal." If the tier system is being reconsidered in Phase 1, Task 5 is cheap to redo.
