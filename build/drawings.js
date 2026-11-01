// SVG drawings, made in code (no image files, no AI images).
//
//   hookFigure(spec)  – a hook with loops on it, for stitch step-by-step pages
//   miniChart(name)   – tiny chart-style diagrams (increase, decrease, loops…)
//   symbol(name)      – one chart symbol, used in the stitch "facts" box
//   roundChart(rounds)– a round chart built from a pattern's data
//   sunflowerArt()    – illustration used until the real photo is added
//
// Colours come from CSS classes (see site.css "Drawings"), so every drawing
// follows light and dark mode automatically.

const f = (n) => Math.round(n * 10) / 10;
const svg = (w, h, body, label, cls = '') =>
  `<svg class="fig ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label.replace(/"/g, '&quot;')}" focusable="false">${body}</svg>`;

// Arrow head as a marker on each arrow path (defined per drawing so SVGs stay standalone).
let markerId = 0;
const arrowDefs = () => {
  const id = `ah${++markerId}`;
  return {
    id,
    defs: `<defs><marker id="${id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="d-arrow-head"/></marker></defs>`,
  };
};

// ---------- Hook figure ----------
// spec: { loops, new, yo, through, insert, fabric, ring, hook:false, cap }
//   loops   – loops already on the hook (yarn colour)
//   new     – loops just made, drawn nearest the tip in the highlight colour
//   yo      – show a "yarn over" wrap arrow at the tip
//   through – arrow that pulls the yarn through this many loops (nearest the tip)
//   insert  – arrow from the hook tip into the stitch below
//   fabric  – draw the stitches of the row below
//   ring    – draw a magic ring under the hook
export function hookFigure(spec = {}) {
  const { id, defs } = arrowDefs();
  const old = spec.loops || 0;
  const fresh = spec.new || 0;
  const total = old + fresh;
  const gap = total > 5 ? 15 : 18;
  const tipX = 34;
  const firstX = 66;
  const y = 50;
  const parts = [defs];

  // Row of stitches below (top "V" of each stitch, seen from the side).
  if (spec.fabric || spec.insert) {
    for (let i = 0; i < 7; i++) {
      const cx = 24 + i * 32;
      const target = i === 1;
      parts.push(`<ellipse cx="${cx}" cy="104" rx="13" ry="6" class="${target ? 'd-target' : 'd-fabric'}"/>`);
      parts.push(`<path d="M${cx - 9} 109v12M${cx + 9} 109v12" class="d-fabric-post"/>`);
    }
  }
  if (spec.ring) {
    parts.push(`<circle cx="70" cy="100" r="20" class="d-ring"/><path d="M88 108c22 6 40 6 70 4" class="d-yarn"/><path d="M54 112c-14 8-26 10-40 10" class="d-yarn d-tail"/>`);
  }

  if (spec.hook !== false) {
    // Loops behind the shaft (back half), then the hook, then the front half.
    const loopX = (i) => firstX + i * gap;
    for (let i = 0; i < total; i++) {
      const cls = i < fresh ? 'd-new' : 'd-yarn';
      parts.push(`<path d="M${loopX(i)} ${y - 15}a7 15 0 0 1 0 30" class="${cls} d-back"/>`);
    }
    parts.push(
      `<path d="M${tipX} ${y}H238" class="d-hook"/><path d="M${tipX + 1} ${y - 1}l9 -10" class="d-hook d-hook-tip"/><path d="M196 ${y}H244" class="d-hook d-grip"/>`,
    );
    for (let i = 0; i < total; i++) {
      const cls = i < fresh ? 'd-new' : 'd-yarn';
      parts.push(`<path d="M${loopX(i)} ${y + 15}a7 15 0 0 1 0 -30" class="${cls}"/>`);
    }
    // Working yarn leaving the last loop.
    if (total) parts.push(`<path d="M${loopX(total - 1) + 4} ${y + 14}c10 18 26 26 52 30" class="d-yarn d-tail"/>`);

    if (spec.yo) {
      parts.push(`<path d="M${tipX + 30} ${y + 34}C${tipX - 6} ${y + 30} ${tipX - 6} ${y - 30} ${tipX + 22} ${y - 24}" class="d-arrow" marker-end="url(#${id})"/>`);
      parts.push(`<text x="${tipX - 24}" y="${y - 22}" class="d-label">yo</text>`);
    }
    if (spec.through) {
      const n = Math.min(spec.through, Math.max(total, 1));
      const endX = firstX + (n - 1) * gap + 14;
      parts.push(`<path d="M${tipX + 6} ${y - 8}C${tipX + 20} ${y - 40} ${endX - 10} ${y - 40} ${endX} ${y - 18}" class="d-arrow" marker-end="url(#${id})"/>`);
      parts.push(`<text x="${(tipX + endX) / 2 - 8}" y="${y - 36}" class="d-label">${n === total && n > 2 ? 'all' : n}</text>`);
    }
    if (spec.insert) {
      parts.push(`<path d="M${tipX} ${y + 10}C${tipX - 4} ${y + 30} ${tipX + 10} ${y + 44} ${tipX + 20} ${y + 50}" class="d-arrow" marker-end="url(#${id})"/>`);
    }
  }

  const label = spec.cap || (total ? `${total} loop${total === 1 ? '' : 's'} on the hook` : 'Crochet step');
  return svg(250, 130, parts.join(''), label, 'fig-hook');
}

