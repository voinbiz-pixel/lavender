import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, setState, getState, currentUser, resetAll } from '../lib/store.js'
import { EQUIPMENT, EASY_ON } from '../engine/exercises.js'
import { weekStart } from '../engine/rewards.js'
import { rebuildProgram, startPlan, titleOf, waterGoal, fmtWater, waterUnit } from '../lib/actions.js'
import { cloudEnabled, crewInfo, createCrew, joinCrew, enablePush, signOut, nudgePartner, cheer, cheersSent } from '../lib/cloud.js'
import { useLive } from '../lib/live.js'
import { Page, Press, HoldPill, Sheet, Icon, toast, spring } from '../ui/kit.jsx'
import { Avatar } from '../ui/avatar.jsx'
import { LEAVES, SWATCHES } from '../ui/leaves.js'
import { totals, facts, fmtLifted, fmtDistance, distanceUnit, fmtWaterTotal, waterTotalUnit } from '../engine/stats.js'
import { haptic } from '../lib/feedback.js'
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
  const [sheet, setSheet] = useState(null)
  const cloud = cloudEnabled && signedIn
  const t = useMemo(() => totals(state, state.sessions), [state.sessions, state.water, state.flows, p.units])
  return (
    <Page title="You">
      <Header state={state} t={t} onAvatar={() => setSheet('avatar')} onName={() => setSheet('account')} />
      <Numbers t={t} best={bestStreak(state.sessions, p.trainDays?.length || p.daysPerWeek)} />
      <Crew state={state} t={t} cloud={cloud} />
      <Settings state={state} cloud={cloud} open={setSheet} />

      <AvatarSheet open={sheet === 'avatar'} onClose={() => setSheet(null)} state={state} />
      <PlanSheet open={sheet === 'plan'} onClose={() => setSheet(null)} state={state} />
      <ScheduleSheet open={sheet === 'schedule'} onClose={() => setSheet(null)} state={state} />
      <EquipmentSheet open={sheet === 'equipment'} onClose={() => setSheet(null)} state={state} />
      <MorningSheet open={sheet === 'morning'} onClose={() => setSheet(null)} state={state} />
      <WaterSheet open={sheet === 'water'} onClose={() => setSheet(null)} state={state} />
      <NotifySheet open={sheet === 'notify'} onClose={() => setSheet(null)} state={state} />
      <ThemeSheet open={sheet === 'theme'} onClose={() => setSheet(null)} state={state} />
      <AccountSheet open={sheet === 'account'} onClose={() => setSheet(null)} state={state} cloud={cloud} />
    </Page>
  )
}

const upd = (patch, rebuild = false) => {
  if (rebuild) rebuildProgram(patch)
  else setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
}

