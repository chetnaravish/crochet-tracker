// Client-side site search over /search-index.json (built by build/site-plugin.js).
// Every word of the query must appear somewhere in an entry; matches in the title
// count most, then headings, description and body text.

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);

export function searchEntries(entries, query, limit = 40) {
  const terms = words(query);
  if (!terms.length) return [];
  const results = [];
  for (const e of entries) {
    const t = e.t.toLowerCase();
    const all = `${t} ${(e.h || '').toLowerCase()} ${e.d.toLowerCase()} ${(e.x || '').toLowerCase()}`;
    if (!terms.every((w) => all.includes(w))) continue;
    let score = 0;
    for (const w of terms) {
      if (t.includes(w)) score += 10;
      if ((e.h || '').toLowerCase().includes(w)) score += 4;
      if (e.d.toLowerCase().includes(w)) score += 3;
      if ((e.x || '').toLowerCase().includes(w)) score += 1;
    }
    if (e.a && e.a.toLowerCase() === query.trim().toLowerCase()) score += 50; // exact abbreviation
    if (t.startsWith(terms[0])) score += 5;
    if (e.k === 'Stitch' || e.k === 'Guide') score += 1;
    results.push({ e, score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit).map((r) => r.e);
}

// A short excerpt around the first matching word, with matches highlighted.
export function snippet(e, query) {
  const terms = words(query);
  let text = e.d;
  if (e.x && !terms.some((w) => e.d.toLowerCase().includes(w))) {
    const i = e.x.toLowerCase().indexOf(terms[0]);
    if (i >= 0) text = (i > 60 ? '…' : '') + e.x.slice(Math.max(0, i - 60), i + 120) + '…';
  }
  let html = esc(text);
  for (const w of terms) {
    if (w.length < 2) continue;
    html = html.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  }
  return html;
}

// Each result kind gets its own colour and small icon.
const KINDS = {
  Stitch: ['k-stitch', 'Stitches'],
  Abbreviation: ['k-abbr', 'Abbreviations'],
  Glossary: ['k-abbr', 'Abbreviations'],
  'Free pattern': ['k-pattern', 'Patterns'],
  Patterns: ['k-pattern', 'Patterns'],
  Guide: ['k-guide', 'Guides'],
  Page: ['k-page', 'Pages'],
};
const ICONS = {
  'k-stitch': '<svg viewBox="0 0 24 24"><path d="M5 19 15 5"/><path d="M15 5c2-2 4 0 2 2"/><circle cx="8" cy="15" r="3"/></svg>',
  'k-abbr': '<b>Aa</b>',
  'k-pattern': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="2.6"/><circle cx="12" cy="19" r="2.6"/><circle cx="5" cy="12" r="2.6"/><circle cx="19" cy="12" r="2.6"/></svg>',
  'k-guide': '<svg viewBox="0 0 24 24"><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/></svg>',
  'k-page': '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>',
};
export const kindOf = (e) => (KINDS[e.k] || KINDS.Page)[0];
const groupOf = (e) => (KINDS[e.k] || KINDS.Page)[1];
export const iconFor = (e) => `<span class="r-icon" aria-hidden="true">${ICONS[kindOf(e)]}</span>`;
const ARROW = '<svg class="r-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

let indexPromise = null;
export function loadIndex() {
  indexPromise ||= fetch('/search-index.json').then((r) => {
    if (!r.ok) throw new Error('index');
    return r.json();
  });
  indexPromise.catch(() => (indexPromise = null));
  return indexPromise;
}

export async function initSearch(form) {
  const input = form.querySelector('input[name="q"]');
  const list = document.getElementById('search-results');
  const status = document.getElementById('search-status');
  const suggest = document.getElementById('search-suggest');
  const tabs = document.getElementById('search-tabs');
  let entries = null;
  let found = [];
  let filter = 'All';

  try {
    entries = await loadIndex();
  } catch {
    status.textContent = 'Search is not available right now. Please try again later.';
    return;
  }

  const draw = (q) => {
    const shown = filter === 'All' ? found : found.filter((e) => groupOf(e) === filter);
    list.innerHTML = shown
      .map(
        (e, i) => `<li style="--i:${Math.min(i, 12)}"><a class="result ${kindOf(e)}" href="${esc(e.u)}">
          ${iconFor(e)}
          <span class="r-body">
            <span class="r-type">${esc(e.k)}</span>
            <strong class="r-title">${esc(e.t)}</strong>
            <span class="r-text">${snippet(e, q)}</span>
          </span>${ARROW}
        </a></li>`,
      )
      .join('');
  };

  const drawTabs = () => {
    const counts = new Map();
    for (const e of found) counts.set(groupOf(e), (counts.get(groupOf(e)) || 0) + 1);
    tabs.hidden = counts.size < 2;
    if (!counts.has(filter)) filter = 'All';
    tabs.innerHTML = [['All', found.length], ...counts]
      .map(([g, n]) => `<button type="button" data-g="${g}" aria-pressed="${g === filter}">${g} <span>${n}</span></button>`)
      .join('');
  };

  const run = () => {
    const q = input.value.trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    suggest.hidden = !!q;
    form.closest('.search-page')?.classList.toggle('has-q', !!q);
    if (!q) {
      found = [];
      list.innerHTML = '';
      tabs.hidden = true;
      status.textContent = '';
      return;
    }
    found = searchEntries(entries, q);
    status.innerHTML = found.length
      ? `<b>${found.length}${found.length === 40 ? '+' : ''}</b> result${found.length === 1 ? '' : 's'} for <q>${esc(q)}</q>`
      : `No results for <q>${esc(q)}</q>. Try a shorter word, like “inc” or “ring”.`;
    status.classList.toggle('is-empty', !found.length);
    drawTabs();
    draw(q);
  };

  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-g]');
    if (!b) return;
    filter = b.dataset.g;
    for (const t of tabs.children) t.setAttribute('aria-pressed', String(t === b));
    draw(input.value.trim());
  });

  // Popular searches fill the box here instead of reloading the page.
  for (const a of document.querySelectorAll('.search-popular a')) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      input.value = new URL(a.href).searchParams.get('q') || '';
      filter = 'All';
      run();
      input.focus({ preventScroll: true });
    });
  }

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      filter = 'All';
      run();
    }, 120);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    filter = 'All';
    run();
    input.blur(); // closes the phone keyboard so the results are visible
  });

  input.value = new URLSearchParams(location.search).get('q') || '';
  run();
  if (!input.value) input.focus({ preventScroll: true });
}
