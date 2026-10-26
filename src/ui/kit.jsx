import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useDragControls, usePresence, useReducedMotion } from 'framer-motion'
import { haptic } from '../lib/feedback.js'
import { shapes, MOVES, stillTime } from '../engine/moves.js'

// Springs (damping ratio and response, in framer-motion terms).
// PACE slows the whole app evenly: every spring and transition is multiplied by it.
export const PACE = 1.7
export const dur = (d) => Math.round(d * PACE * 100) / 100
export const spring = { type: 'spring', bounce: 0, duration: dur(0.4) }          // move / reposition
export const springSheet = { type: 'spring', bounce: 0.16, duration: dur(0.38) }  // sheets and drawers
export const springPop = { type: 'spring', bounce: 0.26, duration: dur(0.5) }     // small things that pop in

// A button that answers on touch-down: it sinks into the surface while your finger is on it.
export const Press = React.forwardRef(function Press({ as = 'button', className = '', children, scale = 0.97, haptics = 'light', onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, ...rest }, ref) {
  const M = motion[as]
  const [down, setDown] = useState(false)
  const up = (fn) => (e) => { setDown(false); fn?.(e) }
  return (
    <M ref={ref} className={`${className}${down ? ' down' : ''}`} whileTap={{ scale }} transition={{ type: 'spring', bounce: 0, duration: 0.26 }}
      onPointerDown={(e) => { setDown(true); if (haptics) haptic(haptics); onPointerDown?.(e) }}
      onPointerUp={up(onPointerUp)} onPointerCancel={up(onPointerCancel)} onPointerLeave={up(onPointerLeave)} {...rest}>
      {children}
    </M>
  )
})

const I = {
  chart: <path d="M4 18c3.5 0 5-9 8-9s3.5 4.5 8 1" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  swap: <path d="M7 7.5h11l-3-3M17 16.5H6l3 3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5.5 12.5l4.2 4.2L18.5 7.8" />,
  drop: <path d="M12 4c3 4 5.5 6.8 5.5 9.8a5.5 5.5 0 0 1-11 0C6.5 10.8 9 8 12 4z" />,
  play: <path d="M8.5 6v12l9.5-6z" fill="currentColor" />,
  pause: <path d="M9 6.5v11M15 6.5v11" />,
  next: <path d="M7 6l7 6-7 6M17 6v12" />,
  sun: <><circle cx="12" cy="12" r="3.6" /><path d="M12 3.5v1.6M12 18.9v1.6M3.5 12h1.6M18.9 12h1.6M6 6l1.1 1.1M16.9 16.9L18 18M6 18l1.1-1.1M16.9 7.1L18 6" /></>,
  chevD: <path d="M6 10l6 6 6-6" />,
  chevR: <path d="M10 6l6 6-6 6" />,
  chevL: <path d="M14 6l-6 6 6 6" />,
  // the tab family: one outline, something solid inside it, always symmetric
  today: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></>,
  // days: a square holding four
  days: <><rect x="3.75" y="3.75" width="16.5" height="16.5" rx="5.5" /><g fill="currentColor" stroke="none"><circle cx="9.4" cy="9.4" r="1.7" /><circle cx="14.6" cy="9.4" r="1.7" /><circle cx="9.4" cy="14.6" r="1.7" /><circle cx="14.6" cy="14.6" r="1.7" /></g></>,
  // a ring filling up from the bottom
  fill: <><circle cx="12" cy="12" r="8.5" /><path d="M6.6 13.2a5.4 5.4 0 0 0 10.8 0z" fill="currentColor" stroke="none" /></>,
  // you, inside the ring
  you: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="10.2" r="2.7" fill="currentColor" stroke="none" /><path d="M7.6 17.6c1.1-1.8 2.6-2.7 4.4-2.7s3.3.9 4.4 2.7" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="4" /><path d="M4 10.5h16M9 3.5v3.5M15 3.5v3.5" /></>,
  person: <><circle cx="12" cy="8.8" r="3.6" /><path d="M5.5 19.5c1.4-3 3.8-4.4 6.5-4.4s5.1 1.4 6.5 4.4" /></>,
}
export function Icon({ name, size = 20, stroke = 2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none', ...style }} aria-hidden>
      {I[name]}
    </svg>
  )
}

export function Portal({ children }) {
  const el = typeof document !== 'undefined' ? document.getElementById('overlay') : null
  return el ? createPortal(children, el) : children
}

