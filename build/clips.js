// Step "clips": small animated diagrams for each step of a stitch lesson, drawn in
// code (no image files, no AI images). Look: a big pink hook at a slant, yarn drawn
// as a twisted rope (white plies with a dark outline), the loops coiled around the
// hook, the row below as a braided chain with the target stitch in blue, "YO"
// labels and thin curved arrows that show where the hook goes.
//
// stepClip(spec) – spec as used in the stitch pages:
//   loops   – loops already on the hook          new  – loops just made (highlighted)
//   yo      – yarn over                           through – pull through this many loops
//   insert  – hook goes into the stitch below     fabric  – show the row below
//   ring    – magic ring instead of a row         hook:false – no hook (ring only)
//   cap     – caption / accessible label
// When the clip scrolls into view the site script adds .is-playing and the CSS in
// site.css ("Stitch lessons") animates the step, then repeats.

const W = 320;
const H = 220;
const ANG = -13; // hook slant in degrees (tip on the left, handle up to the right)
const RAD = (ANG * Math.PI) / 180;
const YARN = 13; // rope thickness
const r1 = (n) => Math.round(n * 10) / 10;

let uid = 0;

// ---------- Geometry helpers ----------
function bezier(p0, p1, p2, p3, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

// Points around a tilted ellipse from angle a0 to a1 (degrees).
function arc(cx, cy, rx, ry, tilt, a0, a1, n) {
  const tr = (tilt * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(tr) - y * Math.sin(tr), cy + x * Math.sin(tr) + y * Math.cos(tr)]);
  }
  return pts;
}

// A twisted rope through the points: overlapping "plies" with a dark outline,
// alternating slightly to each side so the strand looks spun.
function rope(pts, cls = '', w = YARN) {
  let s = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const a = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    const side = i % 2 ? 1 : -1;
    const nx = (-(y1 - y0) / (len || 1)) * side * w * 0.06;
    const ny = ((x1 - x0) / (len || 1)) * side * w * 0.06;
    const cx = (x0 + x1) / 2 + nx;
    const cy = (y0 + y1) / 2 + ny;
    s += `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(len * 0.62 + 2)}" ry="${r1(w / 2)}" transform="rotate(${r1(a + side * 14)} ${r1(cx)} ${r1(cy)})" style="--i:${i}"/>`;
  }
  return `<g class="rope ${cls}">${s}</g>`;
}

// Hook coordinates: x along the shaft from the tip, y across it.
const onHook = (tip, x, y = 0) => [tip[0] + x * Math.cos(RAD) - y * Math.sin(RAD), tip[1] + x * Math.sin(RAD) + y * Math.cos(RAD)];

