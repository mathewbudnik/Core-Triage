# Triage wizard restyle (v1)

**Date:** 2026-05-16
**Owner:** Mathew
**Status:** Approved (mockups in `.superpowers/brainstorm/1045-1779035766/content/`)

## Problem

The SmartTriageCard wizard (the second screen of triage, where users answer onset/mechanism/pain/signals) looks visually disconnected from the rest of the app. The Hub and Progress tabs were rebuilt around a glassmorphism + tier-theme language (`rgba(0,0,0,0.35)` surfaces, `var(--tier-c)` accents, 0.5px hairline borders, eyebrow labels in 11px bold uppercase). The triage wizard still uses the older `bg-panel` flat-panel style with hardcoded teal accents.

The wizard's information architecture is actually solid — one page, smart progressive disclosure, sticky submit, inline diagnosis. The mismatch is purely visual treatment.

## Solution

Restyle the wizard to match the Hub/Progress visual system, restructure it as **stacked section cards** (one card per question group) with **autoscroll on selection** and **compression of completed sections**. The diagnosis reveal becomes a stack of glass cards in the same language — answers strip + severity hero (color picks up tier severity) + differentials + sticky CTA.

Explicitly **not** in this spec: the BodyDiagram region picker (works fine, stays as-is), the triage API or classifier logic, the question set itself.

## Layout (mockups v2 locked)

### Form state — stacked section cards

```
┌───────────────────────────────┐
│  [eyebrow] Triage             │
│  Wrist screening              │
│  Tap through the chips…       │
│                                │
│ ┌───────────────────────────┐ │  ← Region pill card
│ │ ● Wrist           Change ›│ │
│ └───────────────────────────┘ │
│                                │
│ ┌───────────────────────────┐ │  ← Essentials (focused, teal glow)
│ │ [eyebrow] Essentials · 1/4│ │
│ │ When did it start?        │ │
│ │ [Sudden] [Gradual]        │ │
│ └───────────────────────────┘ │
│                                │
│ ┌───────────────────────────┐ │  ← Mechanism (dim, opacity 0.45)
│ │ [eyebrow] Mechanism · 2   │ │
│ │ What were you doing?      │ │
│ │ [Crimp] [Dyno] [Pocket] … │ │
│ └───────────────────────────┘ │
│                                │
│ … Pain, Anything else …       │
│                                │
│ ┌───────────────────────────┐ │  ← Sticky submit bar
│ │  Tell us a bit more       │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

### After "Gradual" tap

- Onset card auto-scrolls out of view; compresses to a **summary pill**:
  ```
  ✓  ONSET     Gradual                       Edit ›
  ```
- Mechanism card takes the focused state (teal glow border).
- Subsequent dim sections fade to full opacity as the scroll reaches each.

### Near-submit state

- Three summary pills stacked at top (Onset / Mechanism / Pain), each tappable to re-expand.
- "Anything else" is the last focused card — multi-pick chips, no auto-advance.
- Sticky submit hardens to teal "Get my guidance →".

### Diagnosis-reveal state

Same vocabulary, content swap:

```
┌───────────────────────────────┐
│  Your wrist screening         │
│  Educational — not a diagnosis│
│                                │
│ ┌───────────────────────────┐ │  ← Answers strip (2×2 mini-grid)
│ │ YOUR ANSWERS       Edit › │ │
│ │ Onset    Gradual          │ │
│ │ Pain     5/10             │ │
│ │ Mechanism Hard crimp      │ │
│ │ Signals  Swelling, AM     │ │
│ └───────────────────────────┘ │
│                                │
│ ┌───────────────────────────┐ │  ← Severity hero (gold for moderate)
│ │ ● MODERATE                │ │
│ │ Wrist flexor tendinopathy │ │
│ │ Gradual onset after crimp…│ │
│ │ ─────────────────────────  │ │
│ │ ✓Ice  ✓Open-hand          │ │
│ │ ✗No crimp  ✗No hangboard  │ │
│ └───────────────────────────┘ │
│                                │
│ ┌───────────────────────────┐ │  ← Other possibilities (glass card)
│ │ OTHER POSSIBILITIES       │ │
│ │ ② TFCC strain          ›  │ │
│ │ ③ De Quervain's       ›  │ │
│ └───────────────────────────┘ │
│                                │
│ ┌───────────────────────────┐ │  ← Bottom action bar
│ │ Open my rehab plan →  [⤓] │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

