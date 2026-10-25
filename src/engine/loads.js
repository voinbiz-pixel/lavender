// Weight math that respects the equipment a person actually owns.
// Everything is stored in the person's chosen unit.

export const BAND_LEVELS = ['Extra light', 'Light', 'Medium', 'Heavy', 'Extra heavy']

const r2 = (n) => Math.round(n * 100) / 100

export function dumbbellSteps(db) {
  if (!db?.on) return []
  if (db.kind === 'fixed' && Array.isArray(db.list) && db.list.length) return [...db.list].sort((a, b) => a - b)
  const out = []
  const step = db.step || 5
  for (let w = db.min || 5; w <= (db.max || 50) + 1e-6; w += step) out.push(r2(w))
  return out
}

export function barbellSteps(bb, lower) {
  if (!bb?.on) return []
  const inc = 2 * (bb.smallest || 2.5) * (lower ? 2 : 1)
  const out = []
  for (let w = bb.bar || 45; w <= (bb.max || 315) + 1e-6; w += inc) out.push(r2(w))
  return out
}

const LOWER = new Set(['squat', 'hinge', 'hipext', 'lunge'])

export function stepsFor(ex, equip) {
  if (ex.load === 'db') return dumbbellSteps(equip.dumbbells)
  if (ex.load === 'bb') return barbellSteps(equip.barbell, LOWER.has(ex.pattern))
  if (ex.load === 'kb') return [...(equip.kettlebell?.list || [])].sort((a, b) => a - b)
  if (ex.load === 'band') return [0, 1, 2, 3, 4]
  return []
}

export function roundTo(ex, w, equip) {
  const steps = stepsFor(ex, equip)
  if (!steps.length || w == null) return w
  let best = steps[0]
  for (const s of steps) if (Math.abs(s - w) < Math.abs(best - w)) best = s
  return best
}

export function nextUp(ex, w, equip) {
  const steps = stepsFor(ex, equip)
  if (!steps.length) return w
  return steps.find((s) => s > w + 1e-6) ?? steps[steps.length - 1]
}

export function nextDown(ex, w, equip) {
  const steps = stepsFor(ex, equip)
  if (!steps.length) return w
  const lower = steps.filter((s) => s < w - 1e-6)
  return lower.length ? lower[lower.length - 1] : steps[0]
}

export function fmtLoad(ex, w, unit) {
  if (ex.load === 'bw') return w ? `+${w}` : 'BW'
  if (ex.load === 'band') return BAND_LEVELS[w ?? 2]
  if (w == null) return '?'
  return `${+w}`
}

// Plates per side for a barbell load.
export function plateMath(total, bb, unit) {
  const plates = unit === 'kg' ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5]
  let side = (total - (bb?.bar || (unit === 'kg' ? 20 : 45))) / 2
  const out = []
  for (const p of plates) {
    while (side >= p - 1e-6) { out.push(p); side -= p }
  }
  return { perSide: out, leftover: r2(side) }
}

export const e1rm = (w, reps, rir = 0) => (w > 0 && reps > 0 ? w * (1 + (reps + (rir || 0)) / 30) : 0)
