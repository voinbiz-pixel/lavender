import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, getState } from '../lib/store.js'
import { ZONES, speedFor, speedUnit, cardioSession, sessionMinutes } from '../engine/plan.js'
import { todaysPlan } from '../engine/program.js'
import { finishCardio, setSpeed } from '../lib/actions.js'
import { Press, Icon, fmtClock, spring, springPop, Opener, useCompact, toast } from '../ui/kit.jsx'
import { haptic, sound } from '../lib/feedback.js'
import { TopBar, Fade, Stage, Head } from './Flow.jsx'

export const CARDIO_TONE = '#B9C6CC'
const LEVEL_H = { 1: 0.28, 2: 0.46, 3: 0.64, 4: 0.82, 5: 1 }

// The shape of a session: one bar per segment, as wide as it is long, as tall as it is hard.
export function SegmentBars({ segments, at = -1, height = 120, width = '100%' }) {
  const total = segments.reduce((t, s) => t + (s.secs || 600), 0)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, width, margin: '0 auto' }} aria-hidden>
      {segments.map((s, i) => (
        <motion.span key={i} className={i > at && at >= 0 ? 'well' : ''} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...springPop, delay: 0.015 * i }}
          style={{ flex: (s.secs || 600) / total, minWidth: 4, height: Math.round(height * (LEVEL_H[ZONES[s.zone]?.level] || 0.4)), borderRadius: 6, display: 'block', transformOrigin: '50% 100%',
            background: at < 0 || i <= at ? (i === at ? 'var(--ink)' : at < 0 ? 'var(--ink)' : 'var(--ink-3)') : undefined, opacity: at < 0 ? 0.25 + 0.75 * ((ZONES[s.zone]?.level || 2) / 5) : 1 }} />
      ))}
    </div>
  )
}

export default function Cardio({ desc, origin, onClose }) {
  const state = useStore()
  const plan = useMemo(() => { const tp = todaysPlan(getState()); return cardioSession(getState(), desc, tp.pw) }, [desc?.key])
  const [phase, setPhase] = useState('intro') // intro | run | feel | done
  const [result, setResult] = useState(null)
  const startedAt = useRef(null)
  const [log, setLog] = useState(null)
  const finish = (feel) => {
    const sess = finishCardio({ desc, plan, startedAt: startedAt.current, segments: log.segments, feel, test: log.test })
    setResult(sess); setPhase('done'); haptic('success'); sound.pr()
  }
  const mins = sessionMinutes(plan)
  return (
    <Opener origin={origin} tone={CARDIO_TONE}>
      {phase !== 'run' && <TopBar onClose={onClose} segments={<span />} />}
      <div style={{ flex: 1, position: 'relative' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {phase === 'intro' && (
            <Fade key="intro">
              <Stage head={<Head big title={plan.title} sub={`${plan.sub ? `${plan.sub} · ` : ''}about ${mins} min`} />}
                foot={<Press className="pill ink" onClick={() => { startedAt.current = new Date().toISOString(); setPhase('run') }}>Begin</Press>}>
                {plan.note && <p className="center" style={{ margin: '0 auto 18px', maxWidth: 290, font: '600 15px/1.35 var(--font)', textWrap: 'balance' }}>{plan.note}</p>}
                <SegmentBars segments={plan.segments} height={140} />
                <Zones state={state} segments={plan.segments} />
                {plan.test && <p className="small center" style={{ margin: '14px auto 0', maxWidth: 290, fontSize: 15 }}>{plan.test === 'mile' ? 'Your time is the score. Retest at the end of the plan to see how far you came.' : 'Your distance is the score. Retest at the end of the plan to see how far you came.'}</p>}
              </Stage>
            </Fade>
          )}
          {phase === 'run' && (
            <Fade key="run">
              <Treadmill plan={plan} onClose={onClose} onDone={(l) => { setLog(l); setPhase('feel') }}
                onQuit={(l) => {
                  // leaving early still counts: what you did is saved, marked unfinished, so the next session adapts
                  if (l.segments.reduce((t, x) => t + (x.done || 0), 0) >= 60) { finishCardio({ desc: plan.test ? null : desc, plan, startedAt: startedAt.current, segments: l.segments, feel: null, test: null, incomplete: true }); toast(plan.test ? 'Saved. The test stays on your plan' : 'Saved what you did') }
                  onClose()
                }} />
            </Fade>
          )}
          {phase === 'feel' && (
            <Fade key="feel">
              <Stage head={<Head title="How did that feel?" sub="The next sessions adjust to it" />}>
                <div className="stack" style={{ gap: 12 }}>
                  {[['easy', 'Easy', 'I could have gone faster'], ['good', 'Good', 'About right'], ['hard', 'Hard', 'Too much today']].map(([v, l, s], i) => (
                    <motion.div key={v} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springPop, delay: 0.05 * i }}>
                      <Press className="tile" onClick={() => finish(v)} style={{ width: '100%', height: 88, display: 'grid', placeContent: 'center', gap: 4, textAlign: 'center' }}>
                        <span style={{ font: '700 22px var(--display)', letterSpacing: '-0.03em' }}>{l}</span>
                        <span className="small">{s}</span>
                      </Press>
                    </motion.div>
                  ))}
                </div>
              </Stage>
            </Fade>
          )}
          {phase === 'done' && result && (
            <Fade key="done">
              <Stage foot={<Press className="pill ink" onClick={onClose}>Back to today</Press>}>
                <div className="center">
                  <h1 className="hero" style={{ fontSize: 64 }}>Done</h1>
                  <p className="body" style={{ marginTop: 14, maxWidth: 290, marginInline: 'auto', fontSize: 17 }}>{doneLine(state, result)}</p>
                  <p className="small" style={{ marginTop: 18, fontSize: 15 }}>{plan.title} · {result.minutes} min</p>
                </div>
              </Stage>
            </Fade>
          )}
        </AnimatePresence>
      </div>
    </Opener>
  )
}

