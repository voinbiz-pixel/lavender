import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { flowByKey, flowMinutes, stepSecs } from '../engine/routines.js'
import { markFlow } from '../lib/store.js'
import { addWater, glassMl } from '../lib/actions.js'
import { Press, Icon, Figure, fmtClock, spring, Opener, useCompact } from '../ui/kit.jsx'
import { haptic, sound } from '../lib/feedback.js'

export const FLOW_TONE = { morning: '#CFC6B4', rest: '#B4B5C8' }

// A full-screen guided routine: one step at a time, the figure looping, a clock that runs down.
export default function Flow({ flowKey, origin, onClose }) {
  const flow = flowByKey(flowKey)
  const morning = flowKey === 'morning'
  const [i, setI] = useState(0)
  const [started, setStarted] = useState(false)
  const done = i >= flow.steps.length
  const compact = useCompact()
  useEffect(() => {
    if (done) { markFlow(morning ? 'morning' : 'stretch', morning ? true : flowKey); haptic('success'); sound.set() }
  }, [done])
  return (
    <Opener origin={origin} tone={morning ? FLOW_TONE.morning : FLOW_TONE.rest}>
      <TopBar onClose={onClose} steps={flow.steps.length} at={done ? flow.steps.length : started ? i : 0} />
      <div style={{ flex: 1, position: 'relative' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {!started ? (
            <Fade key="intro">
              <Stage
                head={<Head title={morning ? 'Morning routine' : flow.name} sub={`${morning ? 'Before work · ' : ''}${flowMinutes(flow.steps)} min · ${flow.steps.length} steps`} big />}
                foot={<Press className="pill ink" onClick={() => setStarted(true)}>Begin</Press>}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 6 }} aria-hidden>
                  {flow.steps.map((s, k) => (
                    <motion.span key={k} className="well" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...spring, delay: 0.04 * k }}
                      style={{ flex: 1, maxWidth: 44, height: Math.round((compact ? 40 : 60) + Math.min(120, stepSecs(s)) * (compact ? 1.1 : 1.6)), borderRadius: 22, display: 'block', transformOrigin: '50% 100%' }} />
                  ))}
                </div>
              </Stage>
            </Fade>
          ) : done ? (
            <Fade key="done">
              <Stage foot={<Press className="pill ink" onClick={onClose}>Back to today</Press>}>
                <div className="center">
                  <h1 className="hero" style={{ fontSize: 64 }}>Done</h1>
                  <p className="body" style={{ marginTop: 14, maxWidth: 280, marginInline: 'auto' }}>{morning ? 'A good start. Have a great day at work.' : 'Nicely done. Drink some water and take it easy.'}</p>
                </div>
              </Stage>
            </Fade>
          ) : (
            <Fade key={`s${i}`}>
              <TimedStep step={flow.steps[i]} first={i === 0} last={i === flow.steps.length - 1} onDone={() => setI((x) => x + 1)} />
            </Fade>
          )}
        </AnimatePresence>
      </div>
    </Opener>
  )
}

// Close on the left, progress in the middle, an optional action on the right: always balanced.
export function TopBar({ onClose, steps, at, right, closeLabel = 'Close', segments }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center', gap: 12, padding: 'calc(var(--safe-t) + 12px) 20px 0' }}>
      <Press className="circle" onClick={onClose} aria-label={closeLabel}><Icon name="close" size={16} stroke={2.4} /></Press>
      <div className="row" style={{ gap: 4, justifyContent: 'center' }} aria-hidden>
        {segments || Array.from({ length: steps }, (_, k) => (
          <span key={k} style={{ flex: 1, maxWidth: 34, height: 5, borderRadius: 3, background: k < at ? 'var(--ink)' : 'var(--ink-4)', transition: 'background-color 0.5s' }} />
        ))}
      </div>
      {right || <span />}
    </div>
  )
}

export const Fade = ({ children }) => (
  <motion.div style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={spring}>{children}</motion.div>
)

// Every step screen has the same frame: a heading, the body centred in the space left, controls at the bottom.
// row: buttons side by side (true for two, or a number); scroll: a body that may be taller than the screen
export function Stage({ head, children, foot, row, scroll }) {
  const cols = row === true ? 2 : row || 0
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {head && <div style={{ padding: '22px 20px 0' }}>{head}</div>}
      {scroll
        ? <div className="scroll-y" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '0 20px' }}><div style={{ margin: 'auto 0', padding: '12px 0' }}>{children}</div></div>
        : <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px' }}>{children}</div>}
      {foot && <div style={{ padding: '12px 20px calc(var(--safe-b) + 24px)', display: cols ? 'grid' : 'block', gridTemplateColumns: cols ? `repeat(${cols}, minmax(0, 1fr))` : undefined, gap: 10 }}>{foot}</div>}
    </div>
  )
}