// ---------- you ----------
function Header({ state, t, onAvatar, onName }) {
  const p = state.profile
  const since = t.since ? new Date(t.since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : null
  return (
    <section className="center" style={{ marginTop: 10 }}>
      <Press className="circle flat" onClick={onAvatar} aria-label="Change your leaf" scale={0.95} style={{ width: 104, height: 104, borderRadius: 52, margin: '0 auto', display: 'grid', placeItems: 'center' }}>
        <Avatar avatar={p.avatar} size={96} />
      </Press>
      <Press className="circle flat" onClick={onName} scale={0.98} style={{ width: 'auto', height: 'auto', borderRadius: 16, margin: '14px auto 0', padding: '2px 10px', display: 'block' }} aria-label="Edit your name">
        <h2 className="title" style={{ fontSize: 28 }}>{p.name || 'You'}</h2>
      </Press>
      <div className="small" style={{ marginTop: 4, fontSize: 15 }}>{since ? `Training since ${since}` : 'Your first workout starts it all'}</div>
    </section>
  )
}

// Lifetime numbers, and one picture of them that changes when you tap it.
function Numbers({ t, best }) {
  const fs = facts(t)
  const [i, setI] = useState(0)
  const cells = [
    [fmtLifted(t), t.units, 'lifted'],
    [fmtDistance(t), distanceUnit(t), 'walked and run'],
    [String(t.workouts), '', t.workouts === 1 ? 'workout' : 'workouts'],
    [fmtWaterTotal(t), waterTotalUnit(t), 'water'],
  ]
  return (
    <>
      <div className="label">All time</div>
      <div className="tile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '6px 0' }}>
        {cells.map(([v, u, l], k) => (
          <div key={l} className="center" style={{ padding: '16px 8px', boxShadow: k > 1 ? 'inset 0 1px 0 var(--lo-2), inset 0 2px 0 color-mix(in srgb, var(--hi), transparent 40%)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 4 }}>
              <span className="big num" style={{ fontSize: 30 }}>{v}</span>
              {u && <span className="small" style={{ fontSize: 14 }}>{u}</span>}
            </div>
            <div className="small" style={{ marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      {fs.length > 0 && (
        <Press as="div" role="button" className="tile center" scale={0.98} aria-label="Next fact" onClick={() => setI((x) => (x + 1) % fs.length)}
          style={{ marginTop: 14, padding: '18px 20px', minHeight: 72, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p key={fs[i % fs.length].key} className="center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring}
              style={{ margin: 0, font: '600 17px/1.3 var(--font)', textWrap: 'balance' }}>{fs[i % fs.length].text}</motion.p>
          </AnimatePresence>
        </Press>
      )}
      {best > 1 && <div className="small center" style={{ marginTop: 12 }}>Best run: {best} weeks in a row on target</div>}
    </>
  )
}

// ---------- crew ----------
const ago = (at) => {
  if (!at) return ''
  const d = (Date.now() - new Date(at)) / 864e5
  if (d < 1 && new Date(at).toDateString() === new Date().toDateString()) return 'today'
  if (d < 2) return 'yesterday'
  if (d < 7) return new Date(at).toLocaleDateString(undefined, { weekday: 'long' })
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
function WeekDots({ days }) {
  const mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
  const set = new Set(days || [])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 18px))', justifyContent: 'center', gap: 4, marginTop: 12 }} aria-hidden>
      {LETTERS.map((l, i) => {
        const d = new Date(mon); d.setDate(mon.getDate() + i)
        const on = set.has(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)
        return <span key={i} className={on ? '' : 'well'} style={{ aspectRatio: '1', borderRadius: 999, display: 'grid', placeItems: 'center', font: '700 9px var(--font)', background: on ? 'var(--ink)' : undefined, color: on ? 'var(--paper)' : 'var(--ink-3)' }}>{l}</span>
      })}
    </div>
  )
}

function Member({ m, onNudge, onInvite, wide, live }) {
  const s = m.stats
  return (
    <div className="tile center" style={{ padding: '18px 12px 16px', gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ display: 'grid', placeItems: 'center' }}><Avatar avatar={m.avatar} size={56} /></div>
      <div style={{ font: '700 17px var(--display)', marginTop: 10, letterSpacing: '-0.02em' }}>{m.me ? 'You' : m.name}</div>
      <div className="small num" style={{ marginTop: 2 }}>{s ? `${s.week.done} of ${s.week.target} this week` : 'Not synced yet'}</div>
      <WeekDots days={s?.week?.days} />
      <div className="small" style={{ marginTop: 10, minHeight: 36, display: 'grid', alignContent: 'center', textWrap: 'balance', color: live ? 'var(--ink)' : undefined, fontWeight: live ? 700 : undefined }}>{live ? `Training now: ${live.ex}` : s?.last ? `${titleOf(s.last.title)}, ${ago(s.last.at)}` : '\u00a0'}</div>
      <Press className="chip" style={{ marginTop: 12, height: 38, fontSize: 14 }} onClick={() => (m.me ? onInvite() : onNudge(m))}>{m.me ? 'Invite' : 'Nudge'}</Press>
    </div>
  )
}

function Crew({ state, t, cloud }) {
  const [crew, setCrew] = useState(undefined)
  const [mode, setMode] = useState(null) // 'start' | 'join'
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const me = currentUser()?.id
  const live = useLive()
  const load = () => {
    if (import.meta.env.VITE_DEMO && typeof window !== 'undefined' && window.__crew) { setCrew(window.__crew); return }
    if (!cloud || !me) { setCrew(null); return }
    crewInfo(me).then(setCrew).catch(() => setCrew(null))
  }
  useEffect(() => { load() }, [cloud, me])
  useEffect(() => { if (!cloud) return; const f = () => document.visibilityState === 'visible' && load(); document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f) }, [cloud])
  const [cheered, setCheered] = useState(() => new Set())
  useEffect(() => { if (cloud && me) cheersSent(me).then(setCheered).catch(() => {}) }, [cloud, me])
  if (crew === undefined) return null
  const mine = { ...t, week: t.week, last: t.last ? { title: t.last.type === 'cardio' ? t.last.title : t.last.focus, at: t.last.startedAt } : null }
  const members = crew ? crew.members.map((m) => (m.me ? { ...m, name: state.profile.name, avatar: state.profile.avatar, stats: mine } : m)) : []
  const sum = (k) => members.reduce((x, m) => x + (+m.stats?.[k] || 0), 0)
  const together = crew ? { units: state.profile.units, lifted: sum('lifted'), distance: sum('distance'), water: sum('water'), reps: sum('reps'), minutes: sum('minutes'), workouts: sum('workouts') } : null
  const fact = together ? facts(together)[0] : null
  const nudge = (m) => { haptic('light'); nudgePartner('nudge', `${state.profile.name || 'Your crew'} says: time to train`); toast(`Nudged ${m.name}`) }
  // the invite is a link: it opens the app, and once they're signed in, they're in the crew
  const share = () => {
    const url = `${location.origin}/join/${crew.code}`
    if (navigator.share) navigator.share({ title: 'Lavender', text: `Train with me on Lavender`, url }).catch(() => {})
    else { navigator.clipboard?.writeText(url); toast('Invite link copied') }
  }
  const doCheer = (r, who) => {
    if (cheered.has(String(r.id))) return
    haptic('success')
    setCheered((x) => new Set([...x, String(r.id)]))
    const title = titleOf(r.type === 'cardio' ? r.title : r.focus || r.day_name)
    cheer(r.user_id, r.id, title, `${state.profile.name || 'Your crew'} cheered your ${title.toLowerCase()}`)
    toast(`Cheered ${who?.name || 'them'}`)
  }
  return (
    <>
      <div className="label">Crew</div>
      {crew ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: members.length === 1 ? '1fr' : '1fr 1fr', gap: 14 }}>
            {members.map((m, i) => <Member key={m.id} m={m} live={m.me ? null : live.find((x) => x.name === m.name)} onNudge={nudge} onInvite={share} wide={members.length > 1 && members.length % 2 === 1 && i === members.length - 1} />)}
          </div>
          <div className="tile center" style={{ marginTop: 14, padding: '18px 16px' }}>
            <div className="small">Together</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 10 }}>
              {[[fmtLifted(together), together.units], [fmtDistance(together), distanceUnit(together)], [String(together.workouts), 'workouts']].map(([v, l]) => (
                <div key={l}><div className="big num" style={{ fontSize: 24 }}>{v}</div><div className="small" style={{ marginTop: 2 }}>{l}</div></div>
              ))}
            </div>
            {fact && <p style={{ margin: '14px auto 0', maxWidth: 280, font: '600 15px/1.35 var(--font)', textWrap: 'balance' }}>{fact.text}, as a crew</p>}
          </div>
          {crew.recent?.length > 0 && (
            <div className="list" style={{ marginTop: 14 }}>
              {crew.recent.slice(0, 4).map((r, i) => {
                const who = crew.members.find((m) => m.id === r.user_id)
                return (
                  <Press key={i} className="li" scale={0.99} onClick={() => doCheer(r, who)} aria-label={cheered.has(String(r.id)) ? 'Cheered' : `Cheer ${who?.name || 'them'}`}>
                    <span className="t">{who?.name || 'Partner'}: {titleOf(r.type === 'cardio' ? r.title : r.focus || r.day_name)}</span>
                    <span className="s">{ago(r.ended_at)}{r.volume ? ` · ${Math.round(r.volume).toLocaleString()} ${state.profile.units}` : ''} · {cheered.has(String(r.id)) ? <b>Cheered</b> : 'Tap to cheer'}</span>
                  </Press>
                )
              })}
            </div>
          )}
          <p className="small center num" style={{ marginTop: 14 }}>Invite code <b style={{ color: 'var(--ink)', letterSpacing: '0.12em' }}>{crew.code}</b></p>
        </>
      ) : cloud ? (
        <div className="tile center" style={{ padding: '22px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <Avatar avatar={state.profile.avatar} size={48} />
            <span className="well" style={{ width: 48, height: 48, borderRadius: 24, display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}><Icon name="plus" size={20} /></span>
          </div>
          <p className="body center" style={{ margin: '14px auto 0', maxWidth: 270 }}>Train alongside up to five others. See each other’s weeks, and nudge.</p>
          {!mode && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <Press className="pill ink" style={{ height: 52 }} onClick={() => setMode('start')}>Start a crew</Press>
              <Press className="pill soft" style={{ height: 52 }} onClick={() => setMode('join')}>Join with a code</Press>
            </div>
          )}
          {mode === 'start' && (
            <div className="stack" style={{ gap: 10, marginTop: 16 }}>
              <input className="field" placeholder="Crew name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Crew name" />
              <Press className="pill ink" style={{ height: 52 }} onClick={() => createCrew(name || `${state.profile.name || 'Our'} crew`).then(load).catch((e) => toast(e.message))}>Start</Press>
            </div>
          )}
          {mode === 'join' && (
            <div className="stack" style={{ gap: 10, marginTop: 16 }}>
              <input className="field" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} aria-label="Crew code" style={{ letterSpacing: '0.12em' }} />
              <Press className="pill ink" style={{ height: 52 }} onClick={() => joinCrew(code).then(load).catch((e) => toast(e.message))}>Join</Press>
            </div>
          )}
        </div>
      ) : (
        <div className="tile center" style={{ padding: '20px 18px' }}>
          <p className="body center" style={{ margin: '0 auto', maxWidth: 270 }}>Sign in on the live app to train with your crew.</p>
        </div>
      )}
    </>
  )
}

// ---------- settings: one list, each row opens its sheet ----------
function Settings({ state, cloud, open }) {
  const p = state.profile
  const lift = p.mode !== 'yoga'
  const pw = state.plan ? planWeek(state.plan) : null
  const eqOn = EQUIPMENT.filter((e) => p.equipment?.[e.key]?.on).map((e) => e.label)
  const m = p.morning || {}
  const dayNames = (days) => days?.length === 7 ? 'Every day' : JSON.stringify([...(days || [])].sort()) === '[1,2,3,4,5]' ? 'Weekdays' : `${days?.length || 0} days`
  const rows = [
    ['plan', 'Plan', p.mode === 'yoga' ? 'Yoga and stretching' : state.plan ? `${GOAL_INFO[state.plan.goal].short} · week ${pw.week} of ${pw.weeks}` : 'Pick a goal'],
    ['schedule', 'Schedule', `${p.trainDays.length} days a week${lift ? ` · ${p.sessionMinutes} min` : ''}`],
    lift && ['equipment', 'Equipment', eqOn.length ? (eqOn.length > 3 ? `${eqOn.slice(0, 2).join(', ')} and ${eqOn.length - 2} more` : eqOn.join(', ')) : 'Bodyweight only'],
    ['morning', 'Morning routine', m.on ? `${dayNames(m.days)} at ${fmtTime(m.time || '07:00')}` : 'Off'],
    ['water', 'Water', `${fmtWater(waterGoal(state))} ${waterUnit(waterGoal(state))} a day`],
    cloud && ['notify', 'Notifications', p.reminder?.on ? `Workouts at ${fmtTime(p.reminder.time || '18:00')}` : 'Off'],
    ['theme', 'Appearance', { auto: 'Match the phone', light: 'Light', dark: 'Dark' }[state.settings?.theme || 'auto']],
    ['account', 'Account', p.name || 'Your name'],
  ].filter(Boolean)
  return (
    <>
      <div className="label">Settings</div>
      <div className="list">
        {rows.map(([k, t, s]) => (
          <Press key={k} className="li" scale={0.99} onClick={() => open(k)}>
            <span className="t">{t}</span>
            <span className="s">{s}</span>
          </Press>
        ))}
      </div>
    </>
  )
}
const fmtTime = (hm) => { const [h, m] = hm.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) }

function AvatarSheet({ open, onClose, state }) {
  const a = state.profile.avatar || { leaf: 'bud', color: 'lavender' }
  const set = (patch) => { haptic('light'); upd({ avatar: { ...a, ...patch } }) }
  return (
    <Sheet open={open} onClose={onClose} label="Your leaf">
      <div style={{ display: 'grid', placeItems: 'center', margin: '6px 0 18px' }}><Avatar avatar={a} size={112} raised={false} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }} role="radiogroup" aria-label="Leaf">
        {LEAVES.map((l) => {
          const on = a.leaf === l.key
          return (
            <Press key={l.key} role="radio" aria-checked={on} aria-label={l.name} scale={0.94} onClick={() => set({ leaf: l.key })}
              style={{ aspectRatio: '1', borderRadius: 20, display: 'grid', placeItems: 'center', background: on ? 'var(--ink)' : 'var(--glass-fill)', boxShadow: on ? 'none' : 'var(--glass-edge)', transition: 'background-color 0.34s ease' }}>
              <svg viewBox="0 0 256 256" width="60%" height="60%"><path d={l.d} fillRule="evenodd" fill={on ? 'var(--paper)' : 'var(--ink)'} style={{ transition: 'fill 0.34s ease' }} /></svg>
            </Press>
          )
        })}
      </div>
      <div className="label">Colour</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }} role="radiogroup" aria-label="Colour">
        {SWATCHES.map((s) => {
          const on = a.color === s.key
          return <Press key={s.key} role="radio" aria-checked={on} aria-label={s.name} scale={0.92} onClick={() => set({ color: s.key })}
            style={{ aspectRatio: '1', borderRadius: 999, background: s.bg, boxShadow: on ? '0 0 0 3px var(--ring-gap), 0 0 0 5px var(--ink)' : 'inset 0 1px 0 rgba(255,255,255,.3)', transition: 'box-shadow 0.3s ease' }} />
        })}
      </div>
      <p className="small center" style={{ marginTop: 18 }}>Your crew sees this next to your name.</p>
    </Sheet>
  )
}