function doneLine(state, sess) {
  const t = sess.test
  if (!t) return sess.feel === 'easy' ? 'Nice. Next time the speeds go up a little.' : sess.feel === 'hard' ? 'Good work. Next time eases off a touch.' : 'Right on plan.'
  const prev = state.sessions.filter((s) => s.type === 'cardio' && s.test?.kind === t.kind && s.id !== sess.id).sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))[0]
  const u = state.profile.units === 'kg' ? 'km' : 'mi'
  if (t.kind === 'cooper') {
    const line = `${t.value.toFixed(2)} ${u} in 12 minutes.`
    if (!prev) return `${line} That is your starting point.`
    const d = t.value - prev.test.value
    return `${line} ${d >= 0 ? `${d.toFixed(2)} ${u} further` : `${Math.abs(d).toFixed(2)} ${u} short of`} than your first test.`
  }
  const line = `One mile in ${fmtClock(t.value)}.`
  if (!prev) return `${line} That is your starting point.`
  const d = prev.test.value - t.value
  return `${line} ${d >= 0 ? `${fmtClock(d)} faster` : `${fmtClock(-d)} slower`} than your first test.`
}

export function Zones({ state, segments }) {
  const zones = [...new Set(segments.map((s) => s.zone))].filter((z) => z !== 'test')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${zones.length}, minmax(0, 1fr))`, gap: 8, marginTop: 22 }}>
      {zones.map((z) => (
        <div key={z} className="center">
          <div style={{ font: '700 20px var(--display)', letterSpacing: '-0.02em' }} className="num">{speedFor(state, z)}</div>
          <div className="small" style={{ marginTop: 2 }}>{speedUnit(state)}, {ZONES[z].label.toLowerCase()}</div>
        </div>
      ))}
    </div>
  )
}

// The treadmill runner: one segment at a time, a clock that runs down and moves on by itself
// (your hands are busy), the speed and incline to set, and what comes next.
export function Treadmill({ plan, onDone, onClose, onQuit, inline }) {
  const state = useStore()
  const compact = useCompact()
  const segs = plan.segments
  const [i, setI] = useState(0)
  const [left, setLeft] = useState(segs[0].secs)
  const [paused, setPaused] = useState(false)
  const end = useRef(Date.now() + segs[0].secs * 1000)
  const t0 = useRef(Date.now())
  const pausedAt = useRef(null)
  const done = useRef(segs.map((s) => ({ ...s, done: 0, speed: speedFor(getState(), s.zone) })))
  const [incl, setInclState] = useState(segs[0].incline)
  const inclRef = useRef(segs[0].incline)
  const setIncl = (v) => { const n = typeof v === 'function' ? v(inclRef.current) : v; inclRef.current = n; setInclState(n) }
  const [askDistance, setAskDistance] = useState(false)
  const s = segs[i]
  const open = !!s.open
  const unit = speedUnit(state)
  const speed = speedFor(state, s.zone)

  const advance = () => {
    const now = Date.now()
    const spent = Math.round((now - t0.current) / 1000)
    done.current[i].done = open ? spent : Math.min(s.secs, spent)
    done.current[i].speed = speedFor(getState(), s.zone)
    done.current[i].incline = inclRef.current
    if (s.zone === 'test' && plan.test === 'mile') done.current.testValue = spent
    if (s.zone === 'test' && plan.test === 'cooper') { setAskDistance(true); return }
    next()
  }
  const next = () => {
    if (i >= segs.length - 1) { finish(); return }
    const n = segs[i + 1]
    haptic('medium'); sound.rest()
    setI(i + 1); setIncl(n.incline); setLeft(n.secs)
    t0.current = Date.now(); end.current = Date.now() + n.secs * 1000; pausedAt.current = null; setPaused(false)
  }
  const snapshot = () => {
    const now = pausedAt.current || Date.now()
    const log = done.current.map(({ secs, zone, incline, done: d, speed: sp, label }, k) => ({ secs, zone, incline, done: k === i ? Math.round((now - t0.current) / 1000) : d, speed: sp, label }))
    return { segments: log, test: null }
  }
  const finish = () => {
    const test = plan.test === 'mile' ? { kind: 'mile', value: done.current.testValue } : plan.test === 'cooper' ? { kind: 'cooper', value: done.current.distance } : null
    onDone({ segments: done.current.map(({ secs, zone, incline, done: d, speed: sp, label }) => ({ secs, zone, incline, done: d, speed: sp, label })), test })
  }
  useEffect(() => {
    if (askDistance) return
    let raf
    const tick = () => {
      if (!pausedAt.current) {
        if (open) setLeft((Date.now() - t0.current) / 1000)
        else {
          const l = (end.current - Date.now()) / 1000
          setLeft(l)
          if (l <= 0) { advance(); return }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [i, askDistance])
  const togglePause = () => {
    if (pausedAt.current) { const d = Date.now() - pausedAt.current; end.current += d; t0.current += d; pausedAt.current = null; setPaused(false) }
    else { pausedAt.current = Date.now(); setPaused(true) }
  }

  if (askDistance) return <DistanceAsk state={state} guess={(speed * 12) / 60} onDone={(v) => { done.current.distance = v; setAskDistance(false); next() }} />

  const nx = segs[i + 1]
  const z = ZONES[s.zone]
  const stepV = unit === 'mph' ? 0.1 : 0.2
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {!inline && (
        <TopBar onClose={() => (onQuit ? onQuit(snapshot()) : onClose?.())} segments={<div style={{ width: '100%', maxWidth: 220 }}><SegmentBars segments={segs} at={i} height={18} /></div>} />
      )}
      <div style={{ flex: 1, position: 'relative' }}>
      <Stage head={<Head title={s.label || z.label} sub={z.feel} />} row
        foot={<><Press className="pill soft" onClick={togglePause}>{paused ? 'Resume' : 'Pause'}</Press><Press className="pill ink" onClick={advance}>{open ? 'Finished' : i === segs.length - 1 ? 'Finish' : 'Next'}</Press></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Readout label={unit} value={speed.toFixed(1)} onMinus={() => setSpeed(s.zone, Math.max(1, speed - stepV))} onPlus={() => setSpeed(s.zone, speed + stepV)} />
          <Readout label="% incline" value={`${incl}`} onMinus={() => setIncl((v) => Math.max(0, v - 1))} onPlus={() => setIncl((v) => Math.min(15, v + 1))} />
        </div>
        <div className="big center num" role="timer" aria-live="off" style={{ marginTop: compact ? 20 : 34, fontSize: compact ? 64 : 84, opacity: paused ? 0.4 : 1, transition: 'opacity 0.42s' }}>{fmtClock(left)}</div>
        <p className="small center" style={{ marginTop: 6, fontSize: 15 }}>{open ? 'Tap Finished at the end of the mile' : nx ? `Next: ${(nx.label || ZONES[nx.zone].label)}, ${Math.round(nx.secs / 60)} min` : 'Last one'}</p>
      </Stage>
      </div>
    </div>
  )
}

// a big number with a minus and a plus beneath it, mirrored
function Readout({ label, value, onMinus, onPlus }) {
  return (
    <div className="tile center" style={{ padding: '18px 10px 14px' }}>
      <div className="big num" style={{ fontSize: 40 }}>{value}</div>
      <div className="small" style={{ marginTop: 2 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '44px 44px', gap: 14, justifyContent: 'center', marginTop: 12 }}>
        <Press className="circle" onClick={onMinus} aria-label={`Lower ${label}`}><Icon name="minus" size={18} stroke={2.4} /></Press>
        <Press className="circle" onClick={onPlus} aria-label={`Raise ${label}`}><Icon name="plus" size={18} stroke={2.4} /></Press>
      </div>
    </div>
  )
}

function DistanceAsk({ state, guess, onDone }) {
  const u = state.profile.units === 'kg' ? 'km' : 'mi'
  const [v, setV] = useState(Math.round(guess * 100) / 100)
  const step = 0.05
  return (
    <Stage head={<Head title="How far did you go?" sub="Read it off the treadmill" />} foot={<Press className="pill ink" onClick={() => onDone(v)}>Save</Press>}>
      <div style={{ display: 'grid', gridTemplateColumns: '44px auto 44px', gap: 18, alignItems: 'center', justifyContent: 'center' }}>
        <Press className="circle" onClick={() => setV((x) => Math.max(0, Math.round((x - step) * 100) / 100))} aria-label="Less"><Icon name="minus" size={18} stroke={2.4} /></Press>
        <div className="center"><div className="big num" style={{ fontSize: 64 }}>{v.toFixed(2)}</div><div className="small">{u}</div></div>
        <Press className="circle" onClick={() => setV((x) => Math.round((x + step) * 100) / 100)} aria-label="More"><Icon name="plus" size={18} stroke={2.4} /></Press>
      </div>
    </Stage>
  )
}
