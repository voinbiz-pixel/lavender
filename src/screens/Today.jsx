import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, currentUser, dayKey } from '../lib/store.js'
import { position, todaysPlan, estMinutes, sessionSlots } from '../engine/program.js'
import { cardioSession, sessionMinutes } from '../engine/plan.js'
import { SegmentBars } from './Cardio.jsx'
import { weekStart } from '../engine/rewards.js'
import { FLOWS, MORNING, flowMinutes, todaysFlow, flowByKey } from '../engine/routines.js'
import { activeSession, doneToday, titleOf, waterToday, waterGoal, addWater, undoWater, glassMl, fmtWater, waterUnit, isOz, ML_PER_OZ } from '../lib/actions.js'
import { crewInfo, cloudEnabled, nudgePartner } from '../lib/cloud.js'
import { Press, Icon, Menu, useLongPress, spring, springPop, toast, originOf } from '../ui/kit.jsx'
import { haptic } from '../lib/feedback.js'

const enter = (i) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { ...spring, delay: 0.07 * i } })
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Today({ openSession, openFlow, openCardio, openCalendar }) {
  const state = useStore()
  const now = new Date()
  const p = state.profile
  const flowsToday = state.flows[dayKey(now)] || {}
  const showMorning = p.morning?.on && (p.morning.days || []).includes(now.getDay()) && now.getHours() < (p.morning.until ?? 11) && !flowsToday.morning

  // Today never scrolls: if the cards are taller than the space, they scale down to fit.
  const box = useRef(null)
  const inner = useRef(null)
  const [z, setZ] = useState(1)
  useLayoutEffect(() => {
    const fit = () => {
      const b = box.current, i = inner.current
      if (!b || !i) return
      const need = i.offsetHeight, have = b.clientHeight
      setZ(need > have ? Math.max(0.72, have / need) : 1)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box.current); ro.observe(inner.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="fixed">
      <motion.header {...enter(0)} className="bar">
        <div className="center">
          <div className="kicker">{now.toLocaleDateString(undefined, { weekday: 'long' })}</div>
          <h1 className="title" style={{ fontSize: 28, marginTop: 1 }}>{now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h1>
          <DayBadge train={p.trainDays.includes(now.getDay()) || !!activeSession(state)} yoga={p.mode === 'yoga'} cardio={!activeSession(state) && todaysPlan(state)?.next?.kind === 'cardio'} />
        </div>
      </motion.header>

      {/* the day, centred in whatever height the phone has */}
      <div ref={box} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 14 }}>
      <div ref={inner} className="stack" style={{ gap: 12, transform: z < 1 ? `scale(${z})` : undefined, transformOrigin: '50% 50%' }}>
        <AnimatePresence initial={false}>
          {showMorning && (
            <motion.div key="morning" {...enter(1)} exit={{ opacity: 0, height: 0, marginBottom: -12, transition: spring }}>
              <MorningCard onOpen={(e) => openFlow('morning', originOf(e.currentTarget))} />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div {...enter(2)}><MainCard state={state} openSession={openSession} openFlow={openFlow} openCardio={openCardio} flowsToday={flowsToday} /></motion.div>
        <motion.div {...enter(3)}><WaterCard state={state} /></motion.div>
        <motion.div {...enter(4)}><Week state={state} onOpen={openCalendar} /></motion.div>
        <Crew />
      </div>
      </div>
    </div>
  )
}

// What kind of day it is, pressed into the page under the date.
function DayBadge({ train, yoga, cardio }) {
  const label = train ? (yoga ? 'Stretch day' : cardio ? 'Cardio day' : 'Training day') : 'Rest day'
  return (
    <motion.div key={label} className="well" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...springPop, delay: 0.12 }}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 32, padding: '0 18px', borderRadius: 16, marginTop: 12, font: '600 14px var(--font)', letterSpacing: '-0.005em' }}>
      {label}
    </motion.div>
  )
}

function MorningCard({ onOpen }) {
  const min = flowMinutes(MORNING.steps)
  return (
    <Press as="div" role="button" tabIndex={0} className="tile center" onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen(e)}
      style={{ padding: '18px 20px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center', gap: 8 }} aria-label={`Morning routine, ${min} minutes`}>
      <span className="circle flat" aria-hidden><Icon name="sun" size={22} /></span>
      <span>
        <span className="title" style={{ fontSize: 22, display: 'block' }}>Morning routine</span>
        <span className="small" style={{ display: 'block', marginTop: 4 }}>{min} min before work</span>
      </span>
      <span className="circle ink" aria-hidden><Icon name="play" size={16} /></span>
    </Press>
  )
}

