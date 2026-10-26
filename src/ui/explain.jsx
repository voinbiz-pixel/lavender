import React, { useEffect, useState } from 'react'
import { useStore, setState } from '../lib/store.js'
import { BY_ID } from '../engine/exercises.js'
import { history } from '../engine/program.js'
import { e1rm } from '../engine/loads.js'
import { rebuildProgram } from '../lib/actions.js'
import { WEEK_MEANING, muscleLine } from '../engine/purpose.js'
import { TYPE_LABEL } from '../engine/plan.js'
import { Sheet, Press, Figure, toast } from './kit.jsx'
import { BodyMap, loadFrom } from './bodymap.jsx'
import { haptic } from '../lib/feedback.js'

// ---------- the shape of a plan, explained ----------
export function WeekSheet({ open, onClose, pw }) {
  if (!pw) return null
  let ramp = 0
  return (
    <Sheet open={open} onClose={onClose} label="How the plan works">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pw.weeks}, minmax(0, 1fr))`, gap: 5, alignItems: 'end', height: 80, margin: '10px 4px 0' }} aria-hidden>
        {pw.types.map((t, i) => {
          ramp = t === 'build' ? ramp + 1 : 0
          const h = t === 'build' ? 0.4 + 0.12 * Math.min(3, ramp) : { push: 1, easy: 0.3, test: 0.42 }[t]
          const w = i + 1
          return <span key={i} style={{ height: Math.round(80 * h), borderRadius: 6, display: 'block', background: w === pw.week ? 'var(--ink)' : w < pw.week ? 'var(--ink-3)' : 'var(--glass-track)' }} />
        })}
      </div>
      <p className="center" style={{ margin: '16px auto 0', font: '600 16px/1.35 var(--font)', maxWidth: 300, textWrap: 'balance' }}>Week {pw.week} of {pw.weeks}: {TYPE_LABEL[pw.type].toLowerCase()}, {WEEK_MEANING[pw.type].short}</p>
      <div className="list" style={{ marginTop: 18 }}>
        {['build', 'easy', 'push', 'test'].filter((t) => pw.types.includes(t)).map((t) => (
          <div key={t} className="li">
            <span className="t">{TYPE_LABEL[t]}</span>
            <span className="s">{WEEK_MEANING[t].long}</span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

// ---------- one exercise: what it works, your progress, your notes, and whether you want it ----------
let openEx = null
export const openExercise = (id) => openEx?.(id)

export function ExerciseHost() {
  const [id, setId] = useState(null)
  const [shown, setShown] = useState(null)
  useEffect(() => { openEx = (x) => { setShown(x); setId(x) } }, [])
  return <Sheet open={!!id} onClose={() => setId(null)} label={BY_ID[shown]?.name}>{shown && <ExerciseBody id={shown} />}</Sheet>
}

function ExerciseBody({ id }) {
  const state = useStore()
  const ex = BY_ID[id]
  const p = state.profile
  const units = p.units
  const hist = history(state.sessions, id)
  const bw = ex.load === 'bw' || ex.load === 'band' || ex.unit === 'sec'
  const val = (h) => Math.max(...h.work.map((x) => (bw ? +x.reps || 0 : e1rm(+x.weight || 0, +x.reps || 0))))
  const points = hist.map((h) => ({ v: val(h), at: h.session.startedAt })).reverse()
  const bestSet = hist.flatMap((h) => h.work).sort((a, b) => (bw ? (+b.reps || 0) - (+a.reps || 0) : e1rm(+b.weight || 0, +b.reps || 0) - e1rm(+a.weight || 0, +a.reps || 0)))[0]
  const fmtSet = (x) => (ex.unit === 'sec' ? `${x.reps} s` : bw ? `${x.reps} reps` : `${+x.weight} ${units} × ${x.reps}`)
  const keep = (p.keep || []).includes(id), avoid = (p.avoid || []).includes(id)
  const choose = (k) => {
    haptic('light')
    const keepL = (p.keep || []).filter((x) => x !== id), avoidL = (p.avoid || []).filter((x) => x !== id)
    if (k === 'keep' && !keep) keepL.push(id)
    if (k === 'avoid' && !avoid) avoidL.push(id)
    rebuildProgram({ keep: keepL, avoid: avoidL })
    toast(k === 'keep' ? (keep ? 'Back to normal' : 'It stays in your plan') : (avoid ? 'Back to normal' : 'Swapped out of your plan'))
  }
  const note = state.exNotes?.[id] || ''
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <div style={{ display: 'grid', placeItems: 'center' }}><Figure id={id} size={150} /></div>
        <BodyMap load={loadFrom([{ id, sets: 1 }], BY_ID)} size={120} labels={false} />
      </div>
      <p className="center" style={{ margin: '10px 0 0', font: '600 15px var(--font)' }}>{muscleLine(ex)}</p>
      <p className="small center" style={{ margin: '6px auto 0', maxWidth: 300, fontSize: 14 }}>{ex.cue}</p>

      <div className="label">Your progress</div>
      {points.length >= 2 ? <Line points={points} /> : <p className="small center">{points.length ? 'One session so far. The line starts after two.' : 'Not done yet. It shows up here after your first session.'}</p>}
      {hist.length > 0 && (
        <div className="list" style={{ marginTop: 14 }}>
          {bestSet && <div className="li"><span className="t num">{fmtSet(bestSet)}</span><span className="s">Best set</span></div>}
          {hist.slice(0, 3).map((h) => (
            <div key={h.session.id} className="li">
              <span className="t num">{h.work.map((x) => x.reps).join(', ')}{bw ? '' : ` at ${+h.work[0].weight} ${units}`}</span>
              <span className="s">{new Date(h.session.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{h.entry.feel ? ` · felt ${h.entry.feel}` : ''}</span>
            </div>
          ))}
        </div>
      )}

      <div className="label">Note</div>
      <textarea className="field" rows={2} placeholder="Seat height, grip, anything" defaultValue={note} aria-label="Note for this exercise"
        onBlur={(e) => { const v = e.target.value.trim(); setState((s) => ({ ...s, exNotes: { ...(s.exNotes || {}), [id]: v } })) }}
        style={{ height: 'auto', padding: '14px 18px', resize: 'none', font: '500 16px/1.4 var(--font)' }} />

      <div className="label">In your plan</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Press className={`chip ${keep ? 'on' : ''}`} role="checkbox" aria-checked={keep} onClick={() => choose('keep')}>Always use this</Press>
        <Press className={`chip ${avoid ? 'on' : ''}`} role="checkbox" aria-checked={avoid} onClick={() => choose('avoid')}>Never give me this</Press>
      </div>
      <p className="small center" style={{ marginTop: 10 }}>{avoid ? 'Swapped for something similar from now on.' : keep ? 'Kept on every day that trains this pattern.' : 'The plan rotates accessories between blocks.'}</p>
    </>
  )
}

// a small line of progress: estimated max for weighted lifts, best reps for bodyweight ones
function Line({ points }) {
  const W = 320, H = 110, pad = 10
  const vs = points.map((p) => p.v)
  const lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1
  const xy = points.map((p, i) => [pad + (i * (W - 2 * pad)) / Math.max(1, points.length - 1), H - pad - ((p.v - lo) / span) * (H - 2 * pad)])
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const gain = Math.round(((vs[vs.length - 1] - vs[0]) / (vs[0] || 1)) * 100)
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }} aria-hidden>
        <path d={d} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--ink)' }} />
        {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === xy.length - 1 ? 5 : 3} style={{ fill: 'var(--ink)' }} />)}
      </svg>
      <p className="small center num" style={{ marginTop: 6 }}>{gain >= 0 ? '+' : ''}{gain}% since your first session · {points.length} sessions</p>
    </>
  )
}
