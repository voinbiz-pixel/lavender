import { getState, setState, addSession, updateSession, removeSession, dayKey } from './store.js'
import { buildSession, position, generateProgram, suggest, uid, warmups, programProfile, todaysPlan, ladderMoves } from '../engine/program.js'
import { planWeek, mondayOf, cardioSession, speedFor } from '../engine/plan.js'
import { findPRs, sessionVolume, newAchievements } from '../engine/rewards.js'
import { BY_ID } from '../engine/exercises.js'
import { WARMUP, COOLDOWN } from '../engine/routines.js'
import { waterTarget } from '../engine/hydration.js'
import { nudgePartner } from './cloud.js'

export const ML_PER_OZ = 29.5735
export const isOz = (s = getState()) => s.profile.units === 'lb'
export const glassMl = (s = getState()) => (isOz(s) ? 8 * ML_PER_OZ : 250)

export function activeSession(s = getState()) {
  return s.sessions.find((x) => x.status === 'active') || null
}

export function doneToday(s = getState(), d = new Date()) {
  // a test run inside a lifting session is logged on its own, but the day is about the session it was part of
  return s.sessions.find((x) => x.status === 'done' && !x.partOf && dayKey(x.startedAt) === dayKey(d)) || null
}

export function startSession(opts = {}) {
  const s = getState()
  const cur = activeSession(s)
  if (cur) return cur.id
  const pos = position(s)
  const tp = todaysPlan(s)
  const desc = opts.desc ?? (tp?.next?.kind === 'lift' ? tp.next : null)
  const sess = buildSession(s, opts.dayIdx ?? pos.dayIdx, pos.week, { ...opts, desc })
  if (desc?.finisher) sess.finisherPlan = cardioSession(s, desc, tp.pw, { finisher: true })
  // the four parts: warm-up, strength (main lifts), accessory, cool-down
  sess.warm = opts.short ? WARMUP.slice(0, 1) : WARMUP
  sess.cool = opts.short ? COOLDOWN.slice(0, 1) : COOLDOWN
  sess.timedDone = []
  addSession(sess)
  return sess.id
}

export function finishSession(id) {
  const s = getState()
  const sess = s.sessions.find((x) => x.id === id)
  if (!sess) return null
  // keep a record of what was planned but not done, so next time knows you didn't finish
  const marked = sess.entries.map((e) => {
    const planned = e.sets.filter((x) => x.kind === 'work').length
    const did = e.sets.filter((x) => x.kind === 'work' && x.done).length
    return { ...e, planned, incomplete: did < planned, sets: e.sets.filter((x) => x.done) }
  })
  const entries = marked.filter((e) => e.sets.some((x) => x.kind === 'work'))
  const skipped = marked.filter((e) => !e.sets.some((x) => x.kind === 'work')).map((e) => ({ exerciseId: e.exerciseId, slotId: e.slotId }))
  if (!entries.length) { removeSession(id); return null }
  const finished = { ...sess, entries, skipped, status: 'done', endedAt: new Date().toISOString(), restUntil: null }
  finished.volume = sessionVolume(finished)
  finished.prs = findPRs(finished, s.sessions)
  updateSession(id, () => finished)
  // bodyweight moves that should change version next time
  const moves = ladderMoves(getState(), finished)
  if (moves.length && getState().program) {
    setState((x) => ({ ...x, program: { ...x.program, days: x.program.days.map((d) => ({ ...d, slots: d.slots.map((sl) => { const m = moves.find((mv) => mv.slotId === sl.id); return m ? { ...sl, exerciseId: m.to, ladder: { dir: m.dir, from: m.from } } : sl }) })) } }))
    finished.ladder = moves
  }
  const after = getState()
  const pos = position(after)
  if (pos?.blockDone) setState((x) => ({ ...x, program: generateProgram(x.profile, x.program.block + 1, x.program) }))
  // a new block of the plan rotates the accessories; main lifts stay so progress carries
  if (after.plan && pos?.pw && pos.pw.block !== after.program.block) setState((x) => ({ ...x, program: generateProgram(programProfile(x), pos.pw.block, x.program) }))
  const unlocked = newAchievements(getState())
  if (unlocked.length) {
    const now = new Date().toISOString()
    setState((x) => ({ ...x, achievements: { ...x.achievements, ...Object.fromEntries(unlocked.map((a) => [a.id, now])) } }))
  }
  nudgePartner('finished', `${s.profile.name || 'Someone'} finished ${titleOf(finished.focus)}.`)
  return finished
}

export function discardSession(id) { removeSession(id) }

export function swapExercise(sessionId, entryId, newId) {
  const s = getState()
  const sess = s.sessions.find((x) => x.id === sessionId)
  const entry = sess?.entries.find((e) => e.id === entryId)
  if (!entry) return
  const slot = { ...(s.program?.days.flatMap((d) => d.slots).find((sl) => sl.id === entry.slotId) || { rep: entry.rep, sets: entry.sets.filter((x) => x.kind === 'work').length, rest: entry.rest, isMain: entry.isMain }), exerciseId: newId }
  const sg = suggest(s, slot, sess.week, sess.deload)
  const ex = BY_ID[newId]
  const wu = entry.isMain ? warmups(ex, sg.weight, s.profile.equipment).map((w) => ({ id: uid(), kind: 'warmup', weight: w.weight, reps: null, target: w.reps, done: false })) : []
  updateSession(sessionId, (x) => ({
    ...x,
    entries: x.entries.map((e) => (e.id === entryId ? {
      ...e, exerciseId: newId, note: sg.note, kind: sg.kind, targetRir: sg.rir,
      sets: [...wu, ...Array.from({ length: sg.sets }, (_, k) => ({ id: uid(), kind: 'work', weight: sg.weight, reps: null, target: sg.reps[k] ?? sg.reps[0], rir: null, done: false }))],
    } : e)),
  }))
}