// ---------- the main card: today's workout, or today's stretch on a rest day ----------
function MainCard({ state, openSession, openFlow, openCardio, flowsToday }) {
  const now = new Date()
  const p = state.profile
  const active = activeSession(state)
  const done = doneToday(state, now)
  const trainDay = p.trainDays.includes(now.getDay())
  const [menu, setMenu] = useState(null)
  const lp = useLongPress((r) => setMenu(r))
  const open = (e) => openSession(originOf(e.currentTarget.closest('.tile') || e.currentTarget))

  if (p.mode !== 'yoga' && state.program && (active || done || trainDay)) {
    const pos = position(state)
    const tp = todaysPlan(state, now)
    if (done && !active) {
      const mins = Math.max(1, Math.round((new Date(done.endedAt) - new Date(done.startedAt)) / 60000))
      const prs = done.prs?.length || 0
      return (
        <section className="tile center" style={{ padding: '28px 22px 26px' }} aria-label="Today's workout, done">
          <h2 className="hero">{done.type === 'cardio' ? done.title : titleOf(done.focus)}</h2>
          <div className="small" style={{ marginTop: 8, fontSize: 15 }}>Done today · {mins} min{prs ? ` · ${prs} new ${prs === 1 ? 'best' : 'bests'}` : ''}</div>
          <Parts parts={[1, 1, 1, 1]} solid />
        </section>
      )
    }
    if (!active && tp?.pw.over) return <PlanDoneCard state={state} />
    if (!active && tp?.next?.kind === 'cardio') return <CardioCard state={state} desc={tp.next} pw={tp.pw} openCardio={openCardio} />
    if (!active && tp && !tp.next) return <FlowCard openFlow={openFlow} flowsToday={flowsToday} rest weekDone />
    const day = active ? state.program.days.find((d) => d.key === active.dayKey) || pos.day : pos.day
    const extras = !active && tp?.next ? [tp.next.core && 'core', tp.next.finisher && 'a treadmill finisher'].filter(Boolean) : []
    return (
      <>
        <Press as="div" role="button" tabIndex={0} className="tile center" scale={0.98} {...lp} onClick={open} onKeyDown={(e) => e.key === 'Enter' && open(e)}
          style={{ padding: '24px 22px 22px', cursor: 'pointer' }} aria-label={`${active ? 'Resume' : 'Open'} today's workout, ${day.name}, ${titleOf(day.focus)}`}>
          <div className="kicker" style={{ marginBottom: 4 }}>{day.name}</div>
          <h2 className="hero">{titleOf(day.focus)}</h2>
          <div className="small" style={{ marginTop: 8, fontSize: 15 }}>
            {active ? 'In progress' : tp ? `Week ${tp.pw.week} of ${tp.pw.weeks} · ${tp.pw.label}` : `${day.name} · ${pos.isDeload ? 'easy week' : `week ${pos.week}`}`} · {!active && tp?.next ? estMinutes(sessionSlots(state, pos.dayIdx, { desc: tp.next })) + (tp.next.finisher ? 15 : 0) : day.minutes} min
          </div>
          {extras.length > 0 && <div className="small" style={{ marginTop: 3 }}>Plus {extras.join(' and ')}</div>}
          <Parts parts={partMinutes(day)} />
          <div className="pill ink" style={{ marginTop: 22, height: 56 }}>{active ? 'Resume' : 'Start'}</div>
        </Press>
        <Menu anchor={menu} onClose={() => setMenu(null)} items={[{ label: 'See today’s plan', onSelect: () => openSession(null) }]} />
      </>
    )
  }

  // rest day (or a yoga day): today's flow, with the other two one tap away
  return <FlowCard openFlow={openFlow} flowsToday={flowsToday} rest={p.mode !== 'yoga' || !trainDay} onTrain={p.mode !== 'yoga' && state.program ? () => openSession(null) : null} />
}

