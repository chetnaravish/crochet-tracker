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
      <div class="pv-head-text"><h2 id="pv-title"></h2><p class="pv-sub"><span class="pv-kind"></span> · <span class="pv-at"></span></p></div>
      <button type="button" class="pv-icon pv-toc-btn" aria-expanded="false" aria-controls="pv-toc">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>
        <span>Contents</span>
      </button>
      <a class="pv-icon pv-dl" href="#" download aria-label="Download PDF">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
        <span>Download</span>
      </a>
      <button type="button" class="pv-icon pv-close" aria-label="Close preview">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <div class="pv-body">
      <div class="pv-pages" tabindex="0" aria-label="PDF pages"></div>
      <nav class="pv-toc" id="pv-toc" aria-label="Pattern book contents" hidden></nav>
    </div>
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
  // Buttons that switch to a single pattern preview (footer, contents).
  dialog.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pv-key]');
    if (b) show(b.dataset.pvKey);
    const go = e.target.closest('[data-pv-page]');
    if (go) {
      toggleToc(false);
      goToPage(+go.dataset.pvPage);
    }
  });
  dialog.querySelector('.pv-toc-btn').addEventListener('click', () => toggleToc());
  // "Page 5 of 67" in the header follows the scroll.
  const pages = dialog.querySelector('.pv-pages');
  let raf = 0;
  pages.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateAt);
  }, { passive: true });
}

function toggleToc(open) {
  const toc = dialog.querySelector('.pv-toc');
  const btn = dialog.querySelector('.pv-toc-btn');
  open ??= toc.hidden;
  toc.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if (open) toc.querySelector('button')?.focus({ preventScroll: true });
}

function goToPage(n) {
  const fig = dialog.querySelectorAll('.pv-page')[n - 1];
  const pages = dialog.querySelector('.pv-pages');
  if (fig) pages.scrollTo({ top: fig.offsetTop - pages.offsetTop - 8, behavior: 'smooth' });
}

function updateAt() {
  const pages = dialog.querySelector('.pv-pages');
  const figs = pages.querySelectorAll('.pv-page');
  const mid = pages.scrollTop + pages.clientHeight / 3 + pages.offsetTop;
  let at = 1;
  figs.forEach((f, i) => {
    if (f.offsetTop <= mid) at = i + 1;
  });
  dialog.querySelector('.pv-at').textContent = `Page ${at} of ${figs.length}`;
}

function show(key) {
  const item = manifest[key];
  if (!item) return;
  const isBook = !item.pdf;
  dialog.classList.toggle('is-book', isBook);
  dialog.querySelector('#pv-title').textContent = item.title;
  dialog.querySelector('.pv-kind').textContent = isBook ? 'View only' : 'PDF preview';
  dialog.querySelector('.pv-at').textContent = `Page 1 of ${item.pages}`;
  // Download sits in the header so it is always in reach; the book has none.
  const dl = dialog.querySelector('.pv-dl');
  dl.hidden = isBook;
  if (!isBook) dl.href = item.pdf;
  dialog.querySelector('.pv-toc-btn').hidden = !isBook;
  toggleToc(false);
  if (isBook) {
    const toc = item.toc || [];
    dialog.querySelector('.pv-toc').innerHTML = `
      <p class="pv-toc-head">Contents <span>${toc.length} patterns</span></p>
      <ol>${toc
        .map(
          (t, i) => `<li>
            <button type="button" class="pv-toc-go" data-pv-page="${t.page}"><b>${i + 1}</b><span>${esc(t.title)}</span><em>p. ${t.page}</em></button>
            <button type="button" class="pv-toc-one" data-pv-key="${esc(t.key)}" aria-label="Open ${esc(t.title)} on its own">Single PDF</button>
          </li>`,
        )
        .join('')}</ol>`;
  }

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
    foot.innerHTML = `<p class="pv-note pv-note-row"><span>View only. To download a pattern: <b>Contents</b> → <b>Single PDF</b>.</span>
      <button type="button" class="btn btn-outline pv-foot-toc">Contents</button></p>`;
    foot.querySelector('.pv-foot-toc').addEventListener('click', () => toggleToc(true));
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
