/**
 * Phase 5 wizard data — single source of truth for the upgraded triage flow.
 *
 * Calibrated for self-diagnosable climbing injuries. This app is NOT a tool
 * for true medical emergencies — anything 911-tier (cauda equina, cord
 * compression, neurovascular compromise, open fractures) has been removed.
 * The disclaimer covers that case.
 *
 * Status: data layer only. The TriageTab.jsx component still uses the legacy
 * 5-step flow. Wiring this into a new wizard component is morning work.
 */

export const ONSET_TYPES = [
  { value: 'sudden_specific',   label: 'Sudden during a specific move' },
  { value: 'gradual_session',   label: 'Gradual over a session' },
  { value: 'built_up_days',     label: 'Built up over days or weeks' },
  { value: 'already_bothering', label: 'Already bothering me when I noticed' },
]

// Region-specific climbing situation options for the acute (sudden) onset path.
// The `key` matches keys consumed by the triage engine's CLIMBING_SITUATIONS map.
export const CLIMBING_SITUATIONS_BY_REGION = {
  'Finger':     [
    { key: 'full_crimp_small_hold', label: 'Crimping on a small hold' },
    { key: 'dynamic_catch',         label: 'Catching a sloper dynamically' },
    { key: 'crack_jamming',         label: 'Jamming in a crack' },
    { key: 'campus_board',          label: 'Campus board move' },
    { key: 'fall_outstretched_hand',label: 'Catching a fall' },
  ],
  'Hand':       [
    { key: 'full_crimp_small_hold', label: 'Crimping on a small hold' },
    { key: 'dynamic_catch',         label: 'Catching a sloper dynamically' },
    { key: 'crack_jamming',         label: 'Jamming in a crack' },
    { key: 'campus_board',          label: 'Campus board move' },
    { key: 'fall_outstretched_hand',label: 'Catching a fall' },
  ],
  'Elbow':      [
    { key: 'heavy_lockoff',         label: 'Lock-off position' },
    { key: 'campus_board',          label: 'Campus board' },
    { key: 'undercling',            label: 'Undercling sequence' },
    { key: 'arm_straightened',      label: 'Arm straightened quickly against resistance' },
    { key: 'dynamic_catch',         label: 'Catching a swing' },
  ],
  'Shoulder':   [
    { key: 'dyno_catch',            label: 'Dyno or dynamic catch' },
    { key: 'overhead_steep',        label: 'Overhead reach on steep terrain' },
    { key: 'fall_caught_rope',      label: 'Fall caught by rope' },
    { key: 'compression_arete',     label: 'Compression on arete' },
    { key: 'drop_knee',             label: 'Drop knee with shoulder load' },
  ],
  'Knee':       [
    { key: 'heel_hook',             label: 'Heel hook' },
    { key: 'drop_knee',             label: 'Drop knee' },
    { key: 'high_step_steep',       label: 'High step on steep terrain' },
    { key: 'boulder_landing',       label: 'Landing from a boulder problem' },
    { key: 'mantling',              label: 'Mantling' },
  ],
  'Lower Back': [
    { key: 'wide_stemming',         label: 'Stemming wide' },
    { key: 'roof_climbing',         label: 'Roof climbing' },
    { key: 'mantle_shelf',          label: 'Mantle shelf' },
    { key: 'long_approach_pack',    label: 'Long approach with pack' },
    { key: 'twisting_reach',        label: 'Twisting reach' },
  ],
  'Wrist':      [
    { key: 'fall_outstretched_hand',label: 'Fall on outstretched hand' },
    { key: 'undercling',            label: 'Undercling' },
    { key: 'wrist_rotation_load',   label: 'Wrist rotation under load' },
    { key: 'pinch_grip',            label: 'Pinch grip' },
    { key: 'sidepull_torque',       label: 'Sidepull with torque' },
  ],
  'Ankle':      [
    { key: 'boulder_landing',       label: 'Landing from boulder' },
    { key: 'slip_off_foothold',     label: 'Slipping off foothold' },
    { key: 'approach_trail',        label: 'Approach trail' },
    { key: 'slab_smearing',         label: 'Smearing on slab' },
  ],
  'Foot':       [
    { key: 'boulder_landing',       label: 'Landing from boulder' },
    { key: 'slip_off_foothold',     label: 'Slipping off foothold' },
    { key: 'approach_trail',        label: 'Approach trail' },
    { key: 'slab_smearing',         label: 'Smearing on slab' },
  ],
}