// ---------- Chart symbols ----------
// Each symbol is drawn with its base at (0,0) growing "up" (negative y) to height L.
function sym(name, L) {
  const stem = (h = L) => `<path d="M0 0V${-h}"/>`;
  const bar = (h = L, w = 6) => `<path d="M${-w} ${-h}H${w}"/>`;
  const slash = (at) => `<path d="M-4.5 ${f(-at + 3)}L4.5 ${f(-at - 3)}"/>`;
  switch (name) {
    case 'ch':
      return `<ellipse cx="0" cy="${f(-L / 2)}" rx="3" ry="${f(Math.min(L / 2 - 0.5, 6))}"/>`;
    case 'slst':
      return `<ellipse cx="0" cy="-3" rx="3.4" ry="2.6" class="d-fill"/>`;
    case 'sc': {
      const s = Math.min(L * 0.3, 6.5);
      const c = -L / 2;
      return `<path d="M${-s} ${f(c - s)}L${s} ${f(c + s)}M${s} ${f(c - s)}L${-s} ${f(c + s)}"/>`;
    }
    case 'hdc':
      return stem() + bar();
    case 'dc':
      return stem() + bar() + slash(L * 0.55);
    case 'tr':
      return stem() + bar() + slash(L * 0.45) + slash(L * 0.68);
    case 'picot':
      return `<circle cx="0" cy="${f(-L / 2)}" r="${f(L / 2)}"/><ellipse cx="0" cy="0" rx="2.6" ry="2" class="d-fill"/>`;
    case 'mr':
      return `<circle cx="0" cy="${f(-L / 2)}" r="${f(L / 2)}"/>`;
    case 'puff':
      return `<path d="M0 0C-8 ${f(-L * 0.3)} -8 ${f(-L * 0.75)} 0 ${-L}C8 ${f(-L * 0.75)} 8 ${f(-L * 0.3)} 0 0Z"/>` + bar(L, 5);
    case 'bobble':
      return (
        `<path d="M0 0C-9 ${f(-L * 0.3)} -9 ${f(-L * 0.75)} 0 ${-L}C9 ${f(-L * 0.75)} 9 ${f(-L * 0.3)} 0 0Z"/>` +
        stem() + bar(L, 5) + slash(L * 0.5)
      );
    case 'popcorn': {
      const xs = [-9, -4.5, 0, 4.5, 9];
      return (
        xs.map((x) => `<path d="M0 0L${x} ${f(-L * 0.85)}"/>`).join('') +
        `<path d="M-10 ${f(-L * 0.85)}Q0 ${f(-L * 1.05)} 10 ${f(-L * 0.85)}"/><ellipse cx="0" cy="${f(-L * 0.85)}" rx="10" ry="3.2"/>`
      );
    }
    case 'cluster':
      return [-10, 0, 10].map((x) => `<path d="M${x} 0L0 ${-L}"/><path d="M${f(x * 0.45 - 4)} ${f(-L * 0.55 + 3)}L${f(x * 0.45 + 4)} ${f(-L * 0.55 - 3)}"/>`).join('') + bar(L, 5);
    default:
      return stem();
  }
}

