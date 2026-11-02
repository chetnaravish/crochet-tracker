// Homepage motion:
// 1. Feature cards slide in (from below and the side) one by one when scrolled into view.
// 2. Crochet tools and yarn float in the empty side margins of wide screens and move
//    with the scroll. They live only outside the content column, so they never cover text.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- 1. Cards slide in ----------
for (const grid of document.querySelectorAll('[data-cards-motion]')) {
  const cards = [...grid.children];
  if (reduce || !('IntersectionObserver' in window) || !Element.prototype.animate) break;
  grid.classList.add('is-waiting');
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const mid = grid.getBoundingClientRect().left + grid.offsetWidth / 2;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const side = Math.sign(Math.round((r.left + r.width / 2 - mid) / 40)); // -1 left, 0 middle, 1 right
        card.animate(
          [
            { opacity: 0, transform: `translate(${side * 70}px, 70px) rotate(${side * 4}deg) scale(0.92)` },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 900, delay: i * 120, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1.12)', fill: 'backwards' },
        );
      });
      grid.classList.remove('is-waiting');
    },
    { rootMargin: '0px 0px -15% 0px' },
  );
  io.observe(grid);
}

// ---------- 2. Side decorations ----------
const yarn = (c, d) => `<svg viewBox="0 0 64 64"><path d="M50 50c6 6 4 12-4 12" fill="none" stroke="${d}" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="30" r="26" fill="${c}"/><g fill="none" stroke="${d}" stroke-width="2.4" stroke-linecap="round" opacity=".55"><path d="M8 24c14-6 30-6 44 2"/><path d="M6 34c16-7 34-6 48 3"/><path d="M11 45c12-6 28-5 38 2"/><path d="M22 6c-6 14-6 32 4 50"/><path d="M36 5c-8 16-7 34 3 50"/></g><ellipse cx="20" cy="18" rx="6" ry="3.5" fill="#fff" opacity=".35"/></svg>`;
const hook = (c) => `<svg viewBox="0 0 64 64"><g transform="rotate(-35 32 32)"><rect x="28" y="2" width="8" height="10" rx="3" fill="#b9b2b6"/><path d="M28 6c0-5 8-5 8 0v3h-3V6c0-1-2-1-2 0" fill="#9b9397"/><rect x="29" y="10" width="6" height="22" fill="#c9c2c6"/><rect x="26" y="30" width="12" height="32" rx="6" fill="${c}"/><rect x="28" y="36" width="3" height="20" rx="1.5" fill="#fff" opacity=".35"/></g></svg>`;
const scissors = (c) => `<svg viewBox="0 0 64 64"><g transform="rotate(-20 32 32)"><path d="M32 30 22 4l4-1 10 26zM32 30 42 4l-4-1-10 26z" fill="#c9c2c6"/><circle cx="22" cy="46" r="10" fill="none" stroke="${c}" stroke-width="6"/><circle cx="42" cy="46" r="10" fill="none" stroke="${c}" stroke-width="6"/><circle cx="32" cy="31" r="3" fill="#8a8286"/></g></svg>`;
const marker = (c) => `<svg viewBox="0 0 64 64"><path d="M32 6c12 0 18 10 14 22L34 58c-1 2-3 2-4 0L18 28C14 16 20 6 32 6z" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><circle cx="32" cy="20" r="4" fill="${c}"/></svg>`;
const granny = (a, b, c) => `<svg viewBox="0 0 64 64"><g transform="rotate(8 32 32)"><rect x="6" y="6" width="52" height="52" rx="8" fill="${a}"/><rect x="15" y="15" width="34" height="34" rx="6" fill="${b}"/><rect x="24" y="24" width="16" height="16" rx="4" fill="${c}"/><rect x="6" y="6" width="52" height="52" rx="8" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4" opacity=".7"/></g></svg>`;
const button = (c) => `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="${c}"/><circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="2" opacity=".45"/><g fill="#fff" opacity=".85"><circle cx="27" cy="27" r="3"/><circle cx="37" cy="27" r="3"/><circle cx="27" cy="37" r="3"/><circle cx="37" cy="37" r="3"/></g></svg>`;
const flower = (c) => `<svg viewBox="0 0 64 64"><g transform="translate(32 32)" fill="${c}"><circle cy="-15" r="11"/><circle cy="-15" r="11" transform="rotate(72)"/><circle cy="-15" r="11" transform="rotate(144)"/><circle cy="-15" r="11" transform="rotate(216)"/><circle cy="-15" r="11" transform="rotate(288)"/></g><circle cx="32" cy="32" r="9" fill="#f5c84c"/></svg>`;

