// Free PDFs: one downloadable PDF per pattern, plus a "pattern book" with every
// pattern and a cover page that visitors can only view (it is not published as a PDF).
// Uses the print styles of the pattern pages, so the PDFs match "Print".
// Every page is also saved as an image (public/pdf/pages/) for the in-site preview,
// which works on every phone (Android browsers download PDFs instead of showing them).
// Output goes to public/pdf/ and is committed.
//
// Run with: npm run build && npm run pdfs && npm run build
// (rerun after adding or editing a pattern, and after changing SITE_URL)
// Needs Microsoft Edge or Google Chrome. Set BROWSER=path\to\browser.exe to choose one.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadPatterns } from '../build/pattern-pages.js';
import { SITE_URL } from '../site.config.js';

const DIST = path.resolve('dist');
const OUT = path.resolve('public/pdf');
const PAGES = path.join(OUT, 'pages');
const PDFJS = path.resolve('node_modules/pdfjs-dist/build');
let bookPages = null; // slug -> page number in the book (after the first run)
const made = new Map(); // file name -> PDF bytes, served to the page renderer
const BROWSERS = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const browserPath = BROWSERS.find((p) => fs.existsSync(p));
if (!browserPath) throw new Error('No Edge or Chrome found. Set BROWSER=path to one.');
if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('Run "npm run build" first.');

const patterns = loadPatterns().filter((p) => !p.draft).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
const read = (slug) => fs.readFileSync(path.join(DIST, 'free-patterns', slug, 'index.html'), 'utf8');

// The printable part of a pattern page: the themed wrapper and its "paper".
function paperOf(html) {
  const style = (html.match(/<article class="container pp" style="([^"]*)"/) || [])[1] || "";
  const open = `<div class="pp" style="${style}">`;
  const start = html.indexOf('<div class="pp-paper"');
  const end = html.indexOf('<section class="pp-tracker');
  return `${open}${html.slice(start, end)}</div>`;
}

// The book: a cover, a contents page with the page number where each pattern starts,
// then every pattern on fresh pages. Made twice: the first run (pageOf = null) finds
// where each pattern lands (an invisible marker per pattern, read back with pdf.js),
// the second run prints those page numbers. The contents page has the same size in
// both runs, so nothing moves.
function bookHtml(pageOf) {
  const first = read(patterns[0].slug);
  const head = first.slice(0, first.indexOf('</head>')).replace(/<title>[^<]*<\/title>/, '<title>Free Crochet Pattern Book</title>');
  const rows = patterns
    .map((p, i) => `<li><b>${i + 1}</b><span class="t">${p.title}<em>${p.level || ''}</em></span><span class="dots"></span><span class="pg">${pageOf ? pageOf[p.slug] : '00'}</span></li>`)
    .join('');
  return `${head}
  <style>
    body { background: #fff; }
    .book-cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0 14mm; }
    .book-cover .k { letter-spacing: .25em; font-weight: 800; color: #b4436c; font-size: 13pt; }
    .book-cover h1 { font-size: 46pt; line-height: 1.05; margin: 8mm 0 6mm; }
    .book-cover p { font-size: 14pt; color: #444; max-width: 140mm; margin: 0 auto; }
    .book-cover .ring { width: 46mm; height: 46mm; margin: 0 auto 10mm; border-radius: 50%; background: #b4436c; position: relative; }
    .book-cover .ring::before, .book-cover .ring::after { content: ''; position: absolute; inset: 7mm; border: 2.4mm solid #fff; border-radius: 50%; opacity: .85; }
    .book-cover .ring::after { inset: 15mm; }
    .book-cover .facts { margin-top: 12mm; display: flex; gap: 6mm; justify-content: center; font-size: 11pt; font-weight: 700; color: #b4436c; }
    .book-cover .facts span { border: 1.5px solid #e8c9d4; border-radius: 99px; padding: 2mm 5mm; }
    .book-cover .site { margin-top: 14mm; font-size: 10.5pt; color: #777; }
    .book-toc { break-before: page; padding: 2mm 10mm 0; }
    .book-toc h2 { font-size: 24pt; margin: 0 0 1mm; }
    .book-toc .sub { margin: 0 0 6mm; color: #666; font-size: 11pt; }
    .book-toc ol { list-style: none; padding: 0; margin: 0; }
    .book-toc li { display: flex; align-items: baseline; gap: 3mm; padding: 1.3mm 0; font-size: 11.5pt; }
    .book-toc li b { width: 8mm; color: #b4436c; flex: none; }
    .book-toc .t { flex: none; max-width: 120mm; }
    .book-toc .t em { margin-left: 3mm; color: #888; font-style: normal; font-size: 9.5pt; }
    .book-toc .dots { flex: 1; border-bottom: 1.5px dotted #bbb; transform: translateY(-1mm); }
    .book-toc .pg { flex: none; min-width: 8mm; text-align: right; font-weight: 800; }
    .book-part { break-before: page; }
    .book-mark { font-size: 1px; line-height: 1px; color: #fff; height: 1px; overflow: hidden; }
  </style>
  </head><body>
  <section class="book-cover">
    <div class="ring"></div>
    <div class="k">FREE CROCHET PATTERN BOOK</div>
    <h1>Easy Crochet Patterns for Beginners</h1>
    <p>${patterns.length} small, original projects with every round written out, stitch counts and round diagrams.</p>
    <div class="facts"><span>${patterns.length} patterns</span><span>US terms</span><span>Round diagrams</span></div>
    <p class="site">Follow any pattern round by round in the free Crochet Tracker app<br>${SITE_URL}/free-patterns/</p>
  </section>
  <section class="book-toc">
    <h2>Contents</h2>
    <p class="sub">Page numbers are at the bottom right of every page.</p>
    <ol>${rows}</ol>
  </section>
  ${patterns.map((p, i) => `<div class="book-part"><div class="book-mark">QQMARK${i}QQ</div>${paperOf(read(p.slug))}</div>`).join('\n')}
  </body></html>`;
}

