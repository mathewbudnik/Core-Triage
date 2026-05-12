# Triage Bucket Explanations — Design

**Date:** 2026-05-11
**Status:** Approved, ready for implementation plan

---

## Problem

The triage results page shows a "What it could be" section with 3–4 differential cards. Each card today displays only a title (e.g. *"Pulley strain/rupture (A2 most likely)"*) and a one-line "why" (e.g. *"Pain on palm-side at base of finger, worse with crimping. May have felt a pop."*).

This leaves the user with a list of plausible options but no way to discriminate between them. The deliberate non-diagnostic stance is correct, but users are left feeling unresolved.

## Goal

Each card becomes tap-to-expand. The expanded view shows three short, structured fields — drawn from the existing `kb/` content — that help the user reason about whether the card applies to them. The user is not told which one they have; they are given the discriminators to figure it out themselves.

## Non-goals

- LLM-generated personalized analysis. Rejected for hallucination risk in a health-adjacent context.
- Symptom-matching confidence score (e.g. "matches 4/5 of your symptoms"). Rejected as too complex for marginal benefit; the bullet-to-intake mapping is brittle.
- Changes to the PDF report. The PDF stays in its current concise form as a provider-discussion document.
- Severity-level explanations. The existing `severity.description` field already covers this.

## Architecture

### Bucket data model

`src/triage.py` currently emits `List[Tuple[str, str]]` from `bucket_possibilities()`. Replace with a dataclass:

```python
@dataclass
class Bucket:
    id: str                    # stable key for content lookup, e.g. "pulley_a2"
    title: str
    why: str
    matches_if: list[str]      # 3-5 bullets: "you probably have this if..."
    not_likely_if: list[str]   # 1-3 bullets: "probably not this if..."
    quick_test: str            # one-sentence self-check
```

The branching logic in `bucket_possibilities()` keeps its current shape but emits `Bucket` instances. Each existing tuple is rewritten as:

```python
out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
```

`Bucket.from_id(id, qualifier=None)` is a classmethod that looks up `(base_title, why, matches_if, not_likely_if, quick_test)` from a `BUCKET_CONTENT: dict[str, dict]` map and constructs the dataclass. The final `title` is `base_title` if no qualifier, otherwise `f"{base_title} — {qualifier}"`. Example: `Bucket.from_id("pulley_a2", qualifier="most likely")` → title `"Pulley strain/rupture (A2) — most likely"`. This keeps the qualifier ("most likely" / "possible" / "urgent" / "common") as a runtime decision made by the branching logic, while the canonical base title lives in the content module.

### Bucket ID scheme

IDs are stable string keys, snake_case, unique across the whole app. The current title strings include qualifier suffixes like `"(most likely)"` / `"(possible)"` that vary by intake — IDs strip these. Examples:

- `pulley_a2` — *Pulley strain/rupture (A2 most likely)*
- `lumbrical_tear` — *Lumbrical tear (possible)*
- `flexor_tenosynovitis` — *Flexor tendon tenosynovitis (possible)*
- `collateral_ligament_finger` — *Collateral ligament or joint capsule irritation*
- `boutonniere` — *Boutonnière deformity / central slip rupture (urgent)*

The qualifier suffix is part of the `title` field, not the `id`, so a single content entry serves whether the bucket appears as "most likely" or "possible".

### Content storage

A new module `src/bucket_content.py` holds the `BUCKET_CONTENT` map. Python module rather than JSON: allows comments, type checking, and natural editing in the same toolchain as the rest of the backend.

```python
# src/bucket_content.py
BUCKET_CONTENT: dict[str, dict] = {
    "pulley_a2": {
        "base_title": "Pulley strain/rupture (A2)",
        "why": "Pain on palm-side at base of finger, worse with crimping. May have felt a pop.",
        "matches_if": [
            "Sharp pain at the palm-side base of the finger (where the finger meets the palm)",
            "You felt or heard a pop at the moment of injury",
            "Worse with full-crimp grip, better with open-hand",
            "Tender to press directly on the base of the proximal phalanx",
        ],
        "not_likely_if": [
            "Pain is at the side of the finger joint, not the palm side",
            "Diffuse swelling along the whole finger rather than localized at the base",
        ],
        "quick_test": "Press firmly at the base of the proximal phalanx (palm side). Sharp, localized pain in that exact spot points to pulley involvement.",
    },
    # ... one entry per bucket id
}
```

The qualifier suffix (`(most likely)` vs `(possible)`) is applied at the call site in `bucket_possibilities()` by passing an optional `qualifier=` argument to `Bucket.from_id()`. Default is no qualifier suffix.

### API contract

`POST /api/triage` response currently returns:

```json
{ "buckets": [{ "title": "...", "why": "..." }] }
```

Becomes (additive):

```json
{
  "buckets": [{
    "id": "pulley_a2",
    "title": "Pulley strain/rupture (A2 most likely)",
    "why": "...",
    "matches_if": ["...", "..."],
    "not_likely_if": ["..."],
    "quick_test": "..."
  }]
}
```

