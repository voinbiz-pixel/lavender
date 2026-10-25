// Timed routines: the morning routine, rest-day stretch flows, and a workout's warm-up and cool-down.
// Every step is one of:
//   { type: 'move', id, name, cue, secs, sides }   a move from moves.js, shown looping; sides: switch halfway
//   { type: 'water' }                              drink a glass (logs it)
//   { type: 'breathe', secs }                      slow breathing: 4 in, 4 out

const M = (id, name, secs, cue, sides = false) => ({ type: 'move', id, name, secs, cue, sides })

export const MORNING = {
  key: 'morning',
  name: 'Morning',
  steps: [
    { type: 'water' },
    M('cat_cow', 'Cat and cow', 60, 'Round your back as you breathe out, let it sink as you breathe in.'),
    M('hip_flexor', 'Hip flexor stretch', 60, 'Tuck your tail and shift forward. Switch sides halfway.', true),
    M('bw_squat', 'Slow squat', 45, 'Three seconds down, stand tall. Wake the legs up.'),
    M('forward_fold', 'Forward fold', 45, 'Soft knees, hang heavy, let your head go.'),
    { type: 'breathe', secs: 60 },
  ],
}

// Rest-day and yoga flows. Today's pick rotates by weekday; the other two are one tap away.
export const FLOWS = [
  {
    key: 'hips', name: 'Hips and back', steps: [
      M('cat_cow', 'Cat and cow', 90, 'Move slowly with the breath.'),
      M('child_pose', 'Child’s pose', 90, 'Sit back to your heels, reach long, forehead down.'),
      M('hip_flexor', 'Hip flexor stretch', 120, 'Tuck your tail, shift forward, reach up. Switch sides halfway.', true),
      M('sl_glute_bridge', 'Single-leg bridge', 60, 'Drive through the heel, hips level. Switch halfway.', true),
      M('forward_fold', 'Forward fold', 90, 'Soft knees, let the back of the legs open.'),
      M('dead_bug', 'Dead bug', 60, 'Low back pressed down, opposite arm and leg reach slowly.'),
      { type: 'breathe', secs: 120 },
    ],
  },
  {
    key: 'core', name: 'Core and balance', steps: [
      M('cat_cow', 'Cat and cow', 60, 'Warm up the spine.'),
      M('dead_bug', 'Dead bug', 60, 'Slow and controlled, back flat.'),
      M('plank', 'Plank', 45, 'One long line from head to heels. Breathe.'),
      M('side_plank', 'Side plank', 60, 'Hips high. Switch sides halfway.', true),
      M('bw_sl_hinge', 'Single-leg hinge', 60, 'Slow, balanced, hips square. Switch halfway.', true),
      M('child_pose', 'Child’s pose', 90, 'Rest and breathe into your back.'),
      { type: 'breathe', secs: 90 },
    ],
  },
  {
    key: 'unwind', name: 'Wind down', steps: [
      M('child_pose', 'Child’s pose', 90, 'Let everything go heavy.'),
      M('cat_cow', 'Cat and cow', 60, 'Small, easy movements.'),
      M('hip_flexor', 'Hip flexor stretch', 90, 'Gentle. Switch sides halfway.', true),
      M('forward_fold', 'Forward fold', 90, 'Hang, breathe, no effort.'),
      { type: 'breathe', secs: 120 },
    ],
  },
]

export const WARMUP = [
  M('cat_cow', 'Cat and cow', 40, 'Loosen the spine.'),
  M('bw_squat', 'Slow squat', 40, 'Easy, full range.'),
]
export const COOLDOWN = [
  M('forward_fold', 'Forward fold', 45, 'Hang heavy, breathe out slowly.'),
  M('child_pose', 'Child’s pose', 45, 'Sit back and let the heart rate settle.'),
]

export const stepSecs = (s) => (s.type === 'water' ? 20 : s.secs || 0)
export const flowMinutes = (steps) => Math.max(1, Math.round(steps.reduce((t, s) => t + stepSecs(s) + 5, 0) / 60))
export const flowByKey = (k) => (k === 'morning' ? MORNING : FLOWS.find((f) => f.key === k) || FLOWS[0])
export const todaysFlow = (d = new Date()) => FLOWS[d.getDay() % FLOWS.length]
