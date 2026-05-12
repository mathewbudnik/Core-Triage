# Triage Bucket Explanations Implementation Plan (Phase 1 — Finger Region Vertical Slice)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the structural code change (Bucket dataclass, API contract, tap-to-expand UX) end-to-end with full content for the finger region only. Remaining regions ship as content-only commits in a later plan.

**Architecture:** Replace the `(title, why)` tuple in `bucket_possibilities()` with a `Bucket` dataclass that has stable `id`, plus three new fields (`matches_if`, `not_likely_if`, `quick_test`) sourced from a new content map keyed by `id`. Frontend tap-to-expand cards reveal those fields. Buckets with empty content stay non-interactive — matches today's behavior — so the rest of the body regions keep working unchanged while their content is authored later.

**Tech Stack:** Python (FastAPI, dataclasses), `unittest`, React (Vite), `framer-motion` for the expand animation, `lucide-react` for icons.

**Spec:** [docs/superpowers/specs/2026-05-11-triage-bucket-explanations-design.md](../specs/2026-05-11-triage-bucket-explanations-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/triage.py` | Modify | Add `Bucket` dataclass + `Bucket.from_id` factory; refactor `bucket_possibilities()` to emit `Bucket` instances |
| `src/bucket_content.py` | **Create** | `BUCKET_CONTENT: dict[str, dict]` — single source of truth for per-bucket title/why/match content |
| `main.py` | Modify (1 line) | Serialize buckets via `asdict()` in `/api/triage` response |
| `frontend/src/components/TriageTab.jsx` | Modify | Tap-to-expand card behaviour for the "What it could be" section |
| `tests/test_bucket.py` | **Create** | Dataclass + factory unit tests |
| `tests/test_bucket_content.py` | **Create** | Coverage test — every emitted bucket has a `BUCKET_CONTENT` entry; finger buckets pass content-quality bounds |

`frontend/src/components/TriageReport.jsx` (the PDF) is **intentionally unchanged**.

---

## Verification commands

Throughout this plan:

- Python unit tests: `.venv/bin/python -m unittest tests.test_bucket tests.test_bucket_content tests.test_triage_calibration -v`
- Calibration regression: `.venv/bin/python -m unittest tests.test_triage_calibration -v` (must stay 50/50 PASS)
- Scenarios regression: `.venv/bin/python tests/run_all_scenarios.py` (must stay 102/102 PASS)
- Backend import smoke: `.venv/bin/python -c "import main; import src.triage; import src.bucket_content"`
- Frontend build: `cd frontend && npm run build`
- Frontend dev: `cd frontend && npm run dev` (then open `http://localhost:5173`)

---

## Task 1 — Bucket dataclass, content module skeleton, and `from_id` factory

**Files:**
- Create: `src/bucket_content.py`
- Modify: `src/triage.py` (add Bucket dataclass + factory just below the existing `Intake` dataclass, around line 36)
- Create: `tests/test_bucket.py`

- [ ] **Step 1: Create the content module with a minimal placeholder entry for tests**

Create `src/bucket_content.py` with the following exact content:

```python
"""Content map for triage buckets.

Each entry is keyed by a stable, snake_case bucket ID and provides:
- base_title: canonical injury name (qualifier suffix added at runtime)
- why: one-line plain-language reason this bucket surfaced
- matches_if: 3-5 bullets the user can self-check against
- not_likely_if: 1-3 bullets that argue AGAINST this bucket
- quick_test: a single-sentence palpation or movement self-check

Phase 1 of the rollout fills full content for the finger region only.
All other region buckets ship with base_title + why and empty list/string
fields for the new content; their cards render as non-interactive (no chevron)
in the UI until content is authored in Phase 2.
"""
from __future__ import annotations

BUCKET_CONTENT: dict[str, dict] = {
    # Placeholder used only by Task 1's tests. Replaced/expanded in Task 2.
    "_test_placeholder": {
        "base_title": "Test Bucket",
        "why": "test why",
        "matches_if": ["bullet a", "bullet b", "bullet c"],
        "not_likely_if": ["bullet x"],
        "quick_test": "test self-check sentence.",
    },
}
```

- [ ] **Step 2: Write the failing test for the Bucket dataclass and factory**

Create `tests/test_bucket.py` with the following exact content:

```python
"""Unit tests for the Bucket dataclass and Bucket.from_id factory."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.triage import Bucket  # noqa: E402


class BucketFactoryTests(unittest.TestCase):
    def test_from_id_no_qualifier_uses_base_title(self):
        b = Bucket.from_id("_test_placeholder")
        self.assertEqual(b.id, "_test_placeholder")
        self.assertEqual(b.title, "Test Bucket")
        self.assertEqual(b.why, "test why")
        self.assertEqual(b.matches_if, ["bullet a", "bullet b", "bullet c"])
        self.assertEqual(b.not_likely_if, ["bullet x"])
        self.assertEqual(b.quick_test, "test self-check sentence.")

    def test_from_id_with_qualifier_appends_em_dash_suffix(self):
        b = Bucket.from_id("_test_placeholder", qualifier="most likely")
        self.assertEqual(b.title, "Test Bucket — most likely")
        # base data fields unchanged
        self.assertEqual(b.why, "test why")

    def test_from_id_unknown_id_raises_keyerror(self):
        with self.assertRaises(KeyError):
            Bucket.from_id("definitely_not_a_real_id")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the test — expect ImportError because Bucket doesn't exist yet**

Run: `.venv/bin/python -m unittest tests.test_bucket -v`

Expected: ImportError or `AttributeError: module 'src.triage' has no attribute 'Bucket'`.

- [ ] **Step 4: Add the Bucket dataclass and `from_id` factory to `src/triage.py`**

In `src/triage.py`, immediately after the existing `Intake` dataclass (after line 36, before the `# ── Negation-aware keyword matching` section header), insert:

```python
# ── Bucket dataclass ────────────────────────────────────────────────────────
# A differential surfaced by bucket_possibilities(). Content (matches_if etc)
# lives in src/bucket_content.py keyed by `id` — keeping branching logic in
# triage.py separate from the prose the UI displays.
@dataclass
class Bucket:
    id: str
    title: str
    why: str
    matches_if: List[str]
    not_likely_if: List[str]
    quick_test: str

    @classmethod
    def from_id(cls, id: str, qualifier: str | None = None) -> "Bucket":
        """Look up bucket content by stable id and construct a Bucket.

        `qualifier` is appended to the canonical base title with an em-dash
        separator (e.g. "Pulley strain/rupture (A2) — most likely"). It is a
        runtime decision made by bucket_possibilities() — the same bucket can
        surface as "most likely" or "possible" depending on intake answers.

        Raises KeyError if the id is not present in BUCKET_CONTENT.
        """
        from src.bucket_content import BUCKET_CONTENT  # local import to avoid cycle at module load
        entry = BUCKET_CONTENT[id]
        base_title = entry["base_title"]
        title = f"{base_title} — {qualifier}" if qualifier else base_title
        return cls(
            id=id,
            title=title,
            why=entry["why"],
            matches_if=list(entry.get("matches_if", [])),
            not_likely_if=list(entry.get("not_likely_if", [])),
            quick_test=entry.get("quick_test", ""),
        )
```

- [ ] **Step 5: Run the test — expect all three pass**

Run: `.venv/bin/python -m unittest tests.test_bucket -v`

Expected: `Ran 3 tests in 0.XXXs OK`.

- [ ] **Step 6: Run the existing test suite to confirm no regression**

Run: `.venv/bin/python -m unittest tests.test_triage_calibration -v`

Expected: `Ran 50 tests ... OK` (unchanged from baseline).

- [ ] **Step 7: Commit**

```bash
git add src/triage.py src/bucket_content.py tests/test_bucket.py
git commit -m "Add Bucket dataclass + from_id factory + content module skeleton"
```

---

## Task 2 — Bootstrap `BUCKET_CONTENT` with every emitted bucket ID

**Goal:** Replace the placeholder with the full set of 55 IDs. Every ID gets `base_title` + `why`. The 7 finger-region IDs additionally get full content in Task 5; for now they get empty `matches_if` / `not_likely_if` / `quick_test`. This makes Task 3's refactor safe — every `Bucket.from_id` call has something to look up.

**Files:**
- Modify: `src/bucket_content.py` (replace the placeholder entry)
- Modify: `tests/test_bucket.py` (replace placeholder-based tests with real-data tests)

- [ ] **Step 1: Replace `BUCKET_CONTENT` with the full ID set**

In `src/bucket_content.py`, replace the entire `BUCKET_CONTENT = { ... }` dict literal with the following. (Keep the module docstring at the top of the file intact.)

```python
BUCKET_CONTENT: dict[str, dict] = {
    # ── Finger ─────────────────────────────────────────────────────────────
    "pulley_a2": {
        "base_title": "Pulley strain/rupture (A2)",
        "why": "Pain on palm-side at base of finger, worse with crimping. May have felt a pop.",
        "matches_if": [],
        "not_likely_if": [],
        "quick_test": "",
    },
    "lumbrical_tear": {
        "base_title": "Lumbrical tear",
        "why": "Deep palm pain that worsens when other fingers are extended — distinctive pattern.",
        "matches_if": [],
        "not_likely_if": [],
        "quick_test": "",
    },
    "flexor_tenosynovitis": {
        "base_title": "Flexor tendon tenosynovitis",
        "why": "Diffuse swelling along entire finger, worse after rest then with prolonged activity.",
        "matches_if": [],
        "not_likely_if": [],
        "quick_test": "",
    },
    "collateral_ligament_finger": {
        "base_title": "Collateral ligament or joint capsule irritation",
        "why": "Side-of-joint pain or persistent swelling at a finger joint.",
        "matches_if": [],
        "not_likely_if": [],
        "quick_test": "",
    },
    "boutonniere": {
        "base_title": "Boutonnière deformity / central slip rupture",
        "why": "PIP that cannot be extended to neutral — requires splinting within 72 hours.",
        "matches_if": [],
        "not_likely_if": [],
        "quick_test": "",
    },

    # ── Wrist ──────────────────────────────────────────────────────────────
    "wrist_flexor_tendinopathy": {
        "base_title": "Wrist flexor tendinopathy",
        "why": "Overuse from high-volume gripping; tender along wrist crease.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "scaphoid_fracture": {
        "base_title": "Scaphoid fracture",
        "why": "Fall on outstretched hand + radial wrist pain = scaphoid screening required before climbing.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "tfcc": {
        "base_title": "TFCC irritation / tear",
        "why": "Ulnar-side wrist pain from rotation, sidepulls, or gastons.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "de_quervain": {
        "base_title": "De Quervain's tenosynovitis",
        "why": "Base-of-thumb pain with pinch holds or sidepulls; positive Finkelstein test.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Elbow ──────────────────────────────────────────────────────────────
    "medial_epicondylitis": {
        "base_title": "Medial epicondylitis — Climber's Elbow",
        "why": "Overuse tendinopathy; inside elbow pain worse with gripping and wrist flexion.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "lateral_epicondylitis": {
        "base_title": "Lateral epicondylitis",
        "why": "Outside elbow pain; less common in climbers but occurs with extensor overuse.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "cubital_tunnel": {
        "base_title": "Cubital tunnel syndrome / ulnar nerve irritation",
        "why": "Tingling in ring and pinky fingers with medial elbow pain.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "distal_biceps": {
        "base_title": "Distal biceps injury",
        "why": "Anterior elbow pain with supination weakness — rule out complete rupture if pop occurred.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Shoulder ───────────────────────────────────────────────────────────
    "rotator_cuff_impingement": {
        "base_title": "Rotator cuff tendinopathy / impingement",
        "why": "Painful arc, overhead discomfort — often related to muscle imbalance in climbers.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "slap_tear": {
        "base_title": "SLAP tear",
        "why": "Deep shoulder clicking with overhead pain after a dynamic load.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "shoulder_instability_bankart": {
        "base_title": "Shoulder instability / Bankart lesion",
        "why": "Slipping sensation, especially with arm abducted and externally rotated.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "ac_joint": {
        "base_title": "AC joint sprain / separation",
        "why": "Top-of-shoulder pain after a fall onto the shoulder or outstretched arm.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Knee ───────────────────────────────────────────────────────────────
    "lcl_heel_hook": {
        "base_title": "LCL sprain — Heel hook injury",
        "why": "Outer knee pain from rotational load during heel hook. The most common acute knee injury in boulderers.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "it_band": {
        "base_title": "IT band syndrome",
        "why": "Lateral knee pain at 30 degrees flexion; worsens with repeated drop knee.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "meniscus_tear": {
        "base_title": "Meniscus tear",
        "why": "Joint line pain with twisting under load — requires evaluation if significant swelling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "patellar_tendinopathy": {
        "base_title": "Patellar tendinopathy",
        "why": "Below-kneecap pain; worse the day after climbing than during. Heel hooks are primary mechanism.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "acute_knee_ligament_meniscus": {
        "base_title": "Acute ligament or meniscus injury",
        "why": "Sudden high-pain knee injury warrants evaluation to rule out structural damage.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Hip ────────────────────────────────────────────────────────────────
    "hip_flexor_strain": {
        "base_title": "Hip flexor strain",
        "why": "Deep groin ache from repeated high stepping and rockover moves.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "hip_impingement": {
        "base_title": "Hip impingement-type irritation",
        "why": "Deep groin pain at end-range hip flexion — common with FAI anatomy.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "adductor_strain": {
        "base_title": "Adductor strain",
        "why": "Inner thigh pain from wide bridging or stemming positions.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "hip_labral": {
        "base_title": "Hip labral irritation",
        "why": "Sudden groin pain with clicking or catching at end-range hip flexion.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Tricep ─────────────────────────────────────────────────────────────
    "triceps_tendinopathy_elbow": {
        "base_title": "Triceps tendinopathy at the elbow",
        "why": "Aching at the back of the elbow where the triceps insert — overuse from heavy lock-offs, mantling, and campus board.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "long_head_triceps_strain": {
        "base_title": "Long head triceps strain",
        "why": "Sharp pain in the back of the upper arm during a hard lock-off or dynamic catch — felt as a pull, often in cross-body or overhead positions.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "posterior_elbow_impingement": {
        "base_title": "Posterior elbow impingement",
        "why": "Pinching at the back of the elbow at full extension — more common with hyperextension on lock-offs and mantling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "triceps_overuse_doms": {
        "base_title": "Triceps overuse / DOMS",
        "why": "Diffuse triceps soreness from a sudden volume increase on overhanging or campus-heavy training.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Upper back ─────────────────────────────────────────────────────────
    "rhomboid_midtrap_strain": {
        "base_title": "Rhomboid / mid-trap strain",
        "why": "Aching pain between the shoulder blades from steep pulling and lock-offs — climber's classic.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "upper_trap_overactivity": {
        "base_title": "Upper trapezius overactivity",
        "why": "Tension headaches and tight upper traps — overuse from hangboard, sustained overhead positions, and unconscious shrugging.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "scapular_dyskinesis": {
        "base_title": "Scapular dyskinesis",
        "why": "Poor scap control — often a strength imbalance between overdeveloped lats/pecs and weak rhomboids/serratus. Drives shoulder problems downstream.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "levator_scapulae_strain": {
        "base_title": "Levator scapulae strain",
        "why": "Pain at the neck-shoulder junction — common from sustained head extension on roofs and overhanging belays.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Lat ────────────────────────────────────────────────────────────────
    "lat_strain": {
        "base_title": "Lat strain",
        "why": "Sharp pain at the side of the back or under the armpit after a dynamic catch or full hang. May feel a pull or pop.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "teres_major_strain": {
        "base_title": "Teres major strain",
        "why": "Often grouped with the lats — pain along the posterior shoulder/armpit, common from overhead pulling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "lat_tendinopathy_humerus": {
        "base_title": "Lat tendinopathy at humerus insertion",
        "why": "Aching at the front of the armpit where the lat inserts — overuse from high-volume steep pulling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "posterior_chain_overuse": {
        "base_title": "Posterior chain overuse",
        "why": "Diffuse lat soreness from sudden volume increases on steep terrain or board climbing.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Glute ──────────────────────────────────────────────────────────────
    "piriformis_deep_gluteal": {
        "base_title": "Piriformis / deep gluteal syndrome",
        "why": "Deep buttock pain from repeated external hip rotation — heel hooks and wide drop knees. Can refer down the back of the leg.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "glute_med_strain": {
        "base_title": "Gluteus medius strain or weakness",
        "why": "Pain on the side of the hip, often paired with poor single-leg stability. Climbers under-train this.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "gtps": {
        "base_title": "Greater trochanteric pain syndrome / GTPS",
        "why": "Outer hip ache, tender to press on the bony point. Worse with side sleeping or crossed-leg sitting.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "si_joint_dysfunction": {
        "base_title": "SI joint dysfunction",
        "why": "Sharp or dull pain at the dimple above the buttock — driven by asymmetric loading like stems and drop knees.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Hamstring ──────────────────────────────────────────────────────────
    "proximal_hamstring_tendinopathy": {
        "base_title": "Proximal hamstring tendinopathy",
        "why": "Pain at the sit-bone where the hamstrings attach — the classic climbing hamstring injury, almost always from heel hooking.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "biceps_femoris_strain": {
        "base_title": "Biceps femoris (outer hamstring) strain",
        "why": "Sudden sharp pain on the outer back of the thigh during a heavy heel hook — the muscle most loaded by heel hook pulling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "hamstring_midbelly": {
        "base_title": "Hamstring strain — mid-belly",
        "why": "Diffuse aching in the back of the thigh from overload or a sudden eccentric load.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "high_hamstring_tendinopathy": {
        "base_title": "High hamstring tendinopathy / sit-bone irritation",
        "why": "Deep ache at the sit-bone, worse with prolonged sitting and heavy heel hook loading.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Calf ───────────────────────────────────────────────────────────────
    "calf_strain_gastroc": {
        "base_title": "Calf strain — gastrocnemius",
        "why": "Sudden sharp pain in the upper calf from a forceful push-off, often during approach hiking or aggressive smearing.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "plantaris_rupture": {
        "base_title": "Plantaris rupture",
        "why": "Sudden snap behind the knee or upper calf — feels like Achilles rupture but is benign and resolves on its own.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "soleus_strain": {
        "base_title": "Soleus strain",
        "why": "Deep, lower calf ache from chronic loading — common from long approach days or extended smearing on slab.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "calf_overuse_cramp": {
        "base_title": "Calf overuse / cramping",
        "why": "Diffuse soreness from new climbing trip volume — long approaches, multi-pitch, or hours on the wall.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Lower back ─────────────────────────────────────────────────────────
    "nonspecific_lower_back": {
        "base_title": "Non-specific lower back pain",
        "why": "Load-related — driven by volume on steep terrain or sudden training spikes.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "lumbar_strain_facet": {
        "base_title": "Lumbar muscle / facet strain",
        "why": "Awkward loaded positions strain paraspinal muscles and facet joints.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "lumbar_disc": {
        "base_title": "Lumbar disc irritation",
        "why": "Sudden back pain from a loaded movement may involve disc irritation.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "radiculopathy": {
        "base_title": "Nerve root irritation / radiculopathy",
        "why": "Numbness or tingling travelling down the leg warrants evaluation — especially if following a dermatomal pattern.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Ankle / foot ───────────────────────────────────────────────────────
    "ankle_sprain_atfl": {
        "base_title": "Lateral ankle sprain — ATFL",
        "why": "Outer ankle pain after rolling the ankle. Ottawa Rules should be applied to rule out fracture.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "peroneal_strain": {
        "base_title": "Peroneal tendon strain",
        "why": "Pain behind the lateral ankle — worsens with foot eversion and smearing.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "plantar_fasciitis": {
        "base_title": "Plantar fasciitis",
        "why": "Heel pain worst with first steps in the morning — common from aggressive shoe downsizing or high approach mileage.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "achilles_tendinopathy": {
        "base_title": "Achilles tendinopathy",
        "why": "Posterior heel/calf pain — associated with high-mileage hiking on climbing trips.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Chest ──────────────────────────────────────────────────────────────
    "pec_minor_costochondral": {
        "base_title": "Pectoralis minor / costochondral strain",
        "why": "Overuse from high volume pulling, steep climbing, or a sudden dynamic catch.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "pec_major_tear": {
        "base_title": "Pectoralis major strain or tear",
        "why": "Sudden pop or sharp pain during a powerful cross-body or dynamic move warrants evaluation.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "rib_costochondritis": {
        "base_title": "Rib stress / costochondritis",
        "why": "Localised rib pain that worsens with breathing, coughing, or twisting. Can result from repeated rib cage loading on overhangs.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "serratus_intercostal_overuse": {
        "base_title": "Serratus anterior / intercostal overuse",
        "why": "Dull ache along the ribcage from sustained isometric loading on steep terrain.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Neck ───────────────────────────────────────────────────────────────
    "cervical_muscle_strain": {
        "base_title": "Cervical muscle strain",
        "why": "Neck stiffness and pain from sustained overhead positions or awkward body positions on the wall.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "cervical_radiculopathy": {
        "base_title": "Cervical radiculopathy",
        "why": "Numbness or tingling radiating into the arm from a compressed nerve root in the neck — warrants evaluation.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "acute_cervical_disc": {
        "base_title": "Acute cervical disc injury",
        "why": "Sudden high-intensity neck pain may involve disc irritation — imaging recommended.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "cervical_facet": {
        "base_title": "Cervical facet irritation",
        "why": "Gradually worsening neck stiffness from repeated sustained positions — common in roof climbers.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },

    # ── Special / generic ──────────────────────────────────────────────────
    "acute_tissue_injury": {
        "base_title": "Acute tissue injury",
        "why": "High pain with sudden onset can indicate significant tissue damage.",
        "matches_if": [],
        "not_likely_if": [],
        "quick_test": "",
    },
    "overuse_load_spike": {
        "base_title": "Overuse / load spike pattern",
        "why": "Often driven by sudden increases in intensity, volume, or frequency.",
        "matches_if": [],
        "not_likely_if": [],
        "quick_test": "",
    },
}
```

- [ ] **Step 2: Update `tests/test_bucket.py` to test real entries instead of the placeholder**

Replace the entire contents of `tests/test_bucket.py` with:

```python
"""Unit tests for the Bucket dataclass and Bucket.from_id factory."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.triage import Bucket  # noqa: E402


class BucketFactoryTests(unittest.TestCase):
    def test_from_id_no_qualifier_uses_base_title(self):
        b = Bucket.from_id("pulley_a2")
        self.assertEqual(b.id, "pulley_a2")
        self.assertEqual(b.title, "Pulley strain/rupture (A2)")
        self.assertIn("Pain on palm-side", b.why)

    def test_from_id_with_qualifier_appends_em_dash_suffix(self):
        b = Bucket.from_id("pulley_a2", qualifier="most likely")
        self.assertEqual(b.title, "Pulley strain/rupture (A2) — most likely")

    def test_from_id_with_qualifier_possible(self):
        b = Bucket.from_id("tfcc", qualifier="possible")
        self.assertEqual(b.title, "TFCC irritation / tear — possible")

    def test_from_id_unknown_id_raises_keyerror(self):
        with self.assertRaises(KeyError):
            Bucket.from_id("definitely_not_a_real_id")

    def test_all_entries_have_required_keys(self):
        from src.bucket_content import BUCKET_CONTENT
        for bucket_id, entry in BUCKET_CONTENT.items():
            self.assertIn("base_title", entry, f"{bucket_id} missing base_title")
            self.assertIn("why", entry, f"{bucket_id} missing why")
            self.assertIsInstance(entry["base_title"], str, f"{bucket_id} base_title not str")
            self.assertIsInstance(entry["why"], str, f"{bucket_id} why not str")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run tests — expect all five tests pass**

Run: `.venv/bin/python -m unittest tests.test_bucket -v`

Expected: `Ran 5 tests in 0.XXXs OK`.

- [ ] **Step 4: Commit**

```bash
git add src/bucket_content.py tests/test_bucket.py
git commit -m "Bootstrap BUCKET_CONTENT with all 60 bucket IDs (titles + why only)"
```

---

## Task 3 — Refactor `bucket_possibilities()` to emit Bucket instances

**Files:**
- Modify: `src/triage.py` lines 855–1028 (the entire `bucket_possibilities()` function)

- [ ] **Step 1: Write a characterization test for the new bucket shape**

Append to `tests/test_bucket.py`, before the `if __name__ == "__main__":` block:

```python
class BucketPossibilitiesShapeTests(unittest.TestCase):
    """Verify bucket_possibilities() emits Bucket instances with stable IDs."""

    def _make_intake(self, region: str, mechanism: str = "Hard crimp",
                     onset: str = "Sudden", severity: int = 5):
        from src.triage import Intake
        return Intake(
            region=region, onset=onset, pain_type="Sharp",
            severity=severity, swelling="No", bruising="No",
            numbness="No", weakness="No", instability="No",
            mechanism=mechanism, free_text="",
        )

    def test_finger_crimp_returns_bucket_instances(self):
        from src.triage import bucket_possibilities, Bucket
        buckets = bucket_possibilities(self._make_intake("Finger", "Hard crimp"))
        self.assertGreater(len(buckets), 0)
        for b in buckets:
            self.assertIsInstance(b, Bucket)
            self.assertTrue(b.id, f"Bucket {b.title} has empty id")

    def test_finger_crimp_surfaces_pulley_a2(self):
        from src.triage import bucket_possibilities
        buckets = bucket_possibilities(self._make_intake("Finger", "Hard crimp"))
        ids = [b.id for b in buckets]
        self.assertIn("pulley_a2", ids)

    def test_heel_hook_knee_surfaces_lcl(self):
        from src.triage import bucket_possibilities
        buckets = bucket_possibilities(self._make_intake("Knee", "Heel hook"))
        ids = [b.id for b in buckets]
        self.assertIn("lcl_heel_hook", ids)

    def test_severe_sudden_prepends_acute_tissue_injury(self):
        from src.triage import bucket_possibilities
        intake = self._make_intake("Finger", "Hard crimp", onset="Sudden", severity=8)
        buckets = bucket_possibilities(intake)
        self.assertEqual(buckets[0].id, "acute_tissue_injury")
```

- [ ] **Step 2: Run the new tests — expect them to fail (bucket_possibilities still returns tuples)**

Run: `.venv/bin/python -m unittest tests.test_bucket.BucketPossibilitiesShapeTests -v`

Expected: Failures because `bucket_possibilities` returns `List[Tuple[str, str]]`, not `List[Bucket]`.

- [ ] **Step 3: Replace `bucket_possibilities()` in `src/triage.py`**

In `src/triage.py`, replace the entire function (line 857 `def bucket_possibilities` through line 1028 `return out[:4]`) with the following exact text. The signature changes from `-> List[Tuple[str, str]]` to `-> List[Bucket]`, and every `out.append(("Title (qualifier)", "why..."))` becomes `out.append(Bucket.from_id("stable_id", qualifier="..."))`. Keep the docstring + comments intact.

```python
def bucket_possibilities(i: Intake) -> List[Bucket]:
    """Heuristic likely patterns given region + mechanism. Not a diagnosis."""
    region = i.region.lower()
    out: List[Bucket] = []

    if "finger" in region:
        text_l = i.free_text.lower()
        # Pulley is the most common climbing finger injury — surface it for any
        # mechanism that loads the finger flexors, OR if the user explicitly
        # mentions pulleys in free-text. The previous gate was too narrow.
        pulley_signals = (
            i.mechanism in {"Hard crimp", "Dynamic catch", "Pocket", "High volume pulling", "Steep climbing/board"}
            or "pulley" in text_l
            or "a2" in text_l
            or "a4" in text_l
        )
        if pulley_signals:
            out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
        if i.mechanism in {"Pocket", "Asymmetric hold"}:
            out.append(Bucket.from_id("lumbrical_tear", qualifier="possible"))
        out.append(Bucket.from_id("flexor_tenosynovitis", qualifier="possible"))
        out.append(Bucket.from_id("collateral_ligament_finger", qualifier="possible"))
        if "can't straighten" in text_l or "pip" in text_l:
            out.append(Bucket.from_id("boutonniere", qualifier="urgent"))

    elif "wrist" in region:
        if i.mechanism in {"Hard crimp", "High volume pulling", "Dynamic catch"}:
            out.append(Bucket.from_id("wrist_flexor_tendinopathy", qualifier="common"))
        if i.onset == "Sudden" or i.mechanism in {"Fall", "Dynamic catch"}:
            out.append(Bucket.from_id("scaphoid_fracture", qualifier="must exclude"))
        out.append(Bucket.from_id("tfcc", qualifier="possible"))
        out.append(Bucket.from_id("de_quervain", qualifier="possible"))

    elif "elbow" in region:
        if i.mechanism in {"High volume pulling", "Steep climbing/board", "Campusing"}:
            out.append(Bucket.from_id("medial_epicondylitis", qualifier="most likely"))
        out.append(Bucket.from_id("lateral_epicondylitis", qualifier="possible"))
        if i.numbness == "Yes":
            out.append(Bucket.from_id("cubital_tunnel", qualifier="possible"))
        if i.mechanism in {"Hard lock-off", "Campusing", "Dynamic catch"} and i.onset == "Sudden":
            out.append(Bucket.from_id("distal_biceps", qualifier="possible"))

    elif "shoulder" in region:
        out.append(Bucket.from_id("rotator_cuff_impingement", qualifier="most common"))
        if i.mechanism in {"Dynamic catch", "Dyno", "Fall"}:
            out.append(Bucket.from_id("slap_tear", qualifier="possible"))
        if i.instability == "Yes":
            out.append(Bucket.from_id("shoulder_instability_bankart", qualifier="possible"))
        if i.onset == "Sudden" and i.mechanism in {"Fall", "Compression"}:
            out.append(Bucket.from_id("ac_joint", qualifier="possible"))

    elif "knee" in region:
        if i.mechanism in {"Heel hook"}:
            out.append(Bucket.from_id("lcl_heel_hook", qualifier="most likely"))
        if i.mechanism in {"Drop knee"}:
            out.append(Bucket.from_id("it_band", qualifier="possible"))
            out.append(Bucket.from_id("meniscus_tear", qualifier="possible"))
        if i.mechanism in {"High step / rockover", "High volume climbing"}:
            out.append(Bucket.from_id("patellar_tendinopathy", qualifier="possible"))
        if i.onset == "Sudden" and i.severity >= 6:
            out.append(Bucket.from_id("acute_knee_ligament_meniscus", qualifier="consider evaluation"))

    elif "hip" in region:
        if i.mechanism in {"High step / rockover", "High volume climbing"}:
            out.append(Bucket.from_id("hip_flexor_strain", qualifier="common"))
        out.append(Bucket.from_id("hip_impingement", qualifier="possible"))
        if i.mechanism in {"Stemming / bridging"}:
            out.append(Bucket.from_id("adductor_strain", qualifier="possible"))
        if i.onset == "Sudden":
            out.append(Bucket.from_id("hip_labral", qualifier="possible"))

    elif "tricep" in region:
        if i.mechanism in {"Hard lock-off", "Campusing", "Steep climbing/board"}:
            out.append(Bucket.from_id("triceps_tendinopathy_elbow", qualifier="most common"))
        if i.onset == "Sudden" and i.mechanism in {"Hard lock-off", "Dynamic catch", "Campusing"}:
            out.append(Bucket.from_id("long_head_triceps_strain", qualifier="likely"))
        out.append(Bucket.from_id("posterior_elbow_impingement", qualifier="possible"))
        out.append(Bucket.from_id("triceps_overuse_doms", qualifier="common"))

    elif "upper back" in region or "trap" in region or "rhomboid" in region:
        out.append(Bucket.from_id("rhomboid_midtrap_strain", qualifier="most common"))
        out.append(Bucket.from_id("upper_trap_overactivity", qualifier="common"))
        if i.mechanism in {"Hard lock-off", "High volume pulling", "Steep climbing/board"}:
            out.append(Bucket.from_id("scapular_dyskinesis", qualifier="possible"))
        out.append(Bucket.from_id("levator_scapulae_strain", qualifier="possible"))

    elif "lat" in region or "latissimus" in region:
        if i.onset == "Sudden" and i.mechanism in {"Dynamic catch", "Dyno", "Hard lock-off"}:
            out.append(Bucket.from_id("lat_strain", qualifier="most likely"))
        out.append(Bucket.from_id("teres_major_strain", qualifier="possible"))
        out.append(Bucket.from_id("lat_tendinopathy_humerus", qualifier="possible"))
        out.append(Bucket.from_id("posterior_chain_overuse", qualifier="common"))

    elif "glute" in region or "buttock" in region:
        if i.mechanism in {"Heel hook", "Stemming / bridging"}:
            out.append(Bucket.from_id("piriformis_deep_gluteal", qualifier="possible"))
        out.append(Bucket.from_id("glute_med_strain", qualifier="common"))
        out.append(Bucket.from_id("gtps", qualifier="possible"))
        if i.mechanism in {"Stemming / bridging", "High step / rockover"}:
            out.append(Bucket.from_id("si_joint_dysfunction", qualifier="possible"))

    elif "hamstring" in region:
        if i.mechanism in {"Heel hook"}:
            out.append(Bucket.from_id("proximal_hamstring_tendinopathy", qualifier="most likely"))
        if i.onset == "Sudden" and i.mechanism in {"Heel hook"}:
            out.append(Bucket.from_id("biceps_femoris_strain", qualifier="likely"))
        out.append(Bucket.from_id("hamstring_midbelly", qualifier="possible"))
        out.append(Bucket.from_id("high_hamstring_tendinopathy", qualifier="possible"))

    elif "calf" in region or "calves" in region or "gastroc" in region or "soleus" in region:
        if i.onset == "Sudden":
            out.append(Bucket.from_id("calf_strain_gastroc", qualifier="most likely"))
            out.append(Bucket.from_id("plantaris_rupture", qualifier="possible"))
        out.append(Bucket.from_id("soleus_strain", qualifier="possible"))
        out.append(Bucket.from_id("calf_overuse_cramp", qualifier="common"))

    elif "lower back" in region or "back" in region:
        out.append(Bucket.from_id("nonspecific_lower_back", qualifier="most common"))
        if i.mechanism in {"Heel hook", "High step / rockover", "Stemming / bridging"}:
            out.append(Bucket.from_id("lumbar_strain_facet", qualifier="possible"))
        if i.onset == "Sudden":
            out.append(Bucket.from_id("lumbar_disc", qualifier="possible"))
        if i.numbness == "Yes":
            out.append(Bucket.from_id("radiculopathy", qualifier="possible"))

    elif "ankle" in region or "foot" in region:
        text_l = i.free_text.lower()
        if i.onset == "Sudden":
            out.append(Bucket.from_id("ankle_sprain_atfl", qualifier="most common"))
        out.append(Bucket.from_id("peroneal_strain", qualifier="possible"))
        # Plantar fasciitis — surface from mechanism OR from common free-text
        # patterns. Climbers often describe morning heel pain or pain on the
        # bottom of the foot regardless of which mechanism they tag.
        plantar_fasciitis_signals = (
            i.mechanism in {"Small holds", "Tight shoes", "Approach"}
            or "morning" in text_l
            or "first step" in text_l
            or "bottom of" in text_l and "foot" in text_l
            or "heel pain" in text_l
            or "plantar" in text_l
        )
        if plantar_fasciitis_signals:
            out.append(Bucket.from_id("plantar_fasciitis", qualifier="possible"))
        if i.mechanism in {"Approach", "High volume hiking"} or "approach" in text_l or "hiking" in text_l:
            out.append(Bucket.from_id("achilles_tendinopathy", qualifier="possible"))

    elif "chest" in region:
        out.append(Bucket.from_id("pec_minor_costochondral", qualifier="common"))
        if i.onset == "Sudden" and i.mechanism in {"Dynamic / jumping move", "Powerful move / slap"}:
            out.append(Bucket.from_id("pec_major_tear", qualifier="consider evaluation"))
        if _keyword_affirmed(i.free_text.lower(), ["rib", "ribs", "breath", "breathe"]):
            out.append(Bucket.from_id("rib_costochondritis", qualifier="possible"))
        if i.onset == "Gradual":
            out.append(Bucket.from_id("serratus_intercostal_overuse", qualifier="possible"))

    elif "neck" in region or "cervical" in region:
        out.append(Bucket.from_id("cervical_muscle_strain", qualifier="common"))
        if i.numbness == "Yes":
            out.append(Bucket.from_id("cervical_radiculopathy", qualifier="possible"))
        if i.severity >= 6 and i.onset == "Sudden":
            out.append(Bucket.from_id("acute_cervical_disc", qualifier="consider evaluation"))
        if i.onset == "Gradual":
            out.append(Bucket.from_id("cervical_facet", qualifier="possible"))

    else:
        out.append(Bucket.from_id("overuse_load_spike", qualifier="common"))

    # If symptoms are severe and sudden, surface a higher-concern bucket first
    if i.onset == "Sudden" and i.severity >= 7:
        out.insert(0, Bucket.from_id("acute_tissue_injury", qualifier="consider evaluation"))

    return out[:4]
```

- [ ] **Step 4: Update `format_differentials_for_tone()` for the new Bucket type**

This is the only other consumer of `bucket_possibilities()` output that destructures tuples. In `src/triage.py`, replace lines 1279–1309 (the entire `format_differentials_for_tone` function) with:

```python
def format_differentials_for_tone(buckets: List[Bucket], tone: str) -> Dict[str, object]:
    """Return a tone-gated differentials block.

    Mild: top 1, common name, lead-in copy.
    Moderate: top 2.
    Severe: top 3, clinical names acceptable.
    Emergency: empty list, no differentials.
    """
    try:
        if tone == TONE_EMERGENCY:
            return {"lead": "", "items": []}
        if tone == TONE_REASSURING:
            top = buckets[:1]
            return {
                "lead": "Based on what you described this sounds like a common climbing injury.",
                "items": [{"title": b.title, "why": b.why} for b in top],
            }
        if tone == TONE_INFORMATIVE:
            top = buckets[:2]
            return {
                "lead": "Some possibilities worth discussing with a provider:",
                "items": [{"title": b.title, "why": b.why} for b in top],
            }
        # URGENT
        top = buckets[:3]
        return {
            "lead": "Injury patterns consistent with your description:",
            "items": [{"title": b.title, "why": b.why} for b in top],
        }
    except Exception:
        return {"lead": "", "items": []}
```

The shape of the returned dict is unchanged — items are still `{"title": str, "why": str}` — so callers (including any pdf/email rendering) keep working without further edits. The only changes are the parameter type hint (`List[Tuple[str, str]]` → `List[Bucket]`) and replacing tuple destructuring with attribute access.

After the change, run a quick sanity check:

```bash
.venv/bin/python -c "
from src.triage import Intake, bucket_possibilities, format_differentials_for_tone, TONE_INFORMATIVE
i = Intake(region='Finger', onset='Sudden', pain_type='Sharp', severity=5,
           swelling='No', bruising='No', numbness='No', weakness='No',
           instability='No', mechanism='Hard crimp', free_text='')
buckets = bucket_possibilities(i)
print(format_differentials_for_tone(buckets, TONE_INFORMATIVE))
"
```

Expected: prints a dict with `lead` and `items` keys; items are dicts with `title` and `why`; no AttributeError.

Also confirm no other callers destructure buckets as tuples:

```bash
grep -rn "for [a-z_]*, [a-z_]* in buckets\|for [a-z_]*, [a-z_]* in result.buckets\|bucket_possibilities" src/ main.py tests/
```

If this returns matches beyond `format_differentials_for_tone` and the canonical call site in `main.py`, update those too using the same attribute-access pattern.

- [ ] **Step 5: Update the API serialization in `main.py`**

In `main.py`, find the line currently reading:

```python
"buckets": [{"title": t, "why": w} for t, w in buckets],
```

(should be around `main.py:649` inside the `triage()` endpoint).

Replace with:

```python
"buckets": [asdict(b) for b in buckets],
```

`asdict` is already imported at `main.py:90` (`from dataclasses import asdict`). Confirm with:

```bash
grep -n "from dataclasses" main.py
```

If `asdict` is not imported, change the import line to:

```python
from dataclasses import asdict
```

- [ ] **Step 6: Run the new shape tests — expect pass**

Run: `.venv/bin/python -m unittest tests.test_bucket.BucketPossibilitiesShapeTests -v`

Expected: `Ran 4 tests in 0.XXXs OK`.

- [ ] **Step 7: Run the full Python test suite for regressions**

Run: `.venv/bin/python -m unittest tests.test_bucket tests.test_triage_calibration -v`

Expected: `Ran 59 tests ... OK` (5 from test_bucket + 4 new shape tests + 50 calibration). If any calibration test fails, the most likely culprit is `format_differentials_for_tone` not handling the new Bucket type — return to Step 4 and fix tuple destructuring inside that function.

- [ ] **Step 8: Run scenarios for end-to-end regression**

Run: `.venv/bin/python tests/run_all_scenarios.py`

Expected: `102/102 PASS` (matches the baseline noted in MORNING_REPORT.md).

- [ ] **Step 9: Smoke-test the API serialization**

Run:

```bash
.venv/bin/python -c "
from dataclasses import asdict
from src.triage import Intake, bucket_possibilities
i = Intake(region='Finger', onset='Sudden', pain_type='Sharp', severity=5,
           swelling='No', bruising='No', numbness='No', weakness='No',
           instability='No', mechanism='Hard crimp', free_text='')
buckets = bucket_possibilities(i)
for b in buckets:
    print(asdict(b))
"
```

Expected: prints dicts containing keys `id`, `title`, `why`, `matches_if`, `not_likely_if`, `quick_test` for each bucket. `matches_if` should be `[]` (Phase 2 content is empty for now).

- [ ] **Step 10: Commit**

```bash
git add src/triage.py main.py tests/test_bucket.py
git commit -m "Refactor bucket_possibilities to emit Bucket dataclass; API now returns matches_if/not_likely_if/quick_test fields"
```

---

## Task 4 — Coverage test for `BUCKET_CONTENT`

**Goal:** Guarantee that every bucket the triage engine can possibly emit has a content entry, so we never silently render an empty/broken card.

**Files:**
- Create: `tests/test_bucket_content.py`

- [ ] **Step 1: Write the coverage test**

Create `tests/test_bucket_content.py` with the following content:

```python
"""Coverage test: every bucket that bucket_possibilities() can emit must
have a corresponding entry in BUCKET_CONTENT. Sweeps a representative
intake matrix across all body regions and mechanisms.

Also asserts content-quality bounds for fully-authored buckets (Phase 1:
finger region) — at least 3 matches_if bullets, non-empty quick_test, etc.
"""
from __future__ import annotations

import os
import sys
import unittest
from itertools import product

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.triage import Intake, bucket_possibilities  # noqa: E402
from src.bucket_content import BUCKET_CONTENT  # noqa: E402

REGIONS = [
    "Finger", "Wrist", "Elbow", "Shoulder", "Knee", "Hip", "Tricep",
    "Upper back", "Lat", "Glute", "Hamstring", "Calf", "Lower back",
    "Ankle", "Foot", "Chest", "Neck",
]
MECHANISMS = [
    "Hard crimp", "Dynamic catch", "Pocket", "High volume pulling",
    "Steep climbing/board", "Asymmetric hold", "Fall", "Hard lock-off",
    "Campusing", "Heel hook", "Drop knee", "High step / rockover",
    "Stemming / bridging", "Dyno", "Compression", "Dynamic / jumping move",
    "Powerful move / slap", "Approach", "High volume hiking",
    "Small holds", "Tight shoes", "High volume climbing",
]
ONSETS = ["Sudden", "Gradual"]
SEVERITIES = [3, 7]  # below + at-or-above the acute_tissue_injury threshold


def _intake(region, mechanism, onset, severity, **overrides):
    base = dict(
        region=region, onset=onset, pain_type="Sharp", severity=severity,
        swelling="No", bruising="No", numbness="No", weakness="No",
        instability="No", mechanism=mechanism, free_text="",
    )
    base.update(overrides)
    return Intake(**base)


class BucketContentCoverageTests(unittest.TestCase):
    def test_every_emitted_bucket_has_content(self):
        missing = set()
        for region, mech, onset, sev in product(REGIONS, MECHANISMS, ONSETS, SEVERITIES):
            for b in bucket_possibilities(_intake(region, mech, onset, sev)):
                if b.id not in BUCKET_CONTENT:
                    missing.add(b.id)
        self.assertFalse(
            missing,
            f"Bucket IDs emitted by triage but missing from BUCKET_CONTENT: {sorted(missing)}",
        )

    def test_numbness_branches_emit_known_ids(self):
        # numbness="Yes" triggers branches in elbow, lower back, neck
        for region in ("Elbow", "Lower back", "Neck"):
            intake = _intake(region, "Hard crimp", "Sudden", 5, numbness="Yes")
            for b in bucket_possibilities(intake):
                self.assertIn(b.id, BUCKET_CONTENT,
                              f"{region} numbness=Yes emitted unknown id: {b.id}")

    def test_instability_branch_emits_known_id(self):
        intake = _intake("Shoulder", "Hard crimp", "Sudden", 5, instability="Yes")
        for b in bucket_possibilities(intake):
            self.assertIn(b.id, BUCKET_CONTENT)

    def test_free_text_pulley_signal_emits_known_id(self):
        intake = _intake("Finger", "Approach", "Gradual", 3, free_text="I think it's my a2 pulley")
        ids = [b.id for b in bucket_possibilities(intake)]
        self.assertIn("pulley_a2", ids)

    def test_free_text_boutonniere_signal_emits_known_id(self):
        intake = _intake("Finger", "Hard crimp", "Sudden", 6, free_text="my pip can't straighten")
        ids = [b.id for b in bucket_possibilities(intake)]
        self.assertIn("boutonniere", ids)

    def test_all_content_entries_have_required_shape(self):
        """Every entry in BUCKET_CONTENT must have all six fields, correctly typed."""
        for bucket_id, entry in BUCKET_CONTENT.items():
            self.assertIsInstance(entry.get("base_title"), str, f"{bucket_id}: base_title")
            self.assertIsInstance(entry.get("why"), str, f"{bucket_id}: why")
            self.assertIsInstance(entry.get("matches_if", []), list, f"{bucket_id}: matches_if")
            self.assertIsInstance(entry.get("not_likely_if", []), list, f"{bucket_id}: not_likely_if")
            self.assertIsInstance(entry.get("quick_test", ""), str, f"{bucket_id}: quick_test")


class FingerContentQualityTests(unittest.TestCase):
    """Phase 1 ships full content for the finger region. Enforce content bounds
    on those entries specifically; Phase 2 will extend this list."""

    FINGER_IDS_WITH_FULL_CONTENT = (
        "pulley_a2",
        "lumbrical_tear",
        "flexor_tenosynovitis",
        "collateral_ligament_finger",
        "boutonniere",
        "acute_tissue_injury",
        "overuse_load_spike",
    )

    def test_finger_buckets_have_at_least_three_matches_if(self):
        for bid in self.FINGER_IDS_WITH_FULL_CONTENT:
            entry = BUCKET_CONTENT[bid]
            self.assertGreaterEqual(
                len(entry["matches_if"]), 3,
                f"{bid}: matches_if should have at least 3 bullets, has {len(entry['matches_if'])}",
            )

    def test_finger_buckets_have_at_least_one_not_likely_if(self):
        for bid in self.FINGER_IDS_WITH_FULL_CONTENT:
            entry = BUCKET_CONTENT[bid]
            self.assertGreaterEqual(
                len(entry["not_likely_if"]), 1,
                f"{bid}: not_likely_if should have at least 1 bullet",
            )

    def test_finger_buckets_have_quick_test(self):
        for bid in self.FINGER_IDS_WITH_FULL_CONTENT:
            entry = BUCKET_CONTENT[bid]
            self.assertTrue(
                entry["quick_test"].strip(),
                f"{bid}: quick_test should be non-empty",
            )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run coverage tests — expect coverage pass, content-quality fail**

Run: `.venv/bin/python -m unittest tests.test_bucket_content -v`

Expected:
- `BucketContentCoverageTests` — all pass (every emitted bucket has an entry, because Task 2 enumerated everything)
- `FingerContentQualityTests` — **FAIL** because Phase 1 finger content has not been authored yet (empty lists). This is correct — Task 5 fills the content and turns these tests green.

- [ ] **Step 3: Commit**

```bash
git add tests/test_bucket_content.py
git commit -m "Add bucket-content coverage test + finger content-quality bounds (Phase 1 content TODO will turn quality tests green)"
```

---

## Task 5 — Author finger-region content (turns FingerContentQualityTests green)

**Files:**
- Modify: `src/bucket_content.py` — replace the empty `matches_if`/`not_likely_if`/`quick_test` for the 7 finger-region IDs

- [ ] **Step 1: Replace the `pulley_a2` entry**

In `src/bucket_content.py`, locate `"pulley_a2": { ... }` and replace the entire entry with:

```python
    "pulley_a2": {
        "base_title": "Pulley strain/rupture (A2)",
        "why": "Pain on palm-side at base of finger, worse with crimping. May have felt a pop.",
        "matches_if": [
            "Sharp pain at the palm-side base of the finger, where the finger meets the palm",
            "You felt or heard a pop at the moment of injury",
            "Worse with full-crimp grip, better with open-hand",
            "Tender to press directly on the base of the proximal phalanx (just above the palm)",
            "Pain is worse on small holds, edges, and hard crimps",
        ],
        "not_likely_if": [
            "Pain is on the side of the finger joint, not on the palm side",
            "Diffuse swelling along the whole finger rather than localized at the base",
            "Pain is mid-finger rather than at the base — consider an A4 pulley instead",
        ],
        "quick_test": "Press firmly at the base of the proximal phalanx on the palm side. Sharp, localized pain in that exact spot points to pulley involvement.",
    },
```

- [ ] **Step 2: Replace the `lumbrical_tear` entry**

```python
    "lumbrical_tear": {
        "base_title": "Lumbrical tear",
        "why": "Deep palm pain that worsens when other fingers are extended — distinctive pattern.",
        "matches_if": [
            "Deep pain in the palm itself rather than along a specific finger",
            "Pain worsens when the OTHER fingers are extended while pulling on a pocket",
            "Often started while pulling on monos or pockets",
            "Pain may feel like a tendon 'catches' on certain hold shapes",
        ],
        "not_likely_if": [
            "Pain is localized to one specific finger rather than in the palm body",
            "Pain is the same on all hold types and not specifically worse on pockets",
        ],
        "quick_test": "Hold a one-finger pocket position and extend the adjacent fingers while pulling. Sharp palm pain that intensifies in that specific configuration is the lumbrical pattern.",
    },
```

- [ ] **Step 3: Replace the `flexor_tenosynovitis` entry**

```python
    "flexor_tenosynovitis": {
        "base_title": "Flexor tendon tenosynovitis",
        "why": "Diffuse swelling along entire finger, worse after rest then with prolonged activity.",
        "matches_if": [
            "Diffuse swelling along the entire length of the finger",
            "Stiffness is worst in the morning or after rest, eases briefly with movement",
            "Pain returns after prolonged activity rather than during a single move",
            "Tenderness along the whole flexor tendon path, not a single point",
            "Gradual onset rather than a discrete pop or moment",
        ],
        "not_likely_if": [
            "Pain is sharply localized to one specific spot rather than diffuse",
            "You felt a clear pop or tear at a specific moment",
            "Pain is on the side of the joint rather than along the flexor (palm) side",
        ],
        "quick_test": "Run a fingertip along the palm-side length of the affected finger. Diffuse tenderness along the whole tendon path — rather than one sharp spot — suggests tenosynovitis.",
    },
```

- [ ] **Step 4: Replace the `collateral_ligament_finger` entry**

```python
    "collateral_ligament_finger": {
        "base_title": "Collateral ligament or joint capsule irritation",
        "why": "Side-of-joint pain or persistent swelling at a finger joint.",
        "matches_if": [
            "Pain at the SIDE of a finger joint, not on the palm side",
            "Persistent swelling localized at one joint",
            "Joint may feel loose or unstable with sideways stress",
            "Often follows a finger getting caught, yanked, or jammed sideways",
            "Worse on sidepulls and gastons that load the side of the finger",
        ],
        "not_likely_if": [
            "Pain is on the palm side of the finger — consider a pulley injury instead",
            "Pain is at the base of the finger where it meets the palm rather than at a joint side",
        ],
        "quick_test": "Gently stress the affected joint sideways. Pain or laxity at the joint margin — distinct from palm-side pulley pain — points to collateral involvement.",
    },
```

- [ ] **Step 5: Replace the `boutonniere` entry**

```python
    "boutonniere": {
        "base_title": "Boutonnière deformity / central slip rupture",
        "why": "PIP that cannot be extended to neutral — requires splinting within 72 hours.",
        "matches_if": [
            "You cannot fully straighten (extend) the middle joint of the finger to neutral",
            "The middle joint stays bent while the fingertip joint may hyperextend slightly",
            "Recent finger trauma — usually a jam, hyperflexion, or laceration",
            "Pain on the back (top) of the middle finger joint",
        ],
        "not_likely_if": [
            "You can still straighten the finger fully without help",
            "Pain is on the palm side rather than the back of the joint",
            "Onset is gradual rather than after a discrete incident",
        ],
        "quick_test": "Try to straighten the PIP (middle) joint actively against gentle resistance on the back of the finger. If you cannot bring it to neutral, this is urgent — splint within 72 hours and see a hand specialist.",
    },
```

- [ ] **Step 6: Replace the `acute_tissue_injury` entry**

```python
    "acute_tissue_injury": {
        "base_title": "Acute tissue injury",
        "why": "High pain with sudden onset can indicate significant tissue damage.",
        "matches_if": [
            "Sudden onset of high pain (roughly 7/10 or higher)",
            "A specific incident triggered the pain — fall, dynamic move, pop, or snap",
            "Pain present at rest, not only during activity",
            "Swelling, bruising, or visible deformity may be present",
            "Functional loss — cannot grip, weight-bear, or move the area normally",
        ],
        "not_likely_if": [
            "Pain came on gradually over days or weeks rather than at one moment",
            "Pain is mild and only present during activity",
            "No specific incident or moment when pain started",
        ],
        "quick_test": "Assess pain honestly at rest. If you have sharp pain greater than 7/10 sitting still — especially without a recent specific incident to explain it — something significant may be going on. Get evaluated rather than wait it out.",
    },
```

- [ ] **Step 7: Replace the `overuse_load_spike` entry**

```python
    "overuse_load_spike": {
        "base_title": "Overuse / load spike pattern",
        "why": "Often driven by sudden increases in intensity, volume, or frequency.",
        "matches_if": [
            "Pain came on gradually over days or weeks rather than at one moment",
            "Recent training spike — more intensity, more volume, or more sessions per week",
            "New hold type, board, or climbing style introduced in the last few weeks",
            "Pain warms up and may ease early in a session, then returns afterwards",
            "No specific traumatic incident",
        ],
        "not_likely_if": [
            "A specific moment or incident triggered the pain",
            "Sudden severe pain with no preceding buildup",
            "Constant pain unrelated to climbing or activity load",
        ],
        "quick_test": "Look at your training log over the last 4 weeks. If volume, intensity, or sessions-per-week jumped by more than about 20% recently, the pattern fits load management rather than a structural injury.",
    },
```

- [ ] **Step 8: Run the content tests — expect all pass**

Run: `.venv/bin/python -m unittest tests.test_bucket_content -v`

Expected: All `FingerContentQualityTests` pass — `Ran N tests ... OK`.

- [ ] **Step 9: Run the full Python test suite**

Run: `.venv/bin/python -m unittest tests.test_bucket tests.test_bucket_content tests.test_triage_calibration -v`

Expected: All pass.

- [ ] **Step 10: Run scenarios for end-to-end regression**

Run: `.venv/bin/python tests/run_all_scenarios.py`

Expected: `102/102 PASS`.

- [ ] **Step 11: Commit**

```bash
git add src/bucket_content.py
git commit -m "Author Phase 1 finger-region bucket content (matches_if/not_likely_if/quick_test)"
```

---

## Task 6 — Frontend tap-to-expand cards

**Files:**
- Modify: `frontend/src/components/TriageTab.jsx` — the "What it could be" section (currently around line 465–481)

- [ ] **Step 1: Read the current card render to understand surrounding context**

```bash
sed -n '1,30p' frontend/src/components/TriageTab.jsx
sed -n '460,485p' frontend/src/components/TriageTab.jsx
```

Note the existing imports from `lucide-react` so we know which icons are already loaded — we need to add `ChevronDown`, `CheckCircle2`, `XCircle`, and `Hand` if they aren't.

- [ ] **Step 2: Add the new lucide-react imports**

In `frontend/src/components/TriageTab.jsx`, locate the existing `import { ... } from 'lucide-react'` line near the top of the file. Add `ChevronDown`, `CheckCircle2`, `XCircle`, and `Hand` to the import list (only add icons that are not already imported — check the existing list first):

```javascript
// Example — your actual list may differ; just add the four icons
import { /* existing icons, */ ChevronDown, CheckCircle2, XCircle, Hand } from 'lucide-react'
```

- [ ] **Step 3: Add expanded-state tracking inside the TriageTab component**

Find the existing `useState` declarations near the top of the `TriageTab` function (where `pdfLoading`, `showUpgrade`, etc. are declared). Add this line below them:

```javascript
const [expandedBuckets, setExpandedBuckets] = useState(() => new Set())
```

Add a helper `toggleBucket` below the other handlers in the same function:

```javascript
const toggleBucket = (idx) => {
  setExpandedBuckets((prev) => {
    const next = new Set(prev)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    return next
  })
}
```

- [ ] **Step 4: Replace the existing card render block**

Locate the existing render block (around line 465–481):

```jsx
<div>
  <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">What it could be</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {result.buckets.map((b, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.07 }}
        className="card"
      >
        <p className="text-sm font-semibold text-text mb-1">{b.title}</p>
        <p className="text-xs text-muted">{b.why}</p>
      </motion.div>
    ))}
  </div>
</div>
```

Replace it with:

```jsx
<div>
  <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">What it could be</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {result.buckets.map((b, i) => {
      const hasDetail = (b.matches_if && b.matches_if.length > 0)
        || (b.not_likely_if && b.not_likely_if.length > 0)
        || (b.quick_test && b.quick_test.trim().length > 0)
      const isExpanded = expandedBuckets.has(i)
      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className={`card ${hasDetail ? 'cursor-pointer hover:border-accent/40 transition-colors' : ''}`}
          onClick={hasDetail ? () => toggleBucket(i) : undefined}
          role={hasDetail ? 'button' : undefined}
          tabIndex={hasDetail ? 0 : undefined}
          onKeyDown={hasDetail ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggleBucket(i)
            }
          } : undefined}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm font-semibold text-text mb-1">{b.title}</p>
              <p className="text-xs text-muted">{b.why}</p>
            </div>
            {hasDetail && (
              <ChevronDown
                size={16}
                className={`text-muted shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            )}
          </div>
          <AnimatePresence initial={false}>
            {hasDetail && isExpanded && (
              <motion.div
                key="detail"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 border-t border-outline space-y-3">
                  {b.matches_if && b.matches_if.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-accent font-semibold mb-1.5">
                        <CheckCircle2 size={11} /> Matches if
                      </div>
                      <ul className="space-y-1">
                        {b.matches_if.map((m, mi) => (
                          <li key={mi} className="text-xs text-muted leading-relaxed flex items-start gap-1.5">
                            <span className="text-accent mt-0.5">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {b.not_likely_if && b.not_likely_if.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted font-semibold mb-1.5">
                        <XCircle size={11} /> Probably not this if
                      </div>
                      <ul className="space-y-1">
                        {b.not_likely_if.map((m, mi) => (
                          <li key={mi} className="text-xs text-muted/80 leading-relaxed flex items-start gap-1.5">
                            <span className="text-muted/60 mt-0.5">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {b.quick_test && b.quick_test.trim().length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-accent3 font-semibold mb-1.5">
                        <Hand size={11} /> Quick self-check
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{b.quick_test}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )
    })}
  </div>
</div>
```

- [ ] **Step 5: Verify AnimatePresence is imported**

Search for the existing framer-motion import:

```bash
grep -n "framer-motion" frontend/src/components/TriageTab.jsx
```

Confirm `AnimatePresence` is in the import list. If only `motion` is imported, change the import to include both:

```javascript
import { motion, AnimatePresence } from 'framer-motion'
```

- [ ] **Step 6: Run the frontend build**

```bash
cd frontend && npm run build
```

Expected: Build completes without errors. Any import/syntax mistakes surface here.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/TriageTab.jsx
git commit -m "Triage cards: tap-to-expand with matches_if/not_likely_if/quick_test"
```

---

## Task 7 — Manual verification on dev server

**Goal:** Confirm the end-to-end UX works in a real browser, especially on a mobile breakpoint where the screenshot was taken.

- [ ] **Step 1: Start the backend in one terminal**

```bash
.venv/bin/uvicorn main:app --reload
```

Expected: server up on `http://localhost:8000`, no startup errors.

- [ ] **Step 2: Start the frontend dev server in another terminal**

```bash
cd frontend && npm run dev
```

Expected: Vite serves on `http://localhost:5173`.

- [ ] **Step 3: Run a finger triage end-to-end**

Open `http://localhost:5173`. Walk through the triage wizard with these inputs:
- Region: Finger
- Onset: Sudden
- Pain type: Sharp
- Severity: 7
- Mechanism: Hard crimp
- Free text: leave blank

Submit and confirm:
- ✅ "What it could be" section renders
- ✅ Each finger bucket card has a small chevron icon
- ✅ Tapping a card expands it inline; chevron rotates 180°
- ✅ Expanded view shows the three sections: Matches if (green CheckCircle), Probably not this if (XCircle), Quick self-check (Hand)
- ✅ Tapping again collapses the card
- ✅ Bullets read cleanly and match the content from Task 5

- [ ] **Step 4: Run a non-finger triage**

Walk through the wizard again with:
- Region: Knee
- Mechanism: Heel hook

Confirm:
- ✅ Cards render with title + why
- ✅ No chevron is shown (content is empty in Phase 1)
- ✅ Cards are non-interactive (no hover state, tapping does nothing) — same look as today

- [ ] **Step 5: Test mobile breakpoint**

Open the browser dev tools, switch to a 375px-wide viewport (iPhone SE). Re-run a finger triage and confirm the expand/collapse animation is smooth and content fits without overflow.

- [ ] **Step 6: Stop here for user review**

Per the spec phasing, **stop after this task** for the user to review the finger content quality and the expand UX feel before proceeding to author content for the other 13 regions. Do NOT commence Phase 2 (other regions) in this plan execution. Phase 2 is a follow-up plan.

---

## Self-Review checklist (already run by plan author)

- ✅ **Spec coverage:** Bucket dataclass (Task 1), content map (Tasks 2, 5), API serialization (Task 3), frontend UX (Task 6), coverage test (Task 4), finger content (Task 5), PDF unchanged (intentionally not touched), manual verification (Task 7), Phase 2/3 deferred per spec.
- ✅ **Placeholder scan:** Every code step contains complete code. No "follow the pattern", "TBD", or "implement similar".
- ✅ **Type consistency:** `Bucket.from_id(id, qualifier=None)` signature is consistent across Task 1 definition and Task 3 call sites. `BUCKET_CONTENT` uses `base_title` (not `title`) consistently. Field names `matches_if`, `not_likely_if`, `quick_test` are used identically in dataclass, content map, JSON serialization, and frontend rendering.
