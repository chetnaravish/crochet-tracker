// Builds one page per pattern from the data files in content/patterns/*.json.
//
// Each JSON file becomes src/free-patterns/<slug>/index.html (generated, git-ignored),
// which then goes through the normal site plugin (meta tags, header, footer…).
// A future admin panel only has to write these JSON files.
//
// Also checks stitch counts: a round chart of type "inc" must double the round
// below, "even" must keep it the same. Problems are printed as warnings.

import fs from 'node:fs';
import path from 'node:path';
import { roundChart, legend, sunflowerArt, symbol, miniChart } from './drawings.js';
import { checkCounts, normalizePattern } from '../public/admin/pattern-check.js';
import { SITE_URL } from '../site.config.js';

const CONTENT_DIR = path.resolve('content/patterns');
const OUT_DIR = path.resolve('src/free-patterns');
const STITCH_DIR = path.resolve('src/stitches');

// Abbreviations a pattern can list. `page` is linked only if that stitch page exists.
const ABBR = {
  mr: ['MR', 'magic ring', 'magic-ring'],
  ch: ['ch', 'chain', 'chain'],
  'sl st': ['sl st', 'slip stitch', 'slip-stitch'],
  sc: ['sc', 'single crochet', 'single-crochet'],
  hdc: ['hdc', 'half double crochet', 'half-double-crochet'],
  dc: ['dc', 'double crochet', 'double-crochet'],
  tr: ['tr', 'treble crochet (yarn over twice)', 'treble-crochet'],
  inc: ['inc', 'increase: 2 sc in the same stitch', 'increase'],
  dec: ['dec', 'decrease: 2 sc together', 'decrease'],
  blo: ['BLO', 'back loop only', 'front-and-back-loop'],
  flo: ['FLO', 'front loop only', 'front-and-back-loop'],
  puff: ['puff', 'puff stitch', 'puff-stitch'],
  pc: ['pc', 'popcorn stitch', 'popcorn-stitch'],
  bob: ['bob', 'bobble stitch', 'bobble-stitch'],
  cl: ['cl', 'cluster', 'cluster-stitch'],
  st: ['st / sts', 'stitch / stitches'],
  fo: ['FO', 'fasten off: cut the yarn and pull it through the last loop'],
};

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function loadPatterns(dir = CONTENT_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => normalizePattern({ file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
}

// The stitch-count check lives in public/admin/ so the admin panel can use it too.
export { checkCounts };

// The steps that "Open in Tracker" saves. Uses p.tracker if given, otherwise every round.
export function trackerSteps(p) {
  if (Array.isArray(p.tracker) && p.tracker.length) return p.tracker;
  const steps = [];
  for (const s of p.sections || []) {
    const times = s.make || 1;
    for (let k = 1; k <= times; k++) {
      for (const r of s.rounds) {
        const prefix = [times > 1 ? `${s.title} ${k}` : s.title, r.r].filter(Boolean).join(', ');
        steps.push({ text: `${prefix}: ${r.text}`, stitches: /^\d+$/.test(r.count) ? `${r.count} sts` : r.count || '' });
      }
    }
  }
  return steps;
}

function chartSymbols(p) {
  const used = new Set();
  for (const s of p.sections) {
    for (const r of s.rounds) {
      const c = r.chart;
      if (!c) continue;
      if (c.type === 'ring') used.add('mr');
      if (c.sym) used.add(c.sym);
      if (c.type === 'petals') {
        used.add('slst').add('ch');
        (c.fan || []).forEach((x) => used.add(x));
        if (c.picot) used.add('picot');
      }
    }
  }
  return [...used];
}

// Stitch words in the pattern (sc, inc, MR…) are links. Tapping one opens a small
// popup (src/js/lib/stitch-pop.js) with the name, one line on how it's made, a small
// drawing and a "Full lesson" button, so the reader doesn't lose their place.
// Without JavaScript the link simply opens the lesson. A word is only linked when its
// stitch page exists; otherwise it just gets the soft highlight.
const STITCH_INFO = {
  ch: { name: 'Chain', uk: 'UK: chain (ch)', line: 'Yarn over and pull the yarn through the loop on your hook. Most projects start with chains.', page: 'chain', fig: 'chain' },
  slst: { name: 'Slip stitch', uk: 'UK: slip stitch (ss)', line: 'Insert the hook, yarn over and pull straight through the stitch and the loop on your hook. Used to join rounds.', page: 'slip-stitch', sym: 'slst' },
  sc: { name: 'Single crochet', uk: 'UK: double crochet (dc)', line: 'Insert the hook, pull up a loop (2 loops on hook), then yarn over and pull through both loops.', page: 'single-crochet', sym: 'sc' },
  hdc: { name: 'Half double crochet', uk: 'UK: half treble (htr)', line: 'Yarn over, insert the hook and pull up a loop (3 loops on hook), then yarn over and pull through all 3.', page: 'half-double-crochet', sym: 'hdc' },
  dc: { name: 'Double crochet', uk: 'UK: treble (tr)', line: 'Yarn over, insert the hook and pull up a loop, then yarn over and pull through 2 loops, twice.', page: 'double-crochet', sym: 'dc' },
  tr: { name: 'Treble crochet', uk: 'UK: double treble (dtr)', line: 'Yarn over twice, insert the hook and pull up a loop, then yarn over and pull through 2 loops, three times.', page: 'treble-crochet', sym: 'tr' },
  mr: { name: 'Magic ring', uk: 'UK: magic loop', line: 'An adjustable loop of yarn. Work the first round into it, then pull the tail to close the centre.', page: 'magic-ring', fig: 'mr6' },
  inc: { name: 'Increase', uk: 'UK: increase (inc)', line: 'Work 2 stitches into the same stitch. The round grows by one stitch.', page: 'increase', fig: 'inc' },
  dec: { name: 'Decrease', uk: 'UK: decrease (dc2tog)', line: 'Work 2 stitches together so they become one. The round gets one stitch smaller.', page: 'decrease', fig: 'dec' },
  blo: { name: 'Back loop only', uk: 'UK: back loop only', line: 'Insert the hook under the back strand of the stitch only. It leaves a ridge on the front.', page: 'front-and-back-loop', fig: 'blo' },
  flo: { name: 'Front loop only', uk: 'UK: front loop only', line: 'Insert the hook under the front strand of the stitch only. The back strand stays free.', page: 'front-and-back-loop', fig: 'flo' },
};
const ABBR_RE = /\b(sl st|MR|mr|sc|hdc|dc|tr|inc|dec|ch|BLO|FLO)\b/g;
const hasStitchPage = (page) => Boolean(page) && fs.existsSync(path.join(STITCH_DIR, page, 'index.html'));
const markAbbr = (text) =>
  esc(text).replace(ABBR_RE, (word) => {
    const key = word.toLowerCase().replace(' ', '');
    const info = STITCH_INFO[key];
    return info && hasStitchPage(info.page)
      ? `<a class="ab" href="/stitches/${info.page}/" data-st="${key}">${word}</a>`
      : `<b class="ab">${word}</b>`;
  });

// Popup data for the stitch words used in some HTML (read by stitch-pop.js).
export function stitchInfoFor(html) {
  const out = {};
  for (const [, k] of html.matchAll(/data-st="(\w+)"/g)) {
    if (out[k]) continue;
    const { sym, fig, ...rest } = STITCH_INFO[k];
    out[k] = { ...rest, url: `/stitches/${rest.page}/`, svg: fig ? miniChart(fig) : symbol(sym) };
  }
  return out;
}
// Paragraph text: **bold** is allowed (e.g. "**Join:** Hold the two…").
const para = (text) => esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

function abbrTable(keys) {
  const cells = keys.map((k) => {
    const a = ABBR[k];
    if (!a) return `<td class="pp-ab">${esc(k)}</td><td></td>`;
    const [short, long, page] = a;
    const hasPage = hasStitchPage(page);
    const name = hasPage ? `<a href="/stitches/${page}/">${esc(long)}</a>` : esc(long);
    return `<td class="pp-ab">${esc(short)}</td><td>${name}</td>`;
  });
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(`<tr>${cells[i]}${cells[i + 1] || '<td></td><td></td>'}</tr>`);
  return `<table class="pp-abbr"><tbody>${rows.join('')}</tbody></table>`;
}

function sectionHtml(s) {
  const rounds = s.rounds.filter((r) => !r.hidden);
  return `
          <section class="pp-part">
            ${s.title ? `<h3>${esc(s.title)}${s.colourName ? ` <span class="pp-part-colour">(${esc(s.colourName)})</span>` : ''}${s.make > 1 ? ` <span class="pp-make">Make ${s.make}</span>` : ''}</h3>` : ''}
            ${s.note ? `<p class="pp-note">${para(s.note)}</p>` : ''}
            ${(s.intro || []).map((t) => `<p>${para(t)}</p>`).join('')}
            ${rounds.length ? `<div class="pp-table-wrap"><table class="pp-rounds">
              <thead><tr><th scope="col" class="tick-col"><span class="visually-hidden">Done</span></th><th scope="col">Round</th><th scope="col">Instructions</th><th scope="col" class="num">Sts</th></tr></thead>
              <tbody>
                ${rounds.map((r) => `<tr><td class="tick-col"><span class="tick" aria-hidden="true"></span></td><th scope="row">${esc(r.r)}</th><td>${markAbbr(r.text)}</td><td class="num">${esc(r.count)}</td></tr>`).join('\n                ')}
              </tbody>
            </table></div>` : ''}
            ${s.steps?.length ? `<p class="pp-steps-title"><b>${esc(s.stepsTitle || 'Steps:')}</b></p>
            <ol class="pp-steps" role="list">${s.steps.map((t, i) => `<li><span class="pp-step-no">${i + 1}</span><span>${markAbbr(t)}</span></li>`).join('')}</ol>` : ''}
            ${(s.after || []).map((t) => `<p>${para(t)}</p>`).join('')}
            ${s.short ? `<p class="pp-short">${para(s.short)}</p>` : ''}
          </section>`;
}

// "Save to Pinterest": a plain link to Pinterest's save page, no Pinterest script on
// our site (nothing loads from Pinterest until the reader taps it). The pin picture
// is the tall 2:3 image from `npm run pins`, or the share image if that's missing.
// Hidden for now (11 Nov 2026): turn back on after real photos/videos are added.
const SHOW_PIN_BUTTON = false;

export function pinterestUrl(p) {
  const img = ['pins', 'og'].map((d) => `/${d}/${p.slug}.png`).find((f) => fs.existsSync(`public${f}`)) || '/og-image.png';
  const text = `${p.title}: free crochet pattern with a printable PDF${p.level ? `, ${p.level.toLowerCase()} friendly` : ''}. ${p.description || ''}`.trim();
  const q = new URLSearchParams({ url: `${SITE_URL}/free-patterns/${p.slug}/`, media: SITE_URL + img, description: text.slice(0, 480) });
  return `https://www.pinterest.com/pin/create/button/?${q}`;
}

export function renderPattern(p) {
  const meta = {
    title: p.seoTitle || `${p.title} – Free Crochet Pattern | Crochet Tracker`,
    description: p.description,
    path: `/free-patterns/${p.slug}/`,
    nav: 'free-patterns',
    crumbs: [['Free Patterns', '/free-patterns/'], [p.title]],
    schema: 'article',
    date: p.date,
    priority: '0.8',
    // Share image made by `npm run og` (falls back to the site image if missing).
    ...(fs.existsSync(`public/og/${p.slug}.png`)
      ? { ogImage: `/og/${p.slug}.png`, ogImageAlt: `${p.title}: free beginner crochet pattern (illustration)` }
      : {}),
    ...(p.draft ? { noindex: true } : {}),
  };
  const hasPdf = fs.existsSync(`public/pdf/${p.slug}.pdf`);
  const pinUrl = pinterestUrl(p);
  const chartRounds = p.sections.flatMap((s) => s.rounds.filter((r) => r.chart).map((r) => ({ ...r, colour: s.colour })));
  const notes = (p.notes || []).join(' ');
  const steps = trackerSteps(p);
  const isPhoto = p.image?.type === 'photo';
  const art = isPhoto
    ? `<img src="${esc(p.image.src)}" alt="${esc(p.image.alt)}" width="1200" height="1200" loading="eager">`
    : p.image?.art === 'sunflower'
      ? sunflowerArt()
      : p.image?.art
        ? `<svg class="pp-art" viewBox="0 0 240 180" role="img" aria-label="Illustration of the ${esc(p.title)}">${cardArt(p.image.art)}</svg>`
        : '';
  const t = p.theme || {};
  const themeStyle = [t.accent && `--pp-accent:${t.accent}`, t.dark && `--pp-dark:${t.dark}`, t.cream && `--pp-cream:${t.cream}`].filter(Boolean).join(';');
  const materials = p.materialsTable || (p.materials || []).map((m) => ['', m]);
  const sectionsHtml = p.sections.map(sectionHtml).join('');
  const stitchInfo = stitchInfoFor(sectionsHtml);
  const stitchData = Object.keys(stitchInfo).length
    ? `<script type="application/json" data-stitch-info>${JSON.stringify(stitchInfo).replace(/</g, '\\u003c')}</script>`
    : '';

  return `<!doctype html>
<!-- GENERATED from content/patterns/${p.file} by build/pattern-pages.js. Edit the JSON file, not this page. -->
<html lang="en">
  <head>
    <!--@meta ${JSON.stringify(meta)}-->
    <link rel="stylesheet" href="/styles/site.css">
    <script type="module" src="/js/site.js"></script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <!--@include header-->
    <main id="main">
      <article class="container pp" style="${themeStyle}" data-pattern="${esc(p.slug)}" data-title="${esc(p.title)}" data-hook="${esc(p.hook)}" data-yarn="${esc(p.yarn)}" data-notes="${esc(notes)}">

        <div class="pp-paper">
          <header class="pp-cover">
            <h1><span class="pp-name">${esc(p.name || p.title)}</span>${p.subtitle ? `<span class="pp-sub">${esc(p.subtitle)}</span>` : ''}</h1>
            ${p.tagline ? `<p class="pp-tagline">${esc(p.tagline)}</p>` : ''}
            <figure class="pp-photo">
              ${art}
              ${isPhoto ? '' : '<figcaption class="no-print"><span class="badge">Illustration</span> Real photo coming soon</figcaption>'}
            </figure>
            <dl class="pp-bar">
              ${[['Skill level', p.level], ['Time', p.time], ['Size', p.size], ['Hook', p.hook]]
                .filter(([, v]) => v)
                .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
                .join('')}
            </dl>
            <p class="pp-lead">${esc(p.lead)}</p>
            <div class="pp-actions no-print">
              <a class="btn btn-lg pp-btn-main" href="#pattern">Jump to Pattern</a>
              <button type="button" class="btn btn-outline btn-lg" data-open-pattern>Open in Tracker</button>
              <button type="button" class="btn btn-ghost btn-lg" data-print>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>
                Print
              </button>
              ${hasPdf ? `<a class="btn btn-ghost btn-lg" href="/pdf/${esc(p.slug)}.pdf" data-pdf-view="${esc(p.slug)}">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>
                Free PDF
              </a>` : ''}
            </div>
            ${hasPdf ? `<p class="pp-pdf-note no-print">Free printable PDF of this crochet pattern${chartRounds.length ? ', with the round diagram' : ''}. Tap <strong>Free PDF</strong> to preview it, then download it if you like it. You can also read all our patterns together in the <a href="/free-patterns/#pdf" data-pdf-view="book">free crochet pattern book</a> (view only).</p>` : ''}
            ${SHOW_PIN_BUTTON ? `<p class="pp-pin no-print"><a class="pin-btn" href="${esc(pinUrl)}" target="_blank" rel="noopener" data-pin-save>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#e60023"/><path fill="#fff" d="M12.3 5.5c-3.9 0-5.8 2.8-5.8 5.1 0 1.4.5 2.6 1.6 3.1.2.1.4 0 .4-.2l.2-.6c0-.2 0-.3-.1-.5-.3-.4-.5-.9-.5-1.6 0-2.1 1.6-3.9 4.1-3.9 2.2 0 3.5 1.4 3.5 3.2 0 2.4-1.1 4.4-2.6 4.4-.9 0-1.5-.7-1.3-1.6.2-1 .7-2.2.7-2.9 0-.7-.4-1.2-1.1-1.2-.9 0-1.6.9-1.6 2.2 0 .8.3 1.3.3 1.3l-1 4.4c-.3 1.3 0 2.9 0 3.1 0 .1.1.1.2 0 .1-.1 1-1.3 1.4-2.5l.5-2c.3.5 1 .9 1.8.9 2.4 0 4-2.2 4-5.1 0-2.2-1.9-4.3-4.7-4.3Z"/></svg>
              Save to Pinterest</a></p>` : ''}
            <p class="open-status" aria-live="polite"></p>
          </header>

          <section class="pp-block" aria-labelledby="begin-h">
            <h2 id="begin-h">Before You Begin</h2>
            <h3>Materials</h3>
            <table class="pp-materials"><tbody>${materials.map(([k, v]) => `<tr>${k ? `<th scope="row">${esc(k)}</th>` : ''}<td${k ? '' : ' colspan="2"'}>${esc(v)}</td></tr>`).join('')}</tbody></table>
            <h3>Abbreviations <span class="pp-muted">(<a href="/guides/us-vs-uk-crochet-terms/">${esc(p.terms)} terms</a>)</span></h3>
            ${abbrTable(p.abbreviations || [])}
            <p class="pp-small no-print">Tap a stitch name to learn it. All terms: <a href="/crochet-abbreviations/">crochet abbreviations chart</a>.</p>
            ${p.notes?.length ? `<h3>Good to Know</h3><ul class="pp-list">${p.notes.map((n) => `<li>${para(n)}</li>`).join('')}</ul>` : ''}
          </section>

          <section class="pp-block" aria-labelledby="pattern">
            <h2 id="pattern">The Pattern</h2>
            ${stitchData ? `<p class="pp-tap-hint no-print"><span aria-hidden="true">👆</span> Tap an underlined stitch, like <span class="ab">${sectionsHtml.match(/data-st="\w+">([^<]+)</)[1]}</span>, to see how it's made without leaving the pattern.</p>` : ''}
            ${sectionsHtml}
          </section>

          ${p.finishing?.length || p.variations ? `<section class="pp-block" aria-labelledby="finish-h">
            ${p.finishing?.length ? `<h3 id="finish-h">Finishing</h3><ol class="pp-numbered">${p.finishing.map((f) => `<li>${para(f)}</li>`).join('')}</ol>` : ''}
            ${p.variations ? `<h3>Variations</h3><p>${para(p.variations)}</p>` : ''}
          </section>` : ''}

          ${chartRounds.length ? `<section class="pp-block pp-chart" aria-labelledby="chart-h">
            <h3 id="chart-h">Round chart (crochet diagram)</h3>
            ${p.chartNote ? `<p class="pp-note">${esc(p.chartNote)}</p>` : ''}
            <div class="pp-chart-body">${roundChart(chartRounds, `Round chart for the ${p.title}`)}${legend(chartSymbols(p))}</div>
          </section>` : ''}

          ${p.tested ? `<p class="tested">${esc(p.tested)}</p>` : ''}
        </div>

        <section class="pp-tracker no-print" aria-labelledby="tracker-h">
          <h2 id="tracker-h">Follow it round by round in the tracker</h2>
          <ol class="pp-how" role="list">
            <li><span>1</span><div><b>Open it</b><p>Tap Open in Tracker. The pattern is saved on your phone.</p></div></li>
            <li><span>2</span><div><b>Tap Done</b><p>Finish a round, tap Done, and the next one moves up.</p></div></li>
            <li><span>3</span><div><b>Pick up later</b><p>Close it any time. Your place is saved.</p></div></li>
          </ol>
          <button type="button" class="btn btn-primary btn-lg" data-open-pattern>Open in Tracker</button>
          <p class="open-status" aria-live="polite"></p>
        </section>

        ${p.faq?.length ? `<section class="pp-faq no-print" aria-labelledby="faq-h"><h2 id="faq-h">Questions</h2><div class="faq">${p.faq
          .map((q) => `<details class="faq-item"><summary>${esc(q.q)}</summary><p>${esc(q.a)}</p></details>`)
          .join('')}</div></section>` : ''}

        ${p.related?.length ? `<section class="pp-related no-print"><h2>You might also like</h2><ul class="related">${p.related
          .map((r) => `<li><a href="${esc(r.url)}">${esc(r.title)}</a></li>`)
          .join('')}</ul></section>` : ''}

        <script type="application/json" data-tracker>${JSON.stringify(steps).replace(/</g, '\\u003c')}</script>
        ${stitchData}
      </article>
    </main>
    <!--@include footer-->
  </body>
</html>
`;
}

// ---------- Hub-page cards ----------
// A simple card: the product picture on top, the name underneath. Until a real
// photo exists the picture is an SVG illustration (marked "Illustration").

const CARD_BG = { sunflower: 'bg-butter', ball: 'bg-rose', coaster: 'bg-mint', flower: 'bg-lavender' };
export function cardArt(kind) {
  const shadow = '<ellipse cx="120" cy="160" rx="62" ry="8" fill="#000" opacity=".08"/>';
  switch (kind) {
    case 'sunflower': {
      const petals = Array.from({ length: 12 }, (_, i) => `<ellipse cx="0" cy="-42" rx="12" ry="24" transform="rotate(${i * 30})"/>`).join('');
      const seeds = [[-9, -7], [7, -10], [0, 2], [-10, 9], [10, 8], [0, -16], [15, -1], [-15, -2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('');
      return `${shadow}<g transform="translate(120 88)"><g fill="#f5c84c" stroke="#d29a1c" stroke-width="2">${petals}</g><circle r="27" fill="#7a4a2a" stroke="#5a3218" stroke-width="2"/><g fill="#5a3218">${seeds}</g></g>`;
    }
    case 'ball': {
      const rows = [-30, -15, 0, 15, 30].map((y) => {
        const w = Math.sqrt(52 * 52 - y * y);
        return `<path d="M${-w + 6} ${y} Q0 ${y + 8} ${w - 6} ${y}" stroke-dasharray="6 6"/>`;
      }).join('');
      return `${shadow}<g transform="translate(120 92)"><circle r="54" fill="#e47c9f" stroke="#b4436c" stroke-width="2.5"/><g fill="none" stroke="#c45a80" stroke-width="3" stroke-linecap="round">${rows}</g><ellipse cx="-18" cy="-26" rx="14" ry="8" fill="#fff" opacity=".35"/></g>`;
    }
    case 'coaster': {
      const ticks = (r, n) => Array.from({ length: n }, (_, i) => `<path d="M0 ${-r + 5}V${-r - 5}" transform="rotate(${(i * 360) / n})"/>`).join('');
      return `${shadow}<g transform="translate(120 90) scale(1 .78)"><circle r="66" fill="#7fbf95" stroke="#4f9467" stroke-width="2.5"/><g fill="none" stroke="#4f9467" stroke-width="2.6" stroke-linecap="round">${ticks(56, 32)}${ticks(40, 24)}${ticks(24, 12)}</g><circle r="9" fill="#4f9467"/></g>`;
    }
    case 'flower': {
      const petals = Array.from({ length: 6 }, (_, i) => `<circle cx="0" cy="-30" r="20" transform="rotate(${i * 60})"/>`).join('');
      return `${shadow}<path d="M120 26c-14 0-14-20 0-20s14 20 0 20Z" fill="none" stroke="#9a8fb0" stroke-width="5"/><path d="M120 26v20" stroke="#a98ad8" stroke-width="4" stroke-dasharray="4 3"/><g transform="translate(120 98)"><g fill="#a98ad8" stroke="#7d5fbf" stroke-width="2">${petals}</g><circle r="17" fill="#f5c84c" stroke="#d29a1c" stroke-width="2"/></g>`;
    }
    default:
      return `${shadow}<circle cx="120" cy="90" r="50" fill="#e47c9f"/>`;
  }
}
// A real photo (added in the admin panel) replaces the illustration.
const card = (href, title, kind, photo) =>
  `<a class="pcard" href="${href}"><div class="pcard-img ${photo ? 'pcard-photo' : CARD_BG[kind] || 'bg-rose'}">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy">` : `<svg viewBox="0 0 240 180" aria-hidden="true">${cardArt(kind)}</svg><span class="pcard-tag">Illustration</span>`}</div><div class="pcard-body"><h3>${esc(title)}</h3><span class="pcard-go" aria-hidden="true">→</span></div></a>`;

// One card per published pattern, ordered by "order" in the JSON, then by title.
export function patternCards(patterns) {
  return patterns
    .filter((p) => !p.draft)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title))
    .map((p) => card(`/free-patterns/${p.slug}/`, p.title, p.image?.art || 'ball', p.image?.type === 'photo' && p.image.src))
    .join('');
}

// Write every page. Returns the warnings so the caller can print them.
// drafts: false (production build) leaves drafts out completely, so a pattern
// saved as a draft in the admin panel is not on the live site at all.
export function generatePatternPages({ drafts = true } = {}) {
  const patterns = loadPatterns();
  const warnings = [];
  for (const p of patterns) {
    warnings.push(...checkCounts(p));
    const dir = path.join(OUT_DIR, p.slug);
    if (p.draft && !drafts) {
      fs.rmSync(dir, { recursive: true, force: true });
      continue;
    }
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'index.html');
    const html = renderPattern(p);
    // Only write when changed, so the dev server doesn't reload for nothing.
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) fs.writeFileSync(file, html);
  }
  for (const w of warnings) console.warn(`\x1b[33m[patterns] stitch count check: ${w}\x1b[0m`);
  return { patterns, warnings };
}
