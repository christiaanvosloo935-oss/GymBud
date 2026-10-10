'use strict';

/* =========================================================
   GymBud – log sets, reps and weight per muscle group.
   All data lives in localStorage on the device.
   ========================================================= */

const STORAGE_KEY = 'gymbud-v1';

const STARTER = [
  ['chest', 'Chest', ['Bench Press', 'Incline Dumbbell Press', 'Chest Fly', 'Push-Up']],
  ['back', 'Back', ['Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Pull-Up', 'Deadlift']],
  ['shoulders', 'Shoulders', ['Overhead Press', 'Lateral Raise', 'Rear Delt Fly']],
  ['biceps', 'Biceps', ['Barbell Curl', 'Dumbbell Curl', 'Hammer Curl']],
  ['triceps', 'Triceps', ['Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension', 'Dips']],
  ['forearms', 'Forearms', ['Wrist Curl', 'Reverse Wrist Curl', "Farmer's Carry"]],
  ['quads', 'Quads', ['Squat', 'Leg Press', 'Leg Extension']],
  ['hamstrings', 'Hamstrings', ['Romanian Deadlift', 'Lying Leg Curl', 'Seated Leg Curl']],
  ['glutes', 'Glutes', ['Hip Thrust', 'Bulgarian Split Squat', 'Glute Kickback']],
  ['calves', 'Calves', ['Standing Calf Raise', 'Seated Calf Raise']],
  ['core', 'Core / Abs', ['Cable Crunch', 'Hanging Leg Raise', 'Russian Twist', 'Back Extension']],
];

// Muscle-group images. Groups without one show their initials.
const GROUP_IMAGES = {
  chest: 'img/muscles/chest.jpg',
  back: 'img/muscles/back.jpg',
  shoulders: 'img/muscles/shoulders.jpg',
  biceps: 'img/muscles/biceps.jpg',
  triceps: 'img/muscles/triceps.jpg',
  quads: 'img/muscles/quads.jpg',
  hamstrings: 'img/muscles/hamstrings.jpg',
  calves: 'img/muscles/calves.jpg',
  core: 'img/muscles/core.jpg',
  forearms: 'img/muscles/forearms.jpg',
  glutes: 'img/muscles/glutes.jpg',
};

const DEFAULT_SETTINGS = { restSeconds: 90, autoTimer: true, weightStep: 2.5 };

/* ---------------- state & storage ---------------- */

let state = load();

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function seedState() {
  const groups = [];
  const exercises = [];
  for (const [id, name, list] of STARTER) {
    groups.push({ id, name });
    for (const ex of list) exercises.push({ id: uid(), groupId: id, name: ex });
  }
  return { version: 1, groups, exercises, sessions: [], settings: { ...DEFAULT_SETTINGS } };
}

function isValidState(s) {
  return s && Array.isArray(s.groups) && Array.isArray(s.exercises) && Array.isArray(s.sessions);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (isValidState(s)) {
        s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
        return s;
      }
    }
  } catch (e) { /* fall through to a fresh state */ }
  return seedState();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('Could not save – storage full or blocked');
  }
}

/* ---------------- helpers ---------------- */

const $ = (sel) => document.querySelector(sel);
const view = $('#view');

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysAgo(key) {
  return Math.round((parseKey(dateKey()) - parseKey(key)) / 86400000);
}

function fmtDate(key, { relative = true } = {}) {
  const n = daysAgo(key);
  if (relative && n === 0) return 'Today';
  if (relative && n === 1) return 'Yesterday';
  const d = parseKey(key);
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}

function fmtAgo(key) {
  const n = daysAgo(key);
  if (n === 0) return 'today';
  if (n === 1) return 'yesterday';
  if (n < 7) return `${n} days ago`;
  if (n < 14) return '1 week ago';
  if (n < 60) return `${Math.floor(n / 7)} weeks ago`;
  return `${Math.floor(n / 30)} months ago`;
}

function fmtNum(n) {
  return String(Math.round(n * 100) / 100);
}

function fmtKg(w) {
  return w > 0 ? `${fmtNum(w)} kg` : 'BW';
}

