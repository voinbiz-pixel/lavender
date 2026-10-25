// Called every 15 minutes by Supabase pg_cron (see supabase/schema.sql).
// Sends, at each person's local time and only when it is still useful:
//  - the morning routine reminder, if the routine isn't done yet
//  - the workout reminder on training days, if they haven't trained
//  - a 3 pm water check, only if they're under half of today's target
import { admin, sendToUser } from './_lib.js'
import { waterTarget } from '../src/engine/hydration.js'

function local(tz, d = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map((p) => [p.type, p.value]))
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return { dow, date: `${parts.year}-${parts.month}-${parts.day}`, minutes: (+parts.hour % 24) * 60 + +parts.minute }
}
const at = (t, fallback) => { const [h, m] = String(t || fallback).split(':').map(Number); return h * 60 + (m || 0) }
const inWindow = (now, t) => now.minutes >= t && now.minutes < t + 15

export default async function handler(req, res) {
  const key = req.query?.key || (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Nope' })
  const db = admin()
  const { data: profiles } = await db.from('profiles').select('id, data')
  let sent = 0
  const once = async (id, kind, date, payload) => {
    const { error } = await db.from('notification_log').insert({ user_id: id, kind, day: date })
    if (!error) sent += await sendToUser(id, payload)
  }
  for (const row of profiles || []) {
    const d = row.data || {}
    const p = d.profile
    if (!p?.onboarded) continue
    const tz = p.tz || 'America/New_York'
    const now = local(tz)
    const sameDay = (iso) => local(tz, new Date(iso)).date === now.date
    const flows = Object.entries(d.flows || {}).find(([k]) => local(tz, new Date(k)).date === now.date)?.[1] || {}

    if (p.morning?.on && (p.morning.days || []).includes(now.dow) && !flows.morning && inWindow(now, at(p.morning.time, '07:00'))) {
      await once(row.id, 'morning', now.date, { title: 'Morning routine', body: 'Six minutes before work: water, mobility, breathing.', tag: 'morning' })
    }

    if (p.reminder?.on && (p.trainDays || []).includes(now.dow) && inWindow(now, at(p.reminder.time, '18:00'))) {
      const { data: recent } = await db.from('sessions').select('started_at').eq('user_id', row.id).eq('status', 'done').gte('started_at', new Date(Date.now() - 2 * 864e5).toISOString())
      const trained = (recent || []).some((s) => sameDay(s.started_at)) || (p.mode === 'yoga' && flows.stretch)
      if (!trained) await once(row.id, 'reminder', now.date, { title: 'Training day', body: p.mode === 'yoga' ? 'Your stretch is waiting.' : `Your workout is waiting. About ${p.sessionMinutes || 45} minutes.`, tag: 'reminder' })
    }

    if (p.waterNudge !== false && inWindow(now, 15 * 60)) {
      const have = (d.water || []).filter((w) => sameDay(w.at)).reduce((n, w) => n + w.ml, 0)
      const target = waterTarget({ profile: p, bodyweight: d.bodyweight, sessions: [] })
      if (have < target / 2) {
        const left = target - have
        await once(row.id, 'water', now.date, { title: 'Water check', body: `About ${p.units === 'lb' ? Math.round(left / 29.5735) + ' oz' : (left / 1000).toFixed(1) + ' L'} to go today.`, tag: 'water' })
      }
    }
  }
  return res.json({ ok: true, sent })
}