// A bottom sheet you can fling away. Exits along the way it came in.
export function Sheet({ open, onClose, children, label }) {
  const controls = useDragControls()
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <React.Fragment key="sheet">
            <motion.div className="scrim" style={{ pointerEvents: 'auto' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={{ duration: dur(0.25) }} onClick={onClose} />
            <motion.div className="sheet lg" role="dialog" aria-label={label} style={{ pointerEvents: 'auto' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', pointerEvents: 'none' }} transition={springSheet}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.04, bottom: 0.8 }} dragListener={false}
              dragControls={controls}
              onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose?.() }}>
              <div style={{ padding: '2px 0 10px', touchAction: 'none', cursor: 'grab' }} onPointerDown={(e) => controls.start(e)}><div className="grab" />{label && <div className="title center" style={{ fontSize: 24, marginTop: 14 }}>{label}</div>}</div>
              <div className="sheet-body">{children}</div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </Portal>
  )
}

export function useLongPress(onLong, ms = 450) {
  const t = useRef(null)
  const start = useRef(null)
  const fired = useRef(false)
  const clear = () => { clearTimeout(t.current); t.current = null }
  return {
    onPointerDown: (e) => {
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      const el = e.currentTarget
      clear()
      t.current = setTimeout(() => { fired.current = true; haptic('medium'); onLong(el.getBoundingClientRect()) }, ms)
    },
    onPointerMove: (e) => { if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear() },
    onPointerUp: clear,
    onPointerCancel: clear,
    onContextMenu: (e) => e.preventDefault(),
    onClickCapture: (e) => { if (fired.current) { e.stopPropagation(); e.preventDefault(); fired.current = false } },
  }
}

// A small menu that grows out of what was pressed.
export function Menu({ anchor, items, onClose }) {
  const root = document.getElementById('overlay')?.getBoundingClientRect()
  let top = 0, left = 20, origin = 'top center'
  if (anchor && root) {
    const h = items.length * 48 + 12
    const below = anchor.bottom - root.top + h + 16 < root.height
    top = below ? anchor.bottom - root.top + 8 : anchor.top - root.top - h - 8
    left = Math.max(12, Math.min(root.width - 232, anchor.left - root.left + anchor.width / 2 - 110))
    origin = `${anchor.left - root.left + anchor.width / 2 - left}px ${below ? 0 : h}px`
  }
  return (
    <Portal>
      <AnimatePresence>
        {anchor && (
          <React.Fragment key="menu">
            <motion.div style={{ position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'auto' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} onClick={onClose} />
            <motion.div className="menu lg" role="menu" style={{ top, left, width: 220, transformOrigin: origin, pointerEvents: 'auto' }}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7, pointerEvents: 'none' }} transition={springPop}>
              {items.filter(Boolean).map((it, i) => (
                <button key={i} role="menuitem" onClick={() => { onClose(); setTimeout(() => it.onSelect?.(), 90) }}>{it.label}</button>
              ))}
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </Portal>
  )
}

// Hold to commit: a pill that fills from the left while held and drains back if you let go.
export function HoldPill({ label = 'Hold to begin', onComplete, ms = 750, tone = 'ink' }) {
  const p = useMotionValue(0)
  const anim = useRef(null)
  const [holding, setHolding] = useState(false)
  const clip = useTransform(p, (v) => `inset(0 ${(1 - v) * 100}% 0 0 round 30px)`)
  const begin = (e) => {
    if (e.button && e.button !== 0) return
    setHolding(true)
    haptic('light')
    anim.current?.stop()
    anim.current = animate(p, 1, { duration: (ms / 1000) * (1 - p.get()), ease: [0.4, 0, 0.6, 1], onComplete: () => { haptic('success'); setHolding(false); onComplete?.(); setTimeout(() => p.set(0), 500) } })
  }
  const end = () => {
    setHolding(false)
    if (p.get() >= 1) return
    anim.current?.stop()
    anim.current = animate(p, 0, { type: 'spring', bounce: 0, duration: dur(0.3) })
  }
  const text = holding ? 'Keep holding' : label
  return (
    <motion.button className={`pill ${tone}${holding ? ' down' : ''}`} style={{ position: 'relative', overflow: 'hidden', touchAction: 'none' }}
      whileTap={{ scale: 0.98 }} onPointerDown={begin} onPointerUp={end} onPointerLeave={end} onPointerCancel={end}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onComplete?.() } }}
      onContextMenu={(e) => e.preventDefault()} aria-label={label}>
      <span>{text}</span>
      <motion.span aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: tone === 'ink' ? 'var(--paper)' : 'var(--ink)', color: tone === 'ink' ? 'var(--ink)' : 'var(--paper)', clipPath: clip, WebkitClipPath: clip }}>{text}</motion.span>
    </motion.button>
  )
}