function fmtSet(s) {
  return s.weight > 0 ? `${s.reps} × ${fmtNum(s.weight)} kg` : `${s.reps} reps · BW`;
}

function initials(name) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
}

function e1rm(s) {
  if (!(s.weight > 0)) return 0;
  return s.reps <= 1 ? s.weight : s.weight * (1 + s.reps / 30);
}

function groupBadge(g) {
  const src = GROUP_IMAGES[g.id];
  return src
    ? `<div class="group-badge has-img"><img src="${src}" alt="" loading="lazy"></div>`
    : `<div class="group-badge">${esc(initials(g.name))}</div>`;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------- queries ---------------- */

const getGroup = (id) => state.groups.find((g) => g.id === id);
const getExercise = (id) => state.exercises.find((e) => e.id === id);
const exercisesOf = (groupId) => state.exercises.filter((e) => e.groupId === groupId);

function sessionsOf(exerciseId) {
  return state.sessions
    .filter((s) => s.exerciseId === exerciseId && s.sets.length)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function lastDateOfExercise(exerciseId) {
  const list = sessionsOf(exerciseId);
  return list.length ? list[list.length - 1].date : null;
}

function lastDateOfGroup(groupId) {
  let best = null;
  for (const ex of exercisesOf(groupId)) {
    const d = lastDateOfExercise(ex.id);
    if (d && (!best || d > best)) best = d;
  }
  return best;
}

/** The top set of each session that beat the heaviest weight from all earlier sessions. */
function prSetIds(exerciseId) {
  const ids = new Set();
  let max = null;
  for (const sess of sessionsOf(exerciseId)) {
    const top = sess.sets.reduce((a, b) => (b.weight > a.weight ? b : a));
    if (max !== null && top.weight > max) ids.add(top.id);
    max = max === null ? top.weight : Math.max(max, top.weight);
  }
  return ids;
}

/* ---------------- router ---------------- */

function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, id] = hash.split('/');
  const back = $('#back-btn');
  const settingsBtn = $('#settings-btn');
  back.hidden = !page;
  if (page !== 'g') editingGroup = false;
  if (page) editingHome = false;
  settingsBtn.hidden = page === 'settings';

  if (page === 'g' && getGroup(id)) renderGroup(id);
  else if (page === 'e' && getExercise(id)) renderExercise(id);
  else if (page === 'settings') renderSettings();
  else renderHome();
  window.scrollTo(0, 0);
}

function go(hash) {
  location.hash = hash;
}

$('#back-btn').addEventListener('click', () => {
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, id] = hash.split('/');
  if (page === 'e') {
    const ex = getExercise(id);
    go(ex ? `#/g/${ex.groupId}` : '#/');
  } else {
    go('#/');
  }
});
$('#settings-btn').addEventListener('click', () => go('#/settings'));
window.addEventListener('hashchange', route);

function setTitle(t) {
  $('#title').textContent = t;
  document.title = t === 'GymBud' ? 'GymBud' : `${t} · GymBud`;
}

const CHEVRON = '<svg class="chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------------- home: muscle groups ---------------- */

let editingHome = false;

