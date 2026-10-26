// Move guide: a small ink figure that loops through each exercise.
// Pure data and geometry (no React), so the same shapes render in the app and in tests.
// Side view faces right. Coordinates live in a 160 x 140 box, ground at y = 128.
// A pose places the hip, shoulder, feet and hands; knees and elbows are solved with two-bone IK,
// bending toward a hint direction, so limb lengths never stretch.

const G = 128
const LEN = { thigh: 24, shin: 24, up: 17, fore: 16 }

const STAND = { hip: [80, 81], sh: [80, 47], nf: [83, 128], ff: [77, 128], nh: [82, 81], fh: [77, 81], kn: [1, 0], kf: [1, 0], en: [-1, 0.3], ef: [-1, 0.3] }
const S = (o = {}) => ({ ...STAND, ...o })

// ---------- the library: every exercise id -> view, props, equipment, frames ----------
const BENCH = (x1, x2, y) => ({ t: 'bench', x1, x2, y })
const BOX = (x1, x2, y) => ({ t: 'box', x1, x2, y })
const BAR = (x1, x2, y) => ({ t: 'bar', x1, x2, y })
const INCLINE = (a, b) => ({ t: 'incline', a, b })
const MAT = { t: 'mat' }
const FRAME = (x) => ({ t: 'frame', x })
const TREAD = { t: 'tread' }

// lying on a bench, face up, head to the left
const SUP = (o = {}) => S({ hip: [96, 100], sh: [62, 100], nf: [118, 128], ff: [112, 128], kn: [0, -1], kf: [0, -1], en: [0, 1], ef: [0, 1], ...o })
const SUPF = (o = {}) => SUP({ hip: [96, 121], sh: [62, 121], nf: [116, 126], ff: [110, 126], ...o })
// push-up line from feet to shoulders
const PUSH = (sh, hip, hands = [108, 128], feet = [36, 128], o = {}) => S({ sh, hip, nf: feet, ff: [feet[0] - 3, feet[1]], nh: hands, fh: [hands[0] - 4, hands[1]], kn: [0, -1], kf: [0, -1], en: [-1, 0], ef: [-1, 0], ...o })
// on hands and knees
const QUAD = (o = {}) => S({ sh: [104, 99], hip: [70, 101], nf: [48, 126], ff: [45, 126], kn: [0, 1], kf: [0, 1], nh: [106, 128], fh: [102, 128], en: [-1, 0], ef: [-1, 0], ...o })
// running and walking on a treadmill deck (y 120); near = which leg is in front
const RUN = (near) => S({ hip: [80, 73], sh: [86, 40], nf: near ? [100, 118] : [60, 108], ff: near ? [60, 108] : [100, 118], kn: [1, 0], kf: [1, 0],
  nh: near ? [74, 64] : [100, 56], fh: near ? [100, 56] : [74, 64], en: near ? [-1, 1] : [0, 1], ef: near ? [0, 1] : [-1, 1] })
const WALK = (near) => S({ hip: [80, 73], sh: [81, 39], nf: near ? [94, 120] : [66, 120], ff: near ? [66, 120] : [94, 120], kn: [1, 0], kf: [1, 0],
  nh: near ? [72, 72] : [90, 72], fh: near ? [90, 72] : [72, 72], en: [-1, 0.3], ef: [-1, 0.3] })
// bent over, torso forward
const HINGE = (o = {}) => S({ hip: [72, 86], sh: [100, 68], nf: [84, 128], ff: [78, 128], ...o })