## Visual system (matches HubRingsCard / HubGreeting / ProgressTierHero)

Card surface:
```css
background: rgba(0,0,0,0.35);
border: 0.5px solid rgba(255,255,255,0.10);
backdrop-filter: blur(8px);
border-radius: 18px; /* 14px for compressed pills, 24px for primary CTAs */
```

Tier-aware accents — every accent reads from CSS variables set by `TierThemeRoot`:
- `var(--tier-c)` — primary tier color (e.g. teal Frost)
- `var(--tier-light)` — lighter shade for eyebrow labels and active chip text

Eyebrow labels (every section header, every page eyebrow):
```css
font-size: 10px; font-weight: 800;
text-transform: uppercase; letter-spacing: 0.10em;
color: var(--tier-light);
```

Big numbers (pain value, etc):
```css
font-variant-numeric: tabular-nums;
letter-spacing: -0.02em;
```

## Section card states

| State | Visual |
|---|---|
| **dim** | `opacity: 0.45`; default glass border. The user hasn't reached this section yet. |
| **focused** | `opacity: 1`; border becomes `rgba(20,184,166,0.40)` + soft shadow `0 8px 24px rgba(20,184,166,0.08)`. The current section. |
| **passed** (compressed) | Height collapses to ~48px summary pill. Eyebrow + value + Edit link. Tap to re-expand. |
| **visited but not passed** | `opacity: 1`; default glass border. The user opened this section but moved on without it being "the current focus." Treated like dim from a scroll perspective but full opacity for readability. |

State transitions are owned by the wizard orchestrator (see Components below). Each card receives a single `state` prop — no internal state-machine duplication.

## Autoscroll behavior

| Field type | Trigger |
|---|---|
| Single-pick chips (Onset, Mechanism) | On tap |
| Pain slider | On `pointerup` / `touchend` (release), not on every drag |
| Multi-pick chips (Anything else) | **No auto-advance** — user taps submit when ready |

Implementation:
```js
sectionRef.current?.scrollIntoView({
  behavior: prefersReducedMotion ? 'auto' : 'smooth',
  block: 'start',
})
// Offset the page-header height so the new section's eyebrow is fully visible.
window.scrollBy(0, -scrollOffsetPx)
```

`scrollOffsetPx` is a small constant (~16–24px) tuned to the page-header height once the title scrolls out.

After the scroll fires, the just-completed section transitions to `passed` state (compresses). The destination section transitions from `dim` to `focused`. Both transitions happen on the same animation frame for smoothness.

### Edit re-expansion

Tap a compressed pill → that section returns to `focused`. **Subsequent sections do not recompress** — they stay in whatever state they were. The user can revise without losing their place. Re-selection in the re-opened section does NOT autoscroll forward (would be jarring). The user manually scrolls back down when done.

### Reduced motion

