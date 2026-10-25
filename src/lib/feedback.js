import { getState } from './store.js'

let ctx = null
function ac() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch { return null }
}

// Soft sine tones with slow attack: no clicks, nothing harsh.
function tone(freq, start, dur, gain = 0.08) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.value = freq
  const t = c.currentTime + start
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

export const sound = {
  tick() { if (getState().settings.sound) tone(1320, 0, 0.06, 0.03) },
  set() { if (getState().settings.sound) { tone(660, 0, 0.18, 0.06); tone(990, 0.06, 0.22, 0.04) } },
  rest() { if (getState().settings.sound) { tone(784, 0, 0.5); tone(1046.5, 0.18, 0.6); tone(1568, 0.36, 0.8, 0.05) } },
  pr() { if (getState().settings.sound) { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.9, 0.05)) } },
  thunk() { if (getState().settings.sound) { tone(150, 0, 0.14, 0.12); tone(95, 0.01, 0.18, 0.08) } },
  unlock() { ac() },
}

export function haptic(kind = 'light') {
  if (!getState().settings.haptics) return
  const p = { light: 8, medium: 14, heavy: 24, success: [10, 40, 18], warn: [20, 60, 20] }[kind] || 8
  try { navigator.vibrate?.(p) } catch {}
}

export async function localNotify(title, body, tag) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg) reg.showNotification(title, { body, tag, icon: './icons/icon-192.png', badge: './icons/icon-192.png' })
    else new Notification(title, { body, tag })
  } catch {}
}
