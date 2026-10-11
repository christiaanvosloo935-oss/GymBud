'use strict';

/* =========================================================
   Calorie tracker: daily goals, food log by meal, adding food
   (search / barcode / manual / saved), and the profile page.
   Food data comes from the free Open Food Facts database.
   ========================================================= */

const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snacks', 'Snacks']];

const ACTIVITY = {
  sedentary: [1.2, 'Sedentary (little or no exercise)'],
  light: [1.375, 'Light (training 1–3 days a week)'],
  moderate: [1.55, 'Moderate (3–5 days a week)'],
  very: [1.725, 'Very active (6–7 days a week)'],
  extra: [1.9, 'Extra active (hard training + physical job)'],
};
const GOAL_TYPES = {
  lose: [-500, 'Lose weight'],
  maintain: [0, 'Maintain weight'],
  build: [300, 'Build muscle'],
};

const OFF_FIELDS = 'code,product_name,brands,nutriments,serving_quantity';

let foodDate = dateKey();

const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;

/* ---------------- goals ---------------- */

/** Mifflin-St Jeor calories, protein 2 g/kg, fat 25% of calories, carbs fill the rest. */
function calcGoals(p) {
  if (!p || !(p.age > 0 && p.heightCm > 0 && p.weightKg > 0)) return null;
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  const bmr = p.sex === 'male' ? base + 5 : p.sex === 'female' ? base - 161 : base - 78;
  const mult = (ACTIVITY[p.activity] || ACTIVITY.moderate)[0];
  const adj = (GOAL_TYPES[p.goal] || GOAL_TYPES.maintain)[0];
  const kcal = Math.round((bmr * mult + adj) / 10) * 10;
  const protein = Math.round(2 * p.weightKg);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

function currentGoals() {
  const custom = state.settings.goalOverride;
  if (custom) return { ...custom, source: 'custom' };
  const calc = calcGoals(state.profile);
  if (calc) return { ...calc, source: 'calculated' };
  return { kcal: 2200, protein: 140, carbs: 250, fat: 70, source: 'default' };
}

/* ---------------- food maths ---------------- */

function entryTotals(e) {
  const f = e.basis === 'g' ? e.amount / 100 : e.amount;
  return { kcal: e.per.kcal * f, protein: e.per.protein * f, carbs: e.per.carbs * f, fat: e.per.fat * f };
}

function sumEntries(list) {
  return list.reduce((t, e) => {
    const x = entryTotals(e);
    return { kcal: t.kcal + x.kcal, protein: t.protein + x.protein, carbs: t.carbs + x.carbs, fat: t.fat + x.fat };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

const entriesOn = (date) => state.foodLog.filter((e) => e.date === date);

function fmtAmount(e) {
  if (e.basis === 'g') return `${fmtNum(e.amount)} g`;
  return `${fmtNum(e.amount)} serving${e.amount === 1 ? '' : 's'}`;
}

function macroLine(t) {
  return `P ${r0(t.protein)} · C ${r0(t.carbs)} · F ${r0(t.fat)}`;
}

/* ---------------- food page ---------------- */

function ringSvg(eaten, goal) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const pct = goal > 0 ? Math.min(1, eaten / goal) : 0;
  const over = eaten > goal;
  const left = r0(goal - eaten);
  return `<svg viewBox="0 0 140 140" class="ring" role="img" aria-label="${r0(eaten)} of ${goal} calories">
    <circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--border)" stroke-width="12"/>
    <circle cx="70" cy="70" r="${R}" fill="none" stroke="${over ? 'var(--danger)' : 'var(--accent)'}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 70 70)"/>
    <text x="70" y="68" text-anchor="middle" font-size="26" font-weight="700" fill="var(--ink)">${Math.abs(left)}</text>
    <text x="70" y="88" text-anchor="middle" font-size="12" fill="var(--ink-3)">${over ? 'kcal over' : 'kcal left'}</text>
  </svg>`;
}

function macroBar(label, value, goal, cls) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return `<div class="macro">
    <div class="macro-head"><span>${label}</span><span class="muted">${r0(value)} / ${goal} g</span></div>
    <div class="bar"><div class="bar-fill ${cls}" style="width:${pct.toFixed(1)}%"></div></div>
  </div>`;
}

function renderFood() {
  setTitle('Food');
  const goals = currentGoals();
  const entries = entriesOn(foodDate);
  const total = sumEntries(entries);
  const isToday = foodDate === dateKey();

  const meals = MEALS.map(([key, label]) => {
    const list = entries.filter((e) => e.meal === key);
    const sub = sumEntries(list);
    const rows = list.map((e) => {
      const t = entryTotals(e);
      return `<button class="list-item food-row" data-action="f-edit" data-id="${e.id}">
        <div class="list-main">
          <div class="list-title">${esc(e.name)}</div>
          <div class="list-sub">${esc(fmtAmount(e))} · ${macroLine(t)}</div>
        </div>
        <div class="food-kcal">${r0(t.kcal)}<small> kcal</small></div>
      </button>`;
    }).join('');
    return `<div class="meal">
      <div class="meal-head">
        <span class="meal-name">${label}</span>
        <span class="muted">${list.length ? `${r0(sub.kcal)} kcal` : ''}</span>
      </div>
      <div class="list">${rows}
        <button class="list-item add-food" data-action="f-add" data-meal="${key}">+ Add food</button>
      </div>
      ${list.length ? `<div class="toolbar" style="margin:4px 0 0"><button class="link-btn small" data-action="f-save-meal" data-meal="${key}">Save as meal</button></div>` : ''}
    </div>`;
  }).join('');

  view.innerHTML = `
    <div class="date-switch">
      <button class="icon-btn" data-action="f-prev" aria-label="Previous day">‹</button>
      <div class="date-label">${esc(fmtDate(foodDate))}</div>
      <button class="icon-btn" data-action="f-next" aria-label="Next day" ${isToday ? 'disabled' : ''}>›</button>
    </div>

    <div class="card">
      <div class="food-summary">
        ${ringSvg(total.kcal, goals.kcal)}
        <div class="food-summary-text">
          <div><b>${r0(total.kcal)}</b> <span class="muted">of ${goals.kcal} kcal</span></div>
          <div class="muted small">${goals.source === 'custom' ? 'Your custom goal' : goals.source === 'calculated' ? 'Calculated from your profile' : 'Default goal'}</div>
        </div>
      </div>
      ${macroBar('Protein', total.protein, goals.protein, 'protein')}
      ${macroBar('Carbs', total.carbs, goals.carbs, 'carbs')}
      ${macroBar('Fat', total.fat, goals.fat, 'fat')}
    </div>

    ${goals.source === 'default' ? '<a class="card promo" href="#/profile"><b>Set your daily goal</b><span class="muted small">Enter your height, weight and goal and GymBud works out your calories and macros →</span></a>' : ''}

    ${meals}
  `;
}

/* ---------------- add / edit sheet ---------------- */

const sheet = $('#sheet');
const sheetBody = $('#sheet-body');

const sh = {
  mode: 'add', // add | edit
  meal: 'breakfast',
  tab: 'search', // search | scan | manual | mine
  step: 'pick', // pick | amount
  food: null,
  amount: 100,
  entryId: null,
  results: [],
  q: '',
  status: '',
  scanStatus: '',
  barcodeMissing: false,
};

let searchTimer = null;
let searchAbort = null;

function openSheet(meal) {
  Object.assign(sh, { mode: 'add', meal, tab: 'search', step: 'pick', food: null, entryId: null, results: [], q: '', status: '', scanStatus: '', barcodeMissing: false });
  showSheet();
}

function openEditSheet(entryId) {
  const e = state.foodLog.find((x) => x.id === entryId);
  if (!e) return;
  Object.assign(sh, { mode: 'edit', meal: e.meal, step: 'amount', entryId, food: { name: e.name, brand: e.brand, basis: e.basis, per: e.per, servingG: e.servingG, code: e.code }, amount: e.amount, status: '' });
  showSheet();
}

function showSheet() {
  sheet.hidden = false;
  document.body.classList.add('no-scroll');
  renderSheet();
  $('#sheet-close').focus();
}

function closeSheet() {
  stopScan();
  clearTimeout(searchTimer);
  if (searchAbort) searchAbort.abort();
  sheet.hidden = true;
  sheetBody.innerHTML = '';
  document.body.classList.remove('no-scroll');
}

function mealChips() {
  return `<div class="seg meal-seg" role="group" aria-label="Meal">
    ${MEALS.map(([k, l]) => `<button data-action="f-meal" data-meal="${k}" aria-pressed="${sh.meal === k}">${l}</button>`).join('')}
  </div>`;
}

function renderSheet() {
  $('#sheet-title').textContent = sh.mode === 'edit' ? 'Edit food' : sh.step === 'amount' ? 'How much?' : 'Add food';
  if (sh.step === 'amount') { sheetBody.innerHTML = amountView(); updateAmountPreview(); return; }

  const tabs = [['search', 'Search'], ['scan', 'Scan'], ['manual', 'Manual'], ['mine', 'Saved']];
  sheetBody.innerHTML = `
    ${mealChips()}
    <div class="tabs" role="tablist">
      ${tabs.map(([k, l]) => `<button role="tab" data-action="f-tab" data-tab="${k}" aria-selected="${sh.tab === k}">${l}</button>`).join('')}
    </div>
    <div id="sh-tab">${tabView()}</div>
  `;
  if (sh.tab === 'search') renderResults();
}

function tabView() {
  if (sh.tab === 'search') {
    return `<input class="text-input" id="sh-q" type="search" placeholder="Search foods, e.g. banana or chicken breast" value="${esc(sh.q)}" autocomplete="off" enterkeyhint="search">
      <div id="sh-results" class="results"></div>`;
  }
  if (sh.tab === 'scan') {
    return `<div class="scan">
      <video id="sh-video" playsinline muted hidden></video>
      <div id="sh-reader"></div>
      <div class="scan-status" id="sh-scan-status" role="status">${esc(sh.scanStatus)}</div>
      <button class="btn btn-primary btn-block" data-action="f-scan-start">Scan a barcode</button>
      ${sh.barcodeMissing ? '<button class="btn btn-block" style="margin-top:8px" data-action="f-tab" data-tab="manual">Enter it manually</button>' : ''}
      <div class="or">or type the number under the barcode</div>
      <div class="add-row" style="margin-top:0">
        <input class="text-input" id="sh-code" inputmode="numeric" placeholder="e.g. 5000159407236" autocomplete="off">
        <button class="btn" data-action="f-code-go">Look up</button>
      </div>
    </div>`;
  }
  if (sh.tab === 'manual') {
    return `<div class="manual">
      <label class="field-label" for="mf-name">Name</label>
      <input class="text-input" id="mf-name" placeholder="e.g. Homemade protein shake" maxlength="60" autocomplete="off">
      <div class="manual-grid">
        <div><label class="field-label" for="mf-kcal">Calories</label><input class="text-input" id="mf-kcal" inputmode="decimal" placeholder="kcal"></div>
        <div><label class="field-label" for="mf-protein">Protein (g)</label><input class="text-input" id="mf-protein" inputmode="decimal" placeholder="0"></div>
        <div><label class="field-label" for="mf-carbs">Carbs (g)</label><input class="text-input" id="mf-carbs" inputmode="decimal" placeholder="0"></div>
        <div><label class="field-label" for="mf-fat">Fat (g)</label><input class="text-input" id="mf-fat" inputmode="decimal" placeholder="0"></div>
      </div>
      <label class="check-row"><input type="checkbox" id="mf-save"> Save to my foods for next time</label>
      <button class="btn btn-primary btn-block" data-action="f-manual-add">Add food</button>
    </div>`;
  }
  return mineView();
}

function mineView() {
  const foodRows = state.myFoods.map((f) => `
    <div class="list-item mine-row">
      <button class="list-main plain" data-action="f-pick-mine" data-id="${f.id}">
        <div class="list-title">${esc(f.name)}</div>
        <div class="list-sub">${esc(per(f))}</div>
      </button>
      <button class="mini-btn danger" data-action="f-del-mine" data-id="${f.id}" aria-label="Delete ${esc(f.name)}">✕</button>
    </div>`).join('');

  const mealRows = state.meals.map((m) => {
    const t = sumEntries(m.items);
    return `<div class="list-item mine-row">
      <button class="list-main plain" data-action="f-add-meal" data-id="${m.id}">
        <div class="list-title">${esc(m.name)}</div>
        <div class="list-sub">${m.items.length} item${m.items.length === 1 ? '' : 's'} · ${r0(t.kcal)} kcal · ${macroLine(t)}</div>
      </button>
      <button class="mini-btn danger" data-action="f-del-meal" data-id="${m.id}" aria-label="Delete ${esc(m.name)}">✕</button>
    </div>`;
  }).join('');

  const seen = new Set(state.myFoods.map((f) => `${f.name}|${f.basis}`));
  const recent = [];
  for (const e of state.foodLog.slice().reverse()) {
    const k = `${e.name}|${e.basis}`;
    if (seen.has(k)) continue;
    seen.add(k);
    recent.push(e);
    if (recent.length >= 10) break;
  }
  const recentRows = recent.map((e) => `
    <div class="list-item mine-row">
      <button class="list-main plain" data-action="f-pick-recent" data-id="${e.id}">
        <div class="list-title">${esc(e.name)}</div>
        <div class="list-sub">${esc(per(e))}</div>
      </button>
    </div>`).join('');

  return `
    ${state.meals.length ? `<div class="section-title" style="margin-top:12px">Saved meals</div><div class="list">${mealRows}</div>` : ''}
    <div class="section-title" style="margin-top:14px">My foods</div>
    <div class="list">${foodRows || '<div class="empty small">Nothing saved yet. Tick “save to my foods” when adding a food.</div>'}</div>
    ${recent.length ? `<div class="section-title" style="margin-top:14px">Recent</div><div class="list">${recentRows}</div>` : ''}
    <p class="help">Tip: on the Food page, tap “Save as meal” under a meal to save a group of foods you eat together.</p>`;
}

function per(f) {
  return f.basis === 'g'
    ? `${r0(f.per.kcal)} kcal per 100 g · ${macroLine(f.per)}`
    : `${r0(f.per.kcal)} kcal per serving · ${macroLine(f.per)}`;
}

/* ---- amount step ---- */

function amountStep() { return sh.food.basis === 'g' ? 10 : 0.5; }

function amountView() {
  const f = sh.food;
  const unit = f.basis === 'g' ? 'grams' : 'servings';
  const exists = state.myFoods.some((m) => m.name === f.name && m.basis === f.basis);
  return `
    ${mealChips()}
    <div class="card" style="margin-top:12px">
      <div class="list-title">${esc(f.name)}</div>
      <div class="list-sub">${f.brand ? `${esc(f.brand)} · ` : ''}${esc(per(f))}</div>
      <div class="stepper-label" style="margin-top:14px">Amount (${unit})</div>
      <div class="stepper">
        <button type="button" data-action="f-amt" data-dir="-1" aria-label="Less">−</button>
        <input id="sh-amount" type="number" inputmode="decimal" min="0" step="any" value="${fmtNum(sh.amount)}" aria-label="Amount in ${unit}">
        <button type="button" data-action="f-amt" data-dir="1" aria-label="More">+</button>
      </div>
      ${f.basis === 'g' && f.servingG ? `<button class="link-btn" data-action="f-serving" style="margin-top:6px">1 serving = ${fmtNum(f.servingG)} g</button>` : ''}
      <div class="preview" id="sh-preview"></div>
    </div>
    ${sh.mode === 'add' && !exists ? '<label class="check-row"><input type="checkbox" id="sh-save"> Save to my foods</label>' : ''}
    <button class="btn btn-primary btn-block log-btn" data-action="f-confirm">${sh.mode === 'edit' ? 'Update' : 'Add'} · ${esc(mealLabel(sh.meal))}</button>
    ${sh.mode === 'edit' ? '<button class="btn btn-block btn-danger" style="margin-top:10px" data-action="f-delete">Delete this food</button>' : '<button class="link-btn" style="margin-top:8px" data-action="f-back">← Back</button>'}
  `;
}

const mealLabel = (key) => (MEALS.find((m) => m[0] === key) || MEALS[0])[1];

function updateAmountPreview() {
  const el = $('#sh-preview');
  const input = $('#sh-amount');
  if (!el || !input) return;
  const amount = Math.max(0, parseFloat(String(input.value).replace(',', '.')) || 0);
  sh.amount = amount;
  const t = entryTotals({ ...sh.food, amount });
  el.innerHTML = `<b>${r0(t.kcal)}</b> kcal <span class="muted">· ${macroLine(t)}</span>`;
}

function confirmAmount() {
  updateAmountPreview();
  if (!(sh.amount > 0)) { toast('Enter an amount'); return; }
  const f = sh.food;
  if (sh.mode === 'edit') {
    const e = state.foodLog.find((x) => x.id === sh.entryId);
    if (e) { e.amount = sh.amount; e.meal = sh.meal; }
    save(); closeSheet(); renderFood(); toast('Updated');
    return;
  }
  state.foodLog.push({ id: uid(), date: foodDate, meal: sh.meal, name: f.name, brand: f.brand || '', basis: f.basis, per: f.per, amount: sh.amount, servingG: f.servingG || null, code: f.code || '' });
  const saveBox = $('#sh-save');
  if (saveBox && saveBox.checked) saveToMyFoods(f);
  save(); closeSheet(); renderFood(); toast(`Added to ${mealLabel(sh.meal)}`);
}

function saveToMyFoods(f) {
  if (state.myFoods.some((m) => m.name === f.name && m.basis === f.basis)) return;
  state.myFoods.push({ id: uid(), name: f.name, brand: f.brand || '', basis: f.basis, per: f.per, servingG: f.servingG || null, code: f.code || '' });
}

function pickFood(food) {
  sh.food = food;
  sh.amount = food.basis === 'g' ? (food.servingG || 100) : 1;
  sh.step = 'amount';
  renderSheet();
}

/* ---- Open Food Facts ---- */

function offToFood(p) {
  const n = p.nutriments || {};
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;
  const name = (p.product_name || '').trim();
  kcal = Number(kcal);
  if (!name || !Number.isFinite(kcal)) return null;
  return {
    name: name.slice(0, 80),
    brand: (p.brands || '').split(',')[0].trim(),
    basis: 'g',
    per: { kcal, protein: Number(n.proteins_100g) || 0, carbs: Number(n.carbohydrates_100g) || 0, fat: Number(n.fat_100g) || 0 },
    servingG: Number(p.serving_quantity) > 0 ? Number(p.serving_quantity) : null,
    code: p.code || '',
  };
}

async function searchFoods(q) {
  if (searchAbort) searchAbort.abort();
  q = q.trim();
  if (q.length < 2) { sh.results = []; sh.status = ''; renderResults(); return; }
  searchAbort = new AbortController();
  sh.status = 'Searching…';
  renderResults();
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${OFF_FIELDS}`;
    const res = await fetch(url, { signal: searchAbort.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    sh.results = (data.products || []).map(offToFood).filter(Boolean);
    sh.status = sh.results.length ? '' : `No results for “${q}”. Try another word, or add it manually.`;
  } catch (e) {
    if (e.name === 'AbortError') return;
    sh.results = [];
    sh.status = 'Couldn’t reach the food database. Check your connection, or use Manual / Saved.';
  }
  renderResults();
}

function renderResults() {
  const box = $('#sh-results');
  if (!box) return;
  const rows = sh.results.map((f, i) => `
    <button class="list-item result" data-action="f-pick-result" data-i="${i}">
      <div class="list-main">
        <div class="list-title">${esc(f.name)}</div>
        <div class="list-sub">${f.brand ? `${esc(f.brand)} · ` : ''}${r0(f.per.kcal)} kcal / 100 g</div>
      </div>
      ${CHEVRON}
    </button>`).join('');
  box.innerHTML = `${sh.status ? `<div class="empty small" role="status">${esc(sh.status)}</div>` : ''}${rows ? `<div class="list">${rows}</div>` : ''}`;
}

async function lookupBarcode(code) {
  code = String(code).replace(/\D/g, '');
  const status = $('#sh-scan-status');
  if (code.length < 6) { if (status) status.textContent = 'That doesn’t look like a barcode number.'; return; }
  if (status) status.textContent = `Looking up ${code}…`;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`);
    const data = await res.json();
    const food = data.status === 1 && data.product ? offToFood({ ...data.product, code }) : null;
    if (food) { pickFood(food); return; }
    sh.barcodeMissing = true;
    sh.scanStatus = data.status === 1 ? 'Found the product, but it has no nutrition info.' : `Barcode ${code} isn’t in the database yet.`;
  } catch (e) {
    sh.scanStatus = 'Couldn’t reach the food database. Check your connection.';
  }
  if (sh.tab === 'scan') { $('#sh-tab').innerHTML = tabView(); }
}

