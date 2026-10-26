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
      M('thread_needle', 'Thread the needle', 90, 'Slide one arm under, rest the shoulder down. Switch halfway.', true),
      M('cobra', 'Cobra', 60, 'Hips down, press up gently, shoulders away from the ears.'),
      M('down_dog', 'Down dog', 60, 'Long spine, heels sink toward the floor, pedal the feet.'),
      M('forward_fold', 'Forward fold', 60, 'Hang, breathe, no effort.'),
      { type: 'breathe', secs: 120 },
    ],
  },
]

// Warm-ups are built for the day: raise the pulse, then open up what the day will load.
// About four minutes; a short session keeps the first two moves.
const PULSE = M('jumping_jack', 'Jumping jacks', 40, 'Light and springy. Just get warm.')
const WARM = {
  upper: [PULSE, M('cat_cow', 'Cat and cow', 40, 'Loosen the spine.'), M('prone_ytw', 'Y-T-W raises', 45, 'Face down, thumbs up. Hold each letter a breath.'), M('thread_needle', 'Thread the needle', 50, 'Open the upper back. Switch sides halfway.', true)],
  lower: [PULSE, M('glute_bridge', 'Glute bridge', 40, 'Squeeze at the top, lower slowly.'), M('world_greatest', 'World’s greatest stretch', 60, 'Lunge, hand down, reach up. Switch sides halfway.', true), M('bw_squat', 'Slow squat', 40, 'Easy, full range.')],
  full: [PULSE, M('world_greatest', 'World’s greatest stretch', 60, 'Lunge, hand down, reach up. Switch sides halfway.', true), M('bw_squat', 'Slow squat', 40, 'Easy, full range.'), M('prone_ytw', 'Y-T-W raises', 40, 'Face down, thumbs up. Hold each letter a breath.')],
}
const COOL = {
  upper: [M('child_pose', 'Child’s pose', 45, 'Sit back, arms long, let the shoulders open.'), M('thread_needle', 'Thread the needle', 50, 'Slow and easy. Switch sides halfway.', true)],
  lower: [M('hip_flexor', 'Hip flexor stretch', 50, 'Tuck your tail, shift forward. Switch sides halfway.', true), M('forward_fold', 'Forward fold', 45, 'Hang heavy, breathe out slowly.')],
  full: [M('forward_fold', 'Forward fold', 45, 'Hang heavy, breathe out slowly.'), M('child_pose', 'Child’s pose', 45, 'Sit back and let the heart rate settle.')],
}
const kindOf = (focus = '') => (/upper|push|pull/i.test(focus) ? 'upper' : /lower|legs/i.test(focus) ? 'lower' : 'full')
export const warmupFor = (focus, short) => (short ? WARM[kindOf(focus)].slice(0, 2) : WARM[kindOf(focus)])
export const cooldownFor = (focus, short) => (short ? COOL[kindOf(focus)].slice(0, 1) : COOL[kindOf(focus)])
export const WARMUP = WARM.full
export const COOLDOWN = COOL.full

export const stepSecs = (s) => (s.type === 'water' ? 20 : s.secs || 0)
export const flowMinutes = (steps) => Math.max(1, Math.round(steps.reduce((t, s) => t + stepSecs(s) + 5, 0) / 60))
export const flowByKey = (k) => (k === 'morning' ? MORNING : FLOWS.find((f) => f.key === k) || FLOWS[0])
export const todaysFlow = (d = new Date()) => FLOWS[d.getDay() % FLOWS.length]