// Place a symbol so its base sits at (x0,y0) and its top points at (x1,y1).
function place(name, x0, y0, x1, y1, cls = '') {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const deg = (Math.atan2(x1 - x0, -(y1 - y0)) * 180) / Math.PI;
  return `<g class="sym ${cls}" transform="translate(${f(x0)} ${f(y0)}) rotate(${f(deg)})">${sym(name, f(L))}</g>`;
}

const SYMBOL_NAMES = {
  ch: 'chain',
  slst: 'slip stitch',
  sc: 'single crochet',
  hdc: 'half double crochet',
  dc: 'double crochet',
  tr: 'treble crochet',
  picot: 'picot (chain and slip stitch at the tip)',
  mr: 'magic ring',
  puff: 'puff stitch',
  bobble: 'bobble stitch',
  popcorn: 'popcorn stitch',
  cluster: 'cluster (3 stitches together)',
};

export function symbol(name) {
  const L = { ch: 20, slst: 10, mr: 22, picot: 14 }[name] || 34;
  const h = 46;
  return svg(40, h, `<g transform="translate(20 ${name === 'slst' ? h / 2 + 3 : h - 6})" class="sym">${sym(name, L)}</g>`, `Chart symbol for ${SYMBOL_NAMES[name] || name}`, 'fig-symbol');
}

// ---------- Mini charts ----------
const baseRow = (n, y, gap, x0) =>
  Array.from({ length: n }, (_, i) => place('sc', x0 + i * gap, y + 26, x0 + i * gap, y, 'd-old')).join('');

