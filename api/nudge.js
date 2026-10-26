// Tell crew members you finished a session, nudge them to train, or cheer one of their workouts.
import { admin, userFromReq, sendToUser, readBody } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const user = await userFromReq(req)
  if (!user) return res.status(401).json({ error: 'Sign in' })
  const { kind, text, to, sessionId, title } = readBody(req)
  const db = admin()
  const { data: me } = await db.from('crew_members').select('crew_id').eq('user_id', user.id).maybeSingle()
  if (!me) return res.json({ ok: true, sent: 0 })
  if (kind === 'cheer') {
    // only someone in your crew, once per workout
    const { data: them } = await db.from('crew_members').select('user_id').eq('crew_id', me.crew_id).eq('user_id', to).maybeSingle()
    if (!them || !sessionId) return res.status(400).json({ error: 'Not in your crew' })
    const { error } = await db.from('cheers').insert({ from_user: user.id, to_user: to, session_id: String(sessionId), title: title ? String(title).slice(0, 60) : null })
    if (error) return res.json({ ok: true, sent: 0, already: true })
    const sent = await sendToUser(to, { title: 'A cheer', body: String(text || '').slice(0, 140), tag: 'crew-cheer' })
    return res.json({ ok: true, sent })
  }
  const { data: others } = await db.from('crew_members').select('user_id').eq('crew_id', me.crew_id).neq('user_id', user.id)
  let sent = 0
  const today = new Date().toISOString().slice(0, 10)
  for (const o of others || []) {
    const { data: prof } = await db.from('profiles').select('data').eq('id', o.user_id).maybeSingle()
    if (prof?.data?.settings?.partnerAlerts === false) continue
    if (kind === 'nudge') {
      // at most one nudge a day per person, so it never becomes nagging
      const { error } = await db.from('notification_log').insert({ user_id: o.user_id, kind: `nudge:${user.id}`, day: today })
      if (error) continue
    }
    sent += await sendToUser(o.user_id, { title: kind === 'nudge' ? 'A nudge' : 'Your partner trained', body: String(text || '').slice(0, 140), tag: `crew-${kind}` })
  }
  return res.json({ ok: true, sent })
}
