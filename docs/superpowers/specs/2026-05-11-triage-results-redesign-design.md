# Triage results screen — TL;DR hero + tabbed details

**Date:** 2026-05-11
**Owner:** Mathew
**Status:** Approved (mockup in `.superpowers/brainstorm/`)

## Problem

The triage results screen (the payoff at the end of the 5-step wizard) is currently 11+ collapsed accordion sections in 3 groups, plus an inline `RehabProtocol` component below. First-time users describe it as "boring to sit and read" and "overwhelming." Specific issues:

- Every block of guidance is hidden behind a tap-to-expand toggle — even the most-relevant content (immediate next steps) requires interaction
- The standalone `RehabProtocol` at the bottom duplicates phase guidance that's already implied by the result sections, and competes for attention with the result sections themselves
- No information hierarchy — `WHAT TO DO` looks visually identical to `RETURN TO CLIMBING` despite very different urgency
- Severity, diagnosis, and immediate action are shown as three separate sections instead of being synthesized into a single "here's what's going on" headline

## Solution

Restructure into **TL;DR hero card + 3-tab detail interface**, with the rehab content folded into the tabs by phase to remove duplication.

## Final stacking order

1. **Header row** — region/onset/severity meta line + "Start over" button (unchanged)
2. **Red flags callout** — only renders when `result.red_flags.length > 0`. Red-bordered box, identical to current
3. **Hero TL;DR card** — color-coded by severity (mild=green, moderate=amber, severe=red); contains pill row, diagnosis title, 1–2 sentence lead, 4 quick-action chips
4. **Other possibilities pill row** — only renders when `result.buckets.length > 1`. Compact: "Also possible: X · Y · Z"
5. **Tabs** — segmented control: Action plan / Training / Return to climb
6. **Active tab content** — guidance items + phase exercise summary + "Open full rehab plan →" button
7. **Sources** — citation pills (unchanged, but smaller)
8. **Action buttons** — PDF, .md, Save (unchanged)
9. **Disclaimer** (unchanged)

## Removed components

- `SeverityCard` — its severity treatment is folded into the hero card's color + pill
- Inline `RehabProtocol` — its content moves into the tabs as exercise summaries; the dedicated `/rehab/{region}` route is now the single source of truth for full rehab detail

## Hero TL;DR card

**Visual:** rounded card, full-width, color-coded gradient based on `result.severity.level`:
- mild → green/teal gradient (`accent` palette)
- moderate → amber/coral gradient (`accent3` → `accent2`)
- severe → red/coral gradient (`accent2` palette, more saturated)

**Content (top to bottom):**
- Pill row: severity pill ("Moderate"), region pill ("Finger"), onset pill ("Sudden onset")
- Title: top bucket title from `result.buckets[0].title` (e.g. "Likely a finger pulley strain")
- Lead: top bucket's `why` field, or first sentence of the `Immediate next 7-10 days` plan if `why` is missing — capped to ~2 sentences
- Quick-action chips (2×2 grid on mobile, 4×1 on desktop): up to 4 binary actions extracted from the immediate plan, marked with ✓ (do) or ✗ (avoid). Examples: "✓ Rest 7–10 days", "✗ No crimping", "✓ Light open-hand work", "✗ No hangboard"
  - Extraction logic: pull from `result.plan["Immediate next 7-10 days"]` and `result.plan["What to avoid for now"]`. Match items containing "rest", "ice", "tape", "elevate", "avoid X", "no X" to construct chips. If extraction yields fewer than 2 chips, fall back to showing the raw lists below the lead instead.

## Other possibilities pill row

Only when `result.buckets.length > 1`. Compact text row below the hero:

```
Also possible: Tendon sheath irritation · Joint capsule sprain
```

Each name is a small pill; no expand/click behavior in v1 — purely informational. (Future: tap to swap which bucket is in the hero.)

## Tabs

Segmented-control tabs sitting below the hero/pills. Three tabs:

| Tab | Source data | Phase exercises included |
|---|---|---|
| **Action plan** | `result.plan` (all sub-sections: immediate, return progression, what to avoid, when to get checked) | Phase 1 (gentle ROM / isometric holds — what they should be doing this week) |
| **Training** | `result.training_modifications` | Phase 2 (loading work — what they progress to) |
| **Return to climb** | `result.return_protocol` | Phase 3 (sport-specific reload) |

