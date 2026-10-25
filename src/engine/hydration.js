// Pure water math, shared by the app, the widget endpoint and the widgets.
export const ML_PER_OZ = 29.5735

// About 35 ml per kg of body weight (a common baseline for drinking water on top of food),
// plus 500 ml on a training day. 2.5 L when body weight is unknown. Rounded to 250 ml.
export function waterTarget(state, date = new Date()) {
  const bw = state.bodyweight?.[0]?.value
  const kg = bw ? (state.profile.units === 'kg' ? bw : bw * 0.4536) : null
  let ml = kg ? kg * 35 : 2500
  const trained = (state.sessions || []).some((s) => s.status !== 'active' && new Date(s.startedAt).toDateString() === date.toDateString())
  if (trained) ml += 500
  return Math.round(ml / 250) * 250
}

export function waterTotal(state, date = new Date()) {
  const k = date.toDateString()
  return (state.water || []).filter((w) => new Date(w.at).toDateString() === k).reduce((t, w) => t + w.ml, 0)
}
