// Goal plans: a main goal, optional focus areas, a set length (6, 8 or 12 weeks).
//
// The evidence this is built on (see README "Why the plans look like this"):
// - Strength and muscle: every major muscle at least twice a week, about 10 hard sets per muscle per week,
//   2 to 3 sets per exercise (ACSM 2026; Schoenfeld 2016 frequency meta-analysis; Pelland 2025 volume
//   meta-regression: big gains up to ~10 sets, smaller after). Progress by adding reps, then load.
// - Cardio: mostly easy (conversational) work with one hard day (polarised / 80:20); the hard day is
//   Norwegian 4x4 intervals, built up from 3x3 (Helgerud 2007: ~7% VO2max over 6 weeks at 3x/week).
//   New runners follow the NHS Couch to 5K run/walk progression, never faster than one stage a week.
// - Cardio and lifting together do not cost muscle or maximal strength (Schumann 2022 meta-analysis),
//   so finishers after lifting are fine.
// - Fat loss: lift to keep muscle, 2-4 moderate cardio sessions of 20-40 min, lose 0.5-1% of body weight
//   a week, eat enough protein (Murphy & Koehler 2022; MacroFactor summary).
// - Abs: you cannot burn fat off your stomach with ab work (Vispute 2011), so the abs plan pairs
//   progressive core training (flexion, anti-extension, anti-rotation) with the fat-loss structure.

export const GOAL_INFO = {
  strength: { label: 'Strength and muscle', short: 'Strength', sub: 'Lift more, build muscle' },
  stamina: { label: 'Stamina and cardio', short: 'Stamina', sub: 'Treadmill plans, walk to run' },
  core: { label: 'Abs and core', short: 'Abs', sub: 'A strong core, and leaner to show it' },
  lean: { label: 'Lose fat, get lean', short: 'Lean', sub: 'Keep muscle, lose fat' },
}
export const FOCUS_INFO = {
  strength: { label: 'More strength', sub: 'An extra lifting day' },
  stamina: { label: 'More stamina', sub: 'Treadmill finishers after lifting' },
  core: { label: 'More abs', sub: 'Core work in your sessions' },
}
export const LEVEL_INFO = {
  walk: { label: 'Walking', sub: 'Brisk incline walks, no running' },
  runwalk: { label: 'Run and walk', sub: 'Build up to running nonstop' },
  run: { label: 'I can run 20 min', sub: 'Easy runs and intervals' },
}

// The shape of each length. build: progress; push: the hardest week; easy: recover (deload); test: easy + retest.
export const WEEK_TYPES = {
  6: ['build', 'build', 'build', 'push', 'push', 'test'],
  8: ['build', 'build', 'build', 'easy', 'build', 'build', 'push', 'test'],
  12: ['build', 'build', 'build', 'easy', 'build', 'build', 'build', 'easy', 'build', 'build', 'push', 'test'],
}
export const TYPE_LABEL = { build: 'Build', push: 'Push', easy: 'Easy week', test: 'Test week' }

