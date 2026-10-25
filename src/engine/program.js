import { BY_ID, candidatesFor, poolFor } from './exercises.js'
import { roundTo, nextUp, nextDown, stepsFor } from './loads.js'
import { planWeek, planRir, weekSessions, weekLayout, coreSlots } from './plan.js'

export const PALETTES = {
  jade: { name: 'Rare Jade', c: '#A6CFB8', d: '#1d2b24' },
  magenta: { name: 'Floral Magenta', c: '#DC308F', c2: '#D0A8C9', d: '#2a0f20' },
  ocean: { name: 'Deep Ocean', c: '#457BF1', d: '#0d1733' },
  lavender: { name: 'Tranquil Lavender', c: '#D0A8C9', d: '#24182a' },
  ember: { name: 'Ember', c: '#F08A4B', d: '#2b160b' },
  ice: { name: 'Ice', c: '#8FD3F4', d: '#0e2230' },
}
const PALETTE_ORDER = ['jade', 'magenta', 'ocean', 'lavender', 'ember', 'ice']

const S = (pattern, variant = 0) => ({ pattern, variant })

// Days are named after lavender-coloured flowers; `focus` says what the day trains.
export const SPLITS = {
  2: [
    { key: 'fa', name: 'Iris', focus: 'Full body', slots: [S('squat'), S('hpush'), S('hpull'), S('hinge', 1), S('sidedelt'), S('core')] },
    { key: 'fb', name: 'Lilac', focus: 'Full body', slots: [S('hinge'), S('ipush'), S('vpull'), S('lunge'), S('vpush'), S('biceps'), S('calves')] },
  ],
  3: [
    { key: 'fa', name: 'Iris', focus: 'Full body', slots: [S('squat'), S('hpush'), S('hpull'), S('hamcurl'), S('sidedelt'), S('core')] },
    { key: 'fb', name: 'Lilac', focus: 'Full body', slots: [S('hinge'), S('vpush'), S('vpull'), S('lunge'), S('triceps'), S('biceps')] },
    { key: 'fc', name: 'Violet', focus: 'Full body', slots: [S('squat', 1), S('ipush'), S('hpull', 1), S('hipext'), S('chestiso'), S('calves')] },
  ],
  4: [
    { key: 'ua', name: 'Iris', focus: 'Upper', slots: [S('hpush'), S('hpull'), S('vpush'), S('vpull'), S('sidedelt'), S('triceps'), S('biceps')] },
    { key: 'la', name: 'Lilac', focus: 'Lower', slots: [S('squat'), S('hinge'), S('lunge'), S('hamcurl'), S('calves'), S('core')] },
    { key: 'ub', name: 'Violet', focus: 'Upper', slots: [S('ipush'), S('vpull', 1), S('hpull', 1), S('chestiso'), S('sidedelt'), S('biceps', 1), S('triceps', 1)] },
    { key: 'lb', name: 'Heather', focus: 'Lower', slots: [S('hinge'), S('squat', 1), S('hipext'), S('lunge', 1), S('calves'), S('core', 1)] },
  ],
  5: [
    { key: 'up', name: 'Iris', focus: 'Upper', slots: [S('hpush'), S('hpull'), S('vpush'), S('vpull'), S('sidedelt'), S('biceps')] },
    { key: 'lo', name: 'Lilac', focus: 'Lower', slots: [S('squat'), S('hinge'), S('lunge'), S('calves'), S('core')] },
    { key: 'pu', name: 'Violet', focus: 'Push', slots: [S('ipush'), S('vpush', 1), S('chestiso'), S('sidedelt'), S('triceps'), S('triceps', 1)] },
    { key: 'pl', name: 'Heather', focus: 'Pull', slots: [S('vpull'), S('hpull', 1), S('reardelt'), S('biceps'), S('biceps', 1), S('core', 1)] },
    { key: 'lg', name: 'Aster', focus: 'Legs', slots: [S('hinge'), S('squat', 1), S('hipext'), S('hamcurl'), S('calves')] },
  ],
  6: [
    { key: 'pa', name: 'Iris', focus: 'Push', slots: [S('hpush'), S('vpush'), S('ipush', 1), S('sidedelt'), S('triceps')] },
    { key: 'pla', name: 'Lilac', focus: 'Pull', slots: [S('vpull'), S('hpull'), S('reardelt'), S('biceps'), S('core')] },
    { key: 'la', name: 'Violet', focus: 'Legs', slots: [S('squat'), S('hinge', 1), S('lunge'), S('calves')] },
    { key: 'pb', name: 'Heather', focus: 'Push', slots: [S('ipush'), S('vpush', 1), S('chestiso'), S('sidedelt'), S('triceps', 1)] },
    { key: 'plb', name: 'Aster', focus: 'Pull', slots: [S('hpull', 1), S('vpull', 1), S('reardelt', 1), S('biceps', 1), S('core', 1)] },
    { key: 'lb', name: 'Wisteria', focus: 'Legs', slots: [S('hinge'), S('squat', 1), S('hipext'), S('hamcurl'), S('calves')] },
  ],
}
// older saves used moon names
export const DAY_RENAME = { Io: 'Iris', Europa: 'Lilac', Ganymede: 'Violet', Callisto: 'Heather', Amalthea: 'Aster', Himalia: 'Wisteria' }
export const DAY_INFO = Object.fromEntries(Object.values(SPLITS).flat().map((d) => [d.key, { name: d.name, focus: d.focus }]))