export function Head({ title, sub, big, kicker }) {
  return (
    <div className="center">
      {kicker && <div className="kicker" style={{ marginBottom: 4 }}>{kicker}</div>}
      <h1 className={big ? 'hero' : 'title'}>{title}</h1>
      {sub && <div className="small" style={{ marginTop: 8, fontSize: 15 }}>{sub}</div>}
    </div>
  )
}

// One timed step: a move, a glass of water, or a minute of breathing.
// The clock waits for you: the move loops so you can learn it, and the countdown starts when you tap Start.
export function TimedStep({ step, onDone, first, last }) {
  const total = stepSecs(step)
  const compact = useCompact()
  const [left, setLeft] = useState(total)
  const [paused, setPaused] = useState(false)
  const [running, setRunning] = useState(false)
  const end = useRef(0)
  const pausedAt = useRef(null)
  const switched = useRef(false)
  const start = () => { end.current = Date.now() + total * 1000; setRunning(true); haptic('medium') }
  useEffect(() => {
    if (step.type === 'water' || !running) return
    let raf
    const tick = () => {
      if (!pausedAt.current) {
        const l = (end.current - Date.now()) / 1000
        setLeft(l)
        if (step.sides && !switched.current && l <= total / 2) { switched.current = true; haptic('medium'); sound.tick() }
        if (l <= 0) { haptic('success'); sound.rest(); onDone(); return }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])
  const togglePause = () => {
    if (pausedAt.current) { end.current += Date.now() - pausedAt.current; pausedAt.current = null; setPaused(false) }
    else { pausedAt.current = Date.now(); setPaused(true) }
  }

  if (step.type === 'water') {
    return (
      <Stage head={<Head title="A glass of water" sub={first ? 'Before anything else' : 'Drink up'} />} row
        foot={<><Press className="pill soft" onClick={onDone}>Skip</Press><Press className="pill ink" onClick={() => { addWater(glassMl()); haptic('success'); onDone() }}>Drank it</Press></>}>
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.26, duration: 1 }}
            style={{ width: compact ? 128 : 160, height: compact ? 128 : 160, borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'grid', placeItems: 'center' }}>
            <Icon name="drop" size={compact ? 46 : 58} stroke={1.6} />
          </motion.span>
        </div>
      </Stage>
    )
  }

  const breathe = step.type === 'breathe'
  const t = running ? total - left : 2
  const phase = (t % 8) / 8 // 4 s in, 4 s out
  const inhale = phase < 0.5
  const k = inhale ? phase * 2 : 1 - (phase - 0.5) * 2
  const ease = 0.5 - Math.cos(Math.PI * k) / 2
  const side = step.sides ? (!running ? 'Both sides, switch halfway' : left > total / 2 ? 'First side' : 'Second side, switch over') : null
  const size = compact ? 210 : 280
  return (
    <Stage head={<Head title={breathe ? 'Breathe' : step.name} sub={breathe ? 'Four seconds in, four seconds out' : side || (!running ? 'Watch the move, then start' : last ? 'Last one' : ' ')} />} row
      foot={running
        ? <><Press className="pill soft" onClick={togglePause}>{paused ? 'Resume' : 'Pause'}</Press><Press className="pill ink" onClick={onDone}>{last ? 'Finish' : 'Next'}</Press></>
        : <><Press className="pill soft" onClick={onDone}>Skip</Press><Press className="pill ink" onClick={start}>Start</Press></>}>
      <div style={{ display: 'grid', placeItems: 'center' }}>
        {breathe ? (
          <div style={{ position: 'relative', width: size * 0.82, height: size * 0.82, display: 'grid', placeItems: 'center' }}>
            <span className="well deep" style={{ position: 'absolute', inset: 0, borderRadius: '50%' }} />
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--ink)', transform: `scale(${0.42 + 0.58 * ease})`, display: 'block' }} />
            <span style={{ position: 'relative', color: 'var(--paper)', font: '600 17px var(--font)', opacity: ease > 0.3 ? 1 : 0, transition: 'opacity 0.5s' }}>{inhale ? 'In' : 'Out'}</span>
          </div>
        ) : <Figure id={step.id} size={size} playing={!paused} />}
      </div>
      {!breathe && <p className="small center" style={{ margin: '10px auto 0', maxWidth: 300, fontSize: 15 }}>{step.cue}</p>}
      <div className="big center" role="timer" aria-live="off" style={{ marginTop: compact ? 14 : 22, fontSize: compact ? 44 : 52, opacity: paused || !running ? 0.4 : 1, transition: 'opacity 0.42s' }}>{fmtClock(left)}</div>
    </Stage>
  )
}