const DAY = 864e5
export function mondayOf(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

// Where today is in the plan.
export function planWeek(plan, now = new Date()) {
  if (!plan) return null
  const types = WEEK_TYPES[plan.weeks] || WEEK_TYPES[8]
  const raw = Math.floor((mondayOf(now) - mondayOf(plan.start)) / (7 * DAY)) + 1
  const week = Math.max(1, Math.min(types.length, raw))
  const type = types[week - 1]
  // which build week of its block (0, 1, 2...) for the effort ramp
  let wib = 0
  for (let i = week - 2; i >= 0 && types[i] === 'build' && type === 'build'; i--) wib++
  return { week, weeks: types.length, type, label: TYPE_LABEL[type], over: raw > types.length, wib, block: types.slice(0, week - 1).filter((t) => t === 'easy').length, types }
}

// Reps in reserve to aim for: start with plenty left, get closer to the limit, then back off.
export function planRir(pw, experience = 'some') {
  if (!pw) return 2
  if (pw.type === 'easy' || pw.type === 'test') return 4
  if (pw.type === 'push') return experience === 'new' ? 2 : 1
  const ramp = { new: [3, 3, 2], some: [3, 2, 2], vet: [3, 2, 1] }[experience] || [3, 2, 2]
  return ramp[Math.min(ramp.length - 1, pw.wib)]
}

// ---------- the week's layout ----------
// S lift, C cardio, L long cardio, SF lift + treadmill finisher
const LAYOUT = {
  strength: (n) => Array(n).fill('S'),
  stamina: (n) => ({ 1: ['SF'], 2: ['SF', 'SF'], 3: ['C', 'S', 'C'], 4: ['C', 'S', 'C', 'S'], 5: ['C', 'S', 'C', 'L', 'S'], 6: ['C', 'S', 'C', 'C', 'S', 'L'] }[n]),
  lean: (n) => ({ 1: ['SF'], 2: ['SF', 'SF'], 3: ['SF', 'C', 'SF'], 4: ['S', 'C', 'S', 'C'], 5: ['S', 'C', 'S', 'C', 'S'], 6: ['S', 'C', 'S', 'C', 'S', 'L'] }[n]),
}
LAYOUT.core = LAYOUT.lean

export function weekLayout(plan, n) {
  const goal = plan.goal
  let L = [...(LAYOUT[goal] || LAYOUT.strength)(Math.max(1, Math.min(6, n)))]
  const focus = plan.focus || []
  if (focus.includes('stamina') && (goal === 'strength')) {
    let k = 0
    L = L.map((x) => (x === 'S' && k++ < 2 ? 'SF' : x))
  }
  // an extra lifting day, but never at the cost of the plan's last two cardio days
  if (focus.includes('strength') && goal !== 'strength' && L.filter((x) => x === 'C' || x === 'L').length >= 3) {
    const i = L.lastIndexOf('C')
    if (i >= 0) L[i] = 'S'
  }
  return L
}
export const liftDaysPerWeek = (plan, n) => weekLayout(plan, n).filter((x) => x.startsWith('S')).length
export const hasCardio = (plan) => plan && (plan.goal !== 'strength' || (plan.focus || []).includes('stamina'))

// The sessions planned for a week, in order. Each has a stable key so it can be ticked off.
export function weekSessions(state, pw) {
  const plan = state.plan
  const n = state.profile.trainDays.length || 3
  const L = weekLayout(plan, n)
  const coreAll = plan.goal === 'core'
  const coreSome = (plan.focus || []).includes('core')
  const level = plan.level || 'run'
  let cIdx = 0
  let liftIdx = 0
  const cardioCount = L.filter((x) => x === 'C' || x === 'L').length
  const out = L.map((code, i) => {
    const key = `w${pw.week}-${i}`
    if (code === 'S' || code === 'SF') {
      liftIdx++
      return { key, kind: 'lift', finisher: code === 'SF', core: coreAll || (coreSome && liftIdx <= 3) }
    }
    let type = 'easy'
    if (code === 'L') type = 'long'
    else if (level !== 'runwalk' && cardioCount >= 2 && cIdx === 0 && pw.type !== 'easy' && pw.type !== 'test') type = 'intervals'
    if (level === 'runwalk' && code === 'C') type = 'runwalk'
    cIdx++
    return { key, kind: 'cardio', type, core: false, occurrence: cIdx - 1, of: cardioCount }
  })
  // fitness tests: at the start and at the end, on the first cardio session (or a finisher if there is none)
  if ((pw.week === 1 || pw.type === 'test') && hasCardio(plan)) {
    const t = out.find((x) => x.kind === 'cardio') || out.find((x) => x.finisher)
    if (t) t.test = true
  }
  return out
}

// ---------- treadmill sessions ----------
// Zones, described by how they feel (no heart-rate strap needed): the talk test.
export const ZONES = {
  walk: { label: 'Walk', feel: 'Easy, just moving', level: 1 },
  brisk: { label: 'Brisk walk', feel: 'Breathing harder, still chatting', level: 2 },
  jog: { label: 'Easy jog', feel: 'You could hold a conversation', level: 3 },
  run: { label: 'Steady run', feel: 'Short sentences only', level: 4 },
  fast: { label: 'Hard', feel: 'A few words at a time', level: 5 },
  test: { label: 'Test', feel: 'Your best steady effort', level: 5 },
}
// starting speeds in mph; the plan learns yours from how sessions feel
const SPEEDS = { walk: 3.0, brisk: 3.6, jog: 5.0, run: 5.8, fast: 6.6, test: 6 }
export function speedFor(state, zone) {
  const mine = state.cardio?.speeds?.[zone]
  const km = state.profile.units === 'kg'
  const base = SPEEDS[zone] ?? 3.5
  const v = mine ?? (km ? base * 1.609 : base)
  return Math.round(v * 10) / 10
}
export const speedUnit = (state) => (state.profile.units === 'kg' ? 'km/h' : 'mph')

// NHS Couch to 5K, stage by stage (minutes; r = run, w = walk), after a 5 minute brisk walk.
const C25K = [
  null,
  [['r', 1, 'w', 1.5, 8]],
  [['r', 1.5, 'w', 2, 6]],
  [['r', 1.5, 'w', 1.5, 'r', 3, 'w', 3, 2]],
  [['r', 3, 'w', 1.5, 'r', 5, 'w', 2.5, 'r', 3, 'w', 1.5, 'r', 5, 1]],
  [['r', 5, 'w', 3, 'r', 5, 'w', 3, 'r', 5, 1], ['r', 8, 'w', 5, 'r', 8, 1], ['r', 20, 1]],
  [['r', 5, 'w', 3, 'r', 8, 'w', 3, 'r', 5, 1], ['r', 10, 'w', 3, 'r', 10, 1], ['r', 25, 1]],
  [['r', 25, 1]],
  [['r', 28, 1]],
  [['r', 30, 1]],
]
// Which stage a week of the plan is at: at most one stage per week, easy weeks repeat the last one.
export function c25kStage(pw) {
  const builds = pw.types.slice(0, pw.week).filter((t) => t !== 'easy' && t !== 'test').length
  return Math.max(1, Math.min(9, builds || 1))
}
export const c25kGoalMinutes = (weeks) => { const types = WEEK_TYPES[weeks]; const b = Math.min(9, types.filter((t) => t !== 'easy' && t !== 'test').length); const s = C25K[b]; const last = s[s.length - 1]; return last[1] }

const seg = (mins, zone, incline = 0, extra = {}) => ({ secs: Math.round(mins * 60), zone, incline, ...extra })

// ---------- learning from how cardio went ----------
// A session counts as done if you finished at least 90% of its work (the parts that aren't warm-up,
// cool-down or recovery) and didn't rate it Hard. Leaving early saves what you did, marked unfinished.
const isWork = (x) => x.label !== 'Warm up' && x.label !== 'Cool down' && x.label !== 'Recover' && x.label !== 'Brisk walk' && x.zone !== 'walk'
export function cardioCompleted(sess) {
  if (!sess || sess.incomplete) return false
  const work = (sess.segments || []).filter(isWork)
  const planned = work.reduce((t, x) => t + (x.secs || 0), 0)
  const did = work.reduce((t, x) => t + Math.min(x.secs || x.done || 0, x.done || 0), 0)
  return planned === 0 || did >= planned * 0.9
}
const failed = (sess) => !cardioCompleted(sess) || sess.feel === 'hard'
function lastOfKind(state, kind, before = Infinity) {
  return state.sessions.filter((x) => x.type === 'cardio' && x.meta?.kind === kind && new Date(x.startedAt).getTime() < before)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0] || null
}
const weekStartOf = (plan, pw) => { const d = mondayOf(plan.start); d.setDate(d.getDate() + 7 * (pw.week - 1)); return d.getTime() }