function FlowCard({ openFlow, flowsToday, rest, onTrain, weekDone }) {
  const [pick, setPick] = useState(todaysFlow().key)
  const [menu, setMenu] = useState(null)
  const lp = useLongPress((r) => onTrain && setMenu(r))
  const ref = useRef(null)
  const f = flowByKey(pick)
  if (flowsToday.stretch) {
    return (
      <section className="tile center" style={{ padding: '28px 22px 26px' }}>
        <h2 className="hero">Stretched</h2>
        <div className="small" style={{ marginTop: 8, fontSize: 15 }}>{flowByKey(flowsToday.stretch).name}, done. Drink up and rest.</div>
      </section>
    )
  }
  return (
    <>
      <section ref={ref} className="tile center" style={{ padding: '28px 18px 22px' }} {...lp}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.h2 key={f.key} className="hero" initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={spring}>{f.name}</motion.h2>
        </AnimatePresence>
        <div className="small" style={{ marginTop: 8, fontSize: 15 }}>{weekDone ? 'This week’s plan is done · ' : ''}{flowMinutes(f.steps)} min of stretching</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FLOWS.length}, minmax(0, 1fr))`, gap: 10, marginTop: 20 }} role="radiogroup" aria-label="Choose a flow">
          {FLOWS.map((x) => (
            <Press key={x.key} className={`chip ${x.key === pick ? 'on' : ''}`} style={{ height: 40, padding: '0 10px', fontSize: 14 }} role="radio" aria-checked={x.key === pick} onClick={() => setPick(x.key)}>{x.name.split(' ')[0]}</Press>
          ))}
        </div>
        <Press className="pill ink" style={{ marginTop: 18, height: 56 }} onClick={() => openFlow(pick, originOf(ref.current))}>Start</Press>
      </section>
      <Menu anchor={menu} onClose={() => setMenu(null)} items={[{ label: 'Train anyway', onSelect: onTrain }]} />
    </>
  )
}

// ---------- a treadmill day ----------
function CardioCard({ state, desc, pw, openCardio }) {
  const c = cardioSession(state, desc, pw)
  const ref = useRef(null)
  const go = () => openCardio(desc, originOf(ref.current))
  return (
    <Press as="div" ref={ref} role="button" tabIndex={0} className="tile center" scale={0.98} onClick={go} onKeyDown={(e) => e.key === 'Enter' && go()}
      style={{ padding: '28px 22px 22px', cursor: 'pointer' }} aria-label={`Open today's cardio, ${c.title}`}>
      <h2 className="hero">{c.title}</h2>
      <div className="small" style={{ marginTop: 8, fontSize: 15 }}>Week {pw.week} of {pw.weeks} · {pw.label} · {sessionMinutes(c)} min</div>
      {c.note && <div className="small" style={{ marginTop: 3 }}>{c.note}</div>}
      <div style={{ width: 220, margin: '18px auto 0' }}><SegmentBars segments={c.segments} height={34} /></div>
      <div className="pill ink" style={{ marginTop: 22, height: 56 }}>Start</div>
    </Press>
  )
}

function PlanDoneCard({ state }) {
  return (
    <section className="tile center" style={{ padding: '28px 22px 26px' }}>
      <h2 className="hero">Plan done</h2>
      <div className="small" style={{ marginTop: 8, fontSize: 15 }}>{state.plan.weeks} weeks finished. Pick your next plan in You.</div>
    </section>
  )
}

// minutes per part: warm-up, strength, accessory, cool-down
export function partMinutes(day) {
  if (!day) return [2, 20, 12, 2]
  const est = (s) => (s.sets * (s.rest + 45)) / 60
  const lift = day.slots.filter((s) => s.isMain).reduce((t, s) => t + est(s), 0)
  const extra = day.slots.filter((s) => !s.isMain).reduce((t, s) => t + est(s), 0)
  return [2, Math.max(1, lift), Math.max(1, extra), 2]
}

export function Parts({ parts, solid, width = 220 }) {
  const total = parts.reduce((t, x) => t + x, 0)
  return (
    <div className="row" style={{ gap: 6, width, margin: '18px auto 0' }} aria-hidden>
      {parts.map((m, i) => (
        <span key={i} className={solid ? '' : 'well'} style={{ flex: Math.max(m, total * 0.12), height: 10, borderRadius: 5, background: solid ? 'var(--ink)' : undefined }} />
      ))}
    </div>
  )
}

