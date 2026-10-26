import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(<App />)

if ('serviceWorker' in navigator && !import.meta.env.VITE_DEMO && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').then((reg) => {
    // look for a new version whenever the app comes back to the front, and every half hour
    const check = () => reg.update().catch(() => {})
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
    setInterval(check, 30 * 60e3)
  }).catch(() => {}))
  // A new version has taken over. Swap to it the next time the app is in the background (never mid-workout),
  // and say so once it's back.
  let had = !!navigator.serviceWorker.controller, pending = false
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) pending = true; had = true })
  document.addEventListener('visibilitychange', () => {
    if (pending && document.visibilityState === 'hidden' && !document.querySelector('.screen')) {
      try { sessionStorage.setItem('lavender:updated', '1') } catch {}
      location.reload()
    }
  })
}

if (import.meta.env.VITE_DEMO) import('./lib/sample.js').then((m) => { window.__sample = m.loadSampleHistory })
if (import.meta.env.VITE_DEMO) import('./lib/live.js').then((m) => { window.__live = m.fakeLive })