// Couch to 5K stages are earned: the calendar sets the fastest you can move (one stage a week),
// but you only move on after finishing a session of the stage you're on.
export function earnedStage(state, pw) {
  const cal = c25kStage(pw)
  const before = state.plan ? weekStartOf(state.plan, pw) : Infinity
  const done = state.sessions.filter((x) => x.type === 'cardio' && x.meta?.kind === 'runwalk' && new Date(x.startedAt).getTime() < before && !failed(x))
  const best = done.reduce((m, x) => Math.max(m, x.meta.stage || 0), 0)
  return Math.max(1, Math.min(cal, best + 1))
}

export function cardioSession(state, desc, pw, { finisher = false } = {}) {
  const plan = state.plan
  const level = plan.level || 'run'
  const cap = Math.max(20, state.profile.sessionMinutes || 45)
  const f = pw.weeks > 1 ? (pw.week - 1) / (pw.weeks - 1) : 0 // 0 at the start, 1 at the end
  const easyWeek = pw.type === 'easy' || pw.type === 'test'
  const tread = state.profile.equipment?.treadmill?.on !== false
  const inc = (x) => (tread ? x : 0)
  const warm = (m = 5) => seg(m, 'brisk', inc(1), { label: 'Warm up' })
  const cool = (m = 4) => seg(m, 'walk', 0, { label: 'Cool down' })

  if (desc.test) {
    if (level === 'walk') return { title: 'Walking test', sub: 'One mile, as fast as you can walk', test: 'mile', segments: [warm(3), seg(0, 'test', 1, { label: 'Walk one mile', open: true }), cool(3)] }
    return { title: 'Fitness test', sub: '12 minutes, as far as you can', test: 'cooper', segments: [warm(5), seg(12, 'test', 1, { label: 'As far as you can' }), cool(4)] }
  }

  if (finisher) {
    // 12 to 20 minutes after lifting: easy, steady work (or an incline walk for walkers and fat loss)
    const m = Math.round(12 + 8 * f * (easyWeek ? 0.5 : 1))
    if (level === 'run' && plan.goal !== 'lean' && plan.goal !== 'core') return { title: 'Easy run finisher', segments: [seg(2, 'brisk', inc(1)), seg(m - 2, 'jog', inc(1))] }
    return { title: 'Incline walk finisher', segments: [seg(m, 'brisk', inc(Math.round(4 + 6 * f)))] }
  }

  if (level === 'walk') {
    if (desc.type === 'intervals') {
      const last = lastOfKind(state, 'hills')
      let n = Math.round(3 + 3 * f), note = null
      if (last && failed(last)) { n = Math.max(2, (last.meta.n || n) - 1); note = 'One fewer hill: last time was tough' }
      else if (last) n = Math.min(n, (last.meta.n || n) + 1)
      const hill = inc(Math.round(8 + 4 * f))
      const segs = [warm()]
      for (let i = 0; i < n; i++) { segs.push(seg(3, 'brisk', hill, { label: `Hill ${i + 1} of ${n}` })); segs.push(seg(2, 'walk', inc(1), { label: 'Recover' })) }
      segs.push(cool())
      return { title: 'Hill intervals', sub: `${n} hills`, note, meta: { kind: 'hills', n }, segments: segs }
    }
    const long = desc.type === 'long'
    const kind = long ? 'longwalk' : 'incline'
    const { main, note } = steady(state, kind, Math.round((20 + 20 * f) * (long ? 1.3 : 1) * (easyWeek ? 0.7 : 1)), cap, easyWeek)
    return { title: long ? 'Long incline walk' : 'Incline walk', note, meta: { kind, main }, segments: [warm(), seg(main, 'brisk', inc(Math.round((3 + 7 * f) - (easyWeek ? 2 : 0))), { label: 'Incline walk' }), cool()] }
  }

  if (level === 'runwalk') {
    const stage = earnedStage(state, pw)
    const behind = stage < c25kStage(pw)
    const variants = C25K[stage]
    // spread the stage's runs over the week, so the last one is always the stage's key run
    const of = Math.max(1, desc.of || 1)
    const vi = of === 1 ? variants.length - 1 : Math.round(((desc.occurrence || 0) * (variants.length - 1)) / (of - 1))
    const v = variants[Math.min(variants.length - 1, vi)]
    const reps = v[v.length - 1]
    const body = v.slice(0, -1)
    const segs = [seg(5, 'brisk', inc(1), { label: 'Brisk walk' })]
    for (let r = 0; r < reps; r++) for (let i = 0; i < body.length; i += 2) segs.push(seg(body[i + 1], body[i] === 'r' ? 'jog' : 'walk', inc(1), { label: body[i] === 'r' ? 'Run' : 'Walk' }))
    segs.push(cool(3))
    return { title: 'Run and walk', sub: `Couch to 5K, stage ${stage} of 9`, note: behind ? (stage === 1 ? 'Stage 1 first: each stage unlocks when you finish one' : 'Repeating this stage until you finish it') : null, meta: { kind: 'runwalk', stage }, segments: segs }
  }

  // runners: easy runs, one interval day, one long run
  if (desc.type === 'intervals') {
    let [n, mins] = f < 0.25 ? [3, 3] : f < 0.5 ? [4, 3] : [4, 4]
    let note = null
    const last = lastOfKind(state, 'intervals')
    if (last && failed(last)) { n = Math.max(2, (last.meta.n || n) - 1); mins = last.meta.mins || mins; note = 'One fewer interval: last time was tough' }
    else if (last) { if (n > (last.meta.n || n) + 1) n = last.meta.n + 1; if (mins > (last.meta.mins || mins) + 1) mins = last.meta.mins + 1 }
    const segs = [warm(5), seg(3, 'jog', inc(1), { label: 'Easy jog' })]
    for (let i = 0; i < n; i++) { segs.push(seg(mins, 'fast', inc(2), { label: `Interval ${i + 1} of ${n}` })); if (i < n - 1) segs.push(seg(3, 'walk', inc(1), { label: 'Recover' })) }
    segs.push(cool(5))
    return { title: 'Intervals', sub: `${n} × ${mins} min hard`, note, meta: { kind: 'intervals', n, mins }, segments: segs }
  }
  const long = desc.type === 'long'
  const kind = long ? 'longrun' : 'easyrun'
  const { main, note } = steady(state, kind, Math.round((20 + 15 * f) * (long ? 1.4 : 1) * (easyWeek ? 0.7 : 1)), cap, easyWeek)
  return { title: long ? 'Long easy run' : 'Easy run', note, meta: { kind, main }, segments: [warm(4), seg(main, 'jog', inc(1), { label: 'Easy run' }), cool(3)] }
}

