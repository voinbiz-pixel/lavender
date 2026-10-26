// Exercise library. Every exercise declares what it needs, how it is loaded,
// and which pattern slot it can fill. The generator picks the first candidate
// per pattern that the person's equipment and "go easy on" list allow.

// load: 'db' dumbbell (per hand), 'bb' barbell (total), 'kb' kettlebell, 'bw' bodyweight, 'band'
// unit: 'reps' (default) or 'sec'
// stress: joints this movement loads heavily, used by the "go easy on" filter

export const EQUIPMENT = [
  { key: 'dumbbells', label: 'Dumbbells', hint: 'Adjustable or a set' },
  { key: 'bench', label: 'Flat bench', hint: 'Any sturdy bench' },
  { key: 'adjBench', label: 'Incline bench', hint: 'Adjustable back' },
  { key: 'barbell', label: 'Barbell + plates', hint: 'Olympic or standard' },
  { key: 'rack', label: 'Squat rack', hint: 'Or stands with safeties' },
  { key: 'pullupBar', label: 'Pull-up bar', hint: 'Doorway counts' },
  { key: 'bands', label: 'Resistance bands', hint: 'Loop or tube' },
  { key: 'kettlebell', label: 'Kettlebells', hint: 'One or more' },
  { key: 'treadmill', label: 'Treadmill', hint: 'For cardio days' },
  { key: 'jumpRope', label: 'Jump rope', hint: 'For finishers' },
]

