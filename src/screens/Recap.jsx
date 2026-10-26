import React, { useMemo, useRef, useState, useEffect } from 'react'
import { motion, animate, useMotionValue } from 'framer-motion'
import { useStore } from '../lib/store.js'
import { BY_ID } from '../engine/exercises.js'
import { e1rm } from '../engine/loads.js'
import { GOAL_INFO, FOCUS_INFO, weekSessions, planWeek, mondayOf, TYPE_LABEL } from '../engine/plan.js'
import { totals, facts, fmtLifted, fmtDistance, distanceUnit } from '../engine/stats.js'
import { startPlan } from '../lib/actions.js'
import { Opener, Press, HoldPill, dur, toast } from '../ui/kit.jsx'
import { haptic } from '../lib/feedback.js'
import { TopBar } from './Flow.jsx'

const TONE = 'var(--t-done)'

// What a finished plan did, from its own sessions.
export function planRecap(state) {
  const plan = state.plan
  const mine = state.sessions.filter((s) => s.status === 'done' && s.planId === plan.id)
  const t = totals(state, mine)
  // weeks where every planned session got done
  const weeks = plan.weeks
  let full = 0
  for (let w = 1; w <= weeks; w++) {
    const d = new Date(mondayOf(plan.start)); d.setDate(d.getDate() + 7 * (w - 1) + 2)
    const planned = weekSessions(state, planWeek(plan, d)).length
    const got = new Set(mine.filter((s) => s.planKey?.startsWith(`w${w}-`)).map((s) => s.planKey)).size
    if (planned && got >= planned) full++
  }
  // main lifts: the best set of the first session against the best of the last
  const by = {}
  for (const s of [...mine].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))) {
    for (const e of s.entries || []) {
      if (!e.isMain) continue
      const ex = BY_ID[e.exerciseId]
      const work = e.sets.filter((x) => x.done && x.kind === 'work')
      if (!ex || !work.length) continue
      const bw = ex.load === 'bw' || ex.load === 'band' || ex.unit === 'sec'
      const best = work.reduce((a, x) => ((bw ? +x.reps : e1rm(+x.weight || 0, +x.reps || 0)) > (bw ? +a.reps : e1rm(+a.weight || 0, +a.reps || 0)) ? x : a))
      const v = bw ? +best.reps || 0 : e1rm(+best.weight || 0, +best.reps || 0)
      ;(by[ex.id] ||= { ex, list: [] }).list.push({ set: best, v })
    }
  }
  const lifts = Object.values(by).filter((x) => x.list.length >= 2)
    .map(({ ex, list }) => ({ ex, first: list[0], last: list[list.length - 1], gain: Math.round(((list[list.length - 1].v - list[0].v) / (list[0].v || 1)) * 100) }))
    .sort((a, b) => b.gain - a.gain).slice(0, 4)
  const tests = mine.filter((s) => s.type === 'cardio' && s.test).sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
  const test = tests.length >= 2 ? { first: tests[0].test, last: tests[tests.length - 1].test } : null
  const testGain = test ? (test.last.kind === 'mile' ? (test.first.value - test.last.value) / test.first.value : (test.last.value - test.first.value) / (test.first.value || 1)) : null
  const avgLift = lifts.length ? lifts.reduce((a, l) => a + l.gain, 0) / lifts.length : null
  // what to work on next: whatever moved least
  const focus = []
  if (plan.goal !== 'stamina' && (testGain == null || testGain < 0.05)) focus.push('stamina')
  if (plan.goal !== 'strength' && (avgLift == null || avgLift < 5)) focus.push('strength')
  const next = { goal: plan.goal, weeks: plan.weeks, level: plan.level, focus: focus.slice(0, 1) }
  return { plan, t, full, weeks, lifts, test, testGain, next, count: mine.filter((s) => !s.partOf).length }
}