export function miniChart(name) {
  const { id, defs } = arrowDefs();
  const W = 220;
  const H = 120;
  let body = '';
  let label = '';
  switch (name) {
    case 'chain':
      body = Array.from({ length: 6 }, (_, i) => `<g class="sym" transform="translate(${30 + i * 32} 66) rotate(90)">${sym('ch', 22)}</g>`).join('');
      body += `<path d="M196 66h14" class="d-yarn"/>`;
      label = 'A row of six chains, each one an oval';
      break;
    case 'inc-a':
      body = baseRow(5, 80, 40, 30) + place('sc', 70, 78, 70, 46, 'd-new');
      body += `<path d="M100 20C88 26 84 34 80 42" class="d-arrow" marker-end="url(#${id})"/><text x="104" y="24" class="d-label">same st</text>`;
      label = 'One single crochet made; the hook goes back into the same stitch';
      break;
    case 'inc':
      body = baseRow(5, 80, 40, 30);
      body += place('sc', 30, 78, 30, 46, 'd-old') + place('sc', 70, 78, 58, 46, 'd-new') + place('sc', 70, 78, 82, 46, 'd-new');
      body += place('sc', 110, 78, 110, 46, 'd-old') + place('sc', 150, 78, 150, 46, 'd-old') + place('sc', 190, 78, 190, 46, 'd-old');
      label = 'Increase: two single crochets sit on top of one stitch, like a V';
      break;
    case 'dec':
      body = baseRow(5, 80, 40, 30);
      body += place('sc', 30, 78, 30, 46, 'd-old') + place('sc', 70, 78, 90, 46, 'd-new') + place('sc', 110, 78, 90, 46, 'd-new');
      body += place('sc', 150, 78, 150, 46, 'd-old') + place('sc', 190, 78, 190, 46, 'd-old');
      label = 'Decrease: two stitches below are joined into one stitch on top, like an upside-down V';
      break;
    case 'mr6': {
      body = `<circle cx="110" cy="60" r="12" class="d-ring"/>`;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        body += place('sc', 110 + Math.sin(a) * 14, 60 - Math.cos(a) * 14, 110 + Math.sin(a) * 44, 60 - Math.cos(a) * 44, 'd-new');
      }
      label = 'Six single crochets worked into the magic ring';
      break;
    }
    case 'fan5':
      body = baseRow(5, 92, 40, 30);
      for (const dx of [-24, -12, 0, 12, 24]) body += place('dc', 110, 92, 110 + dx, 30, 'd-new');
      label = 'Five double crochets fanned out from one stitch';
      break;
    case 'loops':
    case 'blo':
    case 'flo': {
      // Tops of three stitches seen from above: back strand (far) and front strand (near).
      for (let i = 0; i < 3; i++) {
        const cx = 50 + i * 60;
        const mid = i === 1;
        const back = mid && name === 'blo' ? 'd-target-line' : 'd-yarn';
        const front = mid && name === 'flo' ? 'd-target-line' : 'd-yarn';
        body += `<path d="M${cx - 28} 60C${cx - 14} 34 ${cx + 14} 34 ${cx + 28} 60" class="${back}"/>`;
        body += `<path d="M${cx - 28} 60C${cx - 14} 86 ${cx + 14} 86 ${cx + 28} 60" class="${front}"/>`;
      }
      body += `<text x="8" y="24" class="d-label d-small">back (far)</text><text x="8" y="112" class="d-label d-small">front (near)</text>`;
      if (name === 'blo') body += `<path d="M110 16V40" class="d-arrow" marker-end="url(#${id})"/>`;
      if (name === 'flo') body += `<path d="M110 104V80" class="d-arrow" marker-end="url(#${id})"/>`;
      label = {
        loops: 'The top of each stitch has two loops: a back loop and a front loop',
        blo: 'Back loop only: the hook goes under the far loop of the stitch',
        flo: 'Front loop only: the hook goes under the near loop of the stitch',
      }[name];
      break;
    }
    default:
      body = baseRow(5, 80, 40, 30);
      if (['puff', 'bobble', 'popcorn', 'cluster', 'tr', 'dc'].includes(name)) {
        body = baseRow(5, 92, 40, 30);
        if (name === 'cluster') body += place('cluster', 110, 92, 110, 34, 'd-new');
        else body += place(name, 110, 92, 110, 34, 'd-new');
      }
      label = `Chart: ${SYMBOL_NAMES[name] || name} on a row of single crochet`;
  }
  return svg(W, H, defs + body, label, 'fig-chart');
}

