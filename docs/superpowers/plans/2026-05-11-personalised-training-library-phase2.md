# Personalised Training Library Implementation Plan (Phase 2 — Library Expansion)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand each exercise pool in `src/coach.py` with new tagged entries so generated training plans differentiate meaningfully by `(experience, discipline)`. Phase 1 wired the personalisation infrastructure; this plan fills it with content.

**Architecture:** Pure content addition. New entries are dict literals inserted into the existing `_HANGBOARD_POOL`, `_POWER_POOL`, etc. constants. No code changes. The Phase 1 tests (schema validation, coverage sweep, differentiation, generate_plan smoke) automatically cover the new entries — schema test ensures the new entries are well-formed; coverage sweep ensures no (experience × discipline × equipment) combination breaks; differentiation tests ensure pinch hangs etc. stay correctly gated.

**Tech Stack:** Python only. No new dependencies. Tests use `unittest`.

**Spec:** [docs/superpowers/specs/2026-05-11-personalised-training-library-design.md](../specs/2026-05-11-personalised-training-library-design.md)

**Previous plan:** [docs/superpowers/plans/2026-05-11-personalised-training-library-phase1.md](2026-05-11-personalised-training-library-phase1.md) — shipped successfully (6 commits, 99 tests passing).

---

## What's added

**16 new exercises** across 6 blocks, each one common enough that the Watch demo YouTube-search button will surface usable videos. Each task adds one block's new entries as a single commit.

| Block | Existing entries | New entries | Total after |
|---|---|---|---|
| Hangboard | 6 | 2 | 8 |
| Power | 4 | 4 | 8 |
| Strength | 3 | 3 | 6 |
| Endurance | 3 | 2 | 5 |
| Footwork | 2 | 2 | 4 |
| Mental | 2 | 3 | 5 |