// ---------- The clip ----------
export function stepClip(spec = {}) {
  const id = `ca${++uid}`;
  const old = spec.loops || 0;
  const fresh = spec.new || 0;
  const total = old + fresh;
  const hasHook = spec.hook !== false;
  const through = spec.through ? Math.min(spec.through, Math.max(total, 1)) : 0;
  const ground = !!(spec.ring || spec.fabric || spec.insert);

  let kind = 'idle';
  if (!hasHook) kind = 'ringform';
  else if (through) kind = 'through';
  else if (spec.insert) kind = 'insert';
  else if (fresh && spec.yo) kind = 'yo';
  else if (fresh) kind = 'pull';
  else if (spec.yo) kind = 'yo1';

  const tip = ground ? [62, 96] : [58, 122];
  const GAP = total > 5 ? 26 : 32;
  const LX = (i) => 50 + i * GAP; // loop position along the hook
  const WRAPX = 20; // a fresh yarn over sits in the throat of the hook
  const T = { x: 120, y: 186 }; // the stitch (or ring centre) the hook goes into

  const arrow = (d, cls = '') => `<path d="${d}" class="c-arrow ${cls}" pathLength="1" marker-end="url(#${id})"/>`;
  const label = (x, y, text, cls = '', anchor = 'middle', style = '') =>
    `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" class="c-label ${cls}"${style ? ` style="${style}"` : ''}>${text}</text>`;

  const parts = [];
  parts.push(`<defs><marker id="${id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="c-head"/></marker></defs>`);
  parts.push(`<rect width="${W}" height="${H}" rx="16" class="c-bg"/>`);

  // ---- Ground: braided chain row, or a magic ring ----
  if (spec.ring) {
    // Without a hook the ring is the whole picture, so draw it big and centred.
    const R = hasHook ? { x: T.x, y: T.y, rx: 36, ry: 22, n: 11 } : { x: 150, y: 120, rx: 58, ry: 36, n: 15 };
    parts.push(`<g class="c-ring">`);
    parts.push(rope(bezier([-10, R.y + R.ry + 4], [30, R.y + R.ry + 6], [R.x - R.rx - 10, R.y + R.ry], [R.x - R.rx + 6, R.y + 10], 5), 'f-tail'));
    parts.push(rope(arc(R.x, R.y, R.rx, R.ry, -6, 200, 560, R.n), 'f-ring', YARN));
    parts.push(rope(bezier([R.x + R.rx - 6, R.y + 12], [R.x + R.rx + 30, R.y + R.ry + 10], [R.x + R.rx + 100, R.y + 4], [W + 20, R.y + 16], 6), 'f-tail2'));
    parts.push(`</g>`);
  } else if (ground) {
    let s = '';
    for (let i = -1; i < 9; i++) {
      const cx = T.x + (i - 2) * 36;
      const tgt = i === 2;
      s += `<g class="f-st${tgt ? ' f-target' : ''}"><ellipse cx="${cx - 7}" cy="${T.y - 5}" rx="21" ry="8.5" transform="rotate(-20 ${cx - 7} ${T.y - 5})"/><ellipse cx="${cx + 7}" cy="${T.y + 6}" rx="21" ry="8.5" transform="rotate(20 ${cx + 7} ${T.y + 6})"/></g>`;
    }
    parts.push(`<g class="c-fabric">${s}</g>`);
  }

  if (hasHook) {
    const shift = through ? -(through - 1) * GAP : 0;
    const role = (i) => {
      if (kind === 'through' && i < through) return 'c-gone';
      if (kind === 'through') return 'c-old c-rest';
      if (i < fresh) return kind === 'pull' ? 'c-new c-rise' : 'c-new c-wrapnew';
      return 'c-old';
    };
    const delay = (i) => (i < fresh ? `--d:${((fresh - 1 - i) * 0.5).toFixed(2)}s` : '');
    const vars = (i) => [kind === 'through' && i >= through ? `--sx:${shift}px` : '', delay(i)].filter(Boolean).join(';');

    // One loop coiled around the shaft: back half behind the hook, front half over it.
    const coil = (x, half) => rope(arc(x, 0, 10, 22, 24, half === 'back' ? 90 : -90, half === 'back' ? 270 : 90, 4), half === 'back' ? 'c-backrope' : '');
    const loopG = (x, half, cls, style) => `<g class="c-loop ${cls}"${style ? ` style="${style}"` : ''}>${coil(x, half)}</g>`;
    const withWrap = kind === 'through' || kind === 'yo1';

    const local = [];
    for (let i = 0; i < total; i++) local.push(loopG(LX(i), 'back', role(i), vars(i)));
    if (withWrap) local.push(loopG(WRAPX, 'back', 'c-wrap', ''));
    if (kind === 'through') local.push(loopG(LX(0), 'back', 'c-result', ''));
    // The hook: dark outline, pink body, light stripe, and the throat notch at the tip.
    local.push(`<g class="c-hookshape"><path d="M0 0H420" class="h-o"/><path d="M0 0H420" class="h-i"/><path d="M26 -6H420" class="h-hl"/><path d="M5 -14Q14 2 27 -14" class="h-notch"/></g>`);
    for (let i = 0; i < total; i++) local.push(loopG(LX(i), 'front', role(i), vars(i)));
    if (withWrap) local.push(loopG(WRAPX, 'front', 'c-wrap', ''));
    if (kind === 'through') local.push(loopG(LX(0), 'front', 'c-result', ''));
    // Working yarn from the last loop down and away to the right.
    if (total) {
      const lx = LX(total - 1) + 4;
      const yarn = rope(bezier([lx, 20], [lx + 14, 70], [lx + 70, 74], [lx + 190, 96], 8));
      local.push(`<g class="c-yarn${kind === 'through' ? ' c-rest' : ''}"${kind === 'through' ? ` style="--sx:${shift}px"` : ''}>${yarn}</g>`);
    }
    parts.push(`<g class="c-hookg"><g transform="translate(${tip[0]} ${tip[1]}) rotate(${ANG})">${local.join('')}</g></g>`);

    // ---- Arrows and words ----
    if (kind === 'insert') {
      parts.push(arrow(`M${tip[0] - 14} ${tip[1] + 14} C ${tip[0] - 40} ${tip[1] + 60}, ${T.x - 70} ${T.y - 10}, ${T.x - 26} ${T.y - 12}`, 'c-a1'));
      parts.push(label(10, tip[1] - 28, 'insert here', 'c-l1', 'start'));
    }
    if (kind === 'pull') {
      const [lx, ly] = onHook(tip, LX(fresh - 1), 20);
      parts.push(arrow(`M${T.x + 22} ${T.y - 14} C ${T.x + 50} ${T.y - 40}, ${lx + 26} ${ly + 40}, ${lx + 8} ${ly + 8}`, 'c-a1'));
      parts.push(label(10, T.y - 40, 'pull up a loop', 'c-l1', 'start'));
    }
    if (kind === 'yo' || kind === 'yo1') {
      const xs = kind === 'yo' ? Array.from({ length: fresh }, (_, i) => LX(i)) : [WRAPX];
      xs.forEach((x, i) => {
        const [px, py] = onHook(tip, x, -30);
        parts.push(label(px, py, 'YO', 'c-yo', 'middle', kind === 'yo' ? `--d:${((fresh - 1 - i) * 0.5).toFixed(2)}s` : ''));
      });
      parts.push(arrow(`M${tip[0] + 10} ${tip[1] + 34} C ${tip[0] - 30} ${tip[1] + 30}, ${tip[0] - 34} ${tip[1] - 26}, ${tip[0] + 2} ${tip[1] - 34}`, 'c-a1'));
    }
    if (kind === 'through') {
      const [wx, wy] = onHook(tip, WRAPX, -30);
      const [ex, ey] = onHook(tip, LX(through - 1) + 12, -24);
      parts.push(label(wx - 4, wy, 'YO', 'c-yo c-yo-th'));
      parts.push(arrow(`M${wx + 12} ${wy - 4} C ${wx + 30} ${wy - 40}, ${ex - 10} ${ey - 44}, ${ex} ${ey - 4}`, 'c-a2'));
      const word = through === total && through > 2 ? 'all' : String(through);
      parts.push(label((wx + ex) / 2 + 8, Math.min(wy, ey) - 36, `pull through ${word}`, 'c-l2'));
    }
    if (total) {
      const after = kind === 'through' ? total - through + 1 : total;
      const by = H - 34;
      const txt = (n) => `${n} loop${n === 1 ? '' : 's'} on hook`;
      parts.push(`<g class="c-badge"><rect x="${W - 124}" y="${by}" width="112" height="24" rx="12"/>${label(W - 68, by + 16.5, txt(total), 'c-count c-before')}${kind === 'through' ? label(W - 68, by + 16.5, txt(after), 'c-count c-after') : ''}</g>`);
    }
  } else {
    parts.push(label(206, 40, 'magic ring', 'c-l1', 'start'));
    parts.push(arrow(`M200 36 C 170 24, 150 36, 150 70`, 'c-a1'));
  }

  // Motion distances for the CSS (hook dives into the stitch; new loop rises from it).
  // The rising loop lives inside the slanted hook group, so turn its distance into
  // the hook's own direction.
  const [l0x, l0y] = onHook(tip, LX(0), 0);
  const dx = T.x - l0x;
  const dy = T.y - l0y;
  const rx = dx * Math.cos(-RAD) - dy * Math.sin(-RAD);
  const ry = dx * Math.sin(-RAD) + dy * Math.cos(-RAD);
  const vars = `--ix:${r1(T.x - 18 - tip[0])}px;--iy:${r1(T.y - 14 - tip[1])}px;--rx:${r1(rx)}px;--ry:${r1(ry)}px`;
  const cap = spec.cap || (total ? `${total} loop${total === 1 ? '' : 's'} on the hook` : 'Crochet step');
  return `<svg class="clip k-${kind}" viewBox="0 0 ${W} ${H}" style="${vars}" role="img" aria-label="${cap.replace(/"/g, '&quot;')}" focusable="false">${parts.join('')}</svg>`;
}