function renderHome() {
  setTitle('GymBud');
  const today = dateKey();
  const todaySets = state.sessions.filter((s) => s.date === today).reduce((n, s) => n + s.sets.length, 0);

  const items = state.groups.map((g, i) => {
    const count = exercisesOf(g.id).length;
    const last = lastDateOfGroup(g.id);
    const sub = `${count} exercise${count === 1 ? '' : 's'}${last ? ` · trained ${fmtAgo(last)}` : ''}`;
    if (editingHome) {
      return `<div class="list-item">
        ${groupBadge(g)}
        <div class="list-main"><div class="list-title">${esc(g.name)}</div></div>
        <div class="edit-actions">
          <button class="mini-btn" data-action="move-group" data-id="${g.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
          <button class="mini-btn" data-action="move-group" data-id="${g.id}" data-dir="1" ${i === state.groups.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
          <button class="mini-btn" data-action="rename-group" data-id="${g.id}">Rename</button>
          <button class="mini-btn danger" data-action="delete-group" data-id="${g.id}" aria-label="Delete">✕</button>
        </div>
      </div>`;
    }
    return `<button class="list-item" data-action="open-group" data-id="${g.id}">
      ${groupBadge(g)}
      <div class="list-main">
        <div class="list-title">${esc(g.name)}</div>
        <div class="list-sub">${esc(sub)}</div>
      </div>
      ${CHEVRON}
    </button>`;
  }).join('');

  view.innerHTML = `
    ${todaySets ? `<div class="card small"><b>Today:</b> ${todaySets} set${todaySets === 1 ? '' : 's'} logged. Keep going 💪</div>` : ''}
    <div class="toolbar"><button class="link-btn" data-action="toggle-edit-home">${editingHome ? 'Done' : 'Edit groups'}</button></div>
    <div class="list">${items || '<div class="empty">No muscle groups yet.</div>'}</div>
    ${editingHome ? `
      <form class="add-row" data-form="add-group">
        <input class="text-input" name="name" placeholder="New muscle group" maxlength="40" autocomplete="off" required>
        <button class="btn btn-primary" type="submit">Add</button>
      </form>` : ''}
  `;
}

/* ---------------- group: exercises ---------------- */

let editingGroup = false;

function renderGroup(groupId) {
  const g = getGroup(groupId);
  setTitle(g.name);
  const list = exercisesOf(groupId);

  const items = list.map((ex) => {
    const sessions = sessionsOf(ex.id);
    const last = sessions[sessions.length - 1];
    let sub = 'Not logged yet';
    if (last) {
      const top = last.sets.reduce((a, b) => (b.weight > a.weight ? b : a));
      sub = `${fmtAgo(last.date)[0].toUpperCase() + fmtAgo(last.date).slice(1)} · top set ${fmtSet(top)}`;
    }
    if (editingGroup) {
      return `<div class="list-item">
        <div class="list-main"><div class="list-title">${esc(ex.name)}</div></div>
        <div class="edit-actions">
          <button class="mini-btn" data-action="rename-exercise" data-id="${ex.id}">Rename</button>
          <button class="mini-btn danger" data-action="delete-exercise" data-id="${ex.id}" aria-label="Delete">✕</button>
        </div>
      </div>`;
    }
    return `<button class="list-item" data-action="open-exercise" data-id="${ex.id}">
      <div class="list-main">
        <div class="list-title">${esc(ex.name)}</div>
        <div class="list-sub">${esc(sub)}</div>
      </div>
      ${CHEVRON}
    </button>`;
  }).join('');

  view.innerHTML = `
    <div class="toolbar">${list.length ? `<button class="link-btn" data-action="toggle-edit-group">${editingGroup ? 'Done' : 'Edit'}</button>` : ''}</div>
    <div class="list">${items || '<div class="empty">No exercises yet. Add your first one below.</div>'}</div>
    <form class="add-row" data-form="add-exercise" data-group="${groupId}">
      <input class="text-input" name="name" placeholder="Add exercise, e.g. Cable Fly" maxlength="60" autocomplete="off" required>
      <button class="btn btn-primary" type="submit">Add</button>
    </form>
  `;
}

/* ---------------- exercise: logger, stats, chart, history ---------------- */

let chartMetric = 'top';

function prefillFor(exerciseId) {
  const today = dateKey();
  const sessions = sessionsOf(exerciseId);
  const todaySess = sessions.find((s) => s.date === today);
  const prev = sessions.filter((s) => s.date < today).pop();
  const n = todaySess ? todaySess.sets.length : 0;

  if (prev && prev.sets[n]) return { reps: prev.sets[n].reps, weight: prev.sets[n].weight };
  if (todaySess && n) {
    const s = todaySess.sets[n - 1];
    return { reps: s.reps, weight: s.weight };
  }
  if (prev) return { reps: prev.sets[prev.sets.length - 1].reps, weight: prev.sets[prev.sets.length - 1].weight };
  return { reps: 10, weight: 20 };
}

