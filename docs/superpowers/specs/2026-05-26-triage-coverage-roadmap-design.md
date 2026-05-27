# Triage Coverage Expansion — Roadmap & Audit

**Status:** approved direction, Phase 1 spec in `2026-05-26-triage-coverage-phase-1-finger-design.md`
**Owner:** Mathew Budnik
**Date:** 2026-05-26
**Document type:** Reference + roadmap (not directly actionable; each phase has its own spec/plan)

## Context

CoreTriage's injury triage covers a broad surface (82 clinical buckets across 17 body regions per [src/bucket_content.py](../../../src/bucket_content.py)) but a recent audit revealed:

- **Confirmed bug-class issues** — two buckets are functionally unreachable due to mechanism-string mismatches; one entire region (Abs) has zero differential buckets; several gating rules are too narrow
- **Pediatric coverage is entirely absent** — adolescent epiphyseal stress fractures and spondylolysis (both career-ending if missed per Schöffl 2022) have no buckets
- **Wrist and shoulder branches are thin** — 4 buckets each despite the literature documenting 10+ climbing-relevant entities per region
- **Per-bucket gating is sometimes too narrow** — e.g. `pulley_a2` excludes Thumb/Pinky; `meniscus_tear` doesn't fire on heel-hook mechanism (the most-injured heel-hook structure per Schöffl 2016)

This document captures the full audit findings and a 4-phase strategy to close the gaps. Each phase ships as its own spec → implementation plan → implementation cycle.

## Roadmap at a glance

| Phase | Theme | New buckets | Path edits | Intake/UI changes |
|---|---|---|---|---|
| **1** | Finger/hand corrections + pediatric safety | 4 | 8 | +1 field (age_band), +2 functional-check questions |
| **2** | Rest of upper extremity (wrist, elbow, shoulder) + chip-set fix | 10 | 6 + chip rename | Mechanism chip additions |
| **3** | Trunk / back / abs (closes Abs blackhole) | 8 | 5 (incl. new abs branch) | 1 new mechanism chip |
| **4** | Lower extremity refinement | 6 | 4 | none |
| **Total** | | **28** | **23** | **3 intake fields, 2 chip changes** |

**Starting bucket count:** 82. **Post-roadmap:** 110.

## Confirmed bug-class issues (the "all paths correct" findings)

These are the highest-priority items because they break documented coverage rather than expand it. Each is assigned a phase based on which region's content it bundles with.