export const MOVES = {
  // squat
  bb_back_squat: { eq: 'bb@sh', frames: [S({ nh: [74, 50], fh: [72, 50], en: [0, 1], ef: [0, 1] }), S({ hip: [64, 104], sh: [80, 74], nh: [74, 77], fh: [72, 77], en: [0, 1], ef: [0, 1] })] },
  db_goblet_squat: { eq: 'db@h', frames: [S({ nh: [92, 60], fh: [90, 60], en: [0, 1], ef: [0, 1] }), S({ hip: [64, 104], sh: [80, 74], nh: [94, 86], fh: [92, 86], en: [0, 1], ef: [0, 1] })] },
  kb_goblet_squat: { eq: 'kb@h', frames: [S({ nh: [92, 60], fh: [90, 60], en: [0, 1], ef: [0, 1] }), S({ hip: [64, 104], sh: [80, 74], nh: [94, 86], fh: [92, 86], en: [0, 1], ef: [0, 1] })] },
  box_squat_bw: { props: [BOX(44, 70, 104)], frames: [S({ nh: [112, 52], fh: [110, 52], en: [0, 1] }), S({ hip: [62, 102], sh: [80, 74], nh: [110, 78], fh: [108, 78], en: [0, 1] })] },
  bw_squat: { frames: [S({ nh: [112, 52], fh: [110, 52], en: [0, 1] }), S({ hip: [64, 104], sh: [80, 74], nh: [110, 78], fh: [108, 78], en: [0, 1] })] },
  // hinge
  bb_rdl: { eq: 'bb@h', frames: [S({ nh: [83, 84], fh: [81, 84] }), HINGE({ hip: [70, 84], sh: [98, 64], nh: [98, 97], fh: [96, 97] })] },
  db_rdl: { eq: 'db@h', frames: [S({ nh: [83, 84], fh: [79, 84] }), HINGE({ hip: [70, 84], sh: [98, 64], nh: [98, 97], fh: [95, 97] })] },
  kb_swing: { eq: 'kb@h', frames: [HINGE({ hip: [68, 88], sh: [96, 70], nh: [78, 104], fh: [76, 104], en: [1, 0], ef: [1, 0] }), S({ nh: [112, 50], fh: [110, 50], en: [0, 1], ef: [0, 1] })] },
  db_sl_rdl: { eq: 'db@h', frames: [S({ ff: [72, 120] }), HINGE({ hip: [76, 84], sh: [106, 70], nf: [80, 128], ff: [32, 98], kf: [0, 1], nh: [106, 102], fh: [103, 102] })] },
  bw_sl_hinge: { frames: [S({ ff: [72, 120] }), HINGE({ hip: [76, 84], sh: [106, 70], nf: [80, 128], ff: [32, 98], kf: [0, 1], nh: [128, 74], fh: [126, 74], en: [0, 1], ef: [0, 1] })] },
  // horizontal push
  bb_bench: { eq: 'bb@h', props: [BENCH(30, 110, 104)], frames: [SUP({ nh: [62, 66], fh: [60, 66] }), SUP({ nh: [64, 92], fh: [62, 92] })] },
  db_bench: { eq: 'db@h', props: [BENCH(30, 110, 104)], frames: [SUP({ nh: [62, 66], fh: [58, 66] }), SUP({ nh: [64, 90], fh: [58, 90] })] },
  db_floor_press: { eq: 'db@h', props: [MAT], frames: [SUPF({ nh: [62, 88], fh: [58, 88] }), SUPF({ nh: [64, 110], fh: [58, 110] })] },
  pushup: { props: [MAT], frames: [PUSH([108, 95], [72, 110]), PUSH([106, 116], [70, 121])] },
  knee_pushup: { props: [MAT], frames: [PUSH([106, 97], [76, 112], [108, 128], [34, 114], { kn: [0, 1], kf: [0, 1] }), PUSH([104, 116], [74, 121], [108, 128], [34, 114], { kn: [0, 1], kf: [0, 1] })] },
  incline_pushup: { props: [BENCH(96, 132, 100)], frames: [PUSH([104, 76], [66, 100], [112, 100], [20, 130]), PUSH([100, 90], [64, 108], [112, 100], [20, 130])] },
  pushup_i: { props: [MAT], frames: [PUSH([108, 95], [72, 110]), PUSH([106, 116], [70, 121])], slow: true },
  diamond_pushup: { props: [MAT], frames: [PUSH([104, 95], [70, 110], [102, 128]), PUSH([102, 116], [68, 121], [102, 128], undefined, { en: [-1, -0.2], ef: [-1, -0.2] })] },
  // incline push
  db_incline: { eq: 'db@h', props: [INCLINE([104, 108], [62, 74])], frames: [S({ hip: [98, 104], sh: [70, 82], nf: [122, 128], ff: [116, 128], nh: [76, 48], fh: [72, 48], en: [0, 1], ef: [0, 1] }), S({ hip: [98, 104], sh: [70, 82], nf: [122, 128], ff: [116, 128], nh: [80, 76], fh: [74, 76], en: [0, 1], ef: [0, 1] })] },
  db_low_incline_floor: { eq: 'db@h', props: [MAT], frames: [SUPF({ nf: [116, 96], ff: [110, 96], kn: [-1, -1], kf: [-1, -1], nh: [62, 88], fh: [58, 88] }), SUPF({ nf: [116, 96], ff: [110, 96], kn: [-1, -1], kf: [-1, -1], nh: [64, 110], fh: [58, 110] })] },
  decline_pushup: { props: [BOX(18, 46, 106)], frames: [PUSH([108, 95], [72, 100], [108, 128], [34, 106]), PUSH([106, 116], [70, 110], [108, 128], [34, 106])] },
  // vertical push
  db_seated_press: { eq: 'db@h', props: [BENCH(56, 100, 102)], frames: [S({ hip: [76, 98], sh: [76, 64], nf: [104, 128], ff: [98, 128], nh: [84, 64], fh: [80, 64], en: [0, 1], ef: [0, 1] }), S({ hip: [76, 98], sh: [76, 64], nf: [104, 128], ff: [98, 128], nh: [80, 30], fh: [76, 30], en: [0, 1], ef: [0, 1] })] },
  db_standing_press: { eq: 'db@h', frames: [S({ nh: [88, 47], fh: [84, 47], en: [0, 1], ef: [0, 1] }), S({ nh: [83, 13], fh: [79, 13], en: [0, 1], ef: [0, 1] })] },
  bb_ohp: { eq: 'bb@h', frames: [S({ nh: [88, 47], fh: [86, 47], en: [0, 1], ef: [0, 1] }), S({ nh: [82, 13], fh: [80, 13], en: [0, 1], ef: [0, 1] })] },
  db_landmine_like: { eq: 'db@n', frames: [S({ hip: [74, 104], sh: [76, 70], nf: [52, 126], ff: [100, 128], kn: [0, 1], kf: [1, -1], nh: [84, 70], fh: [80, 104], en: [0, 1], ef: [1, 0] }), S({ hip: [74, 104], sh: [76, 70], nf: [52, 126], ff: [100, 128], kn: [0, 1], kf: [1, -1], nh: [92, 38], fh: [80, 104], en: [0, 1], ef: [1, 0] })] },
  pike_pushup: { props: [MAT], frames: [S({ hip: [78, 76], sh: [102, 100], nf: [48, 128], ff: [45, 128], nh: [110, 128], fh: [106, 128], kn: [1, 0], kf: [1, 0], en: [-1, 0], ef: [-1, 0] }), S({ hip: [80, 80], sh: [98, 112], nf: [48, 128], ff: [45, 128], nh: [110, 128], fh: [106, 128], kn: [1, 0], kf: [1, 0], en: [-1, -0.5], ef: [-1, -0.5] })] },
  // horizontal pull
  db_chest_row: { eq: 'db@h', props: [INCLINE([56, 112], [104, 82])], frames: [S({ hip: [66, 104], sh: [96, 82], nf: [44, 128], ff: [40, 128], kn: [1, 0], kf: [1, 0], nh: [100, 114], fh: [97, 114] }), S({ hip: [66, 104], sh: [96, 82], nf: [44, 128], ff: [40, 128], kn: [1, 0], kf: [1, 0], nh: [84, 96], fh: [81, 96], en: [-1, -1], ef: [-1, -1] })] },
  db_row: { eq: 'db@n', props: [BENCH(92, 132, 100)], frames: [HINGE({ hip: [70, 88], sh: [104, 84], nh: [102, 116], fh: [114, 100], en: [-1, 0], ef: [0, -1] }), HINGE({ hip: [70, 88], sh: [104, 84], nh: [86, 92], fh: [114, 100], en: [-1, -1], ef: [0, -1] })] },
  bb_row: { eq: 'bb@h', frames: [HINGE({ nh: [100, 100], fh: [98, 100] }), HINGE({ nh: [84, 88], fh: [82, 88], en: [-1, -1], ef: [-1, -1] })] },
  db_row_standing: { eq: 'db@h', frames: [HINGE({ nh: [100, 100], fh: [96, 100] }), HINGE({ nh: [84, 88], fh: [80, 88], en: [-1, -1], ef: [-1, -1] })] },
  inverted_row: { props: [BAR(96, 126, 70)], frames: [S({ sh: [104, 103], hip: [70, 116], nf: [34, 128], ff: [31, 128], kn: [0, -1], kf: [0, -1], nh: [110, 72], fh: [108, 72], en: [1, 0], ef: [1, 0] }), S({ sh: [104, 82], hip: [70, 104], nf: [34, 128], ff: [31, 128], kn: [0, -1], kf: [0, -1], nh: [110, 72], fh: [108, 72], en: [-1, 1], ef: [-1, 1] })] },
  band_row: { eq: 'band:132,118', props: [MAT], frames: [S({ hip: [70, 124], sh: [72, 90], nf: [116, 126], ff: [112, 126], kn: [0, -1], kf: [0, -1], nh: [106, 102], fh: [104, 102], en: [0, 1], ef: [0, 1] }), S({ hip: [70, 124], sh: [70, 90], nf: [116, 126], ff: [112, 126], kn: [0, -1], kf: [0, -1], nh: [84, 106], fh: [82, 106], en: [-1, 0], ef: [-1, 0] })] },
  // vertical pull
  prone_pulldown: { props: [MAT], frames: [S({ hip: [70, 123], sh: [102, 121], nf: [22, 126], ff: [20, 126], kn: [0, -1], kf: [0, -1], nh: [134, 116], fh: [132, 117], en: [0, -1], ef: [0, -1] }), S({ hip: [70, 123], sh: [102, 117], nf: [22, 126], ff: [20, 126], kn: [0, -1], kf: [0, -1], nh: [104, 106], fh: [102, 107], en: [-1, -1], ef: [-1, -1], hd: [0, -2] })] },
  pullup: { props: [BAR(56, 112, 22)], frames: [S({ sh: [82, 56], hip: [80, 90], nf: [70, 124], ff: [66, 122], kn: [-1, 0.3], kf: [-1, 0.3], nh: [86, 24], fh: [82, 24], en: [1, 0], ef: [1, 0] }), S({ sh: [82, 36], hip: [80, 70], nf: [70, 104], ff: [66, 102], kn: [-1, 0.3], kf: [-1, 0.3], nh: [86, 24], fh: [82, 24], en: [1, 1], ef: [1, 1] })] },
  chinup: { props: [BAR(56, 112, 22)], frames: [S({ sh: [82, 56], hip: [80, 90], nf: [70, 124], ff: [66, 122], kn: [-1, 0.3], kf: [-1, 0.3], nh: [86, 24], fh: [82, 24], en: [1, 0], ef: [1, 0] }), S({ sh: [82, 36], hip: [80, 70], nf: [70, 104], ff: [66, 102], kn: [-1, 0.3], kf: [-1, 0.3], nh: [86, 24], fh: [82, 24], en: [1, 1], ef: [1, 1] })] },
  band_pulldown: { eq: 'band:84,2', props: [MAT], frames: [S({ hip: [76, 102], sh: [78, 68], nf: [54, 126], ff: [50, 126], kn: [1, 1], kf: [1, 1], nh: [84, 34], fh: [80, 34], en: [-1, 0], ef: [-1, 0] }), S({ hip: [76, 102], sh: [78, 68], nf: [54, 126], ff: [50, 126], kn: [1, 1], kf: [1, 1], nh: [86, 64], fh: [82, 64], en: [-1, 1], ef: [-1, 1] })] },
  db_pullover: { eq: 'db@n', props: [BENCH(30, 110, 104)], frames: [SUP({ nh: [30, 98], fh: [30, 98], en: [0, -1], ef: [0, -1] }), SUP({ nh: [64, 66], fh: [64, 66] })] },
  db_kneel_row_high: { eq: 'db@n', props: [BENCH(92, 132, 100)], frames: [HINGE({ hip: [70, 88], sh: [104, 84], nh: [102, 116], fh: [114, 100], en: [-1, 0], ef: [0, -1] }), HINGE({ hip: [70, 88], sh: [104, 84], nh: [96, 96], fh: [114, 100], en: [-1, -1.5], ef: [0, -1] })] },
  towel_row: { props: [FRAME(116)], frames: [S({ hip: [76, 96], sh: [60, 66], nf: [104, 128], ff: [100, 128], kn: [0, -1], kf: [0, -1], nh: [114, 64], fh: [114, 70], en: [0, 1], ef: [0, 1] }), S({ hip: [86, 88], sh: [84, 54], nf: [104, 128], ff: [100, 128], kn: [1, 0], kf: [1, 0], nh: [114, 64], fh: [114, 70], en: [-1, 0], ef: [-1, 0] })] },
  // lunge
  db_bulgarian: { eq: 'db@h', props: [BENCH(18, 50, 106)], frames: [S({ hip: [78, 86], sh: [79, 52], nf: [102, 128], ff: [40, 106], kf: [0, 1], nh: [80, 86], fh: [76, 86] }), S({ hip: [78, 106], sh: [80, 72], nf: [102, 128], ff: [40, 106], kf: [0, 1], nh: [80, 106], fh: [76, 106] })] },
  db_reverse_lunge: { eq: 'db@h', frames: [S({}), S({ hip: [78, 104], sh: [79, 70], nf: [100, 128], ff: [52, 128], kf: [0, 1], nh: [80, 104], fh: [76, 104] })] },
  db_step_up: { eq: 'db@h', props: [BOX(90, 126, 104)], frames: [S({ hip: [80, 86], sh: [82, 52], nf: [102, 104], ff: [70, 128], nh: [83, 86], fh: [79, 86] }), S({ hip: [102, 58], sh: [102, 24], nf: [104, 104], ff: [98, 98], kf: [1, 0], nh: [104, 58], fh: [100, 58] })] },
  bw_split_squat: { frames: [S({ hip: [78, 84], sh: [79, 50], nf: [100, 128], ff: [54, 128], kf: [0, 1], nh: [84, 84], fh: [74, 84] }), S({ hip: [78, 104], sh: [79, 70], nf: [100, 128], ff: [54, 128], kf: [0, 1], nh: [84, 104], fh: [74, 104] })] },
  // hip extension
  db_hip_thrust: { eq: 'db@hip', props: [BENCH(18, 52, 98)], frames: [S({ sh: [50, 96], hip: [76, 120], nf: [104, 128], ff: [100, 128], kn: [0, -1], kf: [0, -1], nh: [78, 114], fh: [76, 114], en: [0, -1], ef: [0, -1] }), S({ sh: [50, 96], hip: [82, 96], nf: [104, 128], ff: [100, 128], kn: [0, -1], kf: [0, -1], nh: [84, 92], fh: [82, 92], en: [0, -1], ef: [0, -1] })] },
  bb_hip_thrust: { eq: 'bb@hip', props: [BENCH(18, 52, 98)], frames: [S({ sh: [50, 96], hip: [76, 120], nf: [104, 128], ff: [100, 128], kn: [0, -1], kf: [0, -1], nh: [78, 114], fh: [76, 114], en: [0, -1], ef: [0, -1] }), S({ sh: [50, 96], hip: [82, 96], nf: [104, 128], ff: [100, 128], kn: [0, -1], kf: [0, -1], nh: [84, 92], fh: [82, 92], en: [0, -1], ef: [0, -1] })] },
  sl_glute_bridge: { props: [MAT], frames: [S({ sh: [44, 122], hip: [76, 124], nf: [102, 126], ff: [118, 100], kn: [0, -1], kf: [0, -1], nh: [70, 126], fh: [66, 126], en: [0, -1], ef: [0, -1] }), S({ sh: [44, 122], hip: [80, 104], nf: [102, 126], ff: [124, 86], kn: [0, -1], kf: [0, -1], nh: [70, 126], fh: [66, 126], en: [0, -1], ef: [0, -1] })] },
  // hamstring curl
  slider_curl: { props: [MAT], frames: [S({ sh: [44, 122], hip: [84, 110], nf: [124, 126], ff: [120, 126], kn: [0, -1], kf: [0, -1], nh: [70, 126], fh: [66, 126], en: [0, -1], ef: [0, -1] }), S({ sh: [44, 122], hip: [82, 100], nf: [100, 126], ff: [96, 126], kn: [0, -1], kf: [0, -1], nh: [70, 126], fh: [66, 126], en: [0, -1], ef: [0, -1] })] },
  db_ham_curl: { eq: 'db@f', props: [BENCH(40, 112, 100)], frames: [S({ sh: [104, 94], hip: [70, 94], nf: [24, 96], ff: [24, 98], kn: [0, 1], kf: [0, 1], nh: [118, 104], fh: [116, 104], en: [0, -1], ef: [0, -1] }), S({ sh: [104, 94], hip: [70, 94], nf: [52, 62], ff: [52, 64], kn: [0, 1], kf: [0, 1], nh: [118, 104], fh: [116, 104], en: [0, -1], ef: [0, -1] })] },
  // chest isolation (front view)
  db_fly: { view: 'front', eq: 'db@h', frames: [{ nh: [36, 54], fh: [124, 54] }, { nh: [74, 48], fh: [86, 48], bend: 0.6 }] },
  band_fly: { view: 'front', eq: 'band:80,30', frames: [{ nh: [36, 54], fh: [124, 54] }, { nh: [74, 52], fh: [86, 52], bend: 0.6 }] },
  // shoulders (front view)
  db_lateral: { view: 'front', eq: 'db@h', frames: [{ nh: [66, 82], fh: [94, 82] }, { nh: [40, 50], fh: [120, 50] }] },
  band_lateral: { view: 'front', eq: 'band:feet', frames: [{ nh: [66, 82], fh: [94, 82] }, { nh: [40, 50], fh: [120, 50] }] },
  db_rear_fly: { view: 'front', eq: 'db@h', bent: true, frames: [{ nh: [72, 84], fh: [88, 84] }, { nh: [40, 60], fh: [120, 60] }] },
  prone_ytw: { view: 'front', frames: [{ nh: [48, 18], fh: [112, 18] }, { nh: [38, 48], fh: [122, 48] }, { nh: [50, 58], fh: [110, 58], bend: 1 }] },
  band_face_pull: { eq: 'band:134,42', frames: [S({ nh: [112, 46], fh: [110, 46], en: [0, 1], ef: [0, 1] }), S({ nh: [94, 40], fh: [92, 40], en: [-1, -0.6], ef: [-1, -0.6] })] },
  // arms
  db_curl: { eq: 'db@h', frames: [S({ nh: [83, 83], fh: [78, 83] }), S({ nh: [94, 56], fh: [89, 56], en: [-0.3, 1], ef: [-0.3, 1] })] },
  db_hammer: { eq: 'db@h', frames: [S({ nh: [83, 83], fh: [78, 83] }), S({ nh: [94, 56], fh: [89, 56], en: [-0.3, 1], ef: [-0.3, 1] })] },
  band_curl: { eq: 'band:feet', frames: [S({ nh: [83, 83], fh: [78, 83] }), S({ nh: [94, 56], fh: [89, 56], en: [-0.3, 1], ef: [-0.3, 1] })] },
  db_incline_curl: { eq: 'db@h', props: [INCLINE([104, 108], [62, 74])], frames: [S({ hip: [98, 104], sh: [70, 82], nf: [122, 128], ff: [116, 128], nh: [68, 114], fh: [64, 114] }), S({ hip: [98, 104], sh: [70, 82], nf: [122, 128], ff: [116, 128], nh: [80, 90], fh: [76, 90], en: [-0.3, 1], ef: [-0.3, 1] })] },
  db_oh_ext: { eq: 'db@n', frames: [S({ nh: [72, 44], fh: [72, 44], en: [1, -1], ef: [1, -1] }), S({ nh: [82, 13], fh: [82, 13], en: [1, 0], ef: [1, 0] })] },
  db_skull: { eq: 'db@h', props: [BENCH(30, 110, 104)], frames: [SUP({ nh: [50, 84], fh: [48, 84], en: [1, -1], ef: [1, -1] }), SUP({ nh: [62, 66], fh: [60, 66] })] },
  bench_dip: { props: [BENCH(36, 80, 98)], frames: [S({ sh: [86, 64], hip: [90, 96], nf: [128, 128], ff: [124, 128], kn: [0, -1], kf: [0, -1], nh: [80, 98], fh: [78, 98], en: [-1, 0], ef: [-1, 0] }), S({ sh: [88, 80], hip: [92, 112], nf: [128, 128], ff: [124, 128], kn: [0, -1], kf: [0, -1], nh: [80, 98], fh: [78, 98], en: [-1, -1], ef: [-1, -1] })] },
  // calves
  calf_raise: { eq: 'db@h', props: [BOX(66, 98, 116)], frames: [S({ hip: [80, 69], sh: [80, 35], nf: [81, 117], ff: [77, 117], toe: [90, 116], nh: [83, 69], fh: [78, 69] }), S({ hip: [80, 61], sh: [80, 27], nf: [82, 109], ff: [78, 109], toe: [90, 116], nh: [83, 61], fh: [78, 61] })] },
  calf_raise_bw: { props: [BOX(66, 98, 116)], frames: [S({ hip: [80, 69], sh: [80, 35], nf: [81, 117], ff: [77, 117], toe: [90, 116] }), S({ hip: [80, 61], sh: [80, 27], nf: [82, 109], ff: [78, 109], toe: [90, 116] })] },
  // core
  hanging_knee: { props: [BAR(56, 112, 22)], frames: [S({ sh: [82, 56], hip: [80, 90], nf: [78, 126], ff: [74, 125], kn: [1, 0], kf: [1, 0], nh: [86, 24], fh: [82, 24], en: [1, 0], ef: [1, 0] }), S({ sh: [80, 56], hip: [80, 88], nf: [98, 96], ff: [94, 96], kn: [1, -1], kf: [1, -1], nh: [86, 24], fh: [82, 24], en: [1, 0], ef: [1, 0] })] },
  dead_bug: { props: [MAT], frames: [S({ sh: [52, 121], hip: [86, 121], nf: [106, 100], ff: [104, 100], kn: [0, -1], kf: [0, -1], nh: [54, 88], fh: [56, 88], en: [0, -1], ef: [0, -1] }), S({ sh: [52, 121], hip: [86, 121], nf: [106, 100], ff: [132, 116], kn: [0, -1], kf: [0, -1], nh: [20, 116], fh: [56, 88], en: [0, -1], ef: [0, -1] })] },
  plank: { props: [MAT], hold: true, frames: [PUSH([106, 104], [72, 112], [120, 128], [36, 128], { en: [-1, 1], ef: [-1, 1] }), PUSH([106, 103], [72, 110], [120, 128], [36, 128], { en: [-1, 1], ef: [-1, 1] })] },
  // mobility (rest days)
  cat_cow: { props: [MAT], frames: [S({ sh: [104, 99], hip: [70, 101], nf: [48, 126], ff: [45, 126], kn: [0, 1], kf: [0, 1], nh: [106, 128], fh: [102, 128], en: [-1, 0], ef: [-1, 0], hd: [3, 9] }), S({ sh: [106, 93], hip: [70, 105], nf: [48, 126], ff: [45, 126], kn: [0, 1], kf: [0, 1], nh: [106, 128], fh: [102, 128], en: [-1, 0], ef: [-1, 0], hd: [1, -5] })] },
  child_pose: { props: [MAT], frames: [S({ sh: [104, 96], hip: [70, 104], nf: [46, 126], ff: [43, 126], kn: [0, 1], kf: [0, 1], nh: [106, 128], fh: [102, 128], en: [-1, 0], ef: [-1, 0] }), S({ sh: [90, 117], hip: [56, 114], nf: [40, 126], ff: [37, 126], kn: [1, 1], kf: [1, 1], nh: [128, 126], fh: [124, 126], en: [0, -1], ef: [0, -1], hd: [3, 5] })] },
  hip_flexor: { props: [MAT], frames: [S({ hip: [74, 103], sh: [75, 69], nf: [50, 126], ff: [104, 128], kn: [0, 1], kf: [1, -1], nh: [80, 100], fh: [76, 100], en: [-1, 0], ef: [-1, 0] }), S({ hip: [84, 108], sh: [82, 74], nf: [50, 126], ff: [104, 128], kn: [0, 1], kf: [1, -1], nh: [84, 40], fh: [80, 40], en: [0, 1], ef: [0, 1] })], slow: true },
  forward_fold: { frames: [S({ nh: [83, 13], fh: [79, 13], en: [0, 1], ef: [0, 1] }), S({ hip: [74, 83], sh: [92, 112], nh: [94, 126], fh: [90, 126], kn: [1, 0], kf: [1, 0], en: [1, 0], ef: [1, 0], hd: [0, 4] })], slow: true },
  // ---- more core ----
  bird_dog: { props: [MAT], frames: [QUAD(), QUAD({ nh: [136, 98], en: [0, -1], ff: [24, 100], kf: [0, 1] })], slow: true },
  hollow_hold: { props: [MAT], hold: true, frames: [SUPF({ sh: [64, 115], nf: [138, 110], ff: [136, 110], kn: [0, -1], kf: [0, -1], nh: [34, 107], fh: [36, 107], en: [0, -1], ef: [0, -1] }), SUPF({ sh: [64, 113], nf: [138, 106], ff: [136, 106], kn: [0, -1], kf: [0, -1], nh: [34, 104], fh: [36, 104], en: [0, -1], ef: [0, -1] })] },
  reverse_crunch: { props: [MAT], frames: [SUPF({ nf: [120, 99], ff: [117, 99], kn: [0, -1], kf: [0, -1], nh: [90, 126], fh: [86, 126], en: [0, -1], ef: [0, -1] }), SUPF({ hip: [92, 113], nf: [104, 84], ff: [101, 84], kn: [1, -1], kf: [1, -1], nh: [90, 126], fh: [86, 126], en: [0, -1], ef: [0, -1] })] },
  curl_up: { props: [MAT], frames: [SUPF({ nf: [114, 126], kn: [0, -1], ff: [142, 125], kf: [0, -1], nh: [92, 122], fh: [90, 122], en: [0, 1], ef: [0, 1] }), SUPF({ sh: [64, 114], nf: [114, 126], kn: [0, -1], ff: [142, 125], kf: [0, -1], nh: [92, 122], fh: [90, 122], en: [0, 1], ef: [0, 1] })], slow: true },
  bicycle_crunch: { props: [MAT], frames: [SUPF({ sh: [64, 113], nf: [104, 98], kn: [1, -1], ff: [140, 112], kf: [0, -1], nh: [56, 104], fh: [58, 104], en: [1, -1], ef: [1, -1] }), SUPF({ sh: [64, 113], nf: [140, 112], kn: [0, -1], ff: [104, 98], kf: [1, -1], nh: [56, 104], fh: [58, 104], en: [1, -1], ef: [1, -1] })] },
  pallof_press: { eq: 'band:30,62', frames: [S({ nh: [94, 62], fh: [92, 62], en: [-1, 1], ef: [-1, 1] }), S({ nh: [112, 60], fh: [110, 60], en: [0, 1], ef: [0, 1] })], slow: true },
  farmer_carry: { eq: 'db@h', fast: 0.62, frames: [S({ hip: [80, 84], sh: [81, 50], nf: [93, 128], ff: [68, 126], nh: [83, 87], fh: [78, 87] }), S({ hip: [80, 84], sh: [81, 50], nf: [68, 126], ff: [93, 128], nh: [83, 87], fh: [78, 87] })] },
  suitcase_hold: { eq: 'db@n', hold: true, frames: [S({ nh: [82, 84], fh: [78, 82] }), S({ nh: [82, 85], fh: [78, 82], sh: [80, 46] })] },
  glute_bridge: { props: [MAT], frames: [S({ sh: [44, 122], hip: [76, 124], nf: [104, 126], ff: [100, 126], kn: [0, -1], kf: [0, -1], nh: [70, 126], fh: [66, 126], en: [0, -1], ef: [0, -1] }), S({ sh: [44, 122], hip: [82, 104], nf: [104, 126], ff: [100, 126], kn: [0, -1], kf: [0, -1], nh: [70, 126], fh: [66, 126], en: [0, -1], ef: [0, -1] })] },
  // ---- conditioning ----
  mountain_climber: { props: [MAT], fast: 0.34, frames: [PUSH([106, 104], [72, 112], [112, 128], [36, 128], { nf: [86, 120], kn: [0.6, -1] }), PUSH([106, 104], [72, 112], [112, 128], [36, 128], { ff: [86, 120], kf: [0.6, -1] })] },
  high_knees: { fast: 0.3, frames: [S({ hip: [80, 79], sh: [81, 45], nf: [96, 100], kn: [1, 0], nh: [98, 62], fh: [70, 80], en: [-1, 1], ef: [-1, 0] }), S({ hip: [80, 79], sh: [81, 45], ff: [96, 100], kf: [1, 0], nh: [70, 80], fh: [98, 62], en: [-1, 0], ef: [-1, 1] })] },
  jumping_jack: { view: 'front', fast: 0.42, frames: [{ nh: [64, 84], fh: [96, 84], spread: 0 }, { nh: [54, 20], fh: [106, 20], spread: 16 }] },
  jump_rope: { fast: 0.32, frames: [S({ nh: [92, 82], fh: [70, 82], en: [0, 1], ef: [0, 1] }), S({ hip: [80, 75], sh: [80, 41], nf: [83, 122], ff: [77, 122], nh: [92, 76], fh: [70, 76], en: [0, 1], ef: [0, 1] })] },
  // ---- treadmill ----
  run_tm: { props: [TREAD], fast: 0.36, frames: [RUN(true), RUN(false)] },
  walk_tm: { props: [TREAD], fast: 0.62, frames: [WALK(true), WALK(false)] },
  // ---- mobility ----
  thread_needle: { props: [MAT], slow: true, frames: [QUAD(), QUAD({ sh: [96, 112], nh: [66, 122], en: [0, 1], hd: [2, 4] })] },
  down_dog: { props: [MAT], slow: true, frames: [QUAD(), S({ hip: [78, 74], sh: [104, 104], nf: [50, 128], ff: [47, 128], nh: [122, 128], fh: [118, 128], kn: [1, 0], kf: [1, 0], en: [-1, 0], ef: [-1, 0] })] },
  cobra: { props: [MAT], slow: true, frames: [S({ hip: [70, 124], sh: [104, 122], nf: [26, 126], ff: [24, 126], kn: [0, -1], kf: [0, -1], nh: [106, 128], fh: [102, 128], en: [-1, -1], ef: [-1, -1] }), S({ hip: [70, 123], sh: [100, 102], nf: [26, 126], ff: [24, 126], kn: [0, -1], kf: [0, -1], nh: [106, 128], fh: [102, 128], en: [-1, 0], ef: [-1, 0] })] },
  world_greatest: { props: [MAT], slow: true, frames: [S({ hip: [74, 104], sh: [98, 90], nf: [102, 128], ff: [36, 126], kn: [1, 0], kf: [0, 1], nh: [102, 126], fh: [100, 126], en: [-1, 0], ef: [-1, 0] }), S({ hip: [74, 104], sh: [96, 86], nf: [102, 128], ff: [36, 126], kn: [1, 0], kf: [0, 1], nh: [102, 126], fh: [100, 54], en: [-1, 0], ef: [0, 1] })] },
  side_plank: { props: [MAT], hold: true, frames: [S({ sh: [108, 94], hip: [70, 114], nf: [34, 128], ff: [36, 124], kn: [0, -1], kf: [0, -1], nh: [122, 128], fh: [70, 108], en: [-1, 1], ef: [0, -1] }), S({ sh: [108, 92], hip: [70, 108], nf: [34, 128], ff: [36, 124], kn: [0, -1], kf: [0, -1], nh: [122, 128], fh: [70, 102], en: [-1, 1], ef: [0, -1] })] },
}

