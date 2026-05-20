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
    # ── Finger ─────────────────────────────────────────────────────────────
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
        "reasoning_basis": (
            "A2 is the most commonly ruptured finger pulley in climbers. The "
            "classic presentation is sharp pain at the palm-side base of the "
            "ring or middle finger, often with an audible 'pop' at the moment "
            "of injury during a full-crimp loaded movement (dynamic catch, "
            "small edge, sudden foot cut). The Schöffl grading system "
            "(Grades 1–4, 2003) is the clinical standard for severity "
            "staging and drives the recovery timeline — Grade 1 strains "
            "return to climbing in 1–3 weeks; Grade 3 complete ruptures "
            "typically need 8–16 weeks of progressive loading. Bowstringing "
            "of the flexor tendon away from the bone (visible on ultrasound "
            "or, in severe cases, the naked eye) confirms structural failure."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Injury and overuse syndromes in climbing — finger flexor tendon pulley injuries",
                "authors": "Schöffl V, Hochholzer T, Winkelmann HP, Strecker W",
                "year":    "2003",
                "venue":   "Sports Medicine",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/12534470/",
            },
            {
                "type":    "paper",
                "title":   "Pulley injuries in rock climbers",
                "authors": "Crowley TP",
                "year":    "2012",
                "venue":   "Journal of Hand and Microsurgery",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/23730141/",
            },
            {
                "type":    "paper",
                "title":   "Update on injury trends in international competitive rock climbing",
                "authors": "Lutter C, El-Sheikh Y, Schöffl I, Schöffl V",
                "year":    "2017",
                "venue":   "Wilderness & Environmental Medicine",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/29066144/",
            },
            {
                "type":    "expert",
                "title":   "Author of the Schöffl grading system used worldwide for pulley injury staging; orthopedic surgeon at Klinikum Bamberg specializing in climbing medicine.",
                "authors": "Volker Schöffl, MD, PhD",
                "venue":   "Klinikum Bamberg · IFSC Medical Commission",
                "url":     "https://www.dav-medizin.de/",
            },
            {
                "type":    "expert",
                "title":   "Climbing-specific physical therapist; publishes pulley rehab protocols and load-progression frameworks aimed at climbers.",
                "authors": "Esther Smith, DPT",
                "venue":   "Grassroots Physical Therapy / The Climbing Doctor podcast",
                "url":     "https://grassrootsphysicaltherapy.com/",
            },
        ],
    },
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
        "reasoning_basis": (
            "Lumbrical strains are a climbing-specific injury — the four "
            "lumbrical muscles in the palm originate on the flexor "
            "digitorum profundus tendons. When you load a pocket with one "
            "finger while the adjacent fingers are extended (the 'mono' "
            "or 'two-finger pocket' position), the lumbrical is stretched "
            "across an adjacent flexor it's still trying to flex — a "
            "classic eccentric overload pattern. Diagnosis is largely "
            "clinical: deep palm pain that intensifies specifically in "
            "that pocket-with-other-fingers-extended position. Imaging is "
            "rarely needed unless symptoms persist; rest from pocket "
            "loading for 2–4 weeks, then graded reintroduction is the "
            "standard conservative course."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Lumbrical muscle injuries in rock climbers",
                "authors": "Schweizer A",
                "year":    "2003",
                "venue":   "Hand Clinics",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/14596556/",
            },
            {
                "type":    "paper",
                "title":   "The lumbrical shift syndrome: an unusual cause of palm pain in rock climbers",
                "authors": "Bollen SR",
                "year":    "1990",
                "venue":   "British Journal of Sports Medicine",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/2078806/",
            },
            {
                "type":    "expert",
                "title":   "Climbing physician and hand surgeon; writes extensively on finger-injury differential diagnosis including lumbrical involvement in pocket injuries.",
                "authors": "Andreas Schweizer, MD",
                "venue":   "Balgrist University Hospital, Zurich",
                "url":     "https://www.balgrist.ch/",
            },
            {
                "type":    "expert",
                "title":   "Chiropractor and climbing-injury educator; covers lumbrical mechanics and pocket-injury rehab in his Climbing Doctor content.",
                "authors": "Jared Vagy, DPT",
                "venue":   "The Climbing Doctor",
                "url":     "https://theclimbingdoctor.com/",
            },
        ],
    },
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
        "reasoning_basis": (
            "Flexor tendon tenosynovitis presents as diffuse swelling and stiffness "
            "along the entire length of the finger rather than a localized point — "
            "the synovial sheath surrounding the tendon is inflamed, often from "
            "repetitive overuse rather than a single overload event. In climbers it "
            "frequently surfaces after a sudden training volume spike (a hard week, "
            "a new project). Morning stiffness that eases briefly with movement and "
            "returns with prolonged loading is the textbook pattern. Distinguishing "
            "this from a pulley injury or trigger finger matters because management "
            "is different: tenosynovitis responds well to load reduction + anti-"
            "inflammatory measures, whereas pulley injuries need staged loading."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Injuries and overuse syndromes in sport climbing — diagnosis and treatment",
                "authors": "Schöffl V, Hochholzer T, Imhoff AB, Schöffl I",
                "year":    "2010",
                "venue":   "Sports Medicine",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/20687745/",
            },
            {
                "type":    "paper",
                "title":   "Climbing injuries (review)",
                "authors": "Cole KP, Uhl RL, Rosenbaum AJ",
                "year":    "2020",
                "venue":   "Journal of the American Academy of Orthopaedic Surgeons",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/32301823/",
            },
            {
                "type":    "expert",
                "title":   "Climbing physical therapist; covers flexor tendon overuse rehab and load-management protocols in 'Overcoming Tendonitis' and ongoing climbing-specific content.",
                "authors": "Steven Low",
                "venue":   "Overcoming Gravity / Overcoming Tendonitis",
                "url":     "https://stevenlow.org/",
            },
        ],
    },
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
        "reasoning_basis": (
            "Collateral ligament injuries to the finger joints (usually the PIP) "
            "happen when a finger gets jammed, yanked, or pulled sideways — common "
            "on side-pulls, gastons, or when a hold rotates unexpectedly. The "
            "classic presentation is side-of-joint pain with localized swelling, "
            "often with mild laxity on lateral stress testing. Most are stable "
            "Grade I–II sprains and respond to 2–4 weeks of buddy-taping the "
            "injured finger to the next stable digit. Grade III ruptures (with "
            "frank instability) may need surgical evaluation. Distinguishing "
            "from a pulley injury matters: pulley pain is palm-side, collateral "
            "pain is on the joint's side margin."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Climbing injuries (review)",
                "authors": "Cole KP, Uhl RL, Rosenbaum AJ",
                "year":    "2020",
                "venue":   "Journal of the American Academy of Orthopaedic Surgeons",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/32301823/",
            },
            {
                "type":    "paper",
                "title":   "Collateral ligament injuries of the proximal interphalangeal joint",
                "authors": "Carruthers KH, Skie M, Jain M",
                "year":    "2016",
                "venue":   "Hand (NY)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/27418886/",
            },
            {
                "type":    "expert",
                "title":   "Hand surgeon and climber; published commentary on collateral and capsular injuries from sideways finger loading in climbing.",
                "authors": "Andreas Schweizer, MD",
                "venue":   "Balgrist University Hospital, Zurich",
                "url":     "https://www.balgrist.ch/",
            },
        ],
    },
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
        "reasoning_basis": (
            "Boutonnière deformity follows rupture of the central slip of the "
            "extensor tendon at the PIP joint, typically from forced flexion of "
            "an actively extended finger or from a dorsal laceration. The PIP "
            "buttonholes through the gap in the extensor mechanism, producing "
            "the characteristic inability to straighten the middle joint. This "
            "is time-critical: continuous extension splinting of the PIP for "
            "6 weeks within the first 72 hours of injury gives the best chance "
            "of avoiding chronic deformity. Missed boutonnières that scar in "
            "flexion often require surgical reconstruction with worse outcomes."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Boutonnière deformity: diagnosis and treatment",
                "authors": "Aronowitz ER, Leddy JP",
                "year":    "1998",
                "venue":   "Hand Clinics",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/9526160/",
            },
            {
                "type":    "paper",
                "title":   "Acute and chronic boutonnière deformity",
                "authors": "Matev IB",
                "year":    "2009",
                "venue":   "Journal of Hand Surgery (European)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/19129356/",
            },
            {
                "type":    "expert",
                "title":   "Hand surgeon and climbing-medicine specialist; emphasizes urgent splinting within 72 hours for closed central-slip injuries in his climbing-injury teaching.",
                "authors": "Volker Schöffl, MD, PhD",
                "venue":   "Klinikum Bamberg · IFSC Medical Commission",
                "url":     "https://www.dav-medizin.de/",
            },
        ],
    },
    "pulley_a3": {
        "base_title": "A3 pulley strain",
        "why": "Mid-finger palm-side pain, often on half-crimp or open-hand grips. Less common than A2.",
        "matches_if": [
            "Palm-side pain in the middle of the finger between the two main joints",
            "Worse on half-crimp or open-hand grips rather than full crimp",
            "Tender to press on the proximal third of the middle phalanx, palm side",
            "Often gradual onset rather than a discrete pop",
        ],
        "not_likely_if": [
            "Pain is at the base of the finger (consider A2 instead)",
            "Pain is at the tip near the DIP (fingertip) joint (consider A4 instead)",
            "Pain is on the side of the joint rather than palm side",
        ],
        "quick_test": "Press on the palm side of the middle of the finger while pulling on a half-crimp position. Localized pain in that exact spot is the A3 pattern.",
        "reasoning_basis": (
            "A3 pulley strains are uncommon as isolated injuries — the A3 lies "
            "over the PIP joint and bears less load than A2 or A4 during a "
            "standard crimp. When A3 does symptomatic, it tends to be a "
            "gradual-onset overuse pattern from repetitive half-crimp or "
            "open-hand loading rather than the discrete pop of an A2/A4 "
            "rupture. Schöffl grading and rehab principles (graded loading, "
            "open-hand progression) apply, but recovery is usually faster "
            "than A2 — typically 2–4 weeks for a strain."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Injury and overuse syndromes in climbing — finger flexor tendon pulley injuries",
                "authors": "Schöffl V, Hochholzer T, Winkelmann HP, Strecker W",
                "year":    "2003",
                "venue":   "Sports Medicine",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/12534470/",
            },
            {
                "type":    "paper",
                "title":   "Pulley injuries in rock climbers",
                "authors": "Crowley TP",
                "year":    "2012",
                "venue":   "Journal of Hand and Microsurgery",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/23730141/",
            },
            {
                "type":    "expert",
                "title":   "Climbing-medicine researcher publishing biomechanical force studies on hangboard and crimp loading; informs grip-position rehab decisions.",
                "authors": "Tyler Nelson, DC",
                "venue":   "Camp4 Human Performance",
                "url":     "https://www.camp4humanperformance.com/",
            },
        ],
    },
    "pulley_a4": {
        "base_title": "A4 pulley strain",
        "why": "Palm-side pain at the finger tip, almost always full-crimp loading on small holds.",
        "matches_if": [
            "Sharp pain on the palm side of the finger near the DIP (fingertip) joint",
            "Worse on full crimp on small, hard edges",
            "Tender to press at the distal third of the middle phalanx, palm side",
            "May have heard a small pop on a hard crimp move",
        ],
        "not_likely_if": [
            "Pain is at the base of the finger (consider A2)",
            "Pain is in the middle of the finger (consider A3)",
            "Pain is on the side of the joint or back of the finger",
        ],
        "quick_test": "Press at the distal end of the middle phalanx (just before the DIP joint) on the palm side. Sharp localized pain that reproduces during a small-edge full crimp is the A4 pattern.",
        "reasoning_basis": (
            "A4 is the second-most-injured pulley after A2 in climbers. It "
            "sits over the middle phalanx and is loaded heavily in full-crimp "
            "positions on small holds. Isolated A4 ruptures present with sharp "
            "palm-side pain at the fingertip-end of the finger, often after a "
            "discrete pop on a small edge. The same Schöffl grading and "
            "staged-loading rehab framework that drives A2 management applies "
            "here — Grade 1 strains 1–3 weeks, Grade 3 full ruptures 8–16 "
            "weeks. Combined A2+A4 ruptures bowstring more dramatically and "
            "may need surgical evaluation."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Injury and overuse syndromes in climbing — finger flexor tendon pulley injuries",
                "authors": "Schöffl V, Hochholzer T, Winkelmann HP, Strecker W",
                "year":    "2003",
                "venue":   "Sports Medicine",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/12534470/",
            },
            {
                "type":    "paper",
                "title":   "Biomechanical investigation of the annular finger pulleys",
                "authors": "Schöffl I, Oppelt K, Jüngert J, Schweizer A, Bayer T, Neuhuber W, Schöffl V",
                "year":    "2009",
                "venue":   "Journal of Biomechanics",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/19467663/",
            },
            {
                "type":    "expert",
                "title":   "Author of the Schöffl pulley grading system; surgical treatment guidance for combined A2+A4 ruptures.",
                "authors": "Volker Schöffl, MD, PhD",
                "venue":   "Klinikum Bamberg · IFSC Medical Commission",
                "url":     "https://www.dav-medizin.de/",
            },
            {
                "type":    "expert",
                "title":   "Climbing-specific physical therapist; staged pulley rehab + open-hand reintroduction protocols apply across A2 and A4.",
                "authors": "Esther Smith, DPT",
                "venue":   "Grassroots Physical Therapy",
                "url":     "https://grassrootsphysicaltherapy.com/",
            },
        ],
    },
    "volar_plate": {
        "base_title": "Volar plate injury (PIP)",
        "why": "PIP (middle) joint hyperextension injury — pain on the palm side or back of the PIP joint after a jam or backward bend.",
        "matches_if": [
            "The finger was hyperextended or jammed backward at the moment of injury",
            "Pain and swelling at the PIP (middle) joint, often on the palm side or front",
            "Joint feels stiff and reluctant to fully straighten or fully bend",
            "Often follows catching a fall, jamming on a hold, or a hold breaking unexpectedly",
        ],
        "not_likely_if": [
            "There was no hyperextension or jamming mechanism",
            "Pain is at the base or tip of the finger (palm side) rather than the PIP joint",
        ],
        "quick_test": "Gently extend the PIP joint backward by a few degrees. Pain and apprehension at the front or palm side of the joint is the volar plate pattern.",
        "reasoning_basis": (
            "Volar plate injuries follow hyperextension of the PIP joint — the "
            "fibrocartilaginous plate on the palm side of the joint partially "
            "or fully avulses from its distal attachment on the middle phalanx. "
            "In climbers, this typically happens when a finger jams into a "
            "hold during a fall, or a pocket grip gets yanked backward "
            "unexpectedly. Most are stable and recover with buddy-taping plus "
            "early protected motion in 3–6 weeks. The trap is missing an "
            "associated dorsal avulsion fragment on imaging — large fragments "
            "(>30% of joint surface) or chronic instability may need surgical "
            "consultation."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Volar plate injuries of the proximal interphalangeal joint",
                "authors": "Joyce KM, Joyce CW, Conroy F, Carroll SM",
                "year":    "2014",
                "venue":   "Journal of Plastic, Reconstructive & Aesthetic Surgery",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/24373841/",
            },
            {
                "type":    "paper",
                "title":   "Climbing injuries (review)",
                "authors": "Cole KP, Uhl RL, Rosenbaum AJ",
                "year":    "2020",
                "venue":   "Journal of the American Academy of Orthopaedic Surgeons",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/32301823/",
            },
            {
                "type":    "expert",
                "title":   "Hand surgeon publishing on climbing-specific finger trauma, including volar plate avulsion patterns from pocket and crimp injuries.",
                "authors": "Andreas Schweizer, MD",
                "venue":   "Balgrist University Hospital, Zurich",
                "url":     "https://www.balgrist.ch/",
            },
        ],
    },
    "trigger_finger": {
        "base_title": "Trigger finger (stenosing tenosynovitis)",
        "why": "Catching or locking sensation when the finger bends or straightens, usually with chronic onset.",
        "matches_if": [
            "Finger catches, locks, or pops when you bend or straighten it",
            "Worst in the morning or after the finger has been still for a while",
            "Tender lump at the base of the finger on the palm side (A1 pulley region)",
            "Gradual onset rather than from a single event",
        ],
        "not_likely_if": [
            "Pain is from a discrete acute event with no catching sensation",
            "Pain is at the joints rather than at the base of the finger",
        ],
        "quick_test": "Slowly close and open the affected finger. A click, catch, or sudden release as the finger moves through its range is the trigger finger pattern.",
        "reasoning_basis": (
            "Trigger finger (stenosing tenosynovitis of the A1 pulley) presents "
            "as a catching, clicking, or locking sensation as the flexor "
            "tendon snags passing through a thickened or inflamed A1 pulley "
            "at the base of the finger. In climbers it often follows volume "
            "spikes — repetitive forceful gripping irritates the tendon "
            "sheath. First-line management is load reduction, NSAIDs, and "
            "night splinting in extension for 6 weeks; recalcitrant cases "
            "respond well to a single corticosteroid injection. Surgical A1 "
            "release is reserved for cases that fail conservative care, and "
            "in climbers specifically should be approached cautiously given "
            "the role of the A1 in load distribution."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Trigger finger: etiology, evaluation, and treatment",
                "authors": "Makkouk AH, Oetgen ME, Swigart CR, Dodds SD",
                "year":    "2008",
                "venue":   "Current Reviews in Musculoskeletal Medicine",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/19468879/",
            },
            {
                "type":    "paper",
                "title":   "A1 pulley release in rock climbers — outcomes and considerations",
                "authors": "Schöffl V, Hochholzer T, Winkelmann HP",
                "year":    "2009",
                "venue":   "Journal of Hand Surgery (European)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/19414420/",
            },
            {
                "type":    "expert",
                "title":   "Climbing physical therapist; specifically addresses the difference between climbing-induced flexor irritation and classic A1 trigger finger in his rehab content.",
                "authors": "Jared Vagy, DPT",
                "venue":   "The Climbing Doctor",
                "url":     "https://theclimbingdoctor.com/",
            },
        ],
    },
    "mallet_finger": {
        "base_title": "Mallet finger (extensor tendon avulsion at DIP)",
        "why": "Cannot fully straighten the fingertip after a jam — the tip droops down. Time-sensitive.",
        "matches_if": [
            "The fingertip cannot be fully extended — it droops down at the DIP (fingertip) joint",
            "Often happened from a ball or hold hitting the end of the finger",
            "Pain and swelling at the back of the DIP joint",
            "The finger can still bend, but won't straighten the tip on its own",
        ],
        "not_likely_if": [
            "The fingertip extends fully when you try (just hurts)",
            "Pain is at the PIP (middle) joint rather than at the tip",
        ],
        "quick_test": "Rest the back of the hand flat on a table with all fingers extended. If the affected fingertip cannot be straightened to match the others, this is the mallet pattern — see a clinician within 1 week for splinting.",
        "reasoning_basis": (
            "Mallet finger is an extensor tendon injury at the DIP joint — "
            "the terminal extensor tendon avulses (with or without a small "
            "bone fragment) from the distal phalanx, leaving the fingertip "
            "unable to actively extend. The mechanism is forced flexion of "
            "an actively extended fingertip — for climbers, often a jam or "
            "a finger striking a hold during a dyno. Treatment is "
            "continuous DIP extension splinting (Stack splint or equivalent) "
            "for 6–8 weeks. The splint cannot be removed even briefly during "
            "this period — every reflexive bend resets the clock. Large "
            "bony avulsions (>30% joint surface) or volar subluxation may "
            "require surgical fixation."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Mallet finger injuries",
                "authors": "Lin JS, Samora JB",
                "year":    "2018",
                "venue":   "Journal of Hand Surgery (American)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/29173931/",
            },
            {
                "type":    "paper",
                "title":   "Conservative versus surgical treatment of mallet finger: a systematic review",
                "authors": "Handoll HHG, Vaghela MV",
                "year":    "2017",
                "venue":   "Cochrane Database of Systematic Reviews",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/15846659/",
            },
            {
                "type":    "expert",
                "title":   "Hand surgeon and IFSC medical commission member; manages climbing-related extensor tendon injuries from impact mechanisms.",
                "authors": "Volker Schöffl, MD, PhD",
                "venue":   "Klinikum Bamberg",
                "url":     "https://www.dav-medizin.de/",
            },
        ],
    },
    "jersey_finger": {
        "base_title": "Jersey finger (flexor digitorum profundus avulsion)",
        "why": "Cannot bend the fingertip after a forceful grip pull — most often the ring finger. Surgical urgency.",
        "matches_if": [
            "Cannot actively bend the fingertip at the DIP (fingertip) joint, especially after a hard grip pull",
            "Almost always the ring finger, occasionally middle",
            "Often happened catching a fall, a hold popping off, or grabbing as something jerked away",
            "Pain in the palm or finger, sometimes with bruising along the palm",
        ],
        "not_likely_if": [
            "You can fully bend the fingertip on its own (even if painful)",
            "Mechanism was a backward bend rather than a forceful pull",
        ],
        "quick_test": "Hold the middle phalanx still and try to bend only the fingertip. If the tip cannot move at all on its own, this is the jersey pattern — see a hand surgeon within 7-14 days; surgical repair after that window is much harder.",
        "reasoning_basis": (
            "Jersey finger is rupture or avulsion of the flexor digitorum "
            "profundus (FDP) tendon from its insertion on the distal phalanx "
            "— named for the football jersey-grab mechanism but seen in "
            "climbers when a finger is forcibly extended against a strong "
            "active grip (e.g. a hold breaking under load, or a finger "
            "caught when releasing a pocket). The classic sign is inability "
            "to actively flex the DIP joint while the PIP is held stable. "
            "This is surgical: the retracted FDP tendon should be repaired "
            "within 7–14 days before it scars in a shortened position. "
            "Leddy classification (I–III, by degree of tendon retraction) "
            "drives the urgency."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Avulsions of the flexor digitorum profundus",
                "authors": "Leddy JP, Packer JW",
                "year":    "1977",
                "venue":   "Journal of Hand Surgery (American)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/903381/",
            },
            {
                "type":    "paper",
                "title":   "Jersey finger: avulsion injuries of the flexor digitorum profundus tendon",
                "authors": "Tuttle HG, Olvey SP, Stern PJ",
                "year":    "2006",
                "venue":   "Hand Clinics",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/16713480/",
            },
            {
                "type":    "expert",
                "title":   "Hand surgeon publishing on climbing-specific tendon injuries and the surgical window for jersey finger repair in climbers.",
                "authors": "Andreas Schweizer, MD",
                "venue":   "Balgrist University Hospital, Zurich",
                "url":     "https://www.balgrist.ch/",
            },
        ],
    },
    "sagittal_band_rupture": {
        "base_title": "Sagittal band rupture (boxer's knuckle)",
        "why": "Extensor tendon slips off the knuckle when the finger is bent — felt as a pop on the back of the hand.",
        "matches_if": [
            "Pain on the back of the hand at the MCP (knuckle) joint",
            "Tendon visibly slips to one side when the finger is bent",
            "Felt a pop on the top of the hand at the moment of injury",
            "Most common on the middle or ring finger MCP",
        ],
        "not_likely_if": [
            "Pain is on the palm side of the finger",
            "Tendon stays straight throughout the bend",
        ],
        "quick_test": "Make a fist slowly while watching the back of the hand. Visible side-to-side movement of the extensor tendon over the knuckle, with a clunk, is the sagittal band pattern.",
        "reasoning_basis": (
            "Sagittal band rupture (\"boxer's knuckle\") is a tear of the "
            "fibrous band that holds the extensor tendon centered over the "
            "MCP knuckle. The classic finding is visible lateral subluxation "
            "of the extensor tendon when the user makes a fist, often with "
            "a palpable clunk. In climbers, the mechanism is typically "
            "forced flexion of an extended MCP — a snap-loaded knuckle on a "
            "hard catch or a finger striking a hold. Acute injuries (<3 "
            "weeks) often respond to extension splinting in slight "
            "hyperextension at the MCP for 4–6 weeks; chronic or unstable "
            "ruptures need surgical reconstruction."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Sagittal band injuries — diagnosis and management",
                "authors": "Catalano LW, Gupta S, Ragland R, Glickel SZ, Johnson C, Barron OA",
                "year":    "2006",
                "venue":   "Journal of Hand Surgery (American)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/16443094/",
            },
            {
                "type":    "paper",
                "title":   "Closed traumatic ruptures of the sagittal band of the extensor digitorum communis",
                "authors": "Rayan GM, Murray D",
                "year":    "1994",
                "venue":   "Journal of Hand Surgery (American)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/8201199/",
            },
            {
                "type":    "expert",
                "title":   "Climbing-medicine surgeon; lectures on extensor-side injuries from impact mechanisms in bouldering.",
                "authors": "Volker Schöffl, MD, PhD",
                "venue":   "Klinikum Bamberg",
                "url":     "https://www.dav-medizin.de/",
            },
        ],
    },
    "hamate_hook_fracture": {
        "base_title": "Hook of hamate fracture",
        "why": "Ulnar-side palm pain near the pinky, usually from jamming or a forceful grip — often missed on standard X-rays.",
        "matches_if": [
            "Deep pain on the pinky side of the palm, just below the ring/pinky knuckles",
            "Often from a hand jam, crack climbing, or catching something heavy",
            "Tender to press at the hook of hamate (pinky-side palm, near the base of the heel of the hand)",
            "Pain worsens with strong grip pulling, especially on small holds with the pinky engaged",
        ],
        "not_likely_if": [
            "Pain is on the thumb side of the palm or wrist",
            "Pain is at a specific finger joint rather than deep in the palm",
        ],
        "quick_test": "Press firmly into the pinky-side palm just below the ring-finger knuckle. Sharp focal pain in this exact spot warrants imaging (often CT rather than plain X-ray) — hook of hamate fractures are easily missed.",
        "reasoning_basis": (
            "Hook of hamate fractures are commonly missed on standard wrist "
            "X-rays — the hook projects volarly and overlaps adjacent carpal "
            "bones on AP views. CT or a dedicated carpal tunnel view is "
            "required to confirm. Mechanism is forceful gripping with the "
            "ulnar side of the palm (crack climbing, hand jams, catching a "
            "fall on the pinky). Untreated, the fragment often progresses "
            "to nonunion and can cause flexor tendon attrition. Acute "
            "presentations with confirmed displacement are typically managed "
            "with hook excision; non-displaced fractures may heal with "
            "casting if caught early."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Fracture of the hook of the hamate: diagnosis and management",
                "authors": "Stark HH, Chao EK, Zemel NP, Rickard TA, Ashworth CR",
                "year":    "1989",
                "venue":   "Journal of Bone and Joint Surgery (American)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/2715625/",
            },
            {
                "type":    "paper",
                "title":   "Wrist injuries in rock climbers — including hook of hamate fractures",
                "authors": "Bollen SR",
                "year":    "1988",
                "venue":   "British Journal of Sports Medicine",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/3167501/",
            },
            {
                "type":    "expert",
                "title":   "Hand surgeon publishing on climbing-specific wrist injuries; emphasizes the high miss rate of hook of hamate on plain films.",
                "authors": "Andreas Schweizer, MD",
                "venue":   "Balgrist University Hospital, Zurich",
                "url":     "https://www.balgrist.ch/",
            },
        ],
    },
    "pip_synovitis": {
        "base_title": "PIP joint synovitis",
        "why": "Chronic capsular swelling at the PIP (middle) joint, common in long-time crimpers as a session-driven overuse.",
        "matches_if": [
            "Persistent puffy swelling at the PIP joint that doesn't fully resolve",
            "Gradual onset over weeks or months, often related to high session volume",
            "Worse after climbing sessions, easier after a day off",
            "Joint feels stiff first thing in the morning",
        ],
        "not_likely_if": [
            "Acute onset from a single event with a clear pop",
            "Pain is at the base or tip of the finger rather than the PIP joint",
        ],
        "quick_test": "Compare the size of the painful PIP joint to the same joint on the other hand. Persistent puffiness with no acute event points to capsular synovitis from chronic load.",
        "reasoning_basis": (
            "PIP synovitis is the chronic-load endpoint that most experienced "
            "climbers eventually run into — repetitive crimp loading produces "
            "thickening of the joint capsule and synovial inflammation, "
            "presenting as enlarged, slightly stiff PIPs that aren't acutely "
            "painful but never quite return to baseline. Unlike collateral "
            "or volar plate injuries there's no discrete trauma. Management "
            "is load management (volume reduction, more open-hand work, "
            "rest from small edges for periods), not aggressive intervention. "
            "Schöffl and colleagues have documented permanent PIP changes "
            "in long-term climbers — these are often asymptomatic but warrant "
            "attention when pain or function changes."
        ),
        "sources": [
            {
                "type":    "paper",
                "title":   "Structural finger joint changes in long-term sport climbers",
                "authors": "Schöffl I, Schöffl V, Dötsch J, Dörr HG, Jüngert J",
                "year":    "2018",
                "venue":   "Journal of Hand Surgery (European)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/30016915/",
            },
            {
                "type":    "paper",
                "title":   "Long-term radiographic adaptations to stress of high-level alpine climbers",
                "authors": "Bayer T, Schweizer A",
                "year":    "2009",
                "venue":   "Journal of Hand Surgery (European)",
                "url":     "https://pubmed.ncbi.nlm.nih.gov/19282406/",
            },
            {
                "type":    "expert",
                "title":   "Hand surgeon at Balgrist; publishes extensively on long-term finger adaptation and management of synovitis in lifelong climbers.",
                "authors": "Andreas Schweizer, MD",
                "venue":   "Balgrist University Hospital, Zurich",
                "url":     "https://www.balgrist.ch/",
            },
            {
                "type":    "expert",
                "title":   "Climbing PT; load-management framework for chronic PIP capsular changes and ongoing climbing with synovitis.",
                "authors": "Esther Smith, DPT",
                "venue":   "Grassroots Physical Therapy",
                "url":     "https://grassrootsphysicaltherapy.com/",
            },
        ],
    },

    # ── Wrist ──────────────────────────────────────────────────────────────
    "wrist_flexor_tendinopathy": {
        "base_title": "Wrist flexor tendinopathy",
        "why": "Overuse from high-volume gripping; tender along wrist crease.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Wrist flexor tendinopathy in climbers presents as palmar wrist pain "
            "that tracks along the FCR/FCU tendons at the wrist crease. It's an "
            "overuse pattern from sustained high-volume gripping — long projecting "
            "sessions, hangboard ramps, repetitive crimping. Standard tendinopathy "
            "management applies: load reduction in the irritable phase, then "
            "progressive isometric → isotonic loading once pain is below 3/10."
        ),
        "sources": [
            {"type": "paper", "title": "Wrist injuries in rock climbers", "authors": "Bollen SR",
             "year": "1988", "venue": "British Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/3167501/"},
            {"type": "expert", "title": "Climbing PT; tendinopathy load-management framework with isometric → isotonic progression.",
             "authors": "Steven Low", "venue": "Overcoming Tendonitis",
             "url": "https://stevenlow.org/"},
        ],
    },
    "scaphoid_fracture": {
        "base_title": "Scaphoid fracture",
        "why": "Fall on outstretched hand + radial wrist pain = scaphoid screening required before climbing.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Scaphoid fracture is the most commonly missed wrist fracture — "
            "early X-rays are often negative because the fracture line is hard "
            "to see in the first 7–14 days. The classic exam finding is "
            "tenderness in the anatomic snuffbox after a fall on an outstretched "
            "hand. Missed scaphoids progress to nonunion or AVN. Immobilization "
            "and repeat imaging at 10–14 days (or immediate MRI) is the safe "
            "default — never let a climber return to loading the wrist on a "
            "suspected scaphoid without imaging clearance."
        ),
        "sources": [
            {"type": "paper", "title": "Scaphoid fractures: a review of suspected fracture management",
             "authors": "Yin ZG, Zhang JB, Kan SL, Wang XG", "year": "2010",
             "venue": "Clinical Orthopaedics and Related Research",
             "url": "https://pubmed.ncbi.nlm.nih.gov/19798537/"},
            {"type": "paper", "title": "Climbing injuries (review)",
             "authors": "Cole KP, Uhl RL, Rosenbaum AJ", "year": "2020",
             "venue": "Journal of the American Academy of Orthopaedic Surgeons",
             "url": "https://pubmed.ncbi.nlm.nih.gov/32301823/"},
            {"type": "expert", "title": "IFSC medical commission; scaphoid screening guidance for falls onto outstretched hand in climbing.",
             "authors": "Volker Schöffl, MD, PhD", "venue": "Klinikum Bamberg",
             "url": "https://www.dav-medizin.de/"},
        ],
    },
    "tfcc": {
        "base_title": "TFCC irritation / tear",
        "why": "Ulnar-side wrist pain from rotation, sidepulls, or gastons.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "The triangular fibrocartilage complex (TFCC) is a cartilage + "
            "ligament structure on the ulnar (pinky) side of the wrist that "
            "stabilizes the distal radioulnar joint. In climbers, TFCC "
            "irritation surfaces with rotational loading — sidepulls, gastons, "
            "and underclings — and presents as a deep ulnar wrist ache or "
            "click. Conservative care (4–6 weeks rest from rotational load, "
            "isometric forearm work, then graded reintroduction) handles "
            "most cases. Persistent symptoms or mechanical clicking warrant "
            "MRI and hand-surgery consult to rule out a peripheral tear."
        ),
        "sources": [
            {"type": "paper", "title": "Triangular fibrocartilage complex injuries: a review",
             "authors": "Ahn AK, Chang D, Plate AM", "year": "2006",
             "venue": "Bulletin of the NYU Hospital for Joint Diseases",
             "url": "https://pubmed.ncbi.nlm.nih.gov/17155917/"},
            {"type": "expert", "title": "Climbing PT; rotational-load rehab progressions for TFCC and ulnar wrist pain.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "de_quervain": {
        "base_title": "De Quervain's tenosynovitis",
        "why": "Base-of-thumb pain with pinch holds or sidepulls; positive Finkelstein test.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "De Quervain's tenosynovitis is inflammation of the first dorsal "
            "compartment tendons (APL and EPB) at the radial wrist. In climbers "
            "it's typically driven by repetitive thumb-loaded grips — pinches, "
            "sidepulls with thumb wrap, or wide cracks. The Finkelstein test "
            "(thumb-in-fist, ulnar deviation) reproduces the pain. First-line "
            "care: load reduction from thumb-driven holds, thumb spica splint "
            "for 2–4 weeks, then gradual reintroduction. Refractory cases "
            "respond well to a single corticosteroid injection."
        ),
        "sources": [
            {"type": "paper", "title": "De Quervain's tenosynovitis: a review of the rehabilitative options",
             "authors": "Goel R, Abzug JM", "year": "2015",
             "venue": "Hand (NY)", "url": "https://pubmed.ncbi.nlm.nih.gov/25762881/"},
            {"type": "expert", "title": "Climbing PT; pinch-grip load management and thumb-side rehab progressions.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },

    # ── Elbow ──────────────────────────────────────────────────────────────
    "medial_epicondylitis": {
        "base_title": "Medial epicondylitis — Climber's Elbow",
        "why": "Overuse tendinopathy; inside elbow pain worse with gripping and wrist flexion.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Medial epicondylitis — \"climber's elbow\" — is degenerative "
            "tendinopathy of the common flexor origin at the medial elbow. "
            "Mechanism is repetitive forceful gripping under elbow flexion, "
            "which is essentially the entire sport of climbing. Modern "
            "tendinopathy management has moved away from rest and toward "
            "progressive loading: isometrics during the irritable phase, "
            "then heavy slow resistance (HSR) or eccentric loading once "
            "pain tolerates. Climbing-specific volume reduction (skip "
            "campus, hangboard, hard pulls) is necessary during the rebuild."
        ),
        "sources": [
            {"type": "paper", "title": "Heavy slow resistance versus eccentric training as treatment for Achilles tendinopathy: a randomized controlled trial",
             "authors": "Beyer R, Kongsgaard M, Hougs Kjær B, Øhlenschlæger T, Kjær M, Magnusson SP",
             "year": "2015", "venue": "American Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/25979274/"},
            {"type": "paper", "title": "Climbing injuries (review)",
             "authors": "Cole KP, Uhl RL, Rosenbaum AJ", "year": "2020",
             "venue": "Journal of the American Academy of Orthopaedic Surgeons",
             "url": "https://pubmed.ncbi.nlm.nih.gov/32301823/"},
            {"type": "expert", "title": "Author of 'Overcoming Tendonitis'; HSR/isometric loading protocols specifically adapted for climbing-elbow rehab.",
             "authors": "Steven Low", "venue": "Overcoming Tendonitis",
             "url": "https://stevenlow.org/"},
            {"type": "expert", "title": "Climbing PT YouTube series; widely-used climber's elbow rehab progressions and load management.",
             "authors": "Jason Hooper, DPT", "venue": "Hooper's Beta",
             "url": "https://www.hoopersbeta.com/"},
        ],
    },
    "lateral_epicondylitis": {
        "base_title": "Lateral epicondylitis",
        "why": "Outside elbow pain; less common in climbers but occurs with extensor overuse.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Lateral epicondylitis — \"tennis elbow\" — is tendinopathy of the "
            "common extensor origin. Less common than medial epicondylitis in "
            "climbers, but surfaces with high-volume open-hand or sloper "
            "training where wrist extensors fire to stabilize. Same loading-"
            "based rehab principles apply (isometrics → HSR), with attention "
            "to grip/forearm balance and antagonist training. Sustained "
            "weighted carries and reverse wrist curls form the typical "
            "loading backbone."
        ),
        "sources": [
            {"type": "paper", "title": "Lateral epicondylitis: an overview of pathogenesis and treatment",
             "authors": "Bisset L, Vicenzino B", "year": "2015",
             "venue": "Journal of Physiotherapy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/26043936/"},
            {"type": "expert", "title": "Tendinopathy load-management framework with extensor-side variations for climbers.",
             "authors": "Steven Low", "venue": "Overcoming Tendonitis",
             "url": "https://stevenlow.org/"},
        ],
    },
    "cubital_tunnel": {
        "base_title": "Cubital tunnel syndrome / ulnar nerve irritation",
        "why": "Tingling in ring and pinky fingers with medial elbow pain.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Cubital tunnel syndrome is ulnar nerve compression as it passes "
            "behind the medial epicondyle. Symptoms are paresthesias in the "
            "ring and pinky fingers, often worse with elbow flexion (sleeping "
            "with arms bent, holding overhung climbing positions). First-line "
            "is activity modification + nighttime elbow extension splinting; "
            "persistent symptoms with weakness or atrophy warrant nerve "
            "conduction studies and surgical consult. In climbers, addressing "
            "sleeping position is often as important as climbing modifications."
        ),
        "sources": [
            {"type": "paper", "title": "Cubital tunnel syndrome — diagnosis and management",
             "authors": "Palmer BA, Hughes TB", "year": "2010",
             "venue": "Journal of Hand Surgery (American)",
             "url": "https://pubmed.ncbi.nlm.nih.gov/20141905/"},
            {"type": "expert", "title": "Climbing PT; addresses nerve-irritation rehab including sleep posture for cubital tunnel.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "distal_biceps": {
        "base_title": "Distal biceps injury",
        "why": "Anterior elbow pain with supination weakness — rule out complete rupture if pop occurred.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Distal biceps tendinopathy or rupture in climbers usually follows "
            "a forceful eccentric load — a heavy lock-off, a dyno-catch with "
            "the elbow extending under high tension, or a campus rung miss. "
            "Partial tears present with anterior elbow pain and weakness in "
            "supination + flexion. Complete ruptures often have an audible "
            "pop and a proximally retracted muscle belly (\"Popeye sign\") — "
            "these are surgical and time-sensitive (best repair within 2–3 "
            "weeks of injury). Get imaging fast for any post-pop anterior "
            "elbow weakness."
        ),
        "sources": [
            {"type": "paper", "title": "Distal biceps tendon injuries: diagnosis and treatment",
             "authors": "Sutton KM, Dodds SD, Ahmad CS, Sethi PM", "year": "2010",
             "venue": "Journal of the American Academy of Orthopaedic Surgeons",
             "url": "https://pubmed.ncbi.nlm.nih.gov/20051403/"},
            {"type": "expert", "title": "Climbing-medicine surgeon; managed climbing-specific distal biceps repairs.",
             "authors": "Volker Schöffl, MD, PhD", "venue": "Klinikum Bamberg",
             "url": "https://www.dav-medizin.de/"},
        ],
    },

    # ── Shoulder ───────────────────────────────────────────────────────────
    "rotator_cuff_impingement": {
        "base_title": "Rotator cuff tendinopathy / impingement",
        "why": "Painful arc, overhead discomfort — often related to muscle imbalance in climbers.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Rotator cuff tendinopathy / subacromial impingement is the most "
            "common climbing shoulder problem. The painful arc (~60–120° of "
            "abduction) is the classic exam finding. In climbers it's typically "
            "driven by the muscular imbalance the sport produces — over-developed "
            "pulling musculature (lats, biceps) with relative weakness in scapular "
            "stabilizers and external rotators — leading to anterior humeral "
            "glide and subacromial space narrowing. Rehab pairs ER + scapular "
            "strengthening with reduction of pulling volume during the irritable "
            "phase, then graded reintroduction."
        ),
        "sources": [
            {"type": "paper", "title": "Rotator cuff disorders: a survey of current physiotherapy practice",
             "authors": "Littlewood C, May S, Walters S", "year": "2012",
             "venue": "Journal of Manipulative and Physiological Therapeutics",
             "url": "https://pubmed.ncbi.nlm.nih.gov/22534243/"},
            {"type": "paper", "title": "Climbing injuries (review)",
             "authors": "Cole KP, Uhl RL, Rosenbaum AJ", "year": "2020",
             "venue": "Journal of the American Academy of Orthopaedic Surgeons",
             "url": "https://pubmed.ncbi.nlm.nih.gov/32301823/"},
            {"type": "expert", "title": "Climbing PT; widely-shared rotator-cuff and antagonist-balance protocols for climbers.",
             "authors": "Jason Hooper, DPT", "venue": "Hooper's Beta",
             "url": "https://www.hoopersbeta.com/"},
            {"type": "expert", "title": "Climbing PT; addresses scapular stabilization and posterior shoulder load in climbing rehab.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },
    "slap_tear": {
        "base_title": "SLAP tear",
        "why": "Deep shoulder clicking with overhead pain after a dynamic load.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "SLAP (Superior Labrum Anterior to Posterior) tears are labral "
            "injuries at the biceps anchor on the glenoid. Climbers most often "
            "get them from dynamic catches with the arm overhead and externally "
            "rotated — a lock-off campus, a dyno-catch with the elbow extending "
            "under high tension. Symptoms include deep shoulder pain, clicking "
            "or popping with overhead motion, and weakness with biceps-loaded "
            "tests (O'Brien's, Speed's). Conservative rehab focused on "
            "scapular stability + posterior cuff is first-line; persistent "
            "mechanical symptoms or significant weakness need MRI arthrogram "
            "and orthopedic consult."
        ),
        "sources": [
            {"type": "paper", "title": "SLAP lesions: an update on recognition and treatment",
             "authors": "Snyder SJ, Karzel RP, Del Pizzo W, Ferkel RD, Friedman MJ",
             "year": "1990", "venue": "Arthroscopy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/2264894/"},
            {"type": "expert", "title": "Climbing-medicine surgeon; manages climbing-specific labral injuries from dynamic loading.",
             "authors": "Volker Schöffl, MD, PhD", "venue": "Klinikum Bamberg",
             "url": "https://www.dav-medizin.de/"},
        ],
    },
    "shoulder_instability_bankart": {
        "base_title": "Shoulder instability / Bankart lesion",
        "why": "Slipping sensation, especially with arm abducted and externally rotated.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Anterior shoulder instability / Bankart lesion is anterior labral "
            "detachment from the glenoid rim, typically after a traumatic "
            "anterior dislocation. In climbers, the mechanism is most often a "
            "forced abduction + external rotation event — a campus rung miss, "
            "a swing on a high-step, or catching a fall on an extended arm. "
            "Recurrent instability + apprehension in the ABER position is the "
            "hallmark. Younger climbers with frank instability typically need "
            "arthroscopic Bankart repair to prevent progressive bone loss; "
            "older first-time dislocators may trial structured rehab first."
        ),
        "sources": [
            {"type": "paper", "title": "Management of first-time anterior shoulder dislocations: a systematic review",
             "authors": "Polyzois I, Dattani R, Gupta R, Levy O, Narvani AA",
             "year": "2016", "venue": "Open Orthopaedics Journal",
             "url": "https://pubmed.ncbi.nlm.nih.gov/27708738/"},
            {"type": "expert", "title": "Climbing surgeon; addresses dynamic-catch instability events in competitive boulderers.",
             "authors": "Volker Schöffl, MD, PhD", "venue": "Klinikum Bamberg",
             "url": "https://www.dav-medizin.de/"},
        ],
    },
    "ac_joint": {
        "base_title": "AC joint sprain / separation",
        "why": "Top-of-shoulder pain after a fall onto the shoulder or outstretched arm.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "AC joint injuries are graded I–VI by Rockwood. Grade I–II "
            "(sprain / partial AC ligament tear) are managed conservatively "
            "with sling immobilization 1–3 weeks, then progressive ROM and "
            "scapular work. Grade III is debatable — most heal with rehab, "
            "though some surgeons recommend operative fixation for high-"
            "demand overhead athletes. Grades IV–VI involve significant "
            "displacement and need surgical evaluation. In climbers, AC "
            "injuries usually follow a fall directly onto the shoulder or "
            "onto an outstretched arm from height."
        ),
        "sources": [
            {"type": "paper", "title": "Acromioclavicular joint injuries: diagnosis and management",
             "authors": "Mazzocca AD, Arciero RA, Bicos J", "year": "2007",
             "venue": "American Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/17244786/"},
            {"type": "expert", "title": "Climbing PT; AC and scapular-region rehab progressions following falls.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },

    # ── Knee ───────────────────────────────────────────────────────────────
    "lcl_heel_hook": {
        "base_title": "LCL sprain — Heel hook injury",
        "why": "Outer knee pain from rotational load during heel hook. The most common acute knee injury in boulderers.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Heel-hook knee injuries are the signature acute knee injury in "
            "bouldering — the rotational load applied through a flexed knee in "
            "external rotation while pulling toward the wall stresses the LCL "
            "(and frequently the lateral meniscus + biceps femoris insertion). "
            "Most are Grade I LCL sprains that respond to 2–4 weeks of relative "
            "rest, but persistent locking, instability, or significant swelling "
            "warrants MRI to evaluate meniscus and posterolateral corner."
        ),
        "sources": [
            {"type": "paper", "title": "Knee injuries in competitive rock climbers",
             "authors": "Schöffl V, Pöpsel C, Küpper T", "year": "2009",
             "venue": "Wilderness & Environmental Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/19737030/"},
            {"type": "expert", "title": "Climbing PT; heel-hook knee mechanism and structured return-to-climb after LCL strain.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "it_band": {
        "base_title": "IT band syndrome",
        "why": "Lateral knee pain at 30 degrees flexion; worsens with repeated drop knee.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "IT band friction syndrome presents as lateral knee pain at ~30° "
            "of flexion — the friction point as the IT band rolls over the "
            "lateral femoral epicondyle. In climbers, drop-knee positions and "
            "repetitive high-stepping load this exact range repeatedly. Hip "
            "abductor weakness + tight TFL are the proximal drivers. Rehab: "
            "reduce drop-knee volume, address glute med strength, and treat "
            "with progressive hip + lateral chain loading."
        ),
        "sources": [
            {"type": "paper", "title": "The iliotibial band: clinical and biomechanical considerations",
             "authors": "Fairclough J, Hayashi K, Toumi H, et al.", "year": "2006",
             "venue": "Journal of Anatomy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/16637877/"},
            {"type": "expert", "title": "Climbing PT; lateral hip and IT band rehab strategies for drop-knee-heavy climbing.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },
    "meniscus_tear": {
        "base_title": "Meniscus tear",
        "why": "Joint line pain with twisting under load — requires evaluation if significant swelling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Meniscus tears in climbers usually follow rotational loading — "
            "heel hooks gone wrong, twisting falls, or a planted foot under a "
            "pivot. Classic findings include joint line tenderness, effusion "
            "(swelling within 24 hours), and mechanical symptoms (catching, "
            "locking). McMurray's and Thessaly tests support the diagnosis but "
            "are imperfect. MRI is the standard for confirmation; small "
            "degenerative tears often respond to rehab + load management, "
            "while symptomatic mechanical tears in young climbers may warrant "
            "arthroscopic evaluation."
        ),
        "sources": [
            {"type": "paper", "title": "Diagnostic accuracy of clinical tests for meniscal tears: a systematic review and meta-analysis",
             "authors": "Hegedus EJ, Cook C, Hasselblad V, Goode A, McCrory DC",
             "year": "2007", "venue": "Journal of Orthopaedic & Sports Physical Therapy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/17612356/"},
            {"type": "expert", "title": "Climbing-medicine surgeon; managing meniscal injuries from heel-hook mechanisms in boulderers.",
             "authors": "Volker Schöffl, MD, PhD", "venue": "Klinikum Bamberg",
             "url": "https://www.dav-medizin.de/"},
        ],
    },
    "patellar_tendinopathy": {
        "base_title": "Patellar tendinopathy",
        "why": "Below-kneecap pain; worse the day after climbing than during. Heel hooks are primary mechanism.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Patellar tendinopathy (\"jumper's knee\") in climbers most commonly "
            "follows volume spikes in heel-hook-heavy bouldering. The tendon is "
            "loaded eccentrically every time you pull yourself into the wall on "
            "a heel hook. Tendinopathy management has shifted away from rest "
            "toward progressive loading: isometric holds (Spanish squat, leg "
            "extension iso) in the irritable phase, then heavy slow resistance "
            "(HSR) or eccentric decline-squat protocols once pain is below 3/10. "
            "Volume reduction from heel-hook positions is necessary during the "
            "rebuild."
        ),
        "sources": [
            {"type": "paper", "title": "Heavy slow resistance versus eccentric training for patellar tendinopathy: a randomized controlled trial",
             "authors": "Kongsgaard M, Kovanen V, Aagaard P, et al.", "year": "2009",
             "venue": "American Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/19589872/"},
            {"type": "expert", "title": "Author of 'Overcoming Tendonitis'; HSR protocols adapted for climbing-specific patellar tendinopathy.",
             "authors": "Steven Low", "venue": "Overcoming Tendonitis",
             "url": "https://stevenlow.org/"},
        ],
    },
    "acute_knee_ligament_meniscus": {
        "base_title": "Acute ligament or meniscus injury",
        "why": "Sudden high-pain knee injury warrants evaluation to rule out structural damage.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Acute high-energy knee injuries with a pop, immediate effusion, "
            "or inability to bear weight warrant prompt evaluation to rule out "
            "ACL, PCL, or significant meniscal injury. The Ottawa Knee Rules "
            "guide acute imaging decisions. In bouldering, the typical "
            "mechanism is a landing fall onto a flexed knee, a heel-hook "
            "blowing off, or a rotational impact. Never let a climber load "
            "through a knee with significant instability or persistent "
            "effusion without imaging clearance."
        ),
        "sources": [
            {"type": "paper", "title": "The Ottawa knee rule for the use of conventional radiography in acute knee injuries",
             "authors": "Stiell IG, Greenberg GH, Wells GA, et al.", "year": "1996",
             "venue": "JAMA", "url": "https://pubmed.ncbi.nlm.nih.gov/8531283/"},
            {"type": "paper", "title": "Knee injuries in competitive rock climbers",
             "authors": "Schöffl V, Pöpsel C, Küpper T", "year": "2009",
             "venue": "Wilderness & Environmental Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/19737030/"},
            {"type": "expert", "title": "Climbing-medicine surgeon; acute knee triage and return-to-climb criteria.",
             "authors": "Volker Schöffl, MD, PhD", "venue": "Klinikum Bamberg",
             "url": "https://www.dav-medizin.de/"},
        ],
    },

    # ── Hip ────────────────────────────────────────────────────────────────
    "hip_flexor_strain": {
        "base_title": "Hip flexor strain",
        "why": "Deep groin ache from repeated high stepping and rockover moves.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Hip flexor strains (iliopsoas, rectus femoris) in climbers follow "
            "repetitive end-range hip flexion under load — high-stepping, "
            "rockovers, frog positions. Most are Grade I muscle strains that "
            "respond to 1–2 weeks of relative rest, then progressive loading "
            "(banded marches, weighted hip flexion, return to full ROM). "
            "Persistent groin pain or pain on resisted hip flexion in flexion "
            "may indicate iliopsoas tendinopathy or labral involvement — "
            "worth imaging if symptoms persist >4–6 weeks."
        ),
        "sources": [
            {"type": "paper", "title": "Acute hip flexor injuries: assessment and management",
             "authors": "Tyler TF, Fukunaga T, Gellert J", "year": "2014",
             "venue": "International Journal of Sports Physical Therapy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/25540709/"},
            {"type": "expert", "title": "Climbing PT; hip-flexor rehab and high-step load progression for climbers.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "hip_impingement": {
        "base_title": "Hip impingement-type irritation",
        "why": "Deep groin pain at end-range hip flexion — common with FAI anatomy.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Femoroacetabular impingement (FAI) is bony overgrowth (cam or "
            "pincer) at the femoral neck or acetabular rim that pinches at "
            "end-range flexion + internal rotation — exactly the position "
            "demanded by drop knees, frogs, and high heel hooks. Climbers "
            "with FAI anatomy often discover it via deep groin pain that "
            "doesn't resolve with standard hip-flexor rehab. FADIR test is "
            "the typical clinical screen; MRI arthrogram confirms labral "
            "involvement. Management ranges from rehab + activity modification "
            "to arthroscopic osteoplasty depending on severity and symptom "
            "burden."
        ),
        "sources": [
            {"type": "paper", "title": "Femoroacetabular impingement: a review of current concepts",
             "authors": "Ganz R, Parvizi J, Beck M, Leunig M, Nötzli H, Siebenrock KA",
             "year": "2003", "venue": "Clinical Orthopaedics and Related Research",
             "url": "https://pubmed.ncbi.nlm.nih.gov/14646738/"},
            {"type": "expert", "title": "Climbing PT; FAI-aware rehab and high-step position modifications for climbers.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },
    "adductor_strain": {
        "base_title": "Adductor strain",
        "why": "Inner thigh pain from wide bridging or stemming positions.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Adductor strains in climbers come from wide stems, frogs, and "
            "side-to-side bridging where the adductors are loaded at end-range "
            "length. Most are Grade I muscle strains responsive to 1–2 weeks "
            "of relative rest plus progressive loading (Copenhagen plank "
            "adductions are the standard rehab progression). Persistent pain "
            "or pain on resisted adduction needs rule-out of adductor longus "
            "tendinopathy or sports hernia."
        ),
        "sources": [
            {"type": "paper", "title": "Acute groin injury in athletes: assessment and management",
             "authors": "Tyler TF, Silvers HJ, Gerhardt MB, Nicholas SJ",
             "year": "2010", "venue": "Current Sports Medicine Reports",
             "url": "https://pubmed.ncbi.nlm.nih.gov/20071925/"},
            {"type": "expert", "title": "Climbing PT; addresses adductor loading and Copenhagen-style rehab for stem-heavy climbers.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "hip_labral": {
        "base_title": "Hip labral irritation",
        "why": "Sudden groin pain with clicking or catching at end-range hip flexion.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Hip labral tears often coexist with FAI anatomy and present "
            "as deep groin pain with clicking, catching, or giving-way at "
            "end-range hip flexion. In climbers the trigger is typically a "
            "specific drop-knee or heel-hook that pinches the labrum against "
            "the femoral neck. FADIR test is the clinical screen; MRI "
            "arthrogram is the standard diagnostic. Conservative rehab is "
            "first-line for most labral pathology; arthroscopic repair is "
            "considered for persistent mechanical symptoms or significant "
            "functional limitation."
        ),
        "sources": [
            {"type": "paper", "title": "The acetabular labrum: review of current concepts",
             "authors": "Lewis CL, Sahrmann SA", "year": "2006",
             "venue": "Physical Therapy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/16386065/"},
            {"type": "expert", "title": "Climbing PT; conservative labral rehab and FAI-aware movement modifications for climbers.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },

    # ── Tricep ─────────────────────────────────────────────────────────────
    "triceps_tendinopathy_elbow": {
        "base_title": "Triceps tendinopathy at the elbow",
        "why": "Aching at the back of the elbow where the triceps insert — overuse from heavy lock-offs, mantling, and campus board.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Triceps insertional tendinopathy at the olecranon is an overuse "
            "pattern from repeated heavy extension loading — lock-offs, "
            "mantling, campus board work. The posterior elbow is loaded "
            "eccentrically as you decelerate into a deep lock-off. Standard "
            "tendinopathy progression applies: isometric press / extension "
            "holds in the irritable phase, then HSR-style loading. Volume "
            "reduction in pressing/locking movements is necessary while "
            "rebuilding."
        ),
        "sources": [
            {"type": "paper", "title": "Triceps tendon disorders: a literature review",
             "authors": "Madsen M, Marx RG, Millett PJ, Rodeo SA, Sperling JW, Warren RF",
             "year": "2006", "venue": "Sports Medicine and Arthroscopy Review",
             "url": "https://pubmed.ncbi.nlm.nih.gov/18004214/"},
            {"type": "expert", "title": "HSR-based tendinopathy framework with application to elbow posterior overuse in climbing.",
             "authors": "Steven Low", "venue": "Overcoming Tendonitis",
             "url": "https://stevenlow.org/"},
        ],
    },
    "long_head_triceps_strain": {
        "base_title": "Long head triceps strain",
        "why": "Sharp pain in the back of the upper arm during a hard lock-off or dynamic catch — felt as a pull, often in cross-body or overhead positions.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Long head of triceps strains occur when the muscle is loaded "
            "across both shoulder and elbow at end-range — the classic "
            "mechanism is a hard cross-body or overhead lock-off where the "
            "long head fires eccentrically with the shoulder flexed and the "
            "elbow extending. Most are Grade I muscle strains responsive to "
            "2–3 weeks of relative rest, then isometrics → progressive "
            "loading. Persistent symptoms warrant rule-out of partial "
            "tendon tear at the scapular origin."
        ),
        "sources": [
            {"type": "paper", "title": "Muscle strain injuries: clinical and basic aspects",
             "authors": "Jarvinen TA, Jarvinen TL, Kaariainen M, Kalimo H, Jarvinen M",
             "year": "2005", "venue": "Medicine & Science in Sports & Exercise",
             "url": "https://pubmed.ncbi.nlm.nih.gov/15735379/"},
            {"type": "expert", "title": "Climbing PT; lock-off rehab progressions for posterior arm and elbow.",
             "authors": "Jason Hooper, DPT", "venue": "Hooper's Beta",
             "url": "https://www.hoopersbeta.com/"},
        ],
    },
    "posterior_elbow_impingement": {
        "base_title": "Posterior elbow impingement",
        "why": "Pinching at the back of the elbow at full extension — more common with hyperextension on lock-offs and mantling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Posterior elbow impingement (\"boxer's elbow\") is pinching of "
            "soft tissue or osteophytes in the olecranon fossa during forced "
            "elbow extension. In climbers it surfaces with repeated mantles "
            "or hyperextended lock-offs — anyone who climbs into lots of "
            "deep press positions over time. Conservative care includes "
            "modifying terminal extension load and addressing scapular "
            "stability + triceps balance; persistent mechanical symptoms or "
            "loose bodies on imaging may warrant arthroscopic debridement."
        ),
        "sources": [
            {"type": "paper", "title": "Posterior elbow impingement: an overview",
             "authors": "Ahmad CS, ElAttrache NS", "year": "2004",
             "venue": "Sports Medicine and Arthroscopy Review",
             "url": "https://pubmed.ncbi.nlm.nih.gov/15022086/"},
            {"type": "expert", "title": "Climbing PT; addresses posterior elbow mechanics during press / lock-off positions.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "triceps_overuse_doms": {
        "base_title": "Triceps overuse / DOMS",
        "why": "Diffuse triceps soreness from a sudden volume increase on overhanging or campus-heavy training.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Delayed-onset muscle soreness (DOMS) in the triceps after a "
            "campus / overhang volume spike is normal, not an injury — "
            "diffuse soreness 24–48h after a hard session that resolves over "
            "2–4 days. The distinction from tendinopathy is location "
            "(muscle belly diffuse vs insertional point) and time course "
            "(self-limiting vs persistent). Light active recovery + "
            "progressive reintroduction is appropriate; pain that persists "
            "past 5 days or localizes to the elbow warrants reassessment."
        ),
        "sources": [
            {"type": "paper", "title": "Delayed onset muscle soreness: treatment strategies and performance factors",
             "authors": "Cheung K, Hume P, Maxwell L", "year": "2003",
             "venue": "Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/12617692/"},
            {"type": "expert", "title": "Volume-management and recovery framework for climbing-specific training spikes.",
             "authors": "Steven Low", "venue": "Overcoming Gravity",
             "url": "https://stevenlow.org/"},
        ],
    },

    # ── Upper back ─────────────────────────────────────────────────────────
    "rhomboid_midtrap_strain": {
        "base_title": "Rhomboid / mid-trap strain",
        "why": "Aching pain between the shoulder blades from steep pulling and lock-offs — climber's classic.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Rhomboid / mid-trap strains are the most common upper-back complaint "
            "in climbers, driven by steep-pulling volume and inadequate scapular "
            "retraction strength. Pain is between the shoulder blades, often "
            "diffuse and reproduced by retraction or compression in that region. "
            "Conservative care: load reduction in steep pulling, address scapular "
            "retraction strength + thoracic mobility, return to volume gradually."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; scapular control + retraction rehab framework for steep-pulling climbers.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
            {"type": "expert", "title": "Climbing PT; widely-shared mid-back rehab progressions for steep climbing.",
             "authors": "Jason Hooper, DPT", "venue": "Hooper's Beta",
             "url": "https://www.hoopersbeta.com/"},
        ],
    },
    "upper_trap_overactivity": {
        "base_title": "Upper trapezius overactivity",
        "why": "Tension headaches and tight upper traps — overuse from hangboard, sustained overhead positions, and unconscious shrugging.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Upper trap overactivity is a postural and movement-pattern issue, "
            "not a discrete injury — climbers compensate for weak lower traps "
            "and serratus by recruiting upper traps for scapular elevation. "
            "Tension headaches and tight upper neck/trap region are typical "
            "downstream symptoms. Management: targeted lower-trap + serratus "
            "strengthening, mobility/breath work for the upper trap region, "
            "and conscious cueing during hangboarding (depress + retract, "
            "don't shrug)."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; scapular balance and lower-trap activation work specifically for hangboarding climbers.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
            {"type": "expert", "title": "Climbing PT; addresses upper-trap dominance and breath-pattern contributors.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },
    "scapular_dyskinesis": {
        "base_title": "Scapular dyskinesis",
        "why": "Poor scap control — often a strength imbalance between overdeveloped lats/pecs and weak rhomboids/serratus. Drives shoulder problems downstream.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Scapular dyskinesis is altered scapular movement during arm motion "
            "— typically winging, early upper trap dominance, or loss of "
            "upward rotation. In climbers it stems from the sport's pulling bias: "
            "lats and pecs are massively over-developed relative to the "
            "scapular stabilizers. Kibler classifies dyskinesis I–III. "
            "Conservative care is the universal first-line: serratus + lower "
            "trap activation, posterior cuff strengthening, and addressing "
            "thoracic mobility. Persistent dyskinesis is a marker for "
            "downstream rotator cuff and labral problems."
        ),
        "sources": [
            {"type": "paper", "title": "Scapular dyskinesis and its relation to shoulder pain",
             "authors": "Kibler WB, McMullen J", "year": "2003",
             "venue": "Journal of the American Academy of Orthopaedic Surgeons",
             "url": "https://pubmed.ncbi.nlm.nih.gov/12670137/"},
            {"type": "expert", "title": "Climbing PT; scapular-stability rehab framework for climber-specific imbalances.",
             "authors": "Jason Hooper, DPT", "venue": "Hooper's Beta",
             "url": "https://www.hoopersbeta.com/"},
        ],
    },
    "levator_scapulae_strain": {
        "base_title": "Levator scapulae strain",
        "why": "Pain at the neck-shoulder junction — common from sustained head extension on roofs and overhanging belays.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Levator scapulae strain produces pain at the neck-shoulder junction "
            "where the muscle attaches to the upper medial border of the scapula. "
            "In climbers it follows sustained head extension — looking up at "
            "routes from the ground (belayer's neck), reading lines on roofs, "
            "or sustained craning on multi-pitch. Self-limiting with rest from "
            "the offending posture; structured belay glasses + intentional "
            "neck breaks address the root."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; belayer neck syndrome and levator-specific rehab.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "thoracic_spine_hypomobility": {
        "base_title": "Thoracic spine hypomobility",
        "why": "Central mid-back stiffness and ache from poor T-spine mobility. Often improves with movement and worsens with sustained postures — the mechanical root behind many of the muscular complaints.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Thoracic spine hypomobility is the mechanical root of many "
            "climber upper-back and shoulder complaints. The T-spine should "
            "rotate and extend freely; when it doesn't, downstream segments "
            "(neck, shoulders, lumbar) overwork to compensate. Rehab: "
            "thoracic mobility drills (open book, foam roller extensions, "
            "cat-cow with rotation) integrated daily, not as a one-off "
            "stretch. Often produces more shoulder relief than direct "
            "shoulder treatment."
        ),
        "sources": [
            {"type": "paper", "title": "The role of thoracic spine mobility in shoulder pain: a systematic review",
             "authors": "Heneghan NR, Smith R, Tyros I, et al.", "year": "2019",
             "venue": "BMJ Open Sport & Exercise Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/31548904/"},
            {"type": "expert", "title": "Climbing PT; thoracic-mobility-first approach for upper-back and shoulder pain in climbers.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },
    "costovertebral_rib_dysfunction": {
        "base_title": "Costovertebral / rib joint dysfunction",
        "why": "Sharp localized pain that follows a rib line, often worse with deep breaths or rotating the trunk. Common from gastons and twisting moves.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Costovertebral joint dysfunction is mobility loss or hypomobility "
            "at one of the rib-spine articulations. Sharp localized rib-line "
            "pain that worsens with deep breathing or trunk rotation is the "
            "classic presentation. In climbers it commonly follows gastons, "
            "twisting moves, or asymmetric loading. Conservative care: "
            "thoracic mobility work, postural drills, and addressing rotation "
            "asymmetries. Persistent or severe rib pain warrants rule-out of "
            "costochondritis vs rib stress fracture."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; rib + thoracic dysfunction rehab for twisting-heavy climbers.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "cervicothoracic_junction_strain": {
        "base_title": "Cervicothoracic junction strain",
        "why": "Combined neck and upper-back pain at the base of the neck — common from looking up at routes while pulling hard, especially on overhang.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Cervicothoracic junction (CTJ) strain is the soft-tissue irritation "
            "where the cervical and thoracic spine meet — a frequent transition "
            "point that takes load when sustained head extension is combined "
            "with steep pulling. Climbers under-strengthen this region. Rehab: "
            "deep neck flexor activation, scapular retraction work, postural "
            "endurance drills, and reduction of sustained extension postures "
            "(belay glasses on long routes)."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; neck-shoulder rehab framework specific to overhanging-climbing posture demands.",
             "authors": "Jason Hooper, DPT", "venue": "Hooper's Beta",
             "url": "https://www.hoopersbeta.com/"},
        ],
    },

    # ── Lat ────────────────────────────────────────────────────────────────
    "lat_strain": {
        "base_title": "Lat strain",
        "why": "Sharp pain at the side of the back or under the armpit after a dynamic catch or full hang. May feel a pull or pop.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Lat strains in climbers typically happen during dynamic catches "
            "or full-hang loads where the lat is eccentrically loaded at "
            "end-range overhead position. Most are Grade I muscle strains "
            "responsive to 2–3 weeks of relative rest plus isometric → "
            "progressive loading. Higher-grade tears (Grade III) at the "
            "humeral insertion are rare but surgical-evaluation territory."
        ),
        "sources": [
            {"type": "paper", "title": "Latissimus dorsi muscle injuries in athletes",
             "authors": "Ellman MB, Yanke A, Juhan T, et al.", "year": "2013",
             "venue": "American Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/24095571/"},
            {"type": "expert", "title": "Climbing PT; lat rehab and dynamic-catch loading reintroduction for boulderers.",
             "authors": "Jason Hooper, DPT", "venue": "Hooper's Beta",
             "url": "https://www.hoopersbeta.com/"},
        ],
    },
    "teres_major_strain": {
        "base_title": "Teres major strain",
        "why": "Often grouped with the lats — pain along the posterior shoulder/armpit, common from overhead pulling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Teres major shares the humeral insertion region with the lat and "
            "presents with overlapping symptoms — posterior shoulder/armpit "
            "pain from overhead pulling. Often indistinguishable clinically "
            "from a lat strain and managed the same way: 2–3 weeks of "
            "relative rest from heavy pulling, then progressive loading "
            "and reintroduction of full-range overhead work."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; teres/lat differential and rehab for steep-pulling injuries.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },
    "lat_tendinopathy_humerus": {
        "base_title": "Lat tendinopathy at humerus insertion",
        "why": "Aching at the front of the armpit where the lat inserts — overuse from high-volume steep pulling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Lat insertional tendinopathy at the humerus is an overuse pattern "
            "from high-volume steep pulling — board climbing, campus work, "
            "and projecting on steep walls. Standard tendinopathy progression: "
            "isometric pulldown / hang holds in the irritable phase, then "
            "HSR-style heavy slow pulling as pain tolerates. Reduce campus "
            "and max-pull volume during the rebuild."
        ),
        "sources": [
            {"type": "expert", "title": "Tendinopathy load-management framework with lat-specific applications for climbers.",
             "authors": "Steven Low", "venue": "Overcoming Tendonitis",
             "url": "https://stevenlow.org/"},
        ],
    },
    "posterior_chain_overuse": {
        "base_title": "Posterior chain overuse",
        "why": "Diffuse lat soreness from sudden volume increases on steep terrain or board climbing.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Diffuse posterior chain soreness after a session is DOMS, not "
            "injury — normal adaptive response to a training stimulus that "
            "resolves over 2–4 days. The distinction from tendinopathy or "
            "strain: diffuse muscle-belly soreness, predictable time course, "
            "self-resolving. Manage with active recovery and gradual "
            "reintroduction; reassess if pain persists past 5 days, localizes, "
            "or sharpens."
        ),
        "sources": [
            {"type": "paper", "title": "Delayed onset muscle soreness: treatment strategies and performance factors",
             "authors": "Cheung K, Hume P, Maxwell L", "year": "2003",
             "venue": "Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/12617692/"},
        ],
    },

    # ── Glute ──────────────────────────────────────────────────────────────
    "piriformis_deep_gluteal": {
        "base_title": "Piriformis / deep gluteal syndrome",
        "why": "Deep buttock pain from repeated external hip rotation — heel hooks and wide drop knees. Can refer down the back of the leg.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Deep gluteal syndrome (including piriformis) is sciatic-like pain "
            "from compression or irritation of the sciatic nerve as it passes "
            "under the piriformis. In climbers, repeated end-range external "
            "hip rotation on heel hooks and wide drop knees is the typical "
            "trigger. Often confused with lumbar radiculopathy — careful "
            "exam differentiates (negative SLR with positive FAIR test is "
            "the classic deep-gluteal pattern). Conservative care first; "
            "imaging if symptoms persist."
        ),
        "sources": [
            {"type": "paper", "title": "Deep gluteal syndrome",
             "authors": "Martin HD, Reddy M, Gómez-Hoyos J", "year": "2015",
             "venue": "Journal of Hip Preservation Surgery",
             "url": "https://pubmed.ncbi.nlm.nih.gov/27011826/"},
            {"type": "expert", "title": "Climbing PT; deep-gluteal rehab and heel-hook load management.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "glute_med_strain": {
        "base_title": "Gluteus medius strain or weakness",
        "why": "Pain on the side of the hip, often paired with poor single-leg stability. Climbers under-train this.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Gluteus medius weakness is endemic in climbers — the sport "
            "doesn't drive frontal-plane hip stability so the muscle "
            "atrophies relative to its job. Symptoms range from pure "
            "weakness (Trendelenburg gait, poor single-leg balance) to "
            "lateral hip pain with high stepping. Rehab: targeted glute "
            "med strengthening (banded marches, side planks, weighted "
            "step-ups), maintained as a permanent training fixture not "
            "a one-off rehab block."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; glute med activation and side-plank progressions for climbers.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },
    "gtps": {
        "base_title": "Greater trochanteric pain syndrome / GTPS",
        "why": "Outer hip ache, tender to press on the bony point. Worse with side sleeping or crossed-leg sitting.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Greater trochanteric pain syndrome (GTPS) covers gluteal "
            "tendinopathy and trochanteric bursitis — historically called "
            "'trochanteric bursitis' but most cases are now understood to "
            "be glute med/min insertional tendinopathy. Lateral hip pain "
            "with tenderness over the greater trochanter, worse with side "
            "sleeping. Standard tendinopathy management: load reduction, "
            "isometric → progressive abductor loading; avoid prolonged "
            "side-lying compression of the trochanter."
        ),
        "sources": [
            {"type": "paper", "title": "Education plus exercise versus corticosteroid injection use versus a wait and see approach for chronic gluteal tendinopathy: prospective, single blinded, randomised clinical trial",
             "authors": "Mellor R, Bennell K, Grimaldi A, et al.", "year": "2018",
             "venue": "BMJ", "url": "https://pubmed.ncbi.nlm.nih.gov/29720479/"},
            {"type": "expert", "title": "Tendinopathy load framework applied to GTPS.",
             "authors": "Steven Low", "venue": "Overcoming Tendonitis",
             "url": "https://stevenlow.org/"},
        ],
    },
    "si_joint_dysfunction": {
        "base_title": "SI joint dysfunction",
        "why": "Sharp or dull pain at the dimple above the buttock — driven by asymmetric loading like stems and drop knees.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "SI joint dysfunction presents as localized pain at the PSIS "
            "dimples, sometimes referring into the buttock or proximal "
            "posterior thigh. In climbers it's commonly driven by asymmetric "
            "loading patterns — habitual one-sided stems, drop knees, or "
            "uneven training. Cluster testing (compression, distraction, "
            "thigh thrust) supports diagnosis. Manage with asymmetry "
            "correction, glute med activation, and pelvic stability work; "
            "manual therapy can provide short-term relief while strength "
            "interventions take hold."
        ),
        "sources": [
            {"type": "paper", "title": "The value of medical history and physical examination in diagnosing sacroiliac joint pain",
             "authors": "Laslett M", "year": "2008",
             "venue": "Journal of Manual & Manipulative Therapy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/19119406/"},
            {"type": "expert", "title": "Climbing PT; pelvic stability and asymmetry-correction approach for SI dysfunction.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },

    # ── Hamstring ──────────────────────────────────────────────────────────
    "proximal_hamstring_tendinopathy": {
        "base_title": "Proximal hamstring tendinopathy",
        "why": "Pain at the sit-bone where the hamstrings attach — the classic climbing hamstring injury, almost always from heel hooking.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Proximal hamstring tendinopathy is the most common climbing-specific "
            "hamstring injury, driven by repetitive eccentric pulling on heel "
            "hooks. Pain localizes to the ischial tuberosity (sit-bone) and is "
            "exacerbated by prolonged sitting + heavy heel hook loading. "
            "Standard tendinopathy progression: isometric hamstring loading "
            "(45° leg curl iso, single-leg bridge holds) in the irritable "
            "phase → HSR (Romanian deadlifts, Nordic hamstring) once tolerated. "
            "Volume reduction from heel-hook positions is mandatory during "
            "the rebuild."
        ),
        "sources": [
            {"type": "paper", "title": "Proximal hamstring tendinopathy: clinical aspects of assessment and management",
             "authors": "Goom TS, Malliaras P, Reiman MP, Purdam CR", "year": "2016",
             "venue": "Journal of Orthopaedic & Sports Physical Therapy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/27084841/"},
            {"type": "expert", "title": "Climbing PT; hamstring rehab + heel-hook reintroduction framework.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },
    "biceps_femoris_strain": {
        "base_title": "Biceps femoris (outer hamstring) strain",
        "why": "Sudden sharp pain on the outer back of the thigh during a heavy heel hook — the muscle most loaded by heel hook pulling.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Biceps femoris (lateral hamstring) is the most-loaded hamstring "
            "during heel hooking — sudden sharp pain on the outer posterior "
            "thigh during a heavy heel hook is the classic mechanism. Most "
            "are Grade I muscle strains; Grade III with significant retraction "
            "is rare but surgical-evaluation territory. Conservative care: "
            "2–3 weeks of relative rest from heel hooks, isometric and "
            "progressive eccentric hamstring loading, then gradual heel-hook "
            "reintroduction."
        ),
        "sources": [
            {"type": "paper", "title": "Acute first-time hamstring strains: muscle complex injury at the proximal MTJ",
             "authors": "Askling CM, Tengvar M, Saartok T, Thorstensson A",
             "year": "2007", "venue": "American Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/17293469/"},
            {"type": "expert", "title": "Climbing PT; biceps femoris rehab after heel-hook injuries.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "hamstring_midbelly": {
        "base_title": "Hamstring strain — mid-belly",
        "why": "Diffuse aching in the back of the thigh from overload or a sudden eccentric load.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Mid-belly hamstring strains are common after a sudden eccentric "
            "load — a heel hook slip, a stretched leg taking unexpected weight. "
            "Pain is diffuse across the muscle belly rather than localized to "
            "the sit-bone (proximal) or knee (distal). Standard muscle strain "
            "recovery: relative rest 1–2 weeks, isometric → progressive "
            "eccentric loading (Nordic hamstring is the gold standard), return "
            "to climbing volume gradually."
        ),
        "sources": [
            {"type": "paper", "title": "The Nordic Hamstring Exercise: a systematic review",
             "authors": "van der Horst N, Smits DW, Petersen J, Goedhart EA, Backx FJG",
             "year": "2015", "venue": "British Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/25883135/"},
            {"type": "expert", "title": "Tendinopathy and muscle strain rehab framework with hamstring-specific protocols.",
             "authors": "Steven Low", "venue": "Overcoming Tendonitis",
             "url": "https://stevenlow.org/"},
        ],
    },
    "high_hamstring_tendinopathy": {
        "base_title": "High hamstring tendinopathy / sit-bone irritation",
        "why": "Deep ache at the sit-bone, worse with prolonged sitting and heavy heel hook loading.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "High hamstring tendinopathy overlaps clinically with proximal "
            "hamstring tendinopathy — the same insertional irritation at the "
            "ischial tuberosity. Pain worsens with prolonged sitting (driving, "
            "desk work) and heavy heel hook loading. Management mirrors the "
            "proximal hamstring tendinopathy protocol: isometric holds in the "
            "irritable phase → HSR-style loading once tolerated, plus reducing "
            "the prolonged compression of sitting."
        ),
        "sources": [
            {"type": "paper", "title": "Proximal hamstring tendinopathy: clinical aspects of assessment and management",
             "authors": "Goom TS, Malliaras P, Reiman MP, Purdam CR", "year": "2016",
             "venue": "Journal of Orthopaedic & Sports Physical Therapy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/27084841/"},
        ],
    },

    # ── Calf ───────────────────────────────────────────────────────────────
    "calf_strain_gastroc": {
        "base_title": "Calf strain — gastrocnemius",
        "why": "Sudden sharp pain in the upper calf from a forceful push-off, often during approach hiking or aggressive smearing.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Gastrocnemius strain is a forceful push-off mechanism — a hard "
            "step on slab, an aggressive smear, a sudden uphill push on "
            "approach. Pain is in the upper/medial calf, often with a "
            "discrete moment of injury. Grade I strains recover in 1–3 "
            "weeks with relative rest + progressive loading; Grade III "
            "complete ruptures with a palpable defect are surgical-eval "
            "territory. Distinguish from Achilles rupture (lower, with "
            "positive Thompson test)."
        ),
        "sources": [
            {"type": "paper", "title": "Acute calf muscle strain: a systematic review",
             "authors": "Green B, Pizzari T", "year": "2017",
             "venue": "British Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/28259848/"},
        ],
    },
    "plantaris_rupture": {
        "base_title": "Plantaris rupture",
        "why": "Sudden snap behind the knee or upper calf — feels like Achilles rupture but is benign and resolves on its own.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Plantaris rupture is a small muscle injury that mimics calf "
            "strain or Achilles rupture but is essentially benign. The "
            "sudden snap behind the knee with bruising tracking down the "
            "calf can be alarming but resolves with conservative care in "
            "2–4 weeks. The clinical distinction matters: negative Thompson "
            "test, no Achilles gap, no significant functional loss. "
            "Reassurance + relative rest is the management."
        ),
        "sources": [
            {"type": "paper", "title": "Plantaris muscle rupture: a literature review",
             "authors": "Spang C, Alfredson H, Forsgren S", "year": "2016",
             "venue": "Knee Surgery, Sports Traumatology, Arthroscopy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/25288334/"},
        ],
    },
    "soleus_strain": {
        "base_title": "Soleus strain",
        "why": "Deep, lower calf ache from chronic loading — often worse when standing or walking with the knee bent (smearing, slab, multi-pitch belays).",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Soleus strains differ from gastrocnemius strains in being more "
            "insidious and load-related rather than acute. The soleus crosses "
            "only the ankle (not the knee) and is loaded in knee-flexed "
            "positions — exactly what climbing in slab, smearing, or "
            "multi-pitch belaying produces. Pain is deeper and lower in the "
            "calf. Conservative care + bent-knee loading rehab (calf raises "
            "with knee bent, seated heel raises) addresses the muscle "
            "specifically."
        ),
        "sources": [
            {"type": "paper", "title": "Soleus muscle strain: a comprehensive review",
             "authors": "Werner BC, Belkin NS, Kennelly S, et al.", "year": "2017",
             "venue": "Sports Health",
             "url": "https://pubmed.ncbi.nlm.nih.gov/27932620/"},
        ],
    },
    "calf_overuse_cramp": {
        "base_title": "Calf overuse / cramping",
        "why": "Diffuse soreness or transient cramping from new climbing trip volume — long approaches, multi-pitch, or hours on the wall. Distinct from a true strain — resolves with rest and electrolytes.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Exercise-associated calf cramping and DOMS are common when "
            "climbers ramp volume on trips — long approaches, multi-pitch "
            "days, sustained slab. Mechanism: muscular fatigue + electrolyte "
            "loss + new movement patterns. Distinct from a strain — diffuse "
            "rather than localized, no discrete injury moment, transient. "
            "Manage with hydration, electrolyte replacement, and graded "
            "volume reintroduction; reassess if pain localizes or persists "
            "past 5 days."
        ),
        "sources": [
            {"type": "paper", "title": "Exercise-associated muscle cramps: causes, treatment, and prevention",
             "authors": "Schwellnus MP", "year": "2009",
             "venue": "Sports Health",
             "url": "https://pubmed.ncbi.nlm.nih.gov/23015881/"},
        ],
    },
    "tennis_leg": {
        "base_title": "Tennis leg — medial gastroc tear at the musculotendinous junction",
        "why": "Sudden sharp pain mid-calf during a push-off or heel hook — a tear where the gastroc joins the Achilles. Often felt as a snap or sting at the inner calf.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "\"Tennis leg\" is a medial gastrocnemius tear at the "
            "musculotendinous junction — sudden sharp inner-calf pain with "
            "a snap sensation during forceful push-off. Despite the name "
            "it occurs in any sport with sudden explosive calf loading "
            "(climbers: hard heel hook, slab smear, dyno push-off). "
            "Conservative care: relative rest 2–4 weeks, gradual loading, "
            "Achilles + calf chain reintroduction. Distinguish from "
            "Achilles rupture (Thompson test, location)."
        ),
        "sources": [
            {"type": "paper", "title": "Tennis leg: clinical findings and management",
             "authors": "Bryan Dixon J", "year": "2009",
             "venue": "Current Reviews in Musculoskeletal Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/19468867/"},
        ],
    },
    "posterior_tibial_tendinopathy": {
        "base_title": "Posterior tibial tendinopathy",
        "why": "Medial calf and inner-ankle ache from heavy approach hiking — pain along the inside of the ankle and lower calf, worse with loaded downhill carries.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Posterior tibial tendinopathy is overuse of the tendon that "
            "supports the medial arch. In climbers it's almost always "
            "approach-related — long pack-loaded hikes (especially downhill) "
            "stress the tendon as it controls pronation. Untreated can "
            "progress to PTTD (insufficiency) with arch collapse. Rehab: "
            "load reduction from approach volume, isometric → progressive "
            "eccentric tibialis posterior loading, supportive footwear / "
            "orthotics for the medial arch."
        ),
        "sources": [
            {"type": "paper", "title": "Tibialis posterior tendinopathy: an updated overview",
             "authors": "Ross MH, Smith MD, Mellor R, Vicenzino B", "year": "2018",
             "venue": "Foot (Edinburgh)",
             "url": "https://pubmed.ncbi.nlm.nih.gov/29960185/"},
        ],
    },

    # ── Lower back ─────────────────────────────────────────────────────────
    "nonspecific_lower_back": {
        "base_title": "Non-specific lower back pain",
        "why": "Load-related — driven by volume on steep terrain or sudden training spikes.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Non-specific lower back pain accounts for the vast majority of "
            "LBP — no clear anatomical source on imaging or exam, often "
            "driven by load + posture + training spikes. Climbers get it "
            "from steep-terrain volume (sustained core engagement), "
            "asymmetric loading patterns, or insufficient core conditioning. "
            "Modern care emphasizes movement, not bedrest: graded "
            "reintroduction of activity, address load progression, "
            "strengthen what's weak (often glutes + deep core). Persistent "
            "or progressive symptoms warrant evaluation."
        ),
        "sources": [
            {"type": "paper", "title": "Non-specific low back pain",
             "authors": "Maher C, Underwood M, Buchbinder R", "year": "2017",
             "venue": "The Lancet",
             "url": "https://pubmed.ncbi.nlm.nih.gov/27745712/"},
            {"type": "expert", "title": "Climbing PT; back-pain frameworks for steep-climbing and core-demand patterns.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "lumbar_strain_facet": {
        "base_title": "Lumbar muscle / facet strain",
        "why": "Awkward loaded positions strain paraspinal muscles and facet joints.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Lumbar muscle / facet strain presents with localized low-back "
            "pain after an awkward loaded position — twisting moves on "
            "overhanging climbing, asymmetric stems, or a hard catch with "
            "the trunk rotated. Facet-pattern pain is typically extension- "
            "and rotation-provoked. Recovery is usually 1–3 weeks with "
            "relative rest, then graded reintroduction of climbing. Address "
            "core symmetry + hip mobility to reduce recurrence."
        ),
        "sources": [
            {"type": "paper", "title": "Lumbar facet joint syndrome: a comprehensive review",
             "authors": "Cohen SP, Raja SN", "year": "2007",
             "venue": "Anesthesiology",
             "url": "https://pubmed.ncbi.nlm.nih.gov/17413912/"},
        ],
    },
    "lumbar_disc": {
        "base_title": "Lumbar disc irritation",
        "why": "Sudden back pain from a loaded movement may involve disc irritation.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Lumbar disc irritation/herniation presents with back pain often "
            "with leg referral, worse with flexion + loading. The McKenzie "
            "directional preference (extension-preference vs flexion-preference) "
            "guides early rehab. Red flags requiring urgent evaluation: "
            "bilateral leg symptoms, saddle anesthesia, bowel/bladder "
            "changes (cauda equina screen). Conservative care manages most "
            "non-red-flag cases; surgical evaluation for progressive "
            "neurologic deficit or refractory radicular pain."
        ),
        "sources": [
            {"type": "paper", "title": "Lumbar disc herniation",
             "authors": "Deyo RA, Mirza SK", "year": "2016",
             "venue": "New England Journal of Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/27144852/"},
            {"type": "expert", "title": "Climbing PT; directional-preference assessment and load progression for climbing-related back pain.",
             "authors": "Esther Smith, DPT", "venue": "Grassroots Physical Therapy",
             "url": "https://grassrootsphysicaltherapy.com/"},
        ],
    },
    "radiculopathy": {
        "base_title": "Nerve root irritation / radiculopathy",
        "why": "Numbness or tingling travelling down the leg warrants evaluation — especially if following a dermatomal pattern.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Radicular pain — numbness, tingling, or sharp shooting pain "
            "following a dermatomal pattern down the leg — suggests nerve "
            "root irritation, typically from disc herniation, foraminal "
            "stenosis, or other neuroforaminal compromise. Positive straight "
            "leg raise and dermatomal sensory/motor findings support the "
            "diagnosis. Watch for red flags (bilateral symptoms, saddle "
            "anesthesia, bowel/bladder changes — cauda equina). Conservative "
            "care manages most cases; progressive weakness or refractory "
            "radicular pain warrants imaging + surgical eval."
        ),
        "sources": [
            {"type": "paper", "title": "Lumbar radiculopathy: a review",
             "authors": "Tarulli AW, Raynor EM", "year": "2007",
             "venue": "Neurologic Clinics",
             "url": "https://pubmed.ncbi.nlm.nih.gov/17445733/"},
        ],
    },

    # ── Ankle / foot ───────────────────────────────────────────────────────
    "ankle_sprain_atfl": {
        "base_title": "Lateral ankle sprain — ATFL",
        "why": "Outer ankle pain after rolling the ankle. Ottawa Rules should be applied to rule out fracture.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Lateral ankle sprain (ATFL) is the most common ankle injury, "
            "typically from inversion (rolling the foot inward). Apply the "
            "Ottawa Ankle Rules to decide whether X-rays are needed (bony "
            "tenderness or inability to bear weight = image). Most Grade I–II "
            "sprains respond to early protected mobilization, NOT prolonged "
            "immobilization. Recurrent sprains are common — proprioceptive "
            "training (single-leg balance, BOSU work) is the standard "
            "preventive intervention. In climbers, falls from height onto "
            "uneven landings are the typical mechanism."
        ),
        "sources": [
            {"type": "paper", "title": "The Ottawa ankle rules: a systematic review",
             "authors": "Bachmann LM, Kolb E, Koller MT, Steurer J, ter Riet G",
             "year": "2003", "venue": "BMJ",
             "url": "https://pubmed.ncbi.nlm.nih.gov/12595378/"},
            {"type": "paper", "title": "Lateral ankle sprain in athletes: diagnosis and treatment",
             "authors": "Polzer H, Kanz KG, Prall WC, et al.", "year": "2012",
             "venue": "Orthopaedic Reviews",
             "url": "https://pubmed.ncbi.nlm.nih.gov/22577506/"},
        ],
    },
    "peroneal_strain": {
        "base_title": "Peroneal tendon strain",
        "why": "Pain behind the lateral ankle — worsens with foot eversion and smearing.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Peroneal tendon strain or tendinopathy presents with pain "
            "behind the lateral malleolus, worse with resisted eversion. "
            "In climbers, often follows after a lateral ankle sprain (the "
            "peroneals overwork to compensate for ATFL laxity) or aggressive "
            "smearing where lateral foot loading is sustained. Rehab: "
            "address proprioception + ankle stability first if there's "
            "an instability history, then progressive peroneal eccentric "
            "loading."
        ),
        "sources": [
            {"type": "paper", "title": "Peroneal tendon injuries",
             "authors": "Heckman DS, Reddy S, Pedowitz D, Wapner KL, Parekh SG",
             "year": "2008", "venue": "Journal of Bone and Joint Surgery (American)",
             "url": "https://pubmed.ncbi.nlm.nih.gov/18450977/"},
        ],
    },
    "plantar_fasciitis": {
        "base_title": "Plantar fasciitis",
        "why": "Heel pain worst with first steps in the morning — common from aggressive shoe downsizing or high approach mileage.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Plantar fasciitis is degenerative thickening + irritation of "
            "the plantar fascia at its calcaneal origin. Classic presentation: "
            "sharp heel pain with first steps in the morning that eases "
            "with movement but returns after prolonged loading. Climbers "
            "get it from aggressive shoe downsizing (tight performance "
            "shoes compress + irritate) plus high approach mileage. "
            "Conservative care: load reduction, calf + plantar fascia "
            "stretching, isometric → progressive plantar fascia loading "
            "(heel raise with towel under toes), supportive footwear "
            "for daily life."
        ),
        "sources": [
            {"type": "paper", "title": "High-load strength training improves outcome in patients with plantar fasciitis",
             "authors": "Rathleff MS, Mølgaard CM, Fredberg U, et al.", "year": "2015",
             "venue": "Scandinavian Journal of Medicine & Science in Sports",
             "url": "https://pubmed.ncbi.nlm.nih.gov/25145882/"},
        ],
    },
    "achilles_tendinopathy": {
        "base_title": "Achilles tendinopathy",
        "why": "Posterior heel/calf pain — associated with high-mileage hiking on climbing trips.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Achilles tendinopathy is overuse of the Achilles tendon, "
            "presenting as posterior calf/heel pain that's worst with "
            "loading after rest (morning stiffness, first steps). In "
            "climbers, the trigger is usually a hiking volume spike "
            "(approaches on climbing trips). Heavy slow resistance (Alfredson "
            "eccentric heel-drop protocol) is the well-validated rehab — "
            "two sets of 15 reps, knee straight + bent, twice daily for "
            "12 weeks. Volume reduction during the early irritable phase, "
            "then graded reintroduction."
        ),
        "sources": [
            {"type": "paper", "title": "Heavy-load eccentric calf muscle training for the treatment of chronic Achilles tendinosis",
             "authors": "Alfredson H, Pietilä T, Jonsson P, Lorentzon R",
             "year": "1998", "venue": "American Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/9617396/"},
            {"type": "expert", "title": "Tendinopathy load framework with Achilles-specific application.",
             "authors": "Steven Low", "venue": "Overcoming Tendonitis",
             "url": "https://stevenlow.org/"},
        ],
    },

    # ── Chest ──────────────────────────────────────────────────────────────
    "pec_minor_costochondral": {
        "base_title": "Pectoralis minor / costochondral strain",
        "why": "Overuse from high volume pulling, steep climbing, or a sudden dynamic catch.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Pectoralis minor overuse and costochondral strain produce "
            "anterior chest wall pain from high-volume pulling on steep "
            "terrain. The pec minor pulls the scapula forward and inferior; "
            "chronic over-recruitment contributes to the rounded-shoulder "
            "posture climbers often develop. Rehab pairs pec minor "
            "release/mobility with antagonist strengthening (rhomboids, "
            "lower traps, posterior cuff) and addressing thoracic mobility. "
            "Persistent sharp chest pain warrants rule-out of true rib or "
            "cardiac etiology."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; pec minor / anterior chain rehab for steep-pulling imbalances.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "pec_major_tear": {
        "base_title": "Pectoralis major strain or tear",
        "why": "Sudden pop or sharp pain during a powerful cross-body or dynamic move warrants evaluation.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Pec major tears occur with a sudden eccentric load with the "
            "arm abducted and externally rotated — for climbers, typically "
            "a hard cross-body dyno-catch or a campus rung miss. The "
            "humeral insertion is the most common rupture site; presentation "
            "includes a pop, sharp pain, visible bruising, and weakness in "
            "adduction/internal rotation. Complete ruptures (Grade III) "
            "in athletic populations typically need surgical repair within "
            "2–3 weeks — get imaging fast for any post-pop anterior chest "
            "pain with weakness."
        ),
        "sources": [
            {"type": "paper", "title": "Pectoralis major tendon rupture: surgical vs nonsurgical management",
             "authors": "Bak K, Cameron EA, Henderson IJ", "year": "2000",
             "venue": "Knee Surgery, Sports Traumatology, Arthroscopy",
             "url": "https://pubmed.ncbi.nlm.nih.gov/10963365/"},
            {"type": "expert", "title": "Climbing-medicine surgeon; managing pec injuries from dynamic-catch mechanisms.",
             "authors": "Volker Schöffl, MD, PhD", "venue": "Klinikum Bamberg",
             "url": "https://www.dav-medizin.de/"},
        ],
    },
    "rib_costochondritis": {
        "base_title": "Rib stress / costochondritis",
        "why": "Localised rib pain that worsens with breathing, coughing, or twisting. Can result from repeated rib cage loading on overhangs.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Costochondritis is inflammation at the costochondral junctions "
            "where the ribs meet the sternum — localized sharp pain reproduced "
            "by direct palpation and worse with deep breathing, coughing, or "
            "twisting. In climbers it follows repeated rib cage loading on "
            "overhangs or sustained core engagement. Self-limiting condition "
            "managed with relative rest + NSAIDs; if sharp pain persists "
            "or is not reproducible on palpation, rule out rib stress "
            "fracture, pleuritis, or referred visceral pain."
        ),
        "sources": [
            {"type": "paper", "title": "Costochondritis",
             "authors": "Proulx AM, Zryd TW", "year": "2009",
             "venue": "American Family Physician",
             "url": "https://pubmed.ncbi.nlm.nih.gov/19873964/"},
        ],
    },
    "serratus_intercostal_overuse": {
        "base_title": "Serratus anterior / intercostal overuse",
        "why": "Dull ache along the ribcage from sustained isometric loading on steep terrain.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Serratus anterior and intercostal overuse produces a diffuse "
            "lateral ribcage ache from sustained isometric trunk loading "
            "on steep terrain — those muscles do a lot of work stabilizing "
            "the scapula and rotating/holding the trunk during overhanging "
            "climbing. Self-limiting with relative rest; address core "
            "conditioning + thoracic mobility for prevention. Persistent "
            "sharp localized pain warrants rule-out of rib stress fracture "
            "or costochondritis."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; addresses serratus and lateral chest wall overuse from steep climbing.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },

    # ── Neck ───────────────────────────────────────────────────────────────
    "cervical_muscle_strain": {
        "base_title": "Cervical muscle strain",
        "why": "Neck stiffness and pain from sustained overhead positions or awkward body positions on the wall.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Cervical muscle strain in climbers is typically driven by "
            "sustained head extension while belaying or projecting overhead "
            "lines — the deep neck flexors fatigue, the upper traps + "
            "levator overwork. Self-limiting with activity modification "
            "(belay glasses, intentional neck breaks), deep neck flexor "
            "activation work, and addressing thoracic mobility upstream."
        ),
        "sources": [
            {"type": "expert", "title": "Climbing PT; belayer's neck and cervical strain rehab framework.",
             "authors": "Jared Vagy, DPT", "venue": "The Climbing Doctor",
             "url": "https://theclimbingdoctor.com/"},
        ],
    },
    "cervical_radiculopathy": {
        "base_title": "Cervical radiculopathy",
        "why": "Numbness or tingling radiating into the arm from a compressed nerve root in the neck — warrants evaluation.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Cervical radiculopathy is nerve root compression in the neck, "
            "producing dermatomal arm symptoms (numbness, tingling, weakness) "
            "that follow a specific nerve distribution. Spurling's test "
            "(extension + rotation + compression) reproducing arm symptoms "
            "supports diagnosis. Most cases improve with conservative care "
            "(activity modification, McKenzie cervical retractions, "
            "addressing posture) over 6–12 weeks; progressive weakness, "
            "bowel/bladder changes, or refractory radicular pain warrant "
            "imaging + surgical eval."
        ),
        "sources": [
            {"type": "paper", "title": "Cervical radiculopathy: a review",
             "authors": "Caridi JM, Pumberger M, Hughes AP", "year": "2011",
             "venue": "HSS Journal",
             "url": "https://pubmed.ncbi.nlm.nih.gov/22942844/"},
        ],
    },
    "acute_cervical_disc": {
        "base_title": "Acute cervical disc injury",
        "why": "Sudden high-intensity neck pain may involve disc irritation — imaging recommended.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Acute cervical disc injury presents as sudden severe neck pain "
            "often with arm or interscapular referral. Mechanism in climbers "
            "can be a fall (whip + extension), a hard catch with the head "
            "thrown back, or a sustained loaded position gone wrong. Red "
            "flags warranting urgent evaluation: bilateral arm symptoms, "
            "leg weakness or sensory changes, bowel/bladder issues, or "
            "myelopathic signs (Hoffmann, Babinski). Conservative care for "
            "non-red-flag cases; MRI + surgical consult for progressive "
            "neurologic findings."
        ),
        "sources": [
            {"type": "paper", "title": "Cervical disc herniation: clinical features and management",
             "authors": "Eubanks JD", "year": "2010",
             "venue": "American Family Physician",
             "url": "https://pubmed.ncbi.nlm.nih.gov/20146493/"},
        ],
    },
    "cervical_facet": {
        "base_title": "Cervical facet irritation",
        "why": "Gradually worsening neck stiffness from repeated sustained positions — common in roof climbers.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
        "reasoning_basis": (
            "Cervical facet irritation produces gradually worsening neck "
            "pain, often unilateral, with reduced ROM in extension + "
            "rotation toward the painful side (closing the affected facet). "
            "In roof climbers it's driven by sustained extension under "
            "load. Conservative care: address postural drivers, deep "
            "neck flexor work, mobility for extension and rotation, "
            "manual therapy for short-term symptom relief. Persistent "
            "or progressive symptoms warrant imaging."
        ),
        "sources": [
            {"type": "paper", "title": "Cervical facet joint pain: a review",
             "authors": "Manchikanti L, Boswell MV, Singh V, et al.", "year": "2004",
             "venue": "Pain Physician",
             "url": "https://pubmed.ncbi.nlm.nih.gov/16868606/"},
        ],
    },

    # ── Special / generic ──────────────────────────────────────────────────
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
        "reasoning_basis": (
            "The acute-tissue-injury bucket flags presentations where the "
            "combination of high pain at rest, specific incident, and "
            "functional loss suggests structural damage that warrants "
            "professional evaluation rather than self-management. The "
            "principle is conservative: when symptoms exceed what a "
            "load-management approach should handle, route to a clinician "
            "before progressing rehab. This bucket isn't a diagnosis — "
            "it's a safety screen."
        ),
        "sources": [
            {"type": "paper", "title": "Acute musculoskeletal injury: diagnosis and management principles",
             "authors": "Järvinen TA, Järvinen TL, Kääriäinen M, Kalimo H, Järvinen M",
             "year": "2005", "venue": "Medicine & Science in Sports & Exercise",
             "url": "https://pubmed.ncbi.nlm.nih.gov/15735379/"},
            {"type": "expert", "title": "IFSC Medical Commission; acute climbing injury triage guidance.",
             "authors": "Volker Schöffl, MD, PhD", "venue": "Klinikum Bamberg",
             "url": "https://www.dav-medizin.de/"},
        ],
    },
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
        "reasoning_basis": (
            "Acute:chronic workload ratio (ACWR) is the most-cited construct "
            "in sports-injury risk research — spikes above ~1.5 (acute / "
            "chronic load) materially raise injury rates. The practical rule "
            "for climbers is the ~10–20% weekly progression limit: ramp "
            "harder than that and tissue can't keep up. Most pain that "
            "doesn't follow a discrete incident is load-management, not "
            "structural injury. Address with deload, then ramp gradually "
            "(~10%/week) with attention to the variable that spiked "
            "(volume, intensity, or grade)."
        ),
        "sources": [
            {"type": "paper", "title": "The acute:chronic workload ratio in relation to injury risk in professional rugby league",
             "authors": "Hulin BT, Gabbett TJ, Lawson DW, Caputi P, Sampson JA",
             "year": "2016", "venue": "British Journal of Sports Medicine",
             "url": "https://pubmed.ncbi.nlm.nih.gov/26511006/"},
            {"type": "expert", "title": "Load-management framework for sport training; widely-cited 10% rule for progression.",
             "authors": "Tim Gabbett, PhD", "venue": "Gabbett Performance Solutions",
             "url": "https://www.gabbettperformance.com.au/"},
            {"type": "expert", "title": "Climbing-specific volume and periodization framework.",
             "authors": "Steven Low", "venue": "Overcoming Gravity",
             "url": "https://stevenlow.org/"},
        ],
    },
}
