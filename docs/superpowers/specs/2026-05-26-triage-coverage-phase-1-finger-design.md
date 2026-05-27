# Triage Coverage Phase 1 — Finger/Hand Expansion + Bug Fixes

**Status:** approved direction, awaiting implementation plan
**Owner:** Mathew Budnik
**Date:** 2026-05-26
**Parent doc:** [2026-05-26-triage-coverage-roadmap-design.md](2026-05-26-triage-coverage-roadmap-design.md)

## Context

The current finger-triage logic in [src/triage.py:987-1119](../../../src/triage.py#L987) supports 14 buckets and has decent coverage for the common climber injuries (A2/A3/A4 pulleys, mallet, jersey, boutonnière, lumbrical, collateral, volar plate, sagittal band, hamate, PIP synovitis, trigger finger, flexor tenosynovitis). The cross-cutting audit ([roadmap doc](2026-05-26-triage-coverage-roadmap-design.md)) identified four kinds of issues in this branch:

1. **Pediatric blind spot** — no bucket for adolescent epiphyseal stress fracture, which is THE most important pediatric climbing injury per [Schöffl 2022](https://journals.sagepub.com/doi/10.1177/03635465211056956) and career-ending if missed.
2. **DIP joint capsulitis** — distinct entity from PIP synovitis, common in climbers per [Frontiers 2023](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1185653/full), but currently no bucket.
3. **Tendon-substance rupture vs avulsion** — `jersey_finger` only covers the distal FDP avulsion off the bone, but midsubstance FDS/FDP ruptures occur in climbers ([ScienceDirect 2021](https://www.sciencedirect.com/science/article/abs/pii/S2468122921001195)) and have different surgical management.
4. **Thumb branch is dead** — the wizard allows `which_finger == "Thumb"` but the finger code never branches on Thumb; all Thumb selections fall through to a catch-all.

Plus 8 narrower bug-class issues in existing-bucket gating that cause valid presentations to silently miss (`pulley_a2` excludes Pinky/Thumb, `pulley_a4` requires palm_tip only, mallet/boutonnière rely on free-text patterns that most users won't phrase correctly, etc.).

This spec closes all four content gaps plus all eight finger-region path bugs.

## Goals

- **Pediatric safety net.** Any climber under 17 with finger pain on crimping mechanism gets the epiphyseal-stress-fx bucket surfaced FIRST, regardless of other patterns.
- **Complete finger coverage.** 14 → 18 buckets covering DIP capsulitis, isolated flexor tendon rupture, thumb UCL — closing the catalog gaps.
- **Correct surfacing paths.** Eight existing-bucket gating fixes so valid presentations stop silently missing (broaden `pulley_a2`, structured questions for mallet/boutonnière, etc.).
- **Privacy-preserving age field.** Add `age_band` (under_14, 14_to_17, 18_to_29, 30_to_49, 50_plus, ""). Used by epiphyseal gating now; reused by Phase 3's spondylolysis gating later.
- **No regressions.** All 100+ existing scenarios in [tests/run_all_scenarios.py](../../../tests/run_all_scenarios.py) continue to pass.

## Non-goals

- Wrist content (Phase 2)
- `pec_major_tear` / `distal_biceps` chip-set fixes (Phase 2 — bundled with shoulder)
- Abs region (Phase 3)
- Knee/hip surfacing bugs (Phase 4)
- Refactoring `bucket_content.py` from Python-as-content (separate concern, out of scope for the entire roadmap)
- UI redesign of Recover/Triage tabs (backend-only change)
- Dedicated A1, A5 pulley buckets (audit found these are not climbing-relevant as separate entities; `pulley_a2` broadening + `trigger_finger` cover the affected regions)
- Cruciate pulleys C0-C3 (not climbing-relevant per literature)

## 1. Four new finger/hand buckets

For each: surfacing rule, qualifier, key distinction from existing buckets. Clinical content (matches_if, quick_test, reasoning_basis, sources) is authored during implementation via targeted WebSearch per bucket.

### 1.1 `epiphyseal_stress_fx`

**What it captures:** Salter-Harris III stress fracture of the proximal/middle phalanx growth plate. Adolescent climbers under ~17 whose growth plates haven't closed. Mechanism: high-volume crimping. Career-ending if missed.

**Why distinct:** No existing bucket addresses pediatric finger anatomy. Soft-tissue triage is misleading here — looks like ordinary pain, but the bone is the affected structure.

**Surfacing rule:**
```python
if (
    "finger" in region
    and i.age_band in {"under_14", "14_to_17"}
    and (i.mechanism == "Hard crimp" or i.onset != "Sudden")
):
    out.insert(0, Bucket.from_id("epiphyseal_stress_fx", qualifier="urgent"))
```

**Qualifier:** Always `urgent`. Inserted at index 0 so it surfaces before other finger differentials.

**Sources to cite during authoring:**
- [Schöffl V et al. Diagnostic-Therapeutic Algorithm for Finger Epiphyseal Growth Plate Stress Injuries in Adolescent Climbers. 2022](https://journals.sagepub.com/doi/10.1177/03635465211056956)

### 1.2 `dip_capsulitis`

**What it captures:** Inflammation of the distal interphalangeal joint capsule. Mechanism: repeated full-crimping that hyperextends the DIP. Symptoms: gradual onset stiffness + dull ache at the fingertip joint (NOT the sharp tendon-side pain of A4 pulley).

**Why distinct:** `pip_synovitis` covers the middle joint capsulitis; nothing for the tip joint. Clinical distinction matters because rehab differs (A4 = pulley loading protocol; DIP capsulitis = capsular mobility work).

**Surfacing rule:**
```python
text_l = (i.free_text or "").lower()
if (
    "finger" in region
    and loc == "palm_tip"
    and i.onset == "Gradual"
    and (i.swelling == "Yes" or any(t in text_l for t in ("stiff", "morning", "ache")))
):
    out.append(Bucket.from_id("dip_capsulitis", qualifier="likely"))
```

**Qualifier:** `likely` when all conditions match. Co-exists with `pulley_a4` when palm_tip + crimp also fire; both surface and let the user/clinician differentiate.

**Sources to cite during authoring:**
- [Frontiers 2023. Clinical management of finger joint capsulitis/synovitis in a rock climber](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1185653/full)
- [The Climbing Doctor — DIP Joint Pain](https://theclimbingdoctor.com/dipcapsulitis/)

### 1.3 `flexor_tendon_rupture`

**What it captures:** Tendon-substance tear of FDS or midsubstance FDP. NOT the distal FDP avulsion (that's `jersey_finger`). Rare in climbing but documented; surgical management differs from avulsion repair.

**Why distinct:** `jersey_finger` is the distal-attachment avulsion off the bone. This is a tear within the tendon body. Different injury, different surgical decision-making.

**Surfacing rule:**
```python
text_l = (i.free_text or "").lower()
if (
    "finger" in region
    and i.onset == "Sudden"
    and i.severity >= 7
    and any(t in text_l for t in ("tore", "snapped", "pop", "ripped"))
    and loc != "palm_tip"   # palm_tip + Ring + sudden = jersey path
):
    out.append(Bucket.from_id("flexor_tendon_rupture", qualifier="consider evaluation"))
```

**Qualifier:** `consider evaluation`. Surfaces as supplemental rather than primary (rare presentation).

**Sources to cite during authoring:**
- [Unusual rupture of the middle finger FDS in a climber. JSAMS 2021](https://www.sciencedirect.com/science/article/abs/pii/S2468122921001195)

### 1.4 `thumb_ucl`

**What it captures:** Sprain or rupture of the thumb ulnar collateral ligament at the metacarpophalangeal joint ("skier's thumb" if acute, "gamekeeper's" if chronic). Climbing mechanism: forced thumb abduction during jam, fall, or catch with thumb extended.

**Why distinct:** The wizard allows `which_finger == "Thumb"` but the finger branch has NO Thumb-specific bucket. All Thumb selections currently fall through to `flexor_tenosynovitis` catch-all — clinically wrong for an acute thumb injury.

**Surfacing rule:**
```python
text_l = (i.free_text or "").lower()
if (
    "finger" in region
    and i.which_finger == "Thumb"
):
    if (
        i.onset == "Sudden"
        or i.grip_mode == "jam"
        or any(t in text_l for t in ("jammed thumb", "bent back", "caught my thumb"))
    ):
        out.append(Bucket.from_id("thumb_ucl", qualifier="likely"))
    else:
        out.append(Bucket.from_id("thumb_ucl", qualifier="possible"))
```

**Qualifier:** `likely` for sudden/jam/text mechanism. `possible` for gradual presentation.

**Sources to cite during authoring:**
- General orthopedic literature on thumb UCL sprain (Stener lesion, surgical decision-making)
- Climbing-specific case reports if available; otherwise rely on standard hand-surgery references

---

## 2. Eight decision-tree fixes (existing buckets)

These modify gating in [src/triage.py:987-1119](../../../src/triage.py#L987) without authoring new content.

### 2.1 Broaden `pulley_a2` location + finger coverage

**Current** ([line 1024-1029](../../../src/triage.py#L1024)):
```python
if (
    loc == "palm_mid"
    and grip in {"full_crimp", "half_crimp"}
    and wf in {"Ring", "Middle", "Index"}
):
    out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
```

**New:**
```python
if (
    loc in {"palm_base", "palm_mid"}
    and grip in {"full_crimp", "half_crimp", "open_hand"}
):
    # Pinky/Thumb downgrade; open_hand downgrade
    if wf in {"Pinky", "Thumb", "Multiple"} or grip == "open_hand":
        out.append(Bucket.from_id("pulley_a2", qualifier="possible"))
    else:
        out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
```

**Why:** A2 anatomically spans the proximal phalanx (palm_base → palm_mid). Open-hand can damage it under high load. Pinky/Thumb A2 ruptures do occur (rarely).

### 2.2 Add `pulley_a4` fallback at `palm_mid`

**Current** ([line 1030-1031](../../../src/triage.py#L1030)):
```python
if loc == "palm_tip" and grip in {"full_crimp", "half_crimp"}:
    out.append(Bucket.from_id("pulley_a4", qualifier="likely"))
```

**New:**
```python
if loc == "palm_tip" and grip in {"full_crimp", "half_crimp"}:
    out.append(Bucket.from_id("pulley_a4", qualifier="likely"))
elif loc == "palm_mid" and grip in {"full_crimp", "half_crimp"}:
    out.append(Bucket.from_id("pulley_a4", qualifier="possible"))
```

**Why:** A4 sits at the middle phalanx; many users describe A4-region pain as "middle of finger" (palm_mid) because they lack anatomical training. The current rule misses these users entirely.

### 2.3 Broaden `jersey_finger` beyond Ring finger

**Current** ([line 1002-1012](../../../src/triage.py#L1002)):
```python
if (
    wf == "Ring"
    and i.onset == "Sudden"
    and (
        any(p in text_l for p in ("can't bend tip", "can't flex tip", "cannot bend tip"))
        or grip == "jam"
    )
):
    out.append(Bucket.from_id("jersey_finger", qualifier="urgent"))
```

**New:**
```python
jersey_signal = (
    i.onset == "Sudden"
    and (
        any(p in text_l for p in ("can't bend tip", "can't flex tip", "cannot bend tip"))
        or grip == "jam"
    )
)
if jersey_signal:
    if wf == "Ring":
        out.append(Bucket.from_id("jersey_finger", qualifier="urgent"))
    elif wf in {"Middle", "Index"}:
        out.append(Bucket.from_id("jersey_finger", qualifier="consider evaluation"))
```

**Why:** ~75% of jersey-finger cases are ring finger per FDP anatomy. The other 25% in middle/index currently get zero urgent flag.

### 2.4 Mallet finger — structured intake replaces free-text dependency

**Current** ([line 993-999](../../../src/triage.py#L993)):
```python
mallet_signals = (
    any(p in text_l for p in ("can't extend tip", "tip droops"))
    or "mallet" in text_l
)
if mallet_signals:
    out.append(Bucket.from_id("mallet_finger", qualifier="urgent"))
```

**New:**
```python
mallet_text = (
    any(p in text_l for p in ("can't extend tip", "tip droops"))
    or "mallet" in text_l
)
if i.can_extend_fingertip == "No":
    # Strongest signal: user explicitly can't extend → urgent splint window
    out.append(Bucket.from_id("mallet_finger", qualifier="urgent"))
elif i.can_extend_fingertip == "Painful":
    out.append(Bucket.from_id("mallet_finger", qualifier="possible"))
elif i.can_extend_fingertip == "Yes" and mallet_text:
    # User says they CAN extend but text mentions droop — soft surface, don't override the user's own answer
    out.append(Bucket.from_id("mallet_finger", qualifier="possible"))
elif i.can_extend_fingertip == "" and mallet_text:
    # No structured answer; existing text-pattern path
    out.append(Bucket.from_id("mallet_finger", qualifier="urgent"))
```

**Why:** Users who don't use those exact phrases silently miss the urgent splinting window. Structured intake catches them. When user explicitly says "Yes" but text contradicts, we surface a softer "possible" rather than overriding their own answer.

### 2.5 Boutonnière — same pattern

**Current** ([line 1015-1021](../../../src/triage.py#L1015)):
```python
boutonniere_signals = any(
    p in text_l for p in ("can't straighten", "won't extend", "stuck bent", "boutonniere", "boutonnière", "joint won't")
)
if boutonniere_signals:
    out.append(Bucket.from_id("boutonniere", qualifier="urgent"))
```

**New:**
```python
boutonniere_text = any(
    p in text_l for p in ("can't straighten", "won't extend", "stuck bent", "boutonniere", "boutonnière", "joint won't")
)
if i.can_straighten_middle_joint == "No":
    out.append(Bucket.from_id("boutonniere", qualifier="urgent"))
elif i.can_straighten_middle_joint == "Painful":
    out.append(Bucket.from_id("boutonniere", qualifier="possible"))
elif i.can_straighten_middle_joint == "Yes" and boutonniere_text:
    out.append(Bucket.from_id("boutonniere", qualifier="possible"))
elif i.can_straighten_middle_joint == "" and boutonniere_text:
    out.append(Bucket.from_id("boutonniere", qualifier="urgent"))
```

**Why:** 72-hour splinting window is too critical to depend on user phrasing. Same conflict-resolution policy as mallet (§2.4): structured answer wins; "Yes" + contradicting text softens to "possible" rather than overriding the user.

### 2.6 Loosen `pip_synovitis`

**Current** ([line 1080-1081](../../../src/triage.py#L1080)):
```python
if i.onset == "Gradual" and loc == "palm_mid" and i.swelling == "Yes":
    out.append(Bucket.from_id("pip_synovitis", qualifier="likely"))
```

**New:**
```python
text_l = (i.free_text or "").lower()
pip_stiffness_text = any(t in text_l for t in ("stiff", "morning", "ache"))
if i.onset == "Gradual" and loc == "palm_mid" and (i.swelling == "Yes" or pip_stiffness_text):
    out.append(Bucket.from_id("pip_synovitis", qualifier="likely"))
```

**Why:** Per Frontiers 2023, many climbers present with stiffness/dull ache without visible swelling.

### 2.7 Broaden `sagittal_band_rupture` text patterns

**Current** ([line 1053-1059](../../../src/triage.py#L1053)):
```python
sb_signals = any(p in text_l for p in (
    "pop on top", "tendon shifts", "tendon slips", "knuckle pops"
))
if loc == "dorsal" and wf in {"Middle", "Ring"} and sb_signals:
    out.append(Bucket.from_id("sagittal_band_rupture", qualifier="likely"))
```

**New:**
```python
sb_signals = any(p in text_l for p in (
    "pop on top", "tendon shifts", "tendon slips", "knuckle pops",
    "snapping over knuckle", "knuckle catches", "tendon snaps", "extensor pops",
))
if loc == "dorsal" and wf in {"Middle", "Ring"} and sb_signals:
    out.append(Bucket.from_id("sagittal_band_rupture", qualifier="likely"))
```

**Why:** Most climbers describe this as "snapping over the knuckle" rather than the technical "tendon slips" phrasing.

### 2.8 Age-gate `epiphyseal_stress_fx` (covered in §1.1)

Spec-wise this is the surfacing rule for the new bucket. Counted here for completeness of the "8 path edits" tally.

---

## 3. Intake schema changes

### 3.1 New field: `age_band`

**Dataclass change** (in `Intake`, [src/triage.py:9-45](../../../src/triage.py#L9)):
```python
age_band: str = ""   # "under_14" | "14_to_17" | "18_to_29" | "30_to_49" | "50_plus" | ""
```

**Why `age_band` not `age`:** Privacy-preserving (no exact DOB). Five bands cover pediatric gating (under_14, 14_to_17), the bulk-user middle (18_to_29, 30_to_49), and masters-climber considerations (50_plus). Empty string = "prefer not to say" → no age-specific branches fire.

**Reuse plans:** Phase 3 (`spondylolysis_pars`) will reuse this field for adolescent gating. Phases 2 and 4 don't need it.

**Frontend:** Appears as one wizard step for ALL regions (not finger-only) — even though only finger uses it in Phase 1 — so the same field is available without UI rework when Phase 3 lands.

**Persistence:** Added to the `sessions.intake_json` payload. JSONB column accepts new keys without schema migration.

### 3.2 New field: `can_extend_fingertip`

**Dataclass change:**
```python
can_extend_fingertip: str = ""   # "Yes" | "No" | "Painful" | ""
```

**Wizard:** Question text "Can you fully straighten the tip of the injured finger on its own?" with options Yes / No / Painful / "Skip." Appears only when `region == "Finger"`.

**Surfacing logic:** Per §2.4. Structured answer wins over text-pattern path; absence falls back to text patterns.

### 3.3 New field: `can_straighten_middle_joint`

**Dataclass change:**
```python
can_straighten_middle_joint: str = ""   # "Yes" | "No" | "Painful" | ""
```

**Wizard:** Question text "Can you fully straighten the middle joint of the injured finger?" with options Yes / No / Painful / "Skip." Appears only when `region == "Finger"`.

**Surfacing logic:** Per §2.5.

### 3.4 Backward compatibility

- All three fields default to `""` → existing intake dataclass instances deserialize cleanly without any code changes elsewhere
- Existing `sessions.intake_json` rows (pre-Phase-1) deserialize with empty new fields — no behavior change for historical sessions
- The 100+ existing scenarios in [tests/run_all_scenarios.py](../../../tests/run_all_scenarios.py) all use the existing Intake fields only; they continue to pass with the new fields defaulted

---

## 4. Files affected

### 4.1 Modified

| Path | Change |
|---|---|
| [src/triage.py](../../../src/triage.py) | `Intake` dataclass: +3 fields. `bucket_possibilities()` finger branch: 8 path edits + 4 new bucket dispatches. |
| [src/bucket_content.py](../../../src/bucket_content.py) | 4 new entries: `epiphyseal_stress_fx`, `dip_capsulitis`, `flexor_tendon_rupture`, `thumb_ucl`. Each with full clinical content authored from web research per bucket — matches_if (≥3 bullets), quick_test, reasoning_basis (≥1 paragraph), sources (≥2 cited peer-reviewed). |
| [frontend/src/components/TriageTab.jsx](../../../frontend/src/components/TriageTab.jsx) | Add `age_band` wizard step (all regions). Add `can_extend_fingertip` + `can_straighten_middle_joint` steps (finger-only). |
| [frontend/src/data/signalChips.js](../../../frontend/src/data/signalChips.js) | Add chip patterns for new text matches ("snapping over knuckle" etc.) so the frontend ↔ backend keyword contract stays in sync. |
| [tests/test_finger_triage.py](../../../tests/test_finger_triage.py) | New tests per §5 below. |
| [tests/test_bucket_content.py](../../../tests/test_bucket_content.py) | Verify 4 new bucket IDs have required fields. |
| [tests/run_all_scenarios.py](../../../tests/run_all_scenarios.py) | Add ~12 new scenarios per §5. |
| [tests/test_signal_chips_keywords.py](../../../tests/test_signal_chips_keywords.py) | Regression check for new chip patterns. |

### 4.2 New

| Path | Purpose |
|---|---|
| [kb/finger_capsulitis_synovitis.md](../../../kb/finger_capsulitis_synovitis.md) | PIP synovitis + DIP capsulitis. Split from current `finger_pulley.md` so the retriever can cite per-pattern. |
| [kb/finger_pediatric.md](../../../kb/finger_pediatric.md) | Epiphyseal stress fx, growth-plate considerations, age-specific guidance. |
| [kb/thumb_injuries.md](../../../kb/thumb_injuries.md) | Thumb UCL, thumb-specific patterns. |
| [kb/finger_tendon_injuries.md](../../../kb/finger_tendon_injuries.md) | Jersey, mallet, boutonnière, flexor tendon rupture. Extracted from `finger_pulley.md` to let `pulley` and `tendon` cite separately. |

`finger_pulley.md` stays but trimmed to pulley-only content (no longer holds mallet/jersey/boutonnière content — that moves to `finger_tendon_injuries.md`).

### 4.3 Unchanged (preservation contract)

- All other regions (`bucket_possibilities()` branches for wrist, elbow, shoulder, knee, hip, back, calf, ankle, chest, neck, abs, etc.) — UNTOUCHED
- The 14 existing finger buckets keep their CONTENT; only their gating changes
- All Recover tab UI ([frontend/src/components/Recover*.jsx](../../../frontend/src/components/), [RehabProtocol.jsx](../../../frontend/src/components/RehabProtocol.jsx)) — backend-only change
- No database schema migrations (JSONB accepts new fields naturally)
- No env vars
- API contract unchanged (intake payload accepts new fields; old payloads still work with defaults)

---

## 5. Test plan

### 5.1 Unit tests ([tests/test_finger_triage.py](../../../tests/test_finger_triage.py))

One test per acceptance criterion:

**New-bucket tests (4 fire-conditions + 4 absent-conditions = 8):**
- `epiphyseal_stress_fx` fires when finger + under_14 + Hard crimp → assert in `out[0]`, qualifier `urgent`
- `epiphyseal_stress_fx` does NOT fire for finger + 18_to_29 + Hard crimp
- `dip_capsulitis` fires for finger + palm_tip + Gradual + swelling=Yes
- `dip_capsulitis` does NOT fire for finger + palm_tip + Sudden
- `flexor_tendon_rupture` fires for finger + Sudden + severity=8 + text="tore" + palm_mid
- `flexor_tendon_rupture` does NOT fire for finger + Sudden + severity=8 + palm_tip (would be jersey)
- `thumb_ucl` fires for finger + which_finger=Thumb + Sudden
- `thumb_ucl` does NOT fire for finger + which_finger=Ring

**Path-fix tests (one per fix, 8 total):**
- `pulley_a2` fires for finger + palm_base + half_crimp + Pinky at qualifier `possible`
- `pulley_a4` fires at `possible` for finger + palm_mid + full_crimp (new fallback)
- `jersey_finger` fires at `consider evaluation` for finger + Middle + Sudden + jam
- `mallet_finger` fires at `urgent` when can_extend_fingertip="No" without any text patterns
- `boutonniere` fires at `urgent` when can_straighten_middle_joint="No" without any text patterns
- `pip_synovitis` fires for Gradual + palm_mid + swelling=No + text="stiff in morning"
- `sagittal_band_rupture` fires for dorsal + Middle + text="snapping over knuckle"
- `epiphyseal_stress_fx` overrides ALL other finger buckets when age_band=under_14 (verify it's `out[0]`)

**Age-band gating tests (5):**
- Under_14 → epiphyseal fires
- 14_to_17 → epiphyseal fires
- 18_to_29 → epiphyseal does NOT fire
- 50_plus → epiphyseal does NOT fire
- "" (empty) → epiphyseal does NOT fire

**Structured-vs-text precedence tests (4):**
- mallet structured "No" + text empty → fires urgent
- mallet structured "No" + text "fine" → fires urgent (structured wins)
- mallet structured "" + text "tip droops" → fires urgent (text-pattern fallback)
- mallet structured "Yes" + text "tip droops" → fires `possible` (contradiction softens, user answer not overridden)

**Total new unit tests: ~25**

### 5.2 Scenario regression ([tests/run_all_scenarios.py](../../../tests/run_all_scenarios.py))

- All existing 100+ scenarios must continue to pass — verify no silent regressions in OTHER regions
- Add ~12 new scenarios covering the new buckets + path-fix edge cases:
  1. 15-year-old climber with crimp pain → `epiphyseal_stress_fx` first
  2. 12-year-old climber with finger pain → `epiphyseal_stress_fx` overrides everything
  3. 28-year-old with DIP stiffness, no swelling → `dip_capsulitis` likely
  4. Sudden severe finger pain + "tore" with palm_mid → `flexor_tendon_rupture` consider eval
  5. Thumb forced abduction during jam → `thumb_ucl` likely
  6. Pinky A2-region pain on crimp → `pulley_a2` possible (broadened path)
  7. Open-hand grip + palm_mid pain → `pulley_a2` possible (open-hand path)
  8. Middle finger jersey-finger pattern → `jersey_finger` consider eval
  9. Mallet structured "No" answer → mallet_finger urgent without text patterns
  10. Boutonnière structured "No" answer → boutonniere urgent without text patterns
  11. Gradual palm_mid + "stiff in morning" no swelling → `pip_synovitis`
  12. Sagittal band with "snapping over knuckle" → `sagittal_band_rupture`

### 5.3 Frontend ↔ backend contract regression

- `tests/test_signal_chips_keywords.py` continues to pass with new chip patterns added

### 5.4 Manual verification

- Wizard renders three new questions correctly (age_band always; functional checks finger-only)
- Submitting a finger triage with all defaults still produces sensible output (no surprise empty bucket list)
- Submitting a finger triage with `age_band="under_14"` produces `epiphyseal_stress_fx` as the first bucket

---

## 6. Acceptance criteria

Phase 1 is complete when:

1. All 4 new buckets have full clinical content in `bucket_content.py` matching the existing bar: matches_if ≥3 bullets, quick_test present, reasoning_basis ≥1 paragraph, ≥2 cited peer-reviewed sources per bucket
2. All 8 decision-tree fixes implemented per §2; each verified by a targeted unit test
3. `Intake` dataclass extended with 3 new fields with `""` defaults (`age_band`, `can_extend_fingertip`, `can_straighten_middle_joint`)
4. Wizard renders 3 new questions in the right order (age_band early; functional-check questions in the finger-only path)
5. The 100+ existing scenarios in `tests/run_all_scenarios.py` all still pass (no regression in any other region)
6. ~12 new scenarios added and pass
7. KB split into 4 new finger-specific files (plus trimmed `finger_pulley.md`); retriever re-vectorizes on app startup (no manual step required — TF-IDF reload is eager per [src/retriever.py:19-29](../../../src/retriever.py#L19))
8. `intake_json` deserialization handles both old (no new fields) and new (with new fields) payloads in `sessions` table
9. Frontend ↔ backend keyword contract maintained in `signalChips.js`; `test_signal_chips_keywords.py` regression passes
10. No backend schema migration required
11. `git diff main..feature-branch -- 'frontend/src/components/Recover*' 'frontend/src/components/RehabProtocol*'` is empty
12. `git diff main..feature-branch -- main.py database.py 'src/billing.py' 'src/coach.py' 'src/email.py'` is empty (only `src/triage.py`, `src/bucket_content.py`, `src/retriever.py` backend changes allowed; retriever optional if KB split happens cleanly)

---

## 7. Open questions

None blocking. Two to revisit after first user-facing render:

1. **Where in the wizard does `age_band` appear?** Front-loaded (before region selection — covers ALL triages) vs after region (skip if not finger). Front-loaded is recommended (Phase 3 spondylolysis reuses this field). Confirm during implementation.
2. **`epiphyseal_stress_fx` qualifier text.** The output renderer maps `qualifier="urgent"` to specific UI copy. Verify the surfaced text reads appropriately for a teen climber + parent reading the result (e.g., "see a hand specialist or sports-medicine physician — pediatric growth-plate stress fracture must be ruled out"). Adjust during implementation if needed.

## 8. Cross-phase tracking

This spec writes the `age_band` field. **Phase 3** will reuse it for `spondylolysis_pars`. Don't refactor `age_band` away in Phase 3 — extend its consumers.

Phase 1 does NOT touch the `out[:4]` truncation logic ([src/triage.py:1276](../../../src/triage.py#L1276)). Phase 4 will audit ordering across all regions to verify the truncation doesn't silently drop primary diagnoses; for Phase 1, the new buckets are appended at the end (or `out.insert(0, ...)` for epiphyseal) and the truncation behavior with `acute_tissue_injury` insertion stays as-is.