function renderExercise(exerciseId) {
  const ex = getExercise(exerciseId);
  setTitle(ex.name);
  const today = dateKey();
  const sessions = sessionsOf(exerciseId);
  const todaySess = sessions.find((s) => s.date === today);
  const prev = sessions.filter((s) => s.date < today).pop();
  const prs = prSetIds(exerciseId);
  const fill = prefillFor(exerciseId);

  // ---- stats
  let best = null;
  let bestE = 0;
  let bestReps = 0;
  for (const sess of sessions) {
    for (const s of sess.sets) {
      if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) best = s;
      bestE = Math.max(bestE, e1rm(s));
      bestReps = Math.max(bestReps, s.reps);
    }
  }
  const bodyweight = sessions.length > 0 && !(best && best.weight > 0);

  const todaySets = todaySess ? todaySess.sets : [];
  const setsHtml = todaySets.map((s, i) => `
    <div class="set-row">
      <div class="set-num">${i + 1}</div>
      <div class="set-val">${esc(fmtSet(s))}${prs.has(s.id) ? '<span class="pr-tag">PR</span>' : ''}</div>
      <button class="set-del" data-action="delete-set" data-id="${s.id}" aria-label="Delete set ${i + 1}">×</button>
    </div>`).join('');

  const history = sessions.slice().reverse().filter((s) => s.date !== today);
  const historyHtml = history.map((sess) => {
    const vol = sess.sets.reduce((a, s) => a + s.reps * s.weight, 0);
    return `<div class="hist-item">
      <div class="hist-head">
        <span class="hist-date">${esc(fmtDate(sess.date))}</span>
        <span class="muted small">${sess.sets.length} set${sess.sets.length === 1 ? '' : 's'}${vol ? ` · ${fmtNum(vol)} kg vol` : ''}
          <button class="link-btn small" data-action="delete-session" data-id="${sess.id}" style="color:var(--danger);padding:4px 0 4px 8px">Delete</button>
        </span>
      </div>
      <div class="hist-sets">${sess.sets.map((s) => esc(fmtSet(s)) + (prs.has(s.id) ? ' <span class="pr-tag">PR</span>' : '')).join(', &nbsp;')}</div>
    </div>`;
  }).join('');

  if (bodyweight) chartMetric = 'reps';
  else if (chartMetric === 'reps') chartMetric = 'top';
  const metrics = bodyweight
    ? [['reps', 'Total reps']]
    : [['top', 'Top weight'], ['e1rm', 'Est. 1RM'], ['volume', 'Volume']];

  view.innerHTML = `
    <div class="card">
      ${prev ? `<div class="last-time">Last time (${esc(fmtDate(prev.date))}): <b>${prev.sets.map((s) => esc(fmtSet(s))).join(', ')}</b></div>` : '<div class="last-time">First time logging this exercise – set your starting numbers.</div>'}
      <div class="stepper-grid">
        <div>
          <div class="stepper-label">Reps</div>
          <div class="stepper">
            <button type="button" data-action="step" data-field="reps" data-delta="-1" aria-label="Fewer reps">−</button>
            <input id="in-reps" type="number" inputmode="numeric" min="1" step="1" value="${fill.reps}" aria-label="Reps">
            <button type="button" data-action="step" data-field="reps" data-delta="1" aria-label="More reps">+</button>
          </div>
        </div>
        <div>
          <div class="stepper-label">Weight (kg)</div>
          <div class="stepper">
            <button type="button" data-action="step" data-field="weight" data-delta="-1" aria-label="Less weight">−</button>
            <input id="in-weight" type="number" inputmode="decimal" min="0" step="any" value="${fmtNum(fill.weight)}" aria-label="Weight in kg">
            <button type="button" data-action="step" data-field="weight" data-delta="1" aria-label="More weight">+</button>
          </div>
        </div>
      </div>
      <button class="btn btn-primary btn-block log-btn" data-action="log-set" data-id="${exerciseId}">Log set ${todaySets.length + 1}</button>
      ${todaySets.length ? `<div class="sets">${setsHtml}</div>` : ''}
    </div>

    ${sessions.length ? `
      <div class="section-title">Records</div>
      <div class="stats">
        ${bodyweight ? `
          <div class="stat"><div class="stat-label">Most reps</div><div class="stat-value">${bestReps}</div><div class="stat-sub">in one set</div></div>
        ` : `
          <div class="stat"><div class="stat-label">Heaviest</div><div class="stat-value">${esc(fmtKg(best.weight))}</div><div class="stat-sub">× ${best.reps} reps</div></div>
          <div class="stat"><div class="stat-label">Est. 1RM</div><div class="stat-value">${fmtNum(Math.round(bestE * 10) / 10)}</div><div class="stat-sub">kg</div></div>
        `}
        <div class="stat"><div class="stat-label">Sessions</div><div class="stat-value">${sessions.length}</div><div class="stat-sub">since ${esc(fmtDate(sessions[0].date, { relative: false }))}</div></div>
      </div>

      <div class="section-title">Progress</div>
      <div class="card">
        ${metrics.length > 1 ? `<div class="seg" role="group" aria-label="Chart metric">
          ${metrics.map(([k, label]) => `<button data-action="metric" data-metric="${k}" data-id="${exerciseId}" aria-pressed="${chartMetric === k}">${label}</button>`).join('')}
        </div>` : ''}
        <div class="chart-wrap" id="chart"></div>
      </div>
    ` : ''}

    ${history.length ? `
      <div class="section-title">History</div>
      <div class="list">${historyHtml}</div>
    ` : ''}
  `;

  if (sessions.length) drawChart($('#chart'), sessions, chartMetric);
}

