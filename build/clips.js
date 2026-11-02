// Step "clips": small animated diagrams for each step of a stitch lesson, drawn in
// code (no image files, no AI images). Style: thick outlined yarn, a pink hook,
// "YO" labels, the target stitch in blue and curved arrows that show the motion.
//
// stepClip(spec) uses the same spec as the old hook figures:
//   loops   – loops already on the hook          new  – loops just made (highlighted)
//   yo      – yarn over                           through – pull through this many loops
//   insert  – hook goes into the stitch below     fabric  – show the row below
//   ring    – magic ring instead of a row         hook:false – no hook (ring only)
//   cap     – caption / accessible label
// The SVG is a still diagram; when it scrolls into view the site script adds
// .is-playing and CSS animates the motion (see "Stitch lessons" in site.css).

const W = 300;
const H = 210;
const TIP = 44; // hook tip x

let uid = 0;

const tube = (d, cls = '', style = '') =>
  `<g class="${cls}"${style ? ` style="${style}"` : ''}><path d="${d}" class="t-o" pathLength="1"/><path d="${d}" class="t-i" pathLength="1"/></g>`;
const label = (x, y, text, cls = '', anchor = 'middle', style = '') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" class="c-label ${cls}"${style ? ` style="${style}"` : ''}>${text}</text>`;