// Muscle groups shown as petals, and how sets count toward them:
// a set counts 1 for a group it trains first, 0.5 for one it assists (never double within one set).
export const PETALS = [
  { key: 'chest', label: 'Chest', muscles: ['chest'], color: '#DC308F' },
  { key: 'back', label: 'Back', muscles: ['back', 'lats', 'rearDelts'], color: '#457BF1' },
  { key: 'delts', label: 'Delts', muscles: ['delts', 'sideDelts'], color: '#8FD3F4' },
  { key: 'arms', label: 'Arms', muscles: ['biceps', 'triceps'], color: '#D0A8C9' },
  { key: 'quads', label: 'Quads', muscles: ['quads'], color: '#F08A4B' },
  { key: 'post', label: 'Posterior', muscles: ['glutes', 'hams'], color: '#E7C14B' },
  { key: 'calves', label: 'Calves', muscles: ['calves'], color: '#A6CFB8' },
  { key: 'core', label: 'Core', muscles: ['core'], color: '#B9B2D6' },
]
export function groupCredit(ex) {
  const out = {}
  for (const g of PETALS) {
    const i = ex.muscles.findIndex((m) => g.muscles.includes(m))
    if (i >= 0) out[g.key] = i === 0 ? 1 : 0.5
  }
  return out
}
export function plannedGroupSets(program) {
  const out = Object.fromEntries(PETALS.map((g) => [g.key, 0]))
  for (const d of program?.days || []) for (const s of d.slots) {
    const c = groupCredit(BY_ID[s.exerciseId])
    for (const k in c) out[k] += s.sets * c[k]
  }
  return out
}

export const GOALS = {
  strength: { label: 'Get stronger', sub: 'Heavier on the big lifts', main: [4, 6], acc: [8, 12] },
  muscle: { label: 'Build muscle', sub: 'More reps, more volume', main: [6, 10], acc: [10, 15] },
  both: { label: 'Strong and built', sub: 'The balanced middle', main: [5, 8], acc: [8, 12] },
  athletic: { label: 'Feel athletic', sub: 'Fit, capable, moving well', main: [6, 8], acc: [10, 12] },
}

export const EXPERIENCE = {
  new: { label: 'New to lifting', sub: 'Under 6 months', rir: [3, 3, 2, 2], mainSets: 3, accSets: 2 },
  some: { label: 'Some experience', sub: '6 months to 2 years', rir: [3, 2, 2, 1], mainSets: 3, accSets: 3 },
  vet: { label: 'Experienced', sub: '2+ years, consistent', rir: [3, 2, 1, 1], mainSets: 4, accSets: 3 },
}

export const BLOCK_WEEKS = 5 // 4 building weeks + 1 deload

function prescribe(ex, profile, mainSlot) {
  const goal = GOALS[profile.goal] || GOALS.both
  const xp = EXPERIENCE[profile.experience] || EXPERIENCE.some
  const isMain = ex.tier === 'main' && mainSlot
  let rep = isMain ? [...goal.main] : [...goal.acc]
  if (ex.load === 'bw') rep = isMain ? [6, 12] : [10, 20]
  if (ex.load === 'band') rep = [12, 20]
  if (ex.unit === 'sec') rep = [20, 45]
  let sets = isMain ? xp.mainSets : xp.accSets
  if (isMain && profile.goal === 'strength') sets = Math.max(sets, 4)
  const rest = ex.unit === 'sec' ? 45 : isMain ? (profile.goal === 'strength' ? 180 : 120) : ex.pattern === 'lunge' ? 90 : 75
  return { rep, sets, rest, isMain }
}

export const estMinutes = (slots) => Math.round(slots.reduce((t, s) => t + s.sets * (s.rest + 45), 0) / 60) + 6

