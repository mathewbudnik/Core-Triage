import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'
import { getExercises } from '../data/exercises'

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = '#6366f1'
const MUTED = '#64748b'
const BORDER = '#e2e8f0'
const RED = '#ef4444'
const GREEN = '#22c55e'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 48,
    lineHeight: 1.5,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerDate: {
    fontSize: 8,
    color: MUTED,
  },
  headerDisclaimer: {
    fontSize: 7,
    color: RED,
    marginTop: 2,
    fontFamily: 'Helvetica-Bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginVertical: 10,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    marginVertical: 6,
  },
  // Sections
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: ACCENT,
    paddingBottom: 2,
  },
  // Intake grid
  intakeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  intakeItem: {
    width: '48%',
    flexDirection: 'row',
    gap: 4,
  },
  intakeLabel: {
    fontSize: 7.5,
    color: MUTED,
    width: 70,
    fontFamily: 'Helvetica-Bold',
  },
  intakeValue: {
    fontSize: 7.5,
    color: '#1e293b',
    flex: 1,
  },
  // Red flags
  flagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 3,
  },
  flagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  flagText: {
    fontSize: 8,
    flex: 1,
  },
  noFlags: {
    fontSize: 8,
    color: GREEN,
    fontFamily: 'Helvetica-Bold',
  },
  // Differentials
  diffItem: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
  },
  diffTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  diffRank: {
    fontSize: 7,
    color: MUTED,
    marginBottom: 1,
  },
  diffWhy: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 1,
  },
  // Plan bullets
  planBullet: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 2,
  },
  bullet: {
    fontSize: 8,
    color: ACCENT,
    marginTop: 0.5,
  },
  bulletText: {
    fontSize: 7.5,
    flex: 1,
    color: '#1e293b',
  },
  // Exercise
  exerciseItem: {
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 1.5,
    borderLeftColor: BORDER,
  },
  exName: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  exTissue: {
    fontSize: 7,
    color: MUTED,
    marginBottom: 2,
  },
  exRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 2,
  },
  exLabel: {
    fontSize: 7,
    color: MUTED,
    fontFamily: 'Helvetica-Bold',
    width: 50,
  },
  exValue: {
    fontSize: 7.5,
    flex: 1,
    color: '#1e293b',
  },
  exNote: {
    fontSize: 7,
    color: MUTED,
    fontStyle: 'italic',
    marginTop: 1,
  },
  // Provider notes
  notesBox: {
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  noteLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    marginBottom: 18,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 6.5,
    color: MUTED,
  },
  footerDisclaimer: {
    fontSize: 6,
    color: MUTED,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val) {
  if (!val && val !== 0) return '—'
  return String(val)
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '—'
}

function BulletList({ items }) {
  if (!items || items.length === 0) return null
  return items.map((item, i) => (
    <View key={i} style={s.planBullet}>
      <Text style={s.bullet}>•</Text>
      <Text style={s.bulletText}>{item}</Text>
    </View>
  ))
}

// ── Document ──────────────────────────────────────────────────────────────────

