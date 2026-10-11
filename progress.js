'use strict';

/* =========================================================
   Progress page: weekly training, sets per muscle group,
   volume, personal records and calorie history.
   ========================================================= */

/** Monday of the week containing `d`, as a YYYY-MM-DD key. */
function weekStartKey(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dateKey(x);
}

/** The last `n` week-start keys, oldest first (the last one is this week). */
function lastWeekKeys(n) {
  const start = parseKey(weekStartKey(new Date()));
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - 7 * i);
    keys.push(dateKey(d));
  }
  return keys;
}

function lastDayKeys(n) {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(dateKey(d));
  }
  return keys;
}

function weekTotals(weeks) {
  const days = new Map(); // week -> Set of dates trained
  const volume = new Map();
  for (const w of weeks) { days.set(w, new Set()); volume.set(w, 0); }
  for (const sess of state.sessions) {
    if (!sess.sets.length) continue;
    const w = weekStartKey(parseKey(sess.date));
    if (!days.has(w)) continue;
    days.get(w).add(sess.date);
    volume.set(w, volume.get(w) + sess.sets.reduce((a, s) => a + s.reps * s.weight, 0));
  }
  return { days, volume };
}

/** Consecutive weeks (ending this week, or last week if nothing yet this week) with a workout. */
function weekStreak() {
  const keys = lastWeekKeys(104);
  const { days } = weekTotals(keys);
  let i = keys.length - 1;
  if (days.get(keys[i]).size === 0) i--;
  let streak = 0;
  while (i >= 0 && days.get(keys[i]).size > 0) { streak++; i--; }
  return streak;
}

