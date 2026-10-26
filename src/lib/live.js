// Training together, live: while you're in a workout, your crew can see which move and set you're on.
// Uses a Supabase Realtime presence channel for the crew. Nothing is stored; it vanishes when you stop.
import { useSyncExternalStore } from 'react'
import { supa, cloudEnabled } from './cloud.js'

let channel = null, me = null, others = [], current = null
const subs = new Set()
const emit = () => subs.forEach((f) => f())

export function joinLive(crewId, userId) {
  if (!cloudEnabled || !crewId || !userId || channel) return
  me = userId
  channel = supa().channel(`crew-live:${crewId}`, { config: { presence: { key: userId } } })
  channel.on('presence', { event: 'sync' }, () => {
    const st = channel.presenceState()
    others = Object.entries(st).filter(([k]) => k !== me).map(([, v]) => v[v.length - 1]).filter((x) => x && x.ex && Date.now() - (x.at || 0) < 3 * 3600e3)
    emit()
  })
  channel.subscribe((status) => { if (status === 'SUBSCRIBED' && current) channel.track(current) })
}

// what you're doing now (or null when you stop)
export function setLive(info) {
  current = info ? { ...info, at: Date.now() } : null
  if (!channel) return
  if (current) channel.track(current).catch(() => {})
  else channel.untrack().catch(() => {})
}

export function useLive() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => others)
}
// demo builds: a pretend partner, so the strip can be seen
export function fakeLive(list) { others = list; emit() }
