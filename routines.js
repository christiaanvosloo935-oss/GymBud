'use strict';

/* =========================================================
   Custom workouts: pick specific exercises from any muscle
   groups (e.g. "Push day"), then run them one after another.
   ========================================================= */

let pickerOpen = false;

const routineExercises = (r) => r.exerciseIds.map(getExercise).filter(Boolean);

function routineGroupNames(r) {
  const names = [];
  for (const ex of routineExercises(r)) {
    const g = getGroup(ex.groupId);
    if (g && !names.includes(g.name)) names.push(g.name);
  }
  return names;
}

function routineSub(r) {
  const n = routineExercises(r).length;
  const groups = routineGroupNames(r);
  return `${n} exercise${n === 1 ? '' : 's'}${groups.length ? ` · ${groups.join(', ')}` : ''}`;
}

/** Card(s) shown at the top of the Workouts home screen. */
function routinesHomeHtml() {
  if (!state.routines.length) {
    return `<a class="card promo" href="#/routines">
      <b>Custom workouts</b>
      <span class="muted small">Build a “Push day” or “Leg day” from any muscle groups and pick the exact movements. Then run it exercise by exercise.</span>
    </a>`;
  }
  const rows = state.routines.slice(0, 4).map((r) => `
    <a class="list-item" href="#/w/${r.id}">
      <div class="list-main">
        <div class="list-title">${esc(r.name)}</div>
        <div class="list-sub">${esc(routineSub(r))}</div>
      </div>
      <span class="start-pill">Start</span>
    </a>`).join('');
  return `<div class="section-title" style="margin-top:0">My workouts</div>
    <div class="list" style="margin-bottom:6px">${rows}</div>
    <div class="toolbar" style="margin:0 0 14px"><a class="link-btn" href="#/routines">Manage workouts</a></div>`;
}

/* ---------------- list ---------------- */

function renderRoutines() {
  setTitle('My workouts');
  const rows = state.routines.map((r) => `
    <div class="list-item routine-row">
      <a class="list-main routine-link" href="#/w/${r.id}">
        <div class="list-title">${esc(r.name)}</div>
        <div class="list-sub">${esc(routineSub(r))}</div>
      </a>
      <div class="edit-actions">
        <a class="mini-btn" href="#/routine/${r.id}">Edit</a>
        <a class="mini-btn start" href="#/w/${r.id}">Start</a>
      </div>
    </div>`).join('');

  view.innerHTML = `
    <div class="list">${rows || '<div class="empty">No custom workouts yet.<br>Create one, e.g. “Push day” with bench press, overhead press and tricep pushdowns.</div>'}</div>
    <button class="btn btn-primary btn-block" style="margin-top:14px" data-action="r-new">+ New workout</button>
  `;
}

/* ---------------- editor ---------------- */

function renderRoutineEditor(id) {
  const r = getRoutine(id);
  setTitle('Edit workout');
  const exs = routineExercises(r);

  const rows = exs.map((ex, i) => {
    const g = getGroup(ex.groupId);
    return `<div class="list-item">
      <div class="list-main">
        <div class="list-title">${esc(ex.name)}</div>
        <div class="list-sub">${esc(g ? g.name : '')}</div>
      </div>
      <div class="edit-actions">
        <button class="mini-btn" data-action="r-move" data-id="${ex.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="mini-btn" data-action="r-move" data-id="${ex.id}" data-dir="1" ${i === exs.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        <button class="mini-btn danger" data-action="r-remove" data-id="${ex.id}" aria-label="Remove">✕</button>
      </div>
    </div>`;
  }).join('');

  const picker = pickerOpen ? `
    <div class="section-title">Pick exercises</div>
    ${state.groups.map((g) => {
      const list = exercisesOf(g.id);
      if (!list.length) return '';
      return `<div class="picker-group">
        <div class="picker-title">${esc(g.name)}</div>
        <div class="pick-grid">${list.map((ex) => `
          <button class="pick-item" data-action="r-toggle" data-id="${ex.id}" aria-pressed="${r.exerciseIds.includes(ex.id)}">${esc(ex.name)}</button>`).join('')}
        </div>
      </div>`;
    }).join('')}
    <button class="btn btn-primary btn-block" style="margin-top:6px" data-action="r-picker-done">Done</button>
  ` : '';

  view.innerHTML = `
    <div class="card">
      <label class="field-label" for="routine-name">Workout name</label>
      <input class="text-input" id="routine-name" value="${esc(r.name)}" maxlength="40" autocomplete="off">
    </div>
    <div class="section-title" style="margin-top:6px">Exercises (${exs.length})</div>
    <div class="list">${rows || '<div class="empty">No exercises yet.</div>'}</div>
    ${pickerOpen ? '' : '<button class="btn btn-block" style="margin-top:12px" data-action="r-picker-open">+ Add exercises</button>'}
    ${picker}
    <div class="btn-row" style="margin-top:22px">
      <a class="btn btn-primary" href="#/w/${r.id}" style="text-align:center;line-height:48px;padding:0 18px">Start workout</a>
      <button class="btn btn-danger" data-action="r-delete" data-id="${r.id}">Delete</button>
    </div>
  `;
}

/* ---------------- run ---------------- */

