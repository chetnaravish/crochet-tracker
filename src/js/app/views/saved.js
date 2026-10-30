// Saved patterns: search, sort, open, and Edit / Duplicate / Delete via "…" or long-press.
import { getAllPatterns, savePattern, deletePattern } from '../../lib/db.js';
import { progressOf, duplicatePattern } from '../../lib/patterns.js';
import { navigate } from '../router.js';
import { esc, icons, formatDate, actionSheet, confirmDialog, toast } from '../ui.js';

const SORT_KEY = 'ct-sort';
const LONG_PRESS_MS = 500;

export async function renderSaved(view) {
  let patterns = await getAllPatterns();
  let query = '';
  let sort = (() => {
    try {
      return localStorage.getItem(SORT_KEY) || 'recent';
    } catch {
      return 'recent';
    }
  })();

  view.innerHTML = `
    <header class="topbar">
      <h1 class="topbar-title">Saved patterns</h1>
      <a class="icon-btn" href="#/settings" aria-label="Settings">${icons.settings}</a>
    </header>
    <div class="page">
      <div class="saved-tools" ${patterns.length ? '' : 'hidden'}>
        <label class="visually-hidden" for="search">Search patterns</label>
        <input id="search" type="search" placeholder="Search patterns" autocomplete="off" enterkeyhint="search">
        <div class="segmented" role="radiogroup" aria-label="Sort by">
          <button type="button" role="radio" data-sort="recent">Recent</button>
          <button type="button" role="radio" data-sort="name">Name</button>
        </div>
      </div>
      <div id="list" class="pattern-list"></div>
    </div>`;

  const list = view.querySelector('#list');
  const search = view.querySelector('#search');

  function draw() {
    for (const b of view.querySelectorAll('[data-sort]')) b.setAttribute('aria-checked', String(b.dataset.sort === sort));
    view.querySelector('.saved-tools').hidden = !patterns.length;

    if (!patterns.length) {
      list.innerHTML = `
        <div class="empty">
          <div class="empty-art" aria-hidden="true">🧶</div>
          <h2>No patterns yet</h2>
          <p>Write or paste your first pattern and follow it round by round.</p>
          <a class="btn btn-primary btn-lg" href="#/create">${icons.plus} Create your first pattern</a>
          <p class="fine-print">Or try one of our <a href="/free-patterns/">free beginner patterns</a>.</p>
        </div>`;
      return;
    }

    const q = query.trim().toLowerCase();
    const shown = patterns
      .filter((p) => !q || p.title.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === 'name'
          ? a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
          : (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt),
      );

    if (!shown.length) {
      list.innerHTML = `<p class="empty-search" role="status">No patterns match “${esc(query)}”.</p>`;
      return;
    }

    list.innerHTML = `<ul class="cards" role="list">${shown
      .map((p) => {
        const pr = progressOf(p);
        return `
        <li class="card pattern-card${pr.complete ? ' is-complete' : ''}" data-id="${esc(p.id)}">
          <a class="pattern-open" href="#/work/${esc(p.id)}">
            <span class="pattern-title">${esc(p.title)}</span>
            <span class="progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="${pr.total}" aria-valuenow="${pr.done}"><span style="width:${pr.pct}%"></span></span>
            <span class="pattern-meta">
              <span>${pr.complete ? '✓ Complete' : `${pr.done} / ${pr.total} rounds`}</span>
              <span>Opened: ${formatDate(p.lastOpenedAt)}</span>
            </span>
          </a>
          <button type="button" class="icon-btn card-menu" aria-label="More options for ${esc(p.title)}">${icons.more}</button>
        </li>`;
      })
      .join('')}</ul>`;
  }

  async function openMenu(id) {
    const p = patterns.find((x) => x.id === id);
    if (!p) return;
    const choice = await actionSheet(p.title, [
      { id: 'open', label: 'Open', icon: 'yarn' },
      { id: 'edit', label: 'Edit', icon: 'edit' },
      { id: 'duplicate', label: 'Duplicate', icon: 'copy' },
      { id: 'delete', label: 'Delete', icon: 'trash', danger: true },
    ]);
    if (choice === 'open') navigate(`/work/${id}`);
    if (choice === 'edit') navigate(`/edit/${id}`);
    if (choice === 'duplicate') {
      const copy = duplicatePattern(p);
      await savePattern(copy);
      patterns.push(copy);
      draw();
      toast(`Duplicated “${p.title}”`);
    }
    if (choice === 'delete') {
      const ok = await confirmDialog({
        title: 'Delete this pattern?',
        message: `“${p.title}” and its progress will be removed from this device. This can't be undone.`,
        confirmText: 'Delete',
        danger: true,
      });
      if (!ok) return;
      await deletePattern(id);
      patterns = patterns.filter((x) => x.id !== id);
      draw();
      toast('Pattern deleted');
    }
  }

  search.addEventListener('input', () => {
    query = search.value;
    draw();
  });

  view.querySelector('.segmented').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sort]');
    if (!b) return;
    sort = b.dataset.sort;
    try {
      localStorage.setItem(SORT_KEY, sort);
    } catch {}
    draw();
  });

  list.addEventListener('click', (e) => {
    const menuBtn = e.target.closest('.card-menu');
    if (menuBtn) openMenu(menuBtn.closest('[data-id]').dataset.id);
  });

  // Long-press a card to open its menu.
  let timer = null;
  let pressed = null;
  let longPressed = false;
  list.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.pattern-open');
    if (!card || e.button > 0) return;
    longPressed = false;
    pressed = card;
    timer = setTimeout(() => {
      longPressed = true;
      navigator.vibrate?.(20);
      openMenu(card.closest('[data-id]').dataset.id);
    }, LONG_PRESS_MS);
  });
  const cancel = () => clearTimeout(timer);
  list.addEventListener('pointerup', cancel);
  list.addEventListener('pointercancel', cancel);
  list.addEventListener('pointermove', (e) => {
    if (pressed && (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4)) cancel();
  });
  list.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.pattern-open')) e.preventDefault();
  });
  // Don't follow the link after a long press.
  list.addEventListener(
    'click',
    (e) => {
      if (longPressed && e.target.closest('.pattern-open')) {
        e.preventDefault();
        longPressed = false;
      }
    },
    true,
  );

  draw();
}