// ---------- geometry ----------
// Two-bone IK with a soft reach: as a limb nears full length it slows into the lockout instead of
// popping straight, and the bend side is passed in so a knee or elbow can never flip mid-move.
function ik(a, b, l1, l2, side) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const L = l1 + l2, raw = Math.hypot(dx, dy) || 0.001
  const soft = L * 0.94
  let d = raw > soft ? soft + (L - soft) * (1 - Math.exp(-(raw - soft) / (L - soft))) : raw
  d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(L - 0.001, d))
  const base = Math.atan2(dy, dx)
  const ang = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
  const j = [a[0] + l1 * Math.cos(base + side * ang), a[1] + l1 * Math.sin(base + side * ang)]
  const ex = b[0] - j[0], ey = b[1] - j[1], e = Math.hypot(ex, ey) || 1
  return [j, [j[0] + (ex / e) * l2, j[1] + (ey / e) * l2]]
}
// which way a limb bends in one key pose: toward its hint
function sideOf(a, b, l1, l2, hint) {
  const [p] = ik(a, b, l1, l2, 1), [q] = ik(a, b, l1, l2, -1)
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const score = (j) => (j[0] - mid[0]) * hint[0] + (j[1] - mid[1]) * hint[1]
  return score(p) >= score(q) ? 1 : -1
}
const angDiff = (x, y) => { let d = y - x; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d }
// One limb between two key poses. When both poses bend the same way, the hand or foot travels on an
// arc around the shoulder or hip (angle and reach interpolated, so arms swing instead of folding
// through the body, and planted hands stay planted) and IK keeps that bend. When the bend changes
// sides, the two bones swing through their own angles, so the joint passes smoothly through straight
// instead of flipping; long swings go the same way round as the hand does.
function limb(A, B, k, l1, l2, hA, hB, facing = true) {
  const sA = sideOf(A.r, A.e, l1, l2, hA), sB = sideOf(B.r, B.e, l1, l2, hB)
  const r = mix(A.r, B.r, k)
  const va = [A.e[0] - A.r[0], A.e[1] - A.r[1]], vb = [B.e[0] - B.r[0], B.e[1] - B.r[1]]
  const aA = Math.atan2(va[1], va[0]), aB = Math.atan2(vb[1], vb[0])
  let turn = angDiff(aA, aB)
  // a near half-turn could go either way: swing through the front, the way the figure faces
  if (facing && Math.abs(turn) > 2.5 && Math.cos(aA + turn / 2) < 0) turn -= 2 * Math.PI * Math.sign(turn)
  if (sA === sB) {
    const ang = aA + turn * k, d = lerp(Math.hypot(...va), Math.hypot(...vb), k)
    return ik(r, [r[0] + d * Math.cos(ang), r[1] + d * Math.sin(ang)], l1, l2, sA)
  }
  const [ja, ea] = ik(A.r, A.e, l1, l2, sA), [jb, eb] = ik(B.r, B.e, l1, l2, sB)
  const way = (x, y) => { let d = angDiff(x, y); if (Math.abs(d) > 2.4 && Math.sign(d) !== Math.sign(turn)) d -= 2 * Math.PI * Math.sign(d); return d }
  const t1a = Math.atan2(ja[1] - A.r[1], ja[0] - A.r[0]), t1b = Math.atan2(jb[1] - B.r[1], jb[0] - B.r[0])
  const t2a = Math.atan2(ea[1] - ja[1], ea[0] - ja[0]), t2b = Math.atan2(eb[1] - jb[1], eb[0] - jb[0])
  const t1 = t1a + way(t1a, t1b) * k, t2 = t2a + way(t2a, t2b) * k
  const j = [r[0] + l1 * Math.cos(t1), r[1] + l1 * Math.sin(t1)]
  return [j, [j[0] + l2 * Math.cos(t2), j[1] + l2 * Math.sin(t2)]]
}

