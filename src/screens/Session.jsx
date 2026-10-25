import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, getState, updateSession } from '../lib/store.js'
import { position, swapOptions, suggest, sessionSlots, todaysPlan } from '../engine/program.js'
import { cardioSession, sessionMinutes } from '../engine/plan.js'
import { Treadmill } from './Cardio.jsx'
import { BY_ID } from '../engine/exercises.js'
import { stepsFor, BAND_LEVELS, roundTo, nextUp, nextDown } from '../engine/loads.js'
import { activeSession, startSession, finishSession, discardSession, swapExercise, titleOf, finishCardio } from '../lib/actions.js'
import { restTimerRemote } from '../lib/cloud.js'
import { Press, Icon, Figure, HoldPill, Menu, Sheet, fmtClock, springPop, Opener, useCompact } from '../ui/kit.jsx'
import { haptic, sound, localNotify } from '../lib/feedback.js'
import { TopBar, TimedStep, Fade, Stage, Head } from './Flow.jsx'
import { partMinutes } from './Today.jsx'

const PARTS = ['Warm-up', 'Strength', 'Accessory', 'Cool-down']
const TONE = { train: '#B7C8B3', done: '#C6B4BE' }

function buildSteps(sess) {
  const out = []
  ;(sess.warm || []).forEach((w, i) => out.push({ kind: 'timed', part: 0, key: `w${i}`, step: w }))
  sess.entries.forEach((e) => e.sets.forEach((x) => out.push({ kind: 'set', part: e.isMain ? 1 : 2, entryId: e.id, setId: x.id })))
  if (sess.finisherPlan) out.push({ kind: 'tread', part: 3, key: 'fin' })
  ;(sess.cool || []).forEach((c, i) => out.push({ kind: 'timed', part: 3, key: `c${i}`, step: c }))
  return out
}
const isDone = (sess, st) => (st.kind === 'timed' ? (sess.timedDone || []).includes(st.key) : st.kind === 'tread' ? !!sess.finisherDone : sess.entries.find((e) => e.id === st.entryId)?.sets.find((x) => x.id === st.setId)?.done)

