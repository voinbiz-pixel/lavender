// Supabase + server API. Everything here is optional: with no env vars the app
// runs fully local (this is how the demo artifact works).
import { createClient } from '@supabase/supabase-js'
import { totals } from '../engine/stats.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY
export const cloudEnabled = !!(URL && KEY)

let sb = null
export function supa() {
  if (!cloudEnabled) return null
  if (!sb) sb = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  return sb
}

// Offline, the saved session can't be refreshed, so fall back to the last signed-in user
// and keep working locally; everything syncs when the phone is back online.
const LAST = 'callisto:user'
export async function getUser() {
  const c = supa()
  if (!c) return null
  let last = null
  try { last = JSON.parse(localStorage.getItem(LAST) || 'null') } catch {}
  try {
    const { data, error } = await c.auth.getSession()
    const u = data.session?.user
    if (u) { try { localStorage.setItem(LAST, JSON.stringify({ id: u.id, email: u.email })) } catch {} return u }
    if (error && last) return last
    return navigator.onLine === false ? last : null
  } catch {
    return last
  }
}

export async function signIn(email, password) {
  const c = supa()
  let { data, error } = await c.auth.signInWithPassword({ email, password })
  if (error && /invalid/i.test(error.message)) {
    // first time: create the account with the same details
    const up = await c.auth.signUp({ email, password })
    if (up.error) throw up.error
    if (!up.data.session) throw new Error('Check your email to confirm, then sign in. (Tip: turn off email confirmation in Supabase for a private app.)')
    return up.data.user
  }
  if (error) throw error
  return data.user
}

export async function signOut() {
  try { localStorage.removeItem(LAST) } catch {}
  await supa()?.auth.signOut()
}

async function token() {
  const { data } = await supa().auth.getSession()
  return data.session?.access_token
}

// ---------- data sync ----------
export async function pull(userId) {
  const c = supa()
  const [{ data: prof }, { data: rows }] = await Promise.all([
    c.from('profiles').select('data, updated_at').eq('id', userId).maybeSingle(),
    c.from('sessions').select('id, data, updated_at').eq('user_id', userId).order('started_at', { ascending: false }).limit(1000),
  ])
  return { blob: prof?.data || null, blobAt: prof?.updated_at, sessions: (rows || []).map((r) => r.data) }
}

export async function push(userId, state, dirtySessions) {
  const c = supa()
  // keep the last 60 days of water in the synced profile
  const since = Date.now() - 60 * 864e5
  const { sessions, ...rest } = state
  rest.water = (state.water || []).filter((w) => new Date(w.at).getTime() > since)
  // a small summary your crew can read without downloading your history
  try {
    const t = totals(state, state.sessions)
    rest.stats = { ...t, last: t.last ? { title: t.last.type === 'cardio' ? t.last.title : t.last.focus, at: t.last.startedAt } : null, at: new Date().toISOString() }
  } catch {}
  const now = new Date().toISOString()
  const ops = [
    c.from('profiles').upsert({ id: userId, display_name: state.profile.name || null, data: rest, updated_at: now }),
  ]
  if (dirtySessions.length) {
    ops.push(c.from('sessions').upsert(dirtySessions.map((s) => ({
      id: s.id, user_id: userId, data: s, status: s.status, started_at: s.startedAt, ended_at: s.endedAt,
      volume: s.volume || 0, day_name: s.dayName, updated_at: s.updatedAt || now,
    }))))
  }
  const res = await Promise.all(ops)
  const err = res.find((r) => r.error)
  if (err) throw err.error
}

export async function deleteSessionRemote(id) {
  await supa()?.from('sessions').delete().eq('id', id)
}

// ---------- crew (partner) ----------
export async function crewInfo(userId) {
  const c = supa()
  const { data: m } = await c.from('crew_members').select('crew_id, crews(id, name, code)').eq('user_id', userId).maybeSingle()
  if (!m) return null
  const { data: members } = await c.from('crew_members').select('user_id, color').eq('crew_id', m.crew_id)
  const ids = (members || []).map((x) => x.user_id)
  const { data: profs } = ids.length ? await c.from('profiles').select('id, display_name, stats:data->stats, avatar:data->profile->avatar').in('id', ids) : { data: [] }
  const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]))
  const others = ids.filter((id) => id !== userId)
  let recent = []
  if (others.length) {
    const { data } = await c.from('sessions').select('id, user_id, day_name, ended_at, volume, data->>type, data->>title, data->>focus').in('user_id', others).eq('status', 'done').order('ended_at', { ascending: false }).limit(20)
    recent = data || []
  }
  return {
    id: m.crews.id, name: m.crews.name, code: m.crews.code,
    members: (members || []).map((x) => ({ id: x.user_id, name: byId[x.user_id]?.display_name || 'Partner', stats: byId[x.user_id]?.stats || null, avatar: byId[x.user_id]?.avatar || null, me: x.user_id === userId })),
    recent,
  }
}

// ---------- cheers ----------
export const cheer = (to, sessionId, title, text) => (cloudEnabled ? api('/api/nudge', { kind: 'cheer', to, sessionId, title, text }) : null)
export async function cheersSent(userId) {
  const { data } = await supa().from('cheers').select('session_id').eq('from_user', userId).order('created_at', { ascending: false }).limit(100)
  return new Set((data || []).map((r) => r.session_id))
}
// cheers you haven't seen yet, with who sent them; marked seen as they're read
export async function takeCheers(userId) {
  const c = supa()
  const { data } = await c.from('cheers').select('id, from_user, title').eq('to_user', userId).eq('seen', false).order('created_at').limit(10)
  if (!data?.length) return []
  const ids = [...new Set(data.map((r) => r.from_user))]
  const { data: profs } = await c.from('profiles').select('id, display_name').in('id', ids)
  const name = Object.fromEntries((profs || []).map((p) => [p.id, p.display_name || 'Your crew']))
  await c.from('cheers').update({ seen: true }).in('id', data.map((r) => r.id))
  return data.map((r) => ({ from: name[r.from_user] || 'Your crew', title: r.title }))
}

export async function createCrew(name) {
  const { data, error } = await supa().rpc('create_crew', { crew_name: name })
  if (error) throw error
  return data
}

export async function joinCrew(code) {
  const { data, error } = await supa().rpc('join_crew', { invite: code.trim().toUpperCase() })
  if (error) throw error
  return data
}

// ---------- push ----------
const b64 = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function enablePush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('This browser cannot receive push. On iPhone, add Lavender to your Home Screen first.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications were not allowed.')
  if (!cloudEnabled || !VAPID_PUBLIC || !userId) return 'local'
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) }))
  const j = sub.toJSON()
  const { error } = await supa().from('push_subscriptions').upsert({ user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' })
  if (error) throw error
  return 'push'
}

async function api(path, body) {
  const t = await token()
  if (!t) return null
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` }, body: JSON.stringify(body), keepalive: true })
  return r.ok ? r.json().catch(() => ({})) : null
}

export const restTimerRemote = {
  start: (id, seconds, title, body) => (cloudEnabled ? api('/api/rest-timer', { action: 'start', id, seconds, title, body }) : null),
  cancel: (id) => (cloudEnabled ? api('/api/rest-timer', { action: 'cancel', id }) : null),
}

export const nudgePartner = (kind, text) => (cloudEnabled ? api('/api/nudge', { kind, text }) : null)