function ScheduleSheet({ open, onClose, state }) {
  const p = state.profile
  return (
    <Sheet open={open} onClose={onClose} label="Schedule">
      <div className="label" style={{ marginTop: 10 }}>Days a week</div>
      <Chips grid label="Days a week" value={p.daysPerWeek} onChange={(n) => upd({ daysPerWeek: n, trainDays: DAY_PRESETS[n] }, true)} options={[2, 3, 4, 5, 6].map((n) => [String(n), n])} />
      <div className="label">Which days</div>
      <Chips multi label="Which days" value={p.trainDays} onChange={(trainDays) => { const n = Math.max(2, Math.min(6, trainDays.length)); upd({ trainDays, daysPerWeek: n }, n !== p.daysPerWeek) }} options={WEEK} />
      {p.mode !== 'yoga' && (
        <>
          <div className="label">Time per workout</div>
          <Chips grid label="Time per workout" value={p.sessionMinutes} onChange={(sessionMinutes) => upd({ sessionMinutes }, true)} options={[30, 45, 60, 75].map((n) => [`${n} min`, n])} />
          <p className="small center" style={{ marginTop: 14 }}>Shorter workouts pair moves back and forth, so less gets cut.</p>
        </>
      )}
    </Sheet>
  )
}

function EquipmentSheet({ open, onClose, state }) {
  const p = state.profile
  return (
    <Sheet open={open} onClose={onClose} label="Equipment">
      <div style={{ marginTop: 10 }}><EquipmentPicker equipment={p.equipment} onChange={(equipment) => upd({ equipment }, true)} /></div>
      <div className="label">Go easy on</div>
      <Chips multi cols={2} label="Go easy on" value={p.easyOn} onChange={(easyOn) => upd({ easyOn }, true)} options={EASY_ON.map((e) => [e.label, e.key])} />
    </Sheet>
  )
}