export default function Session({ origin, onClose }) {
  const state = useStore()
  const sess = activeSession(state)
  const [summary, setSummary] = useState(null)
  const [short, setShort] = useState(false)
  const [menu, setMenu] = useState(null)
  const [swap, setSwap] = useState(false)
  const steps = sess ? buildSteps(sess) : []
  const idx = sess ? steps.findIndex((st) => !isDone(sess, st)) : -1
  const cur = idx >= 0 ? steps[idx] : null

  // everything done: finish
  useEffect(() => {
    if (sess && idx === -1 && !sess.feelFor) {
      const fin = finishSession(sess.id)
      if (fin) { setSummary(fin); haptic('success'); sound.pr() } else onClose()
    }
  }, [sess?.id, idx, sess?.feelFor])

  const parts = sess ? [0, 1, 2, 3].map((p) => { const s = steps.filter((x) => x.part === p); return s.length ? s.filter((x) => isDone(sess, x)).length / s.length : 1 }) : [0, 0, 0, 0]
  const entry = cur?.kind === 'set' ? sess.entries.find((e) => e.id === cur.entryId) : null
  const resting = sess?.restUntil && new Date(sess.restUntil).getTime() > Date.now()

  let view
  if (summary) view = <Summary key="sum" sess={summary} onClose={onClose} />
  else if (!sess) view = <Overview key="ov" state={state} short={short} setShort={setShort} onBegin={() => { startSession({ short }); haptic('success') }} />
  else if (sess.feelFor) view = <Feel key={`feel-${sess.feelFor}`} sess={sess} />
  else if (resting) view = <Rest key={`rest-${sess.restUntil}`} sess={sess} next={cur} />
  else if (cur?.kind === 'tread') view = <Treadmill key="fin" inline plan={sess.finisherPlan} onDone={(l) => {
    if (l.test) finishCardio({ desc: null, plan: sess.finisherPlan, startedAt: new Date().toISOString(), segments: l.segments, feel: null, test: l.test, partOf: sess.id })
    updateSession(sess.id, (x) => ({ ...x, finisherDone: true, finisherLog: l }))
  }} />
  else if (cur?.kind === 'timed') view = <TimedStep key={cur.key} step={cur.step} first={cur.key === 'w0'} onDone={() => updateSession(sess.id, (x) => ({ ...x, timedDone: [...(x.timedDone || []), cur.key] }))} />
  else if (cur?.kind === 'set') view = <SetStep key={cur.setId} sess={sess} entry={entry} setId={cur.setId} part={cur.part} steps={steps} idx={idx} />

  const segments = [2, 6, 4, 2].map((f, i) => (
    <span key={i} style={{ flex: f, maxWidth: [30, 90, 60, 30][i], height: 6, borderRadius: 3, background: 'var(--ink-4)', overflow: 'hidden', display: 'block' }}>
      <span style={{ display: 'block', height: 6, width: `${Math.round(parts[i] * 100)}%`, background: 'var(--ink)', borderRadius: 3, transition: 'width 0.84s cubic-bezier(.2,.8,.2,1)' }} />
    </span>
  ))

  return (
    <Opener origin={origin} tone={summary ? TONE.done : TONE.train}>
      <div style={{ opacity: summary ? 0 : 1, transition: 'opacity 0.5s', pointerEvents: summary ? 'none' : 'auto' }}>
        <TopBar onClose={(e) => (sess ? setMenu(e.currentTarget.getBoundingClientRect()) : onClose())} closeLabel={sess ? 'End or leave the workout' : 'Close'}
          segments={sess ? segments : <span />}
          right={entry && !resting && !sess.feelFor ? <Press className="circle" aria-label="Swap this exercise" onClick={() => setSwap(true)}><Icon name="swap" size={18} /></Press> : null} />
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <AnimatePresence mode="popLayout" initial={false}><Fade key={view?.key || 'x'}>{view}</Fade></AnimatePresence>
      </div>
      <Menu anchor={menu} onClose={() => setMenu(null)} items={[
        { label: 'Leave for now', onSelect: onClose },
        { label: 'Finish here', onSelect: () => { const fin = finishSession(sess.id); if (fin) setSummary(fin); else onClose() } },
        { label: 'Discard workout', onSelect: () => { discardSession(sess.id); onClose() } },
      ]} />
      {entry && <SwapSheet open={swap} onClose={() => setSwap(false)} sess={sess} entry={entry} />}
    </Opener>
  )
}

// ---------- before starting: where you are in the plan, and exactly what today asks ----------
const PHASE = (week, weeks) => (week >= weeks ? 'Easy week' : week === 1 ? 'Settle in' : week === weeks - 1 ? 'Push' : 'Build')

// "30 lb × 10", "12 reps", "Medium band × 15", "40 s"
export function targetLabel(ex, weight, reps, units) {
  if (ex.unit === 'sec') return `${reps} s`
  if (ex.load === 'bw') return `${reps} reps`
  if (ex.load === 'band') return `${BAND_LEVELS[weight ?? 2]} band × ${reps}`
  return `${+weight} ${units} × ${reps}`
}

// Every week of the plan as a bar: builds climb, the push week is tallest, easy and test weeks are short.
export function WeekBars({ week, types, height = 48 }) {
  let ramp = 0
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: types.length > 8 ? 5 : 8, height, marginTop: 8 }} aria-hidden>
      {types.map((t, i) => {
        ramp = t === 'build' ? ramp + 1 : 0
        const h = t === 'build' ? 0.4 + 0.12 * Math.min(3, ramp) : { push: 1, easy: 0.3, test: 0.42 }[t]
        const w = i + 1
        return <motion.span key={i} className={w > week ? 'well' : ''} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...springPop, delay: 0.03 * i }}
          style={{ width: types.length > 8 ? 20 : 26, height: Math.round(height * h), borderRadius: 7, display: 'block', transformOrigin: '50% 100%', background: w === week ? 'var(--ink)' : w < week ? 'var(--ink-3)' : undefined }} />
      })}
    </div>
  )
}