// Tiny static server for dist/ (plus the generated book page).
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__book.html' || url.startsWith('/__book.html')) return res.writeHead(200, { 'content-type': 'text/html' }).end(bookHtml(bookPages));
  if (url === '/__render.html') return res.writeHead(200, { 'content-type': 'text/html' }).end(RENDER_HTML);
  if (url.startsWith('/__pdf/')) return res.writeHead(200, { 'content-type': 'application/pdf' }).end(made.get(url.slice(7)));
  if (url.startsWith('/__pdfjs/')) return res.writeHead(200, { 'content-type': 'text/javascript' }).end(fs.readFileSync(path.join(PDFJS, path.basename(url))));
  let file = path.join(DIST, url);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(DIST) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-pdf-'));
const browser = spawn(browserPath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  browser.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/ws:\/\/[^\s]+/);
    if (m) resolve(m[0]);
  });
  setTimeout(() => reject(new Error('Browser did not start')), 20000);
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pending.has(d.id)) {
    const { resolve, reject } = pending.get(d.id);
    pending.delete(d.id);
    d.error ? reject(new Error(d.error.message)) : resolve(d.result);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (method, params) => send(method, params, sessionId);
await s('Page.enable');
// The book and its page images are made more than once under the same URL: never reuse a cached copy.
await s('Network.enable');
await s('Network.setCacheDisabled', { cacheDisabled: true });
await s('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-color-scheme', value: 'light' }] });