/* ---- barcode camera ---- */

let scanStream = null;
let scanTimer = null;
let html5Scanner = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function startScan() {
  stopScan();
  const status = $('#sh-scan-status');
  const say = (t) => { sh.scanStatus = t; if (status) status.textContent = t; };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('The camera isn’t available here. Type the barcode number below.'); return; }
  try {
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const video = $('#sh-video');
      video.srcObject = scanStream;
      video.hidden = false;
      await video.play();
      say('Point the camera at the barcode…');
      scanTimer = setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          if (codes.length) { const code = codes[0].rawValue; stopScan(); lookupBarcode(code); }
        } catch (e) { /* keep trying */ }
      }, 300);
    } else {
      say('Starting camera…');
      if (!window.Html5Qrcode) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js');
      html5Scanner = new window.Html5Qrcode('sh-reader');
      await html5Scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 150 } },
        (text) => { stopScan(); lookupBarcode(text); },
        () => {}
      );
      say('Point the camera at the barcode…');
    }
  } catch (e) {
    stopScan();
    say('Couldn’t start the camera (permission denied or no internet). Type the barcode number below.');
  }
}

function stopScan() {
  clearInterval(scanTimer);
  scanTimer = null;
  if (scanStream) { scanStream.getTracks().forEach((t) => t.stop()); scanStream = null; }
  const video = $('#sh-video');
  if (video) { video.srcObject = null; video.hidden = true; }
  if (html5Scanner) {
    const s = html5Scanner;
    html5Scanner = null;
    Promise.resolve(s.stop()).catch(() => {}).finally(() => { try { s.clear(); } catch (e) { /* already cleared */ } });
  }
}