export function Switch({ on, onChange, label }) {
  return (
    <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => { haptic('light'); onChange(!on) }}>
      <motion.i animate={{ x: on ? 20 : 0 }} transition={springPop} />
    </button>
  )
}

// The ink figure, looping through a move. One colour, the far limbs lighter.
const TONE = { near: 'var(--ink)', far: 'var(--fig-far)', eq: 'var(--ink)', eqfar: 'var(--fig-eqfar)', hub: 'var(--tone)', eqline: 'var(--ink)', eqfarline: 'var(--fig-eqfar)', prop: 'var(--fig-prop)', ground: 'var(--fig-ground)' }
export function Figure({ id, size = 260, playing = true, style }) {
  const still = !playing || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [t, setT] = useState(() => (still ? stillTime(id) : 0))
  useEffect(() => {
    if (still) { setT(stillTime(id)); return }
    let raf, t0 = performance.now()
    const tick = (now) => { setT((now - t0) / 1000); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [id, still])
  if (!MOVES[id]) return <div style={{ width: size, height: (size * 140) / 160 }} />
  return (
    <svg viewBox="0 0 160 140" width={size} height={(size * 140) / 160} style={{ display: 'block', ...style }} aria-hidden>
      {shapes(id, t).map((s, i) => {
        if (s.k === 'line') return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} style={{ stroke: TONE[s.tone] }} strokeWidth={s.w} strokeLinecap="round" />
        if (s.k === 'circle') return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} style={{ fill: TONE[s.tone] }} />
        if (s.k === 'rect') return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} style={{ fill: TONE[s.tone] }} />
        return <path key={i} d={s.d} fill="none" style={{ stroke: TONE[s.tone] }} strokeWidth={s.w} strokeLinecap="round" />
      })}
    </svg>
  )
}

// Toast
let toastSet = null
export function ToastHost() {
  const [msg, setMsg] = useState(null)
  useEffect(() => { toastSet = (m) => { setMsg(m); clearTimeout(toastSet.t); toastSet.t = setTimeout(() => setMsg(null), 2800) } }, [])
  return (
    <AnimatePresence>
      {msg && <motion.div key={msg} className="toast lg" initial={{ opacity: 0, y: 12, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 8, x: '-50%' }} transition={springPop}>{msg}</motion.div>}
    </AnimatePresence>
  )
}
export const toast = (m) => toastSet?.(m)

