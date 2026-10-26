// Plain-words answers to three questions, everywhere in the app: what does this work, why is it today,
// and how should it feel. One short line each.
import { MUSCLES } from './exercises.js'

// what a lifting day is for, by its focus
export const DAY_JOB = {
  'Full body': 'Every big muscle in one go: legs, chest and back',
  Upper: 'Pressing and pulling strength for chest, back and shoulders',
  Lower: 'Leg and hip strength: squats, hinges and lunges',
  Push: 'Chest, shoulders and triceps: everything that presses',
  Pull: 'Back and biceps: everything that pulls, and better posture',
  Legs: 'Quads, glutes and hamstrings, finished with calves',
}
export const dayJob = (focus) => DAY_JOB[focus] || 'Strength for the whole body'

// what each kind of week in a plan is for
export const WEEK_MEANING = {
  build: { short: 'a little heavier than last time', long: 'Build weeks add a little at a time: a rep, a few pounds. Small steps every week add up.' },
  push: { short: 'the hardest week of the plan', long: 'The push week asks the most: close to your limit, on purpose, right before you rest.' },
  easy: { short: 'lighter on purpose', long: 'Easy weeks halve the sets so your body can catch up. This is when the work turns into strength.' },
  test: { short: 'easy, plus a retest', long: 'The last week is easy, with your fitness test again, so you can see how far you came.' },
}

// how hard a set should feel, from reps in reserve
export function effortWords(rir) {
  if (rir == null) return 'Steady and controlled'
  if (rir >= 4) return 'Easy effort: plenty left in the tank'
  if (rir === 3) return 'Finish each set with about 3 reps left in you'
  if (rir === 2) return 'Finish each set with about 2 reps left in you'
  if (rir === 1) return 'Hard: about 1 rep left in you'
  return 'All out, with good form'
}

// the four parts of a workout, said once when you reach each
export const PART_CAPTION = [
  'Warm-up: raises your pulse and loosens what today will load',
  'Strength: the heavy part, where you get stronger',
  'Accessories: smaller muscles, more reps',
  'Cool-down: brings your heart rate back down',
]
export const CORE_CAPTION = 'Core: bracing, curling and resisting a twist'

export const muscleNames = (ex) => (ex?.muscles || []).map((m) => MUSCLES[m] || m)
export const muscleLine = (ex) => { const n = muscleNames(ex); return n.length ? n.join(' · ') : '' }

// what each mobility and warm-up move does, and where you should feel it
export const MOVE_INFO = {
  cat_cow: { does: 'Moves your spine through its whole range', feel: 'Your whole back, top to bottom' },
  child_pose: { does: 'Lets your back and hips let go', feel: 'Low back, hips and shoulders' },
  hip_flexor: { does: 'Opens the front of your hip after a day of sitting', feel: 'Front of the back leg’s hip' },
  forward_fold: { does: 'Lengthens the whole back of your body', feel: 'Hamstrings and low back' },
  bw_squat: { does: 'Wakes up your legs and hips', feel: 'Thighs and glutes, gently' },
  dead_bug: { does: 'Teaches your core to hold still while limbs move', feel: 'Deep in your stomach' },
  plank: { does: 'Builds a core that holds you straight', feel: 'Stomach, shoulders and glutes' },
  side_plank: { does: 'Strengthens the sides of your core', feel: 'The side of your waist' },
  sl_glute_bridge: { does: 'Wakes up each glute on its own', feel: 'The glute of the working leg' },
  glute_bridge: { does: 'Wakes up your glutes before legs work', feel: 'Glutes, not your low back' },
  bw_sl_hinge: { does: 'Builds balance and hamstring control', feel: 'Back of the standing leg' },
  thread_needle: { does: 'Unlocks the upper back so you can rotate', feel: 'Between your shoulder blades' },
  cobra: { does: 'Gently bends your back the other way', feel: 'Low back and stomach, softly' },
  down_dog: { does: 'Stretches calves and hamstrings, opens shoulders', feel: 'Backs of the legs and shoulders' },
  jumping_jack: { does: 'Raises your pulse and warms the muscles', feel: 'Breathing a little faster' },
  prone_ytw: { does: 'Switches on the muscles that hold your shoulders back', feel: 'Upper back and back of the shoulders' },
  world_greatest: { does: 'Opens hips, hamstrings and upper back in one move', feel: 'Front hip, then your mid back as you reach' },
  bird_dog: { does: 'Teaches your back to stay still under load', feel: 'Low back and glutes, lightly' },
}

// what each routine is for, shown on its card and intro
export const FLOW_PURPOSE = {
  morning: 'Wakes your body up gently before the day starts',
  hips: 'Undoes a day of sitting: hips, low back and hamstrings',
  core: 'A steadier middle and better balance',
  unwind: 'Slows everything down before sleep',
}

// what each treadmill session is for
export function cardioPurpose(c) {
  const k = c?.meta?.kind
  if (c?.test) return 'Shows where your fitness is today, to compare at the end'
  if (k === 'intervals') return 'Pushes your top end. The one hard day of the week'
  if (k === 'hills') return 'Hard climbs, easy walks: fitness without running'
  if (k === 'easyrun') return 'Builds your engine. You should be able to talk the whole time'
  if (k === 'longrun') return 'Your longest run, kept easy: builds staying power'
  if (k === 'incline' || k === 'longwalk') return 'A steady climb: burns fat and builds your base, easy on the joints'
  if (k === 'runwalk') return 'Run a little, walk a little. Each stage runs longer'
  return 'Easy, steady work after lifting'
}