function recentPRs(limit) {
  const out = [];
  for (const ex of state.exercises) {
    let max = null;
    for (const sess of sessionsOf(ex.id)) {
      const top = sess.sets.reduce((a, b) => (b.weight > a.weight ? b : a));
      if (max !== null && top.weight > max) out.push({ ex, date: sess.date, set: top });
      max = max === null ? top.weight : Math.max(max, top.weight);
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, limit);
}

/* ---------------- bar chart ---------------- */

/**
 * items: [{ label, value, tip }]; options: { goal, color, empty }.
 * Tap or hover a bar for its value.
 */
function barChart(container, items, { goal = 0, color = 'var(--accent)', name = 'Chart' } = {}) {
  const W = 340;
  const H = 170;
  const pad = { l: 38, r: 8, t: 12, b: 26 };
  const maxVal = Math.max(...items.map((i) => i.value), goal, 1);
  const step = niceStep(maxVal, 4);
  const top = Math.ceil((maxVal * 1.05) / step) * step;
  const plotW = W - pad.l - pad.r;
  const slot = plotW / items.length;
  const bw = Math.min(26, slot * 0.68);
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const cx = (i) => pad.l + slot * i + slot / 2;

  let grid = '';
  for (let v = 0; v <= top + step / 2; v += step) {
    const yy = y(v).toFixed(1);
    grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="var(--border)"/>`;
    grid += `<text x="${pad.l - 6}" y="${yy}" dy="4" text-anchor="end" font-size="10" fill="var(--ink-3)">${fmtNum(v)}</text>`;
  }

  const every = Math.ceil(items.length / 6);
  const bars = items.map((it, i) => {
    const h = Math.max(0, (H - pad.b) - y(it.value));
    const label = i % every === (items.length - 1) % every ? `<text x="${cx(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--ink-3)">${esc(it.label)}</text>` : '';
    return `<rect class="bar-rect" data-i="${i}" x="${(cx(i) - bw / 2).toFixed(1)}" y="${(H - pad.b - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${color}"/>${label}`;
  }).join('');

  const goalLine = goal > 0
    ? `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}" stroke="var(--ink-2)" stroke-dasharray="4 4"/>
       <text x="${W - pad.r}" y="${(y(goal) - 4).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--ink-2)">goal ${fmtNum(goal)}</text>`
    : '';

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)}">${grid}${bars}${goalLine}</svg><div class="chart-tip" hidden></div>`;

  const svg = container.querySelector('svg');
  const tip = container.querySelector('.chart-tip');
  const show = (evt) => {
    const rect = svg.getBoundingClientRect();
    const sx = ((evt.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(items.length - 1, Math.floor((sx - pad.l) / slot)));
    svg.querySelectorAll('.bar-rect').forEach((r) => r.setAttribute('opacity', Number(r.dataset.i) === i ? '1' : '0.45'));
    tip.innerHTML = items[i].tip;
    tip.hidden = false;
    const half = tip.offsetWidth / 2;
    tip.style.left = `${Math.min(Math.max((cx(i) / W) * rect.width, half), rect.width - half)}px`;
  };
  const hide = () => {
    svg.querySelectorAll('.bar-rect').forEach((r) => r.removeAttribute('opacity'));
    tip.hidden = true;
  };
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
}

/* ---------------- page ---------------- */

function renderProgress() {
  setTitle('Progress');
  const hasData = state.sessions.some((s) => s.sets.length) || state.foodLog.length;
  if (!hasData) {
    view.innerHTML = '<div class="empty">Log a workout or some food and your charts will show up here.</div>';
    return;
  }

  const weeks = lastWeekKeys(12);
  const { days, volume } = weekTotals(weeks);
  const thisWeek = weeks[weeks.length - 1];
  const shortDay = (k) => parseKey(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const prs = recentPRs(8);
  const prsLast30 = recentPRs(1000).filter((p) => daysAgo(p.date) <= 30).length;

  // sets per muscle group this week
  const groupOf = new Map(state.exercises.map((e) => [e.id, e.groupId]));
  const setsByGroup = new Map(state.groups.map((g) => [g.id, 0]));
  for (const sess of state.sessions) {
    if (weekStartKey(parseKey(sess.date)) !== thisWeek) continue;
    const gid = groupOf.get(sess.exerciseId);
    if (setsByGroup.has(gid)) setsByGroup.set(gid, setsByGroup.get(gid) + sess.sets.length);
  }
  const maxSets = Math.max(1, ...setsByGroup.values());
  const groupBars = state.groups.map((g) => {
    const n = setsByGroup.get(g.id);
    return `<div class="hbar"><span class="hbar-label">${esc(g.name)}</span>
      <div class="bar"><div class="bar-fill ${n ? '' : 'zero'}" style="width:${(n / maxSets) * 100}%"></div></div>
      <span class="hbar-val">${n}</span></div>`;
  }).join('');

  // exercises with history for the jump menu
  const jump = state.groups.map((g) => {
    const list = exercisesOf(g.id).filter((e) => sessionsOf(e.id).length);
    return list.length ? `<optgroup label="${esc(g.name)}">${list.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</optgroup>` : '';
  }).join('');

  // food history
  const goals = currentGoals();
  const dayKeys = lastDayKeys(14);
  const foodDays = dayKeys.map((k) => ({ k, t: sumEntries(entriesOn(k)), logged: entriesOn(k).length > 0 }));
  const logged = foodDays.filter((d) => d.logged);
  const avg = (sel) => (logged.length ? r0(logged.reduce((a, d) => a + sel(d.t), 0) / logged.length) : 0);

  view.innerHTML = `
    <div class="stats">
      <div class="stat"><div class="stat-label">This week</div><div class="stat-value">${days.get(thisWeek).size}</div><div class="stat-sub">workout${days.get(thisWeek).size === 1 ? '' : 's'}</div></div>
      <div class="stat"><div class="stat-label">Streak</div><div class="stat-value">${weekStreak()}</div><div class="stat-sub">week${weekStreak() === 1 ? '' : 's'} in a row</div></div>
      <div class="stat"><div class="stat-label">PRs</div><div class="stat-value">${prsLast30}</div><div class="stat-sub">last 30 days</div></div>
    </div>

    <div class="section-title">Workouts per week</div>
    <div class="card"><div class="chart-wrap" id="ch-workouts"></div></div>

    <div class="section-title">Sets per muscle group (this week)</div>
    <div class="card hbars">${groupBars}</div>

    <div class="section-title">Weekly volume (kg lifted)</div>
    <div class="card"><div class="chart-wrap" id="ch-volume"></div></div>

    <div class="section-title">Calories (last 14 days)</div>
    <div class="card">
      ${logged.length ? `<div class="avg-line">Average on days you logged: <b>${avg((t) => t.kcal)} kcal</b> · protein ${avg((t) => t.protein)} g</div>` : ''}
      <div class="chart-wrap" id="ch-cal"></div>
      ${logged.length ? '' : '<p class="help" style="text-align:center">Log some food on the Food page to see this chart.</p>'}
    </div>

    <div class="section-title">Recent personal records</div>
    ${prs.length ? `<div class="list">${prs.map((p) => `
      <a class="list-item" href="#/e/${p.ex.id}">
        <div class="list-main"><div class="list-title">${esc(p.ex.name)} <span class="pr-tag">PR</span></div>
        <div class="list-sub">${esc(fmtSet(p.set))} · ${esc(fmtDate(p.date))}</div></div>${CHEVRON}
      </a>`).join('')}</div>` : '<div class="card empty small">No PRs yet. Beat your heaviest weight on an exercise and it lands here.</div>'}

    ${jump ? `<div class="section-title">Exercise charts</div>
      <div class="card"><select class="text-input" id="jump-ex" aria-label="Jump to an exercise chart"><option value="">Choose an exercise…</option>${jump}</select></div>` : ''}
  `;

  barChart($('#ch-workouts'), weeks.map((w) => ({
    label: shortDay(w), value: days.get(w).size,
    tip: `<b>${days.get(w).size} workout${days.get(w).size === 1 ? '' : 's'}</b><br>week of ${esc(shortDay(w))}`,
  })), { name: 'Workouts per week' });

  barChart($('#ch-volume'), weeks.map((w) => ({
    label: shortDay(w), value: Math.round(volume.get(w)),
    tip: `<b>${fmtNum(Math.round(volume.get(w)))} kg</b><br>week of ${esc(shortDay(w))}`,
  })), { name: 'Weekly volume', color: 'var(--accent-2)' });

  barChart($('#ch-cal'), foodDays.map((d) => ({
    label: shortDay(d.k), value: r0(d.t.kcal),
    tip: d.logged ? `<b>${r0(d.t.kcal)} kcal</b><br>${macroLine(d.t)}<br>${esc(shortDay(d.k))}` : `<b>Nothing logged</b><br>${esc(shortDay(d.k))}`,
  })), { goal: goals.kcal, name: 'Calories per day', color: 'var(--green)' });
}

view.addEventListener('change', (evt) => {
  if (evt.target.id === 'jump-ex' && evt.target.value) go(`#/e/${evt.target.value}`);
});
