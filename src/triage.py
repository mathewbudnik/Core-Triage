from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


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
    # Optional contextual fields supplied by the upgraded wizard (Phase 5).
    # All default-empty so existing callers keep working unchanged.
    pain_trajectory: str = ""        # "better" | "same" | "worse" | ""
    functional_check: str = ""       # "yes" | "no" | "painful" | ""
    prior_injury: str = ""           # "yes" | "no" | ""
    duration_weeks: int = 0           # 0 = unknown
    years_climbing: str = ""         # "<1" | "1-3" | "3-5" | "5+" | ""
    hangboard_user: str = ""         # "yes" | "no" | ""
    climbing_situation: str = ""     # free-form key (e.g. "heel_hook")
    pop_reported: bool = False
    visible_deformity: bool = False
    bilateral_symptoms: bool = False
    bladder_bowel_change: bool = False
    # Finger-specific drill-down (Phase 6). Filled by the wizard only when
    # region == "Finger"; left blank otherwise. Drives the rewritten Finger
    # branch in bucket_possibilities(); blank values fall through to the
    # legacy generic fallback so existing callers keep working unchanged.
    which_finger: str = ""       # Index | Middle | Ring | Pinky | Thumb | Multiple | ""
    finger_location: str = ""    # palm_base | palm_mid | palm_tip | side | dorsal | whole | ""
    grip_mode: str = ""          # full_crimp | half_crimp | open_hand | pocket_1 | pocket_2 |
                                 # pinch | sloper | jam | not_climbing | ""


# ── Bucket dataclass ────────────────────────────────────────────────────────
# A differential surfaced by bucket_possibilities(). Content (matches_if etc)
# lives in src/bucket_content.py keyed by `id` — keeping branching logic in
# triage.py separate from the prose the UI displays.
@dataclass(frozen=True)
class Bucket:
    id: str
    title: str
    why: str
    matches_if: List[str]
    not_likely_if: List[str]
    quick_test: str

    @classmethod
    def from_id(cls, id: str, qualifier: Optional[str] = None) -> "Bucket":
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


# ── Negation-aware keyword matching ────────────────────────────────────────
# Simple substring matching ("bladder" in text) fires on "no bladder symptoms".
# This helper checks that the matched keyword is not preceded by a negation word.

# Includes common contractions because climbers naturally write "didn't pop"
# rather than "did not pop" — without these, the affirmation check would
# incorrectly fire on the keyword inside the negated clause.
_NEG_WORDS = frozenset({
    "no", "not", "without", "denies", "none", "negative", "absent", "deny", "never",
    "didn't", "doesn't", "don't", "wasn't", "weren't", "isn't", "aren't",
    "won't", "wouldn't", "can't", "couldn't", "shouldn't",
    "hadn't", "hasn't", "haven't",
})


def _keyword_affirmed(text: str, keywords: list) -> bool:
    """True only when a keyword appears without a negation in the four preceding words.

    Supports both single-token and multi-word keywords. For multi-word keywords
    (e.g. "tendon lifting"), the keyword's first token is searched against each
    word in the text, then the remaining tokens must appear contiguously after
    it. The four-word negation window precedes the matched first token.

    A four-word window handles 'no X or Y' patterns (e.g. 'no bladder or bowel issues').
    False positives (over-flagging) are preferred over false negatives for safety flags."""
    words = text.split()
    for i, word in enumerate(words):
        for kw in keywords:
            kw_tokens = kw.split()
            if len(kw_tokens) == 1:
                if kw_tokens[0] in word:
                    context = words[max(0, i - 4):i]
                    if not any(n in context for n in _NEG_WORDS):
                        return True
            else:
                if i + len(kw_tokens) > len(words):
                    continue
                if kw_tokens[0] not in word:
                    continue
                # Allow trailing punctuation in subsequent tokens (e.g. "shortened,").
                tail = words[i + 1: i + len(kw_tokens)]
                if all(t in w for t, w in zip(kw_tokens[1:], tail)):
                    context = words[max(0, i - 4):i]
                    if not any(n in context for n in _NEG_WORDS):
                        return True
    return False


# ── Urgent referral flags ───────────────────────────────────────────────────
# This app is for self-diagnosable climbing injuries. True medical emergencies
# (open fractures, cauda equina, neurovascular compromise, sepsis, cord
# compression) belong in an ER, not here — the disclaimer covers that case.
#
# What stays here are climbing-recognizable injuries that benefit from prompt
# specialist evaluation but are NOT 911 territory: pulley rupture (bowstringing),
# distal bicep tendon rupture, locked knee, Achilles rupture, pec major tear.

