# Movement Analyzer — Feature Spec

> Companion to [technique-catalog.md](./technique-catalog.md). The catalog is *what* the detector finds; this doc is *how* the feature collects context, runs detection, and presents the findings.

---

## 1. Data flows in (climber-supplied + auto-detected)

The accuracy of every detection rule depends on knowing the *context* of the climb. Four channels of context:

### 1a. Per-upload form (asked every clip)

Shown after the user drops a video and metadata loads, *before* processing starts. The video is mounted in the background so the user can scrub it while filling the form (required for the fall scrubber).

```
┌────────────────────────────────────────────────┐
│  About this climb:                             │
│                                                │
│  Wall angle   [ Slab ] [ Vert ] [ OH ] [ Roof ]│
│  Discipline   [ Boulder ] [ Sport ] [ TR ]     │
│  Grade        [ V0 … V17 ]  if Boulder         │
│               [ 5.6 … 5.15d ]  if Sport/TR     │
│  Outcome      [ Sent ✓ ] [ Fell 💥 ]            │
│       ↳ Fell: scrubber appears, frame-precise. │
│         "Mark fall frame" required to submit.  │
│  Focus (opt.) multi-select tags                │
│       [ General Hips Feet Arms Sequencing      │
│         Dynamic ]                              │
│                                                │
│              [  Analyze →  ]                   │
└────────────────────────────────────────────────┘
```

Data shape:

```ts
type UploadContext = {
  wallAngle:  'slab' | 'vertical' | 'overhang' | 'roof'
  discipline: 'boulder' | 'sport' | 'top-rope'
  grade:      { system: 'V' | 'YDS'; value: string }  // 'V5' | '5.11a'
  outcome:    'sent' | 'fell'
  fallTimeMs: number | null   // required when outcome === 'fell'
  focus:      string[]        // 0+ tags, defaults from profile.climbingFocus
}
```

### 1b. Climber profile (asked once at onboarding)

Stable facts stored on user record. Pre-fills future uploads + calibrates all detectors.

```ts
type ClimberProfile = {
  heightCm:     number              // calibrates body-relative thresholds
  apeIndexCm:   number              // height - armspan, signed
  dominantSide: 'left' | 'right'
  injuries:     InjuryFlag[]        // ties into existing CoreTriage triage data
  climbingFocus: FocusTag[]         // default focus list for upload form
}
```

**`heightCm` is the single highest-leverage profile field.** Every joint-angle threshold scales by body proportion. A 5'2" climber's "high step" hits a different `ankle_y - hip_y` ratio than a 6'4" climber's. Without it, we use a generic threshold and miscalibrate per-user.

`injuries` should reuse CoreTriage's existing triage taxonomy (body region + severity). Affects detector behavior: don't flag chicken-winging on a climber whose physio cleared the adapted style for a shoulder injury.

### 1c. Auto-detected from video (zero friction)

| Variable | How | Reliability |
|---|---|---|
| Camera angle (on-axis vs off-axis) | Shoulder-hip line tilt + ear symmetry | High |
| Wall angle (cross-check) | Climber's torso vertical orientation over time | Medium — used as secondary signal if form value mismatches |
| Indoor / outdoor | Background brightness + saturation heuristic | Medium |
| Clip quality | Aggregate per-landmark visibility scores | High |
| Move tempo profile | CoM velocity histogram | Medium |

### 1d. Existing CoreTriage data (zero new UI)

- **Tier / V-grade** — calibrates skill level + sets grade-picker default
- **Body region triage history** — feeds `injuries` automatically
- **Subscription state** — gates the feature

---

## 2. Pipeline

