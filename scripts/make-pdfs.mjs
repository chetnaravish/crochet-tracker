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

function bookHtml() {
  const first = read(patterns[0].slug);
  const head = first.slice(0, first.indexOf('</head>')).replace(/<title>[^<]*<\/title>/, '<title>Free Crochet Pattern Book</title>');
  const list = patterns.map((p, i) => `<li><b>${i + 1}</b><span>${p.title}</span><em>${p.level || ''}${p.time ? ` · ${p.time}` : ''}</em></li>`).join('');
  return `${head}
  <style>
    .book-cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: center; text-align: center; padding: 0 12mm; }
    .book-cover .k { letter-spacing: .2em; font-weight: 800; color: #b4436c; font-size: 13pt; }
    .book-cover h1 { font-size: 40pt; line-height: 1.05; margin: 10px 0 14px; }
    .book-cover p { font-size: 13pt; color: #444; max-width: 140mm; margin: 0 auto; }
    .book-cover ol { list-style: none; padding: 0; margin: 14mm auto 0; max-width: 130mm; text-align: left; }
    .book-cover li { display: grid; grid-template-columns: 12mm 1fr auto; gap: 4mm; padding: 4mm 0; border-bottom: 1px solid #ddd; font-size: 13pt; }
    .book-cover li b { color: #b4436c; }
    .book-cover li em { color: #666; font-style: normal; font-size: 11pt; }
    .book-cover .site { margin-top: 12mm; font-size: 11pt; color: #666; }
    .book-part { break-before: page; }
  </style>
  </head><body>
  <section class="book-cover">
    <div class="k">FREE CROCHET PATTERN BOOK</div>
    <h1>Easy Crochet Patterns for Beginners</h1>
    <p>${patterns.length} small, original projects with every round written out, stitch counts and round diagrams. US crochet terms.</p>
    <ol>${list}</ol>
    <p class="site">Follow any of these patterns round by round in the free Crochet Tracker app:<br>${SITE_URL}/free-patterns/</p>
  </section>
  ${patterns.map((p) => `<div class="book-part">${paperOf(read(p.slug))}</div>`).join('\n')}
  </body></html>`;
}

// Tiny static server for dist/ (plus the generated book page).
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__book.html') return res.writeHead(200, { 'content-type': 'text/html' }).end(bookHtml());
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
await s('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-color-scheme', value: 'light' }] });

const footer = (link) =>
  `<div style="width:100%;font:8px Arial,sans-serif;color:#777;padding:0 12mm;display:flex;justify-content:space-between"><span>Free pattern from Crochet Tracker · ${link}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

async function pdf(url, file, link, save = true) {
  await s('Page.navigate', { url });
  // Wait for fonts and layout.
  for (let i = 0; i < 50; i++) {
    const { result } = await s('Runtime.evaluate', { expression: 'document.readyState === "complete" && document.fonts.status === "loaded"', returnByValue: true });
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
const doc = await pdfjs.getDocument('/__pdf/' + file).promise;
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
window.__pages = out;
</script></body>`;

async function pages(file, key) {
  await s('Page.navigate', { url: `${base}/__render.html?f=${encodeURIComponent(file)}` });
  let list = null;
  for (let i = 0; i < 150 && !list; i++) {
    await new Promise((r) => setTimeout(r, 200));
    list = (await s('Runtime.evaluate', { expression: 'window.__pages || null', returnByValue: true })).result.value;
  }
  if (!list) throw new Error('Could not render the pages of ' + file);
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
  manifest.book = { title: 'Free Crochet Pattern Book', pages: await pages('book.pdf', 'book'), pdf: null, items: patterns.map((p) => p.slug) };
  fs.writeFileSync(path.join(OUT, 'pages.json'), JSON.stringify(manifest, null, 2) + '\n');
} finally {
  ws.close();
  browser.kill();
  server.close();
}