`window.matchMedia('(prefers-reduced-motion: reduce)')`:
- Scroll uses `behavior: 'auto'` (instant jump)
- Compression skips the height transition (snaps from full card to pill)
- Focus glow still applies (it's a static border, not motion)

## Diagnosis reveal — severity → color mapping

| Severity | Hero treatment | CTA |
|---|---|---|
| `mild` | Teal gradient hero, `● MILD` pill, ✓/✗ action chips below divider | `Open my rehab plan →` (teal) |
| `moderate` | Gold gradient hero, `● MODERATE` pill, ✓/✗ action chips below divider | `Open my rehab plan →` (teal) |
| `severe` | Coral red-flag callout *replaces* the gradient hero shape — different layout: warning icon + headline + paragraph, no action chips | `Find urgent care →` (coral); rehab plan still reachable via secondary link |

The `severity.level` field already comes back from `/api/triage` (mild / moderate / severe). Frontend maps level → tone constant → JSX variant. No backend change.

Differentials list reuses the same glass card on every tier. Numbered rank pill in the leftmost slot — teal for mild/moderate, coral for severe.

## Components

```
frontend/src/components/triage/
├─ TriageWizard.jsx           (orchestrator: section state machine + autoscroll + submit)
├─ TriageSectionCard.jsx      (one stacked card; receives state: dim/focused/visited/passed)
├─ TriageSummaryPill.jsx      (the compressed one-line variant of a section)
├─ TriageRegionPill.jsx       (the small "Wrist · Change ›" pill card at top)
├─ TriageHero.jsx             (severity hero — variant by mild/moderate/severe)
├─ TriageDifferentials.jsx    (ranked list of bucket possibilities)
├─ TriageActionsBar.jsx       (sticky bottom: primary CTA + ghost overflow)
└─ useTriageAutoscroll.js     (hook returning per-section refs + scrollToNext(index))

frontend/src/components/
├─ TriageTab.jsx              (modified — now mounts TriageWizard instead of SmartTriageCard)
└─ TriageDiagnosis.jsx        (modified — split into TriageHero + TriageDifferentials,
                              kept as a thin wrapper if anything else imports it)
```

The current `SmartTriageCard.jsx` and `DiagnosisSkeleton.jsx` get retired/absorbed:
- The form sections (EssentialsSection, AnythingElseSection, PainSlider) become children of TriageSectionCard variants.
- The chip + section-label + sub-label primitives move to small files inside `triage/`.
- DiagnosisSkeleton stays — it's a clean leaf and still useful between submit and result arrival.

## State machine (orchestrator)

`TriageWizard` owns a single `sectionStates` map:

```js
// keys: 'onset' | 'mechanism' | 'pain' | 'anythingElse'
// values: 'dim' | 'focused' | 'visited' | 'passed'

const SECTION_ORDER = ['onset', 'mechanism', 'pain', 'anythingElse']
```

Transitions:
- Mount: `{ onset: 'focused', mechanism: 'dim', pain: 'dim', anythingElse: 'dim' }`
- On single-pick tap in `onset`: `onset → 'passed'`, `mechanism → 'focused'`, scroll
- Same pattern through Pain
- After Pain: `anythingElse → 'focused'`; submit becomes enabled
- Tap a compressed pill (Edit): that section → `'focused'`, others unchanged

Submit-enabled condition: `onset && mechanism && severity != null` (Anything else is optional).

## Routing / data flow (unchanged)

- URL: `/triage` for body-diagram step, `/triage/card` for the wizard, unchanged.
- Submit: existing `triageIntake({...form, ...})` POST to `/api/triage` — unchanged.
- Auto-save session for signed-in users — unchanged.
- `saveLastTriage(...)` to sessionStorage — unchanged.
- Open-rehab-plan navigation: `navigate('/body', { state: { triageResult, triageForm } })` — unchanged.

## Out of scope (v1)

- **BodyDiagram (step 0)**. Stays as the region picker — different visual problem to solve, separate spec if it gets touched.
- **Finger context section.** The Finger-only inputs (which finger, palm-side location, grip mode) currently live inside the EssentialsSection as conditional rows. v1 keeps them inside the Essentials card — they're part of "Step 1." A separate section card for finger context is a v2 possibility but adds a fifth card to an already-busy stack.
- **The triage classifier / API.** No backend changes.
- **Tier theme system.** Already shipped (`TierThemeRoot`, `--tier-c`, `--tier-light`). This spec consumes it; doesn't modify it.
- **PDF download / share.** The ghost overflow button on the diagnosis-reveal bottom bar opens an existing flow; no new functionality.
- **Coachmarks / tour replay.** Existing wiring in TriageTab is preserved; the wizard restyle doesn't introduce new coachmark anchors.

## Open questions

None. Layout, autoscroll trigger, compression behavior, severity-color mapping, and component breakdown all resolved through the brainstorm flow.