// Steady sessions grow at most about 10% from the last one you finished; if the last one fell short or was hard,
// it repeats (a little shorter if it was hard) instead of growing.
function steady(state, kind, target, cap, easyWeek) {
  let main = Math.min(cap - 8, target), note = null
  const last = lastOfKind(state, kind)
  if (last && !easyWeek) {
    const prev = last.meta.main || main
    if (failed(last)) { main = Math.min(main, last.feel === 'hard' ? Math.round(prev * 0.9) : prev); note = last.feel === 'hard' ? 'A bit shorter: last time was hard' : 'Same as last time: finish it first' }
    else main = Math.min(main, Math.round(prev * 1.1) + 1)
  }
  return { main: Math.max(10, main), note }
}
export const sessionMinutes = (c) => Math.round(c.segments.reduce((t, s) => t + (s.secs || 0), 0) / 60) + (c.segments.some((s) => s.open) ? 15 : 0)

// ---------- core ----------
// Three kinds of core work, rotated so every session covers different ground.
const CORE = {
  flex: ['reverse_crunch', 'curl_up', 'bicycle_crunch', 'hanging_knee'],
  brace: ['dead_bug', 'plank', 'hollow_hold'],
  twist: ['side_plank', 'bird_dog', 'pallof_press', 'suitcase_hold'],
}
export function coreSlots(state, desc, pw, n, candidatesOk) {
  const main = state.plan.goal === 'core'
  const idx = parseInt(desc.key.split('-')[1], 10) || 0
  const order = ['brace', 'flex', 'twist']
  const picks = []
  const count = main ? 3 : 2
  for (let i = 0; i < count; i++) {
    const kind = order[(idx + i) % order.length]
    const list = CORE[kind].filter(candidatesOk)
    if (!list.length) continue
    picks.push(list[(pw.week + idx) % list.length])
  }
  const sets = (pw.type === 'easy' || pw.type === 'test') ? 1 : main ? 3 : 2
  return picks.map((id) => ({ id: `core-${id}`, pattern: 'core', variant: 0, exerciseId: id, rep: null, sets, rest: 40, isMain: false, core: true }))
}

