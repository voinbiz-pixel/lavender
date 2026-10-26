import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { setState, initialState, defaultEquipment } from '../lib/store.js'
import { GOAL_INFO, FOCUS_INFO, LEVEL_INFO, hasCardio } from '../engine/plan.js'
import { startPlan } from '../lib/actions.js'
import { EASY_ON } from '../engine/exercises.js'
import { Press, Icon, spring } from '../ui/kit.jsx'
import { MARK_PATH } from '../ui/mark.js'
import { Chips, EquipmentPicker, DAY_PRESETS } from './You.jsx'

const WEEK = [['S', 0], ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6]]

export default function Onboarding() {
  const [p, setP] = useState(() => initialState().profile)
  const [cfg, setCfg] = useState({ goal: 'strength', focus: [], weeks: 8, level: 'run' })
  const [bw, setBw] = useState('')
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const up = (patch) => setP((x) => ({ ...x, ...patch }))
  const lift = p.mode !== 'yoga'

  const steps = [
    { key: 'hello', body: (
      <div className="center" style={{ paddingTop: 120 }}>
        <Mark />
        <h1 className="hero" style={{ marginTop: 34, fontSize: 48 }}>Lavender</h1>
        <p className="body" style={{ marginTop: 12, maxWidth: 280, marginInline: 'auto', fontSize: 17 }}>Your workout, a morning routine and water. One tap at a time.</p>
      </div>
    ), cta: 'Begin' },
    { key: 'name', title: 'What should we call you?', body: (
      <input className="field" autoFocus placeholder="Your name" value={p.name} onChange={(e) => up({ name: e.target.value })} maxLength={24} autoComplete="given-name" aria-label="Your name" onKeyDown={(e) => e.key === 'Enter' && p.name.trim() && next()} />
    ), ok: p.name.trim().length > 0 },
    { key: 'goal', title: 'What do you want from the next few weeks?', body: (
      <div className="stack" style={{ gap: 12 }}>
        {[...Object.entries(GOAL_INFO).map(([k, g]) => [k, g.label, g.sub]), ['yoga', 'Yoga and stretching', 'Short guided flows, no lifting']].map(([v, l, sub]) => {
          const on = v === 'yoga' ? p.mode === 'yoga' : p.mode !== 'yoga' && cfg.goal === v
          return (
            <Press key={v} className="tile" onClick={() => { if (v === 'yoga') up({ mode: 'yoga' }); else { up({ mode: 'lift' }); setCfg((c) => ({ ...c, goal: v, focus: c.focus.filter((x) => x !== v) })) } }} aria-pressed={on}
              style={{ height: 76, display: 'grid', placeContent: 'center', textAlign: 'center', gap: 3, background: on ? 'var(--ink)' : undefined, color: on ? 'var(--paper)' : undefined, transition: 'background-color 0.42s, color 0.42s' }}>
              <span style={{ font: '700 19px var(--display)', letterSpacing: '-0.02em' }}>{l}</span>
              <span className="small" style={{ color: 'inherit', opacity: 0.7 }}>{sub}</span>
            </Press>
          )
        })}
      </div>
    ) },
    lift && { key: 'focus', title: 'Anything else to work on?', body: (
      <>
        <Chips multi grid label="Focus areas" value={cfg.focus} onChange={(focus) => setCfg((c) => ({ ...c, focus }))} options={Object.entries(FOCUS_INFO).filter(([k]) => k !== cfg.goal).map(([k, f]) => [f.label, k])} />
        <p className="small center" style={{ marginTop: 16, fontSize: 15 }}>Optional. The plan makes room for them in the same week.</p>
      </>
    ) },
    lift && { key: 'length', title: 'How long is the plan?', body: (
      <>
        <Chips grid label="Plan length" value={cfg.weeks} onChange={(weeks) => setCfg((c) => ({ ...c, weeks }))} options={[6, 8, 12].map((n) => [`${n} weeks`, n])} />
        <p className="small center" style={{ marginTop: 16, fontSize: 15, maxWidth: 300, marginInline: 'auto' }}>It builds week by week, eases off to recover, and ends with a test to show how far you came.</p>
      </>
    ) },
    lift && hasCardio(cfg) && { key: 'level', title: 'How is your running?', body: (
      <div className="stack" style={{ gap: 12 }}>
        {Object.entries(LEVEL_INFO).map(([v, info]) => {
          const on = cfg.level === v
          return (
            <Press key={v} className="tile" onClick={() => setCfg((c) => ({ ...c, level: v }))} aria-pressed={on}
              style={{ height: 76, display: 'grid', placeContent: 'center', textAlign: 'center', gap: 3, background: on ? 'var(--ink)' : undefined, color: on ? 'var(--paper)' : undefined, transition: 'background-color 0.42s, color 0.42s' }}>
              <span style={{ font: '700 19px var(--display)', letterSpacing: '-0.02em' }}>{info.label}</span>
              <span className="small" style={{ color: 'inherit', opacity: 0.7 }}>{info.sub}</span>
            </Press>
          )
        })}
      </div>
    ) },
    { key: 'days', title: 'How many days a week?', body: (
      <>
        <Chips grid label="Days a week" value={p.daysPerWeek} onChange={(n) => up({ daysPerWeek: n, trainDays: DAY_PRESETS[n] })} options={[2, 3, 4, 5, 6].map((n) => [String(n), n])} />
        <div className="small center" style={{ margin: '28px 0 10px' }}>On these days</div>
        <Chips multi label="Which days" value={p.trainDays} onChange={(trainDays) => up({ trainDays, daysPerWeek: Math.max(2, Math.min(6, trainDays.length)) })} options={WEEK} />
      </>
    ), ok: p.trainDays.length >= 1 },
    lift && { key: 'time', title: 'How long do you have?', body: (
      <Chips grid label="Time per workout" value={p.sessionMinutes} onChange={(sessionMinutes) => up({ sessionMinutes })} options={[30, 45, 60, 75].map((n) => [`${n} min`, n])} />
    ) },
    lift && { key: 'equipment', title: 'What do you have at home?', body: <EquipmentPicker equipment={p.equipment} onChange={(equipment) => up({ equipment })} /> },
    lift && { key: 'xp', title: 'How much have you lifted?', body: (
      <>
        <Chips grid label="Experience" value={p.experience} onChange={(experience) => up({ experience })} options={[['New to it', 'new'], ['Some', 'some'], ['A lot', 'lots']]} />
        <div className="small center" style={{ margin: '28px 0 10px' }}>Anything to go easy on?</div>
        <Chips multi cols={2} label="Go easy on" value={p.easyOn} onChange={(easyOn) => up({ easyOn })} options={EASY_ON.map((e) => [e.label, e.key])} />
      </>
    ) },
    { key: 'morning', title: 'A short morning routine before work?', body: (
      <>
        <p className="body center" style={{ marginBottom: 20 }}>Six minutes: a glass of water, a little mobility, a minute of breathing.</p>
        <Chips grid label="Morning routine" value={!p.morning.on ? 'no' : p.morning.days.length === 7 ? 'all' : 'week'} onChange={(v) => up({ morning: { ...p.morning, on: v !== 'no', days: v === 'all' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5] } })} options={[['Weekdays', 'week'], ['Every day', 'all'], ['Not now', 'no']]} />
      </>
    ) },
    { key: 'weight', title: 'Your body weight?', body: (
      <>
        <p className="body center" style={{ marginBottom: 20 }}>Only used to set your water target. Skip it if you like.</p>
        <input className="field" inputMode="decimal" placeholder={p.units} value={bw} onChange={(e) => setBw(e.target.value.replace(/[^0-9.]/g, ''))} aria-label="Body weight" />
        <div style={{ marginTop: 14 }}><Chips grid label="Units" value={p.units} onChange={(units) => up({ units, equipment: defaultEquipment(units) })} options={[['lb', 'lb'], ['kg', 'kg']]} /></div>
      </>
    ), cta: 'Done' },
  ].filter(Boolean)

  const step = steps[i]
  const finish = () => {
    const profile = { ...p, name: p.name.trim(), onboarded: true }
    const v = parseFloat(bw)
    setState((s) => ({ ...s, profile, program: null, plan: null, bodyweight: v > 30 && v < 500 ? [{ value: v, at: new Date().toISOString() }] : s.bodyweight }))
    if (profile.mode !== 'yoga') startPlan(cfg)
  }
  function next() { if (i === steps.length - 1) finish(); else { setDir(1); setI(i + 1) } }
  const back = () => { setDir(-1); setI(Math.max(0, i - 1)) }

  return (
    <div className="screen">
      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center', padding: 'calc(var(--safe-t) + 16px) 20px 0', minHeight: 56 }}>
        {i > 0 ? <Press className="circle" onClick={back} aria-label="Back"><Icon name="chevR" size={18} style={{ transform: 'rotate(180deg)' }} /></Press> : <span />}
        <div className="row" style={{ justifyContent: 'center', gap: 5 }} aria-hidden>
          {i > 0 && steps.slice(1).map((_, k) => <span key={k} style={{ width: 6, height: 6, borderRadius: 3, background: k < i ? 'var(--ink)' : 'var(--ink-4)' }} />)}
        </div>
        <span />
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div key={step.key} custom={dir} className="scroll-y" style={{ position: 'absolute', inset: 0, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}
            variants={{ in: (d) => ({ opacity: 0, x: 40 * d }), on: { opacity: 1, x: 0 }, out: (d) => ({ opacity: 0, x: -40 * d }) }}
            initial="in" animate="on" exit="out" transition={spring}>
            {step.title && <h1 className="title center" style={{ marginTop: 56, marginBottom: 30 }}>{step.title}</h1>}
            {step.body}
            <div style={{ height: 120 }} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div style={{ padding: '0 20px calc(var(--safe-b) + 28px)' }}>
        <Press className="pill ink" onClick={() => step.ok !== false && next()} style={{ opacity: step.ok === false ? 0.35 : 1, transition: 'opacity 0.34s' }} aria-disabled={step.ok === false}>{step.cta || 'Continue'}</Press>
      </div>
    </div>
  )
}

// The mark: one lavender bud, split by its own stem into soft pebble buds.
export function Mark({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" style={{ display: 'block', margin: '0 auto' }} aria-hidden>
      <path fill="var(--ink)" d={MARK_PATH} />
    </svg>
  )
}
