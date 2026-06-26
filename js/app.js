/* =====================================================================
   app.js — UI, live workout runner, countdown timer.
   Loaded last. Talks to globals from data.js + store.js.
   Renders into #view; #tabbar switches between Live / Progress / Edit.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- tiny helpers ---------- */
  const $ = (id) => document.getElementById(id);
  let view = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }
  function setHTML(html) {
    view.innerHTML = html;
  }

  /* ---------- module state ---------- */
  let currentTab = 'live';
  let run = null;            // active workout, or null
  let tickHandle = null;     // single interval while a run is active
  let liveSelCycle = null;   // cycle shown in the day-picker (null => pointer)
  let editSel = { cycle: 0, day: 0 };

  /* =====================================================================
     AUDIO + HAPTICS — gentle beep & vibrate when a timer hits zero.
     AudioContext must be unlocked inside a user gesture (iOS), so we call
     ensureAudio() from the Begin / Set done / Start buttons.
     ===================================================================== */
  let audioCtx = null;
  function ensureAudio() {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {
      /* audio is a nice-to-have; never let it break the app */
    }
  }
  function beep(times) {
    if (!audioCtx) return;
    times = times || 3;
    const t0 = audioCtx.currentTime;
    for (let n = 0; n < times; n++) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = n === times - 1 ? 1175 : 880; // last beep higher
      o.connect(g);
      g.connect(audioCtx.destination);
      const s = t0 + n * 0.3;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.4, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.24);
      o.start(s);
      o.stop(s + 0.26);
    }
  }
  function buzz(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }
  function alarm() {
    ensureAudio();
    beep(3);
    buzz([130, 70, 130, 70, 220]);
  }

  /* =====================================================================
     COUNTDOWN TIMER — endsAt-timestamp based so it stays accurate even if
     setInterval is throttled. One interval runs for the whole workout.
     ===================================================================== */
  function startTimer(seconds, onComplete) {
    run.timerTotal = seconds;
    run.timerEndsAt = Date.now() + seconds * 1000;
    run.onTimerComplete = onComplete;
  }
  function stopTimer() {
    run.timerEndsAt = null;
    run.onTimerComplete = null;
  }
  function timerLeft() {
    if (!run || !run.timerEndsAt) return 0;
    return Math.max(0, (run.timerEndsAt - Date.now()) / 1000);
  }
  function tick() {
    if (!run || !run.timerEndsAt) return;
    const left = timerLeft();
    updateTimerDisplay(left, run.timerTotal);
    if (left <= 0) {
      const cb = run.onTimerComplete;
      run.timerEndsAt = null;
      run.onTimerComplete = null;
      if (cb) cb();
    }
  }
  const RING_CIRC = 339.292; // 2 * PI * r(54)
  function updateTimerDisplay(left, total) {
    const t = $('timer');
    if (t) t.textContent = clockLabel(left);
    const fg = document.querySelector('.ring-fg');
    if (fg) {
      const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
      fg.style.strokeDashoffset = (RING_CIRC * (1 - frac)).toFixed(2);
    }
  }

  /* =====================================================================
     NAVIGATION + TOP-LEVEL RENDER
     ===================================================================== */
  function setTab(tab) {
    currentTab = tab;
    if (tab === 'live') liveSelCycle = null; // re-center picker on return
    updateTabBar();
    render();
  }
  function updateTabBar() {
    document.querySelectorAll('.tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === currentTab);
    });
  }
  function render() {
    if (currentTab === 'live') return run ? renderRunner() : renderLiveHome();
    if (currentTab === 'progress') return renderProgress();
    if (currentTab === 'edit') return renderEdit();
  }

  /* =====================================================================
     LIVE — HOME (pick a day to run)
     ===================================================================== */
  function renderLiveHome() {
    const prog = Store.getProgram();
    const p = Store.getPointer();
    const selCycle = liveSelCycle == null ? p.cycle : liveSelCycle;
    const cyc = prog.cycles[selCycle];

    const suggested = prog.cycles[p.cycle].days[p.day];

    let cycleChips = prog.cycles
      .map(
        (c, i) =>
          `<button class="cyc-chip ${i === selCycle ? 'active' : ''}" data-action="pick-cycle" data-cycle="${i}" style="--c:${c.color}">${esc(c.name)}</button>`
      )
      .join('');

    let dayCards = cyc.days
      .map((d, i) => {
        const isNext = selCycle === p.cycle && i === p.day;
        const done = Store.completionCount(selCycle, i);
        return `
        <button class="day-card ${isNext ? 'next' : ''}" data-action="start-run" data-cycle="${selCycle}" data-day="${i}" style="--c:${cyc.color}">
          <div class="day-card-emoji">${esc(d.emoji)}</div>
          <div class="day-card-main">
            <div class="day-card-name">Day ${i + 1} — ${esc(d.name)} ${isNext ? '<span class="tag-next">NEXT</span>' : ''}</div>
            <div class="day-card-focus">${esc(d.focus)}</div>
            <div class="day-card-meta">${d.exercises.length} exercises + cardio ${done ? `· <span class="done-badge">✓ ${done}×</span>` : ''}</div>
          </div>
          <div class="day-card-go">▶</div>
        </button>`;
      })
      .join('');

    setHTML(`
      <div class="screen">
        <div class="screen-head">
          <h1>Workout</h1>
          <div class="sub">Train every 2 days · finish a cycle, then the next</div>
        </div>

        <button class="suggest-card" data-action="start-run" data-cycle="${p.cycle}" data-day="${p.day}" style="--c:${prog.cycles[p.cycle].color}">
          <div class="suggest-kicker">NEXT UP · ${esc(prog.cycles[p.cycle].name)}</div>
          <div class="suggest-title">${esc(suggested.emoji)} Day ${p.day + 1} — ${esc(suggested.name)}</div>
          <div class="suggest-focus">${esc(suggested.focus)}</div>
          <div class="suggest-cta">Start workout ▶</div>
        </button>

        <div class="picker-head">Or pick any day</div>
        <div class="cyc-chips">${cycleChips}</div>
        <div class="day-list">${dayCards}</div>
      </div>
    `);
  }

  /* =====================================================================
     LIVE — RUNNER (the gym screen)
     ===================================================================== */
  function startRun(cycle, day) {
    ensureAudio();
    const prog = Store.getProgram();
    const dayObj = prog.cycles[cycle].days[day];
    const items = dayItems(dayObj);

    // snapshot previous weights so the "Last: X" hint shows the OLD value
    const prevWeights = {};
    dayObj.exercises.forEach((e) => {
      const lw = Store.lastWeight(e.name);
      if (lw != null) prevWeights[exKey(e.name)] = lw;
    });

    run = {
      cycle,
      day,
      color: prog.cycles[cycle].color,
      cycleName: prog.cycles[cycle].name,
      dayName: dayObj.name,
      dayEmoji: dayObj.emoji,
      items,
      i: 0,
      setIndex: 0,
      mode: items[0].type === 'cardio' ? 'cardioReady' : 'begin',
      weights: {},
      prevWeights,
      timerEndsAt: null,
      timerTotal: 0,
      onTimerComplete: null,
    };
    if (!tickHandle) tickHandle = setInterval(tick, 250);
    currentTab = 'live';
    updateTabBar();
    render();
  }
  function endRun() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
    run = null;
  }
  function gotoItem(idx) {
    stopTimer();
    if (idx < 0 || idx >= run.items.length) return;
    run.i = idx;
    run.setIndex = 0;
    run.mode = run.items[idx].type === 'cardio' ? 'cardioReady' : 'begin';
    render();
  }

  function setDots(n, cur) {
    let out = '';
    for (let s = 0; s < n; s++) {
      const cls = s < cur ? 'dot done' : s === cur ? 'dot cur' : 'dot';
      out += `<span class="${cls}"></span>`;
    }
    return `<div class="dots">${out}</div>`;
  }
  function statChips(item) {
    return `<div class="stat-chips">
      <span class="chip">🎯 ${esc(item.reps)}</span>
      <span class="chip">⏱ ${esc(restLabel(item.rest))} rest</span>
    </div>`;
  }
  function weightRow(item) {
    const k = exKey(item.name);
    const cur = run.weights[k] != null ? run.weights[k] : '';
    const last = run.prevWeights[k];
    return `
      <div class="weight-row">
        <label class="weight-field">
          <span class="weight-label">Weight used</span>
          <span class="weight-input-wrap">
            <input class="weight-input" type="text" inputmode="decimal" enterkeyhint="done"
              data-name="${esc(item.name)}" data-k="${esc(k)}" value="${esc(cur)}" placeholder="—" />
            <span class="weight-unit">kg</span>
          </span>
        </label>
        ${
          last
            ? `<button class="last-chip" data-action="copy-last" data-name="${esc(item.name)}" data-k="${esc(k)}">Last: ${esc(last)} kg ⟲</button>`
            : `<span class="last-chip muted">Last: —</span>`
        }
      </div>`;
  }
  function ringHTML(left, total, color) {
    const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
    const off = (RING_CIRC * (1 - frac)).toFixed(2);
    return `
      <div class="timer-wrap">
        <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="ring-bg" cx="60" cy="60" r="54"></circle>
          <circle class="ring-fg" cx="60" cy="60" r="54" stroke="${color}"
            stroke-dasharray="${RING_CIRC}" stroke-dashoffset="${off}"></circle>
        </svg>
        <div class="timer-num" id="timer">${clockLabel(left)}</div>
      </div>`;
  }
  function navRow() {
    const i = run.i;
    const last = run.items.length - 1;
    return `
      <div class="nav-row">
        <button class="btn-ghost" data-action="prev-item" ${i === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="btn-ghost" data-action="next-item" ${i >= last ? 'disabled' : ''}>Next →</button>
      </div>`;
  }
  function runHeader() {
    const item = run.items[run.i];
    const frac =
      item.type === 'exercise' ? run.setIndex / Math.max(1, item.sets) : 0;
    const pct = (((run.i + frac) / run.items.length) * 100).toFixed(1);
    return `
      <div class="run-top">
        <button class="icon-btn" data-action="exit-run" aria-label="Exit workout">✕</button>
        <div class="run-progress">
          <div class="run-progress-label">${esc(run.dayEmoji)} ${esc(run.dayName)} · ${esc(run.cycleName)}</div>
          <div class="bar"><div class="bar-fill" style="width:${pct}%;background:${run.color}"></div></div>
        </div>
      </div>`;
  }

  function renderRunner() {
    const item = run.items[run.i];
    let body = '';

    if (item.type === 'exercise' && run.mode === 'begin') {
      body = `
        <div class="focus">
          <div class="section-pill" style="--c:${run.color}">${esc(item.section)}</div>
          <h1 class="ex-name">${esc(item.name)}</h1>
          ${setDots(item.sets, 0)}
          <div class="set-line">${item.sets} sets</div>
          ${statChips(item)}
          <div class="cue">💡 ${esc(item.cue)}</div>
          ${weightRow(item)}
        </div>
        <div class="actions">
          <button class="btn-primary big" data-action="begin" style="background:${run.color}">Begin ▶</button>
        </div>
        ${navRow()}`;
    } else if (item.type === 'exercise' && run.mode === 'set') {
      body = `
        <div class="focus">
          <div class="section-pill" style="--c:${run.color}">${esc(item.section)}</div>
          <h1 class="ex-name">${esc(item.name)}</h1>
          ${setDots(item.sets, run.setIndex)}
          <div class="set-line big">Set ${run.setIndex + 1} <span>of ${item.sets}</span></div>
          ${statChips(item)}
          <div class="cue">💡 ${esc(item.cue)}</div>
          ${weightRow(item)}
        </div>
        <div class="actions">
          <button class="btn-primary big" data-action="set-done" style="background:${run.color}">Set done ✓</button>
        </div>
        ${navRow()}`;
    } else if (item.type === 'exercise' && run.mode === 'rest') {
      const left = timerLeft();
      body = `
        <div class="focus rest">
          <div class="rest-label">REST</div>
          ${ringHTML(left, run.timerTotal, run.color)}
          <div class="next-line">Up next: Set ${run.setIndex + 2} of ${item.sets}<br><span class="muted">${esc(item.name)}</span></div>
        </div>
        <div class="actions rest-actions">
          <button class="btn-ghost" data-action="rest-sub">−15s</button>
          <button class="btn-primary" data-action="rest-skip" style="background:${run.color}">Skip rest</button>
          <button class="btn-ghost" data-action="rest-add">+15s</button>
        </div>`;
    } else if (item.type === 'cardio' && run.mode === 'cardioReady') {
      body = `
        <div class="focus">
          <div class="section-pill cardio">🏃 Cardio</div>
          <h1 class="ex-name">${item.minutes}-minute finish</h1>
          <div class="cue">${esc(item.note)}</div>
        </div>
        <div class="actions">
          <button class="btn-primary big" data-action="cardio-start" style="background:${run.color}">Start cardio ▶</button>
          <button class="btn-text" data-action="finish-skip">Finish without timer →</button>
        </div>
        ${navRow()}`;
    } else if (item.type === 'cardio' && run.mode === 'cardioRun') {
      const left = timerLeft();
      body = `
        <div class="focus rest">
          <div class="rest-label">🏃 CARDIO</div>
          ${ringHTML(left, run.timerTotal, run.color)}
          <div class="next-line muted">${esc(item.note)}</div>
        </div>
        <div class="actions">
          <button class="btn-primary big" data-action="cardio-done" style="background:${run.color}">Done ✓</button>
        </div>`;
    } else if (run.mode === 'done') {
      const dayObj = Store.getProgram().cycles[run.cycle].days[run.day];
      const rows = dayObj.exercises
        .map((e) => {
          const w = run.weights[exKey(e.name)];
          return `<li><span>${esc(e.name)}</span><b>${w ? esc(w) + ' kg' : '—'}</b></li>`;
        })
        .join('');
      body = `
        <div class="focus done">
          <div class="big-emoji">🎉</div>
          <h1>${esc(run.dayName)} complete!</h1>
          <p class="muted">${esc(run.cycleName)} · Day ${run.day + 1}</p>
          <ul class="summary">${rows}</ul>
        </div>
        <div class="actions">
          <button class="btn-primary big" data-action="finish-save" style="background:${run.color}">Save &amp; finish</button>
        </div>`;
    }

    setHTML(`<div class="runner">${runHeader()}${body}</div>`);

    // paint the timer immediately so there's no flash of the full value
    if (run.mode === 'rest' || run.mode === 'cardioRun') {
      updateTimerDisplay(timerLeft(), run.timerTotal);
    }
  }

  /* =====================================================================
     PROGRESS
     ===================================================================== */
  function renderProgress() {
    const history = Store.getHistory();

    let histHTML;
    if (!history.length) {
      histHTML = `<div class="empty">No completed days yet.<br>Finish a workout and it'll show up here.</div>`;
    } else {
      histHTML = history
        .map((h) => {
          const date = new Date(h.ts);
          const when = date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }) + ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          const rows = h.exercises
            .map(
              (e) =>
                `<li><span>${esc(e.name)}</span><b>${e.weight ? esc(e.weight) + ' kg' : '—'}</b></li>`
            )
            .join('');
          return `
            <div class="hist-card" style="--c:${esc(h.cycleColor || '#4ea1ff')}">
              <div class="hist-head">
                <div class="hist-title">${esc(h.dayEmoji || '')} ${esc(h.dayName)} <span class="muted">· ${esc(h.cycleName)}</span></div>
                <div class="hist-when">${esc(when)}</div>
              </div>
              <ul class="summary">${rows}</ul>
            </div>`;
        })
        .join('');
    }

    setHTML(`
      <div class="screen">
        <div class="screen-head">
          <h1>Progress</h1>
          <div class="sub">${history.length} completed ${history.length === 1 ? 'day' : 'days'}</div>
        </div>
        <div class="tip">💡 <b>Progression:</b> add weight once you hit the top of the rep range cleanly on every set.</div>
        ${histHTML}
        ${history.length ? `<button class="btn-ghost danger wide" data-action="clear-history">Clear history</button>` : ''}
      </div>
    `);
  }

  /* =====================================================================
     EDIT
     ===================================================================== */
  function renderEdit() {
    const prog = Store.getProgram();
    const c = editSel.cycle;
    const d = editSel.day;
    const dayObj = prog.cycles[c].days[d];
    const pointer = Store.getPointer();
    const isCurrent = pointer.cycle === c && pointer.day === d;
    const len = dayObj.exercises.length;

    const cycleChips = prog.cycles
      .map(
        (cc, i) =>
          `<button class="cyc-chip ${i === c ? 'active' : ''}" data-action="edit-pick-cycle" data-cycle="${i}" style="--c:${cc.color}">${esc(cc.name)}</button>`
      )
      .join('');

    const dayChips = prog.cycles[c].days
      .map(
        (dd, i) =>
          `<button class="day-chip ${i === d ? 'active' : ''}" data-action="edit-pick-day" data-day="${i}" style="--c:${prog.cycles[c].color}">${esc(dd.emoji)} ${esc(dd.name)}</button>`
      )
      .join('');

    const exHTML = dayObj.exercises
      .map(
        (e, i) => `
        <div class="edit-ex">
          <div class="edit-ex-top">
            <input class="ed-section" data-edit="section" data-i="${i}" value="${esc(e.section)}" placeholder="Muscle / section" />
            <div class="edit-ex-tools">
              <button class="icon-btn" data-action="ex-up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
              <button class="icon-btn" data-action="ex-down" data-i="${i}" ${i === len - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
              <button class="icon-btn danger" data-action="ex-del" data-i="${i}" aria-label="Delete">🗑</button>
            </div>
          </div>
          <input class="ed-name" data-edit="name" data-i="${i}" value="${esc(e.name)}" placeholder="Exercise name" />
          <div class="edit-ex-grid">
            <label>Sets<input type="number" min="1" inputmode="numeric" data-edit="sets" data-i="${i}" value="${esc(e.sets)}" /></label>
            <label>Reps<input data-edit="reps" data-i="${i}" value="${esc(e.reps)}" /></label>
            <label>Rest<input data-edit="rest" data-i="${i}" value="${esc(restLabel(e.rest))}" /></label>
          </div>
          <textarea class="ed-cue" data-edit="cue" data-i="${i}" rows="2" placeholder="Coaching cue">${esc(e.cue)}</textarea>
        </div>`
      )
      .join('');

    setHTML(`
      <div class="screen">
        <div class="screen-head">
          <h1>Edit program</h1>
          <div class="sub">Tweak exercises, sets, reps, rest &amp; cues</div>
        </div>

        <div class="cyc-chips">${cycleChips}</div>
        <div class="day-chips">${dayChips}</div>

        <div class="current-row">
          ${
            isCurrent
              ? `<span class="current-flag">★ This is the current day</span>`
              : `<button class="btn-ghost" data-action="set-current">Set as current day</button>`
          }
        </div>

        <div class="edit-day-head">
          <input class="ed-dayname" data-dayedit="name" value="${esc(dayObj.name)}" placeholder="Day name" />
          <input class="ed-dayfocus" data-dayedit="focus" value="${esc(dayObj.focus)}" placeholder="Focus" />
        </div>

        ${exHTML}

        <button class="btn-ghost wide" data-action="ex-add">+ Add exercise</button>

        <div class="cardio-note">🏃 Every day ends with a fixed ${CARDIO.minutes}-min cardio block (not editable).</div>

        <div class="edit-footer">
          ${Store.isCustomProgram() ? `<button class="btn-ghost danger" data-action="reset-program">Reset to original program</button>` : ''}
          <button class="btn-ghost danger" data-action="factory-reset">Erase all data (factory reset)</button>
          <div class="version">v${esc(APP_VERSION)}${Store.isCustomProgram() ? ' · edited' : ''}</div>
        </div>
      </div>
    `);
  }

  /* =====================================================================
     EVENT DELEGATION
     ===================================================================== */
  function onClick(e) {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;

    switch (a) {
      /* --- live home --- */
      case 'pick-cycle':
        liveSelCycle = +t.dataset.cycle;
        render();
        break;
      case 'start-run':
        startRun(+t.dataset.cycle, +t.dataset.day);
        break;

      /* --- runner --- */
      case 'begin':
        ensureAudio();
        run.mode = 'set';
        run.setIndex = 0;
        render();
        break;
      case 'set-done': {
        ensureAudio();
        const item = run.items[run.i];
        if (run.setIndex < item.sets - 1) {
          run.mode = 'rest';
          startTimer(item.rest, () => {
            alarm();
            run.setIndex += 1;
            run.mode = 'set';
            render();
          });
          render();
        } else {
          gotoItem(run.i + 1); // last set -> next exercise's "Begin"
        }
        break;
      }
      case 'rest-skip':
        stopTimer();
        run.setIndex += 1;
        run.mode = 'set';
        render();
        break;
      case 'rest-add':
        if (run.timerEndsAt) {
          run.timerEndsAt += 15000;
          run.timerTotal += 15;
          updateTimerDisplay(timerLeft(), run.timerTotal);
        }
        break;
      case 'rest-sub':
        if (run.timerEndsAt) {
          if (run.timerEndsAt - 15000 <= Date.now() + 800) {
            stopTimer();
            run.setIndex += 1;
            run.mode = 'set';
            render();
          } else {
            run.timerEndsAt -= 15000;
            run.timerTotal = Math.max(1, run.timerTotal - 15);
            updateTimerDisplay(timerLeft(), run.timerTotal);
          }
        }
        break;
      case 'cardio-start': {
        ensureAudio();
        const item = run.items[run.i];
        run.mode = 'cardioRun';
        startTimer(item.minutes * 60, () => {
          alarm();
          run.mode = 'done';
          render();
        });
        render();
        break;
      }
      case 'cardio-done':
        stopTimer();
        run.mode = 'done';
        render();
        break;
      case 'finish-skip':
        run.mode = 'done';
        render();
        break;
      case 'finish-save': {
        const rec = Store.completeDay(run.cycle, run.day, run.weights);
        const next = Store.getPointer();
        const nd = Store.getProgram().cycles[next.cycle].days[next.day];
        endRun();
        currentTab = 'live';
        liveSelCycle = null;
        updateTabBar();
        render();
        toast(`Saved! Next up: ${nd.emoji} ${nd.name}`);
        break;
      }
      case 'prev-item':
        gotoItem(run.i - 1);
        break;
      case 'next-item':
        gotoItem(run.i + 1);
        break;
      case 'exit-run':
        if (confirm("Exit workout? Logged weights are kept, but this day won't be marked complete.")) {
          endRun();
          currentTab = 'live';
          render();
        }
        break;
      case 'copy-last': {
        const k = t.dataset.k;
        const name = t.dataset.name;
        const last = run.prevWeights[k];
        if (last != null) {
          run.weights[k] = last;
          Store.recordWeight(name, last);
          render();
        }
        break;
      }

      /* --- edit --- */
      case 'edit-pick-cycle':
        editSel = { cycle: +t.dataset.cycle, day: 0 };
        renderEdit();
        break;
      case 'edit-pick-day':
        editSel = { cycle: editSel.cycle, day: +t.dataset.day };
        renderEdit();
        break;
      case 'set-current':
        Store.setPointer(editSel.cycle, editSel.day);
        toast('Set as current day');
        renderEdit();
        break;
      case 'ex-add': {
        const prog = Store.editableProgram();
        const exs = prog.cycles[editSel.cycle].days[editSel.day].exercises;
        const lastSection = exs.length ? exs[exs.length - 1].section : 'Section';
        exs.push({ section: lastSection, name: 'New exercise', sets: 3, reps: '10-12', rest: 60, cue: '' });
        Store.commit();
        renderEdit();
        break;
      }
      case 'ex-del': {
        const i = +t.dataset.i;
        const prog = Store.editableProgram();
        const exs = prog.cycles[editSel.cycle].days[editSel.day].exercises;
        if (exs.length <= 1) {
          toast('A day needs at least one exercise');
          break;
        }
        if (confirm(`Delete "${exs[i].name}"?`)) {
          exs.splice(i, 1);
          Store.commit();
          renderEdit();
        }
        break;
      }
      case 'ex-up':
      case 'ex-down': {
        const i = +t.dataset.i;
        const j = a === 'ex-up' ? i - 1 : i + 1;
        const prog = Store.editableProgram();
        const exs = prog.cycles[editSel.cycle].days[editSel.day].exercises;
        if (j < 0 || j >= exs.length) break;
        const tmp = exs[i];
        exs[i] = exs[j];
        exs[j] = tmp;
        Store.commit();
        renderEdit();
        break;
      }
      case 'reset-program':
        if (confirm('Reset all exercises back to the original program? Your weights & history are kept.')) {
          Store.resetProgram();
          renderEdit();
        }
        break;
      case 'factory-reset':
        if (confirm('Erase EVERYTHING — program edits, weights, and history? This cannot be undone.')) {
          Store.resetAll();
          editSel = Store.getPointer();
          currentTab = 'live';
          updateTabBar();
          render();
          toast('All data erased');
        }
        break;

      /* --- progress --- */
      case 'clear-history':
        if (confirm('Clear all completed-day history? (Last-used weights are kept.)')) {
          Store.clearHistory();
          renderProgress();
        }
        break;
    }
  }

  function onInput(e) {
    // weight field (live workout)
    const w = e.target.closest('.weight-input');
    if (w) {
      if (run) {
        run.weights[w.dataset.k] = w.value;
        Store.recordWeight(w.dataset.name, w.value);
      }
      return;
    }
    // per-exercise edit field
    const ed = e.target.closest('[data-edit]');
    if (ed) {
      const field = ed.dataset.edit;
      const i = +ed.dataset.i;
      const prog = Store.editableProgram();
      const exObj = prog.cycles[editSel.cycle].days[editSel.day].exercises[i];
      if (!exObj) return;
      let v = ed.value;
      if (field === 'sets') v = Math.max(1, parseInt(v, 10) || 1);
      else if (field === 'rest') v = parseRest(v);
      exObj[field] = v;
      Store.commit();
      return;
    }
    // day-level edit (name / focus)
    const de = e.target.closest('[data-dayedit]');
    if (de) {
      const prog = Store.editableProgram();
      prog.cycles[editSel.cycle].days[editSel.day][de.dataset.dayedit] = de.value;
      Store.commit();
      return;
    }
  }

  /* =====================================================================
     TOAST
     ===================================================================== */
  let toastTimer = null;
  function toast(msg) {
    let el = $('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
  }

  /* =====================================================================
     SERVICE WORKER
     ===================================================================== */
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) =>
          console.warn('SW registration failed', err)
        );
      });
    }
  }

  /* =====================================================================
     DISABLE ZOOM — block iOS Safari pinch-zoom (gesture* events) and any
     multi-touch pinch. Double-tap zoom is handled by touch-action in CSS;
     the viewport meta covers the installed PWA.
     ===================================================================== */
  function disableZoom() {
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) => {
      document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
    });
    document.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches && e.touches.length > 1) e.preventDefault();
      },
      { passive: false }
    );
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  function init() {
    view = $('view');
    disableZoom();
    view.addEventListener('click', onClick);
    view.addEventListener('input', onInput);
    document.querySelectorAll('.tab').forEach((b) =>
      b.addEventListener('click', () => setTab(b.dataset.tab))
    );
    editSel = Store.getPointer();
    registerSW();
    updateTabBar();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
