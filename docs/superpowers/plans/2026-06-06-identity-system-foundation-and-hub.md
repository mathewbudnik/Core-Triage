# CoreTriage Identity System — Plan #1: Foundation + Hub

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the new design-system foundation (palette, typography, texture library, icon registry) and the Hub identity surface (Pentagon morph timeline + Identity Label + Streak Flame) end-to-end. After this plan ships, opening the Hub shows the new field-log brand world with the climber's pentagon + named identity + streak displayed as the hero strip.

**Architecture:** Frontend uses Vite + React + Tailwind. We extend the existing token system with new palette/type CSS custom properties, add a shared `<TextureDefs />` mounted at app root, and stand up an `<Icon name="…" />` wrapper that loads from a single `frontend/src/components/ui/icons/` directory (icons sourced from game-icons.net CC-BY 3.0 and recolored). Pentagon snapshots are written monthly by a backend cron and persisted in a new Postgres table. A single `/api/me/state` payload powers the Hub hero strip.

**Tech Stack:** React 18 · Vite · Tailwind · framer-motion · FastAPI · psycopg / SQLAlchemy (existing `database.py` patterns) · Vitest (frontend) · pytest (backend).

**Spec:** [docs/superpowers/specs/2026-06-05-identity-system-and-brand-world-design.md](../specs/2026-06-05-identity-system-and-brand-world-design.md)

**This plan covers Phase 0 (Foundation) + Phase 1 (Hub) of the spec's verification table.** Later plans cover Tier system, Sharable Card, Per-surface rebrand, and QA.

---

## File Structure

**New files (created by this plan):**

```
frontend/
├── src/
│   ├── components/
│   │   ├── identity/
│   │   │   ├── Pentagon.jsx              # Renders the pentagon SVG (refactored from StatRadar.jsx)
│   │   │   ├── Pentagon.test.jsx
│   │   │   ├── IdentityLabel.jsx          # Composes style + archetype + phase
│   │   │   ├── IdentityLabel.test.jsx
│   │   │   ├── StreakFlame.jsx            # Animated SVG flame with day count
│   │   │   ├── StreakFlame.test.jsx
│   │   │   ├── PentagonMorphTimeline.jsx  # 6-cell timeline
│   │   │   └── PentagonMorphTimeline.test.jsx
│   │   └── ui/
│   │       ├── TextureDefs.jsx            # SVG defs block (5 patterns + foil gradient)
│   │       ├── Icon.jsx                   # <Icon name="..." /> wrapper
│   │       └── icons/
│   │           ├── index.js               # Icon registry barrel
│   │           ├── chalk.svg              # Sourced from game-icons.net, recolored
│   │           ├── shoe.svg
│   │           ├── quickdraw.svg
│   │           ├── compass.svg
│   │           ├── waypoint.svg
│   │           ├── flame.svg
│   │           ├── pin.svg
│   │           ├── scissors.svg
│   │           ├── share.svg
│   │           └── chevron-down.svg       # The first 10 icons
│   ├── lib/
│   │   └── identity/
│   │       ├── archetype.js               # Pentagon shape → archetype name
│   │       ├── archetype.test.js
│   │       ├── labelRules.js              # Style + phase rule tables
│   │       ├── labelRules.test.js
│   │       ├── streak.js                  # Compute streak from logs
│   │       └── streak.test.js
│   └── styles/
│       └── brand-tokens.css                # New CSS custom properties (palette + type)
└── public/
    └── fonts/                              # Optional: self-hosted Fraunces + Caveat (or use Google CDN)

tests/
├── test_pentagon_snapshots.py             # Migration + query helpers
├── test_state_endpoint.py                 # /api/me/state contract
└── test_pentagon_snapshot_job.py          # Monthly snapshot job
```

**Modified files:**

```
frontend/
├── index.html                              # Add Google Font links
├── tailwind.config.js                      # Add new tokens (ct-foil-*, ct-paper-*, font families)
├── src/
│   ├── App.jsx                             # Mount <TextureDefs /> + apply data-tier (placeholder for Plan #2)
│   ├── api.js                              # Add getMeState, getPentagonSnapshots
│   └── components/
│       ├── HubTab.jsx                      # Replace hero card with new identity strip + morph timeline
│       └── ui/StatRadar.jsx                # Thin re-export from identity/Pentagon (back-compat)

database.py                                 # Add pentagon_snapshots table + helpers
main.py                                     # Add /api/me/state + /api/me/pentagon-snapshots
scripts/
└── snapshot_pentagon_cron.py               # Monthly job invoked by cron / scheduler
```

---

## Resolved open questions

These were called out in the spec's "Open questions" section. Decisions locked here so tasks have unambiguous inputs:

1. **Snapshot backfill** — On first read of `/api/me/pentagon-snapshots` for any user, backfill up to 5 historical snapshots from training-log data. Each historical snapshot uses the same pentagon-recompute logic that runs today (from `frontend/src/lib/sendBuckets.js` + existing rollup logic) applied to all sends up to the snapshot date.
2. **Share card** — Out of scope for this plan. Plan #3 will pick Satori.
3. **Promotion ceremony** — Out of scope for this plan. Plan #2 will implement it (auto-dismiss 6s + dismiss button).
4. **Tier regression** — Apex only (already locked in spec).
5. **PWA caching** — Out of scope for this plan (no share card yet).

---

## Tasks

### Task 1: Confirm test infrastructure + add brand-tokens stylesheet

**Files:**
- Create: `frontend/src/styles/brand-tokens.css`
- Modify: `frontend/src/main.jsx` (or `frontend/src/App.jsx` — whichever currently imports global CSS) to import the new stylesheet

- [ ] **Step 1: Locate where global styles are imported**

Run: `grep -rn "import.*\.css" frontend/src/main.jsx frontend/src/App.jsx 2>/dev/null | head -5`

If `main.jsx` imports global CSS, modify it. Otherwise modify `App.jsx`.

- [ ] **Step 2: Create the brand-tokens stylesheet**

```css
/* frontend/src/styles/brand-tokens.css */
:root {
  /* Paper world palette */
  --ct-paper-base: #e8dcc4;
  --ct-paper-mid:  #ddd0b3;
  --ct-paper-deep: #c9bb9c;

  /* Ink */
  --ct-ink:        #1a2620;
  --ct-ink-soft:   #2b3a32;
  --ct-ink-quiet:  rgba(26, 38, 32, 0.55);
  --ct-ink-faint:  rgba(26, 38, 32, 0.30);

  /* Cream (inverse text) */
  --ct-cream:      #f4ecdf;
  --ct-cream-mute: rgba(244, 236, 223, 0.65);
  --ct-cream-quiet:rgba(244, 236, 223, 0.40);

  /* Accents */
  --ct-terracotta: #c75e3a;
  --ct-terra-deep: #a44a2a;
  --ct-terra-tint: rgba(199, 94, 58, 0.12);
  --ct-terra-vert: #f0a875;
  --ct-mint:       #2da283;

  /* Foil prestige gradient (used as background-image OR via masking) */
  --ct-foil-stops: #b88a3a, #c75e3a, #7a4a8e, #2f4ea8, #b88a3a;
  --ct-foil-grad:  linear-gradient(135deg, var(--ct-foil-stops));

  /* Typography */
  --ct-font-serif:  "Fraunces", Georgia, serif;
  --ct-font-script: "Caveat", cursive;
  --ct-font-mono:   "JetBrains Mono", ui-monospace, monospace;
  --ct-font-sans:   "Inter", -apple-system, sans-serif;

  /* Type scale */
  --ct-type-display-xl: clamp(2.5rem, 5vw, 3.4rem);
  --ct-type-display:    clamp(2rem, 4vw, 2.75rem);
  --ct-type-h1:         1.5rem;
  --ct-type-h2:         1.25rem;
  --ct-type-body:       1rem;
  --ct-type-caption:    0.875rem;
  --ct-type-mono-meta:  0.75rem;
}
```

- [ ] **Step 3: Import the stylesheet at app entry**

Add to `frontend/src/main.jsx` (or `App.jsx`) **above** existing CSS imports:

```js
import './styles/brand-tokens.css'
```

- [ ] **Step 4: Verify the dev server compiles**

