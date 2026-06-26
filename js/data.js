/* =====================================================================
   data.js — program template + pure helpers
   Loaded first. Exposes globals: APP_VERSION, DEFAULT_PROGRAM, CARDIO,
   and helper functions used by store.js / app.js.
   No build step, no modules — classic script, communicate via globals.
   ===================================================================== */

/* Bump this on every change. Keep it in sync with CACHE in sw.js so you
   can tell which build a phone is actually running (shown on Edit tab). */
const APP_VERSION = '1.0.0';

/* The fixed cardio block that ends every training day. Not a strength
   exercise — it has no sets/reps, just a duration and a note. */
const CARDIO = {
  type: 'cardio',
  name: 'Cardio',
  minutes: 20,
  note: '20 min steady-state — treadmill / bike / elliptical — or 15 min intervals + 5 min cool-down',
};

/* ---- tiny builders to keep the program data readable ---- */
function ex(section, name, sets, reps, rest, cue) {
  return { section, name, sets, reps, rest, cue };
}
function day(name, emoji, focus, exercises) {
  return { name, emoji, focus, exercises };
}
function cycle(name, color, days) {
  return { name, color, days };
}

/* =====================================================================
   THE PROGRAM — 4 cycles × 4 days × 5 strength exercises (+ cardio).
   Transcribed from Workout_Program.xlsx.
   rest is in SECONDS. reps is a free string (range / "ea" / drop set).
   ===================================================================== */