export function generateProgram(profile, block = 0, prev = null) {
  const days = SPLITS[Math.min(6, Math.max(2, profile.daysPerWeek || 3))]
  const out = days.map((d, i) => {
    let slots = []
    d.slots.forEach((s, j) => {
      const cands = candidatesFor(s.pattern, profile.equipment, profile.easyOn)
      if (!cands.length) return
      const pool = poolFor(s.pattern, profile.equipment, profile.easyOn)
      const mainSlot = j < 4
      // keep main lifts stable across blocks so progress carries; rotate accessories
      const prevSlot = prev?.days?.find((pd) => pd.key === d.key)?.slots?.find((ps) => ps.pattern === s.pattern && ps.variant === s.variant)
      let ex
      // a locked move, or a bodyweight move that has moved along its ladder, stays put
      if ((prevSlot?.locked || prevSlot?.ladder) && (prevSlot.ladder ? BY_ID[prevSlot.exerciseId]?.requires.every((r) => profile.equipment?.[r]?.on) : cands.some((c) => c.id === prevSlot.exerciseId))) ex = BY_ID[prevSlot.exerciseId]
      else {
        const rot = mainSlot ? 0 : block
        ex = pool[(s.variant + rot) % pool.length]
      }
      // avoid duplicates in a day
      if (slots.some((x) => x.exerciseId === ex.id)) ex = cands.find((c) => !slots.some((x) => x.exerciseId === c.id)) || null
      if (!ex) return
      const p = prescribe(ex, profile, mainSlot)
      slots.push({ id: `${d.key}-${j}`, pattern: s.pattern, variant: s.variant, exerciseId: ex.id, locked: !!prevSlot?.locked, ...(prevSlot?.ladder && prevSlot.exerciseId === ex.id ? { ladder: prevSlot.ladder } : {}), ...p })
    })
    // fit the session length: trim from the end if over, add sets if there is time to spare
    const cap = profile.sessionMinutes || 60
    const floor = (profile.daysPerWeek || 3) <= 3 ? 4 : 3 // a full-body day keeps at least four moves
    while (slots.length > floor && estMinutes(slots) > cap) slots = slots.slice(0, -1)
    const maxMain = profile.goal === 'strength' ? 5 : 4
    for (let pass = 0; pass < 3; pass++) {
      for (const s of [...slots.filter((x) => x.isMain), ...slots.filter((x) => !x.isMain)]) {
        if (s.sets >= (s.isMain ? maxMain : 4)) continue
        s.sets++
        if (estMinutes(slots) > cap) { s.sets--; pass = 3; break }
      }
    }
    return { key: d.key, name: d.name, focus: d.focus, palette: PALETTE_ORDER[i % PALETTE_ORDER.length], slots, minutes: estMinutes(slots) }
  })
  return { id: prev?.id || uid(), createdAt: prev?.createdAt || new Date().toISOString(), block, weeks: BLOCK_WEEKS, days: out }
}

export function uid() {
  return (crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36))
}

// Where are we in the plan? Missed days never break the plan: the next session simply waits.
export function position(state, now = new Date()) {
  const p = state.program
  if (!p) return null
  const done = state.sessions.filter((s) => s.status === 'done' && s.programId === p.id && (state.plan || s.block === p.block))
  const idx = done.length
  const dayIdx = idx % p.days.length
  if (state.plan) {
    // with a plan, the calendar sets the week; the lifting days simply rotate
    const pw = planWeek(state.plan, now)
    return { dayIdx, week: pw.week, weeks: pw.weeks, day: p.days[dayIdx], isDeload: pw.type === 'easy' || pw.type === 'test', idx, pw, blockDone: false }
  }
  const week = Math.min(p.weeks, Math.floor(idx / p.days.length) + 1)
  const blockDone = Math.floor(idx / p.days.length) >= p.weeks
  return { dayIdx, week, weeks: p.weeks, day: p.days[dayIdx], isDeload: week === p.weeks, idx, total: p.days.length * p.weeks, blockDone }
}

// The profile the lifting program is generated from, once a plan decides how many lifting days there are.
const GOAL_REPS = { strength: 'both', lean: 'both', core: 'both', stamina: 'athletic' }
export function programProfile(state) {
  const p = state.profile
  if (!state.plan) return p
  const n = p.trainDays.length || p.daysPerWeek || 3
  const L = weekLayout(state.plan, n)
  const lifts = L.filter((x) => x.startsWith('S')).length
  return { ...p, daysPerWeek: Math.max(2, Math.min(6, lifts)), goal: GOAL_REPS[state.plan.goal] || 'both' }
}

