from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple


# Normalized injury intake used across the app (UI -> triage -> retrieval)
@dataclass(frozen=True)
class Intake:
    region: str
    onset: str
    pain_type: str
    severity: int
    # Key symptom flags (used for safety checks)
    swelling: str
    bruising: str
    numbness: str
    weakness: str
    instability: str
    # Context about what triggered it (helps narrow common patterns)
    mechanism: str
    free_text: str


# ── Negation-aware keyword matching ────────────────────────────────────────
# Simple substring matching ("bladder" in text) fires on "no bladder symptoms".
# This helper checks that the matched keyword is not preceded by a negation word.

_NEG_WORDS = frozenset({"no", "not", "without", "denies", "none", "negative", "absent", "deny"})


def _keyword_affirmed(text: str, keywords: list) -> bool:
    """True only when a keyword appears without a negation in the four preceding words.
    A four-word window handles 'no X or Y' patterns (e.g. 'no bladder or bowel issues').
    False positives (over-flagging) are preferred over false negatives for safety flags."""
    words = text.split()
    for i, word in enumerate(words):
        for kw in keywords:
            if kw in word:
                context = words[max(0, i - 4):i]
                if not any(n in context for n in _NEG_WORDS):
                    return True
    return False


# ── Emergency flag detection ────────────────────────────────────────────────
# Returns emergency-level red flags only — these should always surface at top

def get_emergency_flags(i: Intake) -> List[str]:
    """Return only emergency-level red flags requiring immediate medical care."""
    flags: List[str] = []
    region = i.region.lower()
    text   = i.free_text.lower()

    # Cauda equina — lower back + bladder/bowel change is an emergency
    if "lower back" in region or "back" in region:
        if _keyword_affirmed(text, ["bladder", "bowel", "incontinence", "saddle", "groin numb"]):
            flags.append(
                "EMERGENCY: Bladder or bowel symptoms with back pain may indicate cauda equina syndrome. "
                "Call 911 or go to the ER immediately — do not wait."
            )

    # Bilateral leg symptoms with back pain — structural spinal cord risk
    if ("lower back" in region or "back" in region) and i.numbness == "Yes" and i.weakness == "Significant":
        flags.append(
            "EMERGENCY: Significant leg weakness and numbness with back pain requires urgent evaluation — "
            "possible spinal cord involvement. Call 911."
        )

    # Visible bowstringing — finger (tendon displacing out of its sheath)
    if "finger" in region and _keyword_affirmed(text, [
        "bowstring", "bow string", "cord visible", "tendon visible",
        "tendon lifting", "tendon jumping", "cord jumping", "cord lifting",
        "tendon moves", "tendon popping", "cord across", "tendon pops",
    ]):
        flags.append(
            "EMERGENCY: Visible bowstringing (tendon cord across palm side of finger) requires imaging and "
            "surgical consultation before any return to climbing."
        )

    # Septic tenosynovitis — finger with fever / spreading redness
    if "finger" in region and _keyword_affirmed(text, ["fever", "hot", "spreading", "red streak"]):
        flags.append(
            "EMERGENCY: Fever with rapidly spreading warmth and redness in a finger may indicate septic "
            "tenosynovitis — a hand surgery emergency. Go to the ER immediately."
        )

    # Complete bicep rupture — Popeye deformity
    if "elbow" in region and _keyword_affirmed(text, [
        "popeye", "deformity", "muscle moved", "bunched", "bunching", "bunches",
        "muscle lump", "muscle moved up", "bulge in arm", "muscle shifted",
        "retracted", "lump near shoulder",
    ]):
        flags.append(
            "EMERGENCY: A Popeye deformity (muscle belly bunched in the upper arm) after an elbow pop "
            "indicates complete distal biceps rupture — surgical referral required within 2–3 weeks."
        )

    # Locked knee — mechanically cannot extend (not just pain-limited)
    if "knee" in region and _keyword_affirmed(text, [
        "locked", "cannot straighten", "can't straighten", "won't extend",
        "stuck at", "cannot extend", "won't straighten", "unable to straighten",
    ]):
        flags.append(
            "URGENT: A knee that is mechanically locked and cannot be straightened may indicate a displaced "
            "meniscal tear or loose body — seek same-day orthopaedic evaluation. "
            "Do not force the knee into extension."
        )

    # Achilles rupture
    if ("ankle" in region or "foot" in region) and i.weakness == "Significant":
        if _keyword_affirmed(text, ["snap", "pop", "tiptoe", "plantarflex"]):
            flags.append(
                "EMERGENCY: Inability to push up on tiptoe after a snap at the ankle may indicate Achilles "
                "rupture — requires urgent surgical evaluation."
            )

    # Shoulder neurovascular compromise
    if "shoulder" in region and _keyword_affirmed(text, [
        "cold arm", "numb arm", "pulseless", "no pulse", "dislocat",
        "arm went dead", "arm is cold", "no feeling in arm",
    ]):
        flags.append(
            "EMERGENCY: A cold, pulseless, or completely numb arm following shoulder trauma may indicate "
            "neurovascular compromise — call 911 immediately."
        )

    # Pec major rupture
    if "chest" in region and i.onset == "Sudden":
        if _keyword_affirmed(text, ["pop", "snap", "tear", "rip", "deformity", "retracted"]):
            flags.append(
                "EMERGENCY: A sudden pop in the chest or armpit during heavy loading (e.g. dynamic catch, "
                "cross-body pull) may indicate pectoralis major rupture — requires urgent surgical evaluation."
            )

    # Rib fracture / pneumothorax
    if "chest" in region and i.severity >= 7:
        if _keyword_affirmed(text, ["breath", "breathe", "breathing", "inhale", "rib", "ribs"]):
            flags.append(
                "Pain that worsens sharply with breathing after chest trauma may indicate a rib fracture "
                "or, rarely, pneumothorax — seek same-day evaluation."
            )

    # Cervical myelopathy / spinal cord compression — neck
    if "neck" in region or "cervical" in region:
        if _keyword_affirmed(text, [
            "numb hands", "numb fingers", "weak hands", "dropping things",
            "electric", "shock down", "jolt", "hands numb", "clumsy hands",
            "balance", "stumbling", "bladder", "bowel",
        ]) or (i.numbness == "Yes" and i.weakness == "Significant"):
            flags.append(
                "EMERGENCY: Neck pain with upper limb numbness, weakness, or electric sensations may indicate "
                "cervical myelopathy or cord compression — requires urgent neurological evaluation. "
                "Do not return to climbing until cleared by a specialist."
            )

    return flags