const DEFAULT_PROGRAM = {
  cycles: [

    /* ---------------------- CYCLE 1 (blue) ---------------------- */
    cycle('Cycle 1', '#4ea1ff', [
      day('LEGS', '🦵', 'Quads · Hamstrings · Calves', [
        ex('Quads', 'Leg Press', 4, '10-12', 90, 'Feet shoulder-width; full depth without lower back rounding'),
        ex('Quads', 'Leg Extension', 3, '12-15', 60, 'Control the lowering phase; squeeze quad at top'),
        ex('Hamstrings', 'Romanian Deadlift', 4, '10-12', 90, 'Hinge at hips, soft knee bend; feel the stretch in hamstrings'),
        ex('Hamstrings', 'Lying Leg Curl', 3, '12-15', 60, "Full contraction at top; don't swing hips"),
        ex('Calves', 'Smith Machine Calf Raise', 3, '15-20', 60, 'Full stretch at bottom; hold 1 sec at top'),
      ]),
      day('ARMS', '💪', 'Chest · Shoulders · Biceps · Triceps', [
        ex('Chest', 'Incline Dumbbell Press', 3, '12', 90, '30–45° incline; control descent, press up and slightly inward'),
        ex('Shoulders', 'Dumbbell Shoulder Press', 3, '10-12', 90, 'Press fully overhead; slight forward lean is fine'),
        ex('Shoulders', 'Cable Lateral Raise', 3, '15', 60, 'Lead with elbows; slight forward lean; stop at shoulder height'),
        ex('Biceps', 'Dumbbell Bicep Curl', 3, '12', 60, 'Supinate at top; no swinging for momentum'),
        ex('Triceps', 'Cable Tricep Pushdown', 3, '12-15', 60, 'Elbows pinned; full extension at bottom; rope or bar'),
      ]),
      day('BOOTY', '🍑', 'Glutes · Hip Abductors', [
        ex('Glutes (heavy)', 'Barbell Hip Thrust', 4, '10-12', 90, 'Shoulders on bench; drive hips up; hard squeeze at top'),
        ex('Glutes (heavy)', 'Sumo Deadlift', 3, '10-12', 90, 'Wide stance, toes ~45° out; push knees out throughout'),
        ex('Glutes (isolation)', 'Cable Kickback', 3, '15 ea', 60, 'Ankle cuff; slight forward lean; squeeze glute at full extension'),
        ex('Glutes (isolation)', 'Hip Abduction Machine', 3, '20', 60, "Slow and controlled; don't let the weight snap back"),
        ex('Glutes + Legs', 'Dumbbell Curtsy Lunge', 3, '12 ea', 60, 'Step back and across; keep front knee tracking over toes'),
      ]),
      day('BACK', '🦋', 'Lats · Mid Back · Rear Delts', [
        ex('Lats', 'Lat Pulldown', 4, '10-12', 90, 'Wide overhand grip; pull to upper chest; elbows to back pockets'),
        ex('Mid Back', 'Seated Cable Row', 3, '10-12', 90, "Neutral grip; squeeze shoulder blades; don't round lower back"),
        ex('Mid Back', 'Single-Arm Dumbbell Row', 3, '10-12 ea', 90, 'Brace on bench; full stretch at bottom; elbow drives back'),
        ex('Rear Delts', 'Face Pull', 3, '15-20', 60, 'Rope to face height; pull to forehead; great for posture'),
        ex('Rear Delts', 'Dumbbell Reverse Fly', 3, '15', 60, 'Hinge ~45°; slight bend in elbows; lead with elbows'),
      ]),
    ]),

    /* ---------------------- CYCLE 2 (purple) ---------------------- */
    cycle('Cycle 2', '#b78bff', [
      day('LEGS', '🦵', 'Quads · Hamstrings · Calves', [
        ex('Quads', 'Hack Squat Machine', 4, '10-12', 90, 'Heels slightly elevated if needed; full depth; knees track over toes'),
        ex('Quads', 'Leg Press (narrow stance)', 3, '12', 60, 'Closer foot placement shifts emphasis to quads; pause at bottom'),
        ex('Hamstrings', 'Stiff-Leg Deadlift', 4, '10-12', 90, 'Minimal knee bend; feel a deep hamstring stretch each rep'),
        ex('Hamstrings', 'Seated Leg Curl', 3, '12-15', 60, 'Different angle vs lying curl; squeeze hard at full contraction'),
        ex('Calves', 'Leg Press Calf Raise', 3, '15-20', 60, 'Full range on the platform; heels drop below for maximum stretch'),
      ]),
      day('ARMS', '💪', 'Chest · Shoulders · Biceps · Triceps', [
        ex('Chest', 'Incline Cable Fly', 3, '12', 90, 'Set cables low; arc upward; constant tension throughout the rep'),
        ex('Shoulders', 'Arnold Press', 3, '10-12', 90, 'Rotate palms in as you lower; builds shoulder depth and width'),
        ex('Shoulders', 'Dumbbell Lateral Raise', 3, '15', 60, 'Slight forward lean; lead with pinky side; controlled return'),
        ex('Biceps', 'Preacher Curl', 3, '12', 60, 'Machine or EZ-bar; full extension at bottom; no cheating'),
        ex('Triceps', 'Skull Crusher', 3, '12', 60, 'EZ-bar or DB; lower to forehead; keep elbows pointing up'),
      ]),
      day('BOOTY', '🍑', 'Glutes · Hip Abductors', [
        ex('Glutes (heavy)', 'Smith Machine Hip Thrust (single leg)', 3, '10 ea', 90, 'One foot flat, other extended; unilateral glute activation'),
        ex('Glutes (heavy)', 'Good Morning', 3, '12', 90, 'Barbell on traps; hinge forward; feel glutes and hamstrings stretch'),
        ex('Glutes (isolation)', 'Donkey Kickback Machine', 3, '15 ea', 60, 'Pad on back of knee; squeeze glute fully; controlled return'),
        ex('Glutes (isolation)', 'Cable Hip Abduction', 3, '15 ea', 60, 'Ankle cuff; stand sideways to cable; leg sweeps out and slightly back'),
        ex('Glutes + Legs', 'Dumbbell Reverse Lunge', 3, '12 ea', 60, 'Step back rather than forward; less knee stress; upright torso'),
      ]),
      day('BACK', '🦋', 'Lats · Mid Back · Rear Delts', [
        ex('Lats', 'Underhand Lat Pulldown', 4, '10-12', 90, 'Supinated grip; elbows tuck in; great stretch through lower lats'),
        ex('Lats', 'Cable Pullover', 3, '12', 60, 'Straight arms; start overhead; pull down in arc; full lat stretch'),
        ex('Mid Back', 'Chest-Supported Machine Row', 3, '10-12', 90, 'Chest pad removes lower back — focus purely on rowing the weight'),
        ex('Mid Back', 'Single-Arm Cable Row', 3, '10-12 ea', 90, 'Rotate torso slightly at bottom for extra range; elbow drives back'),
        ex('Rear Delts', 'Face Pull', 3, '15-20', 60, 'Rope to face; external rotation at end of each rep'),
      ]),
    ]),

    /* ---------------------- CYCLE 3 (red) ---------------------- */
    cycle('Cycle 3', '#ff6b6b', [
      day('LEGS', '🦵', 'Quads · Hamstrings · Calves', [
        ex('Quads', 'Bulgarian Split Squat', 4, '10 ea', 90, 'Rear foot elevated on bench; front foot forward; torso upright'),
        ex('Quads', 'Leg Extension (drop set)', 3, '10+8+6', 60, 'Drop weight ~20% at failure; 3 mini-sets per set; quad burnout'),
        ex('Hamstrings', 'Single-Leg Romanian Deadlift', 3, '10 ea', 90, 'Hinge on one leg; great for balance and unilateral hamstring strength'),
        ex('Hamstrings', 'Lying Leg Curl', 3, '12-15', 60, 'Plantarflex (point toes) to increase hamstring engagement'),
        ex('Calves', 'Seated Calf Raise', 3, '15-20', 60, 'Targets the soleus; slower tempo works best here'),
      ]),
      day('ARMS', '💪', 'Chest · Shoulders · Biceps · Triceps', [
        ex('Chest', 'Machine Chest Press', 3, '12', 90, 'Adjust seat so handles are at chest level; full stretch at bottom'),
        ex('Shoulders', 'Smith Machine Overhead Press', 3, '10-12', 90, 'Bar in front; full overhead extension; controlled descent'),
        ex('Shoulders', 'Cable Lateral Raise', 3, '15', 60, 'Cable from low pulley; cross-body variation for constant tension'),
        ex('Biceps', 'Incline Dumbbell Curl', 3, '12', 60, 'Leaning back on incline; longer range of motion; great stretch'),
        ex('Triceps', 'Overhead Dumbbell Extension', 3, '12', 60, 'Both hands on one DB; elbows close; feel the long head stretch'),
      ]),
      day('BOOTY', '🍑', 'Glutes · Hip Abductors', [
        ex('Glutes (heavy)', 'Barbell Hip Thrust (banded)', 4, '10-12', 90, 'Mini band above knees; push knees out against band throughout'),
        ex('Glutes (heavy)', 'Cable Pull-Through', 3, '12', 90, 'Rope between legs facing away from stack; hinge and drive hips forward'),
        ex('Glutes (isolation)', 'Cable Kickback', 3, '15 ea', 60, 'Slight forward lean; full glute contraction at peak; slow return'),
        ex('Glutes (isolation)', 'Hip Abduction Machine', 3, '20', 60, 'Pause 1 sec at widest point; slow return — no crashing'),
        ex('Glutes + Legs', 'Lateral Lunge', 3, '12 ea', 60, 'Step wide to side; sit into hip of working leg; drive back up'),
      ]),
      day('BACK', '🦋', 'Lats · Mid Back · Rear Delts', [
        ex('Lats', 'Wide-Grip Lat Pulldown', 4, '10-12', 90, 'Wider than shoulder-width; lean back slightly; pull to upper chest'),
        ex('Mid Back', 'Seated Cable Row (wide grip)', 3, '10-12', 90, 'Wide overhand grip; more upper back activation than close grip'),
        ex('Mid Back', 'Single-Arm Dumbbell Row', 3, '10-12 ea', 90, 'Full stretch at bottom; row elbow back and up; squeeze at top'),
        ex('Rear Delts', 'Face Pull', 3, '15-20', 60, "Rope pulls apart at face; think 'show your biceps' at end position"),
        ex('Rear Delts', '45° Back Extension', 3, '15', 60, 'Arms crossed on chest; hinge and extend; good for lower back health'),
      ]),
    ]),

    /* ---------------------- CYCLE 4 (green) ---------------------- */
    cycle('Cycle 4', '#36d399', [
      day('LEGS', '🦵', 'Quads · Hamstrings · Calves', [
        ex('Quads', 'Leg Press (high foot placement)', 4, '10-12', 90, 'High foot placement shifts emphasis toward glutes and hamstrings'),
        ex('Quads', 'Dumbbell Step-Up', 3, '12 ea', 90, 'Drive through heel; slow controlled return; knee-friendly'),
        ex('Hamstrings', 'Stiff-Leg Deadlift', 4, '10-12', 90, 'Minimal knee bend; bar close to legs; deep hamstring stretch each rep'),
        ex('Hamstrings', 'Seated Leg Curl', 3, '12-15', 60, 'Heavier focus than lying; slow eccentric; full contraction'),
        ex('Calves', 'Smith Machine Calf Raise', 3, '15-20', 60, 'Single-leg optional for added difficulty; full range every rep'),
      ]),
      day('ARMS', '💪', 'Chest · Shoulders · Biceps · Triceps', [
        ex('Chest', 'Dumbbell Chest Fly (flat)', 3, '12', 90, 'Wide arc; slight bend in elbows; feel a deep stretch at the bottom'),
        ex('Shoulders', 'Machine Shoulder Press', 3, '10-12', 90, 'Controlled machine path; great for safely pushing shoulder volume'),
        ex('Shoulders', 'Cable Upright Row', 3, '12', 60, 'Elbows lead upward; stop at chin height; front and side delt focus'),
        ex('Biceps', 'Barbell Curl', 3, '12', 60, 'Shoulder-width grip; full extension at bottom; curl to chin'),
        ex('Triceps', 'Rope Pushdown', 3, '12-15', 60, 'Rope splits apart at bottom; spread outward for full contraction'),
      ]),
      day('BOOTY', '🍑', 'Glutes · Hip Abductors', [
        ex('Glutes (heavy)', 'Smith Machine Hip Thrust', 4, '10-12', 90, 'Controlled negative; drive hips up explosively; max contraction at top'),
        ex('Glutes (heavy)', 'Sumo Romanian Deadlift (DB)', 3, '10-12', 90, 'Wide stance with DBs; lower along inner thighs; deep glute stretch'),
        ex('Glutes (isolation)', 'Donkey Kickback Machine', 3, '15 ea', 60, "Pad behind knee; squeeze glute fully; don't hyperextend lower back"),
        ex('Glutes (isolation)', 'Lateral Band Walk', 3, '20 ea', 60, 'Mini band above knees; stay low; small controlled steps sideways'),
        ex('Glutes + Legs', 'Walking Lunge (Dumbbell)', 3, '12 ea', 60, 'Long stride; torso upright; great for glutes and quads together'),
      ]),
      day('BACK', '🦋', 'Lats · Mid Back · Rear Delts', [
        ex('Lats', 'Single-Arm Lat Pulldown', 4, '10-12 ea', 90, 'Slight lean away; elbow drives toward hip; full stretch at top'),
        ex('Lats', 'Straight Arm Pulldown', 3, '12-15', 60, 'Straight arms; slight forward lean; arc the cable down to hips'),
        ex('Mid Back', 'Landmine Row', 3, '10-12 ea', 90, 'One end of barbell in corner; row with one arm; great mid back pull'),
        ex('Mid Back', 'Chest-Supported DB Row', 3, '10-12', 90, 'Lie face-down on incline bench; pure back work — no leg drive'),
        ex('Rear Delts', 'Rope Face Pull', 3, '15-20', 60, 'Pull rope apart at face; external rotation; maintains shoulder health'),
      ]),
    ]),

  ],
};

