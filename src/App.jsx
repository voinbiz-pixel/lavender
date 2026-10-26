import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useMotionValue, useVelocity, useTransform, animate } from 'framer-motion'
import { useStore, attachUser, getState, currentUser } from './lib/store.js'
import { cloudEnabled, getUser, supa, crewInfo, joinCrew, takeCheers } from './lib/cloud.js'
import { joinLive } from './lib/live.js'
import { activeSession, doneToday } from './lib/actions.js'
import { ToastHost, Icon, dur, toast } from './ui/kit.jsx'
import { ExerciseHost } from './ui/explain.jsx'
import { startLiquid } from './ui/liquid.js'
import { haptic } from './lib/feedback.js'
import Today from './screens/Today.jsx'
import Calendar from './screens/Calendar.jsx'
import Session from './screens/Session.jsx'
import Flow from './screens/Flow.jsx'
import Cardio from './screens/Cardio.jsx'
import Recap from './screens/Recap.jsx'
import Progress from './screens/Progress.jsx'
import You from './screens/You.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Auth from './screens/Auth.jsx'

// pages only re-render when their own data changes, never just because the tab changed
const TodayM = React.memo(Today)
const CalendarM = React.memo(Calendar)
const ProgressM = React.memo(Progress)
const YouM = React.memo(You)

// The day's colour, as CSS variables so light and dark each have their own (see styles.css)
export const TONES = { train: 'var(--t-train)', rest: 'var(--t-rest)', done: 'var(--t-done)', morning: 'var(--t-morning)' }
const TONE_HEX = { light: { train: '#B7C8B3', rest: '#B4B5C8', done: '#C6B4BE', morning: '#CFC6B4' }, dark: { train: '#222A24', rest: '#23242D', done: '#2C2328', morning: '#2D2922' } }
const TABS = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'calendar', label: 'Calendar', icon: 'days' },
  { id: 'progress', label: 'Progress', icon: 'fill' },
  { id: 'you', label: 'You', icon: 'you' },
]

// Light, dark, or the phone's own setting. The change eases over half a second instead of flashing.
function useTheme(pref) {
  const q = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null
  const [sys, setSys] = useState(() => (q?.matches ? 'dark' : 'light'))
  useEffect(() => { if (!q) return; const f = () => setSys(q.matches ? 'dark' : 'light'); q.addEventListener?.('change', f); return () => q.removeEventListener?.('change', f) }, [])
  const theme = pref === 'auto' ? sys : pref
  const first = useRef(true)
  useLayoutEffect(() => {
    const el = document.documentElement
    if (!first.current) { el.classList.add('theming'); clearTimeout(useTheme.t); useTheme.t = setTimeout(() => el.classList.remove('theming'), 700) }
    first.current = false
    el.dataset.theme = theme
    el.style.colorScheme = theme
  }, [theme])
  return theme
}

export function toneOf(state, now = new Date()) {
  if (activeSession(state)) return 'train'
  if (doneToday(state, now)) return 'done'
  return state.profile.trainDays.includes(now.getDay()) ? 'train' : 'rest'
}

// An invite link (lavender.app/join/CODE) is remembered until you're signed in and set up.
const JOIN_KEY = 'lavender:join'
if (typeof location !== 'undefined') {
  const m = location.pathname.match(/^\/join\/([A-Za-z0-9]{4,8})\/?$/)
  if (m) { try { localStorage.setItem(JOIN_KEY, m[1].toUpperCase()) } catch {} history.replaceState(null, '', '/') }
}
export const pendingInvite = () => { try { return localStorage.getItem(JOIN_KEY) } catch { return null } }