# ── Standard safety screen ──────────────────────────────────────────────────

def red_flags(i: Intake) -> List[str]:
    """Returns reasons to seek evaluation based on common red flags.
    Includes emergency flags first, then urgent and standard flags."""
    flags: List[str] = get_emergency_flags(i)
    region = i.region.lower()
    text   = i.free_text.lower()

    if i.numbness == "Yes":
        flags.append("Numbness or tingling can indicate nerve involvement — worth evaluation.")
    if i.weakness == "Significant":
        flags.append("Significant weakness warrants evaluation, especially if sudden onset.")
    if i.instability == "Yes":
        flags.append("Instability (feels like slipping or dislocating) warrants evaluation.")
    if i.bruising == "Yes" and i.onset == "Sudden":
        flags.append("Sudden onset with bruising can indicate a more significant tissue injury.")
    if i.swelling == "Yes" and i.severity >= 7:
        flags.append("High pain with swelling may need evaluation.")
    if _keyword_affirmed(text, ["pop", "snap", "crack", "tore"]):
        flags.append(
            "A reported pop, snap, or crack at time of injury is a red flag — "
            "consider evaluation before returning to climbing."
        )

    # Wrist / fall on outstretched hand — scaphoid red flag
    if "wrist" in region and i.onset == "Sudden":
        flags.append(
            "Sudden wrist injury — if there is tenderness at the base of the thumb (anatomical snuffbox), "
            "seek evaluation to rule out scaphoid fracture. Initial X-ray can be negative; CT or MRI may be needed."
        )

    # Finger — PIP extension block (Boutonnière / central slip)
    if "finger" in region and _keyword_affirmed(text, [
        "can't straighten", "cannot straighten", "won't extend", "stuck bent",
        "pip", "won't straighten", "unable to straighten",
    ]):
        flags.append(
            "A PIP joint that cannot be passively extended to neutral may indicate a central slip rupture "
            "(Boutonnière deformity) — requires splinting within 72 hours to prevent permanent deformity."
        )

    # Ankle — Ottawa criteria prompt
    if ("ankle" in region or "foot" in region) and i.onset == "Sudden":
        flags.append(
            "For ankle injuries after a fall or roll: if there is bone tenderness at the tip of the fibula or "
            "medial malleolus, or you couldn't take 4 steps immediately after injury, an X-ray is recommended "
            "(Ottawa Ankle Rules) to rule out fracture."
        )

    # Lower back radiculopathy
    if ("lower back" in region or "back" in region) and i.numbness == "Yes":
        flags.append(
            "Numbness or tingling travelling down the leg from a back problem may indicate nerve root "
            "compression (radiculopathy) — warrants evaluation, especially if worsening."
        )

    # Shoulder instability / dislocation
    if "shoulder" in region and i.instability == "Yes":
        flags.append(
            "Shoulder instability or a history of dislocation/subluxation requires evaluation before "
            "continuing dynamic overhead climbing."
        )

    # Catch-all: ensure that high-severity pain always surfaces at least one flag.
    # classify_severity() can score "severe" on pain alone (score ≥ 8, or sudden ≥ 7) even when
    # none of the specific pattern checks above triggered.  Without this, the results page would
    # show a "Severe" banner alongside a "No major red flags" banner — a direct contradiction.
    if not flags:
        if i.severity >= 8:
            flags.append(
                f"Pain at {i.severity}/10 warrants professional evaluation — "
                "high-intensity pain can indicate significant tissue injury even when other symptoms are absent."
            )
        elif i.onset == "Sudden" and i.severity >= 7:
            flags.append(
                f"Sudden-onset pain at {i.severity}/10 warrants evaluation to rule out significant structural injury "
                "before returning to climbing."
            )

    return flags