export const EASY_ON = [
  { key: 'knees', label: 'Knees' },
  { key: 'back', label: 'Lower back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'wrists', label: 'Wrists' },
]

export const MUSCLES = {
  quads: 'Quads', glutes: 'Glutes', hams: 'Hamstrings', chest: 'Chest', back: 'Back',
  lats: 'Lats', delts: 'Shoulders', sideDelts: 'Side delts', rearDelts: 'Rear delts',
  biceps: 'Biceps', triceps: 'Triceps', calves: 'Calves', core: 'Core',
}

const X = (o) => ({ unit: 'reps', stress: [], requires: [], ...o })

export const EXERCISES = [
  // squat
  X({ id: 'bb_back_squat', name: 'Back Squat', pattern: 'squat', load: 'bb', tier: 'main', requires: ['barbell', 'rack'], muscles: ['quads', 'glutes'], stress: ['knees', 'back'], cue: 'Brace, sit between your heels, drive the floor away.' }),
  X({ id: 'db_goblet_squat', name: 'Goblet Squat', pattern: 'squat', load: 'db', single: true, tier: 'main', requires: ['dumbbells'], muscles: ['quads', 'glutes'], stress: ['knees'], cue: 'One bell at your chest, elbows inside the knees.' }),
  X({ id: 'kb_goblet_squat', name: 'Kettlebell Goblet Squat', pattern: 'squat', load: 'kb', tier: 'main', requires: ['kettlebell'], muscles: ['quads', 'glutes'], stress: ['knees'], cue: 'Hold by the horns, chest tall.' }),
  X({ id: 'box_squat_bw', name: 'Tempo Box Squat', pattern: 'squat', load: 'bw', tier: 'main', requires: ['bench'], muscles: ['quads', 'glutes'], cue: 'Three seconds down, touch the bench, stand.' }),
  X({ id: 'bw_squat', name: 'Tempo Squat', pattern: 'squat', load: 'bw', tier: 'main', muscles: ['quads', 'glutes'], cue: 'Three seconds down, one second pause.' }),

  // hinge
  X({ id: 'bb_rdl', name: 'Romanian Deadlift', pattern: 'hinge', load: 'bb', tier: 'main', requires: ['barbell'], muscles: ['hams', 'glutes'], stress: ['back'], cue: 'Soft knees, push the hips back, bar close.' }),
  X({ id: 'db_rdl', name: 'Dumbbell RDL', pattern: 'hinge', load: 'db', tier: 'main', requires: ['dumbbells'], muscles: ['hams', 'glutes'], stress: ['back'], cue: 'Bells slide down the thighs, flat back.' }),
  X({ id: 'kb_swing', name: 'Kettlebell Swing', pattern: 'hinge', load: 'kb', tier: 'main', requires: ['kettlebell'], muscles: ['glutes', 'hams'], stress: ['back'], cue: 'Snap the hips, arms are just ropes.' }),
  X({ id: 'db_sl_rdl', name: 'Single-Leg RDL', pattern: 'hinge', load: 'db', single: true, tier: 'main', requires: ['dumbbells'], muscles: ['hams', 'glutes'], cue: 'Hips square, reach the free leg long.' }),
  X({ id: 'bw_sl_hinge', name: 'Single-Leg Hip Hinge', pattern: 'hinge', load: 'bw', tier: 'main', muscles: ['hams', 'glutes'], cue: 'Slow, balanced, hips square.' }),

  // horizontal push
  X({ id: 'bb_bench', name: 'Bench Press', pattern: 'hpush', load: 'bb', tier: 'main', requires: ['barbell', 'bench', 'rack'], muscles: ['chest', 'triceps'], stress: ['shoulders', 'wrists'], cue: 'Shoulder blades pinned, touch low chest.' }),
  X({ id: 'db_bench', name: 'Dumbbell Bench Press', pattern: 'hpush', load: 'db', tier: 'main', requires: ['dumbbells', 'bench'], muscles: ['chest', 'triceps'], cue: 'Elbows about 45°, bells meet over the chest.' }),
  X({ id: 'db_floor_press', name: 'Dumbbell Floor Press', pattern: 'hpush', load: 'db', tier: 'main', requires: ['dumbbells'], muscles: ['chest', 'triceps'], cue: 'Pause the elbows on the floor.' }),
  X({ id: 'knee_pushup', name: 'Knee Push-up', pattern: 'hpush', load: 'bw', tier: 'main', ladderOnly: true, muscles: ['chest', 'triceps'], stress: ['wrists'], cue: 'Knees down, one straight line from knees to head.' }),
  X({ id: 'incline_pushup', name: 'Incline Push-up', pattern: 'hpush', load: 'bw', tier: 'main', ladderOnly: true, requires: ['bench'], muscles: ['chest', 'triceps'], cue: 'Hands on the bench, body in one line, chest to the edge.' }),
  X({ id: 'pushup', name: 'Push-up', pattern: 'hpush', load: 'bw', tier: 'main', muscles: ['chest', 'triceps'], stress: ['wrists'], cue: 'Body in one line, chest to fist height.' }),

  // incline push
  X({ id: 'db_incline', name: 'Incline Dumbbell Press', pattern: 'ipush', load: 'db', tier: 'main', requires: ['dumbbells', 'adjBench'], muscles: ['chest', 'delts'], cue: 'Bench at 30°, press up and slightly back.' }),
  X({ id: 'db_low_incline_floor', name: 'Feet-Up Floor Press', pattern: 'ipush', load: 'db', tier: 'main', requires: ['dumbbells'], muscles: ['chest', 'delts'], cue: 'Hips raised into a bridge, press.' }),
  X({ id: 'decline_pushup', name: 'Feet-Elevated Push-up', pattern: 'ipush', load: 'bw', tier: 'main', requires: ['bench'], muscles: ['chest', 'delts'], stress: ['wrists'], cue: 'Feet on the bench, body straight.' }),
  X({ id: 'pushup_i', name: 'Push-up (slow)', pattern: 'ipush', load: 'bw', tier: 'main', muscles: ['chest', 'delts'], stress: ['wrists'], cue: 'Three seconds down.' }),

  // vertical push
  X({ id: 'db_seated_press', name: 'Seated Dumbbell Press', pattern: 'vpush', load: 'db', tier: 'main', requires: ['dumbbells', 'adjBench'], muscles: ['delts', 'triceps'], stress: ['shoulders'], cue: 'Back on the pad, press in a slight arc.' }),
  X({ id: 'db_standing_press', name: 'Standing Dumbbell Press', pattern: 'vpush', load: 'db', tier: 'main', requires: ['dumbbells'], muscles: ['delts', 'triceps'], stress: ['shoulders', 'back'], cue: 'Squeeze glutes, ribs down.' }),
  X({ id: 'db_landmine_like', name: 'Half-Kneeling One-Arm Press', pattern: 'vpush', load: 'db', single: true, tier: 'main', requires: ['dumbbells'], muscles: ['delts', 'triceps'], cue: 'Shoulder-friendly angle, press slightly forward.' }),
  X({ id: 'bb_ohp', name: 'Overhead Press', pattern: 'vpush', load: 'bb', tier: 'main', requires: ['barbell'], muscles: ['delts', 'triceps'], stress: ['shoulders', 'back'], cue: 'Head through once the bar passes.' }),
  X({ id: 'pike_pushup', name: 'Pike Push-up', pattern: 'vpush', load: 'bw', tier: 'main', muscles: ['delts', 'triceps'], stress: ['shoulders', 'wrists'], cue: 'Hips high, head to a spot ahead of the hands.' }),

  // horizontal pull
  X({ id: 'db_chest_row', name: 'Chest-Supported Row', pattern: 'hpull', load: 'db', tier: 'main', requires: ['dumbbells', 'adjBench'], muscles: ['back', 'rearDelts'], cue: 'Chest on the pad, elbows to the hips.' }),
  X({ id: 'db_row', name: 'One-Arm Dumbbell Row', pattern: 'hpull', load: 'db', single: true, tier: 'main', requires: ['dumbbells', 'bench'], muscles: ['back', 'lats'], cue: 'Hand and knee on the bench, row to the hip.' }),
  X({ id: 'bb_row', name: 'Barbell Row', pattern: 'hpull', load: 'bb', tier: 'main', requires: ['barbell'], muscles: ['back', 'lats'], stress: ['back'], cue: 'Torso at 45°, bar to the belly.' }),
  X({ id: 'db_row_standing', name: 'Bent-Over Dumbbell Row', pattern: 'hpull', load: 'db', tier: 'main', requires: ['dumbbells'], muscles: ['back', 'lats'], stress: ['back'], cue: 'Hinge, flat back, pull both together.' }),
  X({ id: 'inverted_row', name: 'Inverted Row', pattern: 'hpull', load: 'bw', tier: 'main', requires: ['rack'], muscles: ['back', 'rearDelts'], cue: 'Bar at hip height in the rack, chest to bar.' }),
  X({ id: 'band_row', name: 'Band Row', pattern: 'hpull', load: 'band', tier: 'main', requires: ['bands'], muscles: ['back', 'rearDelts'], cue: 'Anchor at chest height, squeeze for a second.' }),

  // vertical pull
  X({ id: 'pullup', name: 'Pull-up', pattern: 'vpull', load: 'bw', tier: 'main', requires: ['pullupBar'], muscles: ['lats', 'biceps'], stress: ['shoulders'], cue: 'Dead hang to chin over. Use negatives if needed.' }),
  X({ id: 'chinup', name: 'Chin-up', pattern: 'vpull', load: 'bw', tier: 'main', requires: ['pullupBar'], muscles: ['lats', 'biceps'], cue: 'Palms toward you, chest to the bar.' }),
  X({ id: 'band_pulldown', name: 'Band Lat Pulldown', pattern: 'vpull', load: 'band', tier: 'main', requires: ['bands'], muscles: ['lats', 'biceps'], cue: 'Anchor high, elbows to the ribs.' }),
  X({ id: 'db_pullover', name: 'Dumbbell Pullover', pattern: 'vpull', load: 'db', single: true, tier: 'main', requires: ['dumbbells', 'bench'], muscles: ['lats', 'chest'], stress: ['shoulders'], cue: 'Long arms, stretch behind the head.' }),
  X({ id: 'db_kneel_row_high', name: 'High-Elbow Dumbbell Row', pattern: 'vpull', load: 'db', tier: 'main', requires: ['dumbbells'], muscles: ['lats', 'rearDelts'], cue: 'Pull toward the chest, elbows wide.' }),
  X({ id: 'towel_row', name: 'Doorframe Row', pattern: 'hpull', load: 'bw', tier: 'main', muscles: ['lats', 'biceps'], cue: 'Grip the frame, lean back, pull.' }),

  // single leg
  X({ id: 'db_bulgarian', name: 'Bulgarian Split Squat', pattern: 'lunge', load: 'db', tier: 'acc', requires: ['dumbbells', 'bench'], muscles: ['quads', 'glutes'], stress: ['knees'], cue: 'Back foot on the bench, front shin vertical-ish.' }),
  X({ id: 'db_reverse_lunge', name: 'Reverse Lunge', pattern: 'lunge', load: 'db', tier: 'acc', requires: ['dumbbells'], muscles: ['quads', 'glutes'], cue: 'Step back, knee kisses the floor.' }),
  X({ id: 'db_step_up', name: 'Step-up', pattern: 'lunge', load: 'db', tier: 'acc', requires: ['dumbbells', 'bench'], muscles: ['quads', 'glutes'], cue: 'Drive through the top foot only.' }),
  X({ id: 'bw_split_squat', name: 'Split Squat', pattern: 'lunge', load: 'bw', tier: 'acc', muscles: ['quads', 'glutes'], stress: ['knees'], cue: 'Long stance, straight down.' }),

  // hip extension
  X({ id: 'db_hip_thrust', name: 'Dumbbell Hip Thrust', pattern: 'hipext', load: 'db', single: true, tier: 'acc', requires: ['dumbbells', 'bench'], muscles: ['glutes'], cue: 'Shoulders on the bench, chin tucked, pause at top.' }),
  X({ id: 'bb_hip_thrust', name: 'Barbell Hip Thrust', pattern: 'hipext', load: 'bb', tier: 'acc', requires: ['barbell', 'bench'], muscles: ['glutes'], cue: 'Pad the bar, ribs down at the top.' }),
  X({ id: 'sl_glute_bridge', name: 'Single-Leg Glute Bridge', pattern: 'hipext', load: 'bw', tier: 'acc', muscles: ['glutes', 'hams'], cue: 'Push through the heel, hold one second.' }),

  // hamstring curl
  X({ id: 'slider_curl', name: 'Sliding Leg Curl', pattern: 'hamcurl', load: 'bw', tier: 'acc', muscles: ['hams'], cue: 'Towel under the heels on a smooth floor, hips up.' }),
  X({ id: 'db_ham_curl', name: 'Prone Dumbbell Leg Curl', pattern: 'hamcurl', load: 'db', single: true, tier: 'acc', requires: ['dumbbells', 'bench'], muscles: ['hams'], cue: 'Bell between the feet, curl slow.' }),

  // isolation
  X({ id: 'db_fly', name: 'Dumbbell Fly', pattern: 'chestiso', load: 'db', tier: 'acc', requires: ['dumbbells', 'bench'], muscles: ['chest'], stress: ['shoulders'], cue: 'Soft elbows, deep stretch, hug a tree.' }),
  X({ id: 'band_fly', name: 'Band Chest Fly', pattern: 'chestiso', load: 'band', tier: 'acc', requires: ['bands'], muscles: ['chest'], cue: 'Anchor behind, bring hands together.' }),
  X({ id: 'db_lateral', name: 'Lateral Raise', pattern: 'sidedelt', load: 'db', tier: 'acc', requires: ['dumbbells'], muscles: ['sideDelts'], cue: 'Lead with the elbows, stop at shoulder height.' }),
  X({ id: 'band_lateral', name: 'Band Lateral Raise', pattern: 'sidedelt', load: 'band', tier: 'acc', requires: ['bands'], muscles: ['sideDelts'], cue: 'Stand on the band, slow lower.' }),
  X({ id: 'band_face_pull', name: 'Band Face Pull', pattern: 'reardelt', load: 'band', tier: 'acc', requires: ['bands'], muscles: ['rearDelts'], cue: 'Pull to the eyes, thumbs back.' }),
  X({ id: 'db_rear_fly', name: 'Rear Delt Fly', pattern: 'reardelt', load: 'db', tier: 'acc', requires: ['dumbbells'], muscles: ['rearDelts'], cue: 'Hinge forward, arms wide, pinkies up.' }),
  X({ id: 'prone_ytw', name: 'Prone Y-T-W', pattern: 'reardelt', load: 'bw', tier: 'acc', muscles: ['rearDelts'], cue: 'Face down, thumbs up, hold each letter.' }),
  X({ id: 'db_curl', name: 'Dumbbell Curl', pattern: 'biceps', load: 'db', tier: 'acc', requires: ['dumbbells'], muscles: ['biceps'], cue: 'Elbows pinned, turn the pinky up.' }),
  X({ id: 'db_incline_curl', name: 'Incline Curl', pattern: 'biceps', load: 'db', tier: 'acc', requires: ['dumbbells', 'adjBench'], muscles: ['biceps'], cue: 'Arms hang behind you for the stretch.' }),
  X({ id: 'db_hammer', name: 'Hammer Curl', pattern: 'biceps', load: 'db', tier: 'acc', requires: ['dumbbells'], muscles: ['biceps'], stress: [], cue: 'Neutral grip, no swing.' }),
  X({ id: 'band_curl', name: 'Band Curl', pattern: 'biceps', load: 'band', tier: 'acc', requires: ['bands'], muscles: ['biceps'], cue: 'Squeeze at the top.' }),
  X({ id: 'db_oh_ext', name: 'Overhead Triceps Extension', pattern: 'triceps', load: 'db', single: true, tier: 'acc', requires: ['dumbbells'], muscles: ['triceps'], stress: ['shoulders'], cue: 'One bell, two hands, elbows forward.' }),
  X({ id: 'db_skull', name: 'Dumbbell Skull Crusher', pattern: 'triceps', load: 'db', tier: 'acc', requires: ['dumbbells', 'bench'], muscles: ['triceps'], cue: 'Lower beside the head, elbows still.' }),
  X({ id: 'bench_dip', name: 'Bench Dip', pattern: 'triceps', load: 'bw', tier: 'acc', requires: ['bench'], muscles: ['triceps'], stress: ['shoulders'], cue: 'Shoulders down, elbows back.' }),
  X({ id: 'diamond_pushup', name: 'Close-Grip Push-up', pattern: 'triceps', load: 'bw', tier: 'acc', muscles: ['triceps', 'chest'], stress: ['wrists'], cue: 'Hands under the shoulders, elbows tight.' }),
  X({ id: 'calf_raise', name: 'Single-Leg Calf Raise', pattern: 'calves', load: 'db', single: true, tier: 'acc', requires: ['dumbbells'], muscles: ['calves'], cue: 'Full stretch at the bottom, pause up top.' }),
  X({ id: 'calf_raise_bw', name: 'Calf Raise', pattern: 'calves', load: 'bw', tier: 'acc', muscles: ['calves'], cue: 'On a step, full range.' }),
  X({ id: 'prone_pulldown', name: 'Floor Pulldown', pattern: 'vpull', load: 'bw', tier: 'acc', muscles: ['lats', 'rearDelts'], cue: 'Face down, arms long. Pull your elbows to your ribs, chest just off the floor.' }),
  X({ id: 'farmer_carry', name: 'Farmer Carry', pattern: 'core', load: 'db', unit: 'sec', tier: 'acc', requires: ['dumbbells'], muscles: ['core', 'back'], cue: 'Heavy bells at your sides, tall chest. Walk laps of the room.' }),
  X({ id: 'hanging_knee', name: 'Hanging Knee Raise', pattern: 'core', load: 'bw', tier: 'acc', requires: ['pullupBar'], muscles: ['core'], cue: 'Curl the pelvis, no swinging.' }),
  X({ id: 'dead_bug', name: 'Dead Bug', pattern: 'core', load: 'bw', tier: 'acc', muscles: ['core'], cue: 'Low back glued down, slow reach.' }),
  X({ id: 'plank', name: 'Plank', pattern: 'core', load: 'bw', unit: 'sec', tier: 'acc', muscles: ['core'], stress: ['wrists'], cue: 'Squeeze glutes, push the floor away.' }),
  X({ id: 'side_plank', name: 'Side Plank', pattern: 'core', load: 'bw', unit: 'sec', tier: 'acc', muscles: ['core'], cue: 'Hips high, each side.' }),
  // more core: anti-extension (front), anti-rotation and side (side), and curling (flex)
  X({ id: 'bird_dog', name: 'Bird Dog', pattern: 'core', load: 'bw', tier: 'acc', muscles: ['core'], cue: 'Reach long, opposite arm and leg, hips level.' }),
  X({ id: 'hollow_hold', name: 'Hollow Hold', pattern: 'core', load: 'bw', unit: 'sec', tier: 'acc', muscles: ['core'], cue: 'Low back pressed down, arms and legs long.' }),
  X({ id: 'reverse_crunch', name: 'Reverse Crunch', pattern: 'core', load: 'bw', tier: 'acc', muscles: ['core'], cue: 'Curl the hips off the floor, lower slowly.' }),
  X({ id: 'curl_up', name: 'McGill Curl-up', pattern: 'core', load: 'bw', tier: 'acc', muscles: ['core'], cue: 'Hands under the low back, lift the head and shoulders an inch.' }),
  X({ id: 'bicycle_crunch', name: 'Bicycle Crunch', pattern: 'core', load: 'bw', tier: 'acc', muscles: ['core'], cue: 'Elbow toward the opposite knee, slow and controlled.' }),
  X({ id: 'pallof_press', name: 'Pallof Press', pattern: 'core', load: 'band', tier: 'acc', requires: ['bands'], muscles: ['core'], cue: 'Band from the side, press out and hold, don’t let it turn you.' }),
  X({ id: 'suitcase_hold', name: 'Suitcase Hold', pattern: 'core', load: 'db', unit: 'sec', tier: 'acc', requires: ['dumbbells'], muscles: ['core'], cue: 'Heavy bell in one hand, stand perfectly tall. Switch hands.' }),
  X({ id: 'glute_bridge', name: 'Glute Bridge', pattern: 'hipext', load: 'bw', tier: 'acc', muscles: ['glutes', 'hams'], cue: 'Drive through the heels, squeeze at the top.' }),
]

// Circuit and conditioning moves, used by finishers. Not part of the strength slots.
export const CONDITIONING = [
  { id: 'jump_rope', name: 'Jump rope', cue: 'Small hops, wrists turn the rope.', requires: ['jumpRope'], stress: ['knees'] },
  { id: 'jumping_jack', name: 'Jumping jacks', cue: 'Light on your feet, arms all the way up.', stress: ['knees'] },
  { id: 'high_knees', name: 'High knees', cue: 'Drive the knees up, quick arms.', stress: ['knees'] },
  { id: 'mountain_climber', name: 'Mountain climbers', cue: 'Hips level, knees to the chest, fast.', stress: ['wrists'] },
  { id: 'bw_squat', name: 'Squats', cue: 'Full range, steady pace.', stress: ['knees'] },
  { id: 'kb_swing', name: 'Kettlebell swings', cue: 'Snap the hips, arms are just ropes.', requires: ['kettlebell'], stress: ['back'] },
  { id: 'db_goblet_squat', name: 'Goblet squats', cue: 'Light bell, keep moving.', requires: ['dumbbells'], stress: ['knees'] },
  { id: 'pushup', name: 'Push-ups', cue: 'Knees down is fine, keep a steady rhythm.', stress: ['wrists'] },
  { id: 'glute_bridge', name: 'Glute bridges', cue: 'Quick up, slow down.' },
  { id: 'bw_split_squat', name: 'Split squats', cue: 'Switch legs halfway.', stress: ['knees'] },
  { id: 'plank', name: 'Plank', cue: 'Hold, breathe, squeeze.', stress: ['wrists'] },
  { id: 'dead_bug', name: 'Dead bugs', cue: 'Slow, low back down.' },
]

export const BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

export const PATTERN_LABEL = {
  squat: 'Squat', hinge: 'Hinge', hpush: 'Press', ipush: 'Incline press', vpush: 'Overhead press',
  hpull: 'Row', vpull: 'Vertical pull', lunge: 'Single leg', hipext: 'Glutes', hamcurl: 'Hamstrings',
  chestiso: 'Chest', sidedelt: 'Side delts', reardelt: 'Rear delts', biceps: 'Biceps', triceps: 'Triceps',
  calves: 'Calves', core: 'Core',
}

export function hasEquipment(ex, equip) {
  return ex.requires.every((k) => equip?.[k]?.on)
}

// Candidates for a pattern: loaded or equipment-based options first, joint-friendly first.
// Plain bodyweight moves are the fallback when nothing better is available.
export function candidatesFor(pattern, equip, easyOn = []) {
  const list = EXERCISES.filter((e) => e.pattern === pattern && hasEquipment(e, equip))
  const rank = (e) => (e.stress.some((s) => easyOn.includes(s)) ? 2 : 0) + (e.load === 'bw' && !e.requires.length ? 1 : 0) + (e.ladderOnly ? 4 : 0)
  return list.map((e, i) => [e, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0])
}

// The pool a slot rotates through: the best tier available.
export function poolFor(pattern, equip, easyOn = []) {
  const c = candidatesFor(pattern, equip, easyOn)
  const strong = c.filter((e) => !e.ladderOnly && (pattern === 'core' || !(e.load === 'bw' && !e.requires.length)) && !e.stress.some((s) => easyOn.includes(s)))
  return strong.length ? strong : c.filter((e) => !e.ladderOnly)
}
