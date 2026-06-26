/* =====================================================================
   store.js — all persistent state lives here (localStorage only).
   Loaded after data.js. Exposes global: Store.
   Nothing is ever sent anywhere; the app is fully offline.
   ===================================================================== */

const Store = (function () {
  'use strict';

  const KEY = 'workout-tracker-state-v1';

  /* Shape of a fresh save. `program: null` means "use DEFAULT_PROGRAM";
     once the user edits anything we clone the default into `program`. */
  function defaults() {
    return {
      version: APP_VERSION,
      pointer: { cycle: 0, day: 0 }, // the next day to do (auto-suggested)
      program: null,                 // null => DEFAULT_PROGRAM, else custom copy
      lastWeights: {},               // exKey(name) -> { weight, name, ts }
      history: [],                   // completed days, most-recent-first
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      // merge onto defaults so older saves gain any new fields
      return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) {
      console.warn('Store: load failed, starting fresh', e);
      return defaults();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Store: save failed', e);
    }
  }

  /* ---------------- program ---------------- */

  function getProgram() {
    return state.program || DEFAULT_PROGRAM;
  }
  function isCustomProgram() {
    return !!state.program;
  }
  /* Get a mutable program, cloning the default on first edit. */
  function editableProgram() {
    if (!state.program) state.program = clone(DEFAULT_PROGRAM);
    return state.program;
  }
  function commit() {
    save();
  }
  function resetProgram() {
    state.program = null;
    save();
  }

  function numCycles() {
    return getProgram().cycles.length;
  }
  function numDays(cycle) {
    return getProgram().cycles[cycle].days.length;
  }
  function getDay(cycle, day) {
    return getProgram().cycles[cycle].days[day];
  }

  /* ---------------- pointer (which day is "next") ---------------- */

  function getPointer() {
    return { cycle: state.pointer.cycle, day: state.pointer.day };
  }
  function clampCycle(c) {
    return Math.max(0, Math.min(numCycles() - 1, c | 0));
  }
  function clampDay(c, d) {
    return Math.max(0, Math.min(numDays(c) - 1, d | 0));
  }
  function setPointer(cycle, day) {
    cycle = clampCycle(cycle);
    day = clampDay(cycle, day);
    state.pointer = { cycle, day };
    save();
  }
  /* The day that follows (cycle, day), wrapping day->cycle->program. */
  function nextOf(cycle, day) {
    const prog = getProgram();
    day += 1;
    if (day >= prog.cycles[cycle].days.length) {
      day = 0;
      cycle += 1;
    }
    if (cycle >= prog.cycles.length) cycle = 0;
    return { cycle, day };
  }

  /* ---------------- weights ---------------- */

  function lastWeight(name) {
    const rec = state.lastWeights[exKey(name)];
    return rec ? rec.weight : null;
  }
  /* Save live as she types so even an abandoned workout records progress. */
  function recordWeight(name, weight) {
    weight = String(weight == null ? '' : weight).trim();
    const k = exKey(name);
    if (!weight) {
      delete state.lastWeights[k];
    } else {
      state.lastWeights[k] = { weight, name, ts: Date.now() };
    }
    save();
  }

  /* ---------------- history / completing a day ---------------- */

  /* Record a finished day and advance the pointer to the following day.
     sessionWeights: { exKey -> weightString } collected during the run. */
  function completeDay(cycle, day, sessionWeights) {
    sessionWeights = sessionWeights || {};
    const prog = getProgram();
    const d = prog.cycles[cycle].days[day];

    const record = {
      ts: Date.now(),
      cycle,
      day,
      cycleName: prog.cycles[cycle].name,
      cycleColor: prog.cycles[cycle].color,
      dayName: d.name,
      dayEmoji: d.emoji,
      exercises: d.exercises.map((e) => {
        const w = sessionWeights[exKey(e.name)];
        return {
          name: e.name,
          section: e.section,
          sets: e.sets,
          reps: e.reps,
          weight: w == null ? '' : String(w).trim(),
        };
      }),
    };

    state.history.unshift(record);

    // fold this session's weights into the "last weight" memory
    record.exercises.forEach((re) => {
      if (re.weight) {
        state.lastWeights[exKey(re.name)] = {
          weight: re.weight,
          name: re.name,
          ts: record.ts,
        };
      }
    });

    state.pointer = nextOf(cycle, day);
    save();
    return record;
  }

  function getHistory() {
    return state.history.slice();
  }
  function clearHistory() {
    state.history = [];
    save();
  }
  /* How many times each (cycle,day) has been completed — for badges. */
  function completionCount(cycle, day) {
    return state.history.filter((h) => h.cycle === cycle && h.day === day).length;
  }

  /* ---------------- danger zone ---------------- */

  function resetAll() {
    state = defaults();
    save();
  }

  return {
    // program
    getProgram,
    isCustomProgram,
    editableProgram,
    commit,
    resetProgram,
    numCycles,
    numDays,
    getDay,
    // pointer
    getPointer,
    setPointer,
    nextOf,
    // weights
    lastWeight,
    recordWeight,
    // history
    completeDay,
    getHistory,
    clearHistory,
    completionCount,
    // danger
    resetAll,
  };
})();

if (typeof window !== 'undefined') window.Store = Store;