function MorningSheet({ open, onClose, state }) {
  const m = state.profile.morning || {}
  return (
    <Sheet open={open} onClose={onClose} label="Morning routine">
      <p className="small center" style={{ marginTop: 6 }}>Six minutes: water, a little mobility, a minute of breathing.</p>
      <div style={{ marginTop: 16 }}><Chips grid label="Morning routine" value={!!m.on} onChange={(on) => upd({ morning: { ...m, on } })} options={[['Off', false], ['On', true]]} /></div>
      {m.on && (
        <>
          <div className="label">On these mornings</div>
          <Chips multi label="Morning routine days" value={m.days || []} onChange={(days) => upd({ morning: { ...m, days } })} options={WEEK} />
          <div className="label">Remind me at</div>
          <input className="field" type="time" value={m.time || '07:00'} onChange={(e) => upd({ morning: { ...m, time: e.target.value } })} aria-label="Morning reminder time" />
        </>
      )}
    </Sheet>
  )
}

function WaterSheet({ open, onClose, state }) {
  const p = state.profile
  const bw = state.bodyweight?.[0]?.value
  return (
    <Sheet open={open} onClose={onClose} label="Water">
      <div className="center" style={{ margin: '10px 0 4px' }}>
        <span className="big num">{fmtWater(waterGoal(state))}</span> <span className="small" style={{ fontSize: 17 }}>{waterUnit(waterGoal(state))} a day</span>
      </div>
      <p className="small center" style={{ marginTop: 6 }}>More on training days. Your body weight sets the base.</p>
      <div className="label">Body weight</div>
      <input className="field" inputMode="decimal" placeholder={p.units} defaultValue={bw ?? ''} aria-label={`Body weight in ${p.units}`}
        onBlur={(e) => { const v = parseFloat(e.target.value); if (v > 30 && v < 500) setState((s) => ({ ...s, bodyweight: [{ value: v, at: new Date().toISOString() }, ...(s.bodyweight || [])] })) }} />
    </Sheet>
  )
}