1. **`pec_major_tear` is functionally unreachable** ([src/triage.py:1253](../../../src/triage.py#L1253)) — gates on mechanism strings (`Dynamic / jumping move`, `Powerful move / slap`) that don't exist in the upper-body chip set ([frontend/src/components/TriageTab.jsx:25](../../../frontend/src/components/TriageTab.jsx#L25)). Fix → Phase 2 (bundled with chip-set rename).
2. **`distal_biceps` is partially unreachable** ([src/triage.py:1134](../../../src/triage.py#L1134)) — requires `Hard lock-off` which is in finger and lower-body chip sets only. Fix → Phase 2.
3. **Abs region has zero differential buckets** — selectable in UI, falls to generic `overuse_load_spike`. Fix → Phase 3 (entirely new region branch).
4. **`pulley_a2` excludes Thumb / Pinky / Multiple** ([src/triage.py:1027](../../../src/triage.py#L1027)) — narrow gating drops valid cases to the tail catch-all. Fix → Phase 1.
5. **`meniscus_tear` doesn't fire on heel hook** ([src/triage.py:1149-1151](../../../src/triage.py#L1149)) — contradicts [Schöffl 2016](https://journals.sagepub.com/doi/10.1016/j.wem.2015.12.007) (lateral meniscus is the most-injured heel-hook structure). Fix → Phase 4.
6. **`hip_labral` only fires on sudden onset** ([src/triage.py:1163](../../../src/triage.py#L1163)) — most climbing labral tears are insidious. Fix → Phase 4.
7. **Mallet / boutonnière rely on free-text patterns only** — no structured functional-check intake question to back them up; users who don't phrase it perfectly silently miss the urgent splinting window. Fix → Phase 1.
8. **`out[:4]` truncation** ([src/triage.py:1276](../../../src/triage.py#L1276)) — when `acute_tissue_injury` insert-at-0 fires, it pushes 4 already-appended buckets down; one will be silently dropped. Cross-cutting; tracked for Phase 4 final pass.

## Per-region gap analysis (summarized from audit)

### Finger (Phase 1)
**Current:** 14 buckets, well-developed branch (most logic in the codebase). Missing: pediatric epiphyseal stress fx (career-ending), DIP joint capsulitis (distinct from PIP), isolated FDS/midsubstance FDP rupture (jersey covers only distal avulsion), thumb UCL sprain (Thumb wizard option currently surfaces nothing).

**Surfacing bugs:** `pulley_a2` too narrow (location + which_finger), `pulley_a4` requires palm_tip only (users describe A4 region as "middle"), `jersey_finger` ring-finger-only, mallet/boutonnière text-pattern-only, `pip_synovitis` requires swelling, `sagittal_band_rupture` uses unfamiliar phrasing.

**Not adding (deliberately):** A1 pulley (clinically the trigger-finger site, already covered), A5 pulley (rare in climbers per Schöffl; broadening A2/A4 paths covers the affected regions), cruciate pulleys C0-C3 (not climbing-relevant per literature).

### Wrist (Phase 2)
**Current:** 4 buckets — `wrist_flexor_tendinopathy`, `scaphoid_fracture`, `tfcc`, `de_quervain`. Severely under-spec'd.

**Missing:** ECU tendinopathy/subluxation ([PMC 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9657429/)), intersection syndrome ([Tobin 2017](https://journals.sagepub.com/doi/10.1016/j.wem.2017.03.016)), ulnar impaction syndrome, carpal tunnel / Guyon canal syndrome, wrist extensor tendinopathy.

### Elbow (Phase 2)
**Current:** 4 buckets — `medial_epicondylitis`, `lateral_epicondylitis`, `cubital_tunnel`, `distal_biceps`. Plus the dead path bug.

**Missing:** Brachialis tendinopathy ([The Climbing Doctor](https://theclimbingdoctor.com/brachialis-tendinopathy-in-climbers/), [Lutter 2024](https://pubmed.ncbi.nlm.nih.gov/39514725/)), brachioradialis strain, pronator teres syndrome. Cross-branch: `posterior_elbow_impingement` (in triceps) should also surface from elbow.

### Shoulder (Phase 2)
**Current:** 4 buckets — `rotator_cuff_impingement`, `slap_tear`, `shoulder_instability_bankart`, `ac_joint`. Thin vs Schöffl's top-5.

**Missing:** Long-head biceps tendinopathy at shoulder (anterior shoulder, distinct from `distal_biceps` at elbow — #1 cause of anterior shoulder pain), subscapularis tear / coracoid impingement (Schöffl climbing-specific entity per [Schöffl 2011](https://journals.sagepub.com/doi/full/10.1016/j.wem.2010.12.005)), posterior cuff / infraspinatus + teres minor tendinopathy.

### Abs (Phase 3 — TOTAL GAP)
**Current:** Zero differential buckets. UI region falls to `overuse_load_spike`. Largest content gap in the app.

**Missing:** Rectus abdominis strain ([The Climbing Doctor](https://theclimbingdoctor.com/abdominal-strains-in-rock-climbers/)), oblique strain (side-pulls/gastons), sports hernia / athletic pubalgia, rib stress fracture ([WEM 2023 case](https://journals.sagepub.com/doi/full/10.1016/j.wem.2022.09.004)).

### Lower back (Phase 3)
**Current:** 4 buckets. Adolescent spondylolysis missing — per [Frontiers 2023](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1328811/full), 74% of competitive climbers age 13-19 report low-back pain in the past 12 months; spondylolysis is a specific career-impacting risk.

### Other regions
**Lower extremity (Phase 4):** Mostly serviceable but missing PCL injury from heel hook, popliteus tendinopathy/strain (described in Schöffl heel-hook 2016), patellofemoral pain syndrome, iliopsoas tendinopathy, deep external rotator strain, medial tibial stress syndrome.

**Neck (Phase 3 partial):** Branch is reasonably complete. Missing: thoracic outlet syndrome (neurogenic).

**Chest, hip, knee, calf, glutes, hamstring, lats, upper back, triceps:** All branches present. Per-region gap details in the full audit report.

## Phase-by-phase summary

### Phase 1 — Fingers + pediatric safety + finger bug fixes
**Spec:** [2026-05-26-triage-coverage-phase-1-finger-design.md](2026-05-26-triage-coverage-phase-1-finger-design.md)
**New buckets:** `epiphyseal_stress_fx`, `dip_capsulitis`, `flexor_tendon_rupture`, `thumb_ucl`
**Path fixes:** 8 finger-region edits (a2 broaden, a4 fallback, jersey broaden, mallet/boutonnière structured questions, pip_synovitis loosen, sagittal_band text patterns, age-gate epiphyseal)
**Intake:** +`age_band`, +`can_extend_fingertip`, +`can_straighten_middle_joint`
**Why first:** User's stated priority + pediatric safety items + most-frequent injury class in climbing

### Phase 2 — Rest of upper extremity
**New buckets:** 5 wrist (`ecu_tendinopathy`, `intersection_syndrome`, `ulnar_impaction`, `carpal_tunnel`, `wrist_extensor_tendinopathy`), 3 elbow (`brachialis_tendinopathy`, `brachioradialis_strain`, `pronator_teres_syndrome`), 2 shoulder (`lhb_tendinopathy_shoulder`, `subscapularis_coracoid_impingement`, `posterior_cuff_tendinopathy`)
**Path fixes:** Fix `pec_major_tear` (chip-set rename), fix `distal_biceps` (add Hard lock-off to upper-body chips), add Fall to upper-body chips (unblocks scaphoid_fracture), cross-link `posterior_elbow_impingement` to elbow region, surface `cubital_tunnel` from wrist region (Guyon variant)
**Why second:** Largest bucket-count gap (wrist + shoulder); bundles all chip-set changes once

### Phase 3 — Trunk / back / abs
**New buckets:** 4 abs (`rectus_abdominis_strain`, `oblique_strain`, `sports_hernia_pubalgia`, `inguinal_hernia`), 2 back (`spondylolysis_pars`, `quadratus_lumborum_strain`), `rib_stress_fracture`, `thoracic_outlet_syndrome`
**Path fixes:** Add new abs region branch (5 path edits), age-gate spondylolysis (reuses age_band from Phase 1), add `Powerful pull / mantle` chip
**Why third:** Abs blackhole is biggest content gap; spondylolysis pairs with Phase-1 pediatric work

### Phase 4 — Lower extremity refinement
**New buckets:** 3 knee (`pcl_heel_hook`, `popliteus_strain`, `patellofemoral_pain`), 2 hip (`iliopsoas_tendinopathy`, `deep_external_rotator_strain`), `medial_tibial_stress_syndrome`
**Path fixes:** `meniscus_tear` on heel hook, `hip_labral` on insidious onset, `proximal_hamstring_tendinopathy` on gradual + high-volume, `popliteus_strain` on heel hook + posterolateral knee text
**Cross-cutting:** Audit `out[:4]` truncation across all branches; verify ordering doesn't silently drop top diagnoses
**Why last:** Lowest user-volume per-bucket; small refinements

## Source-of-truth policy (per-bucket clinical content)

Each new bucket's clinical content (matches_if, quick_test, reasoning_basis, sources) is authored via **targeted WebSearch per bucket** during the implementation phase. Matches the existing bar in [src/bucket_content.py](../../../src/bucket_content.py) where every bucket cites peer-reviewed sources.

Key reference papers consulted in the audit:
- [Schöffl V et al. Injury Trends in Rock Climbers (911 Injuries 2009-2012). WEM 2015](https://journals.sagepub.com/doi/full/10.1016/j.wem.2014.08.013)
- [Miro PH, Schöffl V et al. Finger Flexor Pulley Injuries in Rock Climbers. WEM 2021](https://journals.sagepub.com/doi/10.1016/j.wem.2021.01.011)
- [Schöffl V et al. Diagnostic-Therapeutic Algorithm for Finger Epiphyseal Growth Plate Stress Injuries in Adolescent Climbers. 2022](https://journals.sagepub.com/doi/10.1177/03635465211056956)
- [Schöffl V, Lutter C, Popp D. The Heel Hook — A Climbing-Specific Technique to Injure the Leg. WEM 2016](https://journals.sagepub.com/doi/10.1016/j.wem.2015.12.007)
- [Schöffl V et al. Coracoid Impingement Syndrome Due to Intensive Rock Climbing Training. WEM 2011](https://journals.sagepub.com/doi/full/10.1016/j.wem.2010.12.005)
- [Lutter C et al. More Than Just Another Elbow Tendinopathy: Misdiagnosed Ulnar Nerve Compression. 2024](https://pubmed.ncbi.nlm.nih.gov/39514725/)
- [Forrester JD et al. Pectoralis Major Tendon Rupture While Bouldering. WEM 2023](https://journals.sagepub.com/doi/full/10.1016/j.wem.2022.09.004)
- [Frontiers 2023. Lower back pain in young climbers: a retrospective cross-sectional study](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1328811/full)
- [Frontiers 2023. Clinical management of finger joint capsulitis/synovitis in a rock climber](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1185653/full)
- The Climbing Doctor: [TFCC](https://theclimbingdoctor.com/tfcc-injury-a-common-source-of-wrist-pain-in-climbers/), [Brachialis](https://theclimbingdoctor.com/brachialis-tendinopathy-in-climbers/), [LHB](https://theclimbingdoctor.com/long-head-of-the-biceps-tendinopathy/), [DIP](https://theclimbingdoctor.com/dipcapsulitis/), [Abdominal Strains](https://theclimbingdoctor.com/abdominal-strains-in-rock-climbers/), [Ulnar Nerve](https://theclimbingdoctor.com/ulnar-nerve-entrapment-in-rock-climbers/)

## Out of scope (across all phases)

- UI redesign of the Recover tab (current chrome is fine; coverage expansion is backend-only)
- Refactoring `bucket_content.py` from Python-as-content to JSON/CMS (tracked separately as a content-platform decision)
- Cruciate pulleys C0-C3 (not climbing-relevant per literature)
- Dedicated A1/A5 buckets (covered by broadening A2/A4 + trigger_finger)
- Multi-language clinical content (English-only stays for v1 of expansion)
- New tier-gating (free vs pro vs coaching access to triage — current open-to-all policy continues)

## Open follow-ups

- After Phase 4: re-audit the `out[:4]` truncation to verify the per-region ordering doesn't silently drop primary diagnoses
- Consider a clinician-review pass on the full 110-bucket catalog once expansion is complete (formal medical sign-off pre-launch of any clinical certification)
- Telemetry: log which buckets actually surface per session vs which are surfaced but ignored — drives future calibration
