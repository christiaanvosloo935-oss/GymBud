'use strict';

/* =========================================================
   Muscle group icons: a shaded anatomical figure with the target
   muscle glowing red-orange, drawn as pure SVG so it stays sharp.
   Gradients and the glow filter live in one shared <svg> in
   index.html (ids starting "mi-"); colours for lines are in
   style.css (.mi ...).
   The left side is drawn once and mirrored with sym().
   ========================================================= */

const sym = (c) => `${c}<g transform="matrix(-1 0 0 1 100 0)">${c}</g>`;
const path = (d, cls) => `<path d="${d}" class="${cls}"/>`;
const line = (x1, y1, x2, y2, cls) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const ell = (x, y, rx, ry, cls, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''} class="${cls}"/>`;
const rrect = (x, y, w, h, r, cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${cls}"/>`;
const curves = (list, cls) => list.map((d) => path(d, cls)).join('');

/** The grey, shaded figure. Front view shows collarbones, ab lines and kneecaps; back view shows the spine, shoulder blades and creases. */
function figure(back) {
  const front = !back;
  const details = front
    ? sym(curves(['M49.5 33 Q42 31.5 35.5 35', 'M50 55 Q42 58.5 34.5 52.5', 'M36 57 L40 59.5', 'M35.5 62 L39.5 64.5', 'M36 67 L40 69.5', 'M41.4 100 Q42.8 115 43.4 128', 'M37.5 137 Q39.5 155 40.5 172'], 'def') + ell(41.5, 131.8, 3.8, 3.2, 'def') + curves(['M17.5 75 Q19 90 17 103', 'M23 76 Q23.5 90 20.5 103'], 'def')) +
      line(50, 56, 50, 88, 'def') + [60, 69, 78].map((y) => line(44.5, y, 55.5, y, 'def')).join('') + ell(50, 84, 1, 1.5, 'def')
    : sym(curves(['M37.5 40 Q45 42 45.5 52 Q40 57 35.5 51 Q34.5 45 37.5 40 Z', 'M33.5 54 Q36.5 68 44.5 77', 'M30 36.5 Q38 33 49 30', 'M36.5 100 Q43 105.5 50 100', 'M41.5 108 Q42.5 118 42 127', 'M38 131.5 Q42 134.5 46 131.5', 'M42 137 Q41 150 41 160', 'M23.5 47 Q27 58 25 68'], 'def')) +
      path('M50 28 L50 90', 'spine') + line(50, 86, 50, 106, 'def');

  return [
    sym(path('M35.5 88 L50 92 Q48.4 112 46.6 131 Q42 134 37.6 131 Q33.6 112 35.5 88 Z', 'bf')),
    sym(path('M37.6 131 Q42 134 46.6 131 Q48 145 45.8 156 Q44.2 167 43.2 176 L38.6 176 Q37 165 36 154 Q35.4 142 37.6 131 Z', 'bf') + path('M38.6 176 L43.2 176 L44.2 183 L35 183 Q35 179 38.6 176 Z', 'bf')),
    sym(path('M17 72 L26.2 72 Q26.4 87 21.4 104 L14.6 104 Q14.8 87 17 72 Z', 'bf') + path('M14.6 104 L21.4 104 Q22.6 112 20.4 118.5 L15.4 118.5 Q13 111 14.6 104 Z', 'bf')),
    sym(path('M21 40 Q29.6 40 30.2 48 Q29 61 26.2 72 L17 72 Q16.6 56 21 40 Z', 'bf')),
    path('M44.4 20 L44 28.5 Q38 30.5 29.5 34.5 L70.5 34.5 Q62 30.5 56 28.5 L55.6 20 Z', 'bf'),
    sym(path('M50 30 L38 31 Q29.5 34 28 41 L31 53 Q33.4 63 36 71 Q37.6 79 36.4 90 L50 92.5 Z', 'bf')),
    sym(ell(27, 40.5, 7, 10.2, 'bf', 8)),
    ell(50, 12.5, 8.2, 10.4, 'bf'),
    details,
  ].join('');
}

const FIB = (cls, list) => curves(list, cls);

/** Highlighted muscles, drawn on top of the figure inside a glow. */
const hi = (c) => `<g filter="url(#mi-glow)">${c}</g>`;

