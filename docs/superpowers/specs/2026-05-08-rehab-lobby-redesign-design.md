# Rehab lobby redesign — body-silhouette visualizer cards

**Date:** 2026-05-08
**Owner:** Mathew
**Status:** Approved (v10 in `.superpowers/brainstorm/`)

## Problem

The rehab tab lobby (`/rehab` before a region is picked) currently shows a row of plain text pills (Finger, Wrist, Elbow, …). It works, but it reads as boring and doesn't give users a visual sense of what each region is. Climbers want a more "body-aware" affordance.

## Solution

Replace the pill row with a **2-column grid of body-silhouette cards**, grouped under three section headers (Upper body / Trunk & shoulder / Lower body). Each card has:

- A small body silhouette icon (~60×130 px) reusing the **exact SVG paths** from `BodyDiagram.jsx`. Default fill is the triage wizard's gold (`#C8A84B`); the relevant region for that card is filled in the triage wizard's red (`#FF4444`).
- The region name (e.g. "Hip")
- A meta line ("8 exercises · 5 wk")

A small "Back side" pill row sits below the grid for the two regions that have no front-view representation: **Upper Back, Lats**.

## Region → highlight map

All clip-paths reference the leg/arm SVG bounding box used in the existing `BodyDiagram` component.

| Card | Highlight clip | Notes |
|---|---|---|
| Neck | bottom 28% of head SVG | Uses real trapezoid shape from diagram |
| Shoulder | full shoulder paths | Both shoulders highlight |
| Chest | chest path | |
| Elbow | top 55% of arm | Both arms |
| Triceps | top 55% of arm | **Same clip as Elbow** — overlay path, default transparent |
| Wrist | bottom 45% of arm | |
| Finger | hand paths | |
| Abs | top 50% of stomach | |
| Lower Back | bottom 50% of stomach | |
| Hip | top 48% of leg | (kept original clip) |
| Glutes | top 30% of leg | Smaller highlight, distinct from Hip |
| Hamstrings | 25-50% of leg (thigh strip) | Overlay path |
| Knee | 48-66% of leg | |
| Calves | bottom 34% of leg | |
| Ankle | foot paths | |

**Back-side pills (no silhouette icon):** Upper Back, Lats.

## Color & rendering

- Body parts: `#C8A84B` (gold — same as `BodyDiagram` rest state)
- Active region: `#FF4444` (red — same as `BodyDiagram` selected state)
- Card backgrounds: very subtle group-color gradient
  - Upper body: teal `#7dd3c0` 6% → 0%
  - Trunk & shoulder: amber `#f7bb51` 6% → 0%
  - Lower body: coral `#f47272` 6% → 0%

## Implementation approach

A new reusable component:

```
<BodyIcon region="Hip" size={60} />
```

Internally renders a single `<svg>` containing all body-part paths (extracted into a shared module). Each path's fill is `var(--c-<Region>, var(--base))`, and the SVG sets `--c-<Region>: #FF4444` based on the `region` prop. CSS variables are used (instead of class-based path selectors) because the design uses `<symbol>` + `<use>` and external CSS can't penetrate the resulting shadow DOM.

**Overlay paths** (`Glutes`, `Hamstrings`, `Triceps`) default to `transparent` rather than gold — they only render when their own region is the active one. This avoids them overdrawing the underlying primary path's red highlight.

## Component changes

- New: `frontend/src/components/BodyIcon.jsx` — the silhouette renderer
- Modified: `frontend/src/components/RehabTab.jsx`
  - Pre-region-pick layout: replace pill row with the new grid
  - Add three section headers (Upper body / Trunk & shoulder / Lower body) + the back-side pill row
  - Each card is a `<button>` that calls the existing `setRegion(...)` (already URL-driven via React Router)
  - Card wraps `<BodyIcon>` + name + meta
- Optionally extracted: a shared `BODY_PATHS` constants module that both `BodyDiagram.jsx` and `BodyIcon.jsx` import, so the artwork stays in sync if the diagram is ever updated.

## Out of scope (for this iteration)

- Changing the triage diagram itself
- New artwork (back-view silhouette, individual region illustrations)
- Animations beyond what's already in `RehabTab` (`AnimatePresence`)
- Exercise-count + protocol-duration metadata is **placeholder** in the mockup — actual counts will need to come from `EXERCISES` data in `frontend/src/data/exercises.js`

## Open question for implementation

Currently the meta line shows `"<n> exercises · <m> wk"`. The exercise count is derivable from `EXERCISES[region]` (count exercises across phases 1+2+3). The week duration is harder — there's no canonical mapping in the data. **Decision needed at implementation:** drop the duration, add a `WEEKS` constant per region, or just show exercise count alone. Default plan: drop duration, show only exercise count.