export function targetRir(profile, week, weeks = BLOCK_WEEKS) {
  if (week >= weeks) return 4
  const xp = EXPERIENCE[profile.experience] || EXPERIENCE.some
  return xp.rir[Math.min(xp.rir.length - 1, week - 1)]
}

// ---------- history helpers ----------
export function history(sessions, exerciseId) {
  const out = []
  for (const s of [...sessions].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))) {
    if (s.status !== 'done') continue
    const e = s.entries.find((x) => x.exerciseId === exerciseId)
    if (!e) continue
    const work = e.sets.filter((x) => x.kind === 'work' && x.done)
    if (work.length) out.push({ session: s, entry: e, work })
  }
  return out
}

// ---------- starting weights ----------
// The first time a lift comes up, the plan picks a safe, light starting weight instead of asking.
// Pounds for an average 170 lb lifter with some experience, scaled by experience and body weight,
// then rounded to weights you actually own. The first set then fine-tunes it (see Session).
const START_LB = {
  bb_back_squat: 95, db_goblet_squat: 35, kb_goblet_squat: 35, bb_rdl: 95, db_rdl: 30, kb_swing: 35, db_sl_rdl: 25,
  bb_bench: 75, db_bench: 30, db_floor_press: 30, db_incline: 25, db_low_incline_floor: 25,
  db_seated_press: 20, db_standing_press: 17.5, db_landmine_like: 20, bb_ohp: 45,
  db_chest_row: 25, db_row: 35, bb_row: 75, db_row_standing: 25, db_pullover: 25, db_kneel_row_high: 15,
  db_bulgarian: 15, db_reverse_lunge: 20, db_step_up: 20, db_hip_thrust: 45, bb_hip_thrust: 95, db_ham_curl: 15,
  db_fly: 15, db_lateral: 10, db_rear_fly: 10, db_curl: 17.5, db_incline_curl: 12.5, db_hammer: 20,
  db_oh_ext: 25, db_skull: 15, calf_raise: 20,
}
export function startingLoad(ex, profile) {
  if (!['db', 'bb', 'kb'].includes(ex.load)) return ex.load === 'band' ? 1 : 0
  const xp = { new: 0.7, some: 1, vet: 1.3 }[profile.experience] ?? 1
  const bwLb = profile.bodyweightLb
  const body = bwLb ? Math.max(0.8, Math.min(1.25, bwLb / 170)) : 1
  let lb = (START_LB[ex.id] ?? (ex.load === 'bb' ? 65 : 15)) * xp * body
  if (ex.load === 'bb') lb = Math.max(45, lb)
  const w = profile.units === 'kg' ? lb * 0.4536 : lb
  const r = roundTo(ex, w, profile.equipment)
  return r ?? w
}

