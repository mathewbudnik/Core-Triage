# Finger Triage Expansion — Design

**Date:** 2026-05-11
**Scope:** Expand finger/hand injury coverage and add deeper wizard questions for finger-region triage.
**Out of scope:** Body-diagram changes, anatomical finger SVG, WIRE_WIZARD_V2 integration.

---

## Problem

The Finger branch in `bucket_possibilities()` covers only 5 of the ~12 canonical climbing finger injury patterns. The wizard collects coarse inputs (`Hard crimp` is a single mechanism, no per-finger localization, no per-joint localization, no grip-mode differentiation) so the classifier has to fall back on brittle free-text keyword matching ("a2", "can't straighten") to differentiate sub-patterns. The result is generic buckets that don't tell users which finger structure is most likely injured.

This design adds three finger-only wizard screens, three new `Intake` fields, nine new injury bucket patterns, and rewrites the Finger branch of `bucket_possibilities()` to use the new inputs as high-signal discriminators. Existing callers continue to work — every new field is optional with safe defaults.

---

## Goals

- Add per-finger granularity (Index / Middle / Ring / Pinky / Thumb / Multiple / Not sure).
- Add per-location granularity (palm_base / palm_mid / palm_tip / side / dorsal / whole / unsure).
- Add grip-mode granularity (full_crimp / half_crimp / open_hand / pocket_1 / pocket_2 / pinch / sloper / jam / not_climbing).
- Cover ~9 additional climbing-relevant finger/hand patterns.
- Improve discriminating signals (each pattern keyed on at least one structured field, not just free text).
- Keep backwards compatibility: blank new fields fall back to current Finger logic.
- No body-diagram changes; no V2 wizard dependency.

## Non-Goals

- Changing the body diagram or adding a Hand region (Finger covers both).
- Building an anatomical finger SVG (Approach C — deferred).
- Expanding depth on other regions (Wrist/Shoulder/etc. unchanged).
- Replacing the current legacy wizard (stays on TriageTab.jsx; V2 wiring is separate).

---

## Architecture Overview

```
TriageTab (wizard)
├── Step 0 — Body region (existing)
├── Step 0.1 — Which finger?      [conditional: region === 'Finger']
├── Step 0.2 — Where on finger?   [conditional: region === 'Finger']
├── Step 0.3 — Grip mode?         [conditional: region === 'Finger']
├── Step 1 — Onset + mechanism (existing)
├── Step 2 — Severity + pain type (existing)
├── Step 3 — Symptoms (existing)
└── Step 4 — Notes + submit (existing)

POST /api/triage
  Intake(region, ..., which_finger, finger_location, grip_mode)
    ↓
src/triage.py
  bucket_possibilities()
    Finger branch (rewritten):
      uses (which_finger, finger_location, grip_mode, onset, free_text, swelling)
      surfaces up to 6 buckets from a 14-pattern dictionary
```

---

## Section 1 — New wizard screens

Inserted between current Step 0 and Step 1. Each screen is hidden unless `form.region === 'Finger'`. UI uses existing `OptionCard` / pill components and Framer Motion slide animations — no new visual language.

### 1a. Which finger?
**Question:** "Which finger is bothering you?"
**Options (single-select):**
- Index
- Middle
- Ring
- Pinky
- Thumb
- Multiple fingers
- Not sure

**Stored as:** `form.which_finger` (string, default `""`)

### 1b. Where on the finger?
**Question:** "Where does it hurt most?"
**Options (single-select):**
- Palm-side base (knuckle / A1 area)
- Palm-side middle (PIP / A2 area)
- Palm-side tip (DIP / A4 area)
- Side of a joint
- Back of the finger
- Whole finger
- Not sure

**Stored as:** `form.finger_location` with normalized keys: `palm_base | palm_mid | palm_tip | side | dorsal | whole | ""`

### 1c. Grip mode at injury
**Question:** "What grip were you using when it started?"
**Options (single-select):**
- Full crimp (fingers folded, thumb wrapped)
- Half crimp (fingers folded, thumb relaxed)
- Open hand / drag
- Pocket — 1 finger (mono)
- Pocket — 2 fingers
- Pinch
- Sloper
- Jam (crack)
- Not climbing-related

**Stored as:** `form.grip_mode` with normalized keys: `full_crimp | half_crimp | open_hand | pocket_1 | pocket_2 | pinch | sloper | jam | not_climbing | ""`

### Skip behavior
Each screen shows a "Skip / Not sure" option, which advances without setting the field. The classifier treats missing fields as "no signal" rather than negative signal.