const ITEMS = [
  yarn('#e47c9f', '#b4436c'),
  hook('#8a6fd1'),
  granny('#f5c84c', '#e47c9f', '#7fbf95'),
  scissors('#e88b5a'),
  yarn('#7fbf95', '#3d7a50'),
  marker('#b4436c'),
  flower('#a98ad8'),
  button('#e88b5a'),
  yarn('#a98ad8', '#6f52a8'),
  hook('#e47c9f'),
  granny('#d8e9f8', '#a98ad8', '#f5c84c'),
  yarn('#f5c84c', '#c99a14'),
  scissors('#8a6fd1'),
  button('#7fbf95'),
];

const MIN_BAND = 66; // px of free space beside the content column needed to show anything

function initDeco() {
  const container = document.querySelector('main .container');
  if (!container) return;
  const layer = document.createElement('div');
  layer.className = 'deco';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  const items = ITEMS.map((svg, i) => {
    const el = document.createElement('div');
    el.className = 'deco-item';
    el.innerHTML = `<div class="deco-float" style="animation-delay:${-(i * 0.7).toFixed(1)}s">${svg}</div>`;
    layer.append(el);
    return {
      el,
      side: i % 2 ? 1 : -1,
      speed: [0.12, -0.08, 0.18, -0.12, 0.06, 0.15, -0.05][i % 7], // parallax
      spin: [0.06, -0.04, 0.03, -0.07, 0.05][i % 5], // degrees per px scrolled
      tilt: [-12, 10, -6, 14, 8, -10][i % 6],
      size: [86, 76, 68, 72, 82, 60, 70][i % 7],
      y: 0,
      x: 0,
    };
  });

  let band = 0;
  function layout() {
    const cs = getComputedStyle(container);
    const left = container.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
    band = left;
    const show = band >= MIN_BAND;
    layer.hidden = !show;
    if (!show) return;
    const pageH = document.documentElement.scrollHeight;
    layer.style.height = `${pageH}px`;
    const vw = document.documentElement.clientWidth;
    const top = 640; // start below the hero text
    const gap = Math.max(300, (pageH - top - 500) / Math.ceil(items.length / 2));
    items.forEach((it, i) => {
      const s = Math.round(Math.min(it.size, band * 0.62));
      it.el.style.width = `${s}px`;
      const pair = Math.floor(i / 2);
      it.y = top + pair * gap + (it.side > 0 ? gap * 0.5 : 0);
      const centre = band / 2 - s / 2;
      it.x = it.side < 0 ? centre : vw - band / 2 - s / 2;
      it.el.style.left = `${it.x}px`;
      it.el.style.top = `${it.y}px`;
    });
    onScroll();
  }

  let ticking = false;
  function onScroll() {
    ticking = false;
    if (layer.hidden || reduce) return;
    const sy = window.scrollY;
    for (const it of items) {
      // Distance of the item from the middle of the screen drives the parallax, so
      // items drift and turn as they pass by.
      const d = it.y - (sy + innerHeight / 2);
      it.el.style.transform = `translateY(${(d * it.speed).toFixed(1)}px) rotate(${(it.tilt + d * it.spin).toFixed(1)}deg)`;
    }
  }

  // Pop in each time an item comes into view, so the margins keep changing while scrolling.
  if (!reduce) {
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
