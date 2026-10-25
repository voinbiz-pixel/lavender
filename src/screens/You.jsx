import React, { useEffect, useState } from 'react'
import { useStore, setState, getState, currentUser, resetAll } from '../lib/store.js'
import { EQUIPMENT, EASY_ON } from '../engine/exercises.js'
import { weekStart } from '../engine/rewards.js'
import { rebuildProgram, loadSampleHistory, startPlan } from '../lib/actions.js'
import { cloudEnabled, crewInfo, createCrew, joinCrew, enablePush, signOut } from '../lib/cloud.js'
import { Page, Press, HoldPill, Sheet, toast } from '../ui/kit.jsx'
import { GOAL_INFO, FOCUS_INFO, LEVEL_INFO, hasCardio, planWeek } from '../engine/plan.js'

const WEEK = [['S', 0], ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6]]
export const DAY_PRESETS = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] }

// grid: equal columns (cols per row, all of them by default), so a set is always even and never leaves an orphan
export function Chips({ options, value, onChange, multi, label, grid, cols }) {
  const g = grid || cols
  return (
    <div className={g ? '' : 'row'} role={multi ? 'group' : 'radiogroup'} aria-label={label}
      style={g ? { display: 'grid', gridTemplateColumns: `repeat(${cols || options.length}, minmax(0, 1fr))`, gap: 10 } : { justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([l, v]) => {
        const on = multi ? value.includes(v) : value === v
        return <Press key={String(v) + l} className={`chip ${on ? 'on' : ''}`} role={multi ? 'checkbox' : 'radio'} aria-checked={on} onClick={() => onChange(multi ? (on ? value.filter((x) => x !== v) : [...value, v].sort()) : v)} style={multi && l.length === 1 ? { width: 42, padding: 0 } : undefined}>{l}</Press>
      })}
    </div>
  )
}

export function EquipmentPicker({ equipment, onChange }) {
  const set = (k, patch) => onChange({ ...equipment, [k]: { ...equipment[k], ...patch } })
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }} role="group" aria-label="Equipment">
        {EQUIPMENT.map((e) => {
          const on = !!equipment[e.key]?.on
          return (
            <Press key={e.key} className="tile" scale={0.97} role="checkbox" aria-checked={on} onClick={() => set(e.key, { on: !on })}
              style={{ height: 78, borderRadius: 24, display: 'grid', placeContent: 'center', gap: 3, textAlign: 'center', padding: '0 8px', background: on ? 'var(--ink)' : undefined, color: on ? 'var(--paper)' : undefined }}>
              <span style={{ font: '600 15px/1.2 var(--font)' }}>{e.label}</span>
              <span className="small" style={{ color: 'inherit', opacity: 0.62, fontSize: 12 }}>{e.hint}</span>
            </Press>
          )
        })}
      </div>
      {equipment.dumbbells?.on && (
        <>
          <div className="small center" style={{ marginTop: 10, marginBottom: 2 }}>Heaviest dumbbell</div>
          <Chips grid label="Heaviest dumbbell" value={equipment.dumbbells.max} onChange={(max) => set('dumbbells', { max })} options={[[25, 25], [35, 35], [50, 50], [52.5, 52.5], [70, 70], [90, 90]].map(([l, v]) => [String(l), v])} />
        </>
      )}
    </div>
  )
}