// ---------- what each plan promises, in plain words ----------
export function planPromise(plan, state) {
  const w = plan.weeks
  if (plan.goal === 'strength') return `Every main lift heavier or for more reps by week ${w}`
  if (plan.goal === 'stamina') {
    if (plan.level === 'runwalk') return `Run ${c25kGoalMinutes(w)} minutes without stopping by week ${w}`
    if (plan.level === 'walk') return `A 40 minute incline walk, and a faster mile, by week ${w}`
    return `Further in your 12 minute test by week ${w}`
  }
  if (plan.goal === 'core') return `A stronger core and a leaner waist by week ${w}`
  const bw = state?.bodyweight?.[0]?.value
  if (bw) { const u = state.profile.units; return `About ${Math.round(bw * 0.005 * w)}–${Math.round(bw * 0.01 * w)} ${u} lighter by week ${w} with a small calorie deficit, strength kept` }
  return `Leaner by week ${w} with a small calorie deficit, strength kept`
}
export function planTips(plan, state) {
  const out = []
  const bw = state?.bodyweight?.[0]?.value
  const u = state?.profile?.units
  const kg = bw ? (u === 'kg' ? bw : bw * 0.4536) : null
  if (plan.goal === 'lean' || plan.goal === 'core') {
    out.push(bw ? `Aim to lose ${(bw * 0.005).toFixed(1)}–${(bw * 0.01).toFixed(1)} ${u} a week. Faster costs muscle.` : 'Aim to lose 0.5–1% of your body weight a week. Faster costs muscle.')
    out.push(kg ? `Protein: about ${Math.round(kg * 1.6)}–${Math.round(kg * 2.2)} g a day keeps your muscle.` : 'Protein: about 1.6–2.2 g per kg of body weight a day keeps your muscle.')
  }
  if (plan.goal === 'core') out.push('Ab work builds the muscle; losing fat is what shows it.')
  if (plan.goal === 'stamina') out.push('Easy days should feel easy. You could hold a conversation.')
  if (plan.goal === 'strength') out.push('Each lift moves up when you hit the top of its rep range on every set.')
  return out
}