const lerp = (a, b, t) => a + (b - a) * t
function mix(A, B, t) {
  if (Array.isArray(A)) return A.map((v, i) => mix(v, B?.[i] ?? v, t))
  if (typeof A === 'number') return lerp(A, B ?? A, t)
  return A
}
// strength moves: a smooth start and a smooth settle. Rhythmic moves (running, jacks): a pendulum.
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const swing = (t) => (1 - Math.cos(Math.PI * t)) / 2
const timing = (m) => ({ step: m.fast ? m.fast : m.slow ? 1.7 : 1.05, hold: m.fast ? 0 : m.hold ? 0.9 : 0.35 })

// Where in the loop we are at time t (seconds): the two key poses either side, and how far between.
export function phaseAt(m, t) {
  const f = m.frames
  if (f.length === 1) return { a: f[0], b: f[0], k: 0 }
  const n = f.length
  const { step, hold } = timing(m)
  const per = step + hold
  const ph = ((Math.max(0, t) || 0) % (per * n)) / per
  const i = Math.min(n - 1, Math.max(0, Math.floor(ph))), local = (ph - i) * per
  const u = Math.min(1, local / step)
  return { a: f[i], b: f[(i + 1) % n], k: m.fast ? swing(u) : ease(u) }
}
export function poseAt(m, t) {
  const { a, b, k } = phaseAt(m, t)
  const out = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) out[key] = mix(a[key] ?? b[key], b[key] ?? a[key], k)
  return out
}