function metricValue(sess, metric) {
  switch (metric) {
    case 'e1rm': return Math.max(...sess.sets.map(e1rm));
    case 'volume': return sess.sets.reduce((a, s) => a + s.reps * s.weight, 0);
    case 'reps': return sess.sets.reduce((a, s) => a + s.reps, 0);
    default: return Math.max(...sess.sets.map((s) => s.weight));
  }
}

function metricLabel(v, metric) {
  if (metric === 'reps') return `${fmtNum(v)} reps`;
  return `${fmtNum(Math.round(v * 10) / 10)} kg`;
}

function niceStep(range, ticks) {
  const raw = range / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function drawChart(container, sessions, metric) {
  const W = 340;
  const H = 190;
  const pad = { l: 40, r: 14, t: 34, b: 26 };
  const pts = sessions.map((s) => ({ date: s.date, t: parseKey(s.date).getTime(), v: metricValue(s, metric) }));

  if (pts.length < 2) {
    container.innerHTML = `<div class="empty small">Log this exercise on another day to see your progress line.<br>Current: <b style="color:var(--ink)">${esc(metricLabel(pts[0].v, metric))}</b></div>`;
    return;
  }

  let lo = Math.min(...pts.map((p) => p.v));
  let hi = Math.max(...pts.map((p) => p.v));
  if (lo === hi) { lo -= 1; hi += 1; }
  const step = niceStep(hi - lo, 4);
  lo = Math.max(0, Math.floor(lo / step) * step);
  hi = Math.ceil(hi / step) * step;

  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const x = (t) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);

  let grid = '';
  for (let v = lo; v <= hi + step / 2; v += step) {
    const yy = y(v).toFixed(1);
    grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="var(--border)" stroke-width="1"/>`;
    grid += `<text x="${pad.l - 8}" y="${yy}" dy="4" text-anchor="end" font-size="11" fill="var(--ink-3)">${fmtNum(v)}</text>`;
  }

  const shortDate = (k) => parseKey(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const xLabels = `
    <text x="${pad.l}" y="${H - 6}" font-size="11" fill="var(--ink-3)">${esc(shortDate(pts[0].date))}</text>
    <text x="${W - pad.r}" y="${H - 6}" font-size="11" fill="var(--ink-3)" text-anchor="end">${esc(shortDate(pts[pts.length - 1].date))}</text>`;

  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const dots = pts.map((p) => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`).join('');

  // Direct label on the latest point only.
  const last = pts[pts.length - 1];
  const lastLabel = `<text x="${x(last.t).toFixed(1)}" y="${(y(last.v) - 12).toFixed(1)}" text-anchor="end" font-size="12" font-weight="700" fill="var(--ink)">${esc(metricLabel(last.v, metric))}</text>`;

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress chart">
      ${grid}${xLabels}
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}${lastLabel}
      <line id="cross" x1="0" x2="0" y1="${pad.t - 6}" y2="${H - pad.b}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/>
      <circle id="hover-dot" r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" id="hit"/>
    </svg>
    <div class="chart-tip" hidden></div>`;

  const svg = container.querySelector('svg');
  const tip = container.querySelector('.chart-tip');
  const cross = svg.querySelector('#cross');
  const hoverDot = svg.querySelector('#hover-dot');

  function show(evt) {
    const rect = svg.getBoundingClientRect();
    const sx = ((evt.clientX - rect.left) / rect.width) * W;
    let nearest = pts[0];
    for (const p of pts) if (Math.abs(x(p.t) - sx) < Math.abs(x(nearest.t) - sx)) nearest = p;
    const px = x(nearest.t);
    cross.setAttribute('x1', px);
    cross.setAttribute('x2', px);
    cross.setAttribute('visibility', 'visible');
    hoverDot.setAttribute('cx', px);
    hoverDot.setAttribute('cy', y(nearest.v));
    hoverDot.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${esc(metricLabel(nearest.v, metric))}</b><br>${esc(fmtDate(nearest.date, { relative: false }))}`;
    tip.hidden = false;
    const left = (px / W) * rect.width;
    const half = tip.offsetWidth / 2;
    tip.style.left = `${Math.min(Math.max(left, half), rect.width - half)}px`;
  }
  function hide() {
    cross.setAttribute('visibility', 'hidden');
    hoverDot.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  }
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
}