// ---------- Round chart from pattern data ----------
// rounds: [{ chart: { type, sym, count, fan? }, colour }]
//   ring   – stitches worked into a magic ring
//   inc    – every stitch of the round below gets 2 stitches (count doubles)
//   even   – one stitch in each stitch
//   petals – a fan in every 2nd stitch, slip stitch in the stitches between
export function roundChart(rounds, title = 'Round chart') {
  const cx = 160;
  const cy = 160;
  let prev = []; // angles of the round below
  let r = 14;
  let body = `<circle cx="${cx}" cy="${cy}" r="${r - 4}" class="sym d-ring-sym"/>`;
  const pt = (a, rad) => [cx + Math.sin(a) * rad, cy - Math.cos(a) * rad];

  for (const round of rounds) {
    const c = round.chart;
    if (!c) continue;
    const cls = `c-${round.colour || 'main'}`;
    const step = c.type === 'petals' ? 84 : 26;
    const r1 = r + step;
    if (c.type === 'ring' || c.type === 'even' || c.type === 'inc') {
      let angles;
      if (c.type === 'ring' || !prev.length) {
        angles = Array.from({ length: c.count }, (_, i) => (i / c.count) * Math.PI * 2);
        for (const a of angles) body += place(c.sym, ...pt(a, r + 2), ...pt(a, r1 - 2), cls);
      } else if (c.type === 'inc') {
        const d = Math.PI / prev.length / 2;
        angles = prev.flatMap((a) => [a - d, a + d]);
        prev.forEach((a, i) => {
          body += place(c.sym, ...pt(a, r + 3), ...pt(angles[2 * i], r1 - 2), cls);
          body += place(c.sym, ...pt(a, r + 2), ...pt(angles[2 * i + 1], r1 - 2), cls);
        });
      } else {
        angles = prev.slice();
        for (const a of angles) body += place(c.sym, ...pt(a, r + 2), ...pt(a, r1 - 2), cls);
      }
      prev = angles;
      r = r1;
    } else if (c.type === 'petals') {
      // Petal in stitches 2, 4, 6…; slip stitch in 1, 3, 5…
      const fan = c.fan || ['dc', 'tr', 'tr', 'dc'];
      prev.forEach((a, i) => {
        const [bx, by] = pt(a, r + 1);
        if (i % 2 === 0) {
          body += `<g class="sym ${cls}"><ellipse cx="${f(bx)}" cy="${f(by)}" rx="3.4" ry="2.6" class="d-fill"/></g>`;
          return;
        }
        const spread = 0.5;
        fan.forEach((s, k) => {
          const off = fan.length === 1 ? 0 : -spread + (2 * spread * k) / (fan.length - 1);
          const len = s === 'tr' ? 66 : s === 'dc' ? 50 : 36;
          const [tx, ty] = [bx + Math.sin(a + off) * len, by - Math.cos(a + off) * len];
          body += place(s, bx, by, tx, ty, cls);
        });
        // ch 2 on each side of the petal and the picot at the tip.
        for (const side of [-1, 1]) {
          for (const k of [0, 1]) {
            const aa = a + side * 0.95;
            const d0 = 5 + k * 15;
            const [px, py] = [bx + Math.sin(aa) * d0, by - Math.cos(aa) * d0];
            const [qx, qy] = [bx + Math.sin(aa) * (d0 + 13), by - Math.cos(aa) * (d0 + 13)];
            body += place('ch', px, py, qx, qy, cls);
          }
        }
        if (c.picot) {
          const [px, py] = pt(a, r + 68);
          const [qx, qy] = pt(a, r + 80);
          body += place('picot', px, py, qx, qy, cls);
        }
      });
      r = r1;
    }
  }
  const size = Math.ceil(r + 14) * 2;
  const off = cx - size / 2;
  return `<svg class="fig fig-round" viewBox="${off} ${off} ${size} ${size}" role="img" aria-label="${title}" focusable="false">${body}</svg>`;
}

// Legend for the symbols a chart uses.
export function legend(names) {
  return `<ul class="chart-legend">${names
    .map((n) => `<li>${symbol(n)}<span>${SYMBOL_NAMES[n] || n}</span></li>`)
    .join('')}</ul>`;
}

// ---------- Illustration (until the real photo arrives) ----------
export function sunflowerArt() {
  let petals = '';
  for (let i = 0; i < 6; i++) {
    const deg = i * 60 + 30;
    petals += `<path transform="rotate(${deg} 150 150)" d="M150 104C120 90 118 50 150 22C182 50 180 90 150 104Z" class="art-petal"/>`;
    petals += `<path transform="rotate(${deg} 150 150)" d="M150 98V44" class="art-petal-line"/>`;
  }
  let dots = '';
  for (let ring = 1; ring <= 3; ring++) {
    const n = ring * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring;
      dots += `<circle cx="${f(150 + Math.sin(a) * ring * 13)}" cy="${f(150 - Math.cos(a) * ring * 13)}" r="3.2" class="art-dot"/>`;
    }
  }
  return `<svg class="art" viewBox="0 0 300 300" role="img" aria-label="Illustration of the mini crochet sunflower: a round brown centre with six pointed yellow petals" focusable="false"><rect width="300" height="300" rx="24" class="art-bg"/>${petals}<circle cx="150" cy="150" r="50" class="art-centre"/>${dots}</svg>`;
}
