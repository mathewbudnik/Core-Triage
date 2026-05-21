# RPG Climber — Phase 5: TierThemeProvider + tier-unlock celebration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship `<TierThemeProvider>` as the primitive named in spec §15, wire it at the app root so any descendant can subscribe to the climber's current tier without prop drilling, and ensure the existing tier-promotion celebration reads correctly on the RPG aesthetic. **Deliberately defers** the per-tier chrome palette swap (spec §11) because the user chose a unified RPG palette in Phase 3/4. Per-tier color reactivity is preserved where it conveys data (tier badges, BodyDiagram regions, GradePyramid rows, the tier-promotion celebration splash itself) but is no longer pushed app-wide as chrome.

**Architecture:** `<TierThemeProvider>` is a thin React context provider exposing `{ tier, tierTokens, name }`. It reads from the existing `useAppTier` source of truth (App.jsx's `userTier` state derived from `getPyramid` + `workingTierFromHardest`). Components that today receive `tierId` via props (HubHero TierBadge, ProgressTierHero, TrainHeader, etc.) can either keep their explicit props OR migrate to `useTierTheme()`. Migration is opt-in — this phase doesn't refactor consumers, it just makes the provider available. The CSS-var swap that `TierThemeRoot` currently performs (writing `--tier-c`, `--tier-light`, etc.) stays exactly as-is so existing tier-reactive surfaces (TierBadge, BodyDiagram, GradePyramid) continue to work.

The tier-promotion celebration already exists (`<TierPromotionTakeover>`). Phase 5 verifies it reads correctly with the RPG aesthetic and tunes the copy to the "Climb Clean" setter voice.

**Tech Stack:** React 18 context, no new deps.

---

## File structure

### New
- `frontend/src/components/ui/TierThemeProvider.jsx` — context provider exposing `{ tier, tierTokens, name }` to descendants. (Note: a stub file with this name exists — replace it with the real implementation.)
- `frontend/src/hooks/useTierTheme.js` — consumer hook returning the context value.

### Modified
- `frontend/src/App.jsx` — wrap the authenticated routes in `<TierThemeProvider tier={userTier}>` so any descendant can `useTierTheme()`.
- `frontend/src/components/TierPromotionTakeover.jsx` — copy/voice refresh ("Climb clean" setter voice) + minor chrome tune (cream-on-forest text where appropriate).

### Not modified (deliberate)
- Per-tier chrome palette swap (spec §11) — deferred per user direction. Documented in retro.
- `TierThemeRoot` keeps doing the CSS var write; new provider sits alongside, not replacing it.

---

## Task 1: Build `<TierThemeProvider>` + `useTierTheme()`

**Files:**
- Modify (or create): `frontend/src/components/ui/TierThemeProvider.jsx`
- Create: `frontend/src/hooks/useTierTheme.js`

- [ ] **Step 1: Replace `TierThemeProvider.jsx` with a real context implementation**

```jsx
// frontend/src/components/ui/TierThemeProvider.jsx
import { createContext, useMemo } from 'react'
import { TIER_TOKENS, TIER_NAMES } from '../../lib/tier'

export const TierThemeContext = createContext({
  tier: null,
  tokens: null,
  name: null,
})

/**
 * Exposes the climber's current working tier to descendants.
 *
 * Props:
 *   tier:    tier id ('rookie' | 'v0' | ... | 'v10') | null
 *   children
 */
export default function TierThemeProvider({ tier, children }) {
  const value = useMemo(() => ({
    tier: tier || null,
    tokens: tier ? TIER_TOKENS[tier] || null : null,
    name:   tier ? TIER_NAMES[tier]  || null : null,
  }), [tier])

  return (
    <TierThemeContext.Provider value={value}>
      {children}
    </TierThemeContext.Provider>
  )
}
```

- [ ] **Step 2: Create the consumer hook**

```js
// frontend/src/hooks/useTierTheme.js
import { useContext } from 'react'
import { TierThemeContext } from '../components/ui/TierThemeProvider'

export function useTierTheme() {
  return useContext(TierThemeContext)
}
```

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/TierThemeProvider.jsx frontend/src/hooks/useTierTheme.js
git commit -m "feat(theme): TierThemeProvider context + useTierTheme hook"
```

---

## Task 2: Wire `<TierThemeProvider>` at App root

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Import the provider**

Add `import TierThemeProvider from './components/ui/TierThemeProvider'` near the other imports.

- [ ] **Step 2: Wrap the authenticated route tree**

Find where `userTier` state is set and the authenticated app renders. Wrap the route tree (or the highest-common-ancestor of all tabs) in `<TierThemeProvider tier={userTier}>...</TierThemeProvider>`. Leave the existing `TierThemeRoot` wrappers intact — they handle the CSS var write and stay alongside.

If wrapping the whole router doesn't work cleanly (App.jsx might mount the router elsewhere), wrap at the next-best level — e.g., inside the route element. The goal is: any descendant of the authenticated tree can `useTierTheme()`.

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build && npm test -- --run`
Expected: clean. 80/80 tests still pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(theme): wire TierThemeProvider at app root"
```

---

## Task 3: Refresh `<TierPromotionTakeover>` copy + chrome

**Files:**
- Modify: `frontend/src/components/TierPromotionTakeover.jsx`

- [ ] **Step 1: Copy refresh to "Climb Clean" setter voice**

Find and replace these strings:

- `"New working tier"` → keep as-is (it's accurate)
- `"You've stepped into the {name} tier — the app's identity is now yours."` → `"You climbed clean into {name}. Keep moving."`
- `"Tap to continue"` → keep as-is

- [ ] **Step 2: Verify the takeover reads correctly against the RPG aesthetic**

The radial gradient + AwardMedal already use tier colors — that's intentional, it's the celebration moment showing the new tier identity. Don't change the gradient. Just make sure white text is readable against the tier-colored background (it should be — high contrast).

If the `text-white/45` "Tap to continue" looks washed out on lighter tier colors, bump it to `text-white/70`.

- [ ] **Step 3: Build check + manual smoke**

Run: `cd frontend && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TierPromotionTakeover.jsx
git commit -m "feat(theme): TierPromotionTakeover copy refresh to setter voice"
```

---

## Task 4: Phase 5 retro

- [ ] **Step 1: Sweep**

Run: `cd frontend && npm test -- --run && npm run build`
Expected: 80/80, clean.

- [ ] **Step 2: Retro stub**

Append to `docs/superpowers/specs/2026-05-20-rpg-climber-design.md`:

```markdown
## Phase 5 retrospective (added after implementation)

Phase 5 shipped on 2026-05-20 — N commits on `redesign/rpg-climber` since the Phase 5 plan, build green, 80/80 tests passing.

**Scope reduction:** spec §11 called for "tier-themed palettes ship; theme swaps app-wide on tier promotion." The user explicitly chose a unified RPG palette during Phase 3 ("top stack only" unify) and Phase 4 (whole-app chrome unification), so per-tier chrome theming was DELIBERATELY deferred. What shipped:

- TierThemeProvider as a context primitive (per spec §15 primitive list) — infrastructure available for future opt-in use.
- useTierTheme() hook for descendants that want to read the current tier without prop drilling.
- TierPromotionTakeover copy refresh to setter voice. The celebration moment continues to use tier-specific colors because the color IS the new identity being revealed — that's data-viz, not chrome.

What did NOT ship:

- Per-tier app-wide CSS variable swap on chrome surfaces. The user prefers ONE consistent RPG palette across all tabs.
- A "themes unlocked" panel where the climber chooses among Frost/Ember/etc. — deferred indefinitely or until the user explicitly wants this.

The existing TierThemeRoot (the original CSS-var writer) stays in place because tier-reactive data-viz (TierBadge, BodyDiagram region fills, GradePyramid bars) still reads `var(--tier-c)`. The new provider sits alongside it as a clean read API for new code.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-20-rpg-climber-design.md
git commit -m "docs(spec): Phase 5 retrospective"
```

---

## Critical invariants

- No behavior changes to existing tier handling. TierThemeRoot still writes CSS vars. TierPromotionTakeover still fires on `ct:tier-promotion`. App.jsx's tier-promotion listener still bumps `userTier`.
- No new modal/celebration logic — the takeover already exists from Phase 1.
- Don't touch chrome on Hub, Progress, Triage, Recover, Train, Chat. Phases 3/4 unified those — leave them.
- Don't introduce per-tier CSS-var overrides. Spec §11 is out of scope.

---

## Out of scope for Phase 5

- Tier-themed chrome (spec §11 deferred per user direction)
- A "choose your theme" picker
- Sound effects on tier promotion
- Backend tier state