// ---------- progression ----------
export function suggest(state, slot, week, deload) {
  const ex = BY_ID[slot.exerciseId]
  const equip = state.profile.equipment
  const [lo, hi] = slot.rep
  const pw = state.plan ? planWeek(state.plan) : null
  const rir = pw ? planRir(pw, state.profile.experience) : targetRir(state.profile, week)
  const hist = history(state.sessions, ex.id)
  const unitWord = ex.unit === 'sec' ? 's' : ''
  // volume ramps a little through each block (one more accessory set late in the block), halves on easy weeks
  const late = pw ? pw.type === 'push' || (pw.type === 'build' && pw.wib >= 2) : week >= 3 && week < BLOCK_WEEKS
  const sets = deload ? Math.max(1, Math.ceil(slot.sets / 2)) : Math.min(5, slot.sets + (late && !slot.isMain && !slot.core && state.profile.experience !== 'new' ? 1 : 0))
  const mk = (weight, reps, note, kind, why) => ({ weight, reps: Array.isArray(reps) ? reps : Array(sets).fill(reps), sets, note, kind, rir, why })
  const u = state.profile.units
  const bw = state.bodyweight?.[0]?.value
  const prof = { ...state.profile, bodyweightLb: bw ? (u === 'kg' ? bw / 0.4536 : bw) : null }

  if (!hist.length) {
    const why = slot.ladder?.dir === 'down' ? `Easier version until every set hits ${hi}` : slot.ladder?.dir === 'up' ? 'Harder version: you earned it' : 'First time, starting light'
    if (ex.load === 'bw') return mk(0, lo, `First time. Do clean reps and stop with about ${rir} left in the tank.`, 'calibrate', why)
    if (ex.load === 'band') return mk(startingLoad(ex, prof), hi, `First time. Start on a light band.`, 'calibrate', why)
    return mk(startingLoad(ex, prof), hi, `First time. Starting light; the first set tells me where you are.`, 'calibrate', why)
  }

  const last = hist[0]
  const top = Math.max(...last.work.map((s) => +s.weight || 0))
  const atTop = last.work.filter((s) => (+s.weight || 0) === top)
  const reps = atTop.map((s) => +s.reps || 0)
  const allHit = reps.length && reps.every((r) => r >= hi)
  const anyMiss = reps.some((r) => r < lo)
  // How the last time went, beyond the numbers: did you finish every set, and how did it feel?
  // A "strike" is a session that fell short: a set below the range, sets or the whole move left undone, or rated Hard.
  const skippedSince = state.sessions.some((x) => x.status === 'done' && new Date(x.startedAt) > new Date(last.session.startedAt) && (x.skipped || []).some((k) => k.exerciseId === ex.id))
  const unfinished = skippedSince || !!last.entry.incomplete
  const hard = last.entry.feel === 'hard'
  const easy = last.entry.feel === 'easy'
  const strikeOf = (h, t) => { const at = h.work.filter((x) => (+x.weight || 0) === t); return !!h.entry.incomplete || h.entry.feel === 'hard' || at.some((x) => (+x.reps || 0) < lo) }
  const strike = unfinished || hard || anyMiss
  const prev = hist[1]
  const prevTop = prev ? Math.max(...prev.work.map((x) => +x.weight || 0)) : null
  const prevStrike = !!prev && prevTop === top && strikeOf(prev, top)

  if (deload) return mk(top, lo, `Deload week. Same weight, half the sets, leave plenty in the tank. This is where the gains settle.`, 'deload', 'Easy week: fewer sets, so it all sinks in')

  if (ex.load === 'bw') {
    if (unfinished) return mk(top, reps.length ? reps.map((r) => Math.max(lo, Math.min(hi, r))).concat(Array(sets).fill(lo)).slice(0, sets) : lo, 'Same as last time. Finish every set first.', 'hold', 'Same as last time: finish every set first')
    if (hard) return mk(top, reps.map((r) => Math.max(1, r)).concat(Array(sets).fill(lo)).slice(0, sets), 'Last time was hard. Same reps, cleaner.', 'hold', 'Same as last time: it was hard')
    if (allHit) {
      const tgt = Math.min(hi + 6, Math.max(...reps) + 1)
      return mk(top, tgt, reps.every((r) => r >= hi + 5) ? `You own this. Swap to a harder version from the menu.` : `Every set hit ${hi}. Push to ${tgt}${unitWord}.`, 'reps', `Up to ${tgt}${unitWord}, from ${Math.max(...reps)}${unitWord}`)
    }
    return mk(top, reps.map((r) => Math.min(hi, r + 1)).concat(Array(sets).fill(lo)).slice(0, sets), `Beat last time by one${unitWord ? ' second' : ' rep'} per set.`, 'reps', unitWord ? 'A few seconds more than last time' : 'One more rep than last time')
  }

  if (ex.load === 'band') {
    if (strike && prevStrike && top > 0) return mk(top - 1, hi - 2, 'Two tough sessions on this band. One lighter, rebuild.', 'down', 'A lighter band to rebuild')
    if (unfinished || hard) return mk(top, Math.max(lo, Math.min(hi, Math.max(...reps, lo))), 'Same band, same reps.', 'hold', unfinished ? 'Same band: finish every set first' : 'Same band: last time was hard')
    if (allHit && top < 4) return mk(top + 1, lo, `Every set hit ${hi}. Move to the next band.`, 'up', 'Up a band: you earned it')
    return mk(top, Math.min(hi, Math.max(...reps) + 1), `Same band, chase ${hi}.`, 'hold', 'Same band, one more rep')
  }

  // two tough sessions in a row at the same weight: step back about 5% and rebuild
  if (strike && prevStrike) {
    const down = roundTo(ex, nextDown(ex, top * 0.95, equip), equip)
    if (down < top) return mk(down, hi - 1, `Two tough sessions at ${top}. Step back to ${down} and rebuild with clean reps.`, 'down', 'Two tough sessions: a small step back')
  }
  if (unfinished) {
    const per = Array.from({ length: sets }, (_, i) => Math.max(lo, Math.min(hi, reps[i] ?? reps[reps.length - 1] ?? lo)))
    return mk(top, per, `Same weight. Finish every set this time.`, 'hold', 'Same weight: finish every set this time')
  }
  const up = nextUp(ex, top, equip)
  const jump = up - top
  const big = top > 0 && jump / top > 0.1
  if (allHit && hard) return mk(top, hi, `You hit every rep, but it was hard. Own it before adding weight.`, 'hold', 'Same weight: last time was hard')
  if (allHit) {
    if (big && !reps.every((r) => r >= hi + 2)) {
      return mk(top, hi + 2, `Next step is a big jump (+${jump}). Earn it first: ${hi + 2} on every set at ${top}.`, 'hold', `Two more reps before the jump to ${up}`)
    }
    if (up === top) return mk(top, Math.min(hi + 4, hi + 2), `You're at the top of your equipment. Adding reps instead.`, 'reps', 'Heaviest you own, so more reps')
    const pct = top > 0 ? jump / top : 1
    // felt easy and the steps are small: skip one
    if (easy && pct <= 0.05) {
      const up2 = nextUp(ex, up, equip)
      if (up2 > up && (up2 - top) / top <= 0.1) return mk(up2, Math.max(lo, hi - 2), `Every set hit ${hi} and it felt easy. Up to ${up2}.`, 'up', `Up ${+((up2 - top).toFixed(2))} ${u}: last time was easy`)
    }
    const after = pct <= 0.05 ? Math.max(lo, hi - 2) : pct <= 0.1 ? Math.min(hi, lo + 1) : lo
    return mk(up, after, `Every set hit ${hi}. Up to ${up}, aim for ${after}+.`, 'up', `Up ${+(jump.toFixed(2))} ${u} from last time`)
  }
  if (anyMiss) return mk(top, lo, `Hold ${top}. Aim for ${lo}+ on every set.`, 'hold', `Same weight, get every set to ${lo}`)
  if (hard) return mk(top, reps.concat(Array(sets).fill(lo)).slice(0, sets), `Same weight and reps. Make them cleaner.`, 'hold', 'Same weight and reps: last time was hard')
  const per = Array.from({ length: sets }, (_, i) => Math.min(hi, (reps[i] ?? reps[reps.length - 1] ?? lo) + 1))
  return mk(top, per, `Hold ${top}. Beat last time: ${reps.join(', ')}.`, 'hold', 'Same weight, one more rep than last time')
}