function Overview({ state, short, setShort, onBegin }) {
  const pos = position(state)
  const day = pos.day
  const weeks = pos.weeks || state.program.weeks
  const units = state.profile.units
  const tp = todaysPlan(state)
  const desc = tp?.next?.kind === 'lift' ? tp.next : null
  const moves = sessionSlots(state, pos.dayIdx, { short, desc }).map((slot) => ({ slot, ex: BY_ID[slot.exerciseId], sg: suggest(state, slot, pos.week, pos.isDeload) }))
  const fin = desc?.finisher ? cardioSession(state, desc, tp.pw, { finisher: true }) : null
  const H = [0.5, 0.66, 0.82, 1, 0.38]
  return (
    <Stage scroll
      head={<Head big kicker={day.name} title={titleOf(day.focus)} sub={`Week ${pos.week} of ${weeks} · ${pos.pw ? pos.pw.label : PHASE(pos.week, weeks)}${short ? ' · short version' : ''}`} />}
      foot={<HoldPill label="Hold to begin" onComplete={onBegin} />}>
      {/* the block: weeks that build, then an easy one */}
      <WeekBars week={pos.week} types={pos.pw?.types || Array.from({ length: weeks }, (_, i) => (i === weeks - 1 ? 'easy' : 'build'))} />
      <div className="list" style={{ marginTop: 20 }}>
        {moves.map(({ slot, ex, sg }, i) => (
          <motion.div key={slot.id} className="li" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springPop, delay: 0.1 + 0.03 * i }}>
            <span className="t">{ex.name}</span>
            <span className="s num"><b>{sg.sets} sets · {targetLabel(ex, sg.weight, sg.reps[0], units)}</b></span>
            <span className="s">{sg.why}</span>
          </motion.div>
        ))}
        {fin && (
          <div className="li">
            <span className="t">{fin.title}</span>
            <span className="s num"><b>{sessionMinutes(fin)} min on the treadmill</b></span>
            <span className="s">{fin.test ? 'Your fitness test, after lifting' : 'Easy and steady, after lifting'}</span>
          </div>
        )}
      </div>
      <div className="center" style={{ marginTop: 18, marginBottom: 8 }}>
        <Press className={`chip ${short ? 'on' : ''}`} onClick={() => setShort(!short)} aria-pressed={short}>Short on time</Press>
      </div>
    </Stage>
  )
}

