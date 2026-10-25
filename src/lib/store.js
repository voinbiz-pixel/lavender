import { useSyncExternalStore } from 'react'
import * as cloud from './cloud.js'

// Local-first state. The phone is the source of truth; Supabase keeps a synced copy.
const KEY = 'callisto:v3'

export const defaultEquipment = (unit = 'lb') => ({
  dumbbells: { on: true, kind: 'adjustable', min: unit === 'kg' ? 2 : 5, max: unit === 'kg' ? 24 : 52.5, step: unit === 'kg' ? 2 : 2.5 },
  bench: { on: true },
  adjBench: { on: false },
  barbell: { on: false, bar: unit === 'kg' ? 20 : 45, smallest: unit === 'kg' ? 1.25 : 2.5, max: unit === 'kg' ? 140 : 315 },
  rack: { on: false },
  pullupBar: { on: false },
  bands: { on: false },
  kettlebell: { on: false, list: unit === 'kg' ? [12, 16, 24] : [26, 35, 53] },
  treadmill: { on: true },
  jumpRope: { on: false },
})

export const initialState = () => ({
  v: 3,
  profile: {
    name: '', units: 'lb', mode: 'lift', goals: ['muscle'], addOns: { core: false, mobility: false }, planWeeks: 8, cardioLevel: 'run',
    experience: 'some', daysPerWeek: 4, trainDays: [1, 2, 4, 5],
    sessionMinutes: 45, equipment: defaultEquipment('lb'), easyOn: [], restDefault: 90,
    morning: { on: true, days: [1, 2, 3, 4, 5], time: '07:00', until: 11 },
    reminder: { on: true, time: '18:00' }, waterNudge: true,
    onboarded: false, tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  settings: { sound: true, haptics: true },
  program: null,
  plan: null, // { id, goal, focus, weeks, level, start }
  cardio: { speeds: {} },
  sessions: [],
  flows: {}, // { 'Sun Oct 25 2026': { morning: true, stretch: 'hips' } }
  water: [], // [{ id, at, ml }]
  bodyweight: [],
  achievements: {},
  updatedAt: new Date().toISOString(),
})

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      const base = initialState()
      // workout days used to be named after Jupiter's moons; they are flowers now
      const moons = { Io: 'Iris', Europa: 'Lilac', Ganymede: 'Violet', Callisto: 'Heather', Amalthea: 'Aster', Himalia: 'Wisteria' }
      if (s.program?.days) s.program = { ...s.program, days: s.program.days.map((d) => ({ ...d, name: moons[d.name] || d.name })) }
      return { ...base, ...s, profile: { ...base.profile, ...s.profile, morning: { ...base.profile.morning, ...s.profile?.morning } }, settings: { ...base.settings, ...s.settings } }
    }
  } catch {}
  return initialState()
}

let state = load()
const subs = new Set()
let user = null
let dirty = new Set()
let syncTimer = null
let syncing = false

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

export function getState() { return state }

export function setState(updater, { sessionIds = [] } = {}) {
  const next = typeof updater === 'function' ? updater(state) : updater
  state = { ...next, updatedAt: new Date().toISOString() }
  sessionIds.forEach((id) => dirty.add(id))
  persist()
  subs.forEach((f) => f())
  scheduleSync()
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => selector(state))
}

export function updateSession(id, fn) {
  setState((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...fn(x), updatedAt: new Date().toISOString() } : x)) }), { sessionIds: [id] })
}
export function addSession(sess) {
  setState((s) => ({ ...s, sessions: [{ ...sess, updatedAt: new Date().toISOString() }, ...s.sessions] }), { sessionIds: [sess.id] })
}
export function removeSession(id) {
  setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }))
  if (user) cloud.deleteSessionRemote(id).catch(() => {})
}

export const dayKey = (d = new Date()) => new Date(d).toDateString()
export function markFlow(kind, value = true, d = new Date()) {
  const k = dayKey(d)
  setState((s) => ({ ...s, flows: { ...s.flows, [k]: { ...(s.flows[k] || {}), [kind]: value } } }))
}

// ---------- sync ----------
function scheduleSync() {
  if (!user) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(syncNow, 1200)
}

export async function syncNow() {
  if (!user || syncing) return
  syncing = true
  const ids = [...dirty]
  dirty = new Set()
  try {
    await cloud.push(user.id, state, state.sessions.filter((s) => ids.includes(s.id)))
  } catch {
    ids.forEach((id) => dirty.add(id))
    syncTimer = setTimeout(syncNow, 15000)
  } finally {
    syncing = false
  }
}

export async function attachUser(u) {
  user = u
  if (!u) return
  try {
    const remote = await cloud.pull(u.id)
    const byId = new Map(state.sessions.map((s) => [s.id, s]))
    for (const r of remote.sessions) {
      const l = byId.get(r.id)
      if (!l || new Date(r.updatedAt || 0) > new Date(l.updatedAt || 0)) byId.set(r.id, r)
    }
    const local = state
    const useRemote = remote.blob && (!local.profile.onboarded || new Date(remote.blobAt) > new Date(local.updatedAt))
    const base = initialState()
    const merged = useRemote ? { ...base, ...remote.blob, profile: { ...base.profile, ...remote.blob.profile } } : local
    // water is merged entry by entry so two devices never lose a glass
    const water = new Map([...(remote.blob?.water || []), ...(local.water || [])].map((w) => [w.id, w]))
    state = { ...merged, water: [...water.values()].sort((a, b) => new Date(a.at) - new Date(b.at)), sessions: [...byId.values()].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)) }
    persist()
    subs.forEach((f) => f())
    state.sessions.forEach((s) => dirty.add(s.id))
    await syncNow()
  } catch {}
}

export const currentUser = () => user

// Back online: pull what changed elsewhere, merge, and push what was done offline.
// Coming back to the app: push anything still waiting.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { if (user) attachUser(user) })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && user && dirty.size) syncNow() })
}

export function resetAll() {
  state = initialState()
  persist()
  subs.forEach((f) => f())
}