function NotifySheet({ open, onClose, state }) {
  const p = state.profile
  return (
    <Sheet open={open} onClose={onClose} label="Notifications">
      <div className="label" style={{ marginTop: 10 }}>Workout reminder</div>
      <p className="small center" style={{ marginBottom: 10 }}>On training days you haven’t trained yet</p>
      <Chips grid label="Workout reminder" value={!!p.reminder?.on} onChange={(on) => upd({ reminder: { ...p.reminder, on } })} options={[['Off', false], ['On', true]]} />
      {p.reminder?.on && <input className="field" type="time" style={{ marginTop: 12 }} value={p.reminder.time || '18:00'} onChange={(e) => upd({ reminder: { ...p.reminder, time: e.target.value } })} aria-label="Workout reminder time" />}
      <div className="label">Water check</div>
      <p className="small center" style={{ marginBottom: 10 }}>At 3 pm, only if you’re behind</p>
      <Chips grid label="Water check" value={p.waterNudge !== false} onChange={(waterNudge) => upd({ waterNudge })} options={[['Off', false], ['On', true]]} />
      <Press className="pill soft" style={{ marginTop: 22 }} onClick={() => enablePush(currentUser()?.id).then(() => toast('Notifications on')).catch((e) => toast(e.message))}>Allow on this phone</Press>
    </Sheet>
  )
}

