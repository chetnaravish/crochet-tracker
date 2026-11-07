// Work Mode: follow a pattern round by round.
// Done rounds collapse with a tick, the current round is big with a stitch counter,
// upcoming rounds stay visible but quiet. Every tap is saved immediately.
import { getPattern, savePattern } from '../../lib/db.js';
import { progressOf } from '../../lib/patterns.js';
import { getSettings, setSetting } from '../../lib/settings.js';
import { keepScreenOn, releaseScreen, wakeLockSupported } from '../wakelock.js';
import { navigate } from '../router.js';
import { esc, icons, toast, confirmDialog, openDialog, buzz, plural } from '../ui.js';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const targetOf = (stitches) => Number((String(stitches).match(/\d+/) || [])[0]) || 0;

export async function renderWork(view, id) {
  const p = await getPattern(id);
  if (!p) {
    view.innerHTML = `
      <header class="topbar"><a class="icon-btn" href="#/saved" aria-label="Back">${icons.back}</a><h1 class="topbar-title">Not found</h1><span></span></header>
      <div class="page empty"><h2>Pattern not found</h2><p>It may have been deleted.</p><a class="btn btn-primary" href="#/saved">Go to saved patterns</a></div>`;
    return;
  }
  p.lastOpenedAt = Date.now();
  p.done = Math.min(p.done || 0, p.rounds.length);
  savePattern(p);

  let focusMode = getSettings().focusMode;
  const details = [
    p.hook && ['Hook', p.hook],
    p.yarn && ['Yarn', p.yarn],
  ].filter(Boolean);

  view.innerHTML = `
    <header class="topbar work-topbar">
      <a class="icon-btn" href="#/saved" aria-label="Back to saved patterns">${icons.back}</a>
      <h1 class="topbar-title">${esc(p.title)}</h1>
      <div class="topbar-actions">
        <a class="icon-btn" href="#/edit/${esc(p.id)}" aria-label="Edit pattern">${icons.edit}</a>
        <button type="button" class="icon-btn" data-act="reset" aria-label="Reset progress">${icons.reset}</button>
      </div>
    </header>

    <div class="work-status">
      <div class="work-progress">
        <span class="work-progress-text" id="prog-text"></span>
        <div class="progress" role="progressbar" aria-label="Pattern progress" aria-valuemin="0" aria-valuemax="${p.rounds.length}" id="prog-bar"><span></span></div>
      </div>
      <button type="button" class="focus-toggle" data-act="focus" aria-pressed="${focusMode}">${icons.focus}<span>Focus</span></button>
    </div>

    <div class="page work-page">
      ${
        details.length || p.notes
          ? `<details class="pattern-details card">
        <summary>Pattern details</summary>
        ${details.length ? `<dl>${details.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
        ${p.notes ? `<p class="notes">${esc(p.notes)}</p>` : ''}
      </details>`
          : ''
      }
      <div class="complete-banner card" id="complete-banner" hidden>
        <strong>🎉 You finished this pattern!</strong>
        <button type="button" class="btn btn-outline" data-act="again">${icons.reset} Make it again</button>
      </div>
      <div class="focus-nav" id="focus-nav" ${focusMode ? '' : 'hidden'}>
        <button type="button" class="focus-arrow" data-act="fprev" aria-label="Previous round">${icons.back}</button>
        <div class="focus-where">
          <span class="focus-round" id="focus-round" aria-live="polite"></span>
          <span class="focus-tag" id="focus-tag"></span>
        </div>
        <button type="button" class="focus-arrow" data-act="fnext" aria-label="Next round">${icons.forward}</button>
        <button type="button" class="btn btn-outline focus-current" data-act="fcur" id="focus-current" hidden>Back to current round</button>
      </div>
      <ol class="work-rounds${focusMode ? ' focus' : ''}" id="work-rounds" role="list">
        ${p.rounds
          .map(
            (r, i) => `
          <li class="work-round" data-i="${i}">
            <div class="wr-head">
              <span class="wr-check" aria-hidden="true">${icons.check}</span>
              <span class="wr-label">Round ${i + 1}<span class="visually-hidden wr-state"></span></span>
              ${i === p.rounds.length - 1 && i > 0 ? '<span class="wr-last">🎉 Last round!</span>' : ''}
              ${r.stitches ? `<span class="wr-sts">${esc(r.stitches)}</span>` : ''}
            </div>
            <p class="wr-text">${esc(r.text) || '<em>No instructions</em>'}</p>
          </li>`,
          )
          .join('')}
      </ol>
      <p class="wake-note" id="wake-note" hidden>${icons.sun}<span>Screen stays on while you crochet</span></p>
    </div>

    <div class="work-actions">
      <button type="button" class="btn btn-outline undo-btn" data-act="undo" aria-label="Undo last round">${icons.undo}<span>Undo</span></button>
      <button type="button" class="btn btn-done btn-lg" data-act="done" id="done-btn"></button>
    </div>`;

  const list = view.querySelector('#work-rounds');
  const items = [...list.children];
  const doneBtn = view.querySelector('#done-btn');
  const undoBtn = view.querySelector('[data-act="undo"]');

  // One counter element that moves into whichever round is current.
  const counter = document.createElement('div');
  counter.className = 'counter';
  counter.setAttribute('role', 'group');
  counter.setAttribute('aria-label', 'Stitch counter');
  counter.innerHTML = `
    <button type="button" class="counter-btn" data-act="minus" aria-label="Remove one stitch">${icons.minus}</button>
    <div class="counter-value" aria-live="polite"><span class="counter-num" id="count">0</span><span class="counter-of" id="count-of"></span></div>
    <button type="button" class="counter-btn plus" data-act="plus" aria-label="Add one stitch">${icons.plus}</button>`;

  const persist = () =>
    savePattern(p).catch((err) => {
      console.error(err);
      toast('Could not save progress – storage may be full.');
    });

  function drawCounter() {
    const target = targetOf(p.rounds[p.done]?.stitches);
    counter.querySelector('#count').textContent = p.stitchCount || 0;
    counter.querySelector('#count-of').textContent = target ? `of ${target} sts` : 'stitches';
    counter.classList.toggle('hit', target > 0 && p.stitchCount === target);
    counter.querySelector('[data-act="minus"]').disabled = !p.stitchCount;
  }

  // Focus Mode shows one card. The arrows let you look at the round before or after;
  // "Back to current round" returns to the round you are working on.
  let viewIdx = null; // null = the current round
  const focusNav = view.querySelector('#focus-nav');
  const currentIdx = () => Math.min(p.done, items.length - 1);
  const shownIdx = () => viewIdx ?? currentIdx();

  function drawFocusNav(dir = 0) {
    focusNav.hidden = !focusMode;
    const i = shownIdx();
    items.forEach((li, k) => {
      li.classList.toggle('is-viewing', k === i);
      li.classList.remove('slide-next', 'slide-prev');
    });
    if (focusMode && dir && !reducedMotion()) {
      void items[i].offsetWidth; // restart the slide animation
      items[i].classList.add(dir > 0 ? 'slide-next' : 'slide-prev');
    }
    view.querySelector('#focus-round').textContent = `Round ${i + 1} of ${items.length}`;
    const tag = view.querySelector('#focus-tag');
    const state = i < p.done ? 'done' : i === p.done ? 'current' : 'next';
    tag.textContent = state === 'done' ? '✓ Done' : state === 'current' ? 'Current' : 'Coming up';
    tag.dataset.state = state;
    focusNav.querySelector('[data-act="fprev"]').disabled = i <= 0;
    focusNav.querySelector('[data-act="fnext"]').disabled = i >= items.length - 1;
    view.querySelector('#focus-current').hidden = progressOf(p).complete || i === currentIdx();
  }

  function look(step) {
    const i = Math.max(0, Math.min(items.length - 1, shownIdx() + step));
    if (i === shownIdx()) return;
    viewIdx = i === currentIdx() ? null : i;
    drawFocusNav(step);
  }

  function update() {
    const { done, total, complete, pct } = progressOf(p);
    const isLast = !complete && total > 1 && done === total - 1;
    items.forEach((li, i) => {
      li.classList.toggle('is-last', i === total - 1);
      li.classList.toggle('is-done', i < done);
      li.classList.toggle('is-current', i === done);
      li.classList.toggle('is-upcoming', i > done);
      li.querySelector('.wr-state').textContent = i < done ? ' (done)' : i === done ? ' (current)' : '';
      // Done rounds can be tapped open to re-read the full instructions.
      if (i < done) {
        li.tabIndex = 0;
        li.setAttribute('role', 'button');
        li.setAttribute('aria-expanded', String(li.classList.contains('peek')));
      } else {
        li.classList.remove('peek');
        li.removeAttribute('tabindex');
        li.removeAttribute('role');
        li.removeAttribute('aria-expanded');
      }
      if (i === done) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    if (!complete) {
      items[done].append(counter);
      drawCounter();
    } else counter.remove();

    view.querySelector('#prog-text').textContent = complete ? `All ${plural(total, 'round')} done` : `${done} / ${total} rounds`;
    const bar = view.querySelector('#prog-bar');
    bar.setAttribute('aria-valuenow', done);
    bar.firstElementChild.style.width = pct + '%';
    view.querySelector('#complete-banner').hidden = !complete;

    doneBtn.innerHTML = complete
      ? `🎉 <span>Pattern complete!</span>`
      : isLast
        ? `${icons.check}<span>Finish · Round ${done + 1}</span>`
        : `${icons.check}<span>Done · Round ${done + 1}</span>`;
    doneBtn.classList.toggle('is-complete', complete);
    undoBtn.disabled = done === 0;
    viewIdx = null;
    drawFocusNav();
  }

  // Gentle, slow scroll (the browser's own "smooth" is quick and jumpy).
  let glideRaf = 0;
  function glide(to, instant = false) {
    to = Math.max(0, Math.min(to, document.documentElement.scrollHeight - innerHeight));
    const from = scrollY;
    const d = to - from;
    cancelAnimationFrame(glideRaf);
    if (Math.abs(d) < 2) return;
    if (instant || reducedMotion()) return window.scrollTo(0, to);
    const dur = Math.min(1100, 550 + Math.abs(d) * 0.5);
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo(0, from + d * e);
      if (k < 1) glideRaf = requestAnimationFrame(step);
    };
    glideRaf = requestAnimationFrame(step);
  }

  // Keep the current round in view without hiding what you just did:
  // - if the current round is already fully on screen, nothing moves;
  // - otherwise the page glides so the last 2 done rounds stay at the top,
  //   with the current round and the next ones under them.
  function scrollToCurrent({ instant = false, force = false } = {}) {
    if (focusMode) return glide(0, instant);
    const i = currentIdx();
    const cur = items[i];
    if (!cur) return;
    const top = view.querySelector('.work-status').getBoundingClientRect().bottom + 10;
    const bottom = view.querySelector('.work-actions').getBoundingClientRect().top - 12;
    const r = cur.getBoundingClientRect();
    if (!force && r.top >= top && r.bottom <= bottom) return;
    const anchor = items[Math.max(0, i - 2)];
    let to = scrollY + anchor.getBoundingClientRect().top - top;
    // A very tall current round must still show fully: then give up the done rounds first.
    const curBottom = r.bottom - (to - scrollY);
    if (curBottom > bottom) to += Math.min(curBottom - bottom, r.top - (to - scrollY) - top);
    glide(to, instant);
  }
  // Wait for the round cards to finish growing/shrinking before measuring.
  let followT = 0;
  const followCurrent = (opts) => {
    clearTimeout(followT);
    followT = setTimeout(() => scrollToCurrent(opts), 340);
  };

  async function markDone() {
    if (progressOf(p).complete) return celebrate();
    const li = items[p.done];
    p.done += 1;
    p.stitchCount = 0;
    p.updatedAt = Date.now();
    persist();
    buzz();
    li.classList.add('just-done');
    setTimeout(() => li.classList.remove('just-done'), 900);
    update();
    if (progressOf(p).complete) celebrate();
    else followCurrent();
  }

  function undo() {
    if (!p.done) return;
    p.done -= 1;
    p.stitchCount = 0;
    p.updatedAt = Date.now();
    persist();
    update();
    followCurrent();
    toast(`Round ${p.done + 1} is back to not done`);
  }

  function restart() {
    p.done = 0;
    p.stitchCount = 0;
    p.updatedAt = Date.now();
    persist();
    update();
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  async function reset() {
    if (!p.done && !p.stitchCount) return toast('Nothing to reset yet');
    const ok = await confirmDialog({
      title: 'Reset progress?',
      message: 'All rounds will be marked as not done, so you can make this pattern again. Your pattern itself stays the same.',
      confirmText: 'Reset',
      danger: true,
    });
    if (!ok) return;
    restart();
    toast('Progress reset – fresh start!');
  }

  function count(delta) {
    p.stitchCount = Math.max(0, (p.stitchCount || 0) + delta);
    persist();
    drawCounter();
    if (delta > 0) buzz(8);
  }

  async function celebrate() {
    const confetti = Array.from({ length: 24 }, (_, i) => `<span style="--i:${i}"></span>`).join('');
    const choice = await openDialog(
      `<div class="confetti" aria-hidden="true">${confetti}</div>
      <form method="dialog" class="dialog-body celebrate-body">
        <div class="celebrate-emoji" aria-hidden="true">🧶</div>
        <h2 class="dialog-title">Pattern complete!</h2>
        <p>You finished all ${plural(p.rounds.length, 'round')} of “${esc(p.title)}”. Time to admire your work!</p>
        <div class="dialog-actions stack">
          <button class="btn btn-primary btn-lg" value="saved" autofocus>Back to my patterns</button>
          <button class="btn btn-outline" value="again">${icons.reset} Make it again</button>
          <button class="btn btn-ghost" value="">Stay here</button>
        </div>
      </form>`,
      { className: 'celebrate-dialog' },
    );
    if (choice === 'saved') navigate('/saved');
    if (choice === 'again') restart();
  }

  function togglePeek(li) {
    const open = li.classList.toggle('peek');
    li.setAttribute('aria-expanded', String(open));
  }
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.work-round.is-done');
    if (li) togglePeek(li);
  });
  list.addEventListener('keydown', (e) => {
    const li = e.target.closest('.work-round.is-done');
    if (li && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      togglePeek(li);
    }
  });

  view.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'done') markDone();
    else if (act === 'undo') undo();
    else if (act === 'reset') reset();
    else if (act === 'again') restart();
    else if (act === 'plus') count(1);
    else if (act === 'minus') count(-1);
    else if (act === 'fprev') look(-1);
    else if (act === 'fnext') look(1);
    else if (act === 'fcur') {
      const dir = Math.sign(currentIdx() - shownIdx());
      viewIdx = null;
      drawFocusNav(dir);
    } else if (act === 'focus') {
      focusMode = !focusMode;
      setSetting('focusMode', focusMode);
      list.classList.toggle('focus', focusMode);
      e.target.closest('[data-act]').setAttribute('aria-pressed', String(focusMode));
      viewIdx = null;
      drawFocusNav();
      scrollToCurrent({ force: true });
    }
  });

  // Desktop shortcuts: D = done, U = undo, + / - = stitch counter.
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'd') markDone();
    else if (k === 'u') undo();
    else if (k === '+' || k === '=') count(1);
    else if (k === '-') count(-1);
    else if (focusMode && e.key === 'ArrowLeft') look(-1);
    else if (focusMode && e.key === 'ArrowRight') look(1);
  };

  // Focus Mode: swipe left/right on the card to look at the next/previous round.
  let sx = null;
  let sy = 0;
  list.addEventListener(
    'touchstart',
    (e) => {
      sx = focusMode && e.touches.length === 1 ? e.touches[0].clientX : null;
      sy = e.touches[0].clientY;
    },
    { passive: true },
  );
  list.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) look(dx < 0 ? 1 : -1);
  });
  document.addEventListener('keydown', onKey);

  const wakeNote = view.querySelector('#wake-note');
  if (wakeLockSupported()) keepScreenOn((on) => (wakeNote.hidden = !on));

  update();
  if (p.done > 0) requestAnimationFrame(() => scrollToCurrent({ instant: true, force: true }));

  return () => {
    releaseScreen();
    cancelAnimationFrame(glideRaf);
    clearTimeout(followT);
    document.removeEventListener('keydown', onKey);
  };
}