const footer = (link) =>
  `<div style="width:100%;font:8px Arial,sans-serif;color:#777;padding:0 12mm;display:flex;justify-content:space-between"><span>Free pattern from Crochet Tracker · ${link}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

async function pdf(url, file, link, save = true) {
  await s('Page.navigate', { url });
  // Wait for fonts and layout.
  for (let i = 0; i < 50; i++) {
    const { result } = await s('Runtime.evaluate', { expression: `location.href === ${JSON.stringify(url)} && document.readyState === "complete" && document.fonts.status === "loaded"`, returnByValue: true });
    if (result.value) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const { data } = await s('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: false,
    paperWidth: 8.27, // A4
    paperHeight: 11.69,
    marginTop: 0.5,
    marginBottom: 0.6,
    marginLeft: 0.55,
    marginRight: 0.55,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: footer(link),
  });
  const bytes = Buffer.from(data, 'base64');
  made.set(file, bytes);
  if (save) fs.writeFileSync(path.join(OUT, file), bytes);
  console.log('pdf:', file, Math.round(bytes.length / 1024), 'KB', save ? '' : '(preview only, not published)');
}

// Renders every page of a PDF to a WebP image with pdf.js inside the browser.
const RENDER_HTML = `<!doctype html><body><script type="module">
import * as pdfjs from '/__pdfjs/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '/__pdfjs/pdf.worker.min.mjs';
const file = new URLSearchParams(location.search).get('f');
const doc = await pdfjs.getDocument('/__pdf/' + file + '?t=' + Date.now()).promise; // the worker has its own cache
const out = [];
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale: 1100 / page.getViewport({ scale: 1 }).width });
  const c = document.createElement('canvas');
  c.width = Math.round(vp.width);
  c.height = Math.round(vp.height);
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  out.push(c.toDataURL('image/webp', 0.82));
}
const marks = {};
for (let n = 1; n <= doc.numPages; n++) {
  const text = (await (await doc.getPage(n)).getTextContent()).items.map((t) => t.str).join('').split(' ').join('');
  for (const m of text.matchAll(/QQMARK([0-9]+)QQ/g)) marks[m[1]] ??= n;
}
window.__marks = marks;
window.__pages = out;
</script></body>`;

async function pages(file, key, onlyMarks = false) {
  // Forget the previous render first, so we never read the old page's results.
  await s('Runtime.evaluate', { expression: 'window.__pages = null; window.__marks = null' });
  await s('Page.navigate', { url: `${base}/__render.html?f=${encodeURIComponent(file)}` });
  let list = null;
  for (let i = 0; i < 150 && !list; i++) {
    await new Promise((r) => setTimeout(r, 200));
    list = (await s('Runtime.evaluate', { expression: 'window.__pages || null', returnByValue: true })).result.value;
  }
  if (!list) throw new Error('Could not render the pages of ' + file);
  const marks = (await s('Runtime.evaluate', { expression: 'window.__marks', returnByValue: true })).result.value;
  if (onlyMarks) return Object.fromEntries(Object.entries(marks).map(([i, n]) => [patterns[i].slug, n]));
  list.forEach((d, i) => fs.writeFileSync(path.join(PAGES, `${key}-${i + 1}.webp`), Buffer.from(d.split(',')[1], 'base64')));
  console.log('pages:', key, list.length);
  return list.length;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(PAGES, { recursive: true });
const manifest = {};
try {
  for (const p of patterns) {
    await pdf(`${base}/free-patterns/${p.slug}/`, `${p.slug}.pdf`, `${SITE_URL}/free-patterns/${p.slug}/`);
    manifest[p.slug] = { title: p.title, pages: await pages(`${p.slug}.pdf`, p.slug), pdf: `/pdf/${p.slug}.pdf` };
  }
  // The book is view-only: its PDF is only used to make the preview images.
  await pdf(`${base}/__book.html`, 'book.pdf', `${SITE_URL}/free-patterns/`, false);
  bookPages = await pages('book.pdf', 'book', true);
  const missing = patterns.filter((p) => !bookPages[p.slug]);
  if (missing.length) throw new Error('Book: could not find the start page of ' + missing.map((p) => p.slug).join(', '));
  await pdf(`${base}/__book.html?run=2`, 'book.pdf', `${SITE_URL}/free-patterns/`, false);
  const again = await pages('book.pdf', 'book', true);
  if (patterns.some((p) => again[p.slug] !== bookPages[p.slug])) throw new Error('Book: page numbers moved between runs');
  if (bookPages[patterns[0].slug] !== 3) throw new Error('Book: the contents should fit on page 2, the first pattern starts on page ' + bookPages[patterns[0].slug]);
  manifest.book = {
    title: 'Free Crochet Pattern Book',
    pages: await pages('book.pdf', 'book'),
    pdf: null,
    items: patterns.map((p) => p.slug),
    toc: patterns.map((p) => ({ key: p.slug, title: p.title, page: bookPages[p.slug] })),
  };
  fs.writeFileSync(path.join(OUT, 'pages.json'), JSON.stringify(manifest, null, 2) + '\n');
} finally {
  ws.close();
  browser.kill();
  server.close();
}