/* ---- sheet events ---- */

sheetBody.addEventListener('click', (evt) => {
  const el = evt.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;
  switch (action) {
    case 'f-meal':
      sh.meal = el.dataset.meal;
      sheetBody.querySelectorAll('.meal-seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.meal === sh.meal)));
      if (sh.step === 'amount') $('[data-action="f-confirm"]').textContent = `${sh.mode === 'edit' ? 'Update' : 'Add'} · ${mealLabel(sh.meal)}`;
      break;
    case 'f-tab':
      stopScan();
      sh.tab = el.dataset.tab;
      renderSheet();
      if (sh.tab === 'search') $('#sh-q').focus();
      break;
    case 'f-pick-result': pickFood(sh.results[Number(el.dataset.i)]); break;
    case 'f-scan-start': startScan(); break;
    case 'f-code-go': lookupBarcode($('#sh-code').value); break;
    case 'f-manual-add': {
      const name = $('#mf-name').value.trim();
      const num = (sel) => Math.max(0, parseFloat(String($(sel).value).replace(',', '.')) || 0);
      const kcal = num('#mf-kcal');
      if (!name) { toast('Give the food a name'); $('#mf-name').focus(); break; }
      if (!(kcal > 0)) { toast('Enter the calories'); $('#mf-kcal').focus(); break; }
      const food = { name, brand: '', basis: 'serving', per: { kcal, protein: num('#mf-protein'), carbs: num('#mf-carbs'), fat: num('#mf-fat') }, servingG: null, code: '' };
      state.foodLog.push({ id: uid(), date: foodDate, meal: sh.meal, name, brand: '', basis: 'serving', per: food.per, amount: 1, servingG: null, code: '' });
      if ($('#mf-save').checked) saveToMyFoods(food);
      save(); closeSheet(); renderFood(); toast(`Added to ${mealLabel(sh.meal)}`);
      break;
    }
    case 'f-pick-mine': {
      const f = state.myFoods.find((x) => x.id === id);
      if (f) pickFood({ ...f });
      break;
    }
    case 'f-pick-recent': {
      const e = state.foodLog.find((x) => x.id === id);
      if (e) pickFood({ name: e.name, brand: e.brand, basis: e.basis, per: e.per, servingG: e.servingG, code: e.code });
      break;
    }
    case 'f-del-mine':
      state.myFoods = state.myFoods.filter((x) => x.id !== id);
      save(); $('#sh-tab').innerHTML = mineView();
      break;
    case 'f-del-meal':
      if (!confirm('Delete this saved meal?')) break;
      state.meals = state.meals.filter((x) => x.id !== id);
      save(); $('#sh-tab').innerHTML = mineView();
      break;
    case 'f-add-meal': {
      const m = state.meals.find((x) => x.id === id);
      if (!m) break;
      for (const it of m.items) state.foodLog.push({ ...it, id: uid(), date: foodDate, meal: sh.meal });
      save(); closeSheet(); renderFood(); toast(`Added “${m.name}” to ${mealLabel(sh.meal)}`);
      break;
    }
    case 'f-amt': {
      const input = $('#sh-amount');
      const cur = parseFloat(String(input.value).replace(',', '.')) || 0;
      input.value = fmtNum(Math.max(0, Math.round((cur + Number(el.dataset.dir) * amountStep()) * 100) / 100));
      updateAmountPreview();
      break;
    }
    case 'f-serving': $('#sh-amount').value = fmtNum(sh.food.servingG); updateAmountPreview(); break;
    case 'f-confirm': confirmAmount(); break;
    case 'f-back': sh.step = 'pick'; renderSheet(); break;
    case 'f-delete':
      state.foodLog = state.foodLog.filter((x) => x.id !== sh.entryId);
      save(); closeSheet(); renderFood(); toast('Deleted');
      break;
  }
});

sheetBody.addEventListener('input', (evt) => {
  if (evt.target.id === 'sh-q') {
    sh.q = evt.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchFoods(sh.q), 450);
  } else if (evt.target.id === 'sh-amount') {
    updateAmountPreview();
  }
});

