// Single source of truth for the optional "anything else" chips that surface
// on the smart triage card. Each chip declares both its UI label AND its
// side effects at submit time: which structured form field (if any) it sets,
// and the free-text phrase appended to the synthesized `free_text` payload.
//
// CRITICAL: each `phrase` must contain the substring(s) that
// `src/triage.py _keyword_affirmed()` looks for. `tests/test_signal_chips_keywords.py`
// is the regression guard — if you change a phrase here, run that test.

export const SIGNAL_CHIPS = [
  // ─── Universal (any region) ──────────────────────────────────────────────
  { id: 'pop',         label: 'Heard or felt a pop',         regions: ['*'], phrase: 'felt a pop' },
  { id: 'snap',        label: 'Felt a snap or tear',         regions: ['*'], phrase: 'felt a snap' },
  { id: 'swelling',    label: 'Visible swelling',            regions: ['*'], structuredField: 'swelling',    structuredValue: 'Yes', phrase: 'swelling' },
  { id: 'bruising',    label: 'Bruising',                    regions: ['*'], structuredField: 'bruising',    structuredValue: 'Yes', phrase: 'bruising' },
  { id: 'instability', label: 'Feels unstable / gives way',  regions: ['*'], structuredField: 'instability', structuredValue: 'Yes', phrase: 'unstable' },
  { id: 'numbness',    label: 'Numbness or tingling',        regions: ['*'], structuredField: 'numbness',    structuredValue: 'Yes', phrase: 'numbness' },
  { id: 'weakness',    label: 'Weak when gripping or loading', regions: ['*'], structuredField: 'weakness',  structuredValue: 'Yes', phrase: 'weakness' },
  { id: 'night',       label: 'Wakes me at night',           regions: ['*'], phrase: 'pain at night' },

  // ─── Finger ──────────────────────────────────────────────────────────────
  { id: 'cant_extend', label: "Can't fully extend a joint",   regions: ['Finger'], phrase: "can't extend" },
  { id: 'cant_bend',   label: "Can't bend the tip",           regions: ['Finger'], phrase: "can't bend tip" },
  { id: 'stuck_bent',  label: 'Finger stuck bent',            regions: ['Finger'], phrase: 'stuck bent' },
  { id: 'catching',    label: 'Catching or locking',          regions: ['Finger'], phrase: 'catching and locking' },

  // ─── Calf ────────────────────────────────────────────────────────────────
  { id: 'long_approach', label: 'Started on a long approach', regions: ['Calf'], phrase: 'pain started on long approach' },

  // ─── Upper Back ──────────────────────────────────────────────────────────
  { id: 'breath_pain', label: 'Hurts on a deep breath',       regions: ['Upper Back'], phrase: 'pain on deep breath' },
  { id: 'twist_pain',  label: 'Hurts when twisting',          regions: ['Upper Back'], phrase: 'pain when twisting' },
  { id: 'rib_pain',    label: 'Pain in the ribs',             regions: ['Upper Back'], phrase: 'rib pain' },

  // ─── Knee ────────────────────────────────────────────────────────────────
  { id: 'knee_locked', label: "Knee feels locked / can't straighten", regions: ['Knee'], phrase: 'knee locked, cannot straighten' },

  // ─── Shoulder / Chest ────────────────────────────────────────────────────
  { id: 'shoulder_pop', label: 'Pop or snap during a powerful pull', regions: ['Shoulder', 'Chest'], phrase: 'felt a pop on a powerful pull' },
]

// Returns chips relevant for a given region: universal '*' chips first,
// then region-specific. Stable ordering matters because the chip grid is
// rendered top-down in this order.
export function chipsForRegion(region) {
  return SIGNAL_CHIPS.filter((c) => c.regions.includes('*') || c.regions.includes(region))
}

// Builds the `free_text` string the classifier expects. Joins selected chip
// phrases first (deterministic ordering by chip-array order) then appends
// the optional user-typed text. The classifier only checks substring
// presence via _keyword_affirmed, so phrase order is irrelevant for matching
// — but stable order makes regression tests deterministic.
export function buildSignalsFreeText(selectedChipIds, userText) {
  const ids = new Set(selectedChipIds || [])
  const phrases = SIGNAL_CHIPS
    .filter((c) => ids.has(c.id))
    .map((c) => c.phrase)
    .filter(Boolean)
  if (userText?.trim()) phrases.push(userText.trim())
  return phrases.join('. ')
}

// Merges structured-field side effects from selected chips into a single
// object. Caller spreads this over the form before sending to triageIntake.
export function chipStructuredFields(selectedChipIds) {
  const ids = new Set(selectedChipIds || [])
  return SIGNAL_CHIPS.reduce((acc, c) => {
    if (ids.has(c.id) && c.structuredField) {
      acc[c.structuredField] = c.structuredValue
    }
    return acc
  }, {})
}