```
   ┌───────────────┐
   │ User uploads  │
   │   video clip  │
   └───────┬───────┘
           │
   ┌───────▼───────────────────┐
   │ Validate (size/format)    │
   │ + load metadata           │
   │ + estimate FPS / duration │
   └───────┬───────────────────┘
           │
   ┌───────▼───────────────────────┐
   │ Per-upload form (1a)          │
   │ + (if Fell) fall-frame scrub  │
   └───────┬───────────────────────┘
           │
   ┌───────▼───────────────────────┐
   │ Pre-process pipeline:         │
   │   for each video frame:       │
   │     extract ImageBitmap       │
   │     → Worker: PoseLandmarker  │
   │     → cache landmarks by ts   │
   │ + apply One-Euro filter       │
   │ + run camera-angle classifier │
   │ + run wall-angle cross-check  │
   └───────┬───────────────────────┘
           │
   ┌───────▼───────────────────────┐
   │ Phase classifier (FSM):       │
   │   reach / pull / transfer /   │
   │   stand-up / rest / launch /  │
   │   latch                       │
   └───────┬───────────────────────┘
           │
   ┌───────▼───────────────────────┐
   │ Rule engine:                  │
   │   for each catalog rule:      │
   │     if context matches → eval │
   │     emit Finding[] per match  │
   └───────┬───────────────────────┘
           │
   ┌───────▼───────────────────────┐
   │ Post-processing:              │
   │ • Group duplicates by rule ID │
   │ • Apply fall-window severity  │
   │   bump (±2s)                  │
   │ • Rank → "top takeaway"       │
   │ • Mine "what worked" frames   │
   └───────┬───────────────────────┘
           │
   ┌───────▼───────────────────────┐
   │ Report UI (§4)                │
   └───────────────────────────────┘
```

---

## 3. Rule engine shape (proposed)

Each catalog entry compiles into a rule declaration that the engine evaluates per frame (or per phase, depending on the rule).

```ts
type Rule = {
  id: string                              // 'H01', 'S01', etc — matches catalog
  name: string
  cue: string
  severity: 'critical' | 'important' | 'polish'
  bodyRegion: 'hips' | 'knees-feet' | 'shoulders-arms' | 'head-gaze' | 'whole-body'

  // Gating: when does this rule even consider firing?
  appliesWhen: (ctx: UploadContext, profile: ClimberProfile) => boolean

  // Which phases of climbing this rule evaluates against
  phases: Phase[]

  // The detection function, called per-frame or per-phase
  detect: (frame: LandmarkFrame, window: LandmarkFrame[], ctx: ClipContext) => DetectionResult

  // How to elevate severity dynamically (e.g. proximity to fall)
  weight?: (detection: DetectionResult, ctx: UploadContext) => number
}

type DetectionResult =
  | { matched: false }
  | { matched: true; confidence: number; timestamp: number; debug?: any }

type Finding = {
  ruleId: string
  severity: 'critical' | 'important' | 'polish'
  timestamps: number[]      // multiple instances grouped here (decision 1)
  confidence: number        // averaged across instances
  bodyRegion: string
  cue: string
  isFallProximal?: boolean  // true if any instance was within ±2s of fall
}
```

**Grouping rule** (locked decision): all instances of the same rule firing → one `Finding` with a `timestamps` array. UI shows one card with multiple jump targets, not multiple cards.

**Severity bump** (locked decision): if `outcome === 'fell'` and any `timestamps[i]` is within ±2000ms of `fallTimeMs`, the Finding's severity is elevated one level (polish → important; important → critical).

---

## 4. Report UI

```
┌─────────────────────────────────────────────────┐
│ ▶ Video player + skeleton overlay               │
│                                                 │
│  ━━●━━━━●●━━━━━━━●━━━━━●━━━━━━━              │ ◄ Timeline ribbon
│    🔴   🟡🔴      🟡   🟢                       │   color-coded by severity
│                                                 │
│ ┌─ Top takeaway ─────────────────────────────┐  │
│ │ 💡 Hips drifted from wall on every overhang │  │
│ │    move — focus on tension.                 │  │
│ │    3 instances · 0:08, 0:14, 0:21           │  │
│ │    [ Jump to first → ]                      │  │
│ └─────────────────────────────────────────────┘  │
│                                                 │
│ Other findings ─────────────────── 4 more       │
│ ┌─ 🟡 Bent arms at rest                       ┐ │
│ │   "Hang from bone."             0:11    ▶   │ │
│ ├─ 🟢 Heels raised on smear                   ┤ │
│ │   "Drop the heel."              0:03    ▶   │ │
│ ├─ 🟢 Eyes off foot                           ┤ │
│ │   "Watch the foot until it sticks." 0:18  ▶ │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ What worked ──────────────────────── 2 wins     │
│ ✓ Clean foot placements on the slab section    │
│ ✓ Strong hip rotation on the side-pull          │
│                                                 │
│ [ Replay with errors highlighted ▶ ]            │
└─────────────────────────────────────────────────┘
```

