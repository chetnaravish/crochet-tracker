// Small script for the public pages: offline support, "Open in Tracker" buttons
// and the glossary filter. Loaded as a module, so it never blocks rendering.
import { registerServiceWorker } from './lib/sw-register.js';

registerServiceWorker();

// Mobile menu (☰): opens the main nav as a list; closes on Escape, outside tap or link tap.
const menuBtn = document.querySelector('.menu-toggle');
const siteNav = document.getElementById('site-nav');
if (menuBtn && siteNav) {
  const setOpen = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    siteNav.classList.toggle('open', open);
  };
  menuBtn.addEventListener('click', () => setOpen(menuBtn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('open')) {
      setOpen(false);
      menuBtn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (siteNav.classList.contains('open') && !e.target.closest('.site-header')) setOpen(false);
  });
  siteNav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  // Touch feedback: the link lights up as soon as a finger is on it (before the tap
  // ends), and turns off again if the finger slides away to scroll.
  let pressed = null;
  const release = () => {
    pressed?.classList.remove('is-pressed');
    pressed = null;
  };
  siteNav.addEventListener('pointerdown', (e) => {
    release();
    pressed = e.target.closest('a');
    pressed?.classList.add('is-pressed');
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => siteNav.addEventListener(t, release));
}

// Back button: return to the exact previous page (including an app screen) when the
// visitor came from this site; otherwise the link's href goes to the parent page.
const back = document.querySelector('[data-back]');
if (back) {
  let fromThisSite = false;
  try {
    fromThisSite = new URL(document.referrer).origin === location.origin;
  } catch {}
  if (fromThisSite && history.length > 1) {
    back.addEventListener('click', (e) => {
      e.preventDefault();
      history.back();
    });
  }
}

// "Back to Tracker": the app remembers its last screen for this browser session.
let appUrl = null;
try {
  appUrl = sessionStorage.getItem('ct-app-url');
} catch {}
if (appUrl && appUrl.startsWith('/app/')) {
  const link = document.createElement('a');
  link.className = 'to-tracker';
  link.href = appUrl;
  link.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg><span>Back to Tracker</span>';
  document.body.append(link);
  document.body.classList.add('has-to-tracker');
}

// Free patterns: save the pattern into the app's database and open Work Mode.
for (const btn of document.querySelectorAll('[data-open-pattern]')) {
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const { openFreePattern } = await import('./lib/free-pattern.js');
      await openFreePattern(btn.closest('[data-pattern]'));
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      const status = btn.parentElement.querySelector('.open-status');
      if (status) status.textContent = 'Sorry, this browser blocked saving. Try a normal (non-private) window.';
    }
  });
}

// Free PDFs: open a preview first (download only from inside the preview).
document.addEventListener('click', async (e) => {
  const link = e.target.closest('[data-pdf-view]');
  if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  try {
    const { openPdfViewer } = await import('./lib/pdf-viewer.js');
    if (!(await openPdfViewer(link.dataset.pdfView, link))) throw new Error('missing');
  } catch {
    // Preview not available (e.g. offline): fall back to the link itself.
    location.href = link.href;
  }
});

// Pattern pages: tap a stitch word (sc, inc…) for a small "how to" popup.
const stitchData = document.querySelector('script[data-stitch-info]');
if (stitchData) import('./lib/stitch-pop.js').then(({ initStitchPop }) => initStitchPop(stitchData));

// Pattern pages: Print / Save as PDF (print styles hide everything but the pattern).
for (const btn of document.querySelectorAll('[data-print]')) btn.addEventListener('click', () => window.print());

// Site search page.
const searchForm = document.getElementById('site-search');
if (searchForm) import('./lib/search.js').then(({ initSearch }) => initSearch(searchForm));

// Header search icon: opens a search box in place instead of loading a new page.
// On the search page itself it just jumps to the big search box.
const searchLink = document.querySelector('.search-link');
if (searchLink) {
  searchLink.setAttribute('aria-expanded', 'false');
  searchLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (searchForm) {
      const box = searchForm.querySelector('input');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      box.focus({ preventScroll: true });
      box.select();
      return;
    }
    const { toggleQuickSearch } = await import('./lib/quick-search.js');
    toggleQuickSearch(searchLink);
  });
}

// Abbreviation glossary: live filter (pre-filled from ?q= when coming from search).
const filter = document.getElementById('abbr-filter');
if (filter) {
  const rows = [...document.querySelectorAll('[data-filter-rows] tbody tr:not(.gl-group)')];
  const groups = [...document.querySelectorAll('[data-filter-rows] tbody')];
  const count = document.getElementById('abbr-count');
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    for (const row of rows) {
      const match = !q || row.textContent.toLowerCase().includes(q);
      row.hidden = !match;
      if (match) shown++;
    }
    // Hide a group heading when none of its rows match.
    for (const g of groups) {
      const head = g.querySelector('.gl-group');
      if (head) head.hidden = ![...g.rows].some((r) => r !== head && !r.hidden);
    }
    count.textContent = q ? (shown ? `${shown} of ${rows.length} abbreviations match` : 'No abbreviation matches. Try a shorter word.') : '';
  });
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    filter.value = q;
    filter.dispatchEvent(new Event('input'));
    filter.scrollIntoView({ block: 'start' });
  }
}

// Article sidebar: highlight the section you are reading in "On this page".
const tocLinks = [...document.querySelectorAll('.side-toc a')];
if (tocLinks.length && 'IntersectionObserver' in window) {
  const byId = new Map(tocLinks.map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      tocLinks.forEach((a) => a.classList.remove('is-active'));
      byId.get(e.target.id)?.classList.add('is-active');
    }
  }, { rootMargin: '-90px 0px -65% 0px' });
  for (const id of byId.keys()) {
    const h = document.getElementById(id);
    if (h) spy.observe(h);
  }
}

// Sticky header: a soft shadow once the page has scrolled.
const header = document.querySelector('.site-header');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