// ---------- easier and harder versions ----------
// Bodyweight moves have no weight to drop, so they move along a ladder instead:
// two tough sessions in a row step down a rung; every set at the top of the range steps up one.
export const LADDERS = [
  ['knee_pushup', 'incline_pushup', 'pushup', 'decline_pushup'],
  ['box_squat_bw', 'bw_squat'],
  ['glute_bridge', 'sl_glute_bridge'],
  ['towel_row', 'inverted_row'],
  ['towel_row', 'chinup', 'pullup'],
  ['dead_bug', 'plank', 'hollow_hold'],
  ['curl_up', 'reverse_crunch', 'hanging_knee'],
  ['bird_dog', 'side_plank'],
]
const usable = (state, id) => { const ex = BY_ID[id]; return !!ex && ex.requires.every((r) => state.profile.equipment?.[r]?.on) && !ex.stress.some((x) => (state.profile.easyOn || []).includes(x)) }
function ladderFor(id, pattern) {
  const all = LADDERS.filter((l) => l.includes(id))
  return all.find((l) => l.some((x) => x !== id && BY_ID[x]?.pattern === pattern)) || all[0] || null
}
// After a session: which bodyweight moves should change version next time. Returns [{ slotId, from, to, dir }].
export function ladderMoves(state, finished) {
  const out = []
  for (const e of finished.entries) {
    const ex = BY_ID[e.exerciseId]
    if (!ex || ex.load !== 'bw' || !e.rep) continue
    const L = ladderFor(ex.id, e.pattern)
    if (!L) continue
    const i = L.indexOf(ex.id)
    const [lo, hi] = e.rep
    const hist = history(state.sessions, ex.id)
    const tough = (h) => !!h.entry.incomplete || h.entry.feel === 'hard' || h.work.some((x) => (+x.reps || 0) < lo)
    const owned = (h) => !h.entry.incomplete && h.entry.feel !== 'hard' && h.work.length >= (h.entry.planned || 1) && h.work.every((x) => (+x.reps || 0) >= hi)
    if (hist[0] && hist[1] && tough(hist[0]) && tough(hist[1])) {
      const to = [...L.slice(0, i)].reverse().find((x) => usable(state, x))
      if (to) out.push({ slotId: e.slotId, from: ex.id, to, dir: 'down' })
    } else if (hist[0] && owned(hist[0])) {
      const to = L.slice(i + 1).find((x) => usable(state, x))
      if (to) out.push({ slotId: e.slotId, from: ex.id, to, dir: 'up' })
    }
  }
  return out
}