# ── Severity classification ─────────────────────────────────────────────────

def classify_severity(i: Intake) -> Dict[str, str]:
    """Classify injury severity and return recommended action."""
    # Check for emergency flags first
    emergency = get_emergency_flags(i)
    if emergency:
        return {
            "level": "emergency",
            "label": "Emergency",
            "action": "Go to ER or call 911 immediately.",
            "can_climb": "No",
        }

    score = i.severity
    has_neuro    = i.numbness == "Yes" or i.weakness == "Significant"
    has_instab   = i.instability == "Yes"
    sudden_high  = i.onset == "Sudden" and score >= 7

    if score >= 8 or has_neuro or sudden_high or has_instab:
        return {
            "level": "severe",
            "label": "Severe",
            "action": "See a healthcare provider within 24–48 hours.",
            "can_climb": "No — rest until evaluated.",
        }
    elif score >= 5 or (i.swelling == "Yes" and score >= 4):
        return {
            "level": "moderate",
            "label": "Moderate",
            "action": "See a sports physio or doctor within 1 week.",
            "can_climb": "Modified only — keep pain below 3/10.",
        }
    else:
        return {
            "level": "mild",
            "label": "Mild",
            "action": "Self-manage with load reduction and monitor. Seek evaluation if not improving in 2–3 weeks.",
            "can_climb": "Yes — with modifications; avoid aggravating movements.",
        }


# ── Training modifications ──────────────────────────────────────────────────