`main.py:649` already serializes buckets via `[{"title": t, "why": w} for t, w in buckets]`. This becomes `[asdict(b) for b in buckets]`.

Backwards compatible: any caller (PDF, tests, frontend) that only reads `title` and `why` continues to work.

### Frontend

`frontend/src/components/TriageTab.jsx:467` — the bucket card grid.

Changes:
- Replace the static card render with a tap-to-expand pattern
- Track expanded state with `useState(() => new Set())` of bucket indexes
- Add a small chevron icon (lucide `ChevronDown`) that rotates 180° when expanded
- Tap on entire card → toggle in/out of the expanded set
- Expanded section appears below the existing title + why, with three labeled blocks:
  - **Matches if** — `CheckCircle` icon, green tint, bulleted list
  - **Probably not this if** — `XCircle` icon, muted tint, bulleted list (omitted if empty)
  - **Quick self-check** — `Hand` icon, accent tint, single sentence (omitted if empty)
- Cards where `matches_if` is empty don't show the chevron and remain non-interactive — same look as today

Animation: `framer-motion` AnimatePresence with a height + opacity transition, matching existing accordion patterns elsewhere in the app (e.g. `AccordionSection` used for the "What to do" plan).

PDF (`TriageReport.jsx`) is **not modified**. The differentials section stays as it is today.

## Content sourcing

For each bucket emitted by `bucket_possibilities()`:

1. Identify the matching `kb/*.md` file (e.g. `pulley_a2` → `kb/finger_pulley.md`)
2. Draft `matches_if` from the KB's "Symptoms" + "Mechanism" content
3. Draft `not_likely_if` from the KB's "Differentiating from X" sections — this is the most valuable content for user self-discrimination
4. Draft `quick_test` from KB palpation/test descriptions
5. Where the KB does not cover a bucket (e.g. some neck and lat buckets), draft from general climbing-injury knowledge and **flag explicitly in the PR description** so the user can scrutinize those entries closely

All content is reviewed by the user before each region's commit lands.

## Phasing

**Phase 1 — Vertical slice (finger region only)**

- Dataclass + content module + API serialization + frontend expand UX
- Content authored for the 5 finger buckets: `pulley_a2`, `lumbrical_tear`, `flexor_tenosynovitis`, `collateral_ligament_finger`, `boutonniere`
- Plus the catch-all `acute_tissue_injury` that gets prepended when severity ≥ 7 + sudden onset
- Plus the generic fallback `overuse_load_spike` (so the empty-region path works)
- Unit test + manual dev-server walkthrough
- **STOP here for user review of finger content quality and UX feel before proceeding**

**Phase 2 — Remaining regions**

One commit per region group, in this order (by clinical commonality):
1. Elbow + wrist
2. Shoulder + tricep
3. Knee + hip + hamstring + glute
4. Back (lower, upper) + neck + lat
5. Ankle/foot + calf + chest

Each commit: content additions only, no code changes. Each goes up for user review individually.

**Phase 3 — Editorial pass**

The user reviews all content end-to-end; corrects voice, factual nuances, and climbing-specific accuracy. Code path is unchanged.

## Verification

### Automated

New unit test `tests/test_bucket_content.py`:

- Enumerates every `Intake` permutation that could trigger a unique bucket (region × mechanism × onset × severity sweep)
- For every emitted bucket: assert its `id` is present in `BUCKET_CONTENT`
- For every bucket with non-empty `matches_if`: assert `quick_test` is also non-empty (consistency check)
- For every entry in `BUCKET_CONTENT`: assert `matches_if` has at least 3 items (lower bound prevents content rot)

This guards against silent missing-content regressions when new buckets are added.

### Manual

- `cd frontend && npm run dev` and walk through a finger triage in the wizard
- Tap each expanded card on mobile breakpoint (375px) — confirm the expand animation is smooth and content fits
- Tap-collapse behavior, accessibility (keyboard focus on cards)

### Regression

- Existing `tests/test_triage_calibration.py` continues to pass (50/50 today)
- Existing `tests/run_all_scenarios.py` continues to pass (102/102 today)
- PDF generation unchanged — verify a sample download still works

## Files touched

| File | Change |
|---|---|
| `src/triage.py` | Replace tuple buckets with `Bucket` dataclass; add `Bucket.from_id` factory |
| `src/bucket_content.py` | NEW — `BUCKET_CONTENT` dict |
| `main.py:649` | Serialize buckets via `asdict()` instead of tuple destructuring |
| `frontend/src/components/TriageTab.jsx:467` | Tap-to-expand cards with chevron + animated reveal |
| `tests/test_bucket_content.py` | NEW — content coverage + consistency tests |

`frontend/src/components/TriageReport.jsx` (the PDF) is intentionally unchanged.

## Open questions resolved

- **LLM augmentation?** No. Static only.
- **Symptom-match score?** No. Too brittle.
- **PDF includes expanded content?** No. PDF stays concise.
- **Content authored by?** Me (drafts from KB), then user review per region.
- **UX shape?** Tap-to-expand inline.
- **Ship strategy?** Vertical slice (finger) → stop for review → remaining regions in batches.
