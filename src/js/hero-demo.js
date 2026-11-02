// Homepage hero: an animated phone that shows how the tracker works.
// Scenes: 1. paste a pattern and split it into rounds
//         2. count stitches and tap Done after each round
//         3. close the app, come back on the same round, finish with confetti
// It pauses when the phone is off screen or the tab is hidden, and stays a
// still picture for people who prefer reduced motion.

const screen = document.querySelector('[data-demo]');
if (screen) init(screen);

function init(screen) {
  const stage = screen.closest('.stage');
  const phone = screen.closest('.phone');
  const steps = [...stage.querySelectorAll('.demo-steps li')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Gentle 3D tilt that follows the mouse (desktop only).
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener('pointermove', (e) => {
      const r = phone.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width));
      const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height));
      phone.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
      phone.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
    });
    stage.addEventListener('pointerleave', () => {
      phone.style.setProperty('--ry', '0deg');
      phone.style.setProperty('--rx', '0deg');
    });
  }

  if (reduce) return; // keep the static Work Mode picture from the HTML

  // ---- Pause / resume ----
  let onScreen = true;
  let wake = null;
  const resume = () => {
    if (onScreen && !document.hidden && wake) { wake(); wake = null; }
  };
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; resume(); }).observe(phone);
  document.addEventListener('visibilitychange', resume);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function wait(ms) {
    await sleep(ms);
    while (!onScreen || document.hidden) await new Promise((r) => { wake = r; });
  }

  const q = (sel) => screen.querySelector(sel);
  const setStep = (n) => steps.forEach((li) => li.classList.toggle('is-active', Number(li.dataset.step) === n));

  // ---- The "finger" that taps things ----
  const finger = document.createElement('div');
  finger.className = 'd-finger';
  let listShift = 0;

  function pos(el) {
    let x = 0;
    let y = 0;
    for (let n = el; n && n !== screen; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    if (el.closest('.d-list')) y -= listShift;
    return { x: x + el.offsetWidth / 2 - 19, y: y + el.offsetHeight / 2 - 19 };
  }
  async function tap(el, { move = 650, hold = 140 } = {}) {
    const p = pos(el);
    finger.style.transform = `translate(${p.x}px, ${p.y}px)`;
    finger.classList.add('is-on');
    await wait(move);
    finger.classList.remove('is-tap');
    void finger.offsetWidth; // restart the ripple
    finger.classList.add('is-tap');
    el.classList.add('is-pressed');
    await wait(hold);
    el.classList.remove('is-pressed');
  }
  const hideFinger = () => finger.classList.remove('is-on');

  // ---- Pattern data ----
  const PASTE = ['R1: 6 sc in MR (6)', 'R2: inc x6 (12)', 'R3: (sc, inc) x6 (18)', 'R4: (2 sc, inc) x6 (24)', 'R5–R6: sc around (24)'];
  const ROUNDS = [['6 sc in MR', 6], ['inc x6', 12], ['(sc, inc) x6', 18], ['(2 sc, inc) x6', 24], ['sc around', 24], ['sc around', 24]];
  const TOTAL = ROUNDS.length;
  let cur = 0;

  // ---- Scene 1: paste and split ----
  async function scenePaste() {
    setStep(1);
    screen.innerHTML = `
      <div class="d-app is-enter">
        <div class="d-top"><span>‹ New pattern</span><span class="d-save">Save</span></div>
        <div class="d-field"><small>Title</small>Amigurumi Ball</div>
        <div class="d-label">Paste full pattern</div>
        <div class="d-box"><span class="d-caret"></span></div>
        <div class="d-bubble">Paste</div>
        <div class="d-split">✂ Split into rounds</div>
        <div class="d-cards"></div>
      </div>`;
    screen.append(finger);
    await wait(800);

    const box = q('.d-box');
    await tap(box, { hold: 450 });
    box.classList.add('is-focus');
    const bubble = q('.d-bubble');
    bubble.classList.add('is-on');
    await wait(300);
    await tap(bubble);
    bubble.classList.remove('is-on');
    const caret = q('.d-caret');
    for (const line of PASTE) {
      const d = document.createElement('div');
      d.className = 'd-line';
      d.textContent = line;
      box.insertBefore(d, caret);
      await wait(120);
    }
    caret.remove();
    box.classList.remove('is-focus');
    await wait(450);

    const split = q('.d-split');
    split.classList.add('is-ready');
    await wait(250);
    await tap(split);
    hideFinger();
    q('.d-app').classList.add('is-split');
    q('.d-cards').innerHTML = ROUNDS.map(
      ([ins, n], i) => `<div class="d-card" style="animation-delay:${120 + i * 90}ms"><b>Round ${i + 1}</b> · ${ins}<i>(${n})</i></div>`,
    ).join('');
    await wait(2100);
  }

  // ---- Scene 2: Work Mode ----
  function renderWork() {
    listShift = 0;
    screen.innerHTML = `
      <div class="d-app is-enter">
        <div class="d-top"><span>‹ Amigurumi Ball</span><span class="d-pill">◎ Focus</span></div>
        <div class="d-meta"><span class="d-count"></span><span class="d-pct"></span></div>
        <div class="d-progress"><span></span></div>
        <div class="d-view"><div class="d-list">${ROUNDS.map(
          ([ins, n], i) => `<div class="d-round${i === TOTAL - 1 ? ' is-last' : ''}">
            <div class="d-head"><b>Round ${i + 1}</b><span class="d-last">Last round!</span><i>(${n})</i></div>
            <div class="d-ins">${ins}</div>
            <div class="d-extra"><div><div class="d-counter"><span>−</span><strong>0</strong><span class="d-plus">+</span></div></div></div>
          </div>`,
        ).join('')}</div></div>
        <div class="d-done"></div>
      </div>`;
    screen.append(finger);
    update();
  }

  function update() {
    const cards = [...screen.querySelectorAll('.d-round')];
    cards.forEach((c, i) => {
      c.classList.toggle('is-done', i < cur);
      c.classList.toggle('is-current', i === cur);
    });
    q('.d-count').textContent = `${cur} / ${TOTAL} rounds`;
    q('.d-pct').textContent = `${Math.round((cur / TOTAL) * 100)}%`;
    q('.d-progress span').style.width = `${(cur / TOTAL) * 100}%`;
    const btn = q('.d-done');
    btn.classList.toggle('is-finish', cur === TOTAL - 1);
    btn.textContent = cur >= TOTAL ? '✓ Pattern finished' : cur === TOTAL - 1 ? 'Finish 🎉' : `✓ Done · Round ${cur + 1}`;
    // Keep one finished round visible above the current one.
    setTimeout(() => {
      const anchor = cards[Math.max(0, Math.min(cur, TOTAL - 1) - 1)];
      listShift = cur >= 2 ? anchor.offsetTop - 2 : 0;
      q('.d-list').style.transform = `translateY(${-listShift}px)`;
    }, 420);
  }

  async function countStitches(n, start = 0) {
    for (let i = start + 1; i <= n; i++) {
      const plus = q('.is-current .d-plus');
      await tap(plus, { move: i === start + 1 ? 650 : 120, hold: 90 });
      const s = q('.is-current .d-counter strong');
      s.textContent = i;
      s.classList.remove('is-bump');
      void s.offsetWidth;
      s.classList.add('is-bump');
    }
  }

  async function done() {
    await tap(q('.d-done'));
    cur++;
    update();
  }

  async function sceneWork() {
    setStep(2);
    cur = 0;
    renderWork();
    await wait(900);
    await countStitches(6);
    await wait(250);
    await done();
    await wait(900);
    await countStitches(5);
    await wait(200);
    await done();
    await wait(900);
    await done();
    await wait(1000);
  }

  // ---- Scene 3: close the app, come back, finish ----
  async function sceneReturn() {
    setStep(3);
    hideFinger();
    const app = q('.d-app');
    app.classList.remove('is-enter');
    app.classList.add('is-closing');
    await wait(400);
    screen.insertAdjacentHTML(
      'beforeend',
      `<div class="d-home"><div class="d-clock">10:42<small>Next day</small></div>
        <div class="d-apps"><span></span><span></span><span></span><span></span><span></span><span class="d-icon">🧶<small>Crochet Tracker</small></span><span></span><span></span></div></div>
       <div class="d-toast">Welcome back! You're on Round ${cur + 1}</div>`,
    );
    screen.append(finger);
    await wait(1300);
    await tap(q('.d-icon'));
    q('.d-home').classList.add('is-leaving');
    app.classList.remove('is-closing');
    await wait(450);
    q('.d-home').remove();
    const toast = q('.d-toast');
    toast.classList.add('is-on');
    await wait(1900);
    toast.classList.remove('is-on');
    await wait(300);
    await done();
    await wait(700);
    await done();
    await wait(1100);
    await done();
    hideFinger();
    confetti();
    await wait(500);
    screen.insertAdjacentHTML('beforeend', `<div class="d-finish"><strong>🎉</strong><b>Pattern finished!</b><span>${TOTAL} of ${TOTAL} rounds done</span></div>`);
    await wait(3200);
  }

  function confetti() {
    const colors = ['#b4436c', '#e88b5a', '#f5c84c', '#3d7a50', '#8a6fd1', '#f19bbb'];
    for (let i = 0; i < 34; i++) {
      const c = document.createElement('span');
      c.className = 'd-confetti';
      c.style.background = colors[i % colors.length];
      c.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 260)}px`);
      c.style.setProperty('--y', `${-Math.round(180 + Math.random() * 230)}px`);
      c.style.setProperty('--r', `${Math.round((Math.random() - 0.5) * 900)}deg`);
      c.style.animationDelay = `${Math.round(Math.random() * 150)}ms`;
      screen.append(c);
    }
  }

  async function loop() {
    await wait(1300); // let the phone fly in first
    for (;;) {
      await scenePaste();
      await sceneWork();
      await sceneReturn();
      screen.classList.add('is-fading');
      await wait(550);
      screen.classList.remove('is-fading');
    }
  }
  loop();
}