// ---------- shapes ----------
// Returns a flat list of drawing instructions: { k: 'line'|'circle'|'rect'|'path', ...attrs, tone }
// tone: 'near' | 'far' | 'eq' | 'prop' | 'ground'
export function shapes(id, t = 0) {
  const m = MOVES[id]
  if (!m) return []
  const { a: A, b: B, k } = phaseAt(m, t)
  const p = poseAt(m, t)
  const out = []
  const line = (a, b, w, tone) => out.push({ k: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], w, tone })
  // ground and props
  out.push({ k: 'line', x1: 14, y1: G, x2: 146, y2: G, w: 1.4, tone: 'ground' })
  for (const pr of m.props || []) {
    if (pr.t === 'bench') { out.push({ k: 'rect', x: pr.x1, y: pr.y, w: pr.x2 - pr.x1, h: 6, r: 3, tone: 'prop' }); line([pr.x1 + 6, pr.y + 6], [pr.x1 + 6, G], 3, 'prop'); line([pr.x2 - 6, pr.y + 6], [pr.x2 - 6, G], 3, 'prop') }
    if (pr.t === 'box') out.push({ k: 'rect', x: pr.x1, y: pr.y, w: pr.x2 - pr.x1, h: G - pr.y, r: 3, tone: 'prop' })
    if (pr.t === 'bar') { line([pr.x1, pr.y], [pr.x2, pr.y], 3.2, 'prop'); line([pr.x2, pr.y], [pr.x2, G], 2, 'prop') }
    if (pr.t === 'incline') { line(pr.a, pr.b, 6, 'prop'); line([pr.a[0] - 4, pr.a[1]], [pr.a[0] - 4, G], 3, 'prop') }
    if (pr.t === 'mat') out.push({ k: 'rect', x: 18, y: G - 2.5, w: 124, h: 2.5, r: 1.2, tone: 'prop' })
    if (pr.t === 'frame') { line([pr.x, 8], [pr.x, G], 4, 'prop') }
    if (pr.t === 'tread') {
      out.push({ k: 'rect', x: 24, y: 120, w: 112, h: 6, r: 3, tone: 'prop' })
      line([132, 120], [124, 66], 3.2, 'prop'); line([116, 66], [136, 62], 3.2, 'prop')
    }
  }
  if (m.view === 'front') return out.concat(front(m, p, A, B, k))

  const Sa = S(A), Sb = S(B)
  const leg = (end, hint) => limb({ r: Sa.hip, e: Sa[end] }, { r: Sb.hip, e: Sb[end] }, k, LEN.thigh, LEN.shin, Sa[hint], Sb[hint])
  const arm = (end, hint) => limb({ r: Sa.sh, e: Sa[end] }, { r: Sb.sh, e: Sb[end] }, k, LEN.up, LEN.fore, Sa[hint], Sb[hint])
  const [kn, an] = leg('nf', 'kn')
  const [kf, af] = leg('ff', 'kf')
  const [en, hn] = arm('nh', 'en')
  const [ef, hf] = arm('fh', 'ef')
  const foot = (ank, toe) => toe ? toe : [ank[0] + 8, Math.min(G, ank[1] + 1)]
  // far limbs first
  line(p.hip, kf, 5, 'far'); line(kf, af, 5, 'far'); line(af, foot(af, p.toe && [p.toe[0] - 4, p.toe[1]]), 4, 'far')
  line(p.sh, ef, 4.4, 'far'); line(ef, hf, 4.4, 'far')
  // torso and head
  const dx = p.sh[0] - p.hip[0], dy = p.sh[1] - p.hip[1], dl = Math.hypot(dx, dy) || 1
  line(p.hip, p.sh, 8, 'near')
  out.push({ k: 'circle', cx: p.sh[0] + (dx / dl) * 10 + (p.hd?.[0] || 0), cy: p.sh[1] + (dy / dl) * 10 + (p.hd?.[1] || 0), r: 6.4, tone: 'near' })
  // equipment behind the near arm when held in both hands
  equipment(m, p, hn, hf, out, line)
  line(p.hip, kn, 5.4, 'near'); line(kn, an, 5.4, 'near'); line(an, foot(an, p.toe), 4.4, 'near')
  line(p.sh, en, 4.8, 'near'); line(en, hn, 4.8, 'near')
  return out
}

