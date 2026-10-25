// Lavender service worker: push notifications + an offline shell.
const CACHE = 'lavender-v2'

// On install, save the whole app (the page plus every script and style it loads),
// so it opens with no connection from the very first time it is added.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE)
    try {
      const res = await fetch('/', { cache: 'reload' })
      const html = await res.clone().text()
      await c.put('/', res)
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
      await c.addAll([...new Set(assets), '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/favicon.svg', '/favicon.ico'].filter(Boolean))
    } catch {}
  })())
  self.skipWaiting()
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

// network first for pages (so deploys land), cache first for hashed assets
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || req.url.includes('/api/')) return
  if (req.mode === 'navigate') {
    // network first so new versions land, but never wait more than 3 s on a weak signal
    const net = fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); return r })
    const slow = new Promise((ok) => setTimeout(ok, 3000)).then(() => caches.match('/'))
    e.respondWith(Promise.race([net, slow]).then((r) => r || net).catch(() => caches.match('/')))
    return
  }
  if (req.url.includes('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r })))
  }
})

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data.json() } catch { d = { title: 'Lavender', body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'Lavender', {
    body: d.body || '', tag: d.tag, renotify: !!d.tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: d.url || '/' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if ('focus' in c) return c.focus()
    return self.clients.openWindow(e.notification.data?.url || '/')
  }))
})
