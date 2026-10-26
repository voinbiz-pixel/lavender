// Lifetime totals and the fun facts built from them. Pure: works on anyone's data (yours or a crew member's).
import { sessionVolume } from './rewards.js'

const DAY = 864e5
const distanceOf = (segments = []) => segments.reduce((t, s) => t + ((+s.done || 0) / 3600) * (+s.speed || 0), 0)
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}` }
const mondayOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }

// `data` is a profile blob (profile, water, flows...) and `sessions` the person's sessions.
export function totals(data, sessions, now = new Date()) {
  const units = data?.profile?.units || 'lb'
  const done = (sessions || []).filter((s) => s.status === 'done')
  const top = done.filter((s) => !s.partOf)
  const lifts = top.filter((s) => s.type !== 'cardio')
  const cardio = done.filter((s) => s.type === 'cardio')
  const finisherIds = new Set(cardio.map((c) => c.partOf).filter(Boolean))
  let distance = cardio.reduce((t, c) => t + distanceOf(c.segments), 0)
  for (const s of lifts) if (s.finisherLog && !finisherIds.has(s.id)) distance += distanceOf(s.finisherLog.segments)
  const lifted = lifts.reduce((t, s) => t + (s.volume ?? sessionVolume(s)), 0)
  const minutes = top.reduce((t, s) => t + Math.max(0, (new Date(s.endedAt || s.startedAt) - new Date(s.startedAt)) / 60000), 0)
  const reps = lifts.reduce((t, s) => t + s.entries.reduce((u, e) => u + e.sets.filter((x) => x.done && x.kind === 'work').reduce((v, x) => v + (+x.reps || 0), 0), 0), 0)
  const water = (data?.water || []).reduce((t, w) => t + (w.ml || 0), 0)
  const flows = Object.values(data?.flows || {})
  const prs = lifts.reduce((t, s) => t + (s.prs?.length || 0), 0)
  // this week
  const mon = mondayOf(now)
  const week = top.filter((s) => new Date(s.startedAt) >= mon)
  const target = data?.profile?.trainDays?.length || data?.profile?.daysPerWeek || 3
  const days = new Set(week.map((s) => dayKey(s.startedAt)))
  const last = [...top].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0] || null
  const waterToday = (data?.water || []).filter((w) => dayKey(w.at) === dayKey(now)).reduce((t, w) => t + (w.ml || 0), 0)
  const first = [...top].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))[0] || null
  return {
    units, workouts: top.length, lifted: Math.round(lifted), distance, minutes: Math.round(minutes), reps, water, prs,
    mornings: flows.filter((f) => f.morning).length, stretches: flows.filter((f) => f.stretch).length,
    week: { done: week.length, target, days: [...days] }, last, waterToday, since: first?.startedAt || null,
    daysSince: first ? Math.max(1, Math.round((now - new Date(first.startedAt)) / DAY)) : 0,
  }
}

const n = (v, d = 0) => v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 })
// how many of a thing, said nicely: "about 3", "nearly 2", "over 40"
function about(x) {
  if (x >= 10) return `about ${n(Math.round(x))}`
  if (x >= 1.05) return `about ${n(Math.round(x * 2) / 2, 1)}`
  return 'almost one'
}

// Weight, distance and water, each turned into something you can picture.
const WEIGHTS = [ // in lb
  [13000, 'elephants', 'an elephant'], [4500, 'cars', 'a car'], [1000, 'grand pianos', 'a grand piano'],
  [300, 'pandas', 'a panda'], [70, 'golden retrievers', 'a golden retriever'], [9, 'house cats', 'a house cat'],
]
const DISTANCES = [ // in miles
  [26.2, 'marathons', 'a marathon'], [13.4, 'lengths of Manhattan', 'Manhattan end to end'], [1.7, 'Golden Gate Bridges', 'the Golden Gate Bridge'],
  [0.25, 'laps of a running track', 'a lap of a track'],
]
const WATERS = [ // in litres
  [150, 'bathtubs', 'a bathtub'], [10, 'buckets', 'a bucket'], [2, 'big bottles', 'a big bottle'],
]
function compare(value, table) {
  for (const [size, many, one] of table) {
    const k = value / size
    if (k >= 1.05 && k < 400) return `${about(k)} ${many}`
    if (k >= 0.95 && k < 1.05) return one
  }
  return null
}

export function facts(t) {
  const out = []
  const lb = t.units === 'kg' ? t.lifted * 2.2046 : t.lifted
  const mi = t.units === 'kg' ? t.distance * 0.6214 : t.distance
  const litres = t.water / 1000
  const w = lb > 0 && compare(lb, WEIGHTS)
  if (w) out.push({ key: 'lifted', text: `Lifted ${w}` })
  const d = mi > 0.2 && compare(mi, DISTANCES)
  if (d) out.push({ key: 'distance', text: `Walked and run ${d}` })
  const h = litres > 1 && compare(litres, WATERS)
  if (h) out.push({ key: 'water', text: `Drunk ${h} of water` })
  if (t.reps >= 100) out.push({ key: 'reps', text: `${n(t.reps)} reps, one at a time` })
  if (t.minutes >= 120) out.push({ key: 'time', text: `${n(Math.round(t.minutes / 60))} hours spent on yourself` })
  return out
}

// "2.4 mi", "18,240 lb", "12 L"
export const fmtLifted = (t) => (t.lifted >= 100000 ? `${n(t.lifted / 1000, 0)}k` : n(t.lifted))
export const fmtDistance = (t) => n(t.distance, t.distance < 10 ? 1 : 0)
export const distanceUnit = (t) => (t.units === 'kg' ? 'km' : 'mi')
export const fmtWaterTotal = (t) => (t.units === 'kg' ? `${n(t.water / 1000, t.water < 10000 ? 1 : 0)}` : n(Math.round(t.water / 29.5735)))
export const waterTotalUnit = (t) => (t.units === 'kg' ? 'L' : 'oz')