function equipment(m, p, hn, hf, out, line) {
  const eq = m.eq
  if (!eq) return
  const [type, where] = eq.split(/[@:]/)
  const at = where === 'sh' ? [p.sh[0] - 4, p.sh[1] + 2] : where === 'hip' ? [p.hip[0] + 2, p.hip[1] - 6] : where === 'f' ? [p.nf[0], p.nf[1]] : hn
  if (type === 'bb') { out.push({ k: 'circle', cx: at[0], cy: at[1], r: 9, tone: 'eq' }); out.push({ k: 'circle', cx: at[0], cy: at[1], r: 2.4, tone: 'hub' }) }
  if (type === 'db') {
    out.push({ k: 'circle', cx: at[0], cy: at[1], r: 4.8, tone: 'eq' })
    if (where === 'h' && Math.hypot(hf[0] - hn[0], hf[1] - hn[1]) > 3) out.push({ k: 'circle', cx: hf[0], cy: hf[1], r: 4.4, tone: 'eqfar' })
  }
  if (type === 'kb') { out.push({ k: 'circle', cx: at[0], cy: at[1] + 6, r: 6.4, tone: 'eq' }); out.push({ k: 'path', d: `M${at[0] - 4} ${at[1] + 2} Q${at[0]} ${at[1] - 5} ${at[0] + 4} ${at[1] + 2}`, w: 2.2, tone: 'eqline' }) }
  if (type === 'band') {
    const anchor = where === 'feet' ? [p.nf[0] + 2, p.nf[1] - 1] : where.split(',').map(Number)
    line(anchor, hn, 1.8, 'eqline'); line(anchor, hf, 1.4, 'eqfarline')
    if (where !== 'feet') out.push({ k: 'circle', cx: anchor[0], cy: anchor[1], r: 2.6, tone: 'eq' })
  }
}