export const fmtClock = (s) => {
  const v = Math.max(0, Math.ceil(s))
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`
}

export function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return n
}

// Small phones (iPhone SE, mini) get a tighter stage.
export function useCompact() {
  const q = '(max-height: 740px)'
  const [c, setC] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches)
  useEffect(() => {
    const m = matchMedia(q)
    const f = () => setC(m.matches)
    m.addEventListener?.('change', f)
    return () => m.removeEventListener?.('change', f)
  }, [])
  return c
}

// Where a full-screen view should grow from: the card that was pressed, in app coordinates.
// The element is kept too, so the view can shrink back into wherever that card is now.
export function originOf(el) {
  const app = document.querySelector('.app')?.getBoundingClientRect()
  const r = el?.getBoundingClientRect?.()
  if (!app || !r) return null
  return { top: r.top - app.top, left: r.left - app.left, right: app.right - r.right, bottom: app.bottom - r.bottom, el }
}

// the card's rect right now: the same element if it is still on screen, else today's main card
function liveRect(origin) {
  const app = document.querySelector('.app')?.getBoundingClientRect()
  if (!app || !origin) return null
  const el = origin.el?.isConnected ? origin.el : document.querySelector('[data-hero] .tile')
  const r = el?.getBoundingClientRect?.()
  if (!r || r.width < 40 || r.height < 40) return { left: origin.left, top: origin.top, w: app.width - origin.left - origin.right, h: app.height - origin.top - origin.bottom, W: app.width, H: app.height }
  return { left: r.left - app.left, top: r.top - app.top, w: r.width, h: r.height, W: app.width, H: app.height }
}

const mix = (a, b, p) => a + (b - a) * p
// A full-screen view that grows out of the card it came from and settles back into it on close.
// One progress value drives everything, and only transforms move: the frame stretches from the card
// to the screen while the content inside scales evenly with it, so the words are there from the first
// frame and nothing is ever an empty box. Closing can be interrupted and always aims at the card as it
// is now.
// Keep the screen on while a workout, routine or run is open; let it sleep again when it closes.
export function useWakeLock(on = true) {
  useEffect(() => {
    if (!on || !navigator.wakeLock) return
    let lock = null, alive = true
    const get = () => { if (document.visibilityState === 'visible') navigator.wakeLock.request('screen').then((l) => { if (alive) lock = l; else l.release() }).catch(() => {}) }
    const vis = () => { if (document.visibilityState === 'visible' && (!lock || lock.released)) get() }
    get()
    document.addEventListener('visibilitychange', vis)
    return () => { alive = false; document.removeEventListener('visibilitychange', vis); lock?.release?.().catch?.(() => {}) }
  }, [on])
}

export function Opener({ origin, tone, children }) {
  useWakeLock(true)
  const [isPresent, safeToRemove] = usePresence()
  const reduce = useReducedMotion()
  const rect = useRef(liveRect(origin))
  const p = useMotionValue(rect.current && !reduce ? 0 : 1)
  const fade = useMotionValue(reduce ? 0 : 1)
  const slide = useMotionValue(rect.current || reduce ? 0 : 1)
  useEffect(() => {
    if (rect.current && !reduce) animate(p, 1, { type: 'spring', bounce: 0, duration: dur(0.46) })
    else if (reduce) animate(fade, 1, { duration: 0.2 })
    else animate(slide, 0, { type: 'spring', bounce: 0, duration: dur(0.42) })
  }, [])
  const mounted = useRef(false)
  useEffect(() => {
    if (isPresent) {
      // brought back while closing: reverse from wherever it is
      if (mounted.current) { animate(p, 1, { type: 'spring', bounce: 0, duration: dur(0.4) }); animate(fade, 1, { duration: 0.2 }); animate(slide, 0, { type: 'spring', bounce: 0, duration: dur(0.4) }) }
      mounted.current = true
      return
    }
    if (reduce) { animate(fade, 0, { duration: 0.18 }).then(safeToRemove); return }
    const r = liveRect(origin)
    if (!r) { animate(slide, 1, { type: 'spring', bounce: 0, duration: dur(0.32) }).then(safeToRemove); return }
    rect.current = r
    animate(p, 0, { type: 'spring', bounce: 0, duration: dur(0.36) }).then(safeToRemove)
  }, [isPresent])
  const R = 28
  const sx = useTransform(p, (v) => { const r = rect.current; return r ? mix(r.w / r.W, 1, v) : 1 })
  const sy = useTransform(p, (v) => { const r = rect.current; return r ? mix(r.h / r.H, 1, v) : 1 })
  const x = useTransform(p, (v) => (rect.current ? mix(rect.current.left, 0, v) : 0))
  const y = useTransform([p, slide], ([v, s]) => (rect.current ? mix(rect.current.top, 0, v) : 0) + s * (rect.current?.H || 900))
  const radius = useTransform([p, sx, sy], ([v, a, b]) => { const r = mix(R, 0, Math.min(1, v * 1.15)); return `${r / a}px / ${r / b}px` })
  // the frame is a solid card at the start, so it can melt into the real card underneath
  const op = useTransform([p, fade], ([v, f]) => Math.min(1, v / 0.12) * f)
  const innerSy = useTransform([sx, sy], ([a, b]) => a / b)
  const innerOp = useTransform(p, (v) => Math.min(1, Math.max(0, (v - 0.04) / 0.3)))
  return (
    <motion.div className="screen" style={{ '--tone': tone, background: tone, transition: 'background-color 1.02s cubic-bezier(.2,.8,.2,1)', transformOrigin: '0 0', x, y, scaleX: sx, scaleY: sy, borderRadius: radius, opacity: op, overflow: 'hidden', pointerEvents: isPresent ? 'auto' : 'none' }}>
      <motion.div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', transformOrigin: '0 0', scaleY: innerSy, opacity: innerOp }}>
        {children}
      </motion.div>
    </motion.div>
  )
}

// A tab page: a centred title that stays put; content slips under it as you scroll.
export function Page({ title, children }) {
  return (
    <div className="scroll">
      <header className="bar"><h1 className="title center" style={{ fontSize: 28 }}>{title}</h1></header>
      <div style={{ paddingTop: 6 }}>{children}</div>
    </div>
  )
}