export default function App() {
  const state = useStore()
  const [authed, setAuthed] = useState(cloudEnabled ? 'checking' : 'local')
  const [screen, setScreen] = useState(null) // { kind: 'session', origin } | { kind: 'flow', key, origin }
  const [tab, setTab] = useState('today')
  const [seen, setSeen] = useState({ today: true })
  const nav = React.useMemo(() => ({
    session: (origin) => setScreen({ kind: 'session', origin }),
    flow: (key, origin) => setScreen({ kind: 'flow', key, origin }),
    cardio: (desc, origin) => setScreen({ kind: 'cardio', desc, origin }),
    recap: (origin) => setScreen({ kind: 'recap', origin }),
    calendar: () => setTab('calendar'),
  }), [])
  useEffect(() => { setSeen((x) => (x[tab] ? x : { ...x, [tab]: true })) }, [tab])
  // after a quiet update, say so once
  useEffect(() => { try { if (sessionStorage.getItem('lavender:updated')) { sessionStorage.removeItem('lavender:updated'); setTimeout(() => toast('Updated'), 900) } } catch {} }, [])
  // once Today has settled, quietly build the other tabs one at a time, so the first visit is instant too
  const ready = authed !== 'checking' && authed !== 'out' && state.profile.onboarded
  useEffect(() => {
    if (!ready) return
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 50))
    const ids = ['calendar', 'progress', 'you']
    let k = 0, t
    const next = () => { if (k >= ids.length) return; const id = ids[k++]; setSeen((x) => (x[id] ? x : { ...x, [id]: true })); t = setTimeout(() => idle(next, { timeout: 800 }), 120) }
    t = setTimeout(() => idle(next, { timeout: 800 }), 1200)
    return () => clearTimeout(t)
  }, [ready])

  useEffect(() => {
    if (!cloudEnabled) return
    getUser().then((u) => { setAuthed(u ? 'in' : 'out'); if (u) attachUser(u) })
    const { data } = supa().auth.onAuthStateChange((_e, session) => { if (!session) setAuthed('out') })
    return () => data.subscription.unsubscribe()
  }, [])

  // the crew, once signed in: join an invite from a link, go live with the crew, and show cheers you got
  useEffect(() => {
    if (!cloudEnabled || authed !== 'in' || !state.profile.onboarded) return
    const u = currentUser()
    if (!u) return
    let code = null
    try { code = localStorage.getItem(JOIN_KEY) } catch {}
    const crew = () => crewInfo(u.id).then((c) => { if (c) joinLive(c.id, u.id); return c }).catch(() => null)
    ;(async () => {
      let c = await crew()
      if (code) {
        try { localStorage.removeItem(JOIN_KEY) } catch {}
        if (c && c.code === code) toast(`You’re in ${c.name}`)
        else if (c) toast('You’re already in a crew')
        else { try { await joinCrew(code); c = await crew(); toast(c ? `You joined ${c.name}` : 'Joined') } catch (e) { toast(e.message || 'That invite didn’t work') } }
      }
    })()
    const cheers = () => takeCheers(u.id).then((list) => list.forEach((x, i) => setTimeout(() => toast(`${x.from} cheered your ${x.title || 'workout'}`), 1200 + i * 3200))).catch(() => {})
    cheers()
    const vis = () => { if (document.visibilityState === 'visible') cheers() }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [authed, state.profile.onboarded])

  // reopen a workout that was in progress if the app was closed mid-session
  useEffect(() => {
    if (activeSession(getState()) && getState().profile.onboarded) {
      try { if (sessionStorage.getItem('callisto:open') === 'session') setScreen({ kind: 'session' }) } catch {}
    }
  }, [])
  useEffect(() => { try { sessionStorage.setItem('callisto:open', screen?.kind || '') } catch {} }, [screen])

  const toneKey = !state.profile.onboarded ? 'train' : toneOf(state)
  const tone = TONES[toneKey]
  const theme = useTheme(state.settings?.theme || 'auto')
  useEffect(() => startLiquid(document.getElementById('root')), [])
  useEffect(() => {
    document.body.style.backgroundColor = tone
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', TONE_HEX[theme][toneKey])
  }, [tone, theme])

  let body
  if (authed === 'checking') body = null
  else if (authed === 'out') body = <Auth onUser={(u) => { setAuthed('in'); attachUser(u) }} />
  else if (!state.profile.onboarded) body = <Onboarding />
  else {
    body = (
      <>
        {/* Tabs stay mounted once visited, so switching is a cheap crossfade (and each keeps its scroll). */}
        {TABS.map((t) => (seen[t.id] || t.id === tab) && (
          <motion.div key={t.id} style={{ position: 'absolute', inset: 0, zIndex: t.id === tab ? 1 : 0, pointerEvents: t.id === tab ? 'auto' : 'none', willChange: 'opacity, transform' }}
            aria-hidden={t.id !== tab} initial={{ opacity: 0, scale: 0.985 }}
            animate={t.id === tab ? { opacity: 1, scale: 1, visibility: 'visible' } : { opacity: 0, scale: 0.985, transitionEnd: { visibility: 'hidden' } }}
            transition={{ type: 'spring', bounce: 0, duration: dur(t.id === tab ? 0.34 : 0.22) }}>
            {t.id === 'today' && <TodayM openSession={nav.session} openFlow={nav.flow} openCardio={nav.cardio} openCalendar={nav.calendar} openRecap={nav.recap} />}
            {t.id === 'calendar' && <CalendarM />}
            {t.id === 'progress' && <ProgressM />}
            {t.id === 'you' && <YouM signedIn={authed === 'in'} />}
          </motion.div>
        ))}
        <div className="status" aria-hidden />
        <TabBar tab={tab} setTab={setTab} />
        <AnimatePresence>
          {screen?.kind === 'session' && <Session key="session" origin={screen.origin} onClose={() => setScreen(null)} />}
          {screen?.kind === 'flow' && <Flow key={`flow-${screen.key}`} flowKey={screen.key} origin={screen.origin} onClose={() => setScreen(null)} />}
          {screen?.kind === 'recap' && <Recap key="recap" origin={screen.origin} onClose={() => setScreen(null)} />}
          {screen?.kind === 'cardio' && <Cardio key={`cardio-${screen.desc?.key}`} desc={screen.desc} origin={screen.origin} onClose={() => setScreen(null)} />}
        </AnimatePresence>
      </>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="app" style={{ backgroundColor: tone, '--tone': tone }}>
        {body}
        <div id="overlay" style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }} />
        <ToastHost />
        <ExerciseHost />
      </div>
    </MotionConfig>
  )
}