export default function Recap({ origin, onClose }) {
  const state = useStore()
  const r = useMemo(() => planRecap(state), [state.plan?.id])
  const u = state.profile.units
  const fmtSet = (ex, x) => (ex.unit === 'sec' ? `${x.reps} s` : ex.load === 'bw' || ex.load === 'band' ? `${x.reps} reps` : `${+x.weight} ${u} × ${x.reps}`)
  const fmtTest = (x) => (x.kind === 'mile' ? `${Math.floor(x.value / 60)}:${String(Math.round(x.value % 60)).padStart(2, '0')}` : `${x.value.toFixed(2)} ${u === 'kg' ? 'km' : 'mi'}`)
  const fact = facts(r.t)[0]
  const pages = [
    <Page key="a" kicker={`${GOAL_INFO[r.plan.goal].label}`} big={`${r.weeks} weeks`} line="done.">
      <Stat v={r.count} l={r.count === 1 ? 'workout' : 'workouts'} />
      {r.full > 0 && <p className="body center" style={{ marginTop: 18 }}>{r.full === r.weeks ? 'You did every planned session, every week.' : `${r.full} of ${r.weeks} weeks with every session done.`}</p>}
    </Page>,
    r.lifts.length > 0 && (
      <Page key="b" kicker="Stronger" big={`+${Math.max(0, Math.round(r.lifts.reduce((a, l) => a + l.gain, 0) / r.lifts.length))}%`} line="on your main lifts">
        <div className="list" style={{ marginTop: 18 }}>
          {r.lifts.map((l) => (
            <div key={l.ex.id} className="li">
              <span className="t">{l.ex.name}</span>
              <span className="s num">{fmtSet(l.ex, l.first.set)} → <b>{fmtSet(l.ex, l.last.set)}</b></span>
            </div>
          ))}
        </div>
      </Page>
    ),
    r.test && (
      <Page key="c" kicker="Fitness test" big={r.testGain >= 0 ? `+${Math.round(r.testGain * 100)}%` : 'Held'} line={r.test.last.kind === 'mile' ? 'faster over the mile' : 'further in 12 minutes'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 22 }}>
          <Stat v={fmtTest(r.test.first)} l="week 1" small /><Stat v={fmtTest(r.test.last)} l={`week ${r.weeks}`} small />
        </div>
      </Page>
    ),
    <Page key="d" kicker="All of it" big={`${fmtLifted(r.t)} ${u}`} line="lifted">
      <div style={{ display: 'grid', gridTemplateColumns: r.t.distance > 0.1 ? '1fr 1fr' : '1fr', marginTop: 22 }}>
        {r.t.distance > 0.1 && <Stat v={`${fmtDistance(r.t)} ${distanceUnit(r.t)}`} l="walked and run" small />}<Stat v={`${Math.round(r.t.minutes / 60)} h`} l="training" small />
      </div>
      {fact && <p className="center" style={{ margin: '22px auto 0', maxWidth: 280, font: '600 17px/1.35 var(--font)', textWrap: 'balance' }}>{fact.text}</p>}
    </Page>,
    <Page key="e" kicker="What's next" big={GOAL_INFO[r.next.goal].short} line={`${r.next.weeks} weeks${r.next.focus.length ? `, plus ${FOCUS_INFO[r.next.focus[0]].label.toLowerCase()}` : ''}`}>
      <p className="body center" style={{ marginTop: 18 }}>{r.next.focus.length ? 'The same goal, with a little more of what moved least.' : 'The same goal again, starting from where you are now.'} Your weights carry over.</p>
    </Page>,
  ].filter(Boolean)
  const [i, setI] = useState(0)
  const last = i === pages.length - 1
  const start = () => { startPlan(r.next); toast('Your next plan starts this week'); onClose() }
  return (
    <Opener origin={origin} tone={TONE}>
      <TopBar onClose={onClose} steps={pages.length} at={i + 1} />
      <Pager i={i} setI={setI} n={pages.length}>{pages}</Pager>
      <div style={{ padding: '12px 20px calc(var(--safe-b) + 24px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {last
          ? <><Press className="pill soft" onClick={onClose}>Not yet</Press><HoldPill label="Hold to start" onComplete={start} /></>
          : <><Press className="pill soft" onClick={() => setI(Math.max(0, i - 1))} style={{ opacity: i ? 1 : 0.5 }}>Back</Press><Press className="pill ink" onClick={() => setI(i + 1)}>Next</Press></>}
      </div>
    </Opener>
  )
}

function Page({ kicker, big, line, children }) {
  return (
    <div style={{ width: '100%', flex: 'none', padding: '0 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="kicker center">{kicker}</div>
      <h1 className="hero center num" style={{ fontSize: 64, marginTop: 6 }}>{big}</h1>
      <div className="title center" style={{ fontSize: 24, color: 'var(--ink-2)', marginTop: 4 }}>{line}</div>
      {children}
    </div>
  )
}
function Stat({ v, l, small }) {
  return (
    <div className="center" style={{ marginTop: small ? 0 : 26 }}>
      <div className="big num" style={{ fontSize: small ? 30 : 48 }}>{v}</div>
      <div className="small" style={{ marginTop: 4 }}>{l}</div>
    </div>
  )
}

// Pages side by side: drag with your finger, flick to go on, or use the buttons. Lands on the nearest page.
function Pager({ i, setI, n, children }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const [w, setW] = useState(360)
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); return () => ro.disconnect() }, [])
  useEffect(() => { animate(x, -i * w, { type: 'spring', bounce: 0, duration: dur(0.42) }) }, [i, w])
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
      <motion.div drag="x" dragConstraints={{ left: -(n - 1) * w, right: 0 }} dragElastic={0.12} dragMomentum={false}
        onDragEnd={(_, info) => {
          // project where the flick would land, then pick that page
          const to = Math.round(-(x.get() + info.velocity.x * 0.2) / w)
          const k = Math.max(0, Math.min(n - 1, Math.max(i - 1, Math.min(i + 1, to))))
          if (k !== i) { haptic('light'); setI(k) } else animate(x, -i * w, { type: 'spring', bounce: 0, duration: dur(0.36), velocity: info.velocity.x })
        }}
        style={{ x, display: 'flex', height: '100%', touchAction: 'pan-y' }}>
        {React.Children.map(children, (c) => <div style={{ width: w, flex: 'none', display: 'flex' }}>{c}</div>)}
      </motion.div>
    </div>
  )
}