// Front view for raises and flies: the body faces you, arms open and close.
function front(m, p, A, B, k) {
  const out = []
  const line = (a, b, w, tone) => out.push({ k: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], w, tone })
  const cx = 80, shY = m.bent ? 58 : 50, hipY = m.bent ? 84 : 84
  const sl = [cx - 13, shY], sr = [cx + 13, shY]
  const sp = p.spread || 0
  line([cx - 8, hipY], [cx - 11 - sp, G], 5.4, 'near'); line([cx + 8, hipY], [cx + 11 + sp, G], 5.4, 'near')
  line([cx - 8, hipY], [cx + 8, hipY], 6, 'near')
  line([cx - 7, hipY], sl, 6, 'near'); line([cx + 7, hipY], sr, 6, 'near'); line(sl, sr, 6, 'near')
  out.push({ k: 'circle', cx, cy: shY - 13, r: 6.8, tone: 'near' })
  const hint = (F, x) => [x, F.bend ? 1 : 0.2]
  const [el, hl] = limb({ r: sl, e: A.nh }, { r: sl, e: B.nh }, k, LEN.up, LEN.fore, hint(A, -1), hint(B, -1), false)
  const [er, hr] = limb({ r: sr, e: A.fh }, { r: sr, e: B.fh }, k, LEN.up, LEN.fore, hint(A, 1), hint(B, 1), false)
  if (m.eq?.startsWith('band')) {
    const anchor = m.eq.endsWith('feet') ? null : m.eq.split(':')[1].split(',').map(Number)
    line(anchor || [cx - 11, G], hl, 1.6, 'eqline'); line(anchor || [cx + 11, G], hr, 1.6, 'eqline')
  }
  line(sl, el, 4.8, 'near'); line(el, hl, 4.8, 'near'); line(sr, er, 4.8, 'near'); line(er, hr, 4.8, 'near')
  if (m.eq?.startsWith('db')) { out.push({ k: 'circle', cx: hl[0], cy: hl[1], r: 4.8, tone: 'eq' }); out.push({ k: 'circle', cx: hr[0], cy: hr[1], r: 4.8, tone: 'eq' }) }
  return out
}

// A still that reads well in a list: the end of the movement.
export const stillTime = (id) => { const m = MOVES[id]; if (!m) return 0; const { step, hold } = timing(m); return step + hold * 0.5 }

// The ten-minute rest-day routine: five moves, two minutes each.
export const MOBILITY = [
  { id: 'cat_cow', name: 'Cat and cow', cue: 'Round your back as you breathe out, let it sink as you breathe in.' },
  { id: 'child_pose', name: 'Child’s pose', cue: 'Sit back to your heels, reach long, let your forehead rest.' },
  { id: 'hip_flexor', name: 'Hip flexor stretch', cue: 'Tuck your tail, shift forward, reach up. Switch sides halfway.' },
  { id: 'forward_fold', name: 'Forward fold', cue: 'Soft knees, hang heavy, let your head go.' },
  { id: 'dead_bug', name: 'Dead bug', cue: 'Low back pressed down, opposite arm and leg reach slowly.' },
]