/* ---------------- settings ---------------- */

function renderSettings() {
  setTitle('Settings');
  const st = state.settings;
  const mins = Math.floor(st.restSeconds / 60);
  const secs = String(st.restSeconds % 60).padStart(2, '0');
  view.innerHTML = `
    <div class="section-title">Rest timer</div>
    <div class="card">
      <div class="setting-row">
        <div>Rest time</div>
        <div class="stepper">
          <button data-action="rest-step" data-delta="-15" aria-label="Less rest">−</button>
          <input type="text" readonly value="${mins}:${secs}" aria-label="Rest time">
          <button data-action="rest-step" data-delta="15" aria-label="More rest">+</button>
        </div>
      </div>
      <label class="setting-row" style="margin-top:14px">
        <span>Start timer automatically after each set</span>
        <input type="checkbox" data-action="toggle-auto" ${st.autoTimer ? 'checked' : ''} style="width:22px;height:22px">
      </label>
      <button class="btn btn-block" style="margin-top:14px" data-action="start-timer">Start rest timer now</button>
    </div>

    <div class="section-title">Weight</div>
    <div class="card">
      <div class="setting-row">
        <div>+/− step</div>
        <div class="seg" style="margin:0;width:180px">
          ${[1, 2.5, 5].map((v) => `<button data-action="weight-step" data-value="${v}" aria-pressed="${st.weightStep === v}">${v} kg</button>`).join('')}
        </div>
      </div>
    </div>

    <div class="section-title">Backup</div>
    <div class="card">
      <div class="btn-row">
        <button class="btn" data-action="export">Export data</button>
        <button class="btn" data-action="import">Import data</button>
      </div>
      <p class="help">Your workouts are stored only on this device. Export a backup now and then so you never lose your progress.</p>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
    </div>

    <div class="section-title">Danger zone</div>
    <div class="card">
      <button class="btn btn-block btn-danger" data-action="reset">Reset everything</button>
    </div>
    <p class="help" style="text-align:center">GymBud · ${state.sessions.reduce((n, s) => n + s.sets.length, 0)} sets logged</p>
  `;
}

/* ---------------- rest timer ---------------- */

