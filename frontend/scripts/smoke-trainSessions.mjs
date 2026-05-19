// Smoke verification for trainSessions.js.
// Run: node frontend/scripts/smoke-trainSessions.mjs
import { sessionForDay, dayStatusFor, currentWeekDates } from '../src/lib/trainSessions.js'
import assert from 'node:assert/strict'

const plan = {
  start_date: '2026-05-11',  // a Monday
  duration_weeks: 4,
  plan_data: {
    days_per_week: 3,
    sessions: [
      { week: 1, day_in_week: 1, session_type: 'Power',     session_index: 0 },
      { week: 1, day_in_week: 2, session_type: 'Endurance', session_index: 1 },
      { week: 1, day_in_week: 3, session_type: 'Strength',  session_index: 2 },
      { week: 2, day_in_week: 1, session_type: 'Power',     session_index: 3 },
      { week: 2, day_in_week: 2, session_type: 'Endurance', session_index: 4 },
      { week: 2, day_in_week: 3, session_type: 'Strength',  session_index: 5 },
    ],
  },
}

// sessionForDay
const s1 = sessionForDay(plan, '2026-05-11')  // start: Mon week 1 day 1
assert.equal(s1?.session_type, 'Power', 'Mon w1 -> Power')
const s2 = sessionForDay(plan, '2026-05-13')  // Wed w1 -> day_in_week 2 (Mon-Wed-Sat pattern at dpw=3)
assert.ok(s2, 'mid-week resolves to a session')
const sNo = sessionForDay(plan, '2026-05-15')  // Fri w1 — outside the 3 logged sessions
assert.equal(sNo, null, 'rest day returns null')
assert.equal(sessionForDay(null, '2026-05-11'), null, 'null plan returns null')
assert.equal(sessionForDay(plan, ''), null, 'empty iso returns null')

// dayStatusFor — pretend today is 2026-05-13 (Wed in week 1)
const today = '2026-05-13'
assert.equal(dayStatusFor('2026-05-11', plan, today), 'past',  'before today -> past')
assert.equal(dayStatusFor('2026-05-13', plan, today), 'today', 'equal -> today')
assert.equal(dayStatusFor('2026-05-15', plan, today), 'rest',  'no session that day -> rest')
assert.equal(dayStatusFor('2026-05-16', plan, today), 'future', 'after today, session -> future')

// currentWeekDates returns 7 Mon-Sun iso strings containing the given date
const week = currentWeekDates('2026-05-13')  // Wed
assert.equal(week.length, 7)
assert.equal(week[0], '2026-05-11', 'week starts Monday')
assert.equal(week[6], '2026-05-17', 'week ends Sunday')
assert.ok(week.includes('2026-05-13'), 'includes given date')

// ── training_days picker model ────────────────────────────────────────────
// Climber picks Tue / Thu / Sun. Plan has 3 sessions per week so day_in_week
// 1 → Tue, 2 → Thu, 3 → Sun.
const picker = {
  start_date: '2026-05-11',  // Monday
  duration_weeks: 4,
  plan_data: {
    days_per_week: 3,
    training_days: ['tuesday', 'thursday', 'sunday'],
    sessions: [
      { week: 1, day_in_week: 1, session_type: 'Power',     session_index: 0 },
      { week: 1, day_in_week: 2, session_type: 'Endurance', session_index: 1 },
      { week: 1, day_in_week: 3, session_type: 'Strength',  session_index: 2 },
      { week: 2, day_in_week: 1, session_type: 'Power',     session_index: 3 },
      { week: 2, day_in_week: 2, session_type: 'Endurance', session_index: 4 },
      { week: 2, day_in_week: 3, session_type: 'Strength',  session_index: 5 },
    ],
  },
}
// Tue 2026-05-12 is the first training day -> day_in_week 1 -> Power
assert.equal(sessionForDay(picker, '2026-05-12')?.session_type, 'Power',  'picker Tue w1 -> Power')
// Thu 2026-05-14 is the second -> Endurance
assert.equal(sessionForDay(picker, '2026-05-14')?.session_type, 'Endurance', 'picker Thu w1 -> Endurance')
// Sun 2026-05-17 is the third -> Strength
assert.equal(sessionForDay(picker, '2026-05-17')?.session_type, 'Strength', 'picker Sun w1 -> Strength')
// Mon 2026-05-11 is NOT a training day -> null
assert.equal(sessionForDay(picker, '2026-05-11'), null, 'picker Mon -> null')
// Wed 2026-05-13 is NOT a training day -> null
assert.equal(sessionForDay(picker, '2026-05-13'), null, 'picker Wed -> null')
// Week 2: Tue 2026-05-19 -> Power
assert.equal(sessionForDay(picker, '2026-05-19')?.session_type, 'Power', 'picker Tue w2 -> Power')

console.log('OK trainSessions')
