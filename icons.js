'use strict';

/* =========================================================
   Muscle group icons: a simple body figure with the target
   muscle highlighted and drawn with fibre lines. Pure SVG, so
   they stay sharp at any size and follow the app colours
   (see .mi in style.css).
   Left side is drawn once and mirrored with sym().
   Classes: bf/bs/bo body, def definition lines, hf/hf2 highlight,
   fib fibre lines, spine/dot back details.
   ========================================================= */

const sym = (c) => `${c}<g transform="matrix(-1 0 0 1 100 0)">${c}</g>`;
const line = (x1, y1, x2, y2, cls, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"${w ? ` stroke-width="${w}"` : ''}/>`;
const path = (d, cls) => `<path d="${d}" class="${cls}"/>`;
const circ = (x, y, r, cls) => `<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;
const ell = (x, y, rx, ry, cls, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''} class="${cls}"/>`;
const rrect = (x, y, w, h, r, cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${cls}"/>`;
/** A thick rounded limb with a slightly darker outline. */
const limb = (x1, y1, x2, y2, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w + 1.6}" stroke-linecap="round" class="bo"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w}" stroke-linecap="round" class="bs"/>`;

/** The grey figure. `back` swaps front details (collarbones, abs lines) for back ones (spine, shoulder blades). */
function figure(back) {
  const details = back
    ? [
      path('M50 31 L50 84', 'spine'),
      [37, 43, 49, 55, 61, 67, 73, 79].map((y) => circ(50, y, 1.1, 'dot')).join(''),
      sym(path('M49 31 L39 37', 'def') + path('M38 42 Q45 43 46 52 Q41 56 37 51', 'def') + path('M36 98 Q43 102 49 98', 'def') + line(36.5, 133, 43.5, 133, 'def')),
    ]
    : [
      sym(path('M37 34 Q43 31.5 49 34', 'def') + ell(40, 133, 4.4, 3.6, 'def')),
      line(50, 46, 50, 80, 'def'),
      [55, 64, 73].map((y) => line(43.5, y, 56.5, y, 'def')).join(''),
      circ(50, 78, 1.1, 'dot'),
    ];
  return [
    sym(limb(42, 90, 40, 130, 16) + limb(40, 136, 40, 172, 11) + ell(38, 177, 7, 3.6, 'bf')),
    sym(limb(25, 40, 20, 70, 11) + limb(20, 73, 17, 104, 9) + ell(16.5, 110, 4.6, 6, 'bf', 8) + ell(21.5, 107, 1.8, 4, 'bf', 14)),
    limb(50, 24, 50, 30, 6),
    '<path d="M31 32 Q50 27 69 32 L66 62 Q64 80 58 85 L42 85 Q36 80 34 62 Z" class="bf"/>',
    sym(circ(28, 36, 8, 'bf')),
    circ(50, 15, 9, 'bf'),
    ...details,
  ].join('');
}

/** Shapes drawn on top of the figure; `box` is the [x, y, size] view window that zooms onto the muscle. */
const MUSCLE_ICONS = {
  chest: {
    back: false, box: [10, 4, 80],
    hi: sym(path('M49.5 38 Q41 33 32 39.5 Q30 49 37 52.5 Q45 53 49.5 47 Z', 'hf') + line(48.5, 41, 34.5, 40.5, 'fib') + line(48.5, 44.5, 33.5, 45.5, 'fib') + line(47.5, 48, 36, 50.5, 'fib')),
  },
  back: {
    back: true, box: [10, 4, 80],
    hi: path('M50 30 L65 37 Q68 57 60 69 Q55 75 50 77 Q45 75 40 69 Q32 57 35 37 Z', 'hf')
      + sym(line(48, 72, 38, 51, 'fib') + line(48, 66, 36.5, 46, 'fib') + line(48, 60, 37, 41.5, 'fib') + line(49, 35, 41, 38, 'fib')) + path('M50 31 L50 80', 'spine-hi'),
  },
  shoulders: {
    back: false, box: [8, 4, 84],
    hi: sym(circ(28, 36, 9, 'hf') + path('M26 28.5 Q22.5 36 26 44', 'fib') + path('M29.5 28 Q27 36 30 44.5', 'fib') + path('M33 29.5 Q32 36 34 43', 'fib')),
  },
  biceps: {
    back: false, box: [6, 12, 88],
    hi: sym(ell(22.8, 56, 6, 12.5, 'hf', 6.8) + line(24.2, 46.5, 22.4, 65.5, 'fib') + path('M21.6 46 Q19 56 21 66', 'fib') + path('M26.4 47 Q26 57 23.8 66.5', 'fib')),
  },
  triceps: {
    back: true, box: [6, 12, 88],
    hi: sym(ell(22.8, 56, 6.4, 12.5, 'hf', 6.8) + path('M24.5 46 Q18.5 52 22.5 59 Q25.5 64 22.5 67', 'fib') + line(22, 47, 20.6, 57, 'fib') + line(25.4, 48, 24.2, 58, 'fib')),
  },
  forearms: {
    back: false, box: [6, 38, 88],
    hi: sym(path('M18 75 Q23 72 26.6 76 Q24.4 90 21.8 103 Q19.2 106 16.4 103 Q17 90 18 75 Z', 'hf') + line(21.2, 77.5, 19.4, 100, 'fib') + line(23.6, 79, 21, 100, 'fib')),
  },
  core: {
    back: false, box: [14, 18, 72],
    hi: sym(path('M42 50 Q36 60 38.5 76 L42 78 L42 52 Z', 'hf2'))
      + [47, 57, 67].map((y) => rrect(43, y, 6.3, 8.4, 2.4, 'hf') + rrect(50.7, y, 6.3, 8.4, 2.4, 'hf')).join('')
      + rrect(43, 76.6, 6.3, 8, 2.4, 'hf') + rrect(50.7, 76.6, 6.3, 8, 2.4, 'hf'),
  },
  glutes: {
    back: true, box: [12, 52, 76],
    hi: sym(ell(43.8, 91, 10, 9, 'hf') + path('M37 85.5 Q43 87 48 95', 'fib') + path('M36.5 91 Q41 92.5 45 99', 'fib') + path('M39 83 Q47 84 50 92', 'fib')),
  },
  quads: {
    back: false, box: [12, 78, 76],
    hi: sym(path('M35 96 Q33 112 38.5 126.5 Q42 129.5 45.5 126.5 Q50 112 48.5 96 Q42 91.5 35 96 Z', 'hf') + path('M43.5 96 Q44.5 112 43 125', 'fib') + path('M38.5 100 Q38.2 113 40 124', 'fib')),
  },
  hamstrings: {
    back: true, box: [12, 78, 76],
    hi: sym(path('M35 100 Q33 113 38.5 126.5 Q42 129.5 45.5 126.5 Q50 113 48.5 100 Q42 95.5 35 100 Z', 'hf') + path('M43 101 Q44 114 42.5 125', 'fib') + path('M39 103 Q38.5 114 40 124', 'fib')),
  },
  calves: {
    back: true, box: [14, 112, 72],
    hi: sym(ell(40, 148, 7.2, 13, 'hf') + line(40, 138, 40, 158, 'fib') + path('M36.5 142 Q35.5 149 38 156', 'fib') + path('M43.5 142 Q44.5 149 42 156', 'fib') + line(40, 160, 40, 172, 'def')),
  },
};

/** SVG string for a muscle group id, or '' if there's no icon for it. */
function muscleIcon(id) {
  const m = MUSCLE_ICONS[id];
  if (!m) return '';
  const [x, y, s] = m.box;
  return `<svg class="mi" viewBox="${x} ${y} ${s} ${s}" aria-hidden="true" focusable="false">${figure(m.back)}${m.hi}</svg>`;
}