// The tab bar: a liquid-glass capsule. The lighter lens slides to the tab you pick,
// following your finger if you drag along the bar, and lands on the nearest tab.
function TabBar({ tab, setTab }) {
  const ref = useRef(null)
  const [w, setW] = useState(88)
  const idx = Math.max(0, TABS.findIndex((t) => t.id === tab))
  const x = useMotionValue(idx * w)
  const drag = useRef(null)
  const vel = useVelocity(x)
  const sx = useTransform(vel, (v) => 1 + Math.min(0.32, Math.abs(v) / 2600))
  const sy = useTransform(vel, (v) => 1 - Math.min(0.14, Math.abs(v) / 6000))
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW((el.clientWidth - 10) / TABS.length))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { if (!drag.current) animate(x, idx * w, { type: 'spring', bounce: 0.2, duration: dur(0.45) }) }, [idx, w])
  const at = (e) => Math.max(0, Math.min(TABS.length - 1, Math.round((e.clientX - ref.current.getBoundingClientRect().left - 5 - w / 2) / w)))
  return (
    <nav ref={ref} className="tabbar lg" aria-label="Main"
      onPointerDown={(e) => { drag.current = { x0: e.clientX, moved: false } }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || e.buttons === 0) return
        if (!d.moved && Math.abs(e.clientX - d.x0) < 10) return
        d.moved = true
        const left = ref.current.getBoundingClientRect().left
        x.set(Math.max(-8, Math.min((TABS.length - 1) * w + 8, e.clientX - left - 5 - w / 2)))
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (d?.moved) {
          const i = at(e)
          haptic('light')
          animate(x, i * w, { type: 'spring', bounce: 0.2, duration: dur(0.45) })
          setTab(TABS[i].id)
        }
      }}
      onPointerCancel={() => { drag.current = null; animate(x, idx * w, { type: 'spring', bounce: 0.2, duration: dur(0.45) }) }}>
      <motion.span className="lens" aria-hidden style={{ width: w, x, scaleX: sx, scaleY: sy }} />
      {TABS.map((t) => (
        <button key={t.id} aria-current={t.id === tab ? 'page' : undefined} onClick={() => { if (t.id !== tab) { haptic('light'); setTab(t.id) } }}>
          <Icon name={t.icon} size={22} stroke={t.id === tab ? 2.2 : 1.8} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