def get_urgent_flags(i: Intake) -> List[str]:
    """Return urgent-referral flags for climbing-recognizable injuries that warrant
    prompt specialist evaluation. Not 911-tier — this app is not the right tool
    for someone with a true medical emergency."""
    flags: List[str] = []
    region = i.region.lower()
    text   = i.free_text.lower()

    # Visible bowstringing — multi-pulley rupture (climbing-classic)
    if "finger" in region and _keyword_affirmed(text, [
        "bowstring", "bow string", "cord visible", "tendon visible",
        "tendon lifting", "tendon jumping", "cord jumping", "cord lifting",
        "tendon moves", "tendon popping", "cord across", "tendon pops",
        "visibly lifting", "lifting off", "tendon away", "lifting away",
    ]):
        flags.append(
            "Visible bowstringing (the flexor tendon lifting away from the bone when you "
            "flex the finger) suggests a multi-pulley rupture. See a hand specialist "
            "before any return to climbing — imaging is usually required."
        )

    # Boutonnière deformity — central slip rupture at the PIP joint. Has a
    # 72-hour splinting window before deformity becomes permanent, so it's
    # urgent enough to escalate severity.
    if "finger" in region and _keyword_affirmed(text, [
        "won't straighten", "wont straighten", "cannot straighten", "can't straighten",
        "won't extend", "wont extend", "cannot extend", "can't extend",
        "stuck bent", "stuck flexed", "pip won't", "central slip",
        "boutonniere", "boutonnière", "joint won't",
    ]):
        flags.append(
            "A finger joint that cannot actively straighten (PIP joint stuck bent) may "
            "indicate a central slip rupture / Boutonnière deformity. There is roughly a "
            "72-hour splinting window before this becomes permanent — see a hand "
            "specialist or urgent care today."
        )

    # Distal bicep tendon rupture — Popeye look after a campus / hard lockoff pop
    if "elbow" in region and _keyword_affirmed(text, [
        "popeye", "deformity", "muscle moved", "bunched", "bunching", "bunches",
        "muscle lump", "muscle moved up", "bulge in arm", "muscle shifted",
        "retracted", "lump near shoulder",
    ]):
        flags.append(
            "A 'Popeye' look in the upper arm after a pop at the elbow suggests a complete "
            "distal biceps tendon rupture. There is roughly a 2–3 week window where surgical "
            "reattachment gives the best outcome — see an orthopaedic surgeon promptly."
        )

    # Locked knee — mechanically cannot extend (not just pain-limited)
    if "knee" in region and _keyword_affirmed(text, [
        "locked", "cannot straighten", "can't straighten", "won't extend",
        "stuck at", "cannot extend", "won't straighten", "unable to straighten",
    ]):
        flags.append(
            "A locked knee — one that mechanically cannot be straightened (not just "
            "pain-limited) — may indicate a displaced meniscal tear or loose body. "
            "See a sports medicine doctor or orthopaedist within a few days. "
            "Do not force the knee into extension."
        )

    # Achilles tendon rupture — common on climbing-trip approach hikes
    if ("ankle" in region or "foot" in region) and i.weakness == "Significant":
        if _keyword_affirmed(text, ["snap", "pop", "tiptoe", "plantarflex"]):
            flags.append(
                "Inability to push up on tiptoe after a snap at the back of the ankle "
                "suggests an Achilles tendon rupture. See an orthopaedist or sports doctor "
                "promptly — earlier evaluation gives more treatment options."
            )

    # Pec major tear — dynamic catch / big cross-body pull
    if "chest" in region and i.onset == "Sudden":
        if _keyword_affirmed(text, ["pop", "snap", "tear", "rip", "deformity", "retracted"]):
            flags.append(
                "A sudden pop in the chest or armpit during a powerful pull or dynamic catch "
                "may indicate a pectoralis major tear. See an orthopaedist promptly to "
                "discuss treatment options."
            )

    return flags


# Backwards-compatible alias — older callers and tests may still import this name.
def get_emergency_flags(i: Intake) -> List[str]:
    """Deprecated alias for get_urgent_flags. The 911-tier "emergency" concept was
    removed from this app; see get_urgent_flags for the current behavior."""
    return get_urgent_flags(i)


# ── Standard safety screen ──────────────────────────────────────────────────