### Navigation
- Back button returns to previous screen including the new finger ones.
- Step indicator (StepDots) shows a dynamic total: 5 steps for non-finger regions, 8 steps for finger.
- Tour coachmarks get three new tips (one per finger screen).

---

## Section 2 — `Intake` dataclass extension

`src/triage.py` `Intake` dataclass gains three optional fields:

```python
@dataclass(frozen=True)
class Intake:
    # ... existing fields ...
    which_finger: str = ""       # Index | Middle | Ring | Pinky | Thumb | Multiple | ""
    finger_location: str = ""    # palm_base | palm_mid | palm_tip | side | dorsal | whole | ""
    grip_mode: str = ""          # full_crimp | half_crimp | open_hand | pocket_1 | pocket_2 |
                                 # pinch | sloper | jam | not_climbing | ""
```

`main.py` `IntakeRequest` Pydantic model gains matching `Optional[str]` fields with default `""`.

`frontend/src/api.js` `triageIntake()` sends the three new keys in the POST body.

All three fields default to empty string. The Finger classifier branch checks for empty values and falls back to legacy logic for blank inputs.

---

## Section 3 — New bucket patterns

Add nine new bucket entries to `src/bucket_content.py` (keeping all current finger buckets):

| Bucket ID | Climbing pattern | Trigger key signals |
|---|---|---|
| `pulley_a3` | A3 pulley strain (mid-finger, less common) | palm_mid + half_crimp / open_hand |
| `pulley_a4` | A4 pulley strain (distal, palm-tip on full crimp) | palm_tip + full/half_crimp |
| `volar_plate` | PIP hyperextension injury | dorsal/side + free-text hyperextend |
| `trigger_finger` | Stenosing tenosynovitis (catching) | gradual + free-text catch/lock |
| `mallet_finger` | Extensor tendon avulsion at DIP | free-text "can't extend tip" — urgent |
| `jersey_finger` | FDP avulsion at DIP | ring finger + sudden + free-text "can't bend tip" — urgent |
| `sagittal_band_rupture` | Boxer's knuckle (extensor slips off MCP) | dorsal + middle/ring + free-text "pop on top" |
| `hamate_hook_fracture` | Hook of hamate fracture (ulnar palm) | pinky + jam mechanism + ulnar-side text |
| `pip_synovitis` | Chronic PIP capsular swelling | palm_mid + gradual + swelling |

Existing five buckets stay: `pulley_a2`, `lumbrical_tear`, `flexor_tenosynovitis`, `collateral_ligament_finger`, `boutonniere`.

Each new bucket has `title`, `why`, `what_it_means`, optional `matches_if` / `not_likely_if` / `quick_test` fields, following the existing `Bucket` schema in [src/bucket_content.py](src/bucket_content.py).

---

## Section 4 — Rewritten classifier rules

The Finger branch in `bucket_possibilities()` becomes a sequence of guarded `out.append(Bucket.from_id(...))` calls, ordered by confidence qualifier (`most likely` → `likely` → `possible` → `urgent`).

Discriminating logic per pattern:

```python
if "finger" in region:
    wf, loc, grip = i.which_finger, i.finger_location, i.grip_mode
    text_l = i.free_text.lower()

    # URGENT first — these flag distinct injuries that need fast action
    if "can't extend tip" in text_l or "tip droops" in text_l or "mallet" in text_l:
        out.append(Bucket.from_id("mallet_finger", qualifier="urgent"))

    if wf == "Ring" and i.onset == "Sudden" and (
        "can't bend tip" in text_l or "can't flex tip" in text_l or grip == "jam"
    ):
        out.append(Bucket.from_id("jersey_finger", qualifier="urgent"))

    if "can't straighten" in text_l or "won't extend" in text_l or "stuck bent" in text_l:
        out.append(Bucket.from_id("boutonniere", qualifier="urgent"))

    # LIKELY — high-confidence pulley patterns
    if loc == "palm_mid" and grip in {"full_crimp", "half_crimp"} and wf in {"Ring", "Middle", "Index"}:
        out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
    elif loc == "palm_tip" and grip in {"full_crimp", "half_crimp"}:
        out.append(Bucket.from_id("pulley_a4", qualifier="likely"))
    elif loc == "palm_mid" and grip in {"half_crimp", "open_hand"}:
        out.append(Bucket.from_id("pulley_a3", qualifier="possible"))

    # Lumbrical
    if grip in {"pocket_1", "pocket_2"} and loc in {"palm_base", "palm_mid"}:
        out.append(Bucket.from_id("lumbrical_tear", qualifier="likely"))

    # Collateral / volar plate (side / dorsal joint patterns)
    if loc == "side" and (i.onset == "Sudden" or grip == "jam"):
        out.append(Bucket.from_id("collateral_ligament_finger", qualifier="likely"))
    if (loc == "dorsal" or loc == "side") and (
        "hyperextend" in text_l or "jammed back" in text_l or "bent backward" in text_l
    ):
        out.append(Bucket.from_id("volar_plate", qualifier="likely"))

    # Sagittal band
    if loc == "dorsal" and wf in {"Middle", "Ring"} and (
        "pop on top" in text_l or "tendon shifts" in text_l
    ):
        out.append(Bucket.from_id("sagittal_band_rupture", qualifier="likely"))

    # Hamate hook
    if wf == "Pinky" and (grip == "jam" or "pinky-side palm" in text_l or "hamate" in text_l):
        out.append(Bucket.from_id("hamate_hook_fracture", qualifier="consider evaluation"))

    # Trigger finger (chronic catching pattern)
    if i.onset == "Gradual" and (
        "catch" in text_l or "lock" in text_l or "stuck" in text_l or "trigger" in text_l
    ):
        out.append(Bucket.from_id("trigger_finger", qualifier="possible"))

    # PIP synovitis (chronic swelling pattern)
    if i.onset == "Gradual" and loc == "palm_mid" and i.swelling == "Yes":
        out.append(Bucket.from_id("pip_synovitis", qualifier="common"))

    # FALLBACK — when structured fields are blank, surface the legacy generic buckets
    if not any([wf, loc, grip]):
        # Pre-V2 callers and users who skipped the finger drill-down
        pulley_signals = (
            i.mechanism in {"Hard crimp", "Dynamic catch", "Pocket",
                            "High volume pulling", "Steep climbing/board"}
            or "pulley" in text_l or "a2" in text_l or "a4" in text_l
        )
        if pulley_signals:
            out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
        out.append(Bucket.from_id("flexor_tenosynovitis", qualifier="possible"))
        out.append(Bucket.from_id("collateral_ligament_finger", qualifier="possible"))

    # TAIL CATCH-ALL — always include a generic flexor tenosynovitis bucket
    # if nothing else surfaced, so users with combinations the rules don't
    # cover (e.g. Pinky + palm_mid + full_crimp) still get a sensible result.
    # finger_out_len tracks how many buckets the finger branch added so far.
    if len([b for b in out if getattr(b, "id", "").startswith(("pulley", "lumbrical",
            "collateral", "volar", "trigger", "mallet", "jersey", "sagittal",
            "hamate", "pip_", "boutonniere", "flexor"))]) == 0:
        out.append(Bucket.from_id("flexor_tenosynovitis", qualifier="possible"))
```

Truncation: the existing `out[:6]` cap stays — top 6 buckets surface. The order above ensures urgent patterns rank first.

---

## Section 5 — Frontend plumbing

### `frontend/src/components/TriageTab.jsx`

**`INITIAL_FORM`** gains three new keys:

```js
const INITIAL_FORM = {
  region: '', onset: '', mechanism: '', pain_type: '',
  severity: 5, swelling: 'No', bruising: 'No',
  numbness: 'No', weakness: 'None', instability: 'No', free_text: '',
  // Finger-specific drill-down (only filled when region === 'Finger')
  which_finger: '', finger_location: '', grip_mode: '',
}
```

**Step routing** — replace fixed `TOTAL_STEPS = 5` with a derived `visibleSteps` array. For non-finger regions: 5 steps. For finger: 8 steps (region, finger, location, grip, onset, severity, symptoms, notes). `advance()` / `retreat()` / URL routing keys off the visible-step index.

**Conditional rendering** — three new step blocks (steps 1, 2, 3 in the finger flow; mapped via the URL slug `/triage/finger`, `/triage/finger-location`, `/triage/grip`).

**Backend payload** — `triageIntake()` POST includes the three new keys:

```js
await triageIntake({
  ...form,
  severity: Number(form.severity),
  which_finger: form.which_finger || '',
  finger_location: form.finger_location || '',
  grip_mode: form.grip_mode || '',
  k,
})
```

### `frontend/src/api.js`

No structural changes — `triageIntake()` already forwards the request body. Just confirm the three new keys are not filtered out.

### `frontend/src/hooks/useTriageTour.js`

Add three new tip entries to the `TIPS` array (only fire when the corresponding step is shown):

```js
{ step: 1, anchorId: 'which-finger',     label: 'Step 2 of 8', body: 'Which finger? Helps narrow what got hurt.' },
{ step: 2, anchorId: 'finger-location',  label: 'Step 3 of 8', body: 'Where on the finger? Picks out pulley vs joint vs side.' },
{ step: 3, anchorId: 'grip-mode',        label: 'Step 4 of 8', body: 'What grip? Crimp loads A2/A4 — pockets load lumbrical.' },
```