export default function You({ signedIn }) {
  const state = useStore()
  const p = state.profile
  const lift = p.mode !== 'yoga'
  const upd = (patch, rebuild = false) => {
    if (rebuild) rebuildProgram(patch)
    else setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
  }
  const m = p.morning || {}
  const bw = state.bodyweight?.[0]?.value

  return (
    <Page title="You">
      <Profile state={state} />
      <div className="label">Name</div>
      <input className="field" value={p.name} onChange={(e) => upd({ name: e.target.value })} maxLength={24} aria-label="Name" autoComplete="given-name" />

      <div className="label">Your plan</div>
      <PlanBlock state={state} />
      <div className="small center" style={{ margin: '18px 0 8px' }}>Days a week</div>
      <Chips grid label="Days a week" value={p.daysPerWeek} onChange={(n) => upd({ daysPerWeek: n, trainDays: DAY_PRESETS[n] }, true)} options={[2, 3, 4, 5, 6].map((n) => [String(n), n])} />
      <div className="small center" style={{ margin: '14px 0 8px' }}>Which days</div>
      <Chips multi label="Which days" value={p.trainDays} onChange={(trainDays) => { const n = Math.max(2, Math.min(6, trainDays.length)); upd({ trainDays, daysPerWeek: n }, n !== p.daysPerWeek) }} options={WEEK} />
      {lift && (
        <>
          <div className="small center" style={{ margin: '14px 0 8px' }}>Time per workout</div>
          <Chips grid label="Time per workout" value={p.sessionMinutes} onChange={(sessionMinutes) => upd({ sessionMinutes }, true)} options={[30, 45, 60, 75].map((n) => [`${n} min`, n])} />
          <div className="small center" style={{ margin: '14px 0 8px' }}>Go easy on</div>
          <Chips multi cols={2} label="Go easy on" value={p.easyOn} onChange={(easyOn) => upd({ easyOn }, true)} options={EASY_ON.map((e) => [e.label, e.key])} />
          <div className="label">Equipment</div>
          <EquipmentPicker equipment={p.equipment} onChange={(equipment) => upd({ equipment }, true)} />
        </>
      )}

      <div className="label">Morning routine</div>
      <Chips grid label="Morning routine" value={!!m.on} onChange={(on) => upd({ morning: { ...m, on } })} options={[['Off', false], ['On', true]]} />
      {m.on && (
        <>
          <div className="small center" style={{ margin: '14px 0 8px' }}>On these mornings</div>
          <Chips multi label="Morning routine days" value={m.days || []} onChange={(days) => upd({ morning: { ...m, days } })} options={WEEK} />
          <div className="small center" style={{ margin: '14px 0 8px' }}>Remind me at</div>
          <input className="field" type="time" value={m.time || '07:00'} onChange={(e) => upd({ morning: { ...m, time: e.target.value } })} aria-label="Morning reminder time" />
        </>
      )}

      <div className="label">Water</div>
      <div className="small center" style={{ marginBottom: 8 }}>Body weight sets your daily target. Optional.</div>
      <input className="field" inputMode="decimal" placeholder={p.units} defaultValue={bw ?? ''} aria-label={`Body weight in ${p.units}`}
        onBlur={(e) => { const v = parseFloat(e.target.value); if (v > 30 && v < 500) setState((s) => ({ ...s, bodyweight: [{ value: v, at: new Date().toISOString() }, ...(s.bodyweight || [])] })) }} />

      {cloudEnabled && signedIn && <CrewBlock />}

      {cloudEnabled && signedIn && (
        <>
          <div className="label">Notifications</div>
          <div className="small center" style={{ marginBottom: 8 }}>Workout reminder, on training days you haven’t trained</div>
          <Chips grid label="Workout reminder" value={!!p.reminder?.on} onChange={(on) => upd({ reminder: { ...p.reminder, on } })} options={[['Off', false], ['On', true]]} />
          {p.reminder?.on && <input className="field" type="time" style={{ marginTop: 12 }} value={p.reminder.time || '18:00'} onChange={(e) => upd({ reminder: { ...p.reminder, time: e.target.value } })} aria-label="Workout reminder time" />}
          <div className="small center" style={{ margin: '16px 0 8px' }}>Water check at 3 pm, only if you’re behind</div>
          <Chips grid label="Water check" value={p.waterNudge !== false} onChange={(waterNudge) => upd({ waterNudge })} options={[['Off', false], ['On', true]]} />
          <Press className="pill soft" style={{ marginTop: 16 }} onClick={() => enablePush(currentUser()?.id).then(() => toast('Notifications on')).catch((e) => toast(e.message))}>Allow notifications on this phone</Press>
        </>
      )}

      <div className="label">More</div>
      <div className="stack" style={{ gap: 10 }}>
        {!cloudEnabled && lift && <Press className="pill soft" onClick={() => { loadSampleHistory(); toast('Four weeks of sample workouts added') }}>Fill with sample history</Press>}
        {cloudEnabled && signedIn && <Press className="pill soft" onClick={() => signOut()}>Sign out</Press>}
        <HoldPill label="Hold to start over" tone="soft" onComplete={() => resetAll()} />
      </div>
    </Page>
  )
}