def get_training_modifications(i: Intake) -> Dict[str, List[str]]:
    """Return what training is permitted during recovery based on region and severity."""
    region   = i.region.lower()
    severity = classify_severity(i)["level"]

    modifications: Dict[str, List[str]] = {}

    # Universal — always apply
    modifications["Universal rules"] = [
        "Keep pain during any activity at or below 3/10.",
        "Use the 24-hour rule: no significant pain increase in the 24 hours after a session.",
        "Increase only one variable at a time: volume OR intensity OR frequency.",
    ]

    if "finger" in region:
        modifications["Permitted during recovery"] = [
            "Easy slab and vertical climbing on open-hand jugs and slopers.",
            "Footwork-focused traversing at low intensity.",
            "Antagonist training: wrist extension, push-ups, shoulder work.",
        ]
        modifications["Avoid"] = [
            "Full crimp grip position.",
            "Pocket holds and mono pulls.",
            "Dynamic catches on the affected finger.",
            "Hangboard loading until pain-free passive extension is restored.",
            "Campus board — last to return (typically 2–4× longer than hangboard clearance).",
        ]
        modifications["Hangboard clearance"] = [
            "Grade 1: Open-hand only from 2 weeks, pain-free.",
            "Grade 2: Open-hand only from 4–6 weeks, pain-free.",
            "Grade 3: Open-hand only from 8+ weeks; no full crimp for 4–6 months.",
        ]

    elif "wrist" in region:
        modifications["Permitted during recovery"] = [
            "Easy climbing avoiding twisting loads and end-range wrist positions.",
            "Straight-arm climbing styles — slab and sloper-heavy terrain.",
            "Lower body training: legs, hip strengthening.",
        ]
        modifications["Avoid"] = [
            "Side-pulls, gastons, and underclings.",
            "Loaded wrist flexion or extension at end range.",
            "Rotational grip styles if TFCC suspected.",
            "Pinch holds and thumb-intensive grips if De Quervain's suspected.",
        ]
        modifications["Hangboard clearance"] = [
            "TFCC: 6–8 weeks minimum; wrist-neutral grip only.",
            "Scaphoid: only after confirmed healing on imaging.",
            "Flexor tendinopathy: when pain-free with loaded wrist flexion.",
        ]

    elif "elbow" in region:
        modifications["Permitted during recovery"] = [
            "Easy slab and vertical climbing at low intensity.",
            "Antagonist training: wrist extension, push-ups, face pulls.",
            "Lower body and core training.",
        ]
        modifications["Avoid"] = [
            "Steep overhanging terrain and board climbing.",
            "Campus board — minimum 12 weeks from symptom onset.",
            "Max-intensity hangboard until pain-free for 2+ weeks on normal climbing.",
            "Full lock-off positions and high-tension pulling.",
        ]
        modifications["Hangboard clearance"] = [
            "Medial epicondylitis: 4+ weeks; open-hand at reduced load; monitor after each session.",
            "Distal biceps: 6–8 weeks for tendinopathy; 12+ weeks for partial tear.",
            "Cubital tunnel: avoid until tingling has fully resolved.",
        ]

    elif "shoulder" in region:
        modifications["Permitted during recovery"] = [
            "Slab and vertical climbing — below painful arc.",
            "Gentle pulling on low-angle terrain.",
            "Rotator cuff strengthening: face pulls, band external rotation, YTW.",
            "Scapular stabilization: serratus wall slides, rows.",
        ]
        modifications["Avoid"] = [
            "Overhead climbing that reproduces the painful arc.",
            "Hard lock-offs and high-tension pulling.",
            "Dynamic catches (dynos) until pain-free overhead.",
            "Campus board — return only when full pain-free ROM restored.",
            "Steep compression climbing.",
        ]
        modifications["Hangboard clearance"] = [
            "Impingement/tendinopathy: 3–4 weeks; avoid overhead positions.",
            "SLAP tear conservative: 8–12 weeks minimum.",
            "Post-surgical: per surgeon timeline.",
        ]

    elif "knee" in region:
        modifications["Permitted during recovery"] = [
            "Slab and vertical climbing with careful, controlled footwork.",
            "Upper body training: hangboard, pulling movements.",
            "Hip strengthening: glute medius, hip abductors.",
        ]
        modifications["Avoid"] = [
            "Heel hooks — last movement to reintroduce.",
            "Deep drop knee positions.",
            "Aggressive high steps that load the knee at end range.",
            "Any footwork that reproduces sharp knee pain.",
        ]
        modifications["Campus board clearance"] = [
            "Not directly affected — avoid aggressive bouldering requiring deep knee flexion.",
        ]

    elif "hip" in region:
        modifications["Permitted during recovery"] = [
            "Moderate vertical climbing avoiding high steps and wide stems.",
            "Upper body training.",
            "Hip mobility work within pain-free range.",
        ]
        modifications["Avoid"] = [
            "High steps above hip height.",
            "Wide stemming positions.",
            "Aggressive rockovers that reproduce deep hip pain.",
        ]

    elif "lower back" in region or "back" in region:
        modifications["Permitted during recovery"] = [
            "Vertical and slab climbing — avoid overhanging terrain.",
            "McGill Big 3 core stability exercises.",
            "Gentle walking — movement helps more than rest.",
            "Lower intensity climbing maintaining good posture.",
        ]
        modifications["Avoid"] = [
            "Overhanging terrain and board climbing.",
            "Campus board and explosive pulling.",
            "Sustained lumbar flexion positions.",
            "Roof climbing until fully pain-free.",
        ]

    elif "ankle" in region or "foot" in region:
        modifications["Permitted during recovery"] = [
            "Upper body training: hangboard, pulling, shoulder work.",
            "Single-leg balance and proprioception exercises.",
            "Protected weight-bearing as tolerated.",
        ]
        modifications["Avoid"] = [
            "Smearing technique until ankle is fully stable.",
            "Heel hooks until ankle stability restored.",
            "Approach hiking on technical terrain until recovered.",
            "Any footwork that reproduces ankle pain.",
        ]
        modifications["Return to climbing progression"] = [
            "Start on vertical terrain with solid footholds before slab.",
            "Restore proprioception and single-leg stability before aggressive footwork.",
            "Avoid heel hooks and drop knees last.",
        ]

    elif "chest" in region:
        modifications["Permitted during recovery"] = [
            "Leg-dominant training: footwork drills, balance, lower body strength.",
            "Gentle core work (no chest loading) once pain settles.",
            "Easy slab and vertical climbing with minimal upper body tension if pain-free.",
        ]
        modifications["Avoid"] = [
            "Dynamic moves and catches — high pec/chest loading.",
            "Wide pinches, gastons, and cross-body pulling movements.",
            "Campus board and heavy hangboard work during acute phase.",
            "Any movement that reproduces sharp chest or armpit pain.",
        ]
        modifications["Return to climbing progression"] = [
            "Reintroduce pulling loads gradually — start with vertical, progress to overhang.",
            "Avoid dynamic moves until at least 4–6 weeks pain-free pulling.",
            "Test wide pinches and cross-body pulls last before returning to full training.",
        ]

    elif "neck" in region or "cervical" in region:
        modifications["Permitted during recovery"] = [
            "Easy slab and vertical climbing with good head and neck positioning.",
            "Gentle shoulder and scapular strengthening (face pulls, rows, band work).",
            "Core stability work that does not load the cervical spine.",
        ]
        modifications["Avoid"] = [
            "Overhanging terrain requiring prolonged neck extension.",
            "Roof climbing and inverted positions.",
            "Campus board and explosive movements that stress the cervical spine.",
            "Any position that reproduces arm symptoms (tingling, numbness, weakness).",
        ]
        modifications["Return to climbing progression"] = [
            "Return only when full pain-free cervical range of motion is restored.",
            "Seek clearance from a healthcare provider if any arm neurological symptoms were present.",
            "Reintroduce overhanging terrain gradually — avoid sustained neck extension initially.",
        ]

    else:
        modifications["General guidance"] = [
            "Avoid movements or grip styles that reproduce your symptoms.",
            "Maintain fitness through movements that are pain-free.",
            "Reduce volume and intensity; add back one variable at a time.",
        ]

    if severity == "severe":
        modifications["Current severity note"] = [
            "Given symptom severity: rest from climbing until evaluated by a healthcare provider.",
        ]
    elif severity == "emergency":
        modifications["Current severity note"] = [
            "Seek emergency medical care before any training decisions.",
        ]

    return modifications


