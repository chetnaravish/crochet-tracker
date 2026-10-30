// Client-side site search over /search-index.json (built by build/site-plugin.js).
// Every word of the query must appear somewhere in an entry; matches in the title
// count most, then headings, description and body text.

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);

export function searchEntries(entries, query, limit = 25) {
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
function snippet(e, query) {
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

export async function initSearch(form) {
  const input = form.querySelector('input[name="q"]');
  const list = document.getElementById('search-results');
  const status = document.getElementById('search-status');
  const suggest = document.getElementById('search-suggest');
  let entries = null;

  try {
    entries = await (await fetch('/search-index.json')).json();
  } catch {
    status.textContent = 'Search is not available right now. Please try again later.';
    return;
  }

  const run = () => {
    const q = input.value.trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    suggest.hidden = !!q;
    if (!q) {
      list.innerHTML = '';
      status.textContent = '';
      return;
    }
    const found = searchEntries(entries, q);
    status.textContent = found.length
      ? `${found.length}${found.length === 25 ? '+' : ''} result${found.length === 1 ? '' : 's'} for “${q}”`
      : `No results for “${q}”. Try a shorter word, like “inc” or “ring”.`;
    list.innerHTML = found
      .map(
        (e) => `<li><a href="${esc(e.u)}">
          <span class="r-type">${esc(e.k)}</span>
          <strong class="r-title">${esc(e.t)}</strong>
          <span class="r-text">${snippet(e, q)}</span>
        </a></li>`,
      )
      .join('');
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run();
  });

  input.value = new URLSearchParams(location.search).get('q') || '';
  run();
  if (!input.value) input.focus();
}