Existing tips shift step indices by +3 for finger flow only.

---

## Section 6 — Backend plumbing

### `main.py`

`IntakeRequest` Pydantic model gains:

```python
class IntakeRequest(BaseModel):
    # ... existing fields ...
    which_finger: Optional[str] = ""
    finger_location: Optional[str] = ""
    grip_mode: Optional[str] = ""
```

The `/api/triage` handler passes them through to `Intake(...)`.

### `src/triage.py`

`Intake` dataclass gains the three fields (Section 2). The Finger branch in `bucket_possibilities()` is replaced per Section 4. No other branches change.

### `src/bucket_content.py`

Nine new entries added to `BUCKET_CONTENT` (one per pattern in Section 3). Each entry follows the existing schema. The `from_id` factory in `Bucket` works unchanged.

---

## Section 7 — Tests

Add to `tests/`:

**`tests/test_finger_triage.py`** — new file with ~10 scenarios:

| Scenario | Inputs | Expected top bucket |
|---|---|---|
| A2 ring full crimp | which_finger=Ring, location=palm_mid, grip=full_crimp | `pulley_a2` "most likely" |
| A4 tip full crimp | location=palm_tip, grip=full_crimp | `pulley_a4` "likely" |
| Lumbrical pocket | grip=pocket_1, location=palm_base | `lumbrical_tear` "likely" |
| Collateral side + jam | location=side, grip=jam | `collateral_ligament_finger` "likely" |
| Volar plate dorsal | location=dorsal, text="jammed back" | `volar_plate` "likely" |
| Mallet | text="can't extend tip" | `mallet_finger` "urgent" |
| Jersey ring sudden | which_finger=Ring, onset=Sudden, text="can't bend tip" | `jersey_finger` "urgent" |
| Sagittal middle dorsal | which_finger=Middle, location=dorsal, text="pop on top" | `sagittal_band_rupture` "likely" |
| Hamate pinky jam | which_finger=Pinky, grip=jam | `hamate_hook_fracture` "consider evaluation" |
| PIP synovitis chronic | onset=Gradual, location=palm_mid, swelling=Yes | `pip_synovitis` "common" |
| Legacy fallback (blank fields) | all new fields="" | falls back to current logic; `pulley_a2` still surfaces |

Also add a test confirming the existing `tests/test_bucket_content.py` coverage check sees all nine new IDs (the coverage test fails until they're added).

---

## Section 8 — Error handling

- All new fields are `Optional[str]` with default `""`. Missing values are treated as "no signal" rather than a constraint violation.
- The classifier never raises on unknown `grip_mode` / `which_finger` / `finger_location` values — unknown values fall through `if` chains and the legacy fallback catches them.
- Frontend "Skip" button on each new step sets the field to `""` and advances.
- If the URL is hit directly mid-flow (`/triage/grip` without prior region selection), the existing reset-to-step-0 effect in TriageTab handles it; no new handling needed.

---

## Section 9 — Migration

- **Existing saved sessions** (Postgres `sessions` table) don't have the new fields and the DB schema doesn't need to change — the new fields aren't persisted, only used at classification time. If the user saves a session before this change ships, replaying their data through the new classifier just produces legacy-fallback results.
- **In-flight calibration tests** (`tests/test_triage_calibration.py`) continue to pass because every existing test uses blank new fields, hitting the fallback branch.

---

## Section 10 — Open questions (none blocking)

- Should `pulley_a2` surface with qualifier "most likely" only when wf is Ring/Middle/Index, or also when wf is empty? Spec says fall back to legacy ("most likely" for any mechanism trigger) when wf is empty — verify this in tests.
- Should the "Multiple fingers" option for `which_finger` widen the rule chain to surface multiple per-finger pattern combinations? Initial decision: treat "Multiple" as "no per-finger signal" and rely on location + grip alone. Revisit after first user data.

---

## Acceptance criteria

1. Selecting Finger in the wizard shows three additional steps before onset; selecting any other region preserves the existing 5-step flow.
2. Step indicator shows correct dynamic total (5 vs 8).
3. Skipping any new step leaves the field blank without breaking the result page.
4. POST `/api/triage` accepts the three new fields and returns successfully.
5. The 10 test scenarios in `tests/test_finger_triage.py` all pass.
6. `tests/test_bucket_content.py` coverage check passes with the 9 new bucket IDs.
7. The existing `tests/test_triage_calibration.py` 100-scenario corpus continues to pass unchanged.
8. The Triage results page renders the new bucket titles cleanly without UI overflow.