# ── Return to climbing protocol ─────────────────────────────────────────────

def get_return_to_climbing_protocol(i: Intake) -> Dict[str, List[str]]:
    """Return full return-to-sport criteria and progression for the given region."""
    region = i.region.lower()

    protocol: Dict[str, List[str]] = {}

    if "finger" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free passive extension of the injured finger.",
            "Pain-free palpation directly over the injured pulley.",
            "Negative bowstring test on ultrasound (Grade 2+).",
            "Pain-free open-hand hangboard loading at 50% bodyweight.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Easy open-hand climbing on jugs — vertical terrain.",
            "2. Moderate open-hand climbing — introduce sloper and crimp-style holds gradually.",
            "3. Half-crimp introduction — pain-free for 2+ weeks before advancing.",
            "4. Full crimp — last to return; test on easy holds before hard moves.",
            "5. Campus board and limit bouldering — last activities to reintroduce.",
        ]
        protocol["Taping during return"] = [
            "H-tape (ring taping) over A2 region for proprioceptive support.",
            "Tape does not replace healing — do not use tape to push through pain.",
        ]

    elif "wrist" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Full pain-free wrist range of motion in flexion, extension, and rotation.",
            "Confirmed scaphoid healing on CT scan if fracture was diagnosed.",
            "No DRUJ instability on clinical exam for TFCC injuries.",
            "Pain-free with functional grip loading.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Straight-arm climbing on moderate terrain — slab and vertical.",
            "2. Introduce moderate loading: jugs, slopers.",
            "3. Reintroduce side-pulls and gastons gradually.",
            "4. Full grip loading including underclings and compression.",
            "5. Hangboard and campus board last.",
        ]

    elif "elbow" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free gripping and wrist flexion/extension under load.",
            "No pain on palpation of the affected epicondyle.",
            "Full pain-free elbow range of motion.",
            "Pain-free supination under load (distal biceps).",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Easy slab and vertical climbing at low volume.",
            "2. Introduce moderate vertical and mild overhanging terrain.",
            "3. Reintroduce board sessions at reduced intensity.",
            "4. Hangboard open-hand at reduced load — monitor after each session.",
            "5. Max-intensity bouldering and campus board — last to return.",
        ]

    elif "shoulder" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Full pain-free shoulder ROM including overhead and behind-back reach.",
            "Strength symmetry within 10% of the uninjured shoulder.",
            "Pain-free during and after a full easy climbing session.",
            "Negative provocative tests (Hawkins, Neer for impingement; O'Brien's for SLAP).",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Vertical climbing with no overhead moves — slab focus.",
            "2. Gradual overhead — introduce lower-angle overhanging terrain.",
            "3. Reintroduce pulling volume on moderate overhanging routes.",
            "4. Hard lock-offs and steep board climbing.",
            "5. Dynamic catching (dynos) — last to return.",
        ]

    elif "knee" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free single-leg squat.",
            "Pain-free walking up and down stairs.",
            "Pain-free during easy climbing with controlled footwork.",
            "Restored hip abductor strength (equal bilateral single-leg bridge hold).",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Vertical climbing with careful, controlled footwork — no heel hooks.",
            "2. Introduce moderate footwork: low-angle slab, careful high steps.",
            "3. Easy heel hooks on large, comfortable holds.",
            "4. Progressive heel hook loading — increase demand gradually.",
            "5. Drop knee — introduce last; avoid when fatigued.",
        ]

    elif "lower back" in region or "back" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free with McGill Big 3 exercises.",
            "Pain-free with a full easy vertical climbing session.",
            "No leg pain, tingling, or weakness.",
            "Able to maintain neutral spine position on overhang without pain.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Vertical and slab climbing — avoid overhanging terrain.",
            "2. Mild overhang — short sessions, monitor response.",
            "3. Board and steep climbing — gradual volume and intensity increase.",
            "4. Campus board and limit moves — last to return.",
        ]

    elif "ankle" in region or "foot" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Full pain-free weight-bearing.",
            "Single-leg balance stable for 30+ seconds on the injured side.",
            "Pain-free with ankle inversion/eversion under load.",
            "Normal gait pattern without limp.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Vertical climbing with solid, large footholds.",
            "2. Introduce smearing on less technical terrain.",
            "3. Increase footwork precision: edging, small holds.",
            "4. Aggressive footwork: heel hooks, toe hooks, drop knee.",
            "5. Full return to bouldering falls — ensure landing technique is practised.",
        ]

    elif "chest" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free with horizontal pushing and pulling movements.",
            "Full pain-free shoulder range of motion.",
            "No pain with cross-body movements or wide pinches.",
            "Able to complete a full easy climbing session without chest pain.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Slab and vertical climbing — minimal chest loading.",
            "2. Introduce moderate overhang — short sessions, monitor response.",
            "3. Cross-body pulls and gastons — progress gradually.",
            "4. Dynamic moves — reintroduce last; avoid wide catches until fully pain-free.",
        ]

    elif "neck" in region or "cervical" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Full pain-free cervical range of motion in all planes.",
            "No arm symptoms (numbness, tingling, or weakness) at rest or with movement.",
            "Pain-free during and after a full easy climbing session.",
            "Cleared by a healthcare provider if any neurological symptoms were present.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Slab and vertical climbing — avoid sustained neck extension.",
            "2. Introduce moderate terrain with controlled head positioning.",
            "3. Gradual reintroduction of overhanging terrain at low volume.",
            "4. Roof climbing and inverted positions — last to return.",
        ]

    else:
        protocol["General return-to-climbing guidance"] = [
            "Return when pain is consistently below 3/10 during and 24 hours after activity.",
            "Progress volume before intensity before frequency.",
            "Stop if pain spikes above 4/10 during a session — step back one level.",
            "Seek professional evaluation if not improving within 3–4 weeks of load reduction.",
        ]

    protocol["Universal progression rules"] = [
        "Progress only when pain is consistently <3/10 during AND 24 hours after each step.",
        "Spend minimum 1–2 weeks at each level before advancing.",
        "A pain flare means stepping back one level — not stopping entirely.",
        "Return to sport is a process, not a date.",
    ]

    return protocol


