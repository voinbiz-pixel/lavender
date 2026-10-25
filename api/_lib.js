// Shared server helpers. Files starting with "_" are not deployed as routes.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

let client
export function admin() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

export async function userFromReq(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await admin().auth.getUser(token)
  return data?.user || null
}

let ready = false
function vapid() {
  if (ready) return
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@example.com', process.env.VITE_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
  ready = true
}

export async function sendToUser(userId, payload) {
  vapid()
  const { data: subs } = await admin().from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId)
  await Promise.all((subs || []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 900, urgency: 'high' })
    } catch (e) {
      // the phone unsubscribed or the app was removed: clean up
      if (e.statusCode === 404 || e.statusCode === 410) await admin().from('push_subscriptions').delete().eq('endpoint', s.endpoint)
    }
  }))
  return (subs || []).length
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  try { return JSON.parse(req.body || '{}') } catch { return {} }
}