def red_flags(i: Intake) -> List[str]:
    """Returns reasons to seek evaluation based on common red flags.
    Urgent climbing-relevant referrals appear first, then standard flags."""
    flags: List[str] = get_urgent_flags(i)
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

    # Wrist / fall on outstretched hand — scaphoid red flag (treat-as-fracture)
    if "wrist" in region and i.onset == "Sudden":
        flags.append(
            "Sudden wrist injury — if there is tenderness at the base of the thumb (anatomical snuffbox), "
            "treat as a scaphoid fracture until imaging clears it, regardless of an initial negative X-ray. "
            "An undetected scaphoid fracture can lead to avascular necrosis. CT or MRI may be required."
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

    # Calf — acute compartment syndrome (disproportionate pain + tightness ± neuro symptoms).
    if ("calf" in region or "calves" in region) and i.severity >= 8 and (
        i.numbness == "Yes"
        or _keyword_affirmed(text, ["tight", "swollen", "rock hard", "won't release", "feels like bursting"])
    ):
        flags.append(
            "Severe disproportionate calf pain with tightness, swelling, or numbness can indicate acute "
            "compartment syndrome — a surgical emergency requiring immediate evaluation. Do not wait."
        )

    # Knee — mechanical block (locked, unable to fully extend).
    if "knee" in region and _keyword_affirmed(text, [
        "locked", "stuck", "can't straighten", "cannot straighten",
        "won't extend", "unable to straighten",
    ]):
        flags.append(
            "A knee that won't fully extend (locked or 'stuck') may indicate a meniscal lock, loose body, "
            "or ACL bucket-handle tear — requires evaluation before any return to load."
        )

    # Hamstring — proximal avulsion screen (sudden + severe + bruising or audible pop).
    if "hamstring" in region and i.onset == "Sudden" and i.severity >= 8 and (
        i.bruising == "Yes" or _keyword_affirmed(text, ["pop", "snap", "tore"])
    ):
        flags.append(
            "Sudden severe proximal hamstring pain with bruising or an audible pop can indicate a proximal "
            "hamstring avulsion — surgical repair within 2–4 weeks dramatically improves outcomes."
        )

    # Chest — severe pain or breathing changes (cardiopulmonary screen takes precedence).
    if "chest" in region and (
        i.severity >= 8
        or _keyword_affirmed(text, ["can't breathe", "shortness of breath", "trouble breathing", "short of breath"])
    ):
        flags.append(
            "Severe chest pain or any change in breathing requires immediate medical evaluation to rule out "
            "cardiac or pulmonary causes before any musculoskeletal diagnosis."
        )

    # Abdomen — hernia screen (visible bulge during exertion) and visceral pain screen.
    if "abs" in region or "abdomin" in region:
        if i.visible_deformity or _keyword_affirmed(text, [
            "bulge", "lump", "sticks out", "pokes out", "ball under the skin",
        ]):
            flags.append(
                "A visible bulge or lump in the abdomen — especially one that becomes more obvious with "
                "straining, coughing, or hard pulling — can indicate an abdominal wall hernia. Evaluation "
                "is recommended before returning to climbing load."
            )
        if i.severity >= 8 and _keyword_affirmed(text, [
            "fever", "vomit", "vomiting", "can't walk", "cannot walk",
            "radiating", "rigid", "blood",
        ]):
            flags.append(
                "Severe abdominal pain with fever, vomiting, blood, rigidity, or pain that prevents "
                "walking can indicate a visceral cause (appendicitis, internal injury) — seek immediate "
                "medical evaluation rather than musculoskeletal triage."
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
    """Classify injury severity and return recommended action.

    Top tier is 'severe' — this app does not surface 911-level emergencies.
    Any urgent climbing-relevant referral (bowstringing, distal bicep tear,
    locked knee, Achilles rupture, pec tear) escalates to severe."""
    score = i.severity
    has_neuro    = i.numbness == "Yes" or i.weakness == "Significant"
    has_instab   = i.instability == "Yes"
    sudden_high  = i.onset == "Sudden" and score >= 7
    has_urgent   = bool(get_urgent_flags(i))

    if score >= 8 or has_neuro or sudden_high or has_instab or has_urgent:
        return {
            "level": "severe",
            "label": "Severe",
            "action": "See a healthcare provider within 24–48 hours. Do not climb until evaluated.",
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

    elif "tricep" in region:
        modifications["Permitted during recovery"] = [
            "Easy slab and vertical climbing — minimal lock-off load.",
            "Antagonist work: face pulls, band pull-aparts, scapular control.",
            "Lower body and core training.",
        ]
        modifications["Avoid"] = [
            "Heavy lock-offs and one-arm hangs.",
            "Campus board and mantling drills during the acute phase.",
            "Steep board sessions that demand sustained triceps engagement.",
            "Any pull that reproduces sharp pain in the back of the upper arm or elbow.",
        ]
        modifications["Return to climbing progression"] = [
            "Reintroduce lock-offs gradually — bent-arm pulling first, full lock-off last.",
            "Mantling and campus moves return after lock-off strength is restored pain-free.",
            "Triceps issues often pair with elbow tendinopathy — address both together.",
        ]

    elif "upper back" in region or "trap" in region or "rhomboid" in region:
        modifications["Permitted during recovery"] = [
            "Slab and vertical climbing at low intensity — focus on relaxed shoulders.",
            "Scapular control work: prone Y-T-W raises, band pull-aparts, serratus wall slides.",
            "Lower body and core training (no loaded shrug positions).",
        ]
        modifications["Avoid"] = [
            "Steep overhanging terrain and board climbing — heavy scapular load.",
            "Hangboard repeaters with shrugged shoulders.",
            "Campus board until upper-back endurance is restored.",
            "Any pull that reproduces sharp pain between the shoulder blades.",
        ]
        modifications["Return to climbing progression"] = [
            "Cue active scap depression on every hang and pull during return.",
            "Reintroduce volume on vertical first, then steep terrain.",
            "Check posture and breathing patterns — chronic shrugging is often the root cause.",
        ]

    elif "lat" in region or "latissimus" in region:
        modifications["Permitted during recovery"] = [
            "Easy slab and vertical climbing — minimal pulling load.",
            "Lower body and core training.",
            "Gentle band external rotation and scap retraction (antagonist work).",
        ]
        modifications["Avoid"] = [
            "Hangboard, campus board, and steep board climbing during the acute phase.",
            "Dynamic catches, full hangs, and dyno landings.",
            "Heavy lock-offs on overhanging terrain.",
            "Any pull that reproduces sharp pain in the side of the back or armpit.",
        ]
        modifications["Return to climbing progression"] = [
            "Reintroduce moderate hangs before any loaded pulls.",
            "Lat strains heal slowly — expect 6–12 weeks before full intensity.",
            "Test dynamic catches last; the eccentric load is what re-injures.",
        ]

    elif "glute" in region or "buttock" in region:
        modifications["Permitted during recovery"] = [
            "Easy vertical climbing avoiding aggressive heel hooks and wide stems.",
            "Upper body and core training.",
            "Glute med activation: side-lying clamshells, single-leg bridges, lateral band walks.",
        ]
        modifications["Avoid"] = [
            "Heavy heel hooks — primary aggravator for piriformis and biceps femoris.",
            "Wide drop knees and aggressive stems that load deep external rotators.",
            "Prolonged sitting (drives piriformis irritation).",
            "Any movement that reproduces deep buttock pain or sciatic-type symptoms.",
        ]
        modifications["Return to climbing progression"] = [
            "Reintroduce heel hooks last — start on large, comfortable holds at low intensity.",
            "Address single-leg stability first; glute med weakness drives recurrence.",
            "Long approach hikes are fine if they don't reproduce symptoms.",
        ]

    elif "hamstring" in region:
        modifications["Permitted during recovery"] = [
            "Slab and vertical climbing avoiding heel hooks.",
            "Upper body, core, and quad-dominant lower-body work.",
            "Isometric hamstring work (e.g. wall heel pulls) once acute pain settles.",
        ]
        modifications["Avoid"] = [
            "Heel hooks — primary mechanism. Last movement to reintroduce.",
            "Heavy hip hinges or deadlifts during acute phase.",
            "Sprinting and jumping until pain-free with full extension.",
            "Prolonged sitting on hard surfaces (proximal hamstring tendinopathy).",
        ]
        modifications["Return to climbing progression"] = [
            "Heel hooks return in stages: comfortable hold → harder hold → progressively more pull.",
            "Proximal hamstring tendinopathy is slow — 3–6 months of consistent loading isn't unusual.",
            "Expect a flare or two during reload; manage with the 24-hour rule, don't stop entirely.",
        ]

    elif "calf" in region or "calves" in region or "gastroc" in region or "soleus" in region:
        modifications["Permitted during recovery"] = [
            "Vertical climbing on solid footholds.",
            "Upper body training: hangboard, pulling, shoulder work.",
            "Isometric calf raises in pain-free range; progress to slow eccentrics.",
        ]
        modifications["Avoid"] = [
            "Aggressive smearing on slab — high calf load.",
            "Long approach hikes during the acute phase.",
            "Calf raises through pain.",
            "Multi-pitch days until full pain-free walking and climbing are restored.",
        ]
        modifications["Return to climbing progression"] = [
            "Walk → hike → smear → multi-pitch is the sensible reload order.",
            "Heavy approach packs add load — drop pack weight while reloading.",
            "Calf strains often recur — finish rehab fully before returning to long days.",
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

    elif "tricep" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free with a body-weight lock-off held at 90 degrees.",
            "Pain-free with weighted dips or close-grip pushing at moderate load.",
            "Symmetrical strength side-to-side on isolated triceps testing.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Vertical climbing with bent-arm pulling — no full lock-offs.",
            "2. Moderate overhanging terrain at low intensity.",
            "3. Reintroduce lock-offs progressively, starting bent-arm.",
            "4. Mantling and campus moves — last to return.",
        ]

    elif "upper back" in region or "trap" in region or "rhomboid" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free between the shoulder blades during and after an easy session.",
            "Active scapular control through full overhead range with no compensation.",
            "Symmetrical strength on prone Y-T-W and band pull-aparts.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Vertical climbing with relaxed shoulders, scap retraction cued.",
            "2. Moderate vertical and mild overhang at low volume.",
            "3. Steeper terrain — monitor for upper-trap dominance / shrugging.",
            "4. Hangboard repeaters — last; prioritize active scap depression.",
        ]

    elif "lat" in region or "latissimus" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free hangs at body weight on a comfortable grip.",
            "Pain-free pulling through full overhead range.",
            "No reproduction of symptoms with provocative resisted shoulder extension.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Easy slab and vertical — minimal pulling.",
            "2. Moderate hangs, then assisted pull-ups at body weight.",
            "3. Steep board climbing at low intensity.",
            "4. Dynamic catches and dynos — last to return.",
        ]

    elif "glute" in region or "buttock" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free single-leg stability and bridge holds.",
            "No deep buttock or sciatic-type symptoms with hip rotation under load.",
            "Pain-free through a full easy climbing session including some heel hooks.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Vertical climbing with no heel hooks or wide stems.",
            "2. Easy heel hooks on large, comfortable holds at low intensity.",
            "3. Progressive heel hook loading and moderate drop knees.",
            "4. Aggressive heel hook pulling and wide bridging — last to return.",
        ]

    elif "hamstring" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free with full active and passive hip flexion.",
            "Symmetrical strength on isometric hamstring testing.",
            "Pain-free walking, hiking, and easy climbing without heel hooks.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Vertical climbing with no heel hooks; isometric hamstring loading off the wall.",
            "2. Easy heel hooks on large, comfortable holds.",
            "3. Heavier heel hook pulling — increase demand gradually.",
            "4. Maximal heel hooks on hard moves — last to return.",
        ]

    elif "calf" in region or "calves" in region or "gastroc" in region or "soleus" in region:
        protocol["Criteria before returning to full climbing"] = [
            "Pain-free with single-leg calf raises, full reps and full range.",
            "Pain-free walking and easy hiking on flat and uphill terrain.",
            "Pain-free smearing on slab during a full easy session.",
        ]
        protocol["Progressive loading sequence"] = [
            "1. Vertical climbing on solid footholds — minimal smearing.",
            "2. Reintroduce smearing on less technical terrain.",
            "3. Approach hikes with light pack at moderate distance.",
            "4. Multi-pitch and full approach days — last to return.",
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

def bucket_possibilities(i: Intake) -> List[Bucket]:
    """Heuristic likely patterns given region + mechanism. Not a diagnosis."""
    region = i.region.lower()
    out: List[Bucket] = []

    if "finger" in region:
        wf, loc, grip = i.which_finger, i.finger_location, i.grip_mode
        text_l = i.free_text.lower()

        # ── URGENT patterns first ─────────────────────────────────────────
        # Mallet finger — extensor avulsion at DIP, splint within 1 week
        if (
            "can't extend tip" in text_l
            or "cannot extend tip" in text_l
            or "tip droops" in text_l
            or "mallet" in text_l
        ):
            out.append(Bucket.from_id("mallet_finger", qualifier="urgent"))

        # Jersey finger — FDP avulsion, surgical within 7-14 days
        if (
            wf == "Ring"
            and i.onset == "Sudden"
            and (
                "can't bend tip" in text_l
                or "cannot bend tip" in text_l
                or "can't flex tip" in text_l
                or grip == "jam"
            )
        ):
            out.append(Bucket.from_id("jersey_finger", qualifier="urgent"))

        # Boutonnière — central slip rupture, splint within 72h
        if (
            "can't straighten" in text_l
            or "won't extend" in text_l
            or "stuck bent" in text_l
            or "boutonniere" in text_l
        ):
            out.append(Bucket.from_id("boutonniere", qualifier="urgent"))

        # ── PULLEY patterns ───────────────────────────────────────────────
        if (
            loc == "palm_mid"
            and grip in {"full_crimp", "half_crimp"}
            and wf in {"Ring", "Middle", "Index"}
        ):
            out.append(Bucket.from_id("pulley_a2", qualifier="most likely"))
        elif loc == "palm_tip" and grip in {"full_crimp", "half_crimp"}:
            out.append(Bucket.from_id("pulley_a4", qualifier="likely"))
        elif loc == "palm_mid" and grip in {"half_crimp", "open_hand"}:
            out.append(Bucket.from_id("pulley_a3", qualifier="possible"))

        # ── LUMBRICAL — pocket grip on the palmar lumbrical region ───────
        if grip in {"pocket_1", "pocket_2"} and loc in {"palm_base", "palm_mid"}:
            out.append(Bucket.from_id("lumbrical_tear", qualifier="likely"))

        # ── COLLATERAL — side-of-joint pain on sudden injury or jam ──────
        if loc == "side" and (i.onset == "Sudden" or grip == "jam"):
            out.append(Bucket.from_id("collateral_ligament_finger", qualifier="likely"))

        # ── VOLAR PLATE — dorsal/side joint pain with hyperextension text
        if loc in {"dorsal", "side"} and (
            "hyperextend" in text_l
            or "jammed back" in text_l
            or "bent backward" in text_l
            or "bent back" in text_l
        ):
            out.append(Bucket.from_id("volar_plate", qualifier="likely"))

        # ── SAGITTAL BAND — middle/ring extensor tendon slip ─────────────
        if loc == "dorsal" and wf in {"Middle", "Ring"} and (
            "pop on top" in text_l
            or "tendon shifts" in text_l
            or "tendon slips" in text_l
            or "knuckle pops" in text_l
        ):
            out.append(Bucket.from_id("sagittal_band_rupture", qualifier="likely"))

        # ── HAMATE HOOK — pinky-side palm pain from jamming ──────────────
        if wf == "Pinky" and (
            grip == "jam"
            or "pinky-side palm" in text_l
            or "ulnar palm" in text_l
            or "hamate" in text_l
        ):
            out.append(Bucket.from_id("hamate_hook_fracture", qualifier="consider evaluation"))

        # ── TRIGGER FINGER — chronic catching ────────────────────────────
        if i.onset == "Gradual" and (
            "catch" in text_l
            or "lock" in text_l
            or "stuck" in text_l
            or "trigger" in text_l
        ):
            out.append(Bucket.from_id("trigger_finger", qualifier="possible"))

        # ── PIP SYNOVITIS — chronic mid-joint swelling ───────────────────
        if i.onset == "Gradual" and loc == "palm_mid" and i.swelling == "Yes":
            out.append(Bucket.from_id("pip_synovitis", qualifier="common"))

        # (Legacy fallback + tail catch-all added in Task 8.)

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
        text_l = i.free_text.lower()
        out.append(Bucket.from_id("rhomboid_midtrap_strain", qualifier="most common"))
        out.append(Bucket.from_id("upper_trap_overactivity", qualifier="common"))
        out.append(Bucket.from_id("thoracic_spine_hypomobility", qualifier="common"))
        if i.mechanism in {"Hard lock-off", "High volume pulling", "Steep climbing/board"}:
            out.append(Bucket.from_id("scapular_dyskinesis", qualifier="possible"))
        out.append(Bucket.from_id("levator_scapulae_strain", qualifier="possible"))
        if _keyword_affirmed(text_l, ["breath", "deep breath", "rib", "twist", "rotation"]):
            out.append(Bucket.from_id("costovertebral_rib_dysfunction", qualifier="possible"))
        out.append(Bucket.from_id("cervicothoracic_junction_strain", qualifier="possible"))

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
        text_l = i.free_text.lower()
        if i.onset == "Sudden" and (i.mechanism in {"Heel hook", "High step / rockover", "Fall"} or _keyword_affirmed(text_l, ["pop", "snap", "felt a tear", "tore"])):
            out.append(Bucket.from_id("tennis_leg", qualifier="likely"))
        if i.onset == "Sudden":
            out.append(Bucket.from_id("calf_strain_gastroc", qualifier="most likely"))
            out.append(Bucket.from_id("plantaris_rupture", qualifier="possible"))
        out.append(Bucket.from_id("soleus_strain", qualifier="possible"))
        if i.mechanism in {"High volume climbing", "High step / rockover"} or _keyword_affirmed(text_l, ["approach", "hiking", "downhill", "long walk"]):
            out.append(Bucket.from_id("posterior_tibial_tendinopathy", qualifier="possible"))
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
    elif "tricep" in region:
        avoid_specific = "Avoid heavy lock-offs, mantling, and campus moves until pain settles."
    elif "upper back" in region or "trap" in region or "rhomboid" in region:
        avoid_specific = "Avoid steep board climbing, heavy hangboard repeaters, and shrugged-shoulder pulling that reproduces upper-back pain."
    elif "lat" in region or "latissimus" in region:
        avoid_specific = "Avoid hangboard work, dynamic catches, full hangs, and heavy steep pulling until pain settles."
    elif "glute" in region or "buttock" in region:
        avoid_specific = "Avoid heavy heel hooks, wide drop knees, prolonged sitting, and aggressive stems that reproduce deep buttock pain."
    elif "hamstring" in region:
        avoid_specific = "Avoid heel hooks, heavy hip hinges, and prolonged sitting on hard surfaces."
    elif "calf" in region or "calves" in region or "gastroc" in region or "soleus" in region:
        avoid_specific = "Avoid aggressive smearing, long approach hikes, and calf raises through pain."
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


# ── Severity tone gating (Phase 3) ───────────────────────────────────────────
#
# The classifier above (classify_severity) is preserved for the pre-existing
# /api/triage flow. The functions below add the tone-gating layer specified in
# the Phase 3 calibration. They are additive — no existing function signature
# changes.

TONE_REASSURING = "reassuring"
TONE_INFORMATIVE = "informative"
TONE_URGENT = "urgent"
TONE_EMERGENCY = "emergency"

# Words that must NOT appear in REASSURING / INFORMATIVE output. The validator
# raises ToneValidationError so the caller can regenerate.
_BANNED_SOFT_WORDS = (
    "emergency", "immediately", "danger", "serious", "critical",
    "urgent", "rupture", "surgical", "911",
)


class ToneValidationError(ValueError):
    """Raised when output text is mismatched to its declared tone."""


def _has_pop_in_text(text: str) -> bool:
    """True if free-text describes an audible / felt pop, snap, crack, or tear at injury time."""
    try:
        return _keyword_affirmed(text.lower(), ["pop", "snap", "crack", "tore", "tear"])
    except Exception:
        return False


def _has_neuro(i: Intake) -> bool:
    """True if the intake reports a meaningful neurological pattern.

    A single weak signal (e.g. someone marking 'Yes' for numbness because their
    hand fell asleep once) shouldn't escalate severity. We require a pattern:

    - `weakness == "Significant"` is an explicit choice (the user picked
      Significant out of None/Mild/Significant), so it qualifies on its own.
    - `numbness == "Yes"` qualifies only when paired with another signal —
      moderate-or-higher pain (>= 4) OR a functional limitation. Transient
      paresthesia with otherwise mild presentation should NOT escalate.
    - `bilateral_symptoms` qualifies only when paired with actual neuro
      symptoms (numbness or weakness). Bilateral aches alone are usually
      overuse, not neuro.
    """
    try:
        score = i.severity or 0
        func_limit = i.functional_check == "no"
        # Strong signal — explicit "Significant" choice
        if i.weakness == "Significant":
            return True
        # Numbness + supporting signal
        if i.numbness == "Yes" and (score >= 4 or func_limit):
            return True
        # Bilateral + actual neuro evidence (not just bilateral aches)
        if i.bilateral_symptoms and (i.numbness == "Yes" or i.weakness in {"Mild", "Significant"}):
            return True
        return False
    except Exception:
        return False


def classify_severity_v2(i: Intake) -> Dict[str, str]:
    """Phase 3 severity classifier with explicit thresholds.

    Top tier is 'severe' — this app does not surface 911-tier emergencies.
    Severe means "see a provider in 24–48h, don't climb until cleared."
    Logic precedence: severe -> moderate -> mild.
    """
    try:
        urgent_flags = get_urgent_flags(i)
    except Exception:
        urgent_flags = []

    score = i.severity or 0
    text = (i.free_text or "").lower()
    pop = _has_pop_in_text(i.free_text or "") or i.pop_reported
    neuro = _has_neuro(i)
    # "Visible swelling within first hour" — only treat as severe when the text
    # explicitly describes rapid swelling, not just any swelling on a sudden onset.
    rapid_swelling = i.swelling == "Yes" and i.onset == "Sudden" and _keyword_affirmed(
        text, ["minutes", "rapidly", "immediately", "instantly", "within"]
    )
    duration = i.duration_weeks or 0
    sig_func_limit = i.functional_check == "no" or i.weakness == "Significant"
    # Scaphoid red flag — fall on outstretched hand + snuffbox tenderness.
    scaphoid_signal = (
        "wrist" in (i.region or "").lower()
        and i.onset == "Sudden"
        and _keyword_affirmed(text, ["snuffbox", "scaphoid"])
    )

    # SEVERE — any one. Note duration alone no longer escalates: chronic mild
    # symptoms are normal climbing wear and tear, not a reason to alarm anyone.
    if (
        urgent_flags
        or score >= 7
        or pop
        or sig_func_limit
        or rapid_swelling
        or neuro
        or scaphoid_signal
    ):
        return {
            "level": "severe",
            "label": "Severe",
            "action": "See a healthcare provider within 24–48 hours. Do not return to climbing until evaluated.",
            "can_climb": "No — rest until evaluated.",
        }

    acute_no_pop = i.onset == "Sudden" and not pop
    mild_func_limit = i.functional_check == "painful"
    prior_same_region = i.prior_injury == "yes"
    chronic_4w_plus = duration >= 4

    # MODERATE — any one
    if (
        score >= 4
        or acute_no_pop
        or mild_func_limit
        or chronic_4w_plus
        or prior_same_region
    ):
        return {
            "level": "moderate",
            "label": "Moderate",
            "action": "Worth getting evaluated by a physio or doctor if symptoms persist beyond 1–2 weeks.",
            "can_climb": "Modified only — keep pain at or below 3/10.",
        }

    # MILD — everything else
    return {
        "level": "mild",
        "label": "Mild",
        "action": "Manage with load reduction and monitor. Most climbers recover fully.",
        "can_climb": "Yes — with modifications; avoid aggravating movements.",
    }


def classify_tone(i: Intake) -> str:
    """Map the severity level to a tone constant. The classifier no longer
    returns the emergency tier, so the emergency tone is never produced from
    here — TONE_EMERGENCY remains for back-compat of imports only."""
    try:
        level = classify_severity_v2(i)["level"]
    except Exception:
        return TONE_INFORMATIVE
    if level == "severe":
        return TONE_URGENT
    if level == "moderate":
        return TONE_INFORMATIVE
    return TONE_REASSURING


def validate_tone_text(text: str, tone: str) -> None:
    """Raise ToneValidationError if `text` contains banned words for a soft tone.

    REASSURING and INFORMATIVE tones must not contain alarming language;
    URGENT and EMERGENCY tones are not validated by this function (they may
    legitimately use any of the banned words)."""
    if not isinstance(text, str):
        raise ToneValidationError("validate_tone_text expects a string input")
    if tone not in (TONE_REASSURING, TONE_INFORMATIVE):
        return
    lower = text.lower()
    hits = [w for w in _BANNED_SOFT_WORDS if w in lower]
    if hits:
        raise ToneValidationError(
            f"Text declared tone={tone!r} contains banned alarming words: {sorted(set(hits))}"
        )


# ── Output gating helpers (Phase 3) ──────────────────────────────────────────

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


def format_red_flags_for_tone(flags: List[str], tone: str) -> Dict[str, object]:
    """Return a tone-gated red-flags display block."""
    try:
        if tone == TONE_EMERGENCY:
            return {
                "lead": "",
                "items": flags,
                "primary": True,
            }
        if tone == TONE_REASSURING:
            return {
                "lead": "Watch for these warning signs:",
                "items": flags[:3],
                "primary": False,
            }
        if tone == TONE_INFORMATIVE:
            return {
                "lead": "Reasons to see a doctor sooner:",
                "items": flags,
                "primary": False,
            }
        # URGENT
        return {
            "lead": "Important warning signs in your description:",
            "items": flags,
            "primary": True,
        }
    except Exception:
        return {"lead": "", "items": flags, "primary": False}


def format_rehab_for_tone(plan: Dict[str, List[str]], tone: str) -> Dict[str, object]:
    """Return tone-gated rehab output. Severe and Emergency tones suppress the protocol."""
    try:
        if tone in (TONE_URGENT, TONE_EMERGENCY):
            return {"lead": "", "show": False, "sections": {}}
        if tone == TONE_REASSURING:
            return {
                "lead": "Here's what you can do right now:",
                "show": True,
                "sections": plan,
            }
        # INFORMATIVE
        return {
            "lead": "Here's how to manage this while you arrange an evaluation:",
            "show": True,
            "sections": plan,
        }
    except Exception:
        return {"lead": "", "show": False, "sections": {}}


# ── Climbing situation weighting (Phase 5 engine support) ────────────────────
#
# When the wizard surfaces a specific climbing situation, the bucket scorer
# applies a 2x weight multiplier to the listed differentials. The mapping is
# read by the API layer (or the wizard) when re-ordering bucket_possibilities.

CLIMBING_SITUATIONS: Dict[str, Tuple[str, ...]] = {
    "full_crimp_small_hold": ("a2_pulley", "a4_pulley", "flexor_tenosynovitis"),
    "crack_jamming": ("boutonniere", "tfcc", "finger_jam"),
    "campus_board": ("a2_pulley", "distal_bicep", "medial_epicondylitis", "slap_tear"),
    "dynamic_catch": ("a2_pulley", "slap_tear", "shoulder_instability"),
    "heavy_lockoff": ("distal_bicep", "medial_epicondylitis", "cubital_tunnel"),
    "undercling": ("medial_epicondylitis", "tfcc", "lateral_epicondylitis"),
    "dyno_catch": ("slap_tear", "shoulder_instability", "ac_joint"),
    "heel_hook": ("patellar_tendinopathy", "biceps_femoris", "meniscus"),
    "drop_knee": ("it_band", "meniscus", "mcl_sprain"),
    "boulder_landing": ("ankle_sprain", "patellar_tendinopathy", "calcaneus"),
    "wide_stemming": ("lumbar_strain", "hip_flexor", "si_joint"),
    "roof_climbing": ("lumbar_strain", "disc_herniation", "rotator_cuff"),
    "fall_outstretched_hand": ("scaphoid", "distal_radius", "tfcc"),
    "slab_smearing": ("plantar_fasciitis", "peroneal_tendon", "ankle_sprain"),
}


def situation_weight(situation_key: str, injury_key: str) -> float:
    """Return 2.0 if the injury is up-weighted by the situation, else 1.0."""
    try:
        targets = CLIMBING_SITUATIONS.get(situation_key, ())
        return 2.0 if injury_key in targets else 1.0
    except Exception:
        return 1.0

