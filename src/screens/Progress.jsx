import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore, dayKey, removeSession } from '../lib/store.js'
import { streak, liftGains, weekStart } from '../engine/rewards.js'
import { titleOf, waterGoal, fmtWater, waterUnit } from '../lib/actions.js'
import { BY_ID } from '../engine/exercises.js'
import { Page, Sheet, Press, Menu, useLongPress, springPop, toast, fmtClock } from '../ui/kit.jsx'
import { GOAL_INFO, planWeek, planPromise, planTips, TYPE_LABEL } from '../engine/plan.js'

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Progress() {
  const state = useStore()
  const p = state.profile
  const done = state.sessions.filter((s) => s.status === 'done' && !s.partOf)
  const st = streak(state.sessions, p.daysPerWeek)
  const gains = useMemo(() => liftGains(state.sessions).slice(0, 6), [done.length])
  const mon = weekStart(new Date())
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
  const today = dayKey()
  const goal = waterGoal(state)
  const waterOn = (d) => Math.min(goal, (state.water || []).filter((w) => dayKey(w.at) === dayKey(d)).reduce((t, w) => t + w.ml, 0))
  const flowOn = (d) => state.flows[dayKey(d)] || {}
  const prs = done.flatMap((s) => (s.prs || []).map((r) => ({ ...r, date: s.startedAt }))).slice(0, 5)

  return (
    <Page title="Progress">
      <div className="center" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6 }}>
          <span className="big" style={{ fontSize: 56 }}>{st.thisWeek}</span>
          <span className="small" style={{ fontSize: 17 }}>of {st.target} this week</span>
        </div>
        <div className="small" style={{ marginTop: 6, fontSize: 15 }}>{st.weeks ? `${st.weeks} ${st.weeks === 1 ? 'week' : 'weeks'} in a row on target` : st.thisWeek >= st.target ? 'On target this week' : `${st.target - st.thisWeek} more to hit this week`}</div>
      </div>

      {state.plan && p.mode !== 'yoga' && <PlanTile state={state} />}

      <div className="label">This week</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
        {days.map((d, i) => {
          const trained = done.some((s) => dayKey(s.startedAt) === dayKey(d))
          const planned = p.trainDays.includes(d.getDay())
          const isToday = dayKey(d) === today
          const f = flowOn(d)
          const w = Math.min(1, waterOn(d) / goal)
          return (
            <div key={i} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
              <span className={trained ? '' : 'well'} style={{ width: '100%', height: 96, borderRadius: 18, background: trained ? 'var(--ink)' : undefined, opacity: trained || planned ? 1 : 0.5, boxShadow: isToday && !trained ? 'inset 0 0 0 2px var(--ink)' : undefined, position: 'relative', overflow: 'hidden', display: 'block' }}>
                <motion.span initial={{ height: 0 }} animate={{ height: `${w * 100}%` }} transition={springPop}
                  style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: trained ? 'rgba(255,255,255,.22)' : 'rgba(63,127,214,.3)', display: 'block' }} />
              </span>
              <span className="small" style={{ fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--ink)' : undefined }}>{LETTERS[i]}</span>
              <span aria-hidden style={{ height: 6, display: 'flex', gap: 3 }}>
                {f.morning && <i style={{ width: 6, height: 6, borderRadius: 3, background: '#B59A63' }} />}
                {f.stretch && <i style={{ width: 6, height: 6, borderRadius: 3, background: '#7D7FA6' }} />}
              </span>
            </div>
          )
        })}
      </div>
      <p className="small center" style={{ marginTop: 12 }}>Solid: trained. Blue fill: water. Dots: morning routine and stretch.</p>

      <div className="label">Stronger since you started</div>
      {gains.length ? (
        <div className="list">
          {gains.map((g) => (
            <div key={g.ex.id} className="li">
              <span className="t">{g.ex.name}</span>
              <span className="s num"><b>{g.gain >= 0 ? '+' : ''}{g.gain}%</b> · {g.points.length} sessions</span>
            </div>
          ))}
        </div>
      ) : <div className="list"><div className="li"><span className="s">Each lift shows up here after two sessions.</span></div></div>}

      <div className="label">Water, last two weeks</div>
      <WaterBars state={state} goal={goal} />

      {prs.length > 0 && (
        <>
          <div className="label">New bests</div>
          <div className="list">
            {prs.map((r, i) => (
              <div key={i} className="li">
                <span className="t">{BY_ID[r.exerciseId]?.name}</span>
                <span className="s num"><b>{r.kind === 'reps' ? `${r.value} reps` : r.kind === 'e1rm' ? `~${r.value} max` : `${r.value} ${p.units}`}</b> · was {r.prev} · {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="label">Recent</div>
      {done.length ? (
        <div className="list">{done.slice(0, 12).map((s) => <HistoryRow key={s.id} s={s} />)}</div>
      ) : <div className="list"><div className="li"><span className="s">Your workouts collect here.</span></div></div>}
    </Page>
  )
}

// The plan at a glance: every week as a bar (taller is harder, short is an easy week), where you are,
// what the plan is for, and your fitness tests side by side.
function PlanTile({ state }) {
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
      <div className="tile center" style={{ padding: '20px 16px 18px' }}>
        <div className="title" style={{ fontSize: 22 }}>{GOAL_INFO[plan.goal].label}</div>
        <div className="small" style={{ marginTop: 4, fontSize: 15 }}>Week {pw.week} of {pw.weeks} · {pw.label}</div>
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
        {planTips(plan, state).map((t, i) => <p key={i} className="small center" style={{ margin: '10px auto 0', maxWidth: 300 }}>{t}</p>)}
      </div>
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
function WaterBars({ state, goal }) {
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return d })
  const amt = (d) => Math.min(goal, (state.water || []).filter((w) => dayKey(w.at) === dayKey(d)).reduce((t, w) => t + w.ml, 0))
  const vals = days.map(amt)
  const met = vals.filter((v) => v >= goal).length
  return (
    <div className="tile" style={{ padding: '18px 16px 14px' }}>
      <div style={{ height: 96, display: 'grid', gridTemplateColumns: 'repeat(14, minmax(0, 1fr))', gap: 6 }}>
        {vals.map((v, i) => (
          <span key={i} className="well" style={{ position: 'relative', borderRadius: 7, overflow: 'hidden', display: 'block' }}>
            <motion.span initial={{ height: 0 }} animate={{ height: `${Math.min(1, v / goal) * 100}%` }} transition={{ ...springPop, delay: 0.02 * i }}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 7, background: v >= goal ? 'var(--ink)' : 'var(--ink-3)', display: 'block' }} />
          </span>
        ))}
      </div>
      <div className="small center" style={{ marginTop: 12 }}>Target met {met} of 14 days · today {fmtWater(vals[13])} {waterUnit(vals[13])}</div>
    </div>
  )
}
