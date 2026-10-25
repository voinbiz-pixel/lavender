import { PETALS, groupCredit, plannedGroupSets } from './program.js'
import { BY_ID } from './exercises.js'
import { e1rm } from './loads.js'

export function sessionVolume(s) {
  let v = 0
  for (const e of s.entries) {
    const ex = BY_ID[e.exerciseId]
    for (const x of e.sets) {
      if (!x.done || x.kind !== 'work') continue
      const w = ex?.load === 'bw' || ex?.load === 'band' ? 0 : (+x.weight || 0) * (ex?.single ? 1 : ex?.load === 'db' ? 2 : 1)
      v += w * (+x.reps || 0)
    }
  }
  return Math.round(v)
}

export const doneSets = (s) => s.entries.reduce((n, e) => n + e.sets.filter((x) => x.done && x.kind === 'work').length, 0)

// Compare a finished session against everything before it.
export function findPRs(session, sessions) {
  const before = sessions.filter((s) => s.status === 'done' && s.id !== session.id && new Date(s.startedAt) < new Date(session.startedAt))
  const prs = []
  for (const e of session.entries) {
    const ex = BY_ID[e.exerciseId]
    if (!ex) continue
    const work = e.sets.filter((x) => x.done && x.kind === 'work')
    if (!work.length) continue
    const prevSets = before.flatMap((s) => s.entries.filter((x) => x.exerciseId === e.exerciseId).flatMap((x) => x.sets.filter((y) => y.done && y.kind === 'work')))
    if (!prevSets.length) continue // first time is a baseline, not a PR
    if (ex.load === 'bw' || ex.load === 'band' || ex.unit === 'sec') {
      const best = Math.max(...work.map((x) => +x.reps || 0))
      const prev = Math.max(...prevSets.map((x) => +x.reps || 0))
      if (best > prev) prs.push({ exerciseId: ex.id, kind: 'reps', value: best, prev })
      continue
    }
    const bestW = Math.max(...work.map((x) => +x.weight || 0))
    const prevW = Math.max(...prevSets.map((x) => +x.weight || 0))
    const bestE = Math.max(...work.map((x) => e1rm(+x.weight, +x.reps)))
    const prevE = Math.max(...prevSets.map((x) => e1rm(+x.weight, +x.reps)))
    if (bestW > prevW) prs.push({ exerciseId: ex.id, kind: 'weight', value: bestW, prev: prevW })
    else if (bestE > prevE * 1.005) prs.push({ exerciseId: ex.id, kind: 'e1rm', value: Math.round(bestE), prev: Math.round(prevE) })
  }
  return prs
}

const weekKey = (d) => {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // monday start
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x.toISOString().slice(0, 10)
}

// Weekly streak: weeks that hit the target. One missed week every 4 is forgiven ("eclipse").
export function streak(sessions, target, now = new Date()) {
  const done = sessions.filter((s) => s.status === 'done' && !s.partOf)
  const counts = {}
  for (const s of done) counts[weekKey(s.startedAt)] = (counts[weekKey(s.startedAt)] || 0) + 1
  let n = 0
  let eclipses = 0
  const cur = new Date(weekKey(now))
  const thisWeek = counts[weekKey(now)] || 0
  // the current week only counts once it hits target; it never breaks the streak while in progress
  if (thisWeek >= target) n++
  const d = new Date(cur)
  for (let i = 0; i < 260; i++) {
    d.setDate(d.getDate() - 7)
    const k = d.toISOString().slice(0, 10)
    const c = counts[k] || 0
    if (c >= target) n++
    else if (c > 0 && eclipses < Math.floor(n / 4) + 1 && n > 0) eclipses++
    else break
  }
  return { weeks: n, thisWeek, target, eclipses }
}

export const ACHIEVEMENTS = [
  { id: 'first', name: 'First light', sub: 'Your first session', test: (c) => c.sessions >= 1 },
  { id: 's10', name: 'Crescent', sub: '10 sessions', test: (c) => c.sessions >= 10 },
  { id: 's25', name: 'Quarter moon', sub: '25 sessions', test: (c) => c.sessions >= 25 },
  { id: 's50', name: 'Half moon', sub: '50 sessions', test: (c) => c.sessions >= 50 },
  { id: 's100', name: 'Full moon', sub: '100 sessions', test: (c) => c.sessions >= 100 },
  { id: 'pr1', name: 'New light', sub: 'First personal record', test: (c) => c.prs >= 1 },
  { id: 'pr10', name: 'Ten bright rays', sub: '10 personal records', test: (c) => c.prs >= 10 },
  { id: 'deload', name: 'Patience', sub: 'Took a deload week', test: (c) => c.deloads >= 1 },
  { id: 'orbit', name: 'Full orbit', sub: 'Finished a whole block', test: (c) => c.blocks >= 1 },
  { id: 'w4', name: 'Tidal lock', sub: '4 weeks on target', test: (c) => c.streak >= 4 },
  { id: 'w12', name: 'Steady orbit', sub: '12 weeks on target', test: (c) => c.streak >= 12 },
  { id: 'v10k', name: 'Ten thousand', sub: '10,000 lifted', test: (c) => c.volume >= 10000 },
  { id: 'v100k', name: 'Heavy moon', sub: '100,000 lifted', test: (c) => c.volume >= 100000 },
]