const timer = { end: 0, interval: null, hideTimeout: null };
let audioCtx = null;

function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* audio not available */ }
}

function beep() {
  if (!audioCtx) return;
  try {
    [0, 0.25, 0.5].forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const t = audioCtx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch (e) { /* ignore */ }
}

function startTimer(seconds = state.settings.restSeconds) {
  unlockAudio();
  clearTimeout(timer.hideTimeout);
  timer.end = Date.now() + seconds * 1000;
  $('#timer').hidden = false;
  $('#timer').classList.remove('done');
  clearInterval(timer.interval);
  timer.interval = setInterval(tickTimer, 250);
  tickTimer();
}

function tickTimer() {
  const left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
  $('#timer-time').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  if (left <= 0) {
    clearInterval(timer.interval);
    timer.interval = null;
    $('#timer').classList.add('done');
    $('#timer-time').textContent = 'Go!';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    beep();
    timer.hideTimeout = setTimeout(stopTimer, 4000);
  }
}

function stopTimer() {
  clearInterval(timer.interval);
  clearTimeout(timer.hideTimeout);
  timer.interval = null;
  $('#timer').hidden = true;
}

$('#timer-skip').addEventListener('click', stopTimer);
document.querySelectorAll('.timer-adj').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!timer.interval) return;
    timer.end = Math.max(Date.now(), timer.end + Number(btn.dataset.adj) * 1000);
    tickTimer();
  });
});

/* ---------------- actions ---------------- */

