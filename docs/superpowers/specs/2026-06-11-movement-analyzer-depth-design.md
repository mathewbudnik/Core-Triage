# Movement Analyzer Depth — Design (Phase 2.2, v1)

> Make the paid Movement Analyzer report visibly deeper and more trustworthy: a **live annotated
> overlay** on the climber during playback + a **directional movement score**. Pure frontend,
> on-device, zero gate/privacy/backend change. Read after the design-system spec
> (`docs/superpowers/specs/2026-06-09-design-system-foundation-design.md`).

**Status:** approved 2026-06-11 (direction + report visual approved by owner).

## Goal

The analyzer's pose tracking is **real ML** (MediaPipe, 33 live keypoints in RAM), but findings are
~29 hand-tuned geometric rules with authored copy, and the report only tells you *what* it flagged.
This slice makes the report **show you** — the flagged body part is annotated on the climber as the clip
plays — and opens with a **directional read** of where you stand. It exploits data that already exists;
it adds no backend, saves nothing, and sends nothing.

## Scope decisions (locked by owner, 2026-06-11)

- **Direction:** the *deeper, more trustworthy report* — (1) live annotated overlay + (2) directional score.
- **Live, not just freeze:** the overlay annotates the climber **during playback** (the flagged body part
  lights up at the moment it occurs); "Show me" is the focused freeze-and-study version of the same thing.
- **Presentation, not advice quality:** v1 surfaces the **existing** findings/copy better. It does **NOT**
  change rule logic, thresholds, or the advice ("beta") — that is the owner's ongoing content iteration.
- **Directional score:** the number is rolled up from the existing findings and **explicitly labeled
  directional** (not a graded/learned score) so it never over-claims.

## Piece 1 — Live annotated overlay

The live skeleton already draws every frame via `requestVideoFrameCallback → drawPose`
(`MovementAnalyzer.jsx:277-304`, `poseDrawing.js:107`). We extend that draw path:

- **Region→joints map.** New `BODY_REGION_JOINTS` (a small map from each `bodyRegion`
  — shoulders/hips/knees/gaze/etc. — to the set of MediaPipe landmark indices it covers). This avoids
  editing all 29 rule files: a finding's `bodyRegion` already tells us which joints to light. (Rules may
  later add an optional `overlayJoints` for per-rule precision — **fast-follow, not v1**.)
- **During playback (ambient):** for the current frame's timestamp `t`, a finding is *active* if any of its
  `timestamps[]` is within `ACTIVE_WINDOW` (≈500 ms) of `t`. Active findings' joints/limb segments draw in
  `FLAGGED_JOINT_COLOR` (already exported at `poseDrawing.js:58`) over the dimmed base skeleton. Usually
  0–1 active at a time, so it reads cleanly.
- **Focus mode ("Show me"):** each finding row gets a **"Show me"** button → seek to the finding's
  representative timestamp, **pause**, set `focusedFinding`. In focus mode the base skeleton dims further,
  only the focused finding's joints glow, and a caption chip shows the finding's `cue`/`name`. Clearing
  focus (play, or tap elsewhere) returns to ambient mode. (Existing `onJumpTo` is seek-only; focus mode
  adds the pause + highlight + caption.)
- **Drawing:** extend `poseDrawing.js` with a `drawFinding(ctx, landmarks, joints, opts)` helper that
  strokes the involved segments + joints in the flag color (and dims the rest in focus mode). No new
  rendering surface — same canvas, same `onFrame` loop.

**v1 explicitly defers** the *exact* per-rule primitive (the literal elbow-angle arc, the barn-door
polygon). v1 lights the **region** uniformly for every finding (cheap, universal); precise primitives are
a fast-follow once the highlight plumbing exists.

## Piece 2 — Directional movement score

- **New `frontend/src/lib/movementScore.js` — pure, testable.** `scoreClip(findings)` →
  `{ overall, perRegion }`:
  - Start each region at 100; subtract a penalty per **flag** finding in that region:
    `penalty = SEVERITY_WEIGHT[severity] × log2(instanceCount + 1) × confidence × (isFallProximal ? 1.5 : 1)`,
    with `SEVERITY_WEIGHT = { critical: 18, important: 10, polish: 4 }`. Clamp each region to `[0, 100]`,
    round to int. `overall` = the average of the regions that have ≥1 finding (or 100 when there are no
    flags). Wins (`kind: 'win'`) do not subtract.
  - Region keys come from the findings' existing `bodyRegion` taxonomy; `perRegion` only includes regions
    present in the clip.