# ── Heuristic buckets ───────────────────────────────────────────────────────

def bucket_possibilities(i: Intake) -> List[Tuple[str, str]]:
    """Heuristic likely patterns given region + mechanism. Not a diagnosis."""
    region = i.region.lower()
    out: List[Tuple[str, str]] = []

    if "finger" in region:
        if i.mechanism in {"Hard crimp", "Dynamic catch", "Pocket"}:
            out.append(("Pulley strain/rupture (A2 most likely)", "Pain on palm-side at base of finger, worse with crimping. May have felt a pop."))
        if i.mechanism in {"Pocket", "Asymmetric hold"}:
            out.append(("Lumbrical tear (possible)", "Deep palm pain that worsens when other fingers are extended — distinctive pattern."))
        out.append(("Flexor tendon tenosynovitis (possible)", "Diffuse swelling along entire finger, worse after rest then with prolonged activity."))
        out.append(("Collateral ligament or joint capsule irritation (possible)", "Side-of-joint pain or persistent swelling at a finger joint."))
        if "can't straighten" in i.free_text.lower() or "pip" in i.free_text.lower():
            out.append(("Boutonnière deformity / central slip rupture (urgent)", "PIP that cannot be extended to neutral — requires splinting within 72 hours."))

    elif "wrist" in region:
        if i.mechanism in {"Hard crimp", "High volume pulling", "Dynamic catch"}:
            out.append(("Wrist flexor tendinopathy (common)", "Overuse from high-volume gripping; tender along wrist crease."))
        if i.onset == "Sudden" or i.mechanism in {"Fall", "Dynamic catch"}:
            out.append(("Scaphoid fracture (must exclude)", "Fall on outstretched hand + radial wrist pain = scaphoid screening required before climbing."))
        out.append(("TFCC irritation / tear (possible)", "Ulnar-side wrist pain from rotation, sidepulls, or gastons."))
        out.append(("De Quervain's tenosynovitis (possible)", "Base-of-thumb pain with pinch holds or sidepulls; positive Finkelstein test."))

    elif "elbow" in region:
        if i.mechanism in {"High volume pulling", "Steep climbing/board", "Campusing"}:
            out.append(("Medial epicondylitis — Climber's Elbow (most likely)", "Overuse tendinopathy; inside elbow pain worse with gripping and wrist flexion."))
        out.append(("Lateral epicondylitis (possible)", "Outside elbow pain; less common in climbers but occurs with extensor overuse."))
        if i.numbness == "Yes":
            out.append(("Cubital tunnel syndrome / ulnar nerve irritation (possible)", "Tingling in ring and pinky fingers with medial elbow pain."))
        if i.mechanism in {"Hard lock-off", "Campusing", "Dynamic catch"} and i.onset == "Sudden":
            out.append(("Distal biceps injury (possible)", "Anterior elbow pain with supination weakness — rule out complete rupture if pop occurred."))

    elif "shoulder" in region:
        out.append(("Rotator cuff tendinopathy / impingement (most common)", "Painful arc, overhead discomfort — often related to muscle imbalance in climbers."))
        if i.mechanism in {"Dynamic catch", "Dyno", "Fall"}:
            out.append(("SLAP tear (possible)", "Deep shoulder clicking with overhead pain after a dynamic load."))
        if i.instability == "Yes":
            out.append(("Shoulder instability / Bankart lesion (possible)", "Slipping sensation, especially with arm abducted and externally rotated."))
        if i.onset == "Sudden" and i.mechanism in {"Fall", "Compression"}:
            out.append(("AC joint sprain / separation (possible)", "Top-of-shoulder pain after a fall onto the shoulder or outstretched arm."))

    elif "knee" in region:
        if i.mechanism in {"Heel hook"}:
            out.append(("LCL sprain — Heel hook injury (most likely)", "Outer knee pain from rotational load during heel hook. The most common acute knee injury in boulderers."))
        if i.mechanism in {"Drop knee"}:
            out.append(("IT band syndrome (possible)", "Lateral knee pain at 30 degrees flexion; worsens with repeated drop knee."))
            out.append(("Meniscus tear (possible)", "Joint line pain with twisting under load — requires evaluation if significant swelling."))
        if i.mechanism in {"High step / rockover", "High volume climbing"}:
            out.append(("Patellar tendinopathy (possible)", "Below-kneecap pain; worse the day after climbing than during. Heel hooks are primary mechanism."))
        if i.onset == "Sudden" and i.severity >= 6:
            out.append(("Acute ligament or meniscus injury (consider evaluation)", "Sudden high-pain knee injury warrants evaluation to rule out structural damage."))

    elif "hip" in region:
        if i.mechanism in {"High step / rockover", "High volume climbing"}:
            out.append(("Hip flexor strain (common)", "Deep groin ache from repeated high stepping and rockover moves."))
        if i.mechanism in {"Heel hook", "Stemming / bridging"}:
            out.append(("Piriformis / deep gluteal irritation (possible)", "Deep buttock pain from repeated external hip rotation."))
        out.append(("Hip impingement-type irritation (possible)", "Deep groin pain at end-range hip flexion — common with FAI anatomy."))

    elif "lower back" in region or "back" in region:
        out.append(("Non-specific lower back pain (most common)", "Load-related — driven by volume on steep terrain or sudden training spikes."))
        if i.mechanism in {"Heel hook", "High step / rockover", "Stemming / bridging"}:
            out.append(("Lumbar muscle / facet strain (possible)", "Awkward loaded positions strain paraspinal muscles and facet joints."))
        if i.onset == "Sudden":
            out.append(("Lumbar disc irritation (possible)", "Sudden back pain from a loaded movement may involve disc irritation."))
        if i.numbness == "Yes":
            out.append(("Nerve root irritation / radiculopathy (possible)", "Numbness or tingling travelling down the leg warrants evaluation — especially if following a dermatomal pattern."))

    elif "ankle" in region or "foot" in region:
        if i.onset == "Sudden":
            out.append(("Lateral ankle sprain — ATFL (most common)", "Outer ankle pain after rolling the ankle. Ottawa Rules should be applied to rule out fracture."))
        out.append(("Peroneal tendon strain (possible)", "Pain behind the lateral ankle — worsens with foot eversion and smearing."))
        if i.mechanism in {"Small holds", "Tight shoes", "Approach"}:
            out.append(("Plantar fasciitis (possible)", "Heel pain worst with first steps in the morning — common from aggressive shoe downsizing."))
        if i.mechanism in {"Approach", "High volume hiking"}:
            out.append(("Achilles tendinopathy (possible)", "Posterior heel/calf pain — associated with high-mileage hiking on climbing trips."))

    elif "chest" in region:
        out.append(("Pectoralis minor / costochondral strain (common)", "Overuse from high volume pulling, steep climbing, or a sudden dynamic catch."))
        if i.onset == "Sudden" and i.mechanism in {"Dynamic / jumping move", "Powerful move / slap"}:
            out.append(("Pectoralis major strain or tear (consider evaluation)", "Sudden pop or sharp pain during a powerful cross-body or dynamic move warrants evaluation."))
        if _keyword_affirmed(i.free_text.lower(), ["rib", "ribs", "breath", "breathe"]):
            out.append(("Rib stress / costochondritis (possible)", "Localised rib pain that worsens with breathing, coughing, or twisting. Can result from repeated rib cage loading on overhangs."))
        if i.onset == "Gradual":
            out.append(("Serratus anterior / intercostal overuse (possible)", "Dull ache along the ribcage from sustained isometric loading on steep terrain."))

    elif "neck" in region or "cervical" in region:
        out.append(("Cervical muscle strain (common)", "Neck stiffness and pain from sustained overhead positions or awkward body positions on the wall."))
        if i.numbness == "Yes":
            out.append(("Cervical radiculopathy (possible)", "Numbness or tingling radiating into the arm from a compressed nerve root in the neck — warrants evaluation."))
        if i.severity >= 6 and i.onset == "Sudden":
            out.append(("Acute cervical disc injury (consider evaluation)", "Sudden high-intensity neck pain may involve disc irritation — imaging recommended."))
        if i.onset == "Gradual":
            out.append(("Cervical facet irritation (possible)", "Gradually worsening neck stiffness from repeated sustained positions — common in roof climbers."))

    else:
        out.append(("Overuse / load spike pattern (common)", "Often driven by sudden increases in intensity, volume, or frequency."))

    # If symptoms are severe and sudden, surface a higher-concern bucket first
    if i.onset == "Sudden" and i.severity >= 7:
        out.insert(0, ("Acute tissue injury (consider evaluation)", "High pain with sudden onset can indicate significant tissue damage."))

    return out[:4]


