// PDF preview inside the site. Any link with data-pdf-view="<key>" opens the pages of
// that PDF as images first (public/pdf/pages/, made by scripts/make-pdfs.mjs).
// - A single pattern: preview, then a "Download PDF" button.
// - The pattern book: view only, no download. It lists the single patterns instead,
//   which open in this same preview first.
// Images (not the PDF itself) are used because Android browsers download PDFs
// instead of showing them.

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let manifest = null;
let dialog = null;
let opener = null;

async function loadManifest() {
  if (!manifest) manifest = await (await fetch('/pdf/pages.json')).json();
  return manifest;
}

function build() {
  dialog = document.createElement('dialog');
  dialog.className = 'pv';
  dialog.setAttribute('aria-labelledby', 'pv-title');
  dialog.innerHTML = `
    <div class="pv-head">
      <div class="pv-head-text"><h2 id="pv-title"></h2><p class="pv-sub"></p></div>
      <button type="button" class="pv-close" aria-label="Close preview">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <div class="pv-pages" tabindex="0" aria-label="PDF pages"></div>
    <div class="pv-foot"></div>`;
  document.body.append(dialog);
  dialog.querySelector('.pv-close').addEventListener('click', () => dialog.close());
  // Click on the dark backdrop closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('pv-open');
    opener?.focus({ preventScroll: true });
  });
  // The book is view-only: no right-click "save image" or dragging pages out.
  dialog.addEventListener('contextmenu', (e) => {
    if (dialog.classList.contains('is-book') && e.target.closest('.pv-pages')) e.preventDefault();
  });
  // Footer buttons that switch to a single pattern preview.
  dialog.querySelector('.pv-foot').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pv-key]');
    if (b) show(b.dataset.pvKey);
  });
}

function show(key) {
  const item = manifest[key];
  if (!item) return;
  const isBook = !item.pdf;
  dialog.classList.toggle('is-book', isBook);
  dialog.querySelector('#pv-title').textContent = item.title;
  dialog.querySelector('.pv-sub').textContent = isBook
    ? `View only · ${item.pages} pages`
    : `PDF preview · ${item.pages} page${item.pages === 1 ? '' : 's'}`;

  const pages = dialog.querySelector('.pv-pages');
  pages.innerHTML = Array.from(
    { length: item.pages },
    (_, i) => `<figure class="pv-page" style="--i:${Math.min(i, 6)}">
        <img src="/pdf/pages/${esc(key)}-${i + 1}.webp" alt="${esc(item.title)}, page ${i + 1} of ${item.pages}" width="1100" height="1556" ${i > 1 ? 'loading="lazy"' : ''} draggable="false">
        <figcaption>Page ${i + 1} of ${item.pages}</figcaption>
      </figure>`,
  ).join('');
  pages.scrollTop = 0;

  const foot = dialog.querySelector('.pv-foot');
  if (isBook) {
    foot.innerHTML = `<p class="pv-note">The pattern book is view-only. Like a pattern? Preview it on its own and download that PDF for free:</p>
      <div class="pv-picks">${item.items
        .filter((k) => manifest[k])
        .map((k) => `<button type="button" class="btn btn-outline" data-pv-key="${esc(k)}">${esc(manifest[k].title)}</button>`)
        .join('')}</div>`;
  } else {
    const back = manifest.book ? '<button type="button" class="btn btn-ghost" data-pv-key="book">← Pattern book</button>' : '';
    foot.innerHTML = `<p class="pv-note">Like this pattern? Download the free PDF to print it or keep it on your phone.</p>
      <div class="pv-picks">${back}<a class="btn btn-primary" href="${esc(item.pdf)}" download>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
        Download PDF</a></div>`;
  }
}

export async function openPdfViewer(key, from) {
  await loadManifest();
  if (!manifest[key]) return false;
  if (!dialog) build();
  opener = from;
  show(key);
  document.documentElement.classList.add('pv-open');
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.pv-close').focus({ preventScroll: true });
  return true;
}
