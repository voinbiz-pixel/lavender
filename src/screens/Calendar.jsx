import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, dayKey } from '../lib/store.js'
import { BY_ID } from '../engine/exercises.js'
import { flowByKey } from '../engine/routines.js'
import { titleOf, waterGoal, fmtWater, waterUnit } from '../lib/actions.js'
import { Page, Sheet, Press, Icon, spring } from '../ui/kit.jsx'
import { forecast, sessionSlots, suggest } from '../engine/program.js'
import { cardioSession, sessionMinutes, ZONES } from '../engine/plan.js'
import { SegmentBars, Zones } from './Cardio.jsx'
import { targetLabel } from './Session.jsx'

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// A month of days. Solid: trained. Striped: stretched. A dot under the number: morning routine. A line: water target met.
export default function Calendar() {
  const state = useStore()
  const now = new Date()
  const [offset, setOffset] = useState(0)
  const [dir, setDir] = useState(1)
  const [day, setDay] = useState(null)
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1))]
  while (cells.length % 7) cells.push(null)
  const done = state.sessions.filter((s) => s.status === 'done')
  const goal = waterGoal(state)
  const info = (d) => {
    const k = dayKey(d)
    const water = Math.min(goal, (state.water || []).filter((w) => dayKey(w.at) === k).reduce((t, w) => t + w.ml, 0))
    return { k, workouts: done.filter((s) => dayKey(s.startedAt) === k), flows: state.flows[k] || {}, water }
  }
  const month = cells.filter(Boolean).map(info)
  const nW = month.filter((x) => x.workouts.length).length
  const nS = month.filter((x) => x.flows.stretch).length
  const nM = month.filter((x) => x.flows.morning).length
  // what's planned for every coming day, as far as the plan goes
  const fc = useMemo(() => forecast(state, now), [state.sessions, state.plan, state.program, state.profile.trainDays, dayKey(now)])
  const lastPlanned = Object.keys(fc).reduce((m, k) => Math.max(m, new Date(k).getTime()), 0)
  const maxOffset = lastPlanned ? (new Date(lastPlanned).getFullYear() - now.getFullYear()) * 12 + new Date(lastPlanned).getMonth() - now.getMonth() : 0
  const [planned, setPlanned] = useState(null)
  const go = (d) => { setDir(d); setOffset((o) => Math.min(maxOffset, o + d)) }
  const monthPlan = cells.filter(Boolean).map((d) => fc[d.toDateString()]).filter(Boolean)
  const pL = monthPlan.filter((x) => x.desc.kind === 'lift').length
  const pC = monthPlan.filter((x) => x.desc.kind === 'cardio').length
  const pT = monthPlan.filter((x) => x.desc.test).length

  return (
    <Page title="Calendar">
      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center', marginTop: 8 }}>
        <Press className="circle" onClick={() => go(-1)} aria-label="Previous month"><Icon name="chevL" size={18} /></Press>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div key={offset} className="center" custom={dir} variants={{ a: (d) => ({ opacity: 0, x: 24 * d }), b: { opacity: 1, x: 0 }, c: (d) => ({ opacity: 0, x: -24 * d }) }} initial="a" animate="b" exit="c" transition={spring}
            style={{ font: '700 20px var(--display)', letterSpacing: '-0.02em' }}>
            {first.toLocaleDateString(undefined, { month: 'long', year: offset === 0 ? undefined : 'numeric' })}
          </motion.div>
        </AnimatePresence>
        <Press className="circle" onClick={() => go(1)} aria-label="Next month" style={{ opacity: offset < maxOffset ? 1 : 0.35, transition: 'opacity .4s' }} disabled={offset >= maxOffset}><Icon name="chevR" size={18} /></Press>
      </div>

      <div className="tile" style={{ marginTop: 16, padding: '16px 10px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginBottom: 6 }} aria-hidden>
          {LETTERS.map((l, i) => <span key={i} className="small center" style={{ fontSize: 12 }}>{l}</span>)}
        </div>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div key={offset} custom={dir} variants={{ a: (d) => ({ opacity: 0, x: 40 * d }), b: { opacity: 1, x: 0 }, c: (d) => ({ opacity: 0, x: -40 * d }) }} initial="a" animate="b" exit="c" transition={spring}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', rowGap: 4 }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={(_, i) => { if (i.offset.x > 60 || i.velocity.x > 500) go(-1); else if ((i.offset.x < -60 || i.velocity.x < -500) && offset < maxOffset) go(1) }}>
            {cells.map((d, i) => {
              if (!d) return <span key={i} />
              const x = info(d)
              const isToday = x.k === dayKey(now)
              const future = d > now && !isToday
              const trained = x.workouts.length > 0
              const stretched = !!x.flows.stretch
              const plan = !trained ? fc[x.k] : null
              const off = future && !plan
              return (
                <Press key={i} onClick={() => (plan ? setPlanned({ d, ...plan }) : !future && setDay(d))} scale={0.92} disabled={off}
                  aria-label={`${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${trained ? ', trained' : ''}${stretched ? ', stretched' : ''}${x.flows.morning ? ', morning routine' : ''}${plan ? ', planned' : ''}`}
                  style={{ height: 52, display: 'grid', justifyItems: 'center', alignContent: 'start', gap: 3, opacity: off ? 0.35 : 1 }}>
                  <span className={!trained && stretched ? 'well' : ''} style={{ width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center', font: `${isToday ? 700 : 500} 15px var(--font)`,
                    background: trained ? 'var(--ink)' : undefined, color: trained ? 'var(--paper)' : 'var(--ink)', boxShadow: isToday && !trained ? 'inset 0 0 0 2px var(--ink)' : plan ? 'inset 0 0 0 1.5px var(--ink-3)' : undefined }}>{d.getDate()}</span>
                  <span style={{ display: 'flex', gap: 3, height: 5 }} aria-hidden>
                    {x.flows.morning && <i style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--ink)' }} />}
                    {x.water >= goal && <i style={{ width: 10, height: 5, borderRadius: 3, background: 'var(--water)' }} />}
                  </span>
                </Press>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="small center" style={{ marginTop: 12 }}>Solid: trained · Ring: planned · Pressed in: stretched<br />Dot: morning · Blue: water target met</p>

      <div className="tile" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', padding: '16px 6px' }}>
        {(offset > 0
          ? [[pL, 'lifting days'], [pC, 'cardio days'], [pT, pT === 1 ? 'fitness test' : 'fitness tests']].map(([v, l]) => [v, l, 'planned'])
          : [[nW, nW === 1 ? 'workout' : 'workouts'], [nS, nS === 1 ? 'stretch' : 'stretches'], [nM, nM === 1 ? 'morning' : 'mornings']].map(([v, l]) => [v, l, 'this month'])
        ).map(([v, l, tail]) => (
          <div key={l} className="center"><div className="big" style={{ fontSize: 28 }}>{v}</div><div className="small" style={{ marginTop: 4 }}>{l} {tail}</div></div>
        ))}
      </div>

      <DaySheet day={day} onClose={() => setDay(null)} info={day ? info(day) : null} state={state} goal={goal} />
      <PlannedSheet planned={planned} onClose={() => setPlanned(null)} state={state} />
    </Page>
  )
}

function DaySheet({ day, onClose, info, state, goal }) {
  const units = state.profile.units
  return (
    <Sheet open={!!day} onClose={onClose} label={day?.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}>
      {info && (
        <div className="stack" style={{ gap: 12, marginTop: 14 }}>
          {info.workouts.map((s) => {
            const mins = Math.max(1, Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 60000))
            return (
              <section key={s.id} className="list">
                <div className="li"><span className="t" style={{ font: '700 18px var(--display)' }}>{s.type === 'cardio' ? s.title : titleOf(s.focus)}</span><span className="s">{mins} min{s.prs?.length ? ` · ${s.prs.length} new ${s.prs.length === 1 ? 'best' : 'bests'}` : ''}{s.type === 'cardio' && s.feel ? ` · felt ${s.feel}` : ''}</span></div>
                {s.entries.map((e) => {
                  const work = e.sets.filter((x) => x.kind === 'work' && x.done)
                  if (!work.length) return null
                  const w = work[work.length - 1].weight
                  return (
                    <div key={e.id} className="li">
                      <span className="t" style={{ fontWeight: 500, fontSize: 15 }}>{BY_ID[e.exerciseId]?.name}</span>
                      <span className="s num">{work.map((x) => x.reps).join(', ')}{w ? ` at ${w} ${units}` : ''}</span>
                    </div>
                  )
                })}
              </section>
            )
          })}
          <div className="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', padding: '14px 4px' }}>
            {[[info.flows.morning ? 'Done' : 'No', 'morning'], [info.flows.stretch ? flowByKey(info.flows.stretch).name.split(' ')[0] : 'No', 'stretch'], [`${fmtWater(info.water)} ${waterUnit(info.water)}`, `of ${fmtWater(goal)} water`]].map(([v, l]) => (
              <div key={l} className="center"><div style={{ font: '700 18px var(--display)', letterSpacing: '-0.02em' }}>{v}</div><div className="small" style={{ marginTop: 3 }}>{l}</div></div>
            ))}
          </div>
          {!info.workouts.length && <p className="small center">No workout logged this day.</p>}
        </div>
      )}
    </Sheet>
  )
}

// A coming day: what the plan has for it. Lifting targets are what you'd get if nothing changes before then;
// they update after every session.
function PlannedSheet({ planned, onClose, state }) {
  const [keep, setKeep] = useState(null)
  const p = planned || keep
  if (planned && planned !== keep) setKeep(planned)
  let body = null
  if (p) {
    const { desc, pw } = p
    const head = (title, sub, extra, kicker) => (
      <div className="center" style={{ marginTop: 4 }}>
        {kicker && <div className="kicker" style={{ marginBottom: 4 }}>{kicker}</div>}
        <div className="title" style={{ fontSize: 28 }}>{title}</div>
        <div className="small" style={{ marginTop: 6, fontSize: 15 }}>{sub}</div>
        {extra && <div className="small" style={{ marginTop: 3 }}>{extra}</div>}
      </div>
    )
    const wk = pw ? `Week ${pw.week} of ${pw.weeks} · ${pw.label}` : 'Planned'
    if (desc.kind === 'cardio') {
      const c = cardioSession(state, desc, pw)
      const rows = []
      for (const s of c.segments) {
        const last = rows[rows.length - 1]
        const name = s.label || ZONES[s.zone].label
        if (last && last.zone === s.zone && last.name === name) { last.secs += s.secs; continue }
        rows.push({ name, zone: s.zone, secs: s.secs, incline: s.incline, open: s.open })
      }
      body = (
        <>
          {head(c.title, `${wk} · ${sessionMinutes(c)} min`, c.sub)}
          <div style={{ marginTop: 20 }}><SegmentBars segments={c.segments} height={90} /></div>
          <Zones state={state} segments={c.segments} />
          <div className="list" style={{ marginTop: 18 }}>
            {rows.map((r, i) => (
              <div key={i} className="li">
                <span className="t" style={{ fontSize: 15 }}>{r.name}</span>
                <span className="s num">{r.open ? 'until you finish' : `${Math.round(r.secs / 60)} min`}{r.name !== ZONES[r.zone].label ? ` · ${ZONES[r.zone].label.toLowerCase()}` : ''}{r.incline ? ` · ${r.incline}% incline` : ''}</span>
              </div>
            ))}
          </div>
        </>
      )
    } else if (state.program) {
      const day = state.program.days[p.dayIdx ?? 0]
      const slots = sessionSlots(state, p.dayIdx ?? 0, { desc })
      const deload = pw ? pw.type === 'easy' || pw.type === 'test' : false
      const extras = [desc.core && 'core', desc.finisher && 'a treadmill finisher'].filter(Boolean)
      const fin = desc.finisher ? cardioSession(state, desc, pw, { finisher: true }) : null
      body = (
        <>
          {head(titleOf(day.focus), wk, extras.length ? `Plus ${extras.join(' and ')}` : null, day.name)}
          <div className="list" style={{ marginTop: 18 }}>
            {slots.map((slot) => {
              const ex = BY_ID[slot.exerciseId]
              const sg = suggest(state, slot, pw?.week ?? 1, deload)
              return (
                <div key={slot.id} className="li">
                  <span className="t" style={{ fontSize: 15 }}>{ex.name}</span>
                  <span className="s num"><b>{sg.sets} sets · {targetLabel(ex, sg.weight, sg.reps[0], state.profile.units)}</b></span>
                </div>
              )
            })}
            {fin && <div className="li"><span className="t" style={{ fontSize: 15 }}>{fin.title}</span><span className="s"><b>{sessionMinutes(fin)} min on the treadmill</b></span></div>}
          </div>
          <p className="small center" style={{ margin: '14px auto 0', maxWidth: 290 }}>Weights and reps update after each session, so these move as you get stronger.</p>
        </>
      )
    }
  }
  return (
    <Sheet open={!!planned} onClose={onClose} label={p?.d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}>
      <div style={{ marginTop: 6 }}>{body}</div>
    </Sheet>
  )
}