export const TRAINING_CONTEXT = [
  { key: 'volume_spike',     label: 'Volume spike' },
  { key: 'intensity_spike',  label: 'Intensity spike' },
  { key: 'new_technique',    label: 'New technique or hold type' },
  { key: 'started_hangboard',label: 'Started hangboard or campus board' },
  { key: 'returning_break',  label: 'Returning after a break' },
  { key: 'no_change',        label: 'No change' },
]

// Region-specific multi-select sensations.
// `flag` (optional) marks a sensation that should trigger an urgent-referral
// confirmation in the silent screen. Only climbing-recognizable injuries
// that benefit from prompt specialist evaluation get a flag.
export const SENSATIONS_BY_REGION = {
  'Finger': [
    { key: 'sharp_local',       label: 'Sharp pain at a specific point I can poke' },
    { key: 'dull_along',        label: 'Dull ache along the whole finger' },
    { key: 'swelling',          label: 'Swelling or puffy feeling' },
    { key: 'pop_at_injury',     label: 'Felt or heard a pop at moment of injury' },
    { key: 'grinding_clicking', label: 'Grinding or clicking when I bend it' },
    { key: 'numbness_tingling', label: 'Numbness or tingling' },
    { key: 'tendon_lifting',    label: 'The tendon looks like it is lifting off the bone when I flex', flag: 'bowstringing' },
  ],
  'Elbow': [
    { key: 'medial_pain',       label: 'Pain on the inside of the elbow pinky side' },
    { key: 'lateral_pain',      label: 'Pain on the outside of the elbow thumb side' },
    { key: 'anterior_pain',     label: 'Pain at the front of the elbow' },
    { key: 'ulnar_tingling',    label: 'Tingling in ring finger and pinky' },
    { key: 'grip_weakness',     label: 'Weakness when gripping' },
    { key: 'clicking_snapping', label: 'Clicking or snapping' },
    { key: 'anterior_pop',      label: 'Felt a pop at the front of the elbow', flag: 'distal_bicep' },
  ],
  'Shoulder': [
    { key: 'deep_joint_pain',   label: 'Pain deep inside the shoulder joint' },
    { key: 'top_pain',          label: 'Pain at the top of the shoulder' },
    { key: 'anterior_pain',     label: 'Pain at the front of the shoulder' },
    { key: 'clicking_clunking', label: 'Clicking or clunking with movement' },
    { key: 'shifted_slipped',   label: 'Shoulder feels like it shifted or slipped', flag: 'shoulder_dislocation' },
    { key: 'overhead_pain',     label: 'Pain reaching overhead' },
    { key: 'night_pain',        label: 'Pain lying on that shoulder at night' },
  ],
  'Knee': [
    { key: 'anterior_below_kneecap', label: 'Pain at the front of the knee below the kneecap' },
    { key: 'lateral_pain',           label: 'Pain on the outside of the knee' },
    { key: 'medial_pain',            label: 'Pain on the inside of the knee' },
    { key: 'swelling_hours',         label: 'Swelling that developed over hours' },
    { key: 'locked_caught',          label: 'Knee feels like it locked or caught', flag: 'locked_knee' },
    { key: 'pop_at_injury',          label: 'Felt a pop at moment of injury' },
    { key: 'deep_flexion_pain',      label: 'Pain with deep knee bend' },
  ],
  'Lower Back': [
    { key: 'muscle_spasm',           label: 'Muscle tightness and spasm' },
    { key: 'sharp_with_movement',    label: 'Sharp pain with certain movements' },
    { key: 'radiating_buttock_leg',  label: 'Pain that travels into my buttock or leg' },
    { key: 'unilateral_tingling',    label: 'Tingling or numbness down one leg' },
  ],
  'Wrist': [
    { key: 'thumb_side_pain',        label: 'Pain on the thumb side' },
    { key: 'pinky_side_pain',        label: 'Pain on the pinky side' },
    { key: 'central_pain',           label: 'Pain in the middle of the wrist' },
    { key: 'clicking_rotation',      label: 'Clicking or snapping with rotation' },
    { key: 'unstable_loose',         label: 'Wrist feels unstable or loose' },
    { key: 'snuffbox_tender',        label: 'Tender in the groove at the thumb base', flag: 'scaphoid' },
  ],
  'Ankle': [
    { key: 'lateral_pain',           label: 'Pain on the outside of the ankle' },
    { key: 'medial_pain',            label: 'Pain on the inside of the ankle' },
    { key: 'morning_heel_pain',      label: 'Pain at the heel worst in the morning' },
    { key: 'lateral_foot_pain',      label: 'Pain along the outside of the foot' },
    { key: 'cannot_full_weight',     label: 'Unable to put full weight on it', flag: 'ottawa_rules' },
    { key: 'rapid_bruising',         label: 'Significant bruising appeared quickly' },
  ],
  'Foot': [
    { key: 'lateral_pain',           label: 'Pain on the outside of the ankle' },
    { key: 'medial_pain',            label: 'Pain on the inside of the ankle' },
    { key: 'morning_heel_pain',      label: 'Pain at the heel worst in the morning' },
    { key: 'lateral_foot_pain',      label: 'Pain along the outside of the foot' },
    { key: 'cannot_full_weight',     label: 'Unable to put full weight on it', flag: 'ottawa_rules' },
    { key: 'rapid_bruising',         label: 'Significant bruising appeared quickly' },
  ],
  'Neck': [
    { key: 'stiffness',              label: 'Neck stiffness with movement' },
    { key: 'one_arm_tingling',       label: 'Tingling or numbness down one arm' },
  ],
}