// ---------- one set ----------
function SetStep({ sess, entry, setId, part, steps, idx }) {
  const state = getState()
  const compact = useCompact()
  const ex = BY_ID[entry.exerciseId]
  const set = entry.sets.find((x) => x.id === setId)
  const units = state.profile.units
  const options = stepsFor(ex, state.profile.equipment)
  const loaded = ['db', 'bb', 'kb', 'band'].includes(ex.load) && options.length > 0
  const startW = set.weight ?? (ex.load === 'band' ? 2 : options[Math.max(0, Math.floor(options.length / 4))])
  const [wi, setWi] = useState(() => { const i = options.findIndex((o) => o >= (startW ?? 0) - 1e-6); return i < 0 ? Math.max(0, options.length - 1) : i })
  const [reps, setReps] = useState(set.target ?? 8)
  const sec = ex.unit === 'sec'
  const work = entry.sets.filter((x) => x.kind === 'work')
  const warm = set.kind === 'warmup'
  const k = work.findIndex((x) => x.id === setId)

  // the first set of a lift you have never done: you just say how the weight felt, and the plan corrects itself
  const calibrating = entry.kind === 'calibrate' && !warm && k === 0 && loaded
  const done = (feel) => {
    const weight = loaded ? options[wi] : 0
    const last = !warm && k === work.length - 1
    const next = steps.slice(idx + 1).find((st) => !isDone(sess, st) && !(st.kind === 'set' && st.setId === setId))
    const restSecs = next?.kind === 'set' ? (warm ? 45 : last ? 60 : entry.rest || 90) : 0
    // the rest of this exercise uses what you just did, or on a first-time set, the corrected weight
    let carry = loaded && weight !== set.weight ? weight : null
    if (feel === 'light') { const t = roundTo(ex, weight * 1.15, state.profile.equipment); carry = t > weight ? t : nextUp(ex, weight, state.profile.equipment) }
    if (feel === 'heavy') { const t = roundTo(ex, weight * 0.87, state.profile.equipment); carry = t < weight ? t : nextDown(ex, weight, state.profile.equipment) }
    // Mid-exercise correction: the next sets adapt to the set you just logged.
    // Below the bottom of the range: lighter. Short of the target: aim for what you managed. Way past it: heavier.
    const lo = entry.rep?.[0] ?? 1
    const tgt = set.target ?? reps
    let nextTarget = null, adjKind = null, adj = null
    if (!warm && !feel) {
      const eq = state.profile.equipment
      if (loaded && reps < lo) {
        const t = roundTo(ex, weight * 0.9, eq); const d = t < weight ? t : nextDown(ex, weight, eq)
        if (d < weight) { carry = d; adjKind = 'down'; adj = `That was heavy. Next sets drop to ${d} ${units}` }
        else { nextTarget = Math.max(1, reps); adjKind = 'reps'; adj = `Lightest you own, so aim for ${nextTarget}` }
      } else if (reps < tgt) {
        nextTarget = Math.max(ex.load === 'bw' ? 1 : lo, reps); adjKind = 'reps'; adj = `Next sets: aim for ${nextTarget}${sec ? ' s' : ''}`
      } else if (loaded && ex.unit !== 'sec' && reps >= tgt + 3) {
        const u = nextUp(ex, weight, eq)
        if (u > weight) { carry = u; adjKind = 'up'; adj = `That looked easy. Next sets go up to ${u} ${units}` }
      }
    }
    haptic('success'); sound.set()
    updateSession(sess.id, (x) => ({
      ...x,
      entries: x.entries.map((e) => e.id !== entry.id ? e : {
        ...e,
        calib: feel || e.calib,
        adjKind: adjKind || (feel ? null : e.adjKind),
        sets: e.sets.map((y) => (y.id === setId ? { ...y, done: true, reps, weight, at: new Date().toISOString() }
          : !y.done && y.kind === set.kind && (carry != null || nextTarget != null) ? { ...y, weight: carry ?? y.weight, target: nextTarget ?? y.target } : y)),
      }),
      feelFor: last ? entry.id : x.feelFor,
      restUntil: restSecs ? new Date(Date.now() + restSecs * 1000).toISOString() : null,
      restTotal: restSecs,
      restNote: feel === 'light' && carry !== weight ? `Next sets go up to ${carry} ${units}` : feel === 'heavy' && carry !== weight ? `Next sets drop to ${carry} ${units}` : last ? null : adj,
    }))
    if (restSecs) restTimerRemote.start(`${sess.id}:${setId}`, restSecs, 'Rest is up', 'Next set when you are ready.')
  }

  const wLabel = ex.load === 'band' ? BAND_LEVELS[options[wi]] : `${options[wi]}`
  const partName = entry.core ? 'Core' : PARTS[part]
  const sub = warm ? `${partName} · warm-up set` : `${partName} · set ${k + 1} of ${work.length}`
  const changed = (loaded && options[wi] !== set.weight) || reps !== (set.target ?? 8)
  const why = warm ? 'Light, to get the joints ready'
    : calibrating ? 'First time: how does this weight feel?'
    : changed ? 'Logging what you did instead'
    : k === 0 ? entry.why
    : entry.adjKind === 'down' ? 'Lighter, after your last set'
    : entry.adjKind === 'up' ? 'Heavier, after your last set'
    : entry.adjKind === 'reps' ? 'Matched to your last set'
    : entry.calib === 'light' ? 'Heavier, after your first set'
    : entry.calib === 'heavy' ? 'Lighter, after your first set'
    : 'Same as the last set'
  const firstSet = idx === steps.findIndex((st) => st.kind === 'set')
  return (
    <Stage head={<Head title={ex.name} sub={sub} />} row={calibrating ? 3 : 0}
      foot={calibrating
        ? <><Press className="pill soft" style={{ fontSize: 15 }} onClick={() => done('light')}>Too light</Press><Press className="pill ink" style={{ fontSize: 15 }} onClick={() => done('right')}>Just right</Press><Press className="pill soft" style={{ fontSize: 15 }} onClick={() => done('heavy')}>Too heavy</Press></>
        : <Press className="pill ink" onClick={() => done()}>Done</Press>}>
      <div style={{ display: 'grid', placeItems: 'center' }}><Figure id={ex.id} size={compact ? 200 : 260} /></div>
      <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: compact ? 2 : 8 }}>
        {loaded && (
          <>
            <Dial value={wLabel} unit={ex.load === 'band' ? '' : units} label="Weight" small={ex.load === 'band'} onStep={(d) => setWi((v) => Math.max(0, Math.min(options.length - 1, v + d)))} />
            <span aria-hidden style={{ font: '400 24px var(--font)', color: 'var(--ink-3)' }}>×</span>
          </>
        )}
        <Dial value={`${reps}`} unit={sec ? 's' : ''} label={sec ? 'Seconds' : 'Reps'} onStep={(d) => setReps((v) => Math.max(0, Math.min(120, v + d * (sec ? 5 : 1))))} />
      </div>
      {why && <p className="center" style={{ margin: '6px auto 0', maxWidth: 300, font: '600 15px/1.35 var(--font)', textWrap: 'balance' }}>{why}</p>}
      <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 12 }} aria-hidden>
        {work.map((x, i) => (
          <motion.span key={x.id} animate={{ scale: x.done ? [1.4, 1] : 1 }} transition={springPop}
            style={{ width: 10, height: 10, borderRadius: 5, display: 'block', background: x.done ? 'var(--ink)' : 'var(--ink-4)', boxShadow: !warm && i === k ? 'inset 0 0 0 2px var(--ink)' : 'none' }} />
        ))}
      </div>
      {firstSet && !calibrating && <p className="small center" style={{ margin: '10px auto 0', maxWidth: 280 }}>Did something different? Drag a number.</p>}
    </Stage>
  )
}

