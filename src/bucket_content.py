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