// ---------- plans ----------
// Start (or restart) a plan: it begins this week, and the lifting days are rebuilt to fit it.
export function startPlan(cfg, profilePatch = {}) {
  setState((x) => {
    const plan = { id: uid(), goal: cfg.goal, focus: cfg.focus || [], weeks: cfg.weeks || 8, level: cfg.level || x.plan?.level || 'run', start: mondayOf().toISOString() }
    const profile = { ...x.profile, ...profilePatch, mode: 'lift' }
    const next = { ...x, profile, plan }
    return { ...next, program: generateProgram(programProfile(next), 0, x.program ? { ...x.program, id: undefined, createdAt: undefined } : null) }
  })
}

// Cardio sessions are logged like workouts, so they count toward the week, the calendar and streaks.
export function finishCardio({ desc, plan, startedAt, segments, feel, test, partOf = null, incomplete = false }) {
  const s = getState()
  const secs = segments.reduce((t, x) => t + (x.done || 0), 0)
  const sess = {
    id: uid(), type: 'cardio', status: 'done', title: plan.title, startedAt, endedAt: new Date().toISOString(),
    minutes: Math.max(1, Math.round(secs / 60)), segments, feel, test: test || null, entries: [],
    planId: s.plan?.id || null, planKey: desc?.key || null, week: s.plan ? planWeek(s.plan).week : null, partOf, meta: plan.meta || null, incomplete,
  }
  addSession(sess)
  if (feel) tuneSpeeds(segments, feel)
  return sess
}

// How a session felt nudges the speeds of the zones it used: easy goes up a little, hard comes down.
export function tuneSpeeds(segments, feel, zonesUsed) {
  const step = getState().profile.units === 'kg' ? 0.3 : 0.2
  const d = feel === 'easy' ? step : feel === 'hard' ? -step : 0
  if (!d) return
  const zones = zonesUsed || [...new Set(segments.filter((x) => x.zone !== 'walk' && x.zone !== 'test').map((x) => x.zone))]
  setState((x) => {
    const speeds = { ...(x.cardio?.speeds || {}) }
    for (const z of zones) speeds[z] = Math.max(1.5, Math.round((speedFor(x, z) + d) * 10) / 10)
    return { ...x, cardio: { ...(x.cardio || {}), speeds } }
  })
}
export function setSpeed(zone, v) {
  setState((x) => ({ ...x, cardio: { ...(x.cardio || {}), speeds: { ...(x.cardio?.speeds || {}), [zone]: Math.round(v * 10) / 10 } } }))
}

export function rebuildProgram(patch) {
  setState((x) => {
    const profile = { ...x.profile, ...patch }
    const next = { ...x, profile }
    return { ...next, program: profile.mode === 'yoga' ? null : generateProgram(programProfile(next), x.program?.block || 0, x.program ? { ...x.program, id: undefined, createdAt: undefined } : null) }
  })
}

// "Lower" reads as "Lower body"; the rest stay as they are.
export const titleOf = (focus) => (focus === 'Upper' || focus === 'Lower' ? `${focus} body` : focus || 'Workout')

// ---------- water ----------
export function waterToday(s = getState(), d = new Date()) {
  const k = dayKey(d)
  const raw = (s.water || []).filter((w) => dayKey(w.at) === k).reduce((t, w) => t + w.ml, 0)
  return Math.min(raw, waterTarget(s, d))
}
export const waterGoal = (s = getState()) => waterTarget(s)
// Water stops at the day's target: there is no reason to log past it.
export function addWater(ml = glassMl()) {
  const s = getState()
  const room = waterGoal(s) - waterToday(s)
  const add = Math.round(Math.min(ml, room))
  if (add <= 0) return false
  setState((x) => ({ ...x, water: [...(x.water || []), { id: uid(), at: new Date().toISOString(), ml: add }] }))
  return true
}
export function undoWater() {
  const s = getState()
  const k = dayKey()
  const today = (s.water || []).filter((w) => dayKey(w.at) === k)
  if (!today.length) return false
  const last = today[today.length - 1]
  setState((x) => ({ ...x, water: x.water.filter((w) => w.id !== last.id) }))
  return true
}
export const fmtWater = (ml, s = getState()) => (isOz(s) ? `${Math.round(ml / ML_PER_OZ)}` : ml >= 1000 ? `${(ml / 1000).toFixed(1)}` : `${Math.round(ml)}`)
export const waterUnit = (ml, s = getState()) => (isOz(s) ? 'oz' : ml >= 1000 ? 'L' : 'ml')

// ---------- sample history, to see Progress filled in ----------
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