// A number you drag up or down (or step with the arrow keys). No keyboard needed.
// The finger owns the number 1:1: one step per 22px, a tick on each step.
function Dial({ value, unit, label, onStep, small }) {
  const g = useRef(null)
  const [active, setActive] = useState(false)
  const stop = () => { g.current = null; setActive(false) }
  return (
    <button aria-label={`${label}: ${value}${unit ? ` ${unit}` : ''}. Drag up or down, or use the arrow keys, to change it.`}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); g.current = { y: e.clientY }; setActive(true); haptic('light') }}
      onPointerMove={(e) => {
        if (!g.current) return
        const steps = Math.trunc((g.current.y - e.clientY) / 22)
        if (steps !== 0) { onStep(steps); haptic('light'); sound.tick(); g.current.y -= steps * 22 }
      }}
      onPointerUp={stop} onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); onStep(1) } if (e.key === 'ArrowDown') { e.preventDefault(); onStep(-1) } }}
      style={{ touchAction: 'none', cursor: 'ns-resize', minWidth: 96, height: 96, padding: '0 14px', borderRadius: 28, background: 'var(--tone)', boxShadow: active ? 'var(--down)' : 'var(--z), var(--z), inset 0 0 0 transparent, inset 0 0 0 transparent', transition: 'box-shadow 0.38s cubic-bezier(.2,.8,.2,1)', display: 'grid', justifyItems: 'center', alignContent: 'center', gap: 4 }}>
      <Icon name="chevD" size={14} stroke={2.4} style={{ transform: 'rotate(180deg)', opacity: active ? 0.7 : 0.22, transition: 'opacity 0.34s' }} />
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span className="big" style={{ fontSize: small ? 26 : 46 }}>{value}</span>
        {unit && <span style={{ font: '500 16px var(--font)', color: 'var(--ink-2)' }}>{unit}</span>}
      </span>
      <Icon name="chevD" size={14} stroke={2.4} style={{ opacity: active ? 0.7 : 0.22, transition: 'opacity 0.34s' }} />
    </button>
  )
}

