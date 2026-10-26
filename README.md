# Lavender

Your workout, a morning routine and water. One tap at a time. Made for a small crew (up to six people), each with their own plan.

Stack: Vite + React (a web app you add to the iPhone Home Screen), Supabase (accounts, sync, crews), Vercel (hosting plus three small functions for notifications).

## What's in it

- **Today**: the date, today's workout (or stretch on a rest day), water under it. A morning routine card shows before work on the mornings you choose. Progress and You are the two buttons at the top.
- **Workout**: four parts (warm-up, strength, accessory, cool-down). Hold to begin. One set per screen with the move animating, the weight and reps already filled in: drag a number up or down if you did something different, tap Done. Rest runs on its own (and pings the phone when it's up, even locked). After each exercise: Easy, Good or Hard. Weights progress automatically next time, only to weights you own.
- **Morning routine**: a glass of water (logged for you), four mobility moves and a minute of breathing. About six minutes.
- **Stretch**: three guided flows (Hips and back, Core and balance, Wind down). Rest days offer today's pick. Choose **Yoga and stretching** in You and every training day becomes a flow instead of lifting.
- **Water**: tap the card for a glass, hold it for a bottle or to undo. The target comes from body weight (35 ml per kg, plus 500 ml on training days).
- **You**: your leaf (ten leaves drawn like the Lavender bud, six colours), lifetime totals (weight lifted, distance walked and run, workouts, water) with a fact you can tap through ("Lifted about 3 elephants"), your crew, and every setting in one list at the bottom.
- **Crew**: start a crew in You and share the 6-letter code. Everyone keeps their own plan. Each person's week, last workout and leaf show side by side, with your totals together and recent sessions; nudge someone once a day. Each phone publishes a small summary of its totals when it syncs, so nobody downloads anybody's history.
- **Clear purpose everywhere**: every workout says what it trains (with a pebble body map) and how hard it should feel; each part of a workout gets one line the first time you reach it; every stretch says what it does and where you should feel it; every run says what it's for. Tap the week bars for what build, push, easy and test weeks are for.
- **How do you feel?**: Tired, Normal or Fresh on the workout preview. Tired drops accessory sets and leaves a rep more in the tank; Fresh adds a set to the main lifts.
- **Exercise pages**: tap any exercise name for what it works, your progress line, best set, recent sessions, a note, and two switches: Always use this, Never give me this.
- **Plan recap**: when a plan ends, Today shows a recap to swipe through (sessions, strength on the main lifts, fitness test, totals) and starts the next plan with a little more of whatever moved least.
- **Training together**: while you're in a workout, your crew sees your leaf, the move and the set at the top of theirs, and on your crew card. Tap a crew member's workout to cheer it (they get a notification and a note next time they open the app). Invites are links: lavender-app/join/CODE opens the app and joins the crew once you're signed in.
- **Quiet updates**: the screen stays awake during workouts, and a new version swaps in while the app is in the background, then says Updated.
- **Dark mode**: You → Settings → Appearance: Light, Dark or Auto (follows the phone). Each day keeps its colour, just deeper.

## Deploy (about 15 minutes)

1. **Supabase**: create a project. SQL Editor → New query → paste all of `supabase/schema.sql` → Run. Authentication → Providers → Email: turn **Confirm email** off (private app). Project Settings → API: copy the Project URL, the `anon` key and the `service_role` key.
2. **Push keys** (once, any computer with Node): `npx web-push generate-vapid-keys`.
3. **Vercel**: put this folder in a GitHub repo (drag the whole folder onto GitHub's upload page so `api/`, `src/`, `public/` and `supabase/` stay intact), import it in Vercel, then add these in Settings → Environment Variables and redeploy:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (server only) |
| `VITE_VAPID_PUBLIC_KEY` | public key from step 2 |
| `VAPID_PRIVATE_KEY` | private key from step 2 |
| `VAPID_SUBJECT` | `mailto:you@yourdomain` |
| `CRON_SECRET` | any long random string |

4. **Reminders** (optional): in Supabase, Database → Extensions → enable `pg_cron` and `pg_net`, then run the commented `cron.schedule` lines at the bottom of `schema.sql` with your Vercel URL and `CRON_SECRET`. This sends the morning routine reminder, the workout reminder and the 3 pm water check, each only when it's still needed.
5. **Each person's iPhone**: open the site in Safari → Share → **Add to Home Screen** → open it from the Home Screen → make an account → go through the short setup → You → **Allow notifications on this phone**.
6. **Crew**: one person taps You → Start a crew and shares the code; everyone else joins with it.

If you deployed an older version of the app to the same Supabase project, running this `schema.sql` is safe; the old stamp and widget tables are simply unused. Already set up? For cheers, run `supabase/cheers.sql` once (it's also inside `schema.sql`). Live training uses Supabase Realtime, which is on by default.

## Plans

Pick a main goal (Strength and muscle, Stamina and cardio, Abs and core, Lose fat), optional focus areas (more strength, more stamina, more abs) and a length (6, 8 or 12 weeks). The plan lays out each week from your training days, starts the week you pick it, and ends with a test week.

- **Weeks**: build weeks get gradually harder (fewer reps left in the tank, one more accessory set late in a block), a push week is the hardest, easy weeks halve the sets, and the last week is easy plus a retest. 8 weeks: 3 build, easy, 2 build, push, test. 12 weeks: two 3+1 blocks, then 2 build, push, test.
- **Lifting**: double progression. Each exercise has a rep range; hit the top on every set and the weight goes up to the next one you own, miss the bottom twice and it steps back about 5%. First time on a lift, a light starting weight is picked from experience, body weight and equipment, and your first set (Too light, Just right, Too heavy) corrects it.
- **Treadmill**: zones are described by the talk test, speeds start from defaults and learn from you (each "Easy" nudges them up, each "Hard" down, and changing the speed mid-session saves it). Walkers get progressive incline walks and hill intervals; run/walk follows the NHS Couch to 5K stages, at most one stage a week; runners get mostly easy runs, one interval day (3×3 building to Norwegian 4×4) and a long run on 5+ days.
- **Core**: two or three exercises rotating bracing, flexion and anti-rotation (now including farmer carries), progressing by reps or seconds.
- **Fitting your time**: when a session would run long, moves that share no muscle are paired and done back and forth (a press with a row, a raise with a curl): 20 seconds to switch, then one rest per round. Only after that do accessories drop to two sets, then get cut from the end. Two heavy leg lifts are never paired. Treadmill finishers scale with your session length (8 to 12 minutes for 30 minute sessions, up to 20 for an hour).
- **Warm-ups**: about four minutes, built for the day: a pulse raiser, then shoulders and upper back for upper days, hips and legs for lower days. Cool-downs match.
- **When something falls short**: a set below the range, sets or moves left undone ("Finish here"), or an exercise rated Hard all count as a tough session. One tough session holds the weight; two in a row at the same weight step back about 5%. Hitting every rep but rating it Hard holds instead of going up. Bodyweight moves move along a ladder instead (for example knee push-up, incline push-up, push-up, feet-elevated push-up): two tough sessions step down a rung, every set at the top of the range steps up one.
- **Cardio that falls short**: a session counts as done when at least 90% of its work is finished and it wasn't rated Hard; leaving early saves what you did, marked unfinished. Couch to 5K stages are earned (repeat a stage until you finish it, never more than one a week), intervals drop one rep after a tough session and add at most one after a good one, and steady runs and walks grow at most about 10% from the last one you finished.
- **Tests**: a 12 minute treadmill test (or a one mile walk for walkers) in week 1 and in the last week.

### Why the plans look like this

- Twice a week per muscle, about 10 hard sets per muscle per week, 2 to 3 sets per exercise: [ACSM 2026 resistance training guidelines](https://acsm.org/resistance-training-guidelines-update-2026/); twice beats once a week: [Schoenfeld et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27102172/); more weekly sets help with diminishing returns past about 10: [Pelland et al. 2025, summarised](https://www.setforset.com/blogs/news/how-many-sets-to-build-muscle).
- Cardio alongside lifting doesn't reduce muscle growth or maximal strength (only explosive strength when done in the same session): [Schumann et al. 2022](https://www.fisiologiadelejercicio.com/wp-content/uploads/2022/12/Compatibility-of-Concurrent-Aerobic-and-Strength-Training.pdf).
- 4×4 intervals at 85–95% of max heart rate with 3 minute recoveries, built up from 3×3; about 7% better VO2max over six weeks at three sessions a week: [Norwegian 4×4 evidence review](https://outliyr.com/reports/norwegian-4x4).
- Couch to 5K stages: [NHS plan, week by week](https://healthwell.eani.org.uk/node/2247).
- Fat loss: 0.25–1% of body weight a week, bigger deficits cost more muscle, protein 1.6–2.2 g/kg, 2–4 moderate cardio sessions: [MacroFactor summary of Murphy & Koehler and others](https://macrofactor.com/tips-exercising-deficit/).
- Ab work doesn't burn belly fat (6 weeks of daily ab training, no change in abdominal fat): [Vispute et al. 2011, via Spot reduction](https://en.wikipedia.org/wiki/Spot_reduction). So Abs and core uses the fat-loss structure plus core training.
- Walking test: [Rockport one mile walk test](https://www.topendsports.com/testing/tests/rockport.htm).
- Pairing a move with one for different muscles keeps the work done while taking less time: [Robbins et al., agonist-antagonist paired sets, a brief review](https://vuir.vu.edu.au/6830/).

## Code map

```
src/engine/   exercises.js  67 exercises by pattern, equipment and joint stress
              plan.js       goal plans: week shapes, weekly layout, treadmill sessions, core blocks
              program.js    lifting days, starting weights, progression, fitting sessions to your time
              loads.js      rounding to the weights you own
              moves.js      the ink figure: every exercise and stretch as animated poses (two-bone IK, no flips)
              routines.js   morning routine, stretch flows, warm-up and cool-down
              rewards.js    bests, weekly streak, strength gains
              hydration.js  water target
              stats.js      lifetime totals and fun facts (yours and your crew's)
              purpose.js    the one-line answers: what a day, part, move, stretch or run is for
src/lib/      store.js      local-first state, syncs to Supabase in the background
              cloud.js      accounts, sync, crews, cheers, push
              live.js       training together: what your crew is doing right now
              actions.js    start and finish workouts, water
              sample.js     made-up history, only in the offline test build
src/ui/       kit.jsx (springs, sheets, the opener, wake lock) · bodymap.jsx · explain.jsx (exercise page, plan weeks) · liquid.js (glass) · leaves.js + avatar.jsx (avatars) · mark.js (logo)
src/screens/  Today · Session (workout) · Recap (plan end) · Cardio (treadmill) · Flow (routines) · Calendar · Progress · You · Onboarding · Auth
api/          rest-timer.js (push when rest is up) · nudge.js (crew) · cron.js (reminders)
```

`npm run dev` runs it locally with a `.env`. `npm run build:demo` builds one offline HTML file with no backend, which is the test version.