// The plan you're on, and a sheet to change it. Changing starts the new plan this week.
function PlanBlock({ state }) {
  const [open, setOpen] = useState(false)
  const plan = state.plan
  const yoga = state.profile.mode === 'yoga'
  const pw = plan ? planWeek(plan) : null
  return (
    <>
      <div className="tile center" style={{ padding: '20px 18px' }}>
        <div className="title" style={{ fontSize: 22 }}>{yoga ? 'Yoga and stretching' : plan ? GOAL_INFO[plan.goal].label : 'No plan yet'}</div>
        <div className="small" style={{ marginTop: 6, fontSize: 15 }}>
          {yoga ? 'Guided flows on your days' : plan ? `${plan.weeks} weeks · week ${pw.week}, ${pw.label.toLowerCase()}` : 'Pick a goal to get a plan'}
        </div>
        {plan && !yoga && plan.focus?.length > 0 && <div className="small" style={{ marginTop: 3 }}>Plus {plan.focus.map((f) => FOCUS_INFO[f].label.toLowerCase()).join(' and ')}</div>}
        <Press className="pill soft" style={{ marginTop: 16, height: 50 }} onClick={() => setOpen(true)}>Change plan</Press>
      </div>
      <PlanSheet open={open} onClose={() => setOpen(false)} state={state} />
    </>
  )
}

function PlanSheet({ open, onClose, state }) {
  const cur = state.plan
  const [cfg, setCfg] = useState(() => ({ goal: state.profile.mode === 'yoga' ? 'yoga' : cur?.goal || 'strength', focus: cur?.focus || [], weeks: cur?.weeks || 8, level: cur?.level || 'run' }))
  const yoga = cfg.goal === 'yoga'
  const apply = () => {
    if (yoga) { setState((x) => ({ ...x, profile: { ...x.profile, mode: 'yoga' } })); rebuildProgram({ mode: 'yoga' }) }
    else startPlan(cfg)
    toast(yoga ? 'Switched to yoga and stretching' : 'New plan starts this week')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} label="Change plan">
      <div className="label" style={{ marginTop: 10 }}>Main goal</div>
      <Chips cols={2} label="Main goal" value={cfg.goal} onChange={(goal) => setCfg((c) => ({ ...c, goal, focus: c.focus.filter((x) => x !== goal) }))}
        options={[['Strength', 'strength'], ['Stamina', 'stamina'], ['Abs and core', 'core'], ['Lose fat', 'lean']]} />
      <div style={{ marginTop: 10 }}><Chips grid label="Yoga" value={cfg.goal} onChange={(goal) => setCfg((c) => ({ ...c, goal }))} options={[['Yoga and stretching', 'yoga']]} /></div>
      {!yoga && (
        <>
          <div className="label">Also work on</div>
          <Chips multi grid label="Focus areas" value={cfg.focus} onChange={(focus) => setCfg((c) => ({ ...c, focus }))} options={Object.keys(FOCUS_INFO).filter((k) => k !== cfg.goal).map((k) => [{ strength: 'Strength', stamina: 'Stamina', core: 'Abs' }[k], k])} />
          <div className="label">Length</div>
          <Chips grid label="Plan length" value={cfg.weeks} onChange={(weeks) => setCfg((c) => ({ ...c, weeks }))} options={[6, 8, 12].map((n) => [`${n} weeks`, n])} />
          {hasCardio(cfg) && (
            <>
              <div className="label">Running</div>
              <Chips grid label="Running" value={cfg.level} onChange={(level) => setCfg((c) => ({ ...c, level }))} options={Object.entries(LEVEL_INFO).map(([k, l]) => [k === 'run' ? 'Run' : k === 'walk' ? 'Walk' : 'Run, walk', k])} />
            </>
          )}
        </>
      )}
      <p className="small center" style={{ margin: '22px auto 12px', maxWidth: 290 }}>{yoga ? 'Your days become guided flows.' : 'The new plan starts this week. Your history and weights carry over.'}</p>
      <HoldPill label={yoga ? 'Hold to switch' : 'Hold to start this plan'} onComplete={apply} />
    </Sheet>
  )
}

