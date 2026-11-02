// Homepage motion:
// 1. Feature cards slide in from the sides and below, one by one, every time the
//    section scrolls into view. Inside each card the icon pops and the text rises.
// 2. Yarn skeins, yarn balls, buttons and loose thread peek in from the screen edges
//    (one soft colour, like a printed craft background). They only use the empty
//    space beside the content column, so they never cover text, and they drift,
//    turn and pop in while you scroll.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canAnimate = !reduce && 'IntersectionObserver' in window && !!Element.prototype.animate;

// ---------- 1. Feature cards ----------
const SPRING = 'cubic-bezier(0.2, 0.9, 0.25, 1.12)';
for (const grid of canAnimate ? document.querySelectorAll('[data-cards-motion]') : []) {
  const cards = [...grid.children];
  let shown = false;
  grid.classList.add('is-waiting');

  const play = () => {
    shown = true;
    grid.classList.remove('is-waiting');
    const mid = grid.getBoundingClientRect().left + grid.offsetWidth / 2;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const side = Math.sign(Math.round((r.left + r.width / 2 - mid) / 60)); // -1 left, 0 middle, 1 right
      const delay = i * 140;
      card.animate(
        [
          { opacity: 0, transform: `translate(${side * 260}px, ${side ? 90 : 170}px) rotate(${side * 9}deg) scale(0.86)` },
          { opacity: 1, offset: 0.6 },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 1100, delay, easing: SPRING, fill: 'backwards' },
      );
      const icon = card.querySelector('.tile-icon');
      if (icon)
        icon.animate(
          [{ transform: 'scale(0) rotate(-120deg)' }, { transform: 'scale(1.25) rotate(10deg)', offset: 0.7 }, { transform: 'none' }],
          { duration: 700, delay: delay + 550, easing: 'ease-out', fill: 'backwards' },
        );
      [...card.querySelectorAll('h3, p')].forEach((el, k) =>
        el.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], {
          duration: 600, delay: delay + 650 + k * 120, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards',
        }),
      );
    });
  };

  new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.2 && !shown) play();
        // Fully off screen again: get ready to play once more next time.
        if (!e.isIntersecting && shown) {
          shown = false;
          grid.getAnimations({ subtree: true }).forEach((a) => a.cancel());
          grid.classList.add('is-waiting');
        }
      }
    },
    { threshold: [0, 0.2] },
  ).observe(grid);
}

// ---------- 2. Edge decorations ----------
const LINE = 'var(--deco-line)';
const skein = () => {
  const strands = [-4, -3, -2, -1, 0, 1, 2, 3, 4]
    .map((k) => `<path d="M80 10C${80 + k * 9} 80 ${80 + k * 13} 170 ${80 + k * 7} 236"/>`)
    .join('');
  return `<svg viewBox="0 0 160 250"><path d="M80 4C140 30 158 120 122 200 102 244 58 244 38 200 2 120 20 30 80 4Z" fill="var(--deco-1)"/><g fill="none" stroke="${LINE}" stroke-width="3.2" stroke-linecap="round">${strands}</g></svg>`;
};
const ball = () =>
  `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="var(--deco-2)"/><g fill="none" stroke="${LINE}" stroke-width="3.2" stroke-linecap="round">
    <path d="M14 80C60 50 140 50 190 92"/><path d="M8 104C60 72 146 74 194 118"/><path d="M14 130C64 100 140 102 186 144"/><path d="M30 156C70 132 130 134 166 166"/>
    <path d="M70 10C46 60 50 140 84 194"/><path d="M98 6C76 60 80 140 112 194"/><path d="M128 12C108 62 110 136 138 186"/></g></svg>`;
const button = () =>
  `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="var(--deco-1)"/><circle cx="32" cy="32" r="23" fill="none" stroke="${LINE}" stroke-width="2.5" opacity=".8"/><g fill="${LINE}"><circle cx="26" cy="26" r="3.6"/><circle cx="38" cy="26" r="3.6"/><circle cx="26" cy="38" r="3.6"/><circle cx="38" cy="38" r="3.6"/></g></svg>`;
