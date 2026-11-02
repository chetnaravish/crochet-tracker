// Homepage "Why crocheters love it": a little cartoon story.
// One big card at a time plays a ~3 second scene. Then the girl stands up and walks
// to the right while the next card slides in, sits down, and the next scene plays.
// After the 4th card, all four cards fly in from four sides and stay, each showing
// its final picture. Scrolling away and back plays the story again.
// The scenes are SVG drawn in code (no image files, no AI images).

const SKIN = '#f0c19c';
const SKIN_D = '#e8b48f';
const HAIR = '#4a2c22';
const SWEATER = '#f5c84c';
const PANTS = '#3d4a6b';

// ---------- Drawing helpers ----------
const room = (wall, floor) => `
  <rect width="320" height="200" fill="${wall}"/>
  <g><rect x="22" y="22" width="66" height="56" rx="6" fill="#d8e9f8" stroke="#fff" stroke-width="4"/><path d="M55 24v52M24 50h62" stroke="#fff" stroke-width="3"/><circle cx="72" cy="38" r="7" fill="#fff0c4"/></g>
  <rect y="170" width="320" height="30" fill="${floor}"/>
  <ellipse cx="150" cy="182" rx="96" ry="9" fill="#fff" opacity=".45"/>
  <g><path d="M296 140c-14-10-16-30-6-38 4 12 8 24 6 38Zm0 0c10-14 26-16 30-8-10 6-20 8-30 8Z" fill="#7fbf95"/><path d="M296 140c-4-16 2-30 12-34 0 14-4 24-12 34Z" fill="#5d9f73"/><rect x="284" y="138" width="24" height="32" rx="5" fill="#e88b5a"/></g>
  <rect x="226" y="116" width="56" height="8" rx="3" fill="#c99a6b"/><rect x="250" y="124" width="8" height="46" fill="#b5875a"/><rect x="240" y="166" width="28" height="5" rx="2" fill="#b5875a"/>
  <circle cx="206" cy="150" r="9" fill="#a98ad8"/><circle cx="222" cy="148" r="10" fill="#7fbf95"/>
  <path d="M194 152h40l-5 20h-30Z" fill="#d9a56b"/><path d="M196 158h36M198 164h32" stroke="#b5875a" stroke-width="2"/>
  <rect x="88" y="78" width="92" height="80" rx="24" fill="#d9819f"/>
  <rect x="82" y="132" width="104" height="30" rx="12" fill="#c96d8e"/>
  <rect x="72" y="110" width="24" height="52" rx="12" fill="#e091ac"/>
  <rect x="88" y="160" width="6" height="12" fill="#a8546f"/><rect x="174" y="160" width="6" height="12" fill="#a8546f"/>`;

const head = `
  <g class="s-head">
    <circle cx="134" cy="66" r="24" fill="${HAIR}"/><circle cx="134" cy="41" r="10" fill="${HAIR}"/>
    <circle cx="112" cy="72" r="4" fill="${SKIN_D}"/><circle cx="156" cy="72" r="4" fill="${SKIN_D}"/>
    <circle cx="134" cy="70" r="21" fill="${SKIN}"/>
    <path d="M113 68q2-22 21-22t21 20q-10-9-21-9-12 0-21 11Z" fill="${HAIR}"/>
    <g class="s-eyes"><ellipse cx="126" cy="73" rx="2.4" ry="3" fill="#3a2a30"/><ellipse cx="142" cy="73" rx="2.4" ry="3" fill="#3a2a30"/></g>
    <g class="f f-brow-up" fill="none" stroke="${HAIR}" stroke-width="2" stroke-linecap="round"><path d="M122 66q4-3 8 0"/><path d="M138 66q4-3 8 0"/></g>
    <g class="f f-brow-sad" fill="none" stroke="${HAIR}" stroke-width="2" stroke-linecap="round"><path d="M122 67l8-3"/><path d="M138 64l8 3"/></g>
    <circle class="f-blush" cx="121" cy="80" r="3.5" fill="#f19bbb"/><circle class="f-blush" cx="147" cy="80" r="3.5" fill="#f19bbb"/>
    <path class="f f-smile" d="M129 82q5 5 10 0" fill="none" stroke="#7a3a4a" stroke-width="2" stroke-linecap="round"/>
    <path class="f f-sad" d="M129 86q5-5 10 0" fill="none" stroke="#7a3a4a" stroke-width="2" stroke-linecap="round"/>
    <path class="f f-joy" d="M128 81q6 9 12 0Z" fill="#b4436c"/>
    <ellipse class="f f-o" cx="134" cy="84" rx="2.6" ry="3.2" fill="#7a3a4a"/>
    <path class="f f-sweat" d="M158 56q4 6 0 9-4-3 0-9Z" fill="#9fcbf0"/>
  </g>`;