export function warmups(ex, weight, equip) {
  if (!weight || !['bb', 'db', 'kb'].includes(ex.load)) return []
  const steps = stepsFor(ex, equip)
  if (!steps.length || weight <= steps[0]) return []
  const plan = ex.load === 'bb' ? [[0.45, 8], [0.65, 5], [0.85, 2]] : [[0.5, 8], [0.75, 4]]
  const seen = new Set()
  return plan
    .map(([f, r]) => ({ weight: roundTo(ex, weight * f, equip), reps: r }))
    .filter((w) => w.weight < weight && !seen.has(w.weight) && seen.add(w.weight))
}

// The day as it will be done today: short trims accessories, easy halves sets with more in reserve,
// and the check-in adds a set to main lifts when fresh or takes one from accessories when tired.
export function adjustSets(slot, sets, { short = false, easy = false, energy = 'normal' } = {}) {
  let n = sets
  if (short && !slot.isMain) n = Math.min(2, n)
  if (easy) n = Math.max(1, Math.ceil(n / 2))
  if (energy === 'fresh' && slot.isMain && !easy) n = Math.min(5, n + 1)
  if (energy === 'tired' && !slot.isMain) n = Math.max(1, n - 1)
  return n
}
export function planSlots(day, opts = {}) {
  let slots = day.slots
  if (opts.short) slots = slots.slice(0, Math.max(3, Math.ceil(slots.length * 0.6)))
  return slots.map((s) => ({ ...s, sets: adjustSets(s, s.sets, opts) }))
}

// Which moon day is most due: of the days not yet done in this cycle of the plan, the one whose last
// session is oldest. The others are offered as swaps; a swap only reorders, nothing is skipped.
export function recommend(state, now = new Date()) {
  const p = state.program
  if (!p) return null
  const pos = position(state)
  const n = p.days.length
  const inBlock = state.sessions.filter((s) => s.status === 'done' && s.programId === p.id && s.block === p.block).sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
  const cycle = inBlock.slice(pos.idx - (pos.idx % n))
  const doneKeys = new Set(cycle.map((s) => s.dayKey))
  const lastAt = (key) => Math.max(0, ...state.sessions.filter((s) => s.status === 'done' && s.dayKey === key).map((s) => new Date(s.startedAt).getTime()))
  const open = p.days.map((d, i) => ({ d, i })).filter(({ d }) => !doneKeys.has(d.key))
  const list = (open.length ? open : p.days.map((d, i) => ({ d, i }))).sort((a, b) => lastAt(a.d.key) - lastAt(b.d.key) || a.i - b.i)
  const recent = state.sessions.filter((s) => s.status === 'done' && now - new Date(s.startedAt) < 36 * 3600e3).map((s) => s.focus)
  const tag = ({ d, i }) => ({ dayIdx: i, key: d.key, name: d.name, focus: d.focus, palette: d.palette, sameAsYesterday: recent.includes(d.focus) })
  return { ...tag(list[0]), week: pos.week, deload: pos.isDeload, alternatives: list.slice(1, 3).map(tag), cycleDone: doneKeys.size, cycleSize: n }
}

// The lifting part of today's plan, plus a core block when the plan asks for one.
export function sessionSlots(state, dayIdx, { short = false, desc = null } = {}) {
  const p = state.program
  const day = p.days[dayIdx]
  let slots = day.slots
  if (short) slots = slots.slice(0, Math.max(3, Math.ceil(slots.length * 0.6)))
  // make room in this session for what the plan adds to it (a finisher, a core block): drop accessories from the end
  if (desc && (desc.finisher || desc.core)) {
    const extra = (desc.finisher ? 15 : 0) + (desc.core ? (state.plan?.goal === 'core' ? 10 : 7) : 0)
    const cap = (state.profile.sessionMinutes || 45) - extra
    const floor = p.days.length <= 3 ? 4 : 3
    while (slots.length > floor && estMinutes(slots) > cap) slots = slots.slice(0, -1)
  }
  if (desc?.core && state.plan) {
    const pw = planWeek(state.plan)
    const ok = (id) => { const ex = BY_ID[id]; return ex && ex.requires.every((r) => state.profile.equipment?.[r]?.on) && !ex.stress.some((x) => (state.profile.easyOn || []).includes(x)) }
    const have = new Set(slots.map((x) => x.exerciseId))
    const core = coreSlots(state, desc, pw, 0, ok).filter((x) => !have.has(x.exerciseId)).map((x) => ({ ...x, rep: BY_ID[x.exerciseId].unit === 'sec' ? [20, 45] : [8, 15] }))
    slots = [...slots.filter((x) => !(short && x.pattern === 'core')), ...core]
  }
  return slots
}

