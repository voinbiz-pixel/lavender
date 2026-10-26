// Demo builds only: fills four weeks of made-up history so screens can be checked. Never shipped in the live app.
import { getState, setState } from './store.js'
import { buildSession, position, uid } from '../engine/program.js'
import { findPRs, sessionVolume } from '../engine/rewards.js'
import { BY_ID } from '../engine/exercises.js'
import { waterTarget } from '../engine/hydration.js'
import { glassMl } from './actions.js'
export function loadSampleHistory() {
  const s0 = getState()
  if (!s0.program) return
  const START = { db: 25, bb: 95, kb: 35, band: 2, bw: 0 }
  let sim = { ...s0, sessions: s0.sessions.filter((x) => x.status !== 'active') }
  const days = 28
  const out = []
  let n = 0
  for (let d = days; d >= 1; d--) {
    const date = new Date(Date.now() - d * 864e5)
    if (!s0.profile.trainDays.includes(date.getDay())) continue
    const pos = position(sim)
    const sess = buildSession(sim, pos.dayIdx, pos.week, {})
    sess.startedAt = new Date(date.setHours(18, 10, 0, 0)).toISOString()
    sess.endedAt = new Date(new Date(sess.startedAt).getTime() + (40 + (n % 4) * 4) * 60e3).toISOString()
    sess.entries = sess.entries.map((e) => {
      const ex = BY_ID[e.exerciseId]
      return {
        ...e,
        sets: e.sets.filter((x) => x.kind === 'work').map((x, i) => {
          const w = x.weight ?? START[ex.load] ?? 20
          const reps = (x.target || 8) + (n % 3 === 0 ? 1 : 0) - (i === 2 && n % 4 === 1 ? 1 : 0)
          return { ...x, weight: w, reps, done: true }
        }),
      }
    })
    sess.status = 'done'
    sess.volume = sessionVolume(sess)
    sess.prs = findPRs(sess, [...out, ...sim.sessions])
    out.push(sess)
    sim = { ...sim, sessions: [sess, ...sim.sessions] }
    n++
  }
  const water = []
  for (let d = 14; d >= 1; d--) {
    const date = new Date(Date.now() - d * 864e5)
    const cap = waterTarget({ ...s0, sessions: [...out, ...s0.sessions] }, date)
    const glasses = 7 + ((d * 7) % 6)
    let sum = 0
    for (let g = 0; g < glasses && sum < cap; g++) {
      const ml = Math.round(Math.min(glassMl(s0), cap - sum))
      sum += ml
      water.push({ id: uid(), at: new Date(date.getTime() + g * 3600e3).toISOString(), ml })
    }
  }
  setState((x) => ({ ...x, sessions: [...out.reverse(), ...x.sessions].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)), water: [...water, ...(x.water || [])] }), { sessionIds: out.map((o) => o.id) })
}