function renderWorkoutRun(id) {
  const r = getRoutine(id);
  setTitle(r.name);
  const exs = routineExercises(r);
  const today = dateKey();

  let doneCount = 0;
  let setsToday = 0;
  let volume = 0;
  const rows = exs.map((ex) => {
    const sets = todaySessionSets(ex.id);
    if (sets.length) doneCount++;
    setsToday += sets.length;
    volume += sets.reduce((a, s) => a + s.reps * s.weight, 0);
    const prev = sessionsOf(ex.id).filter((s) => s.date < today).pop();
    let sub = 'Not logged yet';
    if (prev) {
      const top = prev.sets.reduce((a, b) => (b.weight > a.weight ? b : a));
      sub = `Last: ${fmtSet(top)} · ${fmtAgo(prev.date)}`;
    }
    const g = getGroup(ex.groupId);
    return `<a class="list-item" href="#/e/${ex.id}/${r.id}">
      <div class="done-dot${sets.length ? ' on' : ''}" aria-hidden="true">${sets.length ? '✓' : ''}</div>
      <div class="list-main">
        <div class="list-title">${esc(ex.name)}</div>
        <div class="list-sub">${esc(g ? g.name : '')} · ${sets.length ? `${sets.length} set${sets.length === 1 ? '' : 's'} today` : esc(sub)}</div>
      </div>
      ${CHEVRON}
    </a>`;
  }).join('');

  view.innerHTML = `
    <div class="stats" style="margin-bottom:14px">
      <div class="stat"><div class="stat-label">Exercises</div><div class="stat-value">${doneCount}/${exs.length}</div><div class="stat-sub">done today</div></div>
      <div class="stat"><div class="stat-label">Sets</div><div class="stat-value">${setsToday}</div><div class="stat-sub">logged today</div></div>
      <div class="stat"><div class="stat-label">Volume</div><div class="stat-value">${fmtNum(Math.round(volume))}</div><div class="stat-sub">kg</div></div>
    </div>
    <div class="list">${rows || '<div class="empty">This workout has no exercises yet.</div>'}</div>
    <div class="toolbar" style="margin:10px 0 0"><a class="link-btn" href="#/routine/${r.id}">Edit workout</a></div>
  `;
}

/** Banner above and “next” button below an exercise opened from a workout. */
function routineNavHtml(exerciseId, routineId) {
  const r = getRoutine(routineId);
  const exs = routineExercises(r);
  const i = exs.findIndex((e) => e.id === exerciseId);
  const next = i >= 0 ? exs[i + 1] : null;
  const top = `<a class="routine-bar" href="#/w/${r.id}"><span>${esc(r.name)}</span><span>${i >= 0 ? `${i + 1} of ${exs.length}` : ''} · all exercises</span></a>`;
  const bottom = next
    ? `<a class="btn btn-block next-btn" href="#/e/${next.id}/${r.id}">Next: ${esc(next.name)} →</a>`
    : `<a class="btn btn-block next-btn finish" href="#/w/${r.id}">Finish workout ✓</a>`;
  return { top, bottom };
}

/* ---------------- actions ---------------- */

view.addEventListener('click', (evt) => {
  const el = evt.target.closest('[data-action]');
  if (!el || !el.dataset.action.startsWith('r-')) return;
  const { action, id } = el.dataset;
  const editId = currentRouteId();
  const r = getRoutine(editId);

  switch (action) {
    case 'r-new': {
      const name = prompt('Name your workout', 'Push day');
      if (!name || !name.trim()) break;
      const routine = { id: uid(), name: name.trim().slice(0, 40), exerciseIds: [] };
      state.routines.push(routine);
      save();
      pickerOpen = true;
      go(`#/routine/${routine.id}`);
      break;
    }
    case 'r-picker-open': pickerOpen = true; renderRoutineEditor(editId); break;
    case 'r-picker-done': pickerOpen = false; renderRoutineEditor(editId); window.scrollTo(0, 0); break;
    case 'r-toggle':
      if (!r) break;
      r.exerciseIds = r.exerciseIds.includes(id) ? r.exerciseIds.filter((x) => x !== id) : [...r.exerciseIds, id];
      save();
      el.setAttribute('aria-pressed', String(r.exerciseIds.includes(id)));
      view.querySelector('.section-title').textContent = `Exercises (${routineExercises(r).length})`;
      break;
    case 'r-remove':
      if (!r) break;
      r.exerciseIds = r.exerciseIds.filter((x) => x !== id);
      save(); renderRoutineEditor(editId);
      break;
    case 'r-move': {
      if (!r) break;
      const i = r.exerciseIds.indexOf(id);
      const j = i + Number(el.dataset.dir);
      if (i < 0 || j < 0 || j >= r.exerciseIds.length) break;
      [r.exerciseIds[i], r.exerciseIds[j]] = [r.exerciseIds[j], r.exerciseIds[i]];
      save(); renderRoutineEditor(editId);
      break;
    }
    case 'r-delete':
      if (!r || !confirm(`Delete the workout “${r.name}”? Your logged sets are kept.`)) break;
      state.routines = state.routines.filter((x) => x.id !== r.id);
      save(); toast('Workout deleted'); go('#/routines');
      break;
  }
});

view.addEventListener('change', (evt) => {
  if (evt.target.id !== 'routine-name') return;
  const r = getRoutine(currentRouteId());
  const name = evt.target.value.trim();
  if (!r) return;
  if (!name) { evt.target.value = r.name; return; }
  r.name = name.slice(0, 40);
  save();
});