sheetBody.addEventListener('keydown', (evt) => {
  if (evt.key !== 'Enter') return;
  if (evt.target.id === 'sh-q') { clearTimeout(searchTimer); searchFoods(evt.target.value); evt.target.blur(); }
  else if (evt.target.id === 'sh-code') lookupBarcode(evt.target.value);
});

$('#sheet-close').addEventListener('click', closeSheet);
$('#sheet-scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

/* ---------------- food page actions ---------------- */

function shiftDate(days) {
  const d = parseKey(foodDate);
  d.setDate(d.getDate() + days);
  const key = dateKey(d);
  foodDate = key > dateKey() ? dateKey() : key;
  renderFood();
}

view.addEventListener('click', (evt) => {
  const el = evt.target.closest('[data-action]');
  if (!el || !el.dataset.action.startsWith('f-')) return;
  const { action, id } = el.dataset;
  switch (action) {
    case 'f-prev': shiftDate(-1); break;
    case 'f-next': shiftDate(1); break;
    case 'f-add': openSheet(el.dataset.meal); break;
    case 'f-edit': openEditSheet(id); break;
    case 'f-save-meal': {
      const items = entriesOn(foodDate).filter((e) => e.meal === el.dataset.meal);
      if (!items.length) break;
      const name = prompt('Name this meal', `My ${mealLabel(el.dataset.meal).toLowerCase()}`);
      if (!name || !name.trim()) break;
      state.meals.push({
        id: uid(),
        name: name.trim().slice(0, 40),
        items: items.map((e) => ({ name: e.name, brand: e.brand, basis: e.basis, per: e.per, amount: e.amount, servingG: e.servingG, code: e.code })),
      });
      save(); toast('Meal saved. Find it under Add food → Saved');
      break;
    }
    case 'f-save-profile': saveProfile(); break;
    case 'f-save-goals': saveCustomGoals(); break;
    case 'f-reset-goals':
      state.settings.goalOverride = null;
      save(); renderProfile(); toast('Using calculated goals');
      break;
  }
});

/* ---------------- profile & goals ---------------- */

function renderProfile() {
  setTitle('Profile & goals');
  const p = state.profile || { sex: 'male', age: '', heightCm: '', weightKg: '', activity: 'moderate', goal: 'build' };
  const calc = calcGoals(state.profile);
  const goals = currentGoals();
  const opt = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(v[1])}</option>`).join('');

  view.innerHTML = `
    <div class="section-title" style="margin-top:0">About you</div>
    <div class="card">
      <div class="manual-grid">
        <div><label class="field-label" for="pf-sex">Sex</label>
          <select class="text-input" id="pf-sex">
            <option value="male" ${p.sex === 'male' ? 'selected' : ''}>Male</option>
            <option value="female" ${p.sex === 'female' ? 'selected' : ''}>Female</option>
            <option value="other" ${p.sex === 'other' ? 'selected' : ''}>Prefer not to say</option>
          </select></div>
        <div><label class="field-label" for="pf-age">Age</label><input class="text-input" id="pf-age" inputmode="numeric" value="${esc(p.age)}" placeholder="years"></div>
        <div><label class="field-label" for="pf-height">Height (cm)</label><input class="text-input" id="pf-height" inputmode="decimal" value="${esc(p.heightCm)}" placeholder="cm"></div>
        <div><label class="field-label" for="pf-weight">Weight (kg)</label><input class="text-input" id="pf-weight" inputmode="decimal" value="${esc(p.weightKg)}" placeholder="kg"></div>
      </div>
      <label class="field-label" for="pf-activity" style="margin-top:12px">Activity level</label>
      <select class="text-input" id="pf-activity">${opt(ACTIVITY, p.activity)}</select>
      <label class="field-label" for="pf-goal" style="margin-top:12px">Goal</label>
      <select class="text-input" id="pf-goal">${opt(GOAL_TYPES, p.goal)}</select>
      <button class="btn btn-primary btn-block" style="margin-top:14px" data-action="f-save-profile">Calculate &amp; save</button>
    </div>

    <div class="section-title">Daily goals</div>
    <div class="card">
      ${calc ? `<p class="goal-line">Calculated for you: <b>${calc.kcal} kcal</b> · protein ${calc.protein} g · carbs ${calc.carbs} g · fat ${calc.fat} g</p>` : '<p class="help" style="margin-top:0">Fill in your details above and save to get a personalised goal, or set your own below.</p>'}
      <div class="manual-grid">
        <div><label class="field-label" for="gl-kcal">Calories</label><input class="text-input" id="gl-kcal" inputmode="numeric" value="${goals.kcal}"></div>
        <div><label class="field-label" for="gl-protein">Protein (g)</label><input class="text-input" id="gl-protein" inputmode="numeric" value="${goals.protein}"></div>
        <div><label class="field-label" for="gl-carbs">Carbs (g)</label><input class="text-input" id="gl-carbs" inputmode="numeric" value="${goals.carbs}"></div>
        <div><label class="field-label" for="gl-fat">Fat (g)</label><input class="text-input" id="gl-fat" inputmode="numeric" value="${goals.fat}"></div>
      </div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn" data-action="f-save-goals">Use these goals</button>
        ${state.settings.goalOverride && calc ? '<button class="btn" data-action="f-reset-goals">Reset to calculated</button>' : ''}
      </div>
      <p class="help">Calculated with the Mifflin-St Jeor formula, ${GOAL_TYPES.lose[0]} kcal to lose, +${GOAL_TYPES.build[0]} kcal to build muscle. Protein is 2 g per kg bodyweight and fat is 25% of calories. These are estimates, so adjust them to how your body responds.</p>
    </div>
  `;
}

function saveProfile() {
  const num = (id) => parseFloat(String($(id).value).replace(',', '.'));
  const p = {
    sex: $('#pf-sex').value,
    age: num('#pf-age'),
    heightCm: num('#pf-height'),
    weightKg: num('#pf-weight'),
    activity: $('#pf-activity').value,
    goal: $('#pf-goal').value,
  };
  if (!(p.age >= 10 && p.age <= 100)) { toast('Enter an age between 10 and 100'); return; }
  if (!(p.heightCm >= 100 && p.heightCm <= 250)) { toast('Enter your height in cm'); return; }
  if (!(p.weightKg >= 30 && p.weightKg <= 300)) { toast('Enter your weight in kg'); return; }
  state.profile = p;
  state.settings.goalOverride = null;
  save();
  renderProfile();
  const g = calcGoals(p);
  toast(`Goal: ${g.kcal} kcal a day`);
}

function saveCustomGoals() {
  const num = (id) => Math.round(parseFloat(String($(id).value).replace(',', '.')));
  const g = { kcal: num('#gl-kcal'), protein: num('#gl-protein'), carbs: num('#gl-carbs'), fat: num('#gl-fat') };
  if (!(g.kcal >= 800 && g.kcal <= 10000)) { toast('Calories should be between 800 and 10,000'); return; }
  if ([g.protein, g.carbs, g.fat].some((x) => !(x >= 0 && x <= 1000))) { toast('Check the protein, carbs and fat numbers'); return; }
  state.settings.goalOverride = g;
  save();
  renderProfile();
  toast('Goals saved');
}