export function stats(state) {
  const done = state.sessions.filter((s) => s.status === 'done')
  return {
    sessions: done.length,
    prs: done.reduce((n, s) => n + (s.prs?.length || 0), 0),
    deloads: done.filter((s) => s.deload).length,
    blocks: state.program ? state.program.block : 0,
    streak: streak(state.sessions, state.profile.daysPerWeek || 3).weeks,
    volume: done.reduce((v, s) => v + (s.volume || sessionVolume(s)), 0),
  }
}

export function newAchievements(state) {
  const c = stats(state)
  const have = state.achievements || {}
  return ACHIEVEMENTS.filter((a) => !have[a.id] && a.test(c))
}

// Weekly sets per muscle for the last 7 days.
export function muscleSets(sessions, days = 7) {
  const since = Date.now() - days * 864e5
  const out = {}
  for (const s of sessions) {
    if (s.status !== 'done' || new Date(s.startedAt).getTime() < since) continue
    for (const e of s.entries) {
      const ex = BY_ID[e.exerciseId]
      const n = e.sets.filter((x) => x.done && x.kind === 'work').length
      ex?.muscles.forEach((m, i) => { out[m] = (out[m] || 0) + n * (i === 0 ? 1 : 0.5) })
    }
  }
  return out
}

// ---------- this week, by petal ----------

export function weekStart(now = new Date()) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function weekPetals(state, now = new Date()) {
  const since = weekStart(now).getTime()
  const done = Object.fromEntries(PETALS.map((g) => [g.key, 0]))
  for (const s of state.sessions) {
    if (new Date(s.startedAt).getTime() < since) continue
    for (const e of s.entries) {
      const ex = BY_ID[e.exerciseId]
      if (!ex) continue
      const n = e.sets.filter((x) => x.done && x.kind === 'work').length
      const c = groupCredit(ex)
      for (const k in c) done[k] += n * c[k]
    }
  }
  const plan = plannedGroupSets(state.program)
  return PETALS.map((g) => ({ ...g, done: Math.round(done[g.key] * 2) / 2, target: Math.max(1, Math.round(plan[g.key])) }))
}

// Daily record for consistency views: one entry per day, newest last.
export function dailyLog(sessions, days = 84, now = new Date()) {
  const byDay = {}
  for (const s of sessions) {
    if (s.status !== 'done') continue
    const k = new Date(s.startedAt).toDateString()
    const v = byDay[k] || { volume: 0, sessions: 0, prs: 0, palette: s.palette }
    v.volume += s.volume || 0
    v.sessions += 1
    v.prs += s.prs?.length || 0
    byDay[k] = v
  }
  const out = []
  const d = new Date(now)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    out.push({ date: new Date(d), ...(byDay[d.toDateString()] || { volume: 0, sessions: 0, prs: 0 }) })
    d.setDate(d.getDate() + 1)
  }
  return out
}

// Strength gain per lift: best e1RM (or reps) in the last 3 sessions vs the first 2.
export function liftGains(sessions) {
  const by = {}
  const done = sessions.filter((s) => s.status === 'done').sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
  for (const s of done) for (const e of s.entries) {
    const ex = BY_ID[e.exerciseId]
    if (!ex) continue
    const work = e.sets.filter((x) => x.done && x.kind === 'work')
    if (!work.length) continue
    const bw = ex.load === 'bw' || ex.load === 'band' || ex.unit === 'sec'
    const v = Math.max(...work.map((x) => (bw ? +x.reps || 0 : e1rm(+x.weight || 0, +x.reps || 0))))
    ;(by[ex.id] ||= { ex, points: [] }).points.push({ v, date: s.startedAt, pr: (s.prs || []).some((p) => p.exerciseId === ex.id) })
  }
  return Object.values(by)
    .filter((x) => x.points.length >= 2)
    .map(({ ex, points }) => {
      const first = Math.max(...points.slice(0, 2).map((p) => p.v)) || 1
      const last = Math.max(...points.slice(-3).map((p) => p.v))
      const g = PETALS.find((p) => p.muscles.includes(ex.muscles[0]))
      return { ex, points, gain: Math.round(((last - first) / first) * 100), best: Math.max(...points.map((p) => p.v)), color: g?.color || '#B9B2D6', prs: points.filter((p) => p.pr).length }
    })
    .sort((a, b) => b.gain - a.gain || b.points.length - a.points.length)
}
