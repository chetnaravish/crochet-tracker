// Header search: the search icon opens a box right under the header (no page load).
// Typing shows the top matches instantly; Enter opens the full results page
// (/search/?q=…). Escape, the close button or a click outside closes it.
import { loadIndex, searchEntries, iconFor, kindOf } from './search.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MAX = 6;

let panel, input, list, opener, active = -1;

function build() {
  panel = document.createElement('div');
  panel.className = 'qs';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="qs-card" role="dialog" aria-label="Search the site">
      <form class="qs-form" action="/search/" method="get" role="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <label class="visually-hidden" for="qs-input">Search the site</label>
        <input id="qs-input" name="q" type="search" placeholder="Search stitches, abbreviations, patterns…" autocomplete="off" enterkeyhint="search"
          role="combobox" aria-expanded="false" aria-controls="qs-list" aria-autocomplete="list">
        <button type="button" class="qs-close" aria-label="Close search">Esc</button>
      </form>
      <ul class="qs-list" id="qs-list" role="listbox"></ul>
      <p class="qs-hint">Press <kbd>Enter</kbd> to see all results</p>
    </div>`;
  document.querySelector('.site-header').after(panel);
  input = panel.querySelector('input');
  list = panel.querySelector('.qs-list');

  panel.querySelector('.qs-close').addEventListener('click', () => close(true));
  panel.querySelector('form').addEventListener('submit', (e) => {
    const q = input.value.trim();
    if (active >= 0) {
      e.preventDefault();
      location.href = list.children[active].querySelector('a').href;
    } else if (!q) e.preventDefault();
    // Otherwise the form goes to /search/?q=… (the full results page).
  });
  input.addEventListener('input', update);
  input.addEventListener('keydown', (e) => {
    const n = list.children.length;
    if (e.key === 'ArrowDown' && n) { e.preventDefault(); setActive((active + 1) % n); }
    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); setActive((active - 1 + n) % n); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(true); });
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !e.target.closest('.qs-card') && !e.target.closest('.search-link')) close(false);
  });
}

function setActive(i) {
  active = i;
  [...list.children].forEach((li, j) => li.classList.toggle('is-active', j === i));
  input.setAttribute('aria-activedescendant', i >= 0 ? `qs-${i}` : '');
}

async function update() {
  const q = input.value.trim();
  setActive(-1);
  panel.classList.toggle('has-q', !!q);
  if (!q) { list.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); return; }
  let entries;
  try { entries = await loadIndex(); } catch { list.innerHTML = '<li class="qs-empty">Search is not available right now.</li>'; return; }
  if (input.value.trim() !== q) return; // a newer keystroke is already running
  const found = searchEntries(entries, q, 40);
  input.setAttribute('aria-expanded', 'true');
  list.innerHTML = found.length
    ? found.slice(0, MAX).map((e, i) => `<li id="qs-${i}" role="option" style="--i:${i}"><a class="${kindOf(e)}" href="${esc(e.u)}">${iconFor(e)}
        <span><strong>${esc(e.t)}</strong><small>${esc(e.k)}</small></span></a></li>`).join('') +
      (found.length > MAX ? `<li class="qs-more"><a href="/search/?q=${encodeURIComponent(q)}">See all ${found.length >= 40 ? '40+' : found.length} results →</a></li>` : '')
    : `<li class="qs-empty">No matches for “${esc(q)}”. Try a shorter word, like “inc”.</li>`;
}

function open(btn) {
  if (!panel) build();
  opener = btn;
  // Sit right under the header (it is taller on phones, where the nav wraps).
  const bottom = document.querySelector('.site-header').getBoundingClientRect().bottom;
  panel.style.setProperty('--qs-top', `${Math.max(0, Math.round(bottom))}px`);
  panel.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => panel.classList.add('is-open'));
  input.focus({ preventScroll: true });
  loadIndex().catch(() => {});
}

function close(returnFocus) {
  panel.classList.remove('is-open');
  panel.hidden = true;
  opener?.setAttribute('aria-expanded', 'false');
  if (returnFocus) opener?.focus();
}

export function toggleQuickSearch(btn) {
  if (panel && !panel.hidden) close(true);
  else open(btn);
}
