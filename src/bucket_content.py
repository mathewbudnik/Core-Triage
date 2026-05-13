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
    "thoracic_spine_hypomobility": {
        "base_title": "Thoracic spine hypomobility",
        "why": "Central mid-back stiffness and ache from poor T-spine mobility. Often improves with movement and worsens with sustained postures — the mechanical root behind many of the muscular complaints.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "costovertebral_rib_dysfunction": {
        "base_title": "Costovertebral / rib joint dysfunction",
        "why": "Sharp localized pain that follows a rib line, often worse with deep breaths or rotating the trunk. Common from gastons and twisting moves.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "cervicothoracic_junction_strain": {
        "base_title": "Cervicothoracic junction strain",
        "why": "Combined neck and upper-back pain at the base of the neck — common from looking up at routes while pulling hard, especially on overhang.",
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
        "why": "Deep, lower calf ache from chronic loading — often worse when standing or walking with the knee bent (smearing, slab, multi-pitch belays).",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "calf_overuse_cramp": {
        "base_title": "Calf overuse / cramping",
        "why": "Diffuse soreness or transient cramping from new climbing trip volume — long approaches, multi-pitch, or hours on the wall. Distinct from a true strain — resolves with rest and electrolytes.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "tennis_leg": {
        "base_title": "Tennis leg — medial gastroc tear at the musculotendinous junction",
        "why": "Sudden sharp pain mid-calf during a push-off or heel hook — a tear where the gastroc joins the Achilles. Often felt as a snap or sting at the inner calf.",
        "matches_if": [], "not_likely_if": [], "quick_test": "",
    },
    "posterior_tibial_tendinopathy": {
        "base_title": "Posterior tibial tendinopathy",
        "why": "Medial calf and inner-ankle ache from heavy approach hiking — pain along the inside of the ankle and lower calf, worse with loaded downhill carries.",
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
}