const curl = () =>
  `<svg viewBox="0 0 140 220"><path d="M20 214C8 160 70 150 74 112 78 76 30 70 36 104 42 138 116 120 112 70 108 30 74 18 58 34" fill="none" stroke="var(--deco-1)" stroke-width="8" stroke-linecap="round"/></svg>`;

// side: -1 left, 1 right. size in px. peek: share of the item allowed on screen.
const ITEMS = [
  { draw: skein, side: -1, size: 190, peek: 0.55 },
  { draw: button, side: 1, size: 54, peek: 1 },
  { draw: ball, side: 1, size: 220, peek: 0.42 },
  { draw: curl, side: -1, size: 150, peek: 0.6 },
  { draw: button, side: -1, size: 46, peek: 1 },
  { draw: skein, side: 1, size: 200, peek: 0.5 },
  { draw: ball, side: -1, size: 210, peek: 0.45 },
  { draw: button, side: 1, size: 60, peek: 1 },
  { draw: curl, side: 1, size: 140, peek: 0.6 },
  { draw: skein, side: -1, size: 180, peek: 0.55 },
  { draw: button, side: -1, size: 50, peek: 1 },
  { draw: ball, side: 1, size: 200, peek: 0.45 },
];

const MIN_BAND = 60; // px of free space beside the content needed to show anything

function initDeco() {
  const container = document.querySelector('main .container');
  if (!container) return;
  const layer = document.createElement('div');
  layer.className = 'deco';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  const items = ITEMS.map((def, i) => {
    const el = document.createElement('div');
    el.className = 'deco-item';
    el.innerHTML = `<div class="deco-float" style="animation-delay:${-(i * 0.9).toFixed(1)}s">${def.draw()}</div>`;
    layer.append(el);
    return {
      ...def,
      el,
      speed: [0.1, -0.06, 0.14, -0.1, 0.05, 0.12][i % 6],
      spin: [0.03, -0.025, 0.02, -0.035, 0.04][i % 5],
      tilt: [-14, 10, -6, 16, 8, -10][i % 6],
      y: 0,
    };
  });

  function layout() {
    const band = container.getBoundingClientRect().left + parseFloat(getComputedStyle(container).paddingLeft);
    const show = band >= MIN_BAND;
    layer.hidden = !show;
    if (!show) return;
    const pageH = document.documentElement.scrollHeight;
    const vw = document.documentElement.clientWidth;
    layer.style.height = `${pageH}px`;
    const room = band - 14; // never closer than 14px to the text
    const gap = Math.max(260, (pageH - 200) / items.length);
    items.forEach((it, i) => {
      // Small things (buttons) sit fully inside the margin; big ones peek in from the edge.
      const size = it.peek === 1 ? Math.min(it.size, room - 6) : it.size;
      const visible = Math.min(room * 0.72, size * it.peek); // leaves room for turning
      it.el.style.width = `${size}px`;
      it.y = 90 + i * gap;
      const x = it.peek === 1
        ? (it.side < 0 ? (room - size) / 2 : vw - room + (room - size) / 2)
        : (it.side < 0 ? visible - size : vw - visible);
      it.el.style.left = `${x}px`;
      it.el.style.top = `${it.y}px`;
    });
    onScroll();
  }

  let ticking = false;
  function onScroll() {
    ticking = false;
    if (layer.hidden || reduce) return;
    const mid = window.scrollY + innerHeight / 2;
    for (const it of items) {
      const d = it.y - mid;
      it.el.style.transform = `translateY(${(d * it.speed).toFixed(1)}px) rotate(${Math.max(-14, Math.min(14, it.tilt + d * it.spin)).toFixed(1)}deg)`;
    }
  }

  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle('is-in', e.isIntersecting);
    });
    items.forEach((it) => io.observe(it.el));
  } else {
    items.forEach((it) => it.el.classList.add('is-in'));
  }

  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  addEventListener('resize', layout);
  new ResizeObserver(layout).observe(document.body);
  layout();
}

initDeco();
