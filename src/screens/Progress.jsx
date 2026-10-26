import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore, dayKey, removeSession } from '../lib/store.js'
import { streak, liftGains, weekStart } from '../engine/rewards.js'
import { titleOf, waterGoal, fmtWater, waterUnit } from '../lib/actions.js'
import { BY_ID } from '../engine/exercises.js'
import { Page, Sheet, Press, Menu, useLongPress, springPop, toast, fmtClock } from '../ui/kit.jsx'
import { WeekSheet, openExercise } from '../ui/explain.jsx'
import { WEEK_MEANING } from '../engine/purpose.js'
import { GOAL_INFO, planWeek, planPromise, planTips, TYPE_LABEL } from '../engine/plan.js'

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Progress() {
  const state = useStore()
  const p = state.profile
  const done = state.sessions.filter((s) => s.status === 'done' && !s.partOf)
  const st = streak(state.sessions, p.daysPerWeek)
  const gains = useMemo(() => liftGains(state.sessions), [done.length])
  const [sheet, setSheet] = useState(null) // 'lifts' | 'water' | 'history'
  const mon = weekStart(new Date())
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
  const today = dayKey()
  const goal = waterGoal(state)
  const water = waterDays(state, goal)
  const avg = gains.length ? Math.round(gains.reduce((t, g) => t + g.gain, 0) / gains.length) : null
  const prs = done.flatMap((s) => (s.prs || []).map((r) => ({ ...r, date: s.startedAt })))

  return (
    <Page title="Progress">
      <div className="center" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6 }}>
          <span className="big" style={{ fontSize: 56 }}>{st.thisWeek}</span>
          <span className="small" style={{ fontSize: 17 }}>of {st.target} this week</span>
        </div>
        <div className="small" style={{ marginTop: 6, fontSize: 15 }}>{st.weeks ? `${st.weeks} ${st.weeks === 1 ? 'week' : 'weeks'} in a row on target` : st.thisWeek >= st.target ? 'On target this week' : `${st.target - st.thisWeek} more to hit this week`}</div>
      </div>

      {/* the week: solid where you trained, pressed in where a session is planned */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8, marginTop: 20 }} aria-label="This week">
        {days.map((d, i) => {
          const trained = done.some((s) => dayKey(s.startedAt) === dayKey(d))
          const planned = p.trainDays.includes(d.getDay())
          const isToday = dayKey(d) === today
          return (
            <span key={i} className={trained ? '' : planned ? 'well' : ''} aria-label={`${d.toLocaleDateString(undefined, { weekday: 'long' })}${trained ? ', trained' : planned ? ', planned' : ''}`}
              style={{ aspectRatio: '1', borderRadius: 999, display: 'grid', placeItems: 'center', font: `${isToday ? 700 : 600} 13px var(--font)`, background: trained ? 'var(--ink)' : undefined, color: trained ? 'var(--paper)' : planned || isToday ? 'var(--ink)' : 'var(--ink-3)', boxShadow: isToday && !trained ? 'inset 0 0 0 2px var(--ink)' : undefined }}>
              {LETTERS[i]}
            </span>
          )
        })}
      </div>

      {state.plan && p.mode !== 'yoga' && <PlanTile state={state} />}

      {/* two numbers, each opening its detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 28 }}>
        <Press as="div" role="button" className="tile center" scale={0.98} onClick={() => setSheet('lifts')} style={{ padding: '18px 10px 16px', display: 'grid', alignContent: 'center', gap: 4, minHeight: 132 }}>
          <span className="big num" style={{ fontSize: 34 }}>{avg == null ? '–' : `${avg >= 0 ? '+' : ''}${avg}%`}</span>
          <span className="small">{avg == null ? 'Strength, after two sessions' : `Stronger, ${gains.length} ${gains.length === 1 ? 'lift' : 'lifts'}`}</span>
        </Press>
        <Press as="div" role="button" className="tile center" scale={0.98} onClick={() => setSheet('water')} style={{ padding: '18px 14px 16px', display: 'grid', alignContent: 'center', gap: 8, minHeight: 132 }}>
          <MiniBars vals={water.vals.slice(-7)} goal={goal} />
          <span className="small">Water, {water.met7} of 7 days</span>
        </Press>
      </div>

      <div className="label">Recent</div>
      {done.length ? (
        <>
          <div className="list">{done.slice(0, 3).map((s) => <HistoryRow key={s.id} s={s} />)}</div>
          {done.length > 3 && <div className="center" style={{ marginTop: 14 }}><Press className="chip" onClick={() => setSheet('history')}>All {done.length} workouts</Press></div>}
        </>
      ) : <div className="list"><div className="li"><span className="s">Your workouts collect here.</span></div></div>}

      <Sheet open={sheet === 'lifts'} onClose={() => setSheet(null)} label="Stronger since you started">
        {gains.length ? (
          <div className="list">
            {gains.map((g) => (
              <Press key={g.ex.id} className="li" scale={0.99} onClick={() => openExercise(g.ex.id)}>
                <span className="t">{g.ex.name}</span>
                <span className="s num"><b>{g.gain >= 0 ? '+' : ''}{g.gain}%</b> · {g.points.length} sessions{g.prs ? ` · ${g.prs} ${g.prs === 1 ? 'best' : 'bests'}` : ''}</span>
              </Press>
            ))}
          </div>
        ) : <p className="body center">Each lift shows up here after two sessions.</p>}
        {prs.length > 0 && (
          <>
            <div className="label">New bests</div>
            <div className="list">
              {prs.slice(0, 8).map((r, i) => (
                <div key={i} className="li">
                  <span className="t">{BY_ID[r.exerciseId]?.name}</span>
                  <span className="s num"><b>{r.kind === 'reps' ? `${r.value} reps` : r.kind === 'e1rm' ? `~${r.value} max` : `${r.value} ${p.units}`}</b> · was {r.prev} · {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Sheet>
      <Sheet open={sheet === 'water'} onClose={() => setSheet(null)} label="Water">
        <WaterBars vals={water.vals} goal={goal} />
        <p className="small center" style={{ marginTop: 14 }}>Target met {water.met} of 14 days</p>
        <div className="list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 18 }}>
          {[['Today', water.vals[13]], ['Daily average', water.vals.reduce((t, v) => t + v, 0) / 14], ['Target', goal], ['Best day', Math.max(...water.vals)]].map(([k, v]) => (
            <div key={k} className="li" style={{ boxShadow: "none" }}><span className="t num">{fmtWater(v)} {waterUnit(v)}</span><span className="s">{k}</span></div>
          ))}
        </div>
      </Sheet>
      <Sheet open={sheet === 'history'} onClose={() => setSheet(null)} label="Workouts">
        <div className="list">{done.slice(0, 60).map((s) => <HistoryRow key={s.id} s={s} />)}</div>
        <p className="small center" style={{ marginTop: 14 }}>Hold a workout to delete it.</p>
      </Sheet>
    </Page>
  )
}

const waterDays = (state, goal) => {
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return dayKey(d) })
  const by = {}
  for (const w of state.water || []) { const k = dayKey(w.at); by[k] = (by[k] || 0) + w.ml }
  const vals = days.map((k) => Math.min(goal, by[k] || 0))
  return { vals, met: vals.filter((v) => v >= goal).length, met7: vals.slice(-7).filter((v) => v >= goal).length }
}

function MiniBars({ vals, goal }) {
  return (
    <div style={{ height: 52, display: 'grid', gridTemplateColumns: `repeat(${vals.length}, minmax(0, 1fr))`, gap: 5, margin: '0 6px' }} aria-hidden>
      {vals.map((v, i) => (
        <span key={i} className="well" style={{ position: 'relative', borderRadius: 5, overflow: 'hidden', display: 'block' }}>
          <motion.span initial={{ scaleY: 0 }} animate={{ scaleY: Math.min(1, v / goal) }} transition={{ ...springPop, delay: 0.03 * i }}
            style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', borderRadius: 5, background: v >= goal ? 'var(--ink)' : 'var(--ink-3)', display: 'block' }} />
        </span>
      ))}
    </div>
  )
}

// The plan at a glance: every week as a bar (taller is harder, short is an easy week), where you are,
// what the plan is for, and your fitness tests side by side.
function PlanTile({ state }) {
  const [open, setOpen] = useState(false)
  const plan = state.plan
  const pw = planWeek(plan)
  const H = { build: 0.55, push: 1, easy: 0.3, test: 0.42 }
  const tests = state.sessions.filter((x) => x.type === 'cardio' && x.test && x.planId === plan.id).sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
  const u = state.profile.units === 'kg' ? 'km' : 'mi'
  const fmtT = (t) => (t.kind === 'cooper' ? `${t.value.toFixed(2)} ${u}` : fmtClock(t.value))
  let ramp = 0
  return (
    <>
      <div className="label">Your plan</div>
      <Press as="div" role="button" className="tile center" scale={0.98} onClick={() => setOpen(true)} aria-label="How the plan works" style={{ padding: '20px 16px 18px' }}>
        <div className="title" style={{ fontSize: 22 }}>{GOAL_INFO[plan.goal].label}</div>
        <div className="small" style={{ marginTop: 4, fontSize: 15 }}>Week {pw.week} of {pw.weeks} · {pw.label}, {WEEK_MEANING[pw.type].short}</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pw.weeks}, minmax(0, 1fr))`, gap: 5, alignItems: 'end', height: 64, margin: '16px 4px 0' }} aria-hidden>
          {pw.types.map((t, i) => {
            ramp = t === 'build' ? ramp + 1 : 0
            const h = t === 'build' ? 0.4 + 0.12 * Math.min(3, ramp) : H[t]
            const w = i + 1
            return <span key={i} className={w > pw.week ? 'well' : ''} style={{ height: Math.round(64 * h), borderRadius: 6, display: 'block', background: w === pw.week ? 'var(--ink)' : w < pw.week ? 'var(--ink-3)' : undefined }} />
          })}
        </div>
        <p className="center" style={{ margin: '16px auto 0', maxWidth: 290, font: '600 15px/1.35 var(--font)', textWrap: 'balance' }}>{planPromise(plan, state)}</p>
        {tests.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: tests.length > 1 ? '1fr 1fr' : '1fr', marginTop: 14 }}>
            <div><div style={{ font: '700 20px var(--display)' }} className="num">{fmtT(tests[0].test)}</div><div className="small">first test</div></div>
            {tests.length > 1 && <div><div style={{ font: '700 20px var(--display)' }} className="num">{fmtT(tests[tests.length - 1].test)}</div><div className="small">latest</div></div>}
          </div>
        )}
        {planTips(plan, state).slice(0, 1).map((t, i) => <p key={i} className="small center" style={{ margin: '10px auto 0', maxWidth: 300 }}>{t}</p>)}
      </Press>
      <WeekSheet open={open} onClose={() => setOpen(false)} pw={pw} />
    </>
  )
}

function HistoryRow({ s }) {
  const [menu, setMenu] = useState(null)
  const lp = useLongPress((r) => setMenu(r))
  const mins = Math.max(1, Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 60000))
  return (
    <>
      <Press as="div" className="li" {...lp} scale={0.99}>
        <span className="t">{s.type === 'cardio' ? s.title : titleOf(s.focus)}</span>
        <span className="s">{new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {mins} min{s.prs?.length ? ` · ${s.prs.length} new ${s.prs.length === 1 ? 'best' : 'bests'}` : ''}</span>
      </Press>
      <Menu anchor={menu} onClose={() => setMenu(null)} items={[{ label: 'Delete this workout', onSelect: () => { removeSession(s.id); toast('Deleted') } }]} />
    </>
  )
}

// Fourteen days of water: each track is the day's target, filled to what was drunk.
function WaterBars({ vals, goal }) {
  return (
    <div style={{ height: 120, display: 'grid', gridTemplateColumns: 'repeat(14, minmax(0, 1fr))', gap: 6 }} aria-hidden>
      {vals.map((v, i) => (
        <span key={i} style={{ position: 'relative', borderRadius: 7, overflow: 'hidden', display: 'block', background: 'var(--glass-track)' }}>
          <motion.span initial={{ scaleY: 0 }} animate={{ scaleY: Math.min(1, v / goal) }} transition={{ ...springPop, delay: 0.02 * i }}
            style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', borderRadius: 7, background: v >= goal ? 'var(--ink)' : 'var(--ink-3)', display: 'block' }} />
        </span>
      ))}
    </div>
  )
}