/* =====================================================================
   PURE HELPERS (no state, no DOM) — used across the app.
   ===================================================================== */

/* Deep clone via JSON (program data is plain JSON-safe objects). */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* Format a rest value (seconds) for display, e.g. 90 -> "90 sec". */
function restLabel(sec) {
  return (sec | 0) + ' sec';
}

/* Format seconds as M:SS for countdown timers, e.g. 90 -> "1:30". */
function clockLabel(totalSec) {
  totalSec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

/* Parse a free-typed rest string back to seconds for the Edit tab.
   Accepts "90", "90s", "90 sec", "1:30", "1 min". Falls back to 60. */
function parseRest(str) {
  if (typeof str === 'number') return Math.max(0, Math.round(str));
  str = String(str || '').trim().toLowerCase();
  if (!str) return 0;
  if (str.includes(':')) {
    const [m, s] = str.split(':');
    return (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
  }
  const n = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return 60;
  if (str.includes('min')) return Math.round(n * 60);
  return Math.round(n);
}

/* Stable key for tracking last-used weight, keyed by exercise NAME so the
   same lift shares its "last time" hint across cycles/days. */
function exKey(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/* Build the ordered list of runnable items for a day: every strength
   exercise (in order) followed by the fixed cardio block. */
function dayItems(dayObj) {
  const items = dayObj.exercises.map((e, i) =>
    Object.assign({ type: 'exercise', index: i }, e)
  );
  items.push(Object.assign({ index: items.length }, CARDIO));
  return items;
}

/* Total set count for a day (strength only) — for progress display. */
function totalSets(dayObj) {
  return dayObj.exercises.reduce((sum, e) => sum + (e.sets | 0), 0);
}

/* expose on window too, so it's obvious these are the shared globals
   (guarded so this file can also be sanity-checked outside a browser) */
if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
  window.DEFAULT_PROGRAM = DEFAULT_PROGRAM;
  window.CARDIO = CARDIO;
}
