'use strict';

/* =========================================================
   Muscle group icons: a simple body figure with the target
   muscle highlighted. Pure SVG, so they stay sharp at any size
   and follow the app colours (see .mi in style.css).
   Classes: bf/bs = body fill/stroke, hf/hs = highlight fill/stroke.
   ========================================================= */

const line = (x1, y1, x2, y2, w, cls) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w}" stroke-linecap="round" class="${cls}"/>`;
const circ = (x, y, r, cls) => `<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;
const ell = (x, y, rx, ry, cls, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${rot ? `transform="rotate(${rot} ${x} ${y})"` : ''} class="${cls}"/>`;
const rrect = (x, y, w, h, r, cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${cls}"/>`;
const mirror = (fn) => fn(1) + fn(-1);
const mx = (x, s) => (s === 1 ? x : 100 - x); // mirror an x coordinate around the centre line

/** The grey figure; `back` adds a spine so front and back views are easy to tell apart. */
function figure(back) {
  return [
    circ(50, 15, 9, 'bf'),
    line(50, 24, 50, 30, 6, 'bs'),
    '<path d="M31 32 Q50 27 69 32 L66 62 Q64 80 58 85 L42 85 Q36 80 34 62 Z" class="bf"/>',
    mirror((s) => circ(mx(28, s), 36, 8, 'bf')),
    mirror((s) => line(mx(25, s), 40, mx(20, s), 70, 11, 'bs')),
    mirror((s) => line(mx(20, s), 73, mx(17, s), 104, 9, 'bs')),
    mirror((s) => circ(mx(16, s), 109, 5, 'bf')),
    mirror((s) => line(mx(42, s), 90, mx(40, s), 130, 16, 'bs')),
    mirror((s) => line(mx(40, s), 136, mx(40, s), 172, 11, 'bs')),
    mirror((s) => ell(mx(38, s), 177, 7, 3.5, 'bf')),
    back ? '<path d="M50 33 L50 82" class="spine"/>' : '',
  ].join('');
}

// [view box x, y, size] zooms each icon onto its muscle
const MUSCLE_ICONS = {
  chest: { back: false, box: [10, 4, 80], hi: ell(41, 43, 10.5, 8.5, 'hf', 8) + ell(59, 43, 10.5, 8.5, 'hf', -8) },
  back: { back: true, box: [10, 4, 80], hi: '<path d="M33 37 Q50 31 67 37 L64 62 Q57 73 50 77 Q43 73 36 62 Z" class="hf"/>' },
  shoulders: { back: false, box: [8, 4, 84], hi: mirror((s) => circ(mx(28, s), 36, 9, 'hf')) },
  biceps: { back: false, box: [6, 12, 88], hi: mirror((s) => line(mx(24, s), 45, mx(21.5, s), 66, 10.5, 'hs')) },
  triceps: { back: true, box: [6, 12, 88], hi: mirror((s) => line(mx(24, s), 45, mx(21.5, s), 66, 10.5, 'hs')) },
  forearms: { back: false, box: [6, 38, 88], hi: mirror((s) => line(mx(20, s), 75, mx(17.5, s), 102, 9, 'hs')) },
  core: {
    back: false, box: [14, 18, 72],
    hi: [48, 58, 68].map((y) => rrect(43, y - 6, 6.2, 8.4, 2.4, 'hf') + rrect(50.8, y - 6, 6.2, 8.4, 2.4, 'hf')).join('') + rrect(43, 74, 6.2, 8, 2.4, 'hf') + rrect(50.8, 74, 6.2, 8, 2.4, 'hf'),
  },
  glutes: { back: true, box: [12, 52, 76], hi: mirror((s) => circ(mx(43, s), 90, 10, 'hf')) },
  quads: { back: false, box: [12, 78, 76], hi: mirror((s) => line(mx(42, s), 95, mx(40.5, s), 125, 14, 'hs')) },
  hamstrings: { back: true, box: [12, 78, 76], hi: mirror((s) => line(mx(42, s), 95, mx(40.5, s), 125, 14, 'hs')) },
  calves: { back: true, box: [14, 112, 72], hi: mirror((s) => ell(mx(40, s), 148, 6.5, 13, 'hf')) },
};

/** SVG string for a muscle group id, or '' if there's no icon for it. */
function muscleIcon(id) {
  const m = MUSCLE_ICONS[id];
  if (!m) return '';
  const [x, y, s] = m.box;
  return `<svg class="mi" viewBox="${x} ${y} ${s} ${s}" aria-hidden="true" focusable="false">${figure(m.back)}${m.hi}</svg>`;
}
