// Plain-English glossary for the bucket qualifiers the triage engine attaches
// to diagnosis titles (e.g. "TFCC irritation/tear — possible"). Each entry
// becomes the tooltip body when the user hovers/taps the qualifier chip in
// the diagnosis UI. The goal is total transparency — no medical jargon
// should leave the user guessing what a label means.

export const QUALIFIER_GLOSSARY = {
  'most likely': {
    label:   'Most likely',
    summary: 'Closest match to the pattern of your answers. Start here for your action plan.',
    tone:    'teal',
  },
  'likely': {
    label:   'Likely',
    summary: 'Strong match, even if not the top pick — worth keeping in mind.',
    tone:    'teal',
  },
  'possible': {
    label:   'Possible',
    summary: 'Could match your answers, but less specifically than the top pick.',
    tone:    'muted',
  },
  'common': {
    label:   'Common',
    summary: 'Frequent in climbers with this region and pattern. Included for context, not a specific match to your answers.',
    tone:    'muted',
  },
  'most common': {
    label:   'Most common',
    summary: 'The single most frequent injury for this body region in climbers — included as a baseline differential.',
    tone:    'muted',
  },
  'consider evaluation': {
    label:   'Consider evaluation',
    summary: 'The pattern suggests you should consider seeing a clinician rather than self-managing.',
    tone:    'amber',
  },
  'urgent': {
    label:   'Urgent',
    summary: 'Time-sensitive. See a clinician promptly — ideally within 24 to 72 hours.',
    tone:    'coral',
  },
  'must rule out': {
    label:   'Must rule out',
    summary: 'Could be serious and is easy to miss. Get imaging or evaluation before assuming a less concerning diagnosis.',
    tone:    'coral',
  },
}

// Parse a bucket title like "TFCC irritation/tear — possible" into
// { baseTitle, qualifier }. If no em-dash convention is present, returns the
// whole title as baseTitle and null qualifier.
export function splitBucketTitle(title) {
  if (typeof title !== 'string') return { baseTitle: title, qualifier: null }
  const idx = title.lastIndexOf(' — ')
  if (idx === -1) return { baseTitle: title, qualifier: null }
  const tail = title.slice(idx + 3).trim().toLowerCase()
  if (!QUALIFIER_GLOSSARY[tail]) return { baseTitle: title, qualifier: null }
  return { baseTitle: title.slice(0, idx).trim(), qualifier: tail }
}
