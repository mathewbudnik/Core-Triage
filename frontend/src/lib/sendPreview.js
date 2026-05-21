import { calculateSendXP } from './xp.js'
import { gradeStringToNum } from './gradeUtil.js'
import { deriveStatShape } from './stats.js'

export function modalityFromSessionType(sessionType) {
  if (sessionType === 'outdoor') return 'outdoor'
  return 'indoor'
}

function isPersonalRecordFor(grade, stylePrimary, state) {
  const num = gradeStringToNum(grade)
  if (num === null) return false
  const best = state?.bestPerStyle?.[stylePrimary]
  if (best === null || best === undefined) return false
  return num > best
}

export function previewSendXP(draft, state) {
  const { grade, outcome, stylePrimary, sessionType, isDeepLog = false } = draft
  if (!grade) return { xp: 0, breakdown: '' }

  const modality = modalityFromSessionType(sessionType)
  const isPersonalRecord = isPersonalRecordFor(grade, stylePrimary, state)
  const sends = state?.sends ?? []
  let climberStatShape = null
  if (sends.length > 0 || Object.values(state?.bestPerStyle || {}).some(v => v !== null)) {
    climberStatShape = deriveStatShape(sends)
  }
  const xp = calculateSendXP({
    grade, modality, outcome, stylePrimary, isPersonalRecord,
    climberStatShape, isDeepLog, sessionPosition: 0,
  })

  const parts = [grade]
  if (outcome === 'flash')    parts.push('flash')
  if (outcome === 'redpoint') parts.push('redpoint')
  if (outcome === 'project')  parts.push('project')
  parts.push(modality)
  if (isPersonalRecord) parts.push('PR')
  return { xp, breakdown: parts.join(' · ') }
}
