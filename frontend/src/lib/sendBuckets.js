function toLocalDateString(ts) {
  const d = new Date(ts)
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function lastNDays(n, now = new Date()) {
  const result = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    result.push(toLocalDateString(d))
  }
  return result
}

export function bucketSendsByDay(sends, n, now = new Date()) {
  const days = lastNDays(n, now)
  const byDate = Object.fromEntries(days.map((d) => [d, { date: d, sends: [], totalXP: 0, dominantStyle: null }]))
  for (const s of sends || []) {
    if (!s || typeof s.ts !== 'number') continue
    const d = toLocalDateString(s.ts)
    const bucket = byDate[d]
    if (!bucket) continue
    bucket.sends.push(s)
    bucket.totalXP += s.xpEarned || 0
  }
  for (const bucket of Object.values(byDate)) {
    if (bucket.sends.length === 0) continue
    const byStyle = {}
    for (const s of bucket.sends) {
      const key = s.stylePrimary
      if (!key) continue
      byStyle[key] = (byStyle[key] || 0) + (s.xpEarned || 0)
    }
    let bestKey = null
    let bestXP  = -1
    for (const [k, v] of Object.entries(byStyle)) {
      if (v > bestXP) { bestXP = v; bestKey = k }
    }
    bucket.dominantStyle = bestKey
  }
  return days.map((d) => byDate[d])
}