const body = (work = '#e47c9f') => `
  <path class="s-yarn" d="M146 126 C 168 150, 196 132, 214 146" fill="none" stroke="${work}" stroke-width="2"/>
  <rect x="116" y="126" width="54" height="17" rx="8.5" fill="${PANTS}"/>
  <rect x="155" y="130" width="15" height="40" rx="7" fill="${PANTS}"/>
  <ellipse cx="168" cy="171" rx="12" ry="5" fill="#b4436c"/>
  <rect x="112" y="92" width="44" height="46" rx="16" fill="${SWEATER}"/>
  <path d="M120 96q14 10 28 0" fill="none" stroke="#e0ad2c" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="129" y="84" width="10" height="12" fill="${SKIN_D}"/>`;

// Left arm holds the crochet work (and the hook in the one-hand scene).
const leftArm = (work = '#e47c9f', hook = false) => `
  <g class="s-larm">
    <path d="M117 100q-6 22 20 22" fill="none" stroke="${SWEATER}" stroke-width="11" stroke-linecap="round"/>
    <circle class="s-work" cx="145" cy="123" r="9" fill="${work}" stroke="#0002" stroke-width="2" stroke-dasharray="3 3"/>
    ${hook ? '<line x1="138" y1="121" x2="128" y2="106" stroke="#8a6fd1" stroke-width="3" stroke-linecap="round"/>' : ''}
    <circle cx="138" cy="122" r="5.5" fill="${SKIN_D}"/>
  </g>`;

// Right arm with the hook (scene 1); it later swings up to hold the phone.
const hookArm = `
  <g class="s-arm">
    <path d="M151 100q8 12 1 18" fill="none" stroke="${SWEATER}" stroke-width="11" stroke-linecap="round"/>
    <line class="s-hook" x1="152" y1="117" x2="163" y2="103" stroke="#8a6fd1" stroke-width="3" stroke-linecap="round"/>
    <circle cx="152" cy="118" r="5.5" fill="${SKIN_D}"/>
  </g>`;

// A phone held up in the right hand, screen content passed in.
const raisedPhone = (screen) => `
  <g class="s-phone">
    <circle class="s-glow" cx="176" cy="88" r="20" fill="#fff0c4"/>
    <rect x="164" y="66" width="24" height="42" rx="4" fill="#3a2a30"/>
    <rect x="166.5" y="70" width="19" height="34" rx="2" fill="#fff8f1"/>
    ${screen}
  </g>`;

// Right arm resting with the phone on the lap; the thumb taps the screen.
const lapPhone = (screen) => `
  <g class="s-lap">
    <path d="M151 100q12 10 12 22" fill="none" stroke="${SWEATER}" stroke-width="11" stroke-linecap="round"/>
    <rect x="158" y="92" width="26" height="42" rx="4" fill="#3a2a30" transform="rotate(8 171 113)"/>
    <g transform="rotate(8 171 113)"><rect x="160.5" y="96" width="21" height="34" rx="2" fill="#fff8f1"/>${screen}</g>
    <circle cx="164" cy="126" r="5.5" fill="${SKIN_D}"/>
    <ellipse class="s-thumb" cx="170" cy="122" rx="3.6" ry="4.4" fill="${SKIN_D}" stroke="#d9a07c" stroke-width="1"/>
  </g>`;

const row = (y, fill, label = '', x = 162.5, w = 17) =>
  `<rect x="${x}" y="${y}" width="${w}" height="5" rx="1.5" fill="${fill}"/>${label ? `<text x="${x + w / 2}" y="${y + 4}" text-anchor="middle" font-size="4" font-weight="800" fill="#fff" font-family="Nunito, sans-serif">${label}</text>` : ''}`;

