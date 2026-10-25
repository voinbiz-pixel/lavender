// Fires a push when rest is over, so it arrives even with the phone locked.
// The function waits out the rest period (max ~4.75 min), then checks it wasn't cancelled.
import { admin, userFromReq, sendToUser, readBody } from './_lib.js'

export const config = { maxDuration: 300 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const user = await userFromReq(req)
  if (!user) return res.status(401).json({ error: 'Sign in' })
  const { action, id, seconds, title, body } = readBody(req)
  if (!id) return res.status(400).json({ error: 'Missing id' })
  const db = admin()

  if (action === 'cancel') {
    await db.from('rest_timers').update({ cancelled: true }).eq('id', id).eq('user_id', user.id)
    return res.json({ ok: true })
  }

  const s = Math.max(5, Math.min(285, Number(seconds) || 90))
  await db.from('rest_timers').upsert({ id, user_id: user.id, fire_at: new Date(Date.now() + s * 1000).toISOString(), cancelled: false, sent: false })
  await new Promise((r) => setTimeout(r, s * 1000 - 400))
  const { data } = await db.from('rest_timers').select('cancelled, sent').eq('id', id).maybeSingle()
  if (data && !data.cancelled && !data.sent) {
    await sendToUser(user.id, { title: title || 'Rest is up', body: body || 'Next set when you are ready.', tag: 'rest' })
    await db.from('rest_timers').update({ sent: true }).eq('id', id)
  }
  // tidy old rows
  await db.from('rest_timers').delete().lt('fire_at', new Date(Date.now() - 864e5).toISOString())
  return res.json({ ok: true })
}