Run: `cd frontend && npm run dev` (background) — expect the dev server to start without errors. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles/brand-tokens.css frontend/src/main.jsx
git commit -m "feat(brand): add brand-tokens CSS custom properties"
```

---

### Task 2: Add Fraunces + Caveat fonts to the app

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Add Google Fonts link to index.html**

Add inside `<head>` (before existing font imports):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Caveat:wght@500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Verify fonts load**

Run `cd frontend && npm run dev`, open `http://localhost:5174` in browser, open DevTools → Network tab → filter "font". Expect Fraunces + Caveat to load with 200 OK.

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "feat(brand): add Fraunces + Caveat webfonts"
```

---

### Task 3: Extend Tailwind config with brand tokens

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Open the existing Tailwind config**

Run: `cat frontend/tailwind.config.js | head -80`

Note the existing `theme.extend.colors` entries (e.g. `ct-terracotta`, `ct-cream`).

- [ ] **Step 2: Add new font-family + color tokens**

In `theme.extend`, add:

```js
fontFamily: {
  serif: ['Fraunces', 'Georgia', 'serif'],
  script: ['Caveat', 'cursive'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
},
colors: {
  // ... keep existing entries ...
  'ct-paper': {
    base: '#e8dcc4',
    mid: '#ddd0b3',
    deep: '#c9bb9c',
  },
  'ct-ink': '#1a2620',
  'ct-ink-soft': '#2b3a32',
  // existing ct-cream, ct-terracotta, etc. stay
},
backgroundImage: {
  'ct-foil': 'linear-gradient(135deg, #b88a3a, #c75e3a, #7a4a8e, #2f4ea8, #b88a3a)',
},
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`

Expect: build succeeds, no Tailwind config errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "feat(brand): extend Tailwind with serif/script fonts and paper palette"
```

---

### Task 4: Build the TextureDefs component

**Files:**
- Create: `frontend/src/components/ui/TextureDefs.jsx`
- Create: `frontend/src/components/ui/TextureDefs.test.jsx`
- Modify: `frontend/src/App.jsx` (mount TextureDefs once at app root)

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/ui/TextureDefs.test.jsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TextureDefs from './TextureDefs'

describe('TextureDefs', () => {
  it('renders all five pattern defs and the foil gradient', () => {
    const { container } = render(<TextureDefs />)
    const defs = container.querySelector('defs')
    expect(defs).not.toBeNull()
    expect(defs.querySelector('#ct-hatch-diag')).not.toBeNull()
    expect(defs.querySelector('#ct-hatch-cross')).not.toBeNull()
    expect(defs.querySelector('#ct-stipple')).not.toBeNull()
    expect(defs.querySelector('#ct-striate')).not.toBeNull()
    expect(defs.querySelector('#ct-ink-blot')).not.toBeNull()
    expect(defs.querySelector('#ct-foil')).not.toBeNull()
  })

  it('renders the SVG with width=0 height=0 (off-screen defs container)', () => {
    const { container } = render(<TextureDefs />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('0')
    expect(svg.getAttribute('height')).toBe('0')
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd frontend && npx vitest run src/components/ui/TextureDefs.test.jsx`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement TextureDefs**

```jsx
// frontend/src/components/ui/TextureDefs.jsx
export default function TextureDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* Parallel ink lines at 45° */}
        <pattern id="ct-hatch-diag" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
        </pattern>

        {/* Cross-hatching */}
        <pattern id="ct-hatch-cross" patternUnits="userSpaceOnUse" width="6" height="6">
          <path d="M-1 1l4-4M0 6l6-6M5 7l4-4" stroke="currentColor" strokeWidth="0.4" opacity="0.6" />
        </pattern>

        {/* Stippling (ink dots) */}
        <pattern id="ct-stipple" patternUnits="userSpaceOnUse" width="5" height="5">
          <circle cx="1" cy="1" r="0.5" fill="currentColor" opacity="0.7" />
          <circle cx="3.5" cy="2.5" r="0.3" fill="currentColor" opacity="0.5" />
          <circle cx="2" cy="4" r="0.4" fill="currentColor" opacity="0.6" />
        </pattern>

        {/* Topographic striations */}
        <pattern id="ct-striate" patternUnits="userSpaceOnUse" width="14" height="14">
          <path d="M0 7 Q 3 4, 7 7 T 14 7" stroke="currentColor" strokeWidth="0.4" fill="none" opacity="0.6" />
        </pattern>

        {/* Hand-drawn ink-blot (used for severity dots, vertex markers) */}
        <symbol id="ct-ink-blot" viewBox="-12 -12 24 24">
          <path
            d="M-8 -1 Q -10 -7, -3 -9 Q 5 -11, 9 -5 Q 11 3, 5 8 Q -3 10, -7 6 Q -10 2, -8 -1 Z"
            fill="currentColor"
          />
        </symbol>

        {/* Foil prestige gradient */}
        <linearGradient id="ct-foil" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b88a3a" />
          <stop offset="30%" stopColor="#c75e3a" />
          <stop offset="55%" stopColor="#7a4a8e" />
          <stop offset="80%" stopColor="#2f4ea8" />
          <stop offset="100%" stopColor="#b88a3a" />
        </linearGradient>
      </defs>
    </svg>
  )
}
```

- [ ] **Step 4: Run the test, expect PASS**

Run: `cd frontend && npx vitest run src/components/ui/TextureDefs.test.jsx`

- [ ] **Step 5: Mount TextureDefs at app root**

In `frontend/src/App.jsx`, find the top-level `<Routes>` block. Add `<TextureDefs />` as a sibling above it. Import it at the top:

```jsx
import TextureDefs from './components/ui/TextureDefs'
// ...
return (
  <>
    <TextureDefs />
    {/* existing layout */}
  </>
)
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/TextureDefs.jsx frontend/src/components/ui/TextureDefs.test.jsx frontend/src/App.jsx
git commit -m "feat(brand): add TextureDefs with 5 patterns + foil gradient"
```

---

### Task 5: Set up Icon registry with first 10 icons

**Files:**
- Create: `frontend/src/components/ui/icons/index.js`
- Create: `frontend/src/components/ui/Icon.jsx`
- Create: `frontend/src/components/ui/Icon.test.jsx`
- Create: 10 SVG files in `frontend/src/components/ui/icons/`

**Icon sourcing note:** Each SVG comes from [game-icons.net](https://game-icons.net), CC-BY 3.0. The license requires attribution. Add a `LICENSE-icons.md` file at the icon directory listing attributions per icon — task includes this.

For this plan we add 10 icons. Subsequent plans extend the registry.

- [ ] **Step 1: Download or hand-author 10 SVGs**

Drop these files into `frontend/src/components/ui/icons/`. Each one MUST be a single-path SVG, `viewBox="0 0 512 512"`, `fill="currentColor"`, with no inline styles. Use game-icons.net's "white on transparent" download option and replace `fill="#fff"` with `fill="currentColor"`.

Required icons (filename → game-icons.net slug):
- `chalk.svg` → `gi-stone-spear` (chalk-mark stand-in)
- `shoe.svg` → `gi-running-shoe`
- `quickdraw.svg` → `gi-link` (carabiner stand-in)
- `compass.svg` → `gi-compass`
- `waypoint.svg` → `gi-diamond-trophy` (waypoint glyph)
- `flame.svg` → `gi-flame`
- `pin.svg` → `gi-position-marker`
- `scissors.svg` → `gi-scissors`
- `share.svg` → `gi-share`
- `chevron-down.svg` → `gi-down-arrow`

Each SVG should look roughly like:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path d="..." fill="currentColor"/>
</svg>
```

- [ ] **Step 2: Add attribution file**

```markdown
<!-- frontend/src/components/ui/icons/LICENSE-icons.md -->
# Icon attributions

Icons sourced from [game-icons.net](https://game-icons.net) under CC-BY 3.0.

| File | Original | Author |
|---|---|---|
| chalk.svg | Stone Spear | Lorc |
| shoe.svg | Running Shoe | Delapouite |
| quickdraw.svg | Link | Delapouite |
| compass.svg | Compass | Lorc |
| waypoint.svg | Diamond Trophy | Delapouite |
| flame.svg | Flame | Lorc |
| pin.svg | Position Marker | Delapouite |
| scissors.svg | Scissors | Delapouite |
| share.svg | Share | Skoll |
| chevron-down.svg | Down Arrow | sbed |
```

(Look up actual author names on game-icons.net before committing if any differ.)

- [ ] **Step 3: Build the icon registry**

```js
// frontend/src/components/ui/icons/index.js
import chalk from './chalk.svg?raw'
import shoe from './shoe.svg?raw'
import quickdraw from './quickdraw.svg?raw'
import compass from './compass.svg?raw'
import waypoint from './waypoint.svg?raw'
import flame from './flame.svg?raw'
import pin from './pin.svg?raw'
import scissors from './scissors.svg?raw'
import share from './share.svg?raw'
import chevronDown from './chevron-down.svg?raw'

export const ICONS = {
  chalk, shoe, quickdraw, compass, waypoint,
  flame, pin, scissors, share, 'chevron-down': chevronDown,
}
```

Note: `?raw` Vite suffix imports the SVG as a string — lets us inline its inner content.

- [ ] **Step 4: Write the Icon test**

```jsx
// frontend/src/components/ui/Icon.test.jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Icon from './Icon'

describe('Icon', () => {
  it('renders the requested icon by name', () => {
    const { container } = render(<Icon name="flame" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('applies size prop as width and height', () => {
    const { container } = render(<Icon name="flame" size={32} />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
  })

  it('warns and renders nothing for unknown icons', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<Icon name="does-not-exist" />)
    expect(container.firstChild).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
```

Add `import { vi } from 'vitest'` at the top.

- [ ] **Step 5: Run the test, expect FAIL (module not found)**

Run: `cd frontend && npx vitest run src/components/ui/Icon.test.jsx`

- [ ] **Step 6: Implement Icon.jsx**

```jsx
// frontend/src/components/ui/Icon.jsx
import { ICONS } from './icons'

export default function Icon({ name, size = 16, className = '', ...rest }) {
  const raw = ICONS[name]
  if (!raw) {
    console.warn(`[Icon] Unknown icon: "${name}"`)
    return null
  }
  // Strip outer <svg> tag, keep inner contents; re-render with our props
  const inner = raw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      {...rest}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  )
}
```

- [ ] **Step 7: Run tests, expect PASS**

Run: `cd frontend && npx vitest run src/components/ui/Icon.test.jsx`

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ui/icons frontend/src/components/ui/Icon.jsx frontend/src/components/ui/Icon.test.jsx
git commit -m "feat(brand): icon registry with 10 climbing/UI glyphs from game-icons.net"
```

---

### Task 6: Build the archetype utility (lift from existing code)

**Files:**
- Create: `frontend/src/lib/identity/archetype.js`
- Create: `frontend/src/lib/identity/archetype.test.js`

The archetype logic was prototyped during brainstorming. Lift it into a clean utility.

- [ ] **Step 1: Write the test first**

```js
// frontend/src/lib/identity/archetype.test.js
import { describe, it, expect } from 'vitest'
import { computeArchetype } from './archetype'

const balanced = { power: 5, crimpy: 5, dynamic: 5, technical: 5, mobility: 5 }

describe('computeArchetype', () => {
  it('returns Apprentice when all axes are below 5', () => {
    expect(computeArchetype({ power: 4, crimpy: 4, dynamic: 4, technical: 4, mobility: 4 }))
      .toBe('Apprentice')
  })

  it('returns Crimper when POW+CRMP+TECH high and MOB low', () => {
    expect(computeArchetype({ power: 7.5, crimpy: 8.5, dynamic: 6, technical: 7.5, mobility: 4 }))
      .toBe('Crimper')
  })

  it('returns Dynamo when POW > 7 and DYN > 7', () => {
    expect(computeArchetype({ ...balanced, power: 8, dynamic: 8 }))
      .toBe('Dynamo')
  })

  it('returns Slabber when TECH > 8 and MOB > 6 and POW < 6', () => {
    expect(computeArchetype({ power: 5, crimpy: 6, dynamic: 5, technical: 8.5, mobility: 7 }))
      .toBe('Slabber')
  })

  it('returns Spider when CRMP > 8 and MOB > 6 and DYN < 5', () => {
    expect(computeArchetype({ power: 5, crimpy: 8.5, dynamic: 4, technical: 5, mobility: 7 }))
      .toBe('Spider')
  })

  it('returns Acrobat when DYN > 7 and MOB > 7 and CRMP < 5', () => {
    expect(computeArchetype({ power: 5, crimpy: 4, dynamic: 8, technical: 5, mobility: 8 }))
      .toBe('Acrobat')
  })

  it('returns Brute when CRMP > 7 and DYN > 7 and TECH < 5', () => {
    expect(computeArchetype({ power: 6, crimpy: 8, dynamic: 8, technical: 4, mobility: 5 }))
      .toBe('Brute')
  })

  it('returns All-Rounder when all axes within ±1.5 of each other', () => {
    expect(computeArchetype({ power: 6.5, crimpy: 7, dynamic: 6, technical: 7.5, mobility: 6.8 }))
      .toBe('All-Rounder')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd frontend && npx vitest run src/lib/identity/archetype.test.js`

- [ ] **Step 3: Implement archetype.js**

```js
// frontend/src/lib/identity/archetype.js

/**
 * Map a 5-axis pentagon to an archetype name.
 * @param {{power, crimpy, dynamic, technical, mobility}} axes - values 0-10
 * @returns {string} archetype name
 */
export function computeArchetype(axes) {
  const { power, crimpy, dynamic, technical, mobility } = axes

  // All low → Apprentice
  if ([power, crimpy, dynamic, technical, mobility].every((v) => v < 5)) {
    return 'Apprentice'
  }

  // Crimper: POW+CRMP high, MOB low
  if (power > 7 && crimpy > 7 && mobility < 5) return 'Crimper'

  // Dynamo: POW+DYN high
  if (power > 7 && dynamic > 7) return 'Dynamo'

  // Slabber: TECH+MOB high, POW low
  if (technical > 8 && mobility > 6 && power < 6) return 'Slabber'

  // Spider: CRMP+MOB high, DYN low
  if (crimpy > 8 && mobility > 6 && dynamic < 5) return 'Spider'

  // Acrobat: DYN+MOB high, CRMP low
  if (dynamic > 7 && mobility > 7 && crimpy < 5) return 'Acrobat'

  // Brute: CRMP+DYN high, TECH low
  if (crimpy > 7 && dynamic > 7 && technical < 5) return 'Brute'

  // All-Rounder: balanced
  const values = [power, crimpy, dynamic, technical, mobility]
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (max - min <= 1.5) return 'All-Rounder'

  // Fallback — name from highest single axis
  const dominant = ['power', 'crimpy', 'dynamic', 'technical', 'mobility']
    .reduce((best, k) => (axes[k] > axes[best] ? k : best), 'power')
  const map = {
    power: 'Brute', crimpy: 'Crimper', dynamic: 'Dynamo',
    technical: 'Slabber', mobility: 'Spider',
  }
  return map[dominant]
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/identity/archetype.js frontend/src/lib/identity/archetype.test.js
git commit -m "feat(identity): pentagon → archetype name utility"
```

---

### Task 7: Build the identity label rules (style + phase)

**Files:**
- Create: `frontend/src/lib/identity/labelRules.js`
- Create: `frontend/src/lib/identity/labelRules.test.js`

- [ ] **Step 1: Write failing tests**

```js
// frontend/src/lib/identity/labelRules.test.js
import { describe, it, expect } from 'vitest'
import { computeStyle, computePhase, composeLabel } from './labelRules'

describe('computeStyle', () => {
  it('returns "Crimpy" when CRMP > 7 and dominates by > 1', () => {
    expect(computeStyle({ power: 6, crimpy: 8.5, dynamic: 5, technical: 6, mobility: 5 }))
      .toBe('Crimpy')
  })

  it('returns "Technical" when TECH > 7 and dominates', () => {
    expect(computeStyle({ power: 5, crimpy: 5, dynamic: 5, technical: 8, mobility: 6 }))
      .toBe('Technical')
  })

  it('returns "Powerful" when POW > 7 and dominates', () => {
    expect(computeStyle({ power: 8.5, crimpy: 7, dynamic: 6, technical: 5, mobility: 5 }))
      .toBe('Powerful')
  })

  it('returns "Static" when DYN < 5 and CRMP > 6', () => {
    expect(computeStyle({ power: 5, crimpy: 7, dynamic: 4, technical: 5, mobility: 5 }))
      .toBe('Static')
  })

  it('returns "All-Round" when all axes within 1.5 range', () => {
    expect(computeStyle({ power: 6, crimpy: 7, dynamic: 6.5, technical: 7, mobility: 6.8 }))
      .toBe('All-Round')
  })

  it('returns null when no rule fires', () => {
    expect(computeStyle({ power: 6, crimpy: 6, dynamic: 6, technical: 7, mobility: 5 }))
      .toBe(null)
  })
})

describe('computePhase', () => {
  const overhang = { wallAngle: 'overhang' }
  const slab = { wallAngle: 'slab' }
  const vertical = { wallAngle: 'vertical' }

  it('returns "cave phase" when >= 4 of last 5 sends are overhang or roof', () => {
    const sends = [overhang, overhang, overhang, overhang, vertical]
    expect(computePhase(sends, new Date())).toBe('cave phase')
  })

  it('returns "slab phase" when >= 4 are slab or vertical', () => {
    const sends = [slab, vertical, slab, slab, overhang]
    expect(computePhase(sends, new Date())).toBe('slab phase')
  })

  it('returns "on rest" when no sends in 7+ days', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000)
    const sends = [{ ...overhang, sentAt: eightDaysAgo }]
    expect(computePhase(sends, new Date())).toBe('on rest')
  })

  it('returns "on a heater" when >= 3 V-grade first-time-sends in last 30 days', () => {
    const now = new Date()
    const sends = [
      { ...overhang, sentAt: now, isFirstAtGrade: true, grade: 'V7' },
      { ...overhang, sentAt: now, isFirstAtGrade: true, grade: 'V8' },
      { ...overhang, sentAt: now, isFirstAtGrade: true, grade: 'V6' },
      { ...overhang, sentAt: now, isFirstAtGrade: false, grade: 'V7' },
    ]
    expect(computePhase(sends, now)).toBe('on a heater')
  })

  it('returns "patience rewarded" when last send was a project after 5+ burns', () => {
    const now = new Date()
    const sends = [{ ...overhang, sentAt: now, burnsBeforeSend: 6 }]
    expect(computePhase(sends, now)).toBe('patience rewarded')
  })

  it('returns "promoted" when first send at a new grade in last 24h', () => {
    const recent = new Date(Date.now() - 12 * 3600 * 1000)
    const sends = [{ ...overhang, sentAt: recent, isFirstAtGrade: true, grade: 'V7', burnsBeforeSend: 1 }]
    expect(computePhase(sends, new Date())).toBe('promoted')
  })

  it('returns null when no rule fires', () => {
    const sends = [overhang, vertical, slab, overhang, overhang]
    expect(computePhase(sends, new Date())).toBe(null)
  })
})

describe('composeLabel', () => {
  it('combines all three parts', () => {
    expect(composeLabel({ style: 'Crimpy', archetype: 'Crimper', phase: 'cave phase' }))
      .toBe('Crimpy Crimper, in the cave phase')
  })

  it('omits style when null', () => {
    expect(composeLabel({ style: null, archetype: 'Crimper', phase: 'cave phase' }))
      .toBe('Crimper, in the cave phase')
  })

  it('omits phase when null', () => {
    expect(composeLabel({ style: 'Crimpy', archetype: 'Crimper', phase: null }))
      .toBe('Crimpy Crimper')
  })

  it('handles "on rest" / "on a heater" without "in the" prefix', () => {
    expect(composeLabel({ style: null, archetype: 'Crimper', phase: 'on rest' }))
      .toBe('Crimper, on rest')
    expect(composeLabel({ style: null, archetype: 'Dynamo', phase: 'on a heater' }))
      .toBe('Dynamo, on a heater')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement labelRules.js**

```js
// frontend/src/lib/identity/labelRules.js

const DAY_MS = 24 * 3600 * 1000

/**
 * Compute style descriptor from pentagon axes.
 * Returns null when no style dominates.
 */
export function computeStyle(axes) {
  const { power, crimpy, dynamic, technical, mobility } = axes

  // All-Round: all axes within 1.5 range
  const values = [power, crimpy, dynamic, technical, mobility]
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (max - min <= 1.5) return 'All-Round'

  // Static: DYN < 5, CRMP > 6 (low-dynamic, holds-focused)
  if (dynamic < 5 && crimpy > 6) return 'Static'

  // Single-axis dominance: axis > 7 and beats next-highest by > 1
  const named = { power: 'Powerful', crimpy: 'Crimpy', dynamic: 'Dynamic', technical: 'Technical', mobility: 'Mobile' }
  for (const k of Object.keys(named)) {
    if (axes[k] > 7) {
      const others = Object.keys(named).filter((o) => o !== k).map((o) => axes[o])
      if (axes[k] - Math.max(...others) > 1) return named[k]
    }
  }

  return null
}

/**
 * Compute phase qualifier from recent sends.
 * @param {Array} sends - last 5 sends, each with { wallAngle, sentAt, isFirstAtGrade, grade, burnsBeforeSend }
 * @param {Date} now - reference time (injectable for tests)
 * @returns {string|null} phase string or null
 */
export function computePhase(sends, now) {
  if (!sends || sends.length === 0) return null

  // "on rest" — no sends in 7+ days
  const lastSendAt = sends
    .map((s) => s.sentAt && new Date(s.sentAt).getTime())
    .filter(Boolean)
    .reduce((a, b) => Math.max(a, b), 0)
  if (lastSendAt && now.getTime() - lastSendAt > 7 * DAY_MS) return 'on rest'

  // "promoted" — first send at a new grade in last 24h
  const recent = sends.find(
    (s) => s.isFirstAtGrade && s.sentAt && now.getTime() - new Date(s.sentAt).getTime() < DAY_MS
  )
  if (recent) return 'promoted'

  // "patience rewarded" — last send was a project after 5+ burns
  const mostRecent = sends.find((s) => s.sentAt)
  if (mostRecent && mostRecent.burnsBeforeSend >= 5) return 'patience rewarded'

  // "on a heater" — 3+ V-grade promotions in last 30 days
  const thirtyDaysAgo = now.getTime() - 30 * DAY_MS
  const promotions = sends.filter(
    (s) => s.isFirstAtGrade && s.sentAt && new Date(s.sentAt).getTime() > thirtyDaysAgo
  ).length
  if (promotions >= 3) return 'on a heater'

  // "cave phase" / "slab phase" — last 5 sends' wall angles
  const overhangCount = sends.filter((s) => s.wallAngle === 'overhang' || s.wallAngle === 'roof').length
  const slabCount = sends.filter((s) => s.wallAngle === 'slab' || s.wallAngle === 'vertical').length
  if (overhangCount >= 4) return 'cave phase'
  if (slabCount >= 4) return 'slab phase'

  return null
}

/**
 * Compose the three parts into one phrase.
 * Phases starting with "on " or "patience " or "promoted" don't get "in the" prefix.
 */
export function composeLabel({ style, archetype, phase }) {
  const parts = []
  if (style) parts.push(`${style} ${archetype}`)
  else parts.push(archetype)

  if (phase) {
    const noPrefix = ['on rest', 'on a heater', 'patience rewarded', 'promoted', 'grinding']
    const phraseTail = noPrefix.includes(phase) ? phase : `in the ${phase}`
    return `${parts.join('')}, ${phraseTail}`
  }
  return parts.join('')
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/identity/labelRules.js frontend/src/lib/identity/labelRules.test.js
git commit -m "feat(identity): style + phase + composeLabel rules"
```

---

### Task 8: Build the streak utility

**Files:**
- Create: `frontend/src/lib/identity/streak.js`
- Create: `frontend/src/lib/identity/streak.test.js`

- [ ] **Step 1: Write the test**

```js
// frontend/src/lib/identity/streak.test.js
import { describe, it, expect } from 'vitest'
import { computeStreak } from './streak'

function daysAgo(n) {
  const d = new Date()
  d.setUTCHours(12, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

describe('computeStreak', () => {
  it('returns 0 when no entries', () => {
    expect(computeStreak([], new Date())).toBe(0)
  })

  it('returns 1 when only today has activity', () => {
    expect(computeStreak([{ loggedAt: daysAgo(0) }], new Date())).toBe(1)
  })

  it('counts back consecutive days', () => {
    const logs = [{ loggedAt: daysAgo(0) }, { loggedAt: daysAgo(1) }, { loggedAt: daysAgo(2) }]
    expect(computeStreak(logs, new Date())).toBe(3)
  })

  it('breaks streak on a missed day', () => {
    const logs = [{ loggedAt: daysAgo(0) }, { loggedAt: daysAgo(1) }, { loggedAt: daysAgo(3) }]
    expect(computeStreak(logs, new Date())).toBe(2)
  })

  it('counts back from yesterday when today is empty (grace day)', () => {
    const logs = [{ loggedAt: daysAgo(1) }, { loggedAt: daysAgo(2) }]
    expect(computeStreak(logs, new Date())).toBe(2)
  })

  it('returns 0 if last entry is older than 1 day', () => {
    expect(computeStreak([{ loggedAt: daysAgo(3) }], new Date())).toBe(0)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement streak.js**

```js
// frontend/src/lib/identity/streak.js

const DAY_MS = 24 * 3600 * 1000

/**
 * Compute current streak (consecutive calendar days with activity).
 * Grace day: if today has no entry but yesterday does, the streak is still alive.
 * @param {Array<{ loggedAt: string }>} entries - all log entries
 * @param {Date} now - reference time (injectable for tests)
 * @returns {number} streak in days
 */
export function computeStreak(entries, now) {
  if (!entries || entries.length === 0) return 0

  // Bucket entries by UTC date
  const days = new Set(
    entries
      .map((e) => e.loggedAt && new Date(e.loggedAt).toISOString().slice(0, 10))
      .filter(Boolean)
  )

  const today = new Date(now).toISOString().slice(0, 10)
  const yesterday = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10)

  let cursor
  if (days.has(today)) cursor = new Date(now)
  else if (days.has(yesterday)) cursor = new Date(now.getTime() - DAY_MS)
  else return 0

  let streak = 0
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (days.has(key)) {
      streak++
      cursor = new Date(cursor.getTime() - DAY_MS)
    } else break
  }
  return streak
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/identity/streak.js frontend/src/lib/identity/streak.test.js
git commit -m "feat(identity): streak calculation with grace-day rule"
```

---

### Task 9: Refactor StatRadar → Pentagon component

**Files:**
- Create: `frontend/src/components/identity/Pentagon.jsx`
- Create: `frontend/src/components/identity/Pentagon.test.jsx`
- Modify: `frontend/src/components/ui/StatRadar.jsx` (re-export from new location for back-compat)

- [ ] **Step 1: Read the existing StatRadar to understand the shape**

Run: `cat frontend/src/components/ui/StatRadar.jsx`

Note the props it accepts. We're keeping the same axis math; just relocating and renaming.

- [ ] **Step 2: Write the test for the new component**

```jsx
// frontend/src/components/identity/Pentagon.test.jsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Pentagon from './Pentagon'

describe('Pentagon', () => {
  const axes = { power: 5, crimpy: 5, dynamic: 5, technical: 5, mobility: 5 }

  it('renders an SVG with the requested size', () => {
    const { container } = render(<Pentagon axes={axes} size={200} />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('200')
    expect(svg.getAttribute('height')).toBe('200')
  })

  it('renders 5 vertex dots when given real values', () => {
    const { container } = render(<Pentagon axes={axes} />)
    const dots = container.querySelectorAll('circle')
    expect(dots.length).toBeGreaterThanOrEqual(5)
  })

  it('renders the stat polygon', () => {
    const { container } = render(<Pentagon axes={axes} />)
    const polygons = container.querySelectorAll('polygon')
    expect(polygons.length).toBeGreaterThan(0)
  })

  it('renders axis labels when showLabels is true', () => {
    const { container } = render(<Pentagon axes={axes} showLabels />)
    const labels = container.querySelectorAll('text')
    expect(labels.length).toBe(5)
  })

  it('applies tier prop to stroke color via CSS variable', () => {
    const { container } = render(<Pentagon axes={axes} tier="amber" />)
    expect(container.firstChild.getAttribute('data-tier')).toBe('amber')
  })
})
```

- [ ] **Step 3: Run, expect FAIL**

- [ ] **Step 4: Implement Pentagon.jsx (lift logic from StatRadar)**

```jsx
// frontend/src/components/identity/Pentagon.jsx
import { motion } from 'framer-motion'

const AXES = ['power', 'crimpy', 'dynamic', 'technical', 'mobility']
const AXIS_LABELS = ['POWER', 'CRIMPY', 'DYNAMIC', 'TECHNICAL', 'MOBILITY']
const AXIS_ANGLES = [-90, -18, 54, 126, 198].map((d) => (d * Math.PI) / 180)

function pointAt(value, angle, cx, cy, radius) {
  const r = radius * (value / 10)
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
}

function gridPolygon(level, cx, cy, radius) {
  return AXIS_ANGLES
    .map((a) => pointAt(level, a, cx, cy, radius))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

function statPolygon(axes, cx, cy, radius) {
  return AXES
    .map((axis, i) => pointAt(axes[axis] ?? 0, AXIS_ANGLES[i], cx, cy, radius))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

export default function Pentagon({
  axes,
  size = 240,
  tier = null,
  animate = true,
  showLabels = false,
  showValues = false,
  className = '',
}) {
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.42

  const allNull = AXES.every((a) => axes[a] === null || axes[a] === undefined)
  const renderAxes = allNull
    ? { power: 3, crimpy: 3, dynamic: 3, technical: 3, mobility: 3 }
    : AXES.reduce((acc, a) => {
        acc[a] = axes[a] === null || axes[a] === undefined ? 0 : axes[a]
        return acc
      }, {})

  const points = statPolygon(renderAxes, cx, cy, radius)
  const labelOffset = size * 0.05

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      data-tier={tier}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Concentric grid */}
      <g stroke="rgba(240,168,117,0.18)" strokeWidth="1" fill="none">
        <polygon points={gridPolygon(10, cx, cy, radius)} />
        <polygon points={gridPolygon(6, cx, cy, radius)} />
        <polygon points={gridPolygon(3, cx, cy, radius)} />
      </g>

      {/* Stat polygon */}
      <motion.polygon
        points={points}
        fill="rgba(217,119,87,0.22)"
        stroke="var(--ct-tier-stroke, #d97757)"
        strokeWidth="2.4"
        strokeLinejoin="round"
        initial={animate ? { opacity: 0, scale: 0.92 } : false}
        animate={animate ? { opacity: 1, scale: 1 } : undefined}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Vertex dots */}
      <g fill="var(--ct-tier-vertex, #f0a875)">
        {AXES.map((axis, i) => {
          if ((axes[axis] === null || axes[axis] === undefined) && !allNull) return null
          const [x, y] = pointAt(renderAxes[axis], AXIS_ANGLES[i], cx, cy, radius)
          return <circle key={axis} cx={x} cy={y} r="3" />
        })}
      </g>

      {/* Labels */}
      {showLabels && AXES.map((axis, i) => {
        const [x, y] = pointAt(11, AXIS_ANGLES[i], cx, cy, radius)
        const anchor = x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle'
        return (
          <text
            key={axis}
            x={x}
            y={y + (y < cy ? -labelOffset / 2 : labelOffset / 2)}
            textAnchor={anchor}
            fontFamily="var(--ct-font-mono, monospace)"
            fontSize={size * 0.04}
            fontWeight="700"
            letterSpacing="0.18em"
            fill="rgba(26,38,32,0.55)"
          >
            {AXIS_LABELS[i]}
          </text>
        )
      })}

      {/* Numeric values near vertices */}
      {showValues && AXES.map((axis, i) => {
        const [x, y] = pointAt(renderAxes[axis] + 1.5, AXIS_ANGLES[i], cx, cy, radius)
        return (
          <text
            key={axis + '-val'}
            x={x}
            y={y}
            textAnchor="middle"
            fontFamily="var(--ct-font-serif, serif)"
            fontSize={size * 0.055}
            fill="var(--ct-ink, #1a2620)"
          >
            {(renderAxes[axis] ?? 0).toFixed(1)}
          </text>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 5: Replace StatRadar with a thin re-export**

Replace contents of `frontend/src/components/ui/StatRadar.jsx`:

```jsx
// Back-compat: re-export Pentagon under the old name.
// New callers should import from '../identity/Pentagon' directly.
export { default } from '../identity/Pentagon'
```

- [ ] **Step 6: Run all tests, expect PASS**

Run: `cd frontend && npx vitest run`

If any existing StatRadar tests reference removed props, surface them and either update the prop API or document the breaking change in the commit.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/identity/Pentagon.jsx frontend/src/components/identity/Pentagon.test.jsx frontend/src/components/ui/StatRadar.jsx
git commit -m "refactor(identity): lift StatRadar → Pentagon under identity/"
```

---

### Task 10: Build the IdentityLabel component

**Files:**
- Create: `frontend/src/components/identity/IdentityLabel.jsx`
- Create: `frontend/src/components/identity/IdentityLabel.test.jsx`

- [ ] **Step 1: Write the test**

```jsx
// frontend/src/components/identity/IdentityLabel.test.jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import IdentityLabel from './IdentityLabel'

const axes = { power: 6, crimpy: 8.5, dynamic: 6, technical: 7, mobility: 5 }

describe('IdentityLabel', () => {
  it('composes style + archetype + phase', () => {
    const sends = Array(4).fill({ wallAngle: 'overhang', sentAt: new Date().toISOString() })
    render(<IdentityLabel axes={axes} recentSends={sends} />)
    // "Crimpy Crimper, in the cave phase"
    expect(screen.getByText(/Crimpy/)).toBeTruthy()
    expect(screen.getByText(/Crimper/)).toBeTruthy()
    expect(screen.getByText(/cave phase/)).toBeTruthy()
  })

  it('renders with the inline variant (default)', () => {
    render(<IdentityLabel axes={axes} recentSends={[]} />)
    const root = document.querySelector('[data-variant="inline"]')
    expect(root).not.toBeNull()
  })

  it('exposes composed text via aria-label', () => {
    const sends = Array(4).fill({ wallAngle: 'slab', sentAt: new Date().toISOString() })
    render(<IdentityLabel axes={axes} recentSends={sends} />)
    const root = document.querySelector('[aria-label*="Crimper"]')
    expect(root).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement IdentityLabel.jsx**

```jsx
// frontend/src/components/identity/IdentityLabel.jsx
import { computeArchetype } from '../../lib/identity/archetype'
import { computeStyle, computePhase, composeLabel } from '../../lib/identity/labelRules'

/**
 * Renders the climber's three-part identity phrase.
 *
 * Variants:
 *   - 'inline'    — Hub hero strip (default)
 *   - 'card'      — Climber Card surface (larger)
 *   - 'shareable' — Sharable Card export (foil treatment on style + arch)
 */
export default function IdentityLabel({
  axes,
  recentSends = [],
  variant = 'inline',
  now = null,
}) {
  const archetype = computeArchetype(axes)
  const style = computeStyle(axes)
  const phase = computePhase(recentSends, now || new Date())
  const composed = composeLabel({ style, archetype, phase })

  const sizes = {
    inline: { mainSize: 'text-2xl md:text-3xl', phaseSize: 'text-base' },
    card:   { mainSize: 'text-3xl md:text-4xl', phaseSize: 'text-lg' },
    shareable: { mainSize: 'text-4xl', phaseSize: 'text-xl' },
  }
  const { mainSize, phaseSize } = sizes[variant] || sizes.inline

  return (
    <div data-variant={variant} aria-label={`You are ${composed}`}>
      <p className={`font-serif ${mainSize} leading-tight tracking-tight m-0`} style={{ color: 'var(--ct-ink, #1a2620)' }}>
        {style && <span style={{ color: 'var(--ct-mint, #2da283)' }}>{style} </span>}
        <em style={{ color: 'var(--ct-terracotta, #c75e3a)', fontStyle: 'italic', fontWeight: 500 }}>
          {archetype}
        </em>
      </p>
      {phase && (
        <p className={`font-script ${phaseSize} m-0 mt-1`} style={{ color: 'var(--ct-terra-deep, #a44a2a)' }}>
          {phase.startsWith('on ') || phase === 'patience rewarded' || phase === 'promoted' || phase === 'grinding'
            ? phase
            : `in the ${phase}`}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/identity/IdentityLabel.jsx frontend/src/components/identity/IdentityLabel.test.jsx
git commit -m "feat(identity): IdentityLabel component"
```

---

### Task 11: Build the StreakFlame component

**Files:**
- Create: `frontend/src/components/identity/StreakFlame.jsx`
- Create: `frontend/src/components/identity/StreakFlame.test.jsx`

- [ ] **Step 1: Write the test**

```jsx
// frontend/src/components/identity/StreakFlame.test.jsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StreakFlame from './StreakFlame'

describe('StreakFlame', () => {
  it('renders the day count', () => {
    const { container } = render(<StreakFlame days={11} />)
    expect(container.textContent).toContain('11')
  })

  it('applies "warm" data-tier class for days 0-6', () => {
    const { container } = render(<StreakFlame days={3} />)
    expect(container.querySelector('[data-streak-tier="warm"]')).not.toBeNull()
  })

  it('applies "gradient" data-tier for 7-29 days', () => {
    const { container } = render(<StreakFlame days={14} />)
    expect(container.querySelector('[data-streak-tier="gradient"]')).not.toBeNull()
  })

  it('applies "foil" data-tier for 30+ days', () => {
    const { container } = render(<StreakFlame days={42} />)
    expect(container.querySelector('[data-streak-tier="foil"]')).not.toBeNull()
  })

  it('renders an SVG flame', () => {
    const { container } = render(<StreakFlame days={5} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement StreakFlame.jsx**

```jsx
// frontend/src/components/identity/StreakFlame.jsx

function streakTier(days) {
  if (days >= 30) return 'foil'
  if (days >= 7) return 'gradient'
  return 'warm'
}

const SIZE_MAP = { sm: 24, md: 36, lg: 48 }

export default function StreakFlame({ days = 0, size = 'md' }) {
  const tier = streakTier(days)
  const px = SIZE_MAP[size] ?? SIZE_MAP.md
  const flameFill = {
    warm: '#c75e3a',
    gradient: 'url(#ct-streak-gradient)',
    foil: 'url(#ct-foil)',
  }[tier]

  return (
    <span data-streak-tier={tier} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <svg
        viewBox="0 0 40 50"
        width={px}
        height={px * (50 / 40)}
        aria-hidden="true"
        style={{
          filter: tier === 'warm'
            ? 'drop-shadow(0 0 6px rgba(199,94,58,0.5))'
            : tier === 'gradient'
            ? 'drop-shadow(0 0 8px rgba(240,168,117,0.6))'
            : 'drop-shadow(0 0 12px rgba(184,138,58,0.7))',
        }}
      >
        <defs>
          <linearGradient id="ct-streak-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#c75e3a" />
            <stop offset="50%" stopColor="#f0a875" />
            <stop offset="100%" stopColor="#fce6a8" />
          </linearGradient>
        </defs>
        <path
          d="M 20 4 Q 14 14, 16 22 Q 10 22, 8 30 Q 6 38, 12 44 Q 18 48, 26 46 Q 34 42, 34 32 Q 34 24, 28 22 Q 30 14, 20 4 Z"
          fill={flameFill}
        />
        <path
          d="M 20 18 Q 16 24, 17 30 Q 13 30, 13 35 Q 14 42, 22 42 Q 28 40, 28 33 Q 28 28, 24 27 Q 25 22, 20 18 Z"
          fill="#1a1018"
          opacity="0.35"
        />
      </svg>
      <span style={{ fontFamily: 'var(--ct-font-mono, monospace)', fontSize: px * 0.42, fontWeight: 700 }}>
        {days}
      </span>
    </span>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/identity/StreakFlame.jsx frontend/src/components/identity/StreakFlame.test.jsx
git commit -m "feat(identity): StreakFlame with warm/gradient/foil tier escalation"
```

---

### Task 12: Add pentagon_snapshots table + DB helpers

**Files:**
- Modify: `database.py`
- Create: `tests/test_pentagon_snapshots.py`

- [ ] **Step 1: Write the test first**

```python
# tests/test_pentagon_snapshots.py
import pytest
import datetime as dt
from database import (
    init_db,
    save_pentagon_snapshot,
    get_pentagon_snapshots,
)


@pytest.fixture(autouse=True)
def reset_db():
    init_db()
    yield


def test_save_and_get_pentagon_snapshot():
    user_id = 1
    axes = {"power": 7.4, "crimpy": 8.6, "dynamic": 6.2, "technical": 7.8, "mobility": 5.1}
    captured_at = dt.datetime(2026, 5, 1, tzinfo=dt.timezone.utc)
    save_pentagon_snapshot(user_id, captured_at, axes, archetype="Crimper")

    rows = get_pentagon_snapshots(user_id, limit=5)
    assert len(rows) == 1
    assert rows[0]["axes"] == axes
    assert rows[0]["archetype"] == "Crimper"


def test_get_pentagon_snapshots_returns_most_recent_first():
    user_id = 1
    base = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)
    for i in range(6):
        save_pentagon_snapshot(
            user_id,
            base + dt.timedelta(days=30 * i),
            {"power": 5, "crimpy": 5, "dynamic": 5, "technical": 5, "mobility": 5},
            archetype="Apprentice",
        )
    rows = get_pentagon_snapshots(user_id, limit=3)
    assert len(rows) == 3
    # Most recent first
    assert rows[0]["captured_at"] > rows[1]["captured_at"] > rows[2]["captured_at"]


def test_save_pentagon_snapshot_is_idempotent_per_month():
    """Saving twice in the same calendar month for the same user updates rather than duplicates."""
    user_id = 1
    base = dt.datetime(2026, 5, 5, tzinfo=dt.timezone.utc)
    save_pentagon_snapshot(user_id, base, {"power": 5, "crimpy": 5, "dynamic": 5, "technical": 5, "mobility": 5}, archetype="X")
    save_pentagon_snapshot(user_id, base + dt.timedelta(days=10),
                           {"power": 6, "crimpy": 7, "dynamic": 6, "technical": 7, "mobility": 6},
                           archetype="Y")
    rows = get_pentagon_snapshots(user_id, limit=5)
    # One row, latest values
    assert len(rows) == 1
    assert rows[0]["archetype"] == "Y"
```

- [ ] **Step 2: Run, expect FAIL (functions not defined)**

Run: `pytest tests/test_pentagon_snapshots.py -v`

- [ ] **Step 3: Add table + helpers to database.py**

Locate the CREATE TABLE statements block. Add:

```python
# In init_db(), inside the schema bootstrap block:

cur.execute("""
    CREATE TABLE IF NOT EXISTS pentagon_snapshots (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        captured_at TIMESTAMPTZ NOT NULL,
        captured_month DATE NOT NULL,
        axes_json JSONB NOT NULL,
        archetype TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, captured_month)
    );
""")
cur.execute("""
    CREATE INDEX IF NOT EXISTS pentagon_snapshots_user_captured_idx
    ON pentagon_snapshots (user_id, captured_at DESC);
""")
```

Then add the two helper functions (placement: near other `save_*` / `get_*` functions):

```python
def save_pentagon_snapshot(user_id, captured_at, axes, archetype):
    """
    Idempotent per (user, calendar month). Re-saving in the same month overwrites
    axes + archetype. captured_at is the original timestamp; captured_month is
    the truncated month used as the conflict key.
    """
    month = captured_at.replace(day=1).date()
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO pentagon_snapshots (user_id, captured_at, captured_month, axes_json, archetype)
            VALUES (%s, %s, %s, %s::jsonb, %s)
            ON CONFLICT (user_id, captured_month) DO UPDATE
              SET captured_at = EXCLUDED.captured_at,
                  axes_json = EXCLUDED.axes_json,
                  archetype = EXCLUDED.archetype
            """,
            (user_id, captured_at, month, json.dumps(axes), archetype),
        )


def get_pentagon_snapshots(user_id, limit=6):
    """Returns list of {captured_at, axes, archetype}, most recent first."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT captured_at, axes_json, archetype
            FROM pentagon_snapshots
            WHERE user_id = %s
            ORDER BY captured_at DESC
            LIMIT %s
            """,
            (user_id, limit),
        )
        rows = cur.fetchall()
    return [
        {"captured_at": r[0], "axes": r[1], "archetype": r[2]}
        for r in rows
    ]
```

(Import `json` at the top of database.py if not already.)

- [ ] **Step 4: Run, expect PASS**

Run: `pytest tests/test_pentagon_snapshots.py -v`

- [ ] **Step 5: Commit**

```bash
git add database.py tests/test_pentagon_snapshots.py
git commit -m "feat(db): pentagon_snapshots table + save/get helpers"
```

---

### Task 13: Implement `/api/me/state` endpoint

**Files:**
- Modify: `main.py`
- Create: `tests/test_state_endpoint.py`

- [ ] **Step 1: Write the test**

```python
# tests/test_state_endpoint.py
import pytest
from fastapi.testclient import TestClient
from main import app
from database import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    init_db()
    yield


def _register_and_login():
    client.post("/api/auth/register", json={
        "email": "ml@example.com",
        "password": "longpassword123",
        "display_name": "Maya",
    })
    r = client.post("/api/auth/login", json={
        "email": "ml@example.com",
        "password": "longpassword123",
    })
    return r.json()["access_token"]


def test_me_state_returns_required_fields_for_new_user():
    token = _register_and_login()
    r = client.get("/api/me/state", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    # Required fields
    assert "apex_grade" in body
    assert "tier" in body
    assert "streak_days_current" in body
    assert "streak_days_longest" in body
    assert "pentagon" in body
    assert "recent_sends" in body
    assert "archetype" in body
    # New user defaults
    assert body["streak_days_current"] == 0
    assert body["apex_grade"] is None or body["apex_grade"] == ""


def test_me_state_requires_auth():
    r = client.get("/api/me/state")
    assert r.status_code == 401
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Add the endpoint to main.py**

Locate the `# Profile` section in main.py and add:

```python
# Below the existing /api/profile routes:

@app.get("/api/me/state")
def get_me_state(user=Depends(get_current_user)):
    """
    Single payload for the Hub identity strip.
    Returns: apex_grade, tier, streak_days_current, streak_days_longest,
             pentagon, recent_sends[], archetype.
    """
    user_id = user["id"]

    # Pentagon: lift from existing training/style rollup
    pentagon = _compute_current_pentagon(user_id)  # see helper below

    # Apex grade: hardest V-grade in send log
    apex_grade = _compute_apex_grade(user_id)
    tier = _grade_to_tier(apex_grade)

    # Streak: from training_logs
    streak_current, streak_longest = _compute_streaks(user_id)

    # Recent 5 sends
    recent_sends = _get_recent_sends(user_id, limit=5)

    archetype = _compute_archetype_py(pentagon) if pentagon else "Apprentice"

    return {
        "apex_grade": apex_grade,
        "tier": tier,
        "streak_days_current": streak_current,
        "streak_days_longest": streak_longest,
        "pentagon": pentagon,
        "recent_sends": recent_sends,
        "archetype": archetype,
    }
```

Add the helper functions (these will be very short; the heavy lifting reuses existing rollup logic):

```python
def _compute_current_pentagon(user_id):
    """Reuse existing style-rollup; return {power, crimpy, dynamic, technical, mobility}."""
    # If the codebase already computes this for /api/training/baseline, reuse it.
    # Otherwise: pull last 30 days of sends, compute axis means.
    from database import get_style_rollup  # or whatever the existing helper is
    try:
        rollup = get_style_rollup(user_id)
        return rollup or None
    except Exception:
        return None


def _compute_apex_grade(user_id):
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT grade FROM training_logs
            WHERE user_id = %s AND outcome = 'sent' AND grade IS NOT NULL
            ORDER BY grade_numeric DESC NULLS LAST
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
    return row[0] if row else None


def _grade_to_tier(grade):
    """V0=Sandstone, V11+=Obsidian."""
    if not grade:
        return "sandstone"
    GRADES = ["sandstone", "granite", "basalt", "quartz", "jasper",
              "jade", "topaz", "garnet", "emerald", "ruby", "diamond", "obsidian"]
    # Extract V-grade integer
    import re
    m = re.match(r"V(\d+)", grade)
    if not m:
        return "sandstone"
    n = int(m.group(1))
    return GRADES[min(n, len(GRADES) - 1)]


def _compute_streaks(user_id):
    """Returns (current, longest) consecutive-day streak."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT DATE(logged_at) FROM training_logs WHERE user_id = %s ORDER BY 1 DESC",
            (user_id,),
        )
        dates = [r[0] for r in cur.fetchall()]
    if not dates:
        return 0, 0

    # Current streak
    today = dt.date.today()
    yesterday = today - dt.timedelta(days=1)
    if dates[0] == today: cursor = today
    elif dates[0] == yesterday: cursor = yesterday
    else: return 0, _longest_streak(dates)

    current = 0
    for d in dates:
        if d == cursor:
            current += 1
            cursor -= dt.timedelta(days=1)
        elif d < cursor:
            break

    return current, _longest_streak(dates)


def _longest_streak(dates_desc):
    if not dates_desc: return 0
    longest = 1
    run = 1
    for i in range(1, len(dates_desc)):
        if dates_desc[i - 1] - dates_desc[i] == dt.timedelta(days=1):
            run += 1
            longest = max(longest, run)
        else:
            run = 1
    return longest


def _get_recent_sends(user_id, limit=5):
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT wall_angle, sent_at, grade, is_first_at_grade, burns_before_send
            FROM training_logs
            WHERE user_id = %s AND outcome = 'sent'
            ORDER BY sent_at DESC NULLS LAST
            LIMIT %s
            """,
            (user_id, limit),
        )
        rows = cur.fetchall()
    return [
        {
            "wallAngle": r[0],
            "sentAt": r[1].isoformat() if r[1] else None,
            "grade": r[2],
            "isFirstAtGrade": bool(r[3]),
            "burnsBeforeSend": r[4] or 0,
        }
        for r in rows
    ]


def _compute_archetype_py(pentagon):
    """Python port of the JS archetype rules. Keep in sync with frontend/src/lib/identity/archetype.js."""
    p, c, d, t, m = pentagon["power"], pentagon["crimpy"], pentagon["dynamic"], pentagon["technical"], pentagon["mobility"]
    if all(v < 5 for v in (p, c, d, t, m)): return "Apprentice"
    if p > 7 and c > 7 and m < 5: return "Crimper"
    if p > 7 and d > 7: return "Dynamo"
    if t > 8 and m > 6 and p < 6: return "Slabber"
    if c > 8 and m > 6 and d < 5: return "Spider"
    if d > 7 and m > 7 and c < 5: return "Acrobat"
    if c > 7 and d > 7 and t < 5: return "Brute"
    vs = (p, c, d, t, m)
    if max(vs) - min(vs) <= 1.5: return "All-Rounder"
    dom = max(["power", "crimpy", "dynamic", "technical", "mobility"], key=lambda k: pentagon[k])
    return {"power": "Brute", "crimpy": "Crimper", "dynamic": "Dynamo",
            "technical": "Slabber", "mobility": "Spider"}[dom]
```

**Important:** the column names above (`wall_angle`, `sent_at`, `is_first_at_grade`, `burns_before_send`, `grade_numeric`) need to match the actual `training_logs` schema. Before writing this code, run `\d training_logs` in psql or `grep -n "CREATE TABLE.*training_logs" database.py` and adjust column names to match. If `is_first_at_grade` or `burns_before_send` don't exist, this plan adds them in a follow-up migration task; for now, default to false / 0.

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_state_endpoint.py -v`

If columns are missing → resolve before continuing (either add them or fall back to defaults in the SQL).

- [ ] **Step 5: Commit**

```bash
git add main.py tests/test_state_endpoint.py
git commit -m "feat(api): /api/me/state for the Hub identity strip"
```

---

### Task 14: Implement `/api/me/pentagon-snapshots` endpoint with backfill

**Files:**
- Modify: `main.py`

- [ ] **Step 1: Write the test**

```python
# Append to tests/test_state_endpoint.py
def test_pentagon_snapshots_endpoint_returns_list():
    token = _register_and_login()
    r = client.get("/api/me/pentagon-snapshots?limit=6",
                   headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert "snapshots" in body
    assert isinstance(body["snapshots"], list)
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Add endpoint**

```python
@app.get("/api/me/pentagon-snapshots")
def list_pentagon_snapshots(limit: int = 6, user=Depends(get_current_user)):
    """
    Returns the user's last N monthly pentagon snapshots.
    On first request for an account with > 6 months of send history but no
    snapshots yet, lazily backfills up to 5 historical points.
    """
    user_id = user["id"]
    snapshots = get_pentagon_snapshots(user_id, limit=limit)

    if not snapshots:
        backfilled = _backfill_pentagon_snapshots(user_id)
        if backfilled:
            snapshots = get_pentagon_snapshots(user_id, limit=limit)

    return {
        "snapshots": [
            {
                "captured_at": s["captured_at"].isoformat(),
                "axes": s["axes"],
                "archetype": s["archetype"],
            }
            for s in snapshots
        ]
    }


def _backfill_pentagon_snapshots(user_id):
    """Reconstruct up to 5 historical monthly snapshots from training_logs."""
    # Strategy: for each of the last 5 months, compute a pentagon from sends
    # up to and including that month. Skip months with no activity.
    import datetime as dt
    now = dt.datetime.now(tz=dt.timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    written = 0
    for i in range(5, 0, -1):
        month_start = (now - dt.timedelta(days=30 * i)).replace(day=1)
        axes = _compute_pentagon_as_of(user_id, month_start)
        if axes is None:
            continue
        archetype = _compute_archetype_py(axes)
        save_pentagon_snapshot(user_id, month_start, axes, archetype)
        written += 1
    return written


def _compute_pentagon_as_of(user_id, when):
    """Pentagon computed from sends up to `when`. Returns None if no sends."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT wall_angle, grade, dynamic_score, technical_score
            FROM training_logs
            WHERE user_id = %s AND sent_at <= %s AND outcome = 'sent'
            """,
            (user_id, when),
        )
        rows = cur.fetchall()
    if not rows:
        return None
    # Stub: use the same logic as _compute_current_pentagon if available; otherwise
    # placeholder uniform pentagon = 3.0 axes. The implementation engineer should
    # wire this to the same rollup function used by /api/me/state.
    return {"power": 3.0, "crimpy": 3.0, "dynamic": 3.0, "technical": 3.0, "mobility": 3.0}
```

**Note for engineer:** `_compute_pentagon_as_of` must use the same pentagon-recompute logic as `_compute_current_pentagon` but filtered by the `when` cutoff. If the existing rollup function doesn't accept a time filter, refactor it to accept one and update the call in `_compute_current_pentagon` to pass `now()`.

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add main.py tests/test_state_endpoint.py
git commit -m "feat(api): /api/me/pentagon-snapshots with lazy historical backfill"
```

---

### Task 15: Add monthly snapshot cron script

**Files:**
- Create: `scripts/snapshot_pentagon_cron.py`
- Create: `tests/test_pentagon_snapshot_job.py`

- [ ] **Step 1: Write the test**

```python
# tests/test_pentagon_snapshot_job.py
from scripts.snapshot_pentagon_cron import run_snapshots
from database import init_db, get_pentagon_snapshots
import datetime as dt


def test_run_snapshots_writes_one_row_per_active_user():
    init_db()
    # Setup: register two users, give one a send log
    # (Use existing test fixtures or direct SQL)
    # Then:
    run_snapshots(now=dt.datetime(2026, 7, 1, tzinfo=dt.timezone.utc))
    # Assert: each active user has a July 2026 snapshot
    # (Exact assertion shape depends on test fixtures available)
```

This test is intentionally light — full DB fixture setup is out of scope for this plan. The engineer should expand fixtures as needed.

- [ ] **Step 2: Implement the script**

```python
# scripts/snapshot_pentagon_cron.py
"""
Monthly pentagon snapshot job.

Run via crontab or scheduled task on the 1st of each month at 03:00 UTC:
    0 3 1 * * cd /path/to/coretriage && /path/to/venv/bin/python -m scripts.snapshot_pentagon_cron

For each user with at least one send in the past 90 days, computes their
current pentagon and writes a row to pentagon_snapshots (idempotent per
calendar month thanks to the unique constraint).
"""
import datetime as dt
import sys
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("snapshot_pentagon_cron")


def run_snapshots(now=None):
    from database import _conn, save_pentagon_snapshot
    from main import _compute_current_pentagon, _compute_archetype_py

    now = now or dt.datetime.now(tz=dt.timezone.utc)
    log.info(f"Running monthly pentagon snapshot at {now.isoformat()}")

    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT user_id FROM training_logs
            WHERE logged_at >= %s
            """,
            (now - dt.timedelta(days=90),),
        )
        user_ids = [r[0] for r in cur.fetchall()]

    log.info(f"Active users to snapshot: {len(user_ids)}")
    written = 0
    for user_id in user_ids:
        try:
            pentagon = _compute_current_pentagon(user_id)
            if not pentagon:
                continue
            archetype = _compute_archetype_py(pentagon)
            save_pentagon_snapshot(user_id, now, pentagon, archetype)
            written += 1
        except Exception as e:
            log.error(f"Snapshot failed for user {user_id}: {e}")
    log.info(f"Wrote {written} snapshots")
    return written


if __name__ == "__main__":
    run_snapshots()
```

- [ ] **Step 3: Run the test, manually verify the script runs**

Run: `pytest tests/test_pentagon_snapshot_job.py -v`
Then: `python -m scripts.snapshot_pentagon_cron` (against dev DB)

- [ ] **Step 4: Commit**

```bash
git add scripts/snapshot_pentagon_cron.py tests/test_pentagon_snapshot_job.py
git commit -m "feat(jobs): monthly pentagon snapshot cron"
```

---

### Task 16: Add API client wrappers for the new endpoints

**Files:**
- Modify: `frontend/src/api.js`

- [ ] **Step 1: Open api.js and locate the existing `// Profile` section**

Run: `grep -n "Profile" frontend/src/api.js`

- [ ] **Step 2: Add two new wrappers**

Below the existing profile entries:

```js
// Identity surface (Hub hero strip)
export const getMeState           = () => request('GET', '/api/me/state')
export const getPentagonSnapshots = (limit = 6) =>
  request('GET', `/api/me/pentagon-snapshots?limit=${encodeURIComponent(limit)}`)
```

- [ ] **Step 3: Verify the build**

Run: `cd frontend && npm run build` — expect success.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api.js
git commit -m "feat(api): client wrappers for me-state and pentagon-snapshots"
```

---

### Task 17: Build the PentagonMorphTimeline component

**Files:**
- Create: `frontend/src/components/identity/PentagonMorphTimeline.jsx`
- Create: `frontend/src/components/identity/PentagonMorphTimeline.test.jsx`

- [ ] **Step 1: Write the test**

```jsx
// frontend/src/components/identity/PentagonMorphTimeline.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PentagonMorphTimeline from './PentagonMorphTimeline'

const snapshots = Array.from({ length: 6 }).map((_, i) => ({
  capturedAt: new Date(2026, i, 1).toISOString(),
  axes: { power: 5 + i * 0.3, crimpy: 5 + i * 0.4, dynamic: 5, technical: 5, mobility: 5 },
  archetype: i < 3 ? 'Apprentice' : 'Slabber',
  isNow: i === 5,
}))

describe('PentagonMorphTimeline', () => {
  it('renders 6 cells', () => {
    const { container } = render(<PentagonMorphTimeline snapshots={snapshots} />)
    expect(container.querySelectorAll('[data-morph-cell]').length).toBe(6)
  })

  it('marks the NOW cell', () => {
    const { container } = render(<PentagonMorphTimeline snapshots={snapshots} />)
    expect(container.querySelector('[data-now="true"]')).not.toBeNull()
  })

  it('renders the caption', () => {
    render(<PentagonMorphTimeline snapshots={snapshots} />)
    expect(screen.getByRole('caption')).toBeTruthy()
  })

  it('fires onCellClick when a cell is clicked', () => {
    const onClick = vi.fn()
    render(<PentagonMorphTimeline snapshots={snapshots} onCellClick={onClick} />)
    fireEvent.click(document.querySelector('[data-morph-cell]'))
    expect(onClick).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement PentagonMorphTimeline**

```jsx
// frontend/src/components/identity/PentagonMorphTimeline.jsx
import Pentagon from './Pentagon'

function formatMonth(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()
}

function generateCaption(snapshots) {
  if (snapshots.length < 2) return null
  const first = snapshots[0]
  const last = snapshots[snapshots.length - 1]
  const months = snapshots.length
  const firstArch = first.archetype
  const lastArch = last.archetype

  // Find the most-changed axis
  const axisDeltas = ['power', 'crimpy', 'dynamic', 'technical', 'mobility'].map((k) => ({
    axis: k,
    delta: (last.axes[k] || 0) - (first.axes[k] || 0),
  }))
  const grew = axisDeltas.reduce((max, d) => (d.delta > max.delta ? d : max), axisDeltas[0])
  const shrank = axisDeltas.reduce((min, d) => (d.delta < min.delta ? d : min), axisDeltas[0])

  let arc = firstArch === lastArch ? lastArch : `${firstArch} → ${lastArch}`
  let detail = grew.delta > 0.5
    ? `Your ${grew.axis} axis grew ${grew.delta.toFixed(1)} points.`
    : ''
  let weak = shrank.delta < -0.5
    ? `${shrank.axis} cooled.`
    : (last.axes[shrank.axis] < 5
       ? `${shrank.axis.charAt(0).toUpperCase() + shrank.axis.slice(1)} stayed quiet — that's the next push.`
       : '')

  return `${months} months. ${arc}. ${detail} ${weak}`.replace(/\s+/g, ' ').trim()
}

export default function PentagonMorphTimeline({ snapshots = [], onCellClick }) {
  const cells = snapshots.slice(0, 6)
  const caption = generateCaption(cells)

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--ct-paper-mid)', border: '1px solid var(--ct-ink-quiet)' }}>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {cells.map((snap, i) => (
          <button
            key={snap.capturedAt}
            data-morph-cell
            data-now={snap.isNow || i === cells.length - 1 ? 'true' : 'false'}
            type="button"
            onClick={() => onCellClick && onCellClick(snap)}
            className="flex flex-col items-center text-center bg-transparent border-0 cursor-pointer"
          >
            <Pentagon axes={snap.axes} size={84} animate={i === cells.length - 1} />
            <span className="font-mono text-[10px] tracking-widest mt-1" style={{ color: 'var(--ct-ink-quiet)' }}>
              {formatMonth(snap.capturedAt)}
            </span>
            <span className="font-serif italic text-xs mt-1" style={{ color: 'var(--ct-ink-soft)' }}>
              {snap.archetype}
            </span>
          </button>
        ))}
      </div>
      {caption && (
        <p role="caption" className="font-serif italic text-center mt-4 pt-3" style={{ color: 'var(--ct-ink-soft)', borderTop: '1px dashed var(--ct-ink-quiet)' }}>
          {caption}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/identity/PentagonMorphTimeline.jsx frontend/src/components/identity/PentagonMorphTimeline.test.jsx
git commit -m "feat(identity): PentagonMorphTimeline with auto-generated caption"
```

---

### Task 18: Wire the new Hub identity strip into HubTab

**Files:**
- Modify: `frontend/src/components/HubTab.jsx`

- [ ] **Step 1: Read HubTab to find the existing hero section**

Run: `grep -n "StatRadar\|HubStyleMix\|hero" frontend/src/components/HubTab.jsx | head -20`

Find the existing pentagon card placement.

- [ ] **Step 2: Add data fetching for /api/me/state and snapshots**

Add to imports:

```jsx
import { useEffect, useState } from 'react'
import { getMeState, getPentagonSnapshots } from '../api'
import Pentagon from './identity/Pentagon'
import IdentityLabel from './identity/IdentityLabel'
import StreakFlame from './identity/StreakFlame'
import PentagonMorphTimeline from './identity/PentagonMorphTimeline'
```

Add state + fetch in the component:

```jsx
const [state, setState] = useState(null)
const [snapshots, setSnapshots] = useState([])

useEffect(() => {
  let cancelled = false
  Promise.all([getMeState(), getPentagonSnapshots(6)])
    .then(([s, ss]) => {
      if (cancelled) return
      setState(s)
      setSnapshots(ss.snapshots || [])
    })
    .catch((err) => console.error('[HubTab] state fetch failed', err))
  return () => { cancelled = true }
}, [])
```

- [ ] **Step 3: Render the new hero strip**

Replace the existing pentagon-card block with:

```jsx
{state && state.pentagon && (
  <section
    className="rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-5 md:items-center"
    style={{ background: 'var(--ct-paper-base)', border: '1px solid var(--ct-ink-quiet)' }}
  >
    <div className="flex-shrink-0 mx-auto md:mx-0">
      <Pentagon
        axes={state.pentagon}
        size={180}
        tier={state.tier}
        showLabels
        animate
      />
    </div>
    <div className="flex-1 flex flex-col gap-3">
      <div className="font-mono text-[10px] tracking-[0.22em] uppercase font-bold" style={{ color: 'var(--ct-ink-quiet)' }}>
        you are
      </div>
      <IdentityLabel
        axes={state.pentagon}
        recentSends={state.recent_sends}
        variant="inline"
      />
      <div className="flex items-center gap-4 mt-2 pt-3" style={{ borderTop: '1px dashed var(--ct-ink-quiet)' }}>
        <StreakFlame days={state.streak_days_current} size="md" />
        <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--ct-ink-quiet)' }}>
          APEX <strong style={{ color: 'var(--ct-ink)' }}>{state.apex_grade || '—'}</strong>
        </div>
      </div>
    </div>
  </section>
)}

{snapshots.length >= 2 && (
  <section className="mt-4">
    <PentagonMorphTimeline snapshots={snapshots} />
  </section>
)}
```

Keep the rest of HubTab (today's session, recent log) untouched — those land in later plans.

- [ ] **Step 4: Manual smoke test**

Run `cd frontend && npm run dev`, sign in with a test account, navigate to Hub. Expect to see the new hero strip with pentagon + identity label + streak flame. The morph timeline appears below if snapshots are available (might be empty for a brand-new user — that's expected).

- [ ] **Step 5: Run the frontend test suite**

Run: `cd frontend && npx vitest run`

- [ ] **Step 6: Run the backend test suite**

Run: `pytest tests/test_pentagon_snapshots.py tests/test_state_endpoint.py tests/test_pentagon_snapshot_job.py -v`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/HubTab.jsx
git commit -m "feat(hub): new identity hero strip + morph timeline"
```

---

### Task 19: Build the full app

**Files:**
- All

- [ ] **Step 1: Production build**

Run: `cd frontend && npm run build`

Expected: build succeeds, no Tailwind / Vite warnings new to this plan.

- [ ] **Step 2: Backend smoke test**

Run: `python -c "from main import app; print('OK')"` from the project root.

Expected: imports cleanly.

- [ ] **Step 3: Spot-check production preview**

Run: `cd frontend && npm run preview`. Open the served URL, log in, verify the Hub renders.

- [ ] **Step 4: Run the entire frontend test suite**

Run: `cd frontend && npx vitest run`

Expected: all green.

- [ ] **Step 5: Run the entire backend test suite**

Run: `pytest tests/ -v`

Expected: all green (no regressions in pre-existing tests).

- [ ] **Step 6: Final commit + push**

```bash
git status
# Confirm nothing unintended is staged
git push origin <branch-name>
```

---

## Verification

Plan #1 ships when:

- [ ] All 19 tasks committed
- [ ] Frontend `vitest run` passes
- [ ] Backend `pytest tests/` passes
- [ ] Production `npm run build` succeeds with no new warnings
- [ ] Manual smoke test on `/hub` shows: new hero strip (Pentagon + Identity Label + Streak Flame + apex grade); morph timeline if user has ≥ 2 snapshots
- [ ] `/api/me/state` returns required keys for a fresh account (with defaults for missing data)
- [ ] `/api/me/pentagon-snapshots` returns a list (empty or populated) and triggers lazy backfill on first read

**Next plans** (write after this one ships):

- **Plan #2 · Tier system** — 12-rank gemstone ladder UI + `data-tier` CSS escalation + promotion ceremony + Obsidian dark-mode unlock + dedicated Ladder surface
- **Plan #3 · Sharable Card** — Satori-based PNG export at 1080×1920, milestone auto-prompts, year-end Wrapped story
- **Plan #4 · Per-surface rebrand** — Train, Progress, Recover, Chat→Cartographer, Movement Analyzer, Settings→Provisions, Auth+Landing each get the design system applied + lexicon pass
- **Plan #5 · QA pass** — Cross-tier regression sweep, responsive screenshots, accessibility audit, lighthouse pass

---

**End of plan.**