const bubble = `
  <g class="s-bubble">
    <circle cx="160" cy="50" r="3" fill="#fff"/><circle cx="168" cy="42" r="4.5" fill="#fff"/>
    <rect x="172" y="10" width="116" height="34" rx="17" fill="#fff"/>
    <text class="s-say" x="230" y="33" text-anchor="middle" font-family="Caveat, 'Segoe Print', cursive" font-size="17" font-weight="700" fill="#3a2a30"></text>
  </g>`;

const qmarks = `<g class="s-qmarks" font-family="Fraunces, Georgia, serif" font-weight="800" fill="#b4436c"><text x="100" y="40" font-size="20">?</text><text x="160" y="32" font-size="16">?</text><text x="112" y="22" font-size="13">?</text></g>`;
const sparkles = (pts) => `<g class="s-sparkles" fill="#f5c84c">${pts.map(([x, y, s]) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-7l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/>`).join('')}</g>`;

// ---------- The four scenes ----------
const SCENES = {
  // 1. Forgets the round, checks the phone, smiles.
  forget: {
    svg: () => `${room('#fdeee4', '#f3dccb')}
      <rect class="s-table-phone" x="238" y="109" width="24" height="7" rx="2" fill="#3a2a30"/>
      <g class="s-girl">${body()}${head}${leftArm()}${hookArm}
        ${raisedPhone(`${row(73, '#d9f0e1')}${row(79, '#d9f0e1')}<rect x="168.5" y="85" width="15" height="9" rx="2" fill="#b4436c"/><text x="176" y="91.6" text-anchor="middle" font-size="5" font-weight="800" fill="#fff" font-family="Nunito, sans-serif">R7</text>${row(96, '#f1e3d8', '', 168.5, 15)}`)}
      </g>${qmarks}${sparkles([[204, 62, 1], [150, 48, 0.6], [206, 108, 0.6]])}${bubble}`,
    steps: [
      { phase: 'knit', face: 'smile', say: 'R5 ✓ R6 ✓ R…', ms: 900 },
      { phase: 'forget', face: 'sad', say: 'Which round??', ms: 1300 },
      { phase: 'found', face: 'joy', say: 'Round 7! ✓', look: 'phone', ms: 1500 },
    ],
  },

  // 2. Crochets with one hand, taps Done with the thumb of the other.
  onehand: {
    svg: () => `${room('#e6f4ea', '#d5e9db')}
      <g class="s-cup"><rect x="236" y="100" width="14" height="16" rx="3" fill="#fff"/><path d="M250 104q6 0 6 5t-6 5" fill="none" stroke="#fff" stroke-width="2.5"/><path class="s-steam" d="M240 96q-3-4 0-8t0-8M246 96q-3-4 0-8t0-8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>
      <g class="s-girl">${body()}${head}${leftArm('#e47c9f', true)}
        ${lapPhone(`<g class="s-scr-a">${row(99, '#d9f0e1')}${row(105, '#b4436c', 'R8')}${row(111, '#f1e3d8')}</g><g class="s-scr-b">${row(99, '#d9f0e1')}${row(105, '#d9f0e1')}${row(111, '#b4436c', 'R9')}</g><rect class="s-donebtn" x="162.5" y="121" width="17" height="6" rx="3" fill="#3d7a50"/>`)}
      </g>
      <g class="s-tick"><circle cx="200" cy="96" r="11" fill="#3d7a50"/><path d="M195 96l4 4 7-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>
      ${sparkles([[214, 82, 0.8], [190, 112, 0.6]])}${bubble}`,
    steps: [
      { phase: 'work', face: 'smile', say: 'Round 8…', look: 'lap', ms: 1100 },
      { phase: 'tap', face: 'smile', say: 'Round 8…', look: 'lap', ms: 500 },
      { phase: 'done', face: 'joy', say: 'One hand! ✓', ms: 1600 },
    ],
  },

  // 3. Finished a ball, taps Reset, starts it again in a new colour.
  again: {
    svg: () => `${room('#f1ebfb', '#e2d8f2')}
      <g class="s-ball"><circle cx="246" cy="102" r="13" fill="#e47c9f"/><path d="M234 98q12-5 24 0M233 105q13-4 26 0" fill="none" stroke="#c45a80" stroke-width="1.6" stroke-dasharray="2.5 2.5"/><path d="M256 92l8-8" stroke="#3d7a50" stroke-width="2"/><path d="M264 84l6 2-4 4Z" fill="#3d7a50"/></g>
      <circle class="s-newyarn" cx="214" cy="140" r="9" fill="#7fbf95"/>
      <g class="s-girl">${body('#7fbf95')}${head}
        <g class="s-work-old">${leftArm('#e47c9f')}</g><g class="s-work-new">${leftArm('#7fbf95')}</g>
        ${lapPhone(`<g class="s-scr-a"><rect x="162.5" y="99" width="17" height="20" rx="2" fill="#d9f0e1"/><text x="171" y="111" text-anchor="middle" font-size="5.5" font-weight="800" fill="#3d7a50" font-family="Nunito, sans-serif">6/6 ✓</text></g><g class="s-scr-b">${row(99, '#b4436c', 'R1')}${row(105, '#f1e3d8')}${row(111, '#f1e3d8')}</g><g class="s-reset"><rect x="162.5" y="121" width="17" height="6" rx="3" fill="#8a6fd1"/><text x="171" y="125.4" text-anchor="middle" font-size="4.4" font-weight="800" fill="#fff" font-family="Nunito, sans-serif">↺ Reset</text></g>`)}
      </g>
      ${sparkles([[214, 120, 0.8], [234, 80, 0.6]])}${bubble}`,
    steps: [
      { phase: 'proud', face: 'joy', say: 'Finished! 🎉', look: 'lap', ms: 1100 },
      { phase: 'tap', face: 'smile', say: 'One more?', look: 'lap', ms: 600 },
      { phase: 'again', face: 'joy', say: 'Again in mint!', ms: 1500 },
    ],
  },

  // 4. Doesn't know a stitch, taps it, a stitch lesson pops up.
  learn: {
    svg: () => `${room('#fff5d6', '#f3e6bf')}
      <g class="s-girl">${body()}${head}${leftArm()}
        ${lapPhone(`${row(99, '#d9f0e1')}<g class="s-chip"><rect x="162.5" y="105" width="17" height="7" rx="3.5" fill="#e7def6"/><text x="171" y="110.2" text-anchor="middle" font-size="5" font-weight="800" fill="#6f52a8" font-family="Nunito, sans-serif">dc ?</text></g>${row(115, '#f1e3d8')}`)}
      </g>
      ${qmarks}
      <g class="s-board">
        <rect x="196" y="52" width="108" height="98" rx="12" fill="#fff" stroke="#e7def6" stroke-width="2"/>
        <text x="250" y="70" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="12" font-weight="800" fill="#6f52a8">dc</text>
        <text x="250" y="80" text-anchor="middle" font-family="Nunito, sans-serif" font-size="6.5" font-weight="700" fill="#6e5961">double crochet</text>
        <g fill="none" stroke-linecap="round">
          <path d="M216 136h68" stroke="#e47c9f" stroke-width="5"/>
          <path class="s-loop1" d="M236 132c-4-10 4-20 12-18" stroke="#e47c9f" stroke-width="3.5"/>
          <path class="s-loop2" d="M252 132c-4-12 6-22 14-18" stroke="#e47c9f" stroke-width="3.5"/>
          <g class="s-bighook"><path d="M226 96l46 30" stroke="#8a6fd1" stroke-width="4"/><path d="M226 96q-6-2-4 4" stroke="#8a6fd1" stroke-width="3"/></g>
        </g>
      </g>
      <g class="s-bulb"><circle cx="134" cy="22" r="9" fill="#fff0c4" stroke="#f5c84c" stroke-width="2"/><rect x="130" y="30" width="8" height="5" rx="1.5" fill="#c9b27a"/><path d="M134 6v-4M120 12l-3-3M148 12l3-3M116 24h-4M152 24h4" stroke="#f5c84c" stroke-width="2" stroke-linecap="round"/></g>
      ${bubble}`,
    steps: [
      { phase: 'puzzle', face: 'puzzled', say: 'What is dc?', look: 'lap', ms: 1100 },
      { phase: 'tap', face: 'puzzled', say: 'What is dc?', look: 'lap', ms: 500 },
      { phase: 'learn', face: 'joy', say: 'Oh, that’s how!', ms: 1700 },
    ],
  },
};

// The standing girl that walks from one card to the next.
const WALKER = `<svg viewBox="0 0 80 150" aria-hidden="true">
  <g class="w-body">
    <g class="w-leg w-leg-r"><rect x="41" y="102" width="14" height="40" rx="7" fill="${PANTS}"/><ellipse cx="50" cy="144" rx="10" ry="5" fill="#b4436c"/></g>
    <g class="w-leg w-leg-l"><rect x="25" y="102" width="14" height="40" rx="7" fill="${PANTS}"/><ellipse cx="34" cy="144" rx="10" ry="5" fill="#b4436c"/></g>
    <g class="w-arm w-arm-r"><rect x="54" y="64" width="11" height="40" rx="5.5" fill="${SWEATER}"/><circle cx="60" cy="106" r="5.5" fill="${SKIN_D}"/></g>
    <rect x="18" y="60" width="44" height="50" rx="16" fill="${SWEATER}"/>
    <g class="w-arm w-arm-l"><rect x="15" y="64" width="11" height="40" rx="5.5" fill="${SWEATER}"/><circle cx="20" cy="106" r="5.5" fill="${SKIN_D}"/><circle cx="22" cy="104" r="8" fill="#e47c9f"/></g>
    <rect x="35" y="54" width="10" height="10" fill="${SKIN_D}"/>
    <circle cx="40" cy="34" r="24" fill="${HAIR}"/><circle cx="40" cy="9" r="10" fill="${HAIR}"/>
    <circle cx="18" cy="40" r="4" fill="${SKIN_D}"/><circle cx="62" cy="40" r="4" fill="${SKIN_D}"/>
    <circle cx="40" cy="38" r="21" fill="${SKIN}"/>
    <path d="M19 36q2-22 21-22t21 20q-10-9-21-9-12 0-21 11Z" fill="${HAIR}"/>
    <ellipse cx="35" cy="41" rx="2.4" ry="3" fill="#3a2a30"/><ellipse cx="51" cy="41" rx="2.4" ry="3" fill="#3a2a30"/>
    <circle cx="29" cy="48" r="3.5" fill="#f19bbb"/><circle cx="55" cy="48" r="3.5" fill="#f19bbb"/>
    <path d="M37 50q5 5 10 0" fill="none" stroke="#7a3a4a" stroke-width="2" stroke-linecap="round"/>
  </g></svg>`;

// ---------- Player ----------
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const story = document.querySelector('[data-story]');
if (story) initStory(story);

function initStory(story) {
  const track = story.querySelector('.story-track');
  const cards = [...story.querySelectorAll('.story-card')];
  const dots = [...story.querySelectorAll('.story-dots span')];
  const skipBtn = story.querySelector('[data-story-skip]');
  const replayBtn = story.querySelector('[data-story-replay]');

  const scenes = cards.map((card) => {
    const def = SCENES[card.dataset.scene];
    const label = card.querySelector('h3').textContent;
    card.querySelector('.scene-slot').innerHTML =
      `<svg class="scene" data-scene="${card.dataset.scene}" viewBox="0 0 320 200" role="img" aria-label="Cartoon: ${label}">${def.svg()}</svg>`;
    return { svg: card.querySelector('svg.scene'), steps: def.steps };
  });

  function setStep(i, step) {
    const svg = scenes[i].svg;
    svg.dataset.phase = step.phase;
    svg.dataset.face = step.face;
    svg.dataset.look = step.look || '';
    const say = svg.querySelector('.s-say');
    if (say.textContent !== step.say) {
      say.textContent = step.say;
      const b = svg.querySelector('.s-bubble');
      b.classList.remove('is-pop');
      void b.getBBox();
      b.classList.add('is-pop');
    }
  }
  const showEnd = (i) => setStep(i, scenes[i].steps[scenes[i].steps.length - 1]);

  const walker = document.createElement('div');
  walker.className = 'story-walker';
  walker.innerHTML = WALKER;
  story.append(walker);

  let token = 0;
  let state = 'idle'; // idle | playing | done | left
  let current = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function goTo(i, instant = false) {
    current = i;
    track.style.transition = instant ? 'none' : '';
    track.style.transform = `translateX(calc(${-i} * (100% + var(--story-gap))))`;
    dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
    if (instant) void track.offsetWidth;
  }

  // Where the seated girl is inside a card, in story coordinates.
  // The card on screen always sits where the track starts, so measure the scene
  // relative to its own card and add the track's position inside the story.
  function seat(i) {
    const c = cards[i].getBoundingClientRect();
    const s = scenes[i].svg.getBoundingClientRect();
    return {
      x: track.offsetLeft + (s.left - c.left) + s.width * (140 / 320),
      y: track.offsetTop + (s.top - c.top) + s.height * (174 / 200),
      h: s.height * 0.74,
    };
  }

  async function runScene(i, t) {
    const svg = scenes[i].svg;
    svg.classList.remove('girl-out');
    for (const step of scenes[i].steps) {
      setStep(i, step);
      await sleep(step.ms);
      if (t !== token) return false;
    }
    return true;
  }

  async function walk(from, to, t) {
    const p = seat(from);
    walker.style.transition = 'none';
    walker.style.height = `${p.h}px`;
    walker.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    void walker.offsetWidth;
    walker.style.transition = '';
    walker.className = 'story-walker is-up';
    scenes[from].svg.classList.add('girl-out');
    await sleep(420);
    if (t !== token) return false;
    walker.classList.add('is-walking');
    goTo(to);
    const q = seat(to);
    walker.style.transform = `translate(${q.x}px, ${q.y}px) translate(-50%, -100%)`;
    scenes[to].svg.classList.add('girl-out');
    setStep(to, scenes[to].steps[0]);
    await sleep(1350);
    if (t !== token) return false;
    walker.className = 'story-walker is-sitting';
    scenes[to].svg.classList.remove('girl-out');
    await sleep(250);
    walker.className = 'story-walker';
    return t === token;
  }

  async function play() {
    const t = ++token;
    state = 'playing';
    story.classList.remove('is-grid');
    story.classList.add('is-story');
    skipBtn.hidden = false;
    replayBtn.hidden = true;
    cards.forEach((c) => c.getAnimations().forEach((a) => a.cancel()));
    scenes.forEach((s, i) => { s.svg.classList.remove('girl-out'); setStep(i, s.steps[0]); });
    goTo(0, true);
    for (let i = 0; i < cards.length; i++) {
      if (!(await runScene(i, t))) return;
      if (i < cards.length - 1 && !(await walk(i, i + 1, t))) return;
    }
    await sleep(500);
    if (t === token) showGrid(true);
  }

  function showGrid(animate) {
    token++;
    state = 'done';
    walker.className = 'story-walker';
    story.classList.remove('is-story');
    story.classList.add('is-grid');
    track.style.transform = '';
    track.style.transition = '';
    scenes.forEach((s, i) => { s.svg.classList.remove('girl-out'); showEnd(i); });
    skipBtn.hidden = true;
    replayBtn.hidden = reduce;
    if (!animate || !Element.prototype.animate) return;
    const from = ['translate(-180px, 0) rotate(-6deg)', 'translate(0, -160px) rotate(4deg)', 'translate(0, 160px) rotate(-4deg)', 'translate(180px, 0) rotate(6deg)'];
    cards.forEach((c, i) =>
      c.animate([{ opacity: 0, transform: `${from[i % 4]} scale(0.85)` }, { opacity: 1, transform: 'none' }], {
        duration: 900, delay: i * 110, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1.15)', fill: 'backwards',
      }),
    );
  }

  skipBtn.addEventListener('click', () => showGrid(true));
  replayBtn.addEventListener('click', play);

  if (reduce || !('IntersectionObserver' in window)) { showGrid(false); return; }

  story.classList.add('is-story');
  scenes.forEach((s, i) => setStep(i, s.steps[0]));
  goTo(0, true);
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && e.intersectionRatio >= 0.35) {
      if (state === 'idle' || state === 'left') play();
    } else if (!e.isIntersecting) {
      if (state === 'done' || state === 'playing') {
        token++;
        state = 'left';
        walker.className = 'story-walker';
      }
    }
  }, { threshold: [0, 0.35] }).observe(story);
}