// What today's plan asks for, if a plan is running
export function todaysPlan(state, now = new Date()) {
  if (!state.plan) return null
  const pw = planWeek(state.plan, now)
  const list = weekSessions(state, pw)
  const doneKeys = new Set(state.sessions.filter((s) => s.status === 'done' && s.planId === state.plan.id).map((s) => s.planKey))
  return { pw, list, next: list.find((d) => !doneKeys.has(d.key)) || null, doneKeys }
}

// What every coming day holds: the rest of this week's sessions on your remaining training days,
// then each later week of the plan laid out on your training days. Lifting days keep rotating in order.
// Returns { [dateString]: { desc, pw, dayIdx } }.
export function forecast(state, from = new Date()) {
  const out = {}
  const p = state.program
  if (!p && !state.plan) return out
  if (state.profile.mode === 'yoga') return out
  const order = [...(state.profile.trainDays || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  if (!order.length) return out
  const today = new Date(from); today.setHours(0, 0, 0, 0)
  const doneToday = state.sessions.some((x) => x.status === 'done' && !x.partOf && new Date(x.startedAt).toDateString() === today.toDateString())
  let lift = position(state)?.idx ?? 0
  const mon = new Date(today); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
  for (let w = 0; w < 14; w++) {
    const wkStart = new Date(mon); wkStart.setDate(mon.getDate() + 7 * w)
    const pw = state.plan ? planWeek(state.plan, wkStart) : null
    if (pw?.over) break
    if (!state.plan && w >= 6) break
    let list = state.plan ? weekSessions(state, pw) : order.map((_, i) => ({ key: `x${w}-${i}`, kind: 'lift' }))
    if (w === 0 && state.plan) {
      const doneKeys = new Set(state.sessions.filter((x) => x.status === 'done' && x.planId === state.plan.id).map((x) => x.planKey))
      list = list.filter((d) => !doneKeys.has(d.key))
    }
    const days = order.map((wd) => { const d = new Date(wkStart); d.setDate(wkStart.getDate() + ((wd + 6) % 7)); return d })
      .filter((d) => w > 0 || d > today || (d.getTime() === today.getTime() && !doneToday))
    days.forEach((d, i) => {
      const desc = list[i]
      if (!desc) return
      const entry = { desc, pw }
      if (desc.kind === 'lift' && p) { entry.dayIdx = lift % p.days.length; lift++ }
      out[d.toDateString()] = entry
    })
  }
  return out
}

export function buildSession(state, dayIdx, week, { short = false, easy = false, energy = 'normal', desc = null } = {}) {
  const p = state.program
  const day = p.days[dayIdx]
  const deload = state.plan ? (() => { const t = planWeek(state.plan).type; return t === 'easy' || t === 'test' })() : week >= p.weeks
  const slots = sessionSlots(state, dayIdx, { short, desc })
  const entries = slots.map((slot, i) => {
    const ex = BY_ID[slot.exerciseId]
    const sg = suggest(state, slot, week, deload)
    if (easy) sg.rir = (sg.rir ?? 2) + 1
    const work = Array.from({ length: adjustSets(slot, sg.sets, { short, easy, energy }) }, (_, k) => ({

      id: uid(), kind: 'work', weight: sg.weight, reps: null, target: sg.reps[k] ?? sg.reps[0], rir: null, done: false,
    }))
    const wu = i === 0 || (slot.isMain && i < 2) ? warmups(ex, sg.weight, state.profile.equipment).map((w) => ({ id: uid(), kind: 'warmup', weight: w.weight, reps: null, target: w.reps, done: false })) : []
    return {
      id: uid(), slotId: slot.id, exerciseId: ex.id, pattern: slot.pattern, rep: slot.rep, rest: slot.rest,
      isMain: slot.isMain, core: !!slot.core, targetRir: sg.rir, note: sg.note, why: sg.why, kind: sg.kind, sets: [...wu, ...work], memo: '',
    }
  })
  return {
    id: uid(), programId: p.id, block: p.block, dayKey: day.key, dayName: day.name, focus: day.focus, palette: day.palette,
    week, deload, short, easy, energy, startedAt: new Date().toISOString(), endedAt: null, status: 'active', entries,
    planId: state.plan?.id || null, planKey: desc?.key || null, finisher: !!desc?.finisher, test: !!desc?.test,
  }
}

export function swapOptions(state, pattern, currentId) {
  return candidatesFor(pattern, state.profile.equipment, state.profile.easyOn).filter((e) => e.id !== currentId)
}
