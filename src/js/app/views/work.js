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
      <ol class="work-rounds${focusMode ? ' focus' : ''}" id="work-rounds" role="list">
        ${p.rounds
          .map(
            (r, i) => `
          <li class="work-round" data-i="${i}">
            <div class="wr-head">
              <span class="wr-check" aria-hidden="true">${icons.check}</span>
              <span class="wr-label">Round ${i + 1}<span class="visually-hidden wr-state"></span></span>
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

  function update() {
    const { done, total, complete, pct } = progressOf(p);
    items.forEach((li, i) => {
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
      : `${icons.check}<span>Done · Round ${done + 1}</span>`;
    doneBtn.classList.toggle('is-complete', complete);
    undoBtn.disabled = done === 0;
  }

  function scrollToCurrent() {
    const target = items[Math.min(p.done, items.length - 1)];
    target?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

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
    else scrollToCurrent();
  }

  function undo() {
    if (!p.done) return;
    p.done -= 1;
    p.stitchCount = 0;
    p.updatedAt = Date.now();
    persist();
    update();
    scrollToCurrent();
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
    else if (act === 'focus') {
      focusMode = !focusMode;
      setSetting('focusMode', focusMode);
      list.classList.toggle('focus', focusMode);
      e.target.closest('[data-act]').setAttribute('aria-pressed', String(focusMode));
      scrollToCurrent();
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
  };
  document.addEventListener('keydown', onKey);

  const wakeNote = view.querySelector('#wake-note');
  if (wakeLockSupported()) keepScreenOn((on) => (wakeNote.hidden = !on));

  update();
  if (p.done > 0) requestAnimationFrame(() => items[Math.min(p.done, items.length - 1)].scrollIntoView({ block: 'start' }));

  return () => {
    releaseScreen();
    document.removeEventListener('keydown', onKey);
  };
}