### Severity color codes
- 🔴 **Critical** — injury risk or fundamental fault
- 🟡 **Important** — costing energy / sends
- 🟢 **Polish** — small refinement

### Layer rules (locked)

1. **Top takeaway is mandatory.** One per report. Picked by: `rank = severity_weight × frequency × fall_proximity`.
2. **Findings list grouped per Finding** (one card per rule ID), timestamps listed inside the card, severity badge on the card.
3. **What worked: always 2-3 wins.** Detector mines correct-technique observations across the clip. Mandatory positive reinforcement.
4. **Tap on timeline marker OR card → video jumps to that frame.** Overlay shows a temporary callout: arrow at affected body part + cue floats above for ~3s.
5. **Fall moment, if marked, gets a distinct icon on the timeline** (separate from finding markers).

### Deferred to Phase 3
- Voice-over coaching (TTS-driven audio cues during playback)
- Side-by-side comparison with reference poses
- Drill suggestion links (e.g. "Try this exercise → ")

---

## 5. Implementation surface

Files this spec implies (additions to existing):

```
frontend/src/components/MovementAnalyzer.jsx       # already exists; add COLLECTING_CONTEXT state
frontend/src/components/UploadContextForm.jsx      # NEW — the per-upload form (§1a)
frontend/src/components/FallScrubber.jsx           # NEW — frame-precise marker for the Fell flow
frontend/src/components/AnalysisReport.jsx         # NEW — the layered report (§4)
frontend/src/components/TimelineRibbon.jsx         # NEW — colored markers, tap-to-jump
frontend/src/lib/poseRuleEngine.js                 # NEW — rule registry, FSM dispatcher
frontend/src/lib/poseRules/                        # NEW — one file per rule (H01.js, S01.js, etc.)
frontend/src/lib/posePrimitives.js                 # NEW — shared math (elbow_angle, hip_to_wall, ...)
frontend/src/lib/phaseClassifier.js                # NEW — FSM phase detector
frontend/src/lib/oneEuroFilter.js                  # NEW — smoothing
```

Profile additions (backend + frontend):

```
src/models/profile.py            # extend with heightCm, apeIndexCm, dominantSide
frontend/src/components/ProfileSetup.jsx  # extend wizard with the 4 fields
```

---

## 6. Phase ordering

| Phase | Scope |
|---|---|
| **Phase 1** ✅ shipped | Upload → preprocess → skeleton overlay → console-log landmarks |
| **Phase 1.5** (current design) | Add context form + skeleton-overlay-only report (no rules yet) |
| **Phase 2 — first detector** | Build S01 (bent arms at rest) end-to-end: rule declaration → primitive → finding → report card. Validates the engine with one clean Easy entry. |
| **Phase 2.5** | Expand to v1 shortlist (8 Easy entries from catalog). Camera-angle + wall-angle classifiers. One-Euro filter. |
| **Phase 3** | Stretch (10 Medium entries). Phase classifier FSM. Profile fields collection flow. |
| **Phase 4** | Polish: voice-over coaching, comparison view, drill links. |

---

## 7. Open questions (TBD)

- Rule-engine code-level shape — the JS types above are a sketch, not final
- Profile onboarding UX — first launch? after first upload? gradual?
- Storage of landmarks + findings: RAM-only (current Phase 1) vs persisted per session (for history view)
- Sharing analyses with the Coach (Budnik) — clip + report goes into the existing coach chat flow?
- Localization (V-grade vs Font scale vs YDS vs French) — start US-only

These get resolved as we build.