// ---------- after the last set of an exercise ----------
function Feel({ sess }) {
  const entry = sess.entries.find((e) => e.id === sess.feelFor)
  const ex = BY_ID[entry?.exerciseId]
  const pick = (v) => {
    haptic('light')
    const rir = { easy: 3, good: 2, hard: 0 }[v]
    updateSession(sess.id, (x) => ({ ...x, feelFor: null, entries: x.entries.map((e) => (e.id === entry.id ? { ...e, feel: v, sets: e.sets.map((y) => (y.kind === 'work' && y.done ? { ...y, rir } : y)) } : e)) }))
  }
  return (
    <Stage head={<Head title="How did that feel?" sub={ex?.name} />}>
      <div className="stack" style={{ gap: 10 }}>
        {[['easy', 'Easy', 'I had a lot left'], ['good', 'Good', 'Hard, but clean reps'], ['hard', 'Hard', 'The last reps were a fight']].map(([v, l, s], i) => (
          <motion.div key={v} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springPop, delay: 0.05 * i }}>
            <Press className="tile" onClick={() => pick(v)} style={{ width: '100%', height: 88, display: 'grid', placeContent: 'center', gap: 4, textAlign: 'center' }}>
              <span style={{ font: '700 22px var(--display)', letterSpacing: '-0.03em' }}>{l}</span>
              <span className="small">{s}</span>
            </Press>
          </motion.div>
        ))}
      </div>
    </Stage>
  )
}