# ── Conservative guidance plan ──────────────────────────────────────────────

def conservative_plan(i: Intake) -> Dict[str, List[str]]:
    """Conservative guidance template grouped into UI sections (load management focus)."""
    region = i.region.lower()
    plan: Dict[str, List[str]] = {}

    if "finger" in region:
        avoid_specific = "Avoid full crimping, pockets, and dynamic catches on the affected finger(s)."
    elif "wrist" in region:
        avoid_specific = "Avoid side-pulls, gastons, underclings, and twisting loads that aggravate wrist symptoms."
    elif "elbow" in region:
        avoid_specific = "Avoid full lock-offs, campus moves, and high-volume pulling that loads the elbow."
    elif "shoulder" in region:
        avoid_specific = "Avoid overhead reaching, high lock-offs, and steep or inverted climbing that reproduces pain."
    elif "knee" in region:
        avoid_specific = "Avoid heel hooks, drop knees, and aggressive high steps that load the knee."
    elif "hip" in region:
        avoid_specific = "Avoid high steps, wide stems, and aggressive rockovers that reproduce hip pain."
    elif "lower back" in region or "back" in region:
        avoid_specific = "Avoid steep overhanging climbing and campus moves that load the lumbar spine."
    elif "ankle" in region or "foot" in region:
        avoid_specific = "Avoid smearing, heel hooks, and aggressive footwork until the ankle is stable and pain-free."
    elif "chest" in region:
        avoid_specific = "Avoid dynamic moves, wide pinches, gastons, and cross-body pulls that reproduce chest pain."
    elif "neck" in region or "cervical" in region:
        avoid_specific = "Avoid roof climbing, inverted positions, and overhead positions that reproduce neck or arm symptoms."
    else:
        avoid_specific = "Avoid movements or grip styles that reproduce your symptoms."

    plan["Immediate next 7–10 days"] = [
        "Reduce climbing intensity and volume; avoid moves that reproduce sharp pain.",
        "Keep pain during any activity at or below 3/10 — do not push through sharp pain.",
        avoid_specific,
        "If symptoms worsen day-to-day despite load reduction, seek professional evaluation.",
    ]

    plan["Return to climbing (progression)"] = [
        "Start with easy sessions that keep symptoms mild during and after.",
        "Increase only one variable at a time: volume OR intensity OR frequency.",
        "If pain spikes or persists >24–48 hours after a session, step back one level.",
        "Use the 24-hour rule as your primary guide — not how it feels during the session.",
    ]

    plan["What to avoid for now"] = [
        avoid_specific,
        "Max efforts, limit boulders, and repeated high-intensity attempts.",
        "High-volume steep pulling if elbow or shoulder symptoms are present.",
    ]

    plan["When to get checked"] = [
        "Any red flags: numbness, significant weakness, instability, major bruising or swelling.",
        "A pop or snap at the time of injury — especially in the finger, elbow, or ankle.",
        "Symptoms not improving after 2–3 weeks of load reduction.",
        "Pain severe at rest, or progressively worsening despite rest.",
    ]

    return plan