export const PAIN_LEVEL_OPTIONS = [
  { key: 'finished_session', label: 'Noticeable but I finished the session', severity: 'mild',     numeric: 3 },
  { key: 'had_to_stop',      label: 'Had to stop climbing because of it',    severity: 'moderate', numeric: 6 },
  { key: 'immediate_stop',   label: 'Immediately stopped and could not continue', severity: 'severe', numeric: 8 },
]

export const PAIN_TRAJECTORY = [
  { key: 'better', label: 'Better' },
  { key: 'same',   label: 'About the same' },
  { key: 'worse',  label: 'Worse' },
]

// Region-specific functional check (Screen 6).
// `criticalNoFlag` (optional): the flag to raise immediately on No.
export const FUNCTIONAL_CHECKS_BY_REGION = {
  'Finger':     { question: 'Can you make a full fist without pain?' },
  'Hand':       { question: 'Can you make a full fist without pain?' },
  'Elbow':      { question: 'Can you straighten your arm fully?' },
  'Shoulder':   { question: 'Can you raise your arm above your head?' },
  'Knee':       { question: 'Can you fully straighten your knee?', criticalNoFlag: 'locked_knee' },
  'Lower Back': { question: 'Can you stand up straight without significant pain?' },
  'Wrist':      { question: 'Can you rotate your wrist palm up to palm down?' },
  'Ankle':      { question: 'Can you put your full weight on it and take 4 steps?', criticalNoFlag: 'ottawa_rules' },
  'Foot':       { question: 'Can you put your full weight on it and take 4 steps?', criticalNoFlag: 'ottawa_rules' },
  'Neck':       { question: 'Can you turn your head pain-free in both directions?' },
}

// Silent screen (Screen 7) — region-specific natural-language Yes/No questions
// that confirm a climbing-recognizable injury benefiting from prompt specialist
// evaluation. Each `yes_action` maps to a key in URGENT_REFERRAL_CONTENT.
export const SILENT_RED_FLAGS_BY_REGION = {
  'Finger': [
    {
      flag: 'bowstringing',
      question: 'Can you see the tendon visibly lifting away from the finger bone when you flex?',
      yes_action: 'bowstringing_referral',
    },
  ],
  'Elbow': [
    {
      flag: 'distal_bicep',
      question: 'Did you feel a pop at the front of your elbow with an immediate visible change in muscle shape?',
      yes_action: 'distal_bicep_referral',
    },
  ],
  'Shoulder': [
    {
      flag: 'shoulder_dislocation',
      question: 'Did the shoulder actually come out of the socket?',
      yes_action: 'shoulder_dislocation_referral',
    },
  ],
  'Wrist': [
    {
      flag: 'scaphoid',
      question: 'Did you fall on your outstretched hand and is there pain pressing into the groove at the base of your thumb?',
      yes_action: 'scaphoid_referral',
    },
  ],
}

// History screen (Screen 8) options
export const HISTORY_QUESTIONS = [
  {
    field: 'prior_injury',
    question: 'Have you injured this area before?',
    options: [
      { key: 'yes', label: 'Yes' },
      { key: 'no',  label: 'No' },
    ],
  },
  {
    field: 'years_climbing',
    question: 'How long have you been climbing?',
    options: [
      { key: '<1',   label: 'Less than 1 year' },
      { key: '1-3',  label: '1–3 years' },
      { key: '3-5',  label: '3–5 years' },
      { key: '5+',   label: '5+ years' },
    ],
  },
  {
    field: 'hangboard_user',
    question: 'Do you train on hangboard or campus board regularly?',
    options: [
      { key: 'yes', label: 'Yes' },
      { key: 'no',  label: 'No' },
    ],
  },
]