// ---------- rest: a capsule that drains ----------
function Rest({ sess, next }) {
  const compact = useCompact()
  const total = sess.restTotal || 90
  const [left, setLeft] = useState((new Date(sess.restUntil).getTime() - Date.now()) / 1000)
  useEffect(() => {
    let raf
    const tick = () => {
      const l = (new Date(getState().sessions.find((x) => x.id === sess.id)?.restUntil || 0).getTime() - Date.now()) / 1000
      setLeft(l)
      if (l <= 0) {
        haptic('success'); sound.rest()
        if (document.visibilityState !== 'visible') localNotify('Rest is up', 'Next set when you are ready.', 'rest')
        updateSession(sess.id, (x) => ({ ...x, restUntil: null }))
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const e = next?.kind === 'set' ? sess.entries.find((x) => x.id === next.entryId) : null
  const s = e?.sets.find((x) => x.id === next.setId)
  const ex = e && BY_ID[e.exerciseId]
  const frac = Math.max(0, Math.min(1, left / total))
  const H = compact ? 230 : 320
  const end = () => { restTimerRemote.cancel(`${sess.id}:${next?.setId}`); updateSession(sess.id, (x) => ({ ...x, restUntil: null })) }
  return (
    <Stage head={<Head title="Rest" sub={sess.restNote || (ex ? `Next: ${ex.name}, ${targetLabel(ex, s?.weight, s?.target ?? '', getState().profile.units)}` : 'Next up soon')} />} row
      foot={<>
        <Press className="pill soft" onClick={() => updateSession(sess.id, (x) => ({ ...x, restUntil: new Date(new Date(x.restUntil).getTime() + 15000).toISOString(), restTotal: (x.restTotal || 90) + 15 }))}>+15 s</Press>
        <Press className="pill ink" onClick={end}>Skip</Press>
      </>}>
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <span className="well deep" style={{ position: 'relative', width: 124, height: H, borderRadius: 62, display: 'block' }}>
          <span style={{ position: 'absolute', left: 6, right: 6, bottom: 6, height: Math.max(0, (H - 12) * frac), borderRadius: 56, background: 'var(--ink)', display: 'block' }} />
        </span>
      </div>
      <div className="big center" role="timer" aria-live="off" style={{ marginTop: compact ? 16 : 24, fontSize: compact ? 44 : 52 }}>{fmtClock(left)}</div>
    </Stage>
  )
}

// ---------- finished ----------
function Summary({ sess, onClose }) {
  const mins = Math.max(1, Math.round((new Date(sess.endedAt) - new Date(sess.startedAt)) / 60000))
  const sets = sess.entries.reduce((n, e) => n + e.sets.filter((x) => x.kind === 'work').length, 0)
  const pr = sess.prs?.[0]
  const line = pr ? `New best on ${BY_ID[pr.exerciseId]?.name}${pr.kind === 'weight' ? `: ${pr.value} ${getState().profile.units}` : pr.kind === 'reps' ? `: ${pr.value} reps` : ''}.` : `${sets} sets of good work.`
  return (
    <Stage foot={<Press className="pill ink" onClick={onClose}>Back to today</Press>}>
      <div className="center">
        <h1 className="hero" style={{ fontSize: 68 }}>Done</h1>
        <p className="body" style={{ marginTop: 14, maxWidth: 290, marginInline: 'auto', fontSize: 17, textWrap: 'balance' }}>{line}</p>
        <div style={{ display: 'flex', gap: 8, width: 170, height: 110, margin: '40px auto 0', alignItems: 'flex-end' }} aria-hidden>
          {[0.35, 1, 0.7, 0.35].map((h, i) => (
            <motion.span key={i} initial={{ height: 0 }} animate={{ height: 20 + 90 * h }} transition={{ ...springPop, delay: 0.08 * i }} style={{ flex: 1, borderRadius: 16, background: 'var(--ink)', display: 'block' }} />
          ))}
        </div>
        <p className="small" style={{ marginTop: 18, fontSize: 15 }}>{titleOf(sess.focus)} · {mins} min</p>
        {(sess.ladder || []).map((m) => (
          <p key={m.slotId} className="center" style={{ margin: '10px auto 0', maxWidth: 290, font: '600 15px/1.35 var(--font)', textWrap: 'balance' }}>
            Next time: {BY_ID[m.to]?.name} instead of {BY_ID[m.from]?.name}{m.dir === 'up' ? ', you earned it' : ', to build up to it'}.
          </p>
        ))}
        {sess.skipped?.length > 0 && <p className="small center" style={{ margin: '10px auto 0', maxWidth: 290 }}>Moves you didn’t get to stay at the same weight next time.</p>}
      </div>
    </Stage>
  )
}

function SwapSheet({ open, onClose, sess, entry }) {
  const opts = swapOptions(getState(), entry.pattern, entry.exerciseId)
  return (
    <Sheet open={open} onClose={onClose} label="Swap exercise">
      <p className="small center" style={{ margin: '4px 0 16px' }}>Same kind of move, with what you have.</p>
      <div className="list">
        {opts.length ? opts.map((o) => (
          <Press key={o.id} className="li" onClick={() => { swapExercise(sess.id, entry.id, o.id); onClose() }}>
            <span className="t">{o.name}</span><span className="s">{o.cue}</span>
          </Press>
        )) : <div className="li"><span className="s">Nothing else fits your equipment.</span></div>}
      </div>
    </Sheet>
  )
}