function currentRouteId() {
  return location.hash.replace(/^#\/?/, '').split('/')[1];
}

function readNumber(input, { int = false, min = 0 } = {}) {
  let v = parseFloat(String(input.value).replace(',', '.'));
  if (!Number.isFinite(v)) v = min;
  if (int) v = Math.round(v);
  return Math.max(min, v);
}

function logSet(exerciseId) {
  const reps = readNumber($('#in-reps'), { int: true, min: 1 });
  const weight = Math.round(readNumber($('#in-weight')) * 100) / 100;
  const today = dateKey();

  let prevMax = null;
  for (const sess of sessionsOf(exerciseId)) for (const s of sess.sets) prevMax = prevMax === null ? s.weight : Math.max(prevMax, s.weight);

  let sess = state.sessions.find((s) => s.exerciseId === exerciseId && s.date === today);
  if (!sess) {
    sess = { id: uid(), exerciseId, date: today, sets: [] };
    state.sessions.push(sess);
  }
  sess.sets.push({ id: uid(), reps, weight, at: Date.now() });
  save();

  if (prevMax !== null && weight > prevMax) toast(`New PR! ${fmtKg(weight)} 🎉`);
  else toast(`Set ${sess.sets.length} logged`);

  if (state.settings.autoTimer) startTimer();
  else unlockAudio();
  renderExercise(exerciseId);
}

view.addEventListener('click', (evt) => {
  const el = evt.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;

  switch (action) {
    case 'open-group': go(`#/g/${id}`); break;
    case 'open-exercise': go(`#/e/${id}`); break;

    case 'toggle-edit-home': editingHome = !editingHome; renderHome(); break;
    case 'toggle-edit-group': editingGroup = !editingGroup; renderGroup(currentRouteId()); break;

    case 'move-group': {
      const i = state.groups.findIndex((g) => g.id === id);
      const j = i + Number(el.dataset.dir);
      if (j < 0 || j >= state.groups.length) break;
      [state.groups[i], state.groups[j]] = [state.groups[j], state.groups[i]];
      save(); renderHome();
      break;
    }
    case 'rename-group': {
      const g = getGroup(id);
      const name = prompt('Rename muscle group', g.name);
      if (name && name.trim()) { g.name = name.trim().slice(0, 40); save(); renderHome(); }
      break;
    }
    case 'delete-group': {
      const g = getGroup(id);
      const exIds = new Set(exercisesOf(id).map((e) => e.id));
      if (!confirm(`Delete "${g.name}" with its ${exIds.size} exercise(s) and all their history?`)) break;
      state.groups = state.groups.filter((x) => x.id !== id);
      state.exercises = state.exercises.filter((e) => !exIds.has(e.id));
      state.sessions = state.sessions.filter((s) => !exIds.has(s.exerciseId));
      save(); renderHome();
      break;
    }
    case 'rename-exercise': {
      const ex = getExercise(id);
      const name = prompt('Rename exercise', ex.name);
      if (name && name.trim()) { ex.name = name.trim().slice(0, 60); save(); renderGroup(ex.groupId); }
      break;
    }
    case 'delete-exercise': {
      const ex = getExercise(id);
      if (!confirm(`Delete "${ex.name}" and all its history?`)) break;
      state.exercises = state.exercises.filter((e) => e.id !== id);
      state.sessions = state.sessions.filter((s) => s.exerciseId !== id);
      save(); renderGroup(ex.groupId);
      break;
    }

    case 'step': {
      const field = el.dataset.field;
      const input = $(field === 'reps' ? '#in-reps' : '#in-weight');
      const delta = Number(el.dataset.delta) * (field === 'reps' ? 1 : state.settings.weightStep);
      const cur = readNumber(input, { int: field === 'reps', min: field === 'reps' ? 1 : 0 });
      const next = Math.max(field === 'reps' ? 1 : 0, Math.round((cur + delta) * 100) / 100);
      input.value = fmtNum(next);
      break;
    }
    case 'log-set': logSet(id); break;
    case 'delete-set': {
      for (const sess of state.sessions) {
        const idx = sess.sets.findIndex((s) => s.id === id);
        if (idx !== -1) { sess.sets.splice(idx, 1); break; }
      }
      state.sessions = state.sessions.filter((s) => s.sets.length);
      save(); renderExercise(currentRouteId());
      break;
    }
    case 'delete-session': {
      const sess = state.sessions.find((s) => s.id === id);
      if (!sess || !confirm(`Delete the session from ${fmtDate(sess.date)}?`)) break;
      state.sessions = state.sessions.filter((s) => s.id !== id);
      save(); renderExercise(currentRouteId());
      break;
    }
    case 'metric': chartMetric = el.dataset.metric; renderExercise(id); break;

    case 'rest-step':
      state.settings.restSeconds = Math.min(600, Math.max(15, state.settings.restSeconds + Number(el.dataset.delta)));
      save(); renderSettings();
      break;
    case 'toggle-auto':
      state.settings.autoTimer = el.checked;
      save();
      break;
    case 'start-timer': startTimer(); break;
    case 'weight-step':
      state.settings.weightStep = Number(el.dataset.value);
      save(); renderSettings();
      break;
    case 'export': exportData(); break;
    case 'import': $('#import-file').click(); break;
    case 'reset':
      if (!confirm('Delete ALL data and start fresh? This cannot be undone.')) break;
      if (!confirm('Really sure? Export a backup first if you want to keep your history.')) break;
      state = seedState();
      save(); toast('Reset complete'); go('#/');
      break;
  }
});

view.addEventListener('submit', (evt) => {
  evt.preventDefault();
  const form = evt.target;
  const name = form.elements.name.value.trim();
  if (!name) return;
  if (form.dataset.form === 'add-group') {
    state.groups.push({ id: uid(), name: name.slice(0, 40) });
    save(); renderHome();
    $('[data-form="add-group"] input').focus();
  } else if (form.dataset.form === 'add-exercise') {
    const groupId = form.dataset.group;
    state.exercises.push({ id: uid(), groupId, name: name.slice(0, 60) });
    save(); renderGroup(groupId);
    toast(`Added ${name}`);
  }
});

view.addEventListener('change', (evt) => {
  if (evt.target.id !== 'import-file') return;
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!isValidState(data)) throw new Error('bad file');
      if (!confirm('Replace all current data with this backup?')) return;
      data.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
      state = data;
      save(); toast('Backup imported'); go('#/');
    } catch (e) {
      toast('That file is not a GymBud backup');
    }
  };
  reader.readAsText(file);
});

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gymbud-backup-${dateKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------- boot ---------------- */

save(); // persist the starter data on first launch
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}