function TriageReportDocument({ result, exercises, date }) {
  const { intake, red_flags, severity, buckets, plan, training_modifications, return_protocol } = result
  const dateStr = date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const hasFlags = red_flags && red_flags.length > 0

  return (
    <Document
      title={`CoreTriage Report — ${intake.region}`}
      author="CoreTriage"
      subject="Injury Triage Report"
    >
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>CoreTriage</Text>
            <Text style={s.headerSub}>Climbing Injury Triage Report</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerDate}>{dateStr}</Text>
            <Text style={s.headerDisclaimer}>Educational — Not a Medical Diagnosis</Text>
          </View>
        </View>
        <View style={s.divider} />

        {/* Intake summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Patient Intake</Text>
          <View style={s.intakeGrid}>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Region:</Text>
              <Text style={s.intakeValue}>{fmt(intake.region)}</Text>
            </View>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Onset:</Text>
              <Text style={s.intakeValue}>{capitalize(intake.onset)}</Text>
            </View>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Severity:</Text>
              <Text style={s.intakeValue}>{fmt(intake.severity)}/10</Text>
            </View>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Pain type:</Text>
              <Text style={s.intakeValue}>{capitalize(intake.pain_type)}</Text>
            </View>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Mechanism:</Text>
              <Text style={s.intakeValue}>{capitalize(intake.mechanism)}</Text>
            </View>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Swelling:</Text>
              <Text style={s.intakeValue}>{capitalize(intake.swelling)}</Text>
            </View>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Bruising:</Text>
              <Text style={s.intakeValue}>{capitalize(intake.bruising)}</Text>
            </View>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Numbness:</Text>
              <Text style={s.intakeValue}>{capitalize(intake.numbness)}</Text>
            </View>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Weakness:</Text>
              <Text style={s.intakeValue}>{capitalize(intake.weakness)}</Text>
            </View>
            <View style={s.intakeItem}>
              <Text style={s.intakeLabel}>Instability:</Text>
              <Text style={s.intakeValue}>{capitalize(intake.instability)}</Text>
            </View>
          </View>
          {intake.free_text ? (
            <View style={{ marginTop: 4 }}>
              <Text style={s.intakeLabel}>Additional notes:</Text>
              <Text style={{ ...s.intakeValue, marginTop: 1 }}>{intake.free_text}</Text>
            </View>
          ) : null}
        </View>

        {/* Red flag screen */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Red Flag Screen</Text>
          {hasFlags ? (
            red_flags.map((flag, i) => (
              <View key={i} style={s.flagRow}>
                <View style={{ ...s.flagDot, backgroundColor: RED }} />
                <Text style={{ ...s.flagText, color: RED, fontFamily: 'Helvetica-Bold' }}>{flag}</Text>
              </View>
            ))
          ) : (
            <Text style={s.noFlags}>✓ No major red flags identified</Text>
          )}
          {hasFlags && (
            <Text style={{ fontSize: 7.5, color: RED, marginTop: 4, fontFamily: 'Helvetica-Bold' }}>
              ⚠ Red flags present — prompt evaluation recommended
            </Text>
          )}
        </View>

        {/* Severity classification */}
        {severity && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Severity Classification</Text>
            <Text style={{ fontSize: 8, color: '#1e293b' }}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{capitalize(severity.level)}</Text>
              {severity.label ? ` — ${severity.label}` : ''}
            </Text>
            {severity.description && (
              <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 2 }}>{severity.description}</Text>
            )}
          </View>
        )}

        {/* Differentials */}
        {buckets && buckets.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Likely Differentials (discuss with your provider)</Text>
            {buckets.map((b, i) => (
              <View key={i} style={s.diffItem}>
                <Text style={s.diffRank}>{i === 0 ? 'Most likely' : i === 1 ? 'Possible' : 'Less likely'}</Text>
                <Text style={s.diffTitle}>{b.title}</Text>
                <Text style={s.diffWhy}>{b.why}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Conservative plan */}
        {plan && Object.keys(plan).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Conservative Management</Text>
            {Object.entries(plan).map(([key, items]) => {
              if (!items || !items.length) return null
              const label = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())
              return (
                <View key={key} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#475569', marginBottom: 2 }}>
                    {label}
                  </Text>
                  <BulletList items={items} />
                </View>
              )
            })}
          </View>
        )}

        {/* Training modifications */}
        {training_modifications && training_modifications.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Training Modifications</Text>
            <BulletList items={training_modifications} />
          </View>
        )}

        {/* Return to climbing */}
        {return_protocol && return_protocol.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Return to Climbing Protocol</Text>
            <BulletList items={return_protocol} />
          </View>
        )}

        {/* Prescribed exercises — Phase 1 */}
        {exercises && exercises.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Prescribed Rehab Protocol — Phase 1</Text>
            {exercises.map((ex, i) => (
              <View key={i} style={s.exerciseItem}>
                <Text style={s.exName}>{i + 1}. {ex.name}</Text>
                <Text style={s.exTissue}>{ex.area}</Text>
                <View style={s.exRow}>
                  <Text style={s.exLabel}>Prescription:</Text>
                  <Text style={s.exValue}>{ex.sets} sets × {ex.reps} · {ex.frequency}</Text>
                </View>
                <View style={s.exRow}>
                  <Text style={s.exLabel}>Should feel:</Text>
                  <Text style={s.exValue}>{ex.feel}</Text>
                </View>
                <View style={s.exRow}>
                  <Text style={s.exLabel}>Stop if:</Text>
                  <Text style={{ ...s.exValue, color: RED }}>{ex.red_flags}</Text>
                </View>
                <Text style={s.exNote}>Progress when: {ex.progression_trigger}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Provider notes */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Provider Notes</Text>
          <View style={s.notesBox}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={s.noteLine} />
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>CoreTriage · coretriage.com</Text>
          <Text style={s.footerDisclaimer}>
            Educational tool only. Not a medical diagnosis or treatment plan. Always consult a qualified healthcare provider.
          </Text>
          <Text style={s.footerText}>{dateStr}</Text>
        </View>
      </Page>
    </Document>
  )
}

// ── Export function ───────────────────────────────────────────────────────────

export async function downloadTriagePDF(result) {
  const region = result?.intake?.region ?? 'General'
  const exercises = getExercises(region, 1)
  const date = new Date()
  const dateSlug = date.toISOString().slice(0, 10)

  const blob = await pdf(
    <TriageReportDocument result={result} exercises={exercises} date={date} />
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coretriage_${region.toLowerCase().replace(/\s+/g, '_')}_${dateSlug}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