**Default active tab:** "Action plan" (the most immediately useful).

**Tab persistence:** none — every visit defaults to "Action plan." (No need for localStorage here; this isn't a high-revisit screen.)

## Tab content layout

Inside the active tab, content is laid out top-to-bottom (no nested accordions):

1. **Guidance section** — render each `result.plan[section]` (or training_modifications / return_protocol) sub-section as a heading + bullet list. Bullets are checklist-styled (custom checkbox dot, no actual interactivity in v1). All visible by default — no toggles.
2. **"What you'll do this phase" subsection** — heading + summary list of exercises from `getExercises(region, phase)`. Each row: exercise name + 1-line cue (use the `feel` field truncated to ~90 chars, or fall back to `area`). Up to 5 exercises shown; if more, show a "+ N more" indicator.
3. **"Open full rehab plan →" button** — secondary button at the bottom of every tab. Navigates to `/rehab/{region-slug}` via React Router.

## Severity-color mapping

Centralised lookup applied to the hero card and severity pill:

```js
const SEVERITY_THEME = {
  mild:     { bg: 'linear-gradient(135deg, rgba(125,211,192,0.18), rgba(125,211,192,0.04))',
              border: 'rgba(125,211,192,0.3)', text: 'text-accent',  label: 'Mild' },
  moderate: { bg: 'linear-gradient(135deg, rgba(247,187,81,0.18),  rgba(244,114,114,0.08))',
              border: 'rgba(247,187,81,0.3)', text: 'text-accent3', label: 'Moderate' },
  severe:   { bg: 'linear-gradient(135deg, rgba(244,114,114,0.22), rgba(244,114,114,0.06))',
              border: 'rgba(244,114,114,0.4)', text: 'text-accent2', label: 'Severe' },
}
```

## Component shape

Refactor `Results` (currently inside `TriageTab.jsx`, lines 415–574) into composed sub-components, keeping them in the same file (this is one screen, not a system):

```
Results
├─ ResultsHero          (hero card — pill row, title, lead, action chips)
├─ OtherPossibilities   (pill row, only when buckets.length > 1)
├─ ResultsTabs          (3-tab segmented control + tab content router)
│  ├─ ActionPlanTab
│  ├─ TrainingTab
│  └─ ReturnToClimbTab
└─ (existing) Sources, Actions, Disclaimer
```

Each `*Tab` component accepts:
- `guidance: Record<string, string[]>` — the relevant slice of `result.plan / training_modifications / return_protocol`
- `region: string` — for the rehab link + exercise lookup
- `phase: 1 | 2 | 3` — which phase exercises to summarise

## Action-chip extraction

Helper function `extractActionChips(plan)`:

1. Looks for `plan["Immediate next 7–10 days"]` and `plan["What to avoid for now"]`
2. For each item, applies a small set of regex-driven shorteners:
   - "Rest for X days" → "Rest X days"
   - "Avoid X / No X" → "✗ No X"
   - "Apply ice" → "✓ Ice 15 min"
   - "Buddy-tape" → "✓ Buddy-tape"
3. Caps at 4 chips total. If fewer than 2 extract cleanly, the chip grid is hidden and we fall through to the regular Action plan tab content.

This is intentionally heuristic — perfectly readable chips when the plan content matches expected patterns, gracefully degrades to the plain text version when it doesn't.

## What stays the same

- The data shape returned by `/api/triage` — no backend changes
- `result.red_flags` rendering above the hero (red-bordered callout)
- `result.citations` rendering as small pills
- Save / PDF / Markdown action buttons at the bottom
- Disclaimer footer
- The 5-step wizard above (this redesign only touches the post-submit Results screen)

## Out of scope

- Touching the pre-submit wizard steps
- Backend changes to `/api/triage` (data shape unchanged)
- Animations/transitions beyond what `framer-motion` already provides via `AnimatePresence`
- Changes to `RehabProtocol` itself — it stays as the canonical full-detail view at `/rehab/{region}`
- Changes to `SeverityCard` (deleted, but the file can stay around in case it's used elsewhere — verify first)

## Open questions

None — design fully approved.