function CrewBlock() {
  const [crew, setCrew] = useState(undefined)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const load = () => crewInfo(currentUser().id).then(setCrew).catch(() => setCrew(null))
  useEffect(() => { load() }, [])
  if (crew === undefined) return null
  return (
    <>
      <div className="label">Crew</div>
      {crew ? (
        <div className="tile center" style={{ padding: 20 }}>
          <div className="title" style={{ fontSize: 22 }}>{crew.name}</div>
          <div className="small" style={{ marginTop: 6 }}>{crew.members.map((m) => (m.me ? 'You' : m.name)).join(', ')}</div>
          <div className="big" style={{ fontSize: 34, marginTop: 14, letterSpacing: '0.12em' }}>{crew.code}</div>
          <div className="small" style={{ marginTop: 6 }}>Share this code. Up to six people.</div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <div className="small center">Train alongside up to five others. Everyone keeps their own plan.</div>
          <input className="field" placeholder="Crew name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Crew name" />
          <Press className="pill ink" onClick={() => createCrew(name).then(load).catch((e) => toast(e.message))}>Start a crew</Press>
          <input className="field" placeholder="Or enter a code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} aria-label="Crew code" style={{ letterSpacing: '0.12em' }} />
          <Press className="pill soft" onClick={() => joinCrew(code).then(load).catch((e) => toast(e.message))}>Join</Press>
        </div>
      )}
    </>
  )
}

// Best run of consecutive weeks on target, across all history.
function bestStreak(sessions, target) {
  const counts = {}
  for (const s of sessions) if (s.status === 'done' && !s.partOf) { const k = weekStart(new Date(s.startedAt)).getTime(); counts[k] = (counts[k] || 0) + 1 }
  const keys = Object.keys(counts).map(Number).sort((a, b) => a - b)
  if (!keys.length) return 0
  let best = 0, run = 0
  for (let t = keys[0]; t <= keys[keys.length - 1]; t += 7 * 864e5) {
    const k = keys.find((x) => Math.abs(x - t) < 2 * 3600e3)
    if (k != null && counts[k] >= target) { run++; best = Math.max(best, run) } else run = 0
  }
  return best
}

function Profile({ state }) {
  const p = state.profile
  const done = state.sessions.filter((s) => s.status === 'done' && !s.partOf)
  const mins = done.reduce((t, s) => t + Math.max(0, (new Date(s.endedAt) - new Date(s.startedAt)) / 60000), 0)
  const flows = Object.values(state.flows || {})
  const routines = flows.filter((f) => f.morning).length + flows.filter((f) => f.stretch).length
  const first = [...done].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))[0]
  const stats = [
    [done.length, done.length === 1 ? 'workout' : 'workouts'],
    [mins >= 90 ? Math.round(mins / 60) : Math.round(mins), mins >= 90 ? 'hours' : 'minutes'],
    [bestStreak(state.sessions, p.daysPerWeek), 'weeks, best run'],
  ]
  return (
    <section className="center" style={{ marginTop: 10 }}>
      <span style={{ width: 88, height: 88, borderRadius: 44, margin: '0 auto', display: 'grid', placeItems: 'center', background: 'var(--ink)', color: 'var(--paper)', font: '700 36px var(--display)', boxShadow: '-6px -6px 14px var(--hi), 7px 7px 16px var(--lo)' }}>{(p.name || 'Y')[0].toUpperCase()}</span>
      <h2 className="title" style={{ marginTop: 14, fontSize: 26 }}>{p.name || 'You'}</h2>
      <div className="small" style={{ marginTop: 4, fontSize: 15 }}>{p.mode === 'yoga' ? 'Yoga and stretch' : `${p.daysPerWeek} days a week`}{first ? ` · since ${new Date(first.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}` : ''}</div>
      <div className="tile" style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', padding: '18px 6px' }}>
        {stats.map(([v, l]) => (
          <div key={l}>
            <div className="big" style={{ fontSize: 28 }}>{v}</div>
            <div className="small" style={{ marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      {routines > 0 && <div className="small" style={{ marginTop: 10 }}>{routines} morning routines and stretches done</div>}
    </section>
  )
}