function ThemeSheet({ open, onClose, state }) {
  const v = state.settings?.theme || 'auto'
  return (
    <Sheet open={open} onClose={onClose} label="Appearance">
      <div style={{ marginTop: 14 }}>
        <Chips grid label="Appearance" value={v} onChange={(theme) => setState((s) => ({ ...s, settings: { ...s.settings, theme } }))} options={[['Light', 'light'], ['Dark', 'dark'], ['Auto', 'auto']]} />
      </div>
      <p className="small center" style={{ marginTop: 14 }}>Auto follows your phone, light by day and dark at night.</p>
    </Sheet>
  )
}

function AccountSheet({ open, onClose, state, cloud }) {
  const p = state.profile
  return (
    <Sheet open={open} onClose={onClose} label="Account">
      <div className="label" style={{ marginTop: 10 }}>Name</div>
      <input className="field" value={p.name} onChange={(e) => upd({ name: e.target.value })} maxLength={24} aria-label="Name" autoComplete="given-name" />
      <div className="stack" style={{ gap: 10, marginTop: 28 }}>
        {cloud && <Press className="pill soft" onClick={() => signOut()}>Sign out</Press>}
        <HoldPill label="Hold to start over" tone="soft" onComplete={() => resetAll()} />
      </div>
      <p className="small center" style={{ marginTop: 12 }}>Starting over clears this phone{cloud ? ' and your synced copy' : ''}.</p>
    </Sheet>
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