export function stepClip(spec = {}) {
  const id = `ca${++uid}`;
  const arrow = (d, cls = '') => `<path d="${d}" class="c-arrow ${cls}" pathLength="1" marker-end="url(#${id})"/>`;

  const old = spec.loops || 0;
  const fresh = spec.new || 0;
  const total = old + fresh;
  const hasHook = spec.hook !== false;
  const through = spec.through ? Math.min(spec.through, Math.max(total, 1)) : 0;
  const ground = spec.ring || spec.fabric || spec.insert;

  // Layout: with a row below, the hook sits higher; otherwise it is centred.
  const Y = ground ? 84 : 104;
  const GAP = total > 5 ? 26 : 32;
  const LX = (i) => 104 + i * GAP;
  const WRAP = TIP + 30;
  const T = { x: 104, y: 178 }; // the stitch (or ring) the hook goes into

  let kind = 'idle';
  if (!hasHook) kind = 'ringform';
  else if (through) kind = 'through';
  else if (spec.insert) kind = 'insert';
  else if (fresh && spec.yo) kind = 'yo';
  else if (fresh) kind = 'pull';
  else if (spec.yo) kind = 'yo1';

  const loop = (x, half, cls, style) =>
    tube(half === 'back' ? `M${x} ${Y - 24}A10 24 0 0 0 ${x} ${Y + 24}` : `M${x} ${Y - 24}A10 24 0 0 1 ${x} ${Y + 24}`, `${cls}${half === 'back' ? ' c-back' : ''}`, style);

  const parts = [];
  parts.push(`<defs><marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="c-head"/></marker></defs>`);
  parts.push(`<rect width="${W}" height="${H}" rx="16" class="c-bg"/>`);

  // Ground: a row of stitches, or a magic ring.
  if (spec.ring) {
    parts.push(`<g class="c-ring">
      ${tube(`M${T.x - 74} ${T.y + 24} C ${T.x - 50} ${T.y + 26}, ${T.x - 36} ${T.y + 20}, ${T.x - 24} ${T.y + 10}`, 'f-tail')}
      ${tube(`M${T.x + 30} ${T.y} A30 22 0 1 1 ${T.x + 29.9} ${T.y - 1}`, 'f-ring')}
      ${tube(`M${T.x + 26} ${T.y + 12} C ${T.x + 60} ${T.y + 30}, ${T.x + 120} ${T.y + 8}, ${W + 10} ${T.y + 18}`, '')}
    </g>`);
  } else if (ground) {
    let s = '';
    for (let row = 1; row >= 0; row--) {
      const y = row ? T.y + 26 : T.y;
      for (let i = -1; i < 8; i++) {
        const cx = 24 + i * 40 + (row ? 20 : 0);
        const isT = !row && cx === T.x;
        s += `<ellipse cx="${cx}" cy="${y}" rx="24" ry="10" transform="rotate(-16 ${cx} ${y})" class="f-st${isT ? ' f-target' : ''}"/>`;
      }
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
    const style = (i) =>
      [`transform-origin:${LX(i)}px ${Y}px`, kind === 'through' && i >= through ? `--sx:${shift}px` : '', i < fresh ? `--d:${(fresh - 1 - i) * 0.45}s` : '']
        .filter(Boolean)
        .join(';');
    const wrapStyle = `transform-origin:${WRAP}px ${Y}px`;
    const withWrap = kind === 'through' || kind === 'yo1';

    const g = [];
    for (let i = 0; i < total; i++) g.push(loop(LX(i), 'back', role(i), style(i)));
    if (withWrap) g.push(loop(WRAP, 'back', 'c-wrap', wrapStyle));
    if (kind === 'through') g.push(loop(LX(0), 'back', 'c-result', `transform-origin:${LX(0)}px ${Y}px`));
    g.push(`<g class="c-hookshape"><path d="M${TIP} ${Y}H${W + 30}" class="h-o"/><path d="M${TIP} ${Y}H${W + 30}" class="h-i"/><path d="M${TIP + 34} ${Y - 5}H${W + 30}" class="h-hl"/><path d="M${TIP + 2} ${Y - 10}q13 1 20 10" class="h-notch"/></g>`);
    for (let i = 0; i < total; i++) g.push(loop(LX(i), 'front', role(i), style(i)));
    if (withWrap) g.push(loop(WRAP, 'front', 'c-wrap', wrapStyle));
    if (kind === 'through') g.push(loop(LX(0), 'front', 'c-result', `transform-origin:${LX(0)}px ${Y}px`));
    if (total) {
      const lx = LX(total - 1);
      g.push(tube(`M${lx + 8} ${Y + 20} C ${lx + 26} ${Y + 64}, ${lx + 70} ${Y + 56}, ${W + 20} ${Y + 80}`, kind === 'through' ? 'c-yarn c-rest' : 'c-yarn', kind === 'through' ? `--sx:${shift}px` : ''));
    }
    parts.push(`<g class="c-hookg">${g.join('')}</g>`);

    // Arrows and words for this step.
    if (kind === 'insert') {
      parts.push(arrow(`M${TIP - 6} ${Y + 18} C ${TIP - 30} ${Y + 60}, ${T.x - 70} ${T.y - 8}, ${T.x - 18} ${T.y - 12}`, 'c-a1'));
      parts.push(label(8, Y - 20, 'insert', 'c-l1', 'start'));
    }
    if (kind === 'pull') {
      const tx = LX(fresh - 1) + 16;
      parts.push(arrow(`M${T.x + 26} ${T.y - 12} C ${T.x + 56} ${T.y - 44}, ${tx + 30} ${Y + 50}, ${tx + 2} ${Y + 28}`, 'c-a1'));
      parts.push(label(10, T.y - 34, 'pull up a loop', 'c-l1', 'start'));
    }
    if (kind === 'yo' || kind === 'yo1') {
      const xs = kind === 'yo' ? Array.from({ length: fresh }, (_, i) => LX(i)) : [WRAP];
      xs.forEach((x, i) => parts.push(label(x, Y - 34, 'YO', 'c-yo', 'middle', kind === 'yo' ? `--d:${(fresh - 1 - i) * 0.45}s` : '')));
      parts.push(arrow(`M${TIP + 6} ${Y + 44} C ${TIP - 34} ${Y + 34}, ${TIP - 30} ${Y - 34}, ${TIP + 10} ${Y - 36}`, 'c-a1'));
    }
    if (kind === 'through') {
      const endX = LX(through - 1) + 18;
      parts.push(label(WRAP, Y - 34, 'YO', 'c-yo c-yo-th'));
      parts.push(arrow(`M${WRAP + 14} ${Y - 30} C ${WRAP + 34} ${Y - 70}, ${endX - 8} ${Y - 72}, ${endX} ${Y - 32}`, 'c-a2'));
      const word = through === total && through > 2 ? 'all' : String(through);
      parts.push(label((WRAP + endX) / 2 + 10, Y - 70, `pull through ${word}`, 'c-l2'));
    }
    if (total) {
      const after = kind === 'through' ? total - through + 1 : total;
      const by = ground ? 10 : H - 34;
      const txt = (n) => `${n} loop${n === 1 ? '' : 's'}`;
      parts.push(`<g class="c-badge"><rect x="${W - 92}" y="${by}" width="80" height="24" rx="12"/>${label(W - 52, by + 16.5, txt(total), 'c-count c-before')}${kind === 'through' ? label(W - 52, by + 16.5, txt(after), 'c-count c-after') : ''}</g>`);
    }
  } else {
    parts.push(label(T.x + 76, T.y - 52, 'magic ring', 'c-l1', 'start'));
    parts.push(arrow(`M${T.x + 72} ${T.y - 56} C ${T.x + 46} ${T.y - 72}, ${T.x + 24} ${T.y - 56}, ${T.x + 18} ${T.y - 32}`, 'c-a1'));
  }

  const cap = spec.cap || (total ? `${total} loop${total === 1 ? '' : 's'} on the hook` : 'Crochet step');
  const vars = `--ix:${T.x - 6 - TIP}px;--iy:${T.y - 12 - Y}px;--ry:${T.y - Y}px`;
  return `<svg class="clip k-${kind}" viewBox="0 0 ${W} ${H}" style="${vars}" role="img" aria-label="${cap.replace(/"/g, '&quot;')}" focusable="false">${parts.join('')}</svg>`;
}