Entries deliberately excluded from Phase 2 (would not surface under current `n` caps so they're YAGNI for now):

- Bodyweight dead hangs (beginner-only intro) — never makes top-2 under current hangboard `n=2`
- Two-arm offset hangs — never makes top-2 for any (experience × discipline) under current pool order

These can be added later if `n` increases or if a future weakness-aware phase prioritises them.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/coach.py` | Modify | Add new exercise dicts to each pool constant; reorder pool entries where necessary so new high-floor entries surface for qualifying users |

No test files change — Phase 1 tests already cover the new content via the schema/coverage/differentiation suites.

---

## Verification commands

Each task runs:

- Targeted: `.venv/bin/python -m unittest tests.test_coach -v` (must stay green)
- Full Python regression: `.venv/bin/python -m unittest tests.test_coach tests.test_triage_calibration tests.test_bucket tests.test_bucket_content -v`
- Scenarios (must stay 102/102): `.venv/bin/python tests/run_all_scenarios.py`

Plus a block-specific smoke test that confirms the new entries surface for their target users.

---

## Task 1 — Hangboard pool: add Repeaters + 10s endurance hangs

**Files:** Modify `src/coach.py` — the `_HANGBOARD_POOL` list literal.

Both new entries are sport/trad/competition-focused intermediate work — they give sport climbers their own intermediate hangboard prescription rather than handing them the bouldering staples by default.

- [ ] **Step 1: Insert two new entries between the existing `pinch` entry and `Max-weight half-crimp hangs`**

In `src/coach.py`, find the `_HANGBOARD_POOL = [` block. After the closing `},` of the `Max-weight pinch hangs` entry (the second entry in the list) and BEFORE the `Max-weight half-crimp hangs` entry, insert these two new entries verbatim:

```python
    {
        "exercise": "Repeaters (7s on / 3s off)",
        "detail": "20mm edge, half-crimp or open-hand, bodyweight. 6 reps continuous = one set.",
        "sets": 4,
        "reps": "6 × (7s on / 3s off)",
        "rest_seconds": 180,
        "effort_note": "By the last 2 reps of each set you should be near failure. Pick edge depth and grip type accordingly.",
        "benchmark": "The classic endurance hangboard protocol. Build to 6 reps clean before adding weight.",
        "disciplines": ["sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
    {
        "exercise": "10-second endurance hangs",
        "detail": "20mm edge, half-crimp, at +50–60% body weight added (or bodyweight if that's enough). Long-duration capacity work.",
        "sets": 5,
        "reps": "10s on / 30s off",
        "rest_seconds": 180,
        "effort_note": "Sustainable hangs — should feel like the 8th rep of a normal set, not a max-effort hang.",
        "benchmark": "Sport-climbing analogue of route-length grip endurance. Progress by reducing rest before adding weight.",
        "disciplines": ["sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["hangboard"],
    },
```

- [ ] **Step 2: Run all coach tests**

Run: `.venv/bin/python -m unittest tests.test_coach -v`
Expected: All 99 tests pass. Schema validation and coverage sweep automatically cover the new entries.

- [ ] **Step 3: Smoke-test the hangboard differentiation**

Run:

```bash
.venv/bin/python -c "
from src.coach import _hangboard_block
print('Sport intermediate:', [e['exercise'] for e in _hangboard_block('intermediate', 'sport', ['hangboard'])])
print('Trad intermediate:', [e['exercise'] for e in _hangboard_block('intermediate', 'trad', ['hangboard'])])
print('Boulder intermediate:', [e['exercise'] for e in _hangboard_block('intermediate', 'bouldering', ['hangboard'])])
print('Advanced boulder:', [e['exercise'] for e in _hangboard_block('advanced', 'bouldering', ['hangboard'])])
print('Beginner all:', [e['exercise'] for e in _hangboard_block('beginner', 'bouldering', ['hangboard'])])
"
```

Expected:
- Sport intermediate: `['Repeaters (7s on / 3s off)', '10-second endurance hangs']` (NEW differentiation)
- Trad intermediate: same as sport
- Boulder intermediate: `['Max-weight half-crimp hangs', 'Open-hand density hangs']` (unchanged)
- Advanced boulder: `['Max-weight pinch hangs', 'Max-weight half-crimp hangs']` (unchanged, no regression)
- Beginner all: `['Half-crimp hangs', 'Open-hand hangs']` (unchanged)

If the sport/trad output does not match exactly, STOP and report as BLOCKED — the insertion position is wrong.

- [ ] **Step 4: Run full regression**

Run: `.venv/bin/python -m unittest tests.test_coach tests.test_triage_calibration tests.test_bucket tests.test_bucket_content -v`
Expected: All previous tests still pass.

Run: `.venv/bin/python tests/run_all_scenarios.py`
Expected: `102/102 PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/coach.py
git commit -m "Hangboard pool: add Repeaters + 10s endurance hangs for sport/trad climbers"
```

New commit. Do NOT amend.

---

## Task 2 — Power pool: add Frog hops + No-foot moves + Reactive pull-ups + Dynamic moves

**Files:** Modify `src/coach.py` — the `_POWER_POOL` list literal.

This task adds four entries and reorders the existing four so the pool follows high-floor → low-floor ordering with the right equipment-needed prioritisation. The end-result pool has 8 entries; current has 4.

- [ ] **Step 1: Replace the entire `_POWER_POOL` list**

In `src/coach.py`, find the `_POWER_POOL: List[Dict] = [` line. Replace the ENTIRE list literal (everything from `_POWER_POOL: List[Dict] = [` through the closing `]` of the list — the four existing entries) with this NEW list. The four existing entries are preserved verbatim; only their order and the four new entries' positions are new:

```python
_POWER_POOL: List[Dict] = [
    {
        "exercise": "Campus board 1-5-8",
        "detail": "Max-distance campus ladders, both arms",
        "sets": 6,
        "reps": "3 ladders each arm",
        "rest_seconds": 240,
        "effort_note": "Full rest between sets — this is CNS-intensive, don't rush",
        "benchmark": "Advanced/elite: 1-5-8 is baseline. 1-5-9 is the benchmark for elite fingerboarders.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "advanced",
        "equipment_needed": ["campus_board"],
    },
    {
        "exercise": "Frog hops on the board",
        "detail": "Use moonboard or system board. Both hands matched on a starting hold, jump to a higher matched position, settle, repeat.",
        "sets": 5,
        "reps": "4 reps per set",
        "rest_seconds": 180,
        "effort_note": "Maintains symmetrical max-power output across multiple matches. Each rep should feel near max.",
        "benchmark": "Boulder-focused power-endurance variant — uses real holds rather than the campus board.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["home_wall", "system_wall"],
    },
    {
        "exercise": "Campus board 1-3-5",
        "detail": "Start on rung 1, skip to 3, skip to 5. No feet.",
        "sets": 5,
        "reps": "3 ladders each arm leading",
        "rest_seconds": 180,
        "effort_note": "Each move should feel explosive — if it's slow, rest more",
        "benchmark": "Intermediate: 1-3-5 is the baseline. Progress to 1-4-7 over the cycle.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["campus_board"],
    },
    {
        "exercise": "Double dynos",
        "detail": "Jump both hands simultaneously to a higher pair of rungs",
        "sets": 4,
        "reps": "4 attempts",
        "rest_seconds": 180,
        "effort_note": "Commit fully — half-committed dynos cause injuries",
        "benchmark": "Most intermediate climbers hit 2-rung dynos; target 3-rung by end of phase",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": ["campus_board"],
    },
    {
        "exercise": "No-foot moves on overhang",
        "detail": "On overhang or a steep board, find or set sequences where you release feet and pull dynamically to the next hold.",
        "sets": 4,
        "reps": "4–6 attempts per sequence",
        "rest_seconds": 180,
        "effort_note": "Core tension + dynamic upper-body strength. Drop the feet, generate, catch the hold.",
        "benchmark": "Transferable to real climbing because it uses actual holds rather than campus rungs.",
        "disciplines": ["bouldering", "sport", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Reactive pull-ups",
        "detail": "Pull-up bar. From a dead hang, pull as fast as possible to chest. Aim for an explosive concentric phase.",
        "sets": 4,
        "reps": "5 reps",
        "rest_seconds": 180,
        "effort_note": "Trains rate of force development. Add a clap mid-rep if you've mastered the basic — or weight for advanced.",
        "benchmark": "Builds reactive strength for dynos and dynamic catches. Universal — every climber benefits.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Dynamic moves on the wall",
        "detail": "Pick boulder problems or sequences with explosive moves — dynos, lunges, throws. Limit-style attempts.",
        "sets": 4,
        "reps": "5 attempts per move",
        "rest_seconds": 180,
        "effort_note": "Explosive contact strength — quality over quantity. Rest fully between attempts.",
        "benchmark": "More accessible than campusing — no specialised gear needed. Core power-building drill.",
        "disciplines": ["bouldering", "sport", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Feet-on campusing",
        "detail": "Use campus rungs with feet on. Match each rung before moving up.",
        "sets": 4,
        "reps": "5 moves",
        "rest_seconds": 120,
        "effort_note": "Explosive pull — don't muscle through slowly",
        "benchmark": "Beginner: focus on keeping hips in and generating power from lats",
        "disciplines": ["bouldering", "sport", "competition"],
        "min_experience": "beginner",
        "max_experience": "intermediate",
        "equipment_needed": ["campus_board"],
    },
]
```

- [ ] **Step 2: Run all coach tests**

Run: `.venv/bin/python -m unittest tests.test_coach -v`
Expected: All 99 tests pass.

- [ ] **Step 3: Smoke-test the power differentiation**

Run:

```bash
.venv/bin/python -c "
from src.coach import _power_block
print('Advanced boulder + campus:', [e['exercise'] for e in _power_block('advanced', 'bouldering', ['campus_board'])])
print('Intermediate boulder + campus + system_wall:', [e['exercise'] for e in _power_block('intermediate', 'bouldering', ['campus_board', 'system_wall'])])
print('Intermediate boulder + campus only:', [e['exercise'] for e in _power_block('intermediate', 'bouldering', ['campus_board'])])
print('Intermediate sport, no equipment:', [e['exercise'] for e in _power_block('intermediate', 'sport', [])])
print('Beginner boulder, no equipment:', [e['exercise'] for e in _power_block('beginner', 'bouldering', [])])
"
```

Expected:
- Advanced boulder + campus: `['Campus board 1-5-8', 'Campus board 1-3-5']`
- Intermediate boulder + campus + system_wall: `['Frog hops on the board', 'Campus board 1-3-5']` (frog hops surfaces with system_wall)
- Intermediate boulder + campus only: `['Campus board 1-3-5', 'Double dynos']` (frog hops correctly excluded — needs system_wall/home_wall)
- Intermediate sport, no equipment: `['No-foot moves on overhang', 'Reactive pull-ups']` (NEW gym-only sport prescription)
- Beginner boulder, no equipment: `['Dynamic moves on the wall']` (1 entry — no other beginners qualify without campus board)

- [ ] **Step 4: Run full regression**

Same as Task 1 Step 4.

- [ ] **Step 5: Commit**

```bash
git add src/coach.py
git commit -m "Power pool: add Frog hops + No-foot moves + Reactive pull-ups + Dynamic moves on wall"
```

---

## Task 3 — Strength pool: add Weighted lock-offs + High-rep pull-ups + Hanging leg raises

**Files:** Modify `src/coach.py` — the `_STRENGTH_POOL` list literal.

- [ ] **Step 1: Replace the entire `_STRENGTH_POOL` list**

In `src/coach.py`, find `_STRENGTH_POOL: List[Dict] = [`. Replace the ENTIRE existing list (currently 3 entries) with this new 6-entry list. The 3 existing entries are preserved verbatim; their positions move:

```python
_STRENGTH_POOL: List[Dict] = [
    {
        "exercise": "Weighted lock-offs at 90° / 120°",
        "detail": "Hold the pull-up bar with elbows at 90° (or 120° for the harder version). Add weight via belt.",
        "sets": 4,
        "reps": "5–10s holds, alternating arms leading",
        "rest_seconds": 180,
        "effort_note": "Pure isometric strength — climbing's most relevant pulling position.",
        "benchmark": "Bouldering benchmark: hold +20 kg at 90° for 5s. Builds the strength behind hard lock-off moves.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "High-rep pull-ups",
        "detail": "Strict pull-ups, sustained effort. Forearm and lat endurance.",
        "sets": 3,
        "reps": "15+ reps",
        "rest_seconds": 120,
        "effort_note": "Pump-building — the last rep of each set should be hard but achievable.",
        "benchmark": "Sport-climber's pull-up: high reps at bodyweight. 15–20 per set is the target.",
        "disciplines": ["sport", "trad"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Hanging leg raises",
        "detail": "From dead hang on the bar, lift legs to L-sit position or higher (toes-to-bar for advanced).",
        "sets": 3,
        "reps": "8–12 reps",
        "rest_seconds": 90,
        "effort_note": "Core-into-pull pattern that mirrors steep climbing demands. Control the eccentric.",
        "benchmark": "Beginners: bent-knee raises. Intermediate: straight-leg L-sit. Advanced: toes-to-bar.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Pull-up variations",
        "detail": "Weighted pull-ups or archer pull-ups depending on level",
        "sets": 4,
        "reps": "5-8",
        "rest_seconds": 180,
        "effort_note": "Last rep should be hard but form must stay clean — no kipping",
        "benchmark": "Full ROM, controlled descent",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Front lever progressions",
        "detail": "Tuck → advanced tuck → straddle → full. Hold each for 3×5s.",
        "sets": 4,
        "reps": "3 × 5s holds",
        "rest_seconds": 120,
        "effort_note": "Hold the position where you're working — don't sacrifice form for a harder position",
        "benchmark": "Intermediate: advanced tuck. Advanced: straddle. Elite: full front lever.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Core tension: hollow body holds",
        "detail": "Supine, arms overhead, press low back flat to floor, lift legs to ~30°",
        "sets": 3,
        "reps": "30s",
        "rest_seconds": 60,
        "effort_note": "If low back lifts off the floor, raise legs higher — quality over quantity",
        "benchmark": "Beginners: 15s is a solid starting point. Build to 45s over the phase.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]
```

- [ ] **Step 2: Run all coach tests**

Run: `.venv/bin/python -m unittest tests.test_coach -v`
Expected: All 99 tests pass.

- [ ] **Step 3: Smoke-test the strength differentiation**

Run:

```bash
.venv/bin/python -c "
from src.coach import _strength_block
print('Intermediate boulder:', [e['exercise'] for e in _strength_block('intermediate', 'bouldering', [])])
print('Intermediate sport:', [e['exercise'] for e in _strength_block('intermediate', 'sport', [])])
print('Intermediate trad:', [e['exercise'] for e in _strength_block('intermediate', 'trad', [])])
print('Beginner all:', [e['exercise'] for e in _strength_block('beginner', 'bouldering', [])])
"
```

Expected:
- Intermediate boulder: `['Weighted lock-offs at 90° / 120°', 'Hanging leg raises', 'Pull-up variations']` (boulder gets lock-offs)
- Intermediate sport: `['High-rep pull-ups', 'Hanging leg raises', 'Pull-up variations']` (sport gets high-rep)
- Intermediate trad: `['High-rep pull-ups', 'Hanging leg raises', 'Pull-up variations']` (trad gets high-rep too)
- Beginner all: `['Pull-up variations', 'Front lever progressions', 'Core tension: hollow body holds']` (unchanged)

Note: The `Pull-up variations` entry in the output should have experience-tuned `sets` (3 for beginner, 4 for intermediate+) and `reps` ("8" for non-elite, "5" for advanced/elite) — this is the existing `_strength_block` post-processing behaviour and should still work after the pool change. Confirm by running:

```bash
.venv/bin/python -c "
from src.coach import _strength_block
for ex in _strength_block('elite', 'bouldering', []):
    if ex['exercise'] == 'Pull-up variations':
        print(ex)
"
```

Expected: `Pull-up variations` entry with `sets=4`, `reps='5'`, and elite-tier benchmark text.

- [ ] **Step 4: Run full regression**

Same as Task 1 Step 4.

- [ ] **Step 5: Commit**

```bash
git add src/coach.py
git commit -m "Strength pool: add Weighted lock-offs + High-rep pull-ups + Hanging leg raises"
```

---

## Task 4 — Endurance pool: add Boulder Power Endurance + Climbing intervals

**Files:** Modify `src/coach.py` — the `_ENDURANCE_POOL` list literal.

- [ ] **Step 1: Replace the entire `_ENDURANCE_POOL` list**

Find `_ENDURANCE_POOL: List[Dict] = [`. Replace with this 5-entry list:

```python
_ENDURANCE_POOL: List[Dict] = [
    {
        "exercise": "Boulder power endurance — 6×4 min on routes",
        "detail": "Climb continuously on a route or set sequence for 4 minutes. Rest 4 minutes. Repeat 6 rounds.",
        "sets": 6,
        "reps": "4 min on / 4 min off",
        "rest_seconds": 240,
        "effort_note": "Sustained high intensity. Forearms should be deeply pumped by round 3.",
        "benchmark": "Boulder/comp power-endurance protocol. Most useful for competition climbers and hard boulderers.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "advanced",
        "equipment_needed": [],
    },
    {
        "exercise": "ARCing (aerobic restoration and capillarity)",
        "detail": "20–40 min of continuous easy climbing (50–60% effort). No stopping.",
        "sets": 1,
        "reps": "20–40 min",
        "rest_seconds": 0,
        "effort_note": "You should be able to hold a full conversation throughout — this is recovery training",
        "benchmark": "If you're breathing hard, you're going too hard. The adaptation is in the sustained duration.",
        "disciplines": ["sport", "trad", "competition"],
        "min_experience": "advanced",
        "equipment_needed": [],
    },
    {
        "exercise": "Climbing intervals — 3 on / 3 off × 5",
        "detail": "Climb for 3 minutes continuously, then rest 3 minutes. Five rounds total.",
        "sets": 5,
        "reps": "3 min on / 3 min off",
        "rest_seconds": 180,
        "effort_note": "Aerobic–anaerobic crossover work. Targets the energy system most used in long sport routes.",
        "benchmark": "Sport/trad endurance staple. Pace yourself — should be hard but sustainable across all 5 rounds.",
        "disciplines": ["sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "4×4s",
        "detail": "Pick 4 boulder problems 2–3 grades below max. Climb all 4 back to back, rest 3 min, repeat 4 rounds.",
        "sets": 4,
        "reps": "4 problems continuous",
        "rest_seconds": 180,
        "effort_note": "The last round should feel very hard — if it's easy, the problems are too easy",
        "benchmark": "Your forearms should be noticeably pumped after round 2. Full pump by round 4.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Linked route laps",
        "detail": "Climb a moderate route, immediately downclimb or lower and repeat",
        "sets": 3,
        "reps": "5 laps per route",
        "rest_seconds": 300,
        "effort_note": "Pace yourself — the goal is maintaining technique under fatigue, not sprinting",
        "benchmark": "Intermediate: maintain footwork quality on laps 4–5. Beginners: 3 laps is the target.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]
```

- [ ] **Step 2: Run all coach tests**

Run: `.venv/bin/python -m unittest tests.test_coach -v`
Expected: All 99 tests pass.

- [ ] **Step 3: Smoke-test the endurance differentiation**

Run:

```bash
.venv/bin/python -c "
from src.coach import _endurance_block
print('Advanced sport:', [e['exercise'] for e in _endurance_block('advanced', 'sport', [])])
print('Advanced boulder:', [e['exercise'] for e in _endurance_block('advanced', 'bouldering', [])])
print('Intermediate sport:', [e['exercise'] for e in _endurance_block('intermediate', 'sport', [])])
print('Intermediate trad:', [e['exercise'] for e in _endurance_block('intermediate', 'trad', [])])
print('Beginner all:', [e['exercise'] for e in _endurance_block('beginner', 'bouldering', [])])
"
```

Expected:
- Advanced sport: `['ARCing (aerobic restoration and capillarity)', 'Climbing intervals — 3 on / 3 off × 5', '4×4s']`
- Advanced boulder: `['Boulder power endurance — 6×4 min on routes', '4×4s', 'Linked route laps']`
- Intermediate sport: `['Climbing intervals — 3 on / 3 off × 5', '4×4s', 'Linked route laps']`
- Intermediate trad: same as sport
- Beginner all: `['4×4s', 'Linked route laps']` (n=3 with only 2 eligible — that's fine)

- [ ] **Step 4: Run full regression**

Same as Task 1 Step 4.

- [ ] **Step 5: Commit**

```bash
git add src/coach.py
git commit -m "Endurance pool: add boulder power endurance + climbing intervals"
```

---

## Task 5 — Footwork pool: add Edging precision + Dual-tex drill

**Files:** Modify `src/coach.py` — the `_FOOTWORK_POOL` list literal.

- [ ] **Step 1: Replace the entire `_FOOTWORK_POOL` list**

Find `_FOOTWORK_POOL: List[Dict] = [`. Replace with this 4-entry list. Both new entries are intermediate-tier so beginners still get the existing two (silent feet + slab smearing) as their footwork prescription:

```python
_FOOTWORK_POOL: List[Dict] = [
    {
        "exercise": "Dual-tex drill",
        "detail": "Climb the same problem twice — once in stiff shoes, once in soft. Notice the difference in foot feel.",
        "sets": 2,
        "reps": "3 problems each shoe",
        "rest_seconds": 60,
        "effort_note": "Develops shoe-feel and rubber-trust. Helps you learn what your footwear actually gives you.",
        "benchmark": "Many climbers fail on foot-sensitive routes because they don't know what their shoes do — address it directly.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Edging precision drill",
        "detail": "On vertical or slightly overhanging wall, place your foot on the smallest possible point of each hold. No re-adjusting after placement.",
        "sets": 3,
        "reps": "5 problems",
        "rest_seconds": 60,
        "effort_note": "Pure precision work — climb slow. The failure mode is shifting feet after placement, not the move itself.",
        "benchmark": "Universal drill — pays off at every level. Even pros benefit.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Silent feet drills",
        "detail": "Climb a moderate route/problem — no sound when placing feet. Reset if you hear a foot.",
        "sets": 3,
        "reps": "5 problems",
        "rest_seconds": 90,
        "effort_note": "Slow down — this is technique, not training to failure",
        "benchmark": "Even V8+ climbers benefit from this drill. Precision > speed at all levels.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
    {
        "exercise": "Slab technique — smearing",
        "detail": "Find or set 3–4 slab sequences that require smearing. Focus on hip position.",
        "sets": 2,
        "reps": "10 min",
        "rest_seconds": 120,
        "effort_note": "Weight over feet, trust the rubber — lean into the discomfort of slab",
        "benchmark": "Most climbers undertrain slab. 10 min of focused slab work pays dividends on overhang too.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]
```

- [ ] **Step 2: Run all coach tests**

Run: `.venv/bin/python -m unittest tests.test_coach -v`
Expected: All 99 tests pass.

- [ ] **Step 3: Smoke-test the footwork differentiation**

Run:

```bash
.venv/bin/python -c "
from src.coach import _footwork_block
print('Intermediate:', [e['exercise'] for e in _footwork_block('intermediate', 'bouldering', [])])
print('Beginner:', [e['exercise'] for e in _footwork_block('beginner', 'bouldering', [])])
print('Advanced:', [e['exercise'] for e in _footwork_block('advanced', 'sport', [])])
"
```

Expected:
- Intermediate: `['Dual-tex drill', 'Edging precision drill']` (NEW intermediate-tier prescription)
- Beginner: `['Silent feet drills', 'Slab technique — smearing']` (unchanged)
- Advanced: `['Dual-tex drill', 'Edging precision drill']` (intermediate entries still surface)

- [ ] **Step 4: Run full regression**

Same as Task 1 Step 4.

- [ ] **Step 5: Commit**

```bash
git add src/coach.py
git commit -m "Footwork pool: add Dual-tex drill + Edging precision drill"
```

---

## Task 6 — Mental pool: add Gear-placement drill + Commitment dyno + Redpoint visualisation

**Files:** Modify `src/coach.py` — the `_MENTAL_POOL` list literal.

- [ ] **Step 1: Replace the entire `_MENTAL_POOL` list**

Find `_MENTAL_POOL: List[Dict] = [`. Replace with this 5-entry list:

```python
_MENTAL_POOL: List[Dict] = [
    {
        "exercise": "Gear-placement drill on toprope",
        "detail": "On toprope, climb your project. Place gear at every reasonable opportunity. Have a partner critique placements.",
        "sets": 1,
        "reps": "2 laps of project on toprope",
        "rest_seconds": 0,
        "effort_note": "Build placement instinct under low stakes. Translates directly to leading harder routes.",
        "benchmark": "Specifically for trad climbers. Aim for 8/10 placements that an experienced partner would clip without hesitation.",
        "disciplines": ["trad"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Commitment dyno (controlled exposure)",
        "detail": "Find a safe dyno with a good landing. Make 5 dedicated attempts. The goal is committing, not necessarily sending.",
        "sets": 1,
        "reps": "5 attempts",
        "rest_seconds": 180,
        "effort_note": "Most climbers half-commit dynos. This drill builds the mental pattern of full commitment under safe conditions.",
        "benchmark": "Boulder-specific. The goal is fall comfort, not send rate.",
        "disciplines": ["bouldering", "competition"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Headpoint practice",
        "detail": "Take a route/problem at your limit. Rehearse the crux moves on TR or with padding first, then commit.",
        "sets": 1,
        "reps": "2–3 attempts from the ground",
        "rest_seconds": 300,
        "effort_note": "The goal is committing to the move — falling is part of the process",
        "benchmark": "Most climbers avoid this drill. Scheduling it makes it happen.",
        "disciplines": ["sport", "trad"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Redpoint visualisation",
        "detail": "Sit quietly with eyes closed. Mentally rehearse your project from start to finish — every hold, every breath, every move.",
        "sets": 1,
        "reps": "5–10 min per session",
        "rest_seconds": 0,
        "effort_note": "Mental rehearsal is well-documented in sport science — equivalent to physical practice for skill consolidation.",
        "benchmark": "Sport/trad climbers especially benefit. Do this the night before a hard redpoint attempt.",
        "disciplines": ["sport", "trad"],
        "min_experience": "intermediate",
        "equipment_needed": [],
    },
    {
        "exercise": "Breath reset drill",
        "detail": "Before each attempt, take 3 slow diaphragmatic breaths. On the wall, breathe at every rest hold.",
        "sets": 1,
        "reps": "Every attempt in the session",
        "rest_seconds": 0,
        "effort_note": "This is a habit drill — the reps are every single attempt, not a separate exercise block",
        "benchmark": "Most climbers forget to breathe on hard moves. This drill rewires that pattern.",
        "disciplines": ["bouldering", "sport", "trad", "competition"],
        "min_experience": "beginner",
        "equipment_needed": [],
    },
]
```

- [ ] **Step 2: Run all coach tests**

Run: `.venv/bin/python -m unittest tests.test_coach -v`
Expected: All 99 tests pass.

- [ ] **Step 3: Smoke-test the mental differentiation**

Run:

```bash
.venv/bin/python -c "
from src.coach import _mental_block
print('Intermediate trad:', [e['exercise'] for e in _mental_block('intermediate', 'trad', [])])
print('Intermediate sport:', [e['exercise'] for e in _mental_block('intermediate', 'sport', [])])
print('Intermediate boulder:', [e['exercise'] for e in _mental_block('intermediate', 'bouldering', [])])
print('Beginner all:', [e['exercise'] for e in _mental_block('beginner', 'bouldering', [])])
"
```

Expected:
- Intermediate trad: `['Gear-placement drill on toprope', 'Headpoint practice']` (trad-specific surfaces)
- Intermediate sport: `['Headpoint practice', 'Redpoint visualisation']`
- Intermediate boulder: `['Commitment dyno (controlled exposure)', 'Breath reset drill']` (boulder-specific surfaces)
- Beginner all: `['Breath reset drill']` (1 entry — n=2 but only one qualifies)

- [ ] **Step 4: Run full regression**

Same as Task 1 Step 4.

- [ ] **Step 5: Commit**

```bash
git add src/coach.py
git commit -m "Mental pool: add Gear-placement drill + Commitment dyno + Redpoint visualisation"
```

---

## Final verification — full library smoke test

After all 6 commits, run an end-to-end check that the new library produces sensible plans for representative profiles.

- [ ] **Final smoke**

Run:

```bash
.venv/bin/python -c "
from src.coach import generate_plan
profiles = [
    ('Beginner boulderer (gym only)', {'experience_level':'beginner','primary_discipline':'bouldering','days_per_week':3,'equipment':['gym_membership'],'primary_goal':'general'}),
    ('Advanced boulderer (full kit)', {'experience_level':'advanced','primary_discipline':'bouldering','days_per_week':4,'equipment':['hangboard','campus_board','gym_membership'],'primary_goal':'grade_progression'}),
    ('Intermediate sport climber (gym + hangboard)', {'experience_level':'intermediate','primary_discipline':'sport','days_per_week':4,'equipment':['hangboard','gym_membership'],'primary_goal':'route_endurance'}),
    ('Intermediate trad climber (minimal)', {'experience_level':'intermediate','primary_discipline':'trad','days_per_week':3,'equipment':['gym_membership'],'primary_goal':'general'}),
    ('Elite boulderer (full kit)', {'experience_level':'elite','primary_discipline':'bouldering','days_per_week':5,'equipment':['hangboard','campus_board','home_wall','gym_membership'],'primary_goal':'competition'}),
]
for label, p in profiles:
    plan = generate_plan(p, injury_flags=[], openai_client=None)
    print(f'=== {label} ===')
    for s in plan['plan_data']['sessions'][:5]:
        names = [e['exercise'] for e in s['main']]
        print(f'  Wk{s[\"week\"]} d{s[\"day_in_week\"]} {s[\"type\"]:>10}: {names}')
    print()
"
```

Expected: Each profile prints 5 sessions with exercise names. Sanity-check that:
- Beginner sees beginner-tagged exercises (Half-crimp hangs, Pull-up variations, Silent feet drills, 4×4s, Breath reset drill, Dynamic moves on the wall)
- Advanced boulderer with full kit sees pinch hangs, campus 1-5-8, weighted lock-offs, boulder power endurance, commitment dyno
- Intermediate sport sees repeaters, climbing intervals, high-rep pull-ups, no-foot moves, headpoint practice/redpoint visualisation
- Intermediate trad sees gear-placement drill, headpoint practice, high-rep pull-ups, climbing intervals
- No tag fields (`disciplines`, `min_experience`, etc.) appear in any output

- [ ] **Final regression**

Run: `.venv/bin/python -m unittest tests.test_coach tests.test_triage_calibration tests.test_bucket tests.test_bucket_content -v`
Expected: All tests pass.

Run: `.venv/bin/python tests/run_all_scenarios.py`
Expected: `102/102 PASS`.

No final commit needed — the 6 task commits cover all changes.

---

## Self-Review checklist

- ✅ **Spec coverage:** Library expansion across all 6 blocks per spec. The 2 entries the spec listed but Phase 2 deliberately drops (Bodyweight dead hangs, Two-arm offset hangs) are noted as YAGNI — they wouldn't surface under current `n` caps. Future weakness-aware logic (Phase 3) may revisit them.
- ✅ **Placeholder scan:** Every entry has a complete dict literal with all 7 canonical fields + tag fields. No "(insert similar)" or "(see Task N)".
- ✅ **Type consistency:** Every new entry follows the schema enforced by Phase 1's `ExercisePoolSchemaTests` — `disciplines` is a list, `min_experience` is in `["beginner","intermediate","advanced","elite"]`, `equipment_needed` only uses values from `VALID_EQUIPMENT`. The schema test will fail loudly if any entry drifts.