// Urgent-referral copy. Each entry contains plain-language description, the
// recommended next step, and "what NOT to do" specific to the situation.
// Tone: firm but not terrifying. No 911 or ER framing — that's the disclaimer's job.
export const URGENT_REFERRAL_CONTENT = {
  bowstringing_referral: {
    title: 'See a hand specialist before climbing again',
    plain: 'A tendon visibly lifting away from the bone when you flex (bowstringing) means the pulley structures that hold the tendon to the finger are no longer doing their job. This is a known climbing injury and is treatable, but it needs a proper assessment.',
    action: 'Book with a hand specialist or sports orthopedist this week. Ask about ultrasound or MRI imaging.',
    do_not: [
      'Do not load the finger with grip activity.',
      'Do not tape the finger and try to climb on it.',
    ],
  },
  distal_bicep_referral: {
    title: 'See an orthopedic surgeon promptly',
    plain: 'A pop at the front of the elbow with a visible change in arm muscle shape suggests the distal biceps tendon has detached. There is roughly a 2–3 week window where surgical reattachment gives the best outcome, so timing matters.',
    action: 'Book with a hand or upper-extremity orthopedic surgeon in the next day or two.',
    do_not: [
      'Do not wait to "see if it gets better".',
      'Do not load the arm with pulling movements.',
    ],
  },
  shoulder_dislocation_referral: {
    title: 'See a clinician this week',
    plain: 'A shoulder that fully came out of the socket can stretch surrounding ligaments and is much more likely to dislocate again, especially the first time it happens. A proper evaluation guides whether you need PT, imaging, or further care.',
    action: 'Book with a sports doctor or orthopedist this week. Sooner if pain or weakness has not settled.',
    do_not: [
      'Do not climb, hang, or load the shoulder.',
      'Do not push or pull through pain to "test" the shoulder.',
    ],
  },
  scaphoid_referral: {
    title: 'Treat this as a fracture until imaging clears it',
    plain: 'Pain at the base of the thumb after a fall on the outstretched hand can be a scaphoid fracture even if an initial X-ray looks normal. Untreated scaphoid fractures can lose their blood supply, so this one is worth chasing down.',
    action: 'See a hand specialist or sports clinic this week and request follow-up CT or MRI if the X-ray is negative.',
    do_not: [
      'Do not climb or load the wrist until cleared by imaging.',
      'Do not assume a normal X-ray rules it out.',
    ],
  },
  locked_knee: {
    title: 'See a sports medicine doctor in the next few days',
    plain: 'A knee that mechanically cannot be straightened (not just pain-limited) can mean a piece of cartilage or a torn meniscus is physically blocking the joint.',
    action: 'Book with a sports medicine doctor or orthopedist this week.',
    do_not: [
      'Do not force the knee into extension.',
      'Do not load it or try to walk it off.',
    ],
  },
  ottawa_rules: {
    title: 'Get an X-ray before loading it again',
    plain: 'Inability to bear weight and take 4 steps after an ankle injury, plus tenderness over the bone, meets the Ottawa Ankle Rules for an X-ray. Could be a sprain or a fracture — imaging settles the question.',
    action: 'Book an X-ray at urgent care or a sports clinic this week.',
    do_not: [
      'Do not load the ankle until imaging is done.',
      'Do not assume it is "just a sprain" without checking.',
    ],
  },
}

// Initial wizard state factory — usable by any v2 wizard implementation.
export function createWizardState() {
  return {
    region: null,
    onset_type: null,
    climbing_situation: null,
    sensations: [],
    pain_level: null,
    pain_trajectory: null,
    functional_check: null,
    red_flags_triggered: [],
    history: {
      prior_injury: null,
      years_climbing: null,
      hangboard_user: null,
    },
    weighted_injuries: [],
    severity_modifier: 0,
    urgent_referral: false,
  }
}

// Compute severity_modifier per the Phase 5 spec.
export function computeSeverityModifier(state) {
  let mod = 0
  if (state.history?.prior_injury === 'yes') mod += 1
  if (state.pain_trajectory === 'worse' && state.pain_level === 'immediate_stop') mod += 1
  if (state.functional_check === 'no') mod += 1
  if (state.history?.years_climbing === '<1' && state.onset_type === 'built_up_days') mod -= 1
  return mod
}