// ---------- water: one tap per glass; the glasses fill from the bottom ----------
function WaterCard({ state }) {
  const goal = waterGoal(state)
  const have = waterToday(state)
  const g = glassMl(state)
  const n = Math.max(6, Math.min(12, Math.round(goal / g)))
  const per = goal / n
  const filled = Math.min(n, Math.floor(have / per + 0.05))
  const [menu, setMenu] = useState(null)
  const lp = useLongPress((r) => setMenu(r))
  const oz = isOz(state)
  const full = have >= goal
  const add = (ml) => { if (addWater(ml)) haptic('success'); else haptic('light') }
  return (
    <>
      <Press as="div" role="button" tabIndex={0} className="tile center" scale={0.98} {...lp}
        onClick={() => add(g)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(g) } }}
        style={{ padding: '20px 20px 22px', cursor: 'pointer' }}
        aria-label={`Water: ${fmtWater(have)} of ${fmtWater(goal)} ${waterUnit(goal)}. ${full ? 'Done for today.' : 'Tap to add a glass, hold for more.'}`}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6 }}>
          <span className="big" style={{ fontSize: 36 }}>{fmtWater(have)}</span>
          <span className="small" style={{ fontSize: 15 }}>of {fmtWater(goal)} {waterUnit(goal)} water</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14, height: 40, alignItems: 'flex-end' }} aria-hidden>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="well" style={{ position: 'relative', width: 18, height: 40, borderRadius: 9, overflow: 'hidden', display: 'block' }}>
              <motion.span initial={false} animate={{ scaleY: i < filled ? 1 : 0 }} transition={i < filled ? springPop : spring}
                style={{ position: 'absolute', inset: 0, borderRadius: 9, background: 'var(--ink)', transformOrigin: '50% 100%', display: 'block' }} />
            </span>
          ))}
        </div>
        <div className="small" style={{ marginTop: 12 }}>{full ? 'Done for today' : 'Tap for a glass, hold for more'}</div>
      </Press>
      <Menu anchor={menu} onClose={() => setMenu(null)} items={[
        !full && { label: oz ? 'Add a bottle, 16 oz' : 'Add a bottle, 500 ml', onSelect: () => add(oz ? 16 * ML_PER_OZ : 500) },
        { label: 'Undo last', onSelect: () => toast(undoWater() ? 'Removed' : 'Nothing to undo') },
      ]} />
    </>
  )
}

// ---------- the week at a glance ----------
function Week({ state, onOpen }) {
  const mon = weekStart(new Date())
  const today = dayKey()
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
  const done = state.sessions.filter((s) => s.status === 'done')
  const trainedN = days.filter((d) => done.some((s) => dayKey(s.startedAt) === dayKey(d)) || state.flows[dayKey(d)]?.stretch).length
  return (
    <Press className="center" onClick={onOpen} scale={0.98} style={{ width: '100%', padding: '8px 0 4px' }} aria-label={`This week: ${trainedN} of ${state.profile.trainDays.length} days. Open the calendar.`}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 28px)', gap: 12, justifyContent: 'center' }}>
        {days.map((d, i) => {
          const k = dayKey(d)
          const did = done.some((s) => dayKey(s.startedAt) === k) || !!state.flows[k]?.stretch
          const planned = state.profile.trainDays.includes(d.getDay())
          const isToday = k === today
          return (
            <span key={i} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
              <span className={did ? '' : 'well'} style={{ width: 14, height: 28, borderRadius: 7, display: 'block', background: did ? 'var(--ink)' : undefined, opacity: did || planned ? 1 : 0.45, boxShadow: isToday && !did ? 'inset 0 0 0 2px var(--ink)' : undefined }} />
              <span className="small" style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--ink)' : undefined }}>{LETTERS[i]}</span>
            </span>
          )
        })}
      </div>
    </Press>
  )
}

// ---------- crew: who has trained today ----------
function Crew() {
  const [crew, setCrew] = useState(null)
  useEffect(() => {
    const u = currentUser()
    if (cloudEnabled && u) crewInfo(u.id).then(setCrew).catch(() => {})
  }, [])
  const others = crew?.members.filter((m) => !m.me) || []
  if (!others.length) return null
  const today = new Date().toDateString()
  return (
    <section className="center" style={{ paddingTop: 4 }} aria-label="Crew">
      <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
        {others.map((m) => {
          const did = crew.recent.some((r) => r.user_id === m.id && new Date(r.ended_at).toDateString() === today)
          return (
            <Press key={m.id} onClick={() => { if (did) toast(`${m.name} trained today`); else { nudgePartner('nudge', 'Your crew is training today.'); toast(`Nudged ${m.name}`) } }}
              aria-label={`${m.name}, ${did ? 'trained today' : 'not yet. Tap to nudge'}`} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
              <span style={{ width: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center', font: '700 17px var(--display)', background: did ? 'var(--ink)' : 'var(--tone)', boxShadow: did ? 'none' : 'var(--up-s)', color: did ? 'var(--paper)' : 'var(--ink)' }}>{m.name[0]}</span>
              <span className="small" style={{ fontSize: 12 }}>{m.name}</span>
            </Press>
          )
        })}
      </div>
    </section>
  )
}