// `box` is the [x, y, size] window that zooms onto the muscle
const MUSCLE_ICONS = {
  chest: {
    back: false, box: [10, 4, 80],
    hi: hi(sym(path('M49.6 36.5 Q41 32.5 33.4 39.5 Q31.2 48.5 37 53.2 Q44.4 55.4 49.6 50.5 Z', 'hf') +
      FIB('fib', ['M48.6 40 Q41 38.5 34.4 41.5', 'M48.8 44 Q41 43.5 33.6 46.6', 'M48.6 48 Q42 49 36 51']) + FIB('fibd', ['M48.4 42 Q41 41 34 44', 'M48.4 46 Q41.5 46.4 34.6 49']))),
  },
  back: {
    back: true, box: [10, 4, 80],
    hi: hi(sym(path('M50 25.5 L44 28.5 Q37.4 31.6 33.4 36.6 L36.4 45.6 Q31.6 58 36.6 72 Q42.6 80.6 50 83.4 Z', 'hf') +
      FIB('fib', ['M49 31 Q43 34.5 37.4 38', 'M49 38 Q43.4 41 38 46', 'M48.5 71 Q40 63 36.4 52', 'M48.5 78 Q39.5 70 36.6 60']) + FIB('fibd', ['M48.4 46 Q42.6 50 40 56', 'M48.6 63 Q41.6 57 38.6 50']))),
  },
  shoulders: {
    back: false, box: [8, 4, 84],
    hi: hi(sym(ell(27, 40.5, 7.4, 10.6, 'hf', 8) + FIB('fib', ['M25.5 31.5 Q22.5 40 24.6 50', 'M28.6 31 Q26.6 40 28 50.4', 'M31.6 33 Q31.6 41 31 49'] ) + FIB('fibd', ['M23.4 34 Q21.6 41 22.8 48', 'M30 32 Q29.6 40 29.8 50']))),
  },
  biceps: {
    back: false, box: [6, 12, 88],
    hi: hi(sym(path('M22.2 46 Q29 49 28.2 59 Q26.6 67.5 21.4 70.4 Q17.8 60 19.2 50 Z', 'hf') +
      FIB('fib', ['M23.2 48 Q25.6 58 22.8 68', 'M26 51 Q27 59 24.4 67.6']) + FIB('fibd', ['M20.6 51.5 Q21 60 21.6 68.6', 'M24.6 49.6 Q26.6 57 24.2 65']))),
  },
  triceps: {
    back: true, box: [6, 12, 88],
    hi: hi(sym(path('M20.4 45.5 Q29 47.5 28.8 59.5 Q27.2 69.5 21 71 Q17 58 20.4 45.5 Z', 'hf') +
      FIB('fib', ['M22.4 47 Q25 57 22.6 69', 'M25.6 49 Q26.8 58 24.6 67']) + FIB('fibd', ['M19.8 52 Q19.8 60 21 69', 'M23.8 48 Q23.8 58 23 68']))),
  },
  forearms: {
    back: false, box: [6, 38, 88],
    hi: hi(sym(path('M17.4 73 Q24.2 71.6 26 77 Q24.8 90.5 21.8 103 Q19 105.6 16.2 103 Q15.6 88 17.4 73 Z', 'hf') +
      FIB('fib', ['M19 76 Q18.4 90 18 102', 'M22.4 76.6 Q21.6 90 20 102']) + FIB('fibd', ['M20.6 75.4 Q20 90 19 102.4', 'M24 78.6 Q23.4 90 21 102']))),
  },
  core: {
    back: false, box: [14, 18, 72],
    hi: hi(sym(path('M41.6 50 Q35.4 62 37.4 80 Q39 82.6 42 83 L42 52 Z', 'hf2') + FIB('fibd', ['M40.4 54 Q37.4 64 38.4 78'])) +
      [51, 60.5, 70].map((y) => rrect(43.2, y, 6.2, 8.2, 2.6, 'hf') + rrect(50.6, y, 6.2, 8.2, 2.6, 'hf')).join('') + rrect(43.4, 79.2, 6, 7.2, 2.6, 'hf') + rrect(50.6, 79.2, 6, 7.2, 2.6, 'hf')),
  },
  glutes: {
    back: true, box: [12, 52, 76],
    hi: hi(sym(path('M50 85.5 Q38.4 82 35.4 91.6 Q35 102 43 105.4 Q50 104.4 50 96 Z', 'hf') + path('M39 82.4 Q45 80 50 84', 'hf2') +
      FIB('fib', ['M37.4 88 Q43 89 48 96', 'M36.6 94 Q41 95.6 45 102']) + FIB('fibd', ['M40 85 Q45 87 49 92', 'M38 99 Q42 100.6 46 103.6']))),
  },
  quads: {
    back: false, box: [12, 78, 76],
    hi: hi(sym(path('M36.6 94 Q34.2 112 38.6 128 Q42 131 45.6 128.4 Q48.8 112 48.6 98 Q43 92 36.6 94 Z', 'hf') +
      FIB('fib', ['M42.4 97 Q43.6 112 43 126', 'M38.4 100 Q37.6 113 39.8 125']) + FIB('fibd', ['M45 100 Q46.4 113 44.6 126', 'M40.4 98 Q40.6 112 41.6 126']))),
  },
  hamstrings: {
    back: true, box: [12, 78, 76],
    hi: hi(sym(path('M36.6 100 Q34.2 113 38.6 128 Q42 131 45.6 128.4 Q48.8 113 48.6 102 Q43 96 36.6 100 Z', 'hf') +
      FIB('fib', ['M42 102 Q43 114 42.4 126', 'M38.2 104 Q37.4 114 39.6 125']) + FIB('fibd', ['M45 104 Q46 115 44.4 126', 'M40 102 Q40.4 114 41.2 126']))),
  },
  calves: {
    back: true, box: [14, 112, 72],
    hi: hi(sym(path('M37.8 133.4 Q42 136.4 46.4 133.4 Q48.4 146 44.2 158 Q41.2 163 39.6 158.6 Q34.6 146 37.8 133.4 Z', 'hf') +
      FIB('fib', ['M40.6 138 Q41 148 41 158', 'M38 140.6 Q37.4 148 39 156']) + FIB('fibd', ['M43.4 138.4 Q44.4 148 42.6 157', 'M39.6 138 Q39.2 148 40 158']))),
  },
};

/** SVG string for a muscle group id, or '' if there's no icon for it. */
function muscleIcon(id) {
  const m = MUSCLE_ICONS[id];
  if (!m) return '';
  const [x, y, s] = m.box;
  return `<svg class="mi" viewBox="${x} ${y} ${s} ${s}" aria-hidden="true" focusable="false">${figure(m.back)}${m.hi}</svg>`;
}