- **New `frontend/src/components/MovementScoreCard.jsx`** — renders the score (Almanac: big Fraunces number
  + an ochre progress ring) and per-region sub-bars (skill-free injury/clay-sage palette, consistent with
  the report), with the literal label **"Directional · rolled up from 29 movement checks, not a graded
  score."** Rendered atop `AnalysisReport.jsx`, above `TopTakeaway`.

## Architecture / files

| File | Create/Modify | Responsibility |
|---|---|---|
| `frontend/src/lib/movementScore.js` | Create | Pure `scoreClip(findings)` + `SEVERITY_WEIGHT` |
| `frontend/src/lib/__tests__/movementScore.test.js` | Create | Pure scoring tests |
| `frontend/src/lib/bodyRegionJoints.js` | Create | `BODY_REGION_JOINTS` map (region → landmark indices) + `jointsForFinding(finding)` |
| `frontend/src/lib/bodyRegionJoints.test.js` | Create | Map coverage + fallback tests |
| `frontend/src/lib/poseDrawing.js` | Modify | Add `drawFinding(...)` highlight helper (uses existing `FLAGGED_JOINT_COLOR`) |
| `frontend/src/components/MovementScoreCard.jsx` | Create | The directional score card |
| `frontend/src/components/MovementScoreCard.test.jsx` | Create | Renders score + per-region + directional label |
| `frontend/src/components/AnalysisReport.jsx` | Modify | Render `MovementScoreCard`; add per-finding "Show me" wired to focus mode |
| `frontend/src/components/MovementAnalyzer.jsx` | Modify | `focusedFinding` state; ambient highlight in `onFrame`; focus = seek+pause+highlight+caption |

## Constraints (preserve — do not weaken)

- **Paid gate untouched:** `CoachTab.jsx:69-79` (`handleSelectAnalyzer`) is NOT edited. v1 adds no backend,
  so it adds no new gate surface.
- **Privacy promise intact:** analysis stays **100% on-device**. v1 saves nothing and sends nothing — no
  persistence, no upload, no new endpoint. The "your video never leaves your phone" copy
  (`MovementAnalyzer.jsx:1058`) remains true.
- **Avoid the parallel agent's Log-a-climb files:** do NOT edit `frontend/src/components/log/*` or
  `frontend/src/hooks/useSessionLog.js`. **Coordinate, don't break:** shared `ui/GradientSlider.jsx`
  (used by both the log flow and the analyzer's scrubbers) — v1 should not need to touch it. The untracked
  `TrimScrubber.jsx`/`FallScrubber.jsx` and `public/models/*.task` binaries — do not edit, do not `git add`.
- **No emojis, tokens only, lucide icons, Almanac, grep gate 0.**

## Testing

- **`scoreClip` (vitest, pure):** no flags → 100; a critical fall-proximal finding penalizes its region
  more than a polish finding; multiple instances penalize more (log scaling); wins don't subtract; `overall`
  averages only regions with findings; perRegion only lists present regions.
- **`bodyRegionJoints` (vitest, pure):** every `bodyRegion` value used by the rule set maps to a non-empty
  joint set; `jointsForFinding` falls back to the region map and returns a sane default for an unknown region.
- **`MovementScoreCard` (vitest):** renders the overall number, the per-region bars, and the literal
  "directional" label.
- **Manual smoke:** load a clip (paid/trial account), confirm the score card shows, a finding's "Show me"
  seeks+pauses+highlights the right body part with a caption, and ambient highlights appear at flagged
  moments during playback. The overlay-draw integration (`onFrame`/`drawFinding`) is verified by the manual
  smoke (canvas drawing isn't unit-tested), but `drawFinding`'s joint selection comes from the unit-tested
  `jointsForFinding`.
- **Gate:** `cd frontend && npm run build && npx vitest run`; Almanac grep gate 0.

## Non-goals (later slices / owner's content work)

- Changing rule logic/thresholds or the advice copy ("beta" quality) — owner's ongoing iteration.
- Per-rule **exact** geometric primitives (arcs/polygons) — fast-follow once the highlight plumbing exists.
- Tying findings → Pentagon axes / drills (#2), persistence + history (#5), comparison (#6), coach hand-off
  (#8), PDF/share export (#9) — each its own future slice, several of which require the first backend
  write-path + a server-side gate.
