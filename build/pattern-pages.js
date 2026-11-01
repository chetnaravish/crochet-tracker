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
import { roundChart, legend, sunflowerArt } from './drawings.js';

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
    .map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
}

// Round chart data in pattern order, with stitch-count checks.
export function checkCounts(p) {
  const warnings = [];
  let prev = 0;
  for (const s of p.sections || []) {
    for (const r of s.rounds) {
      const c = r.chart;
      if (!c) continue;
      const label = `${p.slug} ${s.title} ${r.r}`;
      if (c.type === 'ring') prev = c.count;
      else if (c.type === 'inc') {
        if (prev && c.count !== prev * 2) warnings.push(`${label}: inc in every stitch of ${prev} should give ${prev * 2}, not ${c.count}.`);
        prev = c.count;
      } else if (c.type === 'even') {
        if (prev && c.count !== prev) warnings.push(`${label}: one stitch in each of ${prev} should give ${prev}, not ${c.count}.`);
      } else if (c.type === 'petals') {
        if (prev && prev / 2 !== c.count) warnings.push(`${label}: ${prev} stitches make ${prev / 2} petals (petal + sl st), not ${c.count}.`);
      }
      if (r.count && /^\d+$/.test(r.count) && c.count && Number(r.count) !== c.count) {
        warnings.push(`${label}: written count (${r.count}) and chart count (${c.count}) don't match.`);
      }
    }
  }
  return warnings;
}

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

function abbrList(keys) {
  return keys
    .map((k) => {
      const a = ABBR[k];
      if (!a) return `<li><b>${esc(k)}</b></li>`;
      const [short, long, page] = a;
      const hasPage = page && fs.existsSync(path.join(STITCH_DIR, page, 'index.html'));
      const inner = `<b>${esc(short)}</b><span>${esc(long)}</span>`;
      return hasPage ? `<li><a href="/stitches/${page}/">${inner}</a></li>` : `<li><span class="abbr-plain">${inner}</span></li>`;
    })
    .join('');
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
    ...(p.draft ? { noindex: true } : {}),
  };
  const chartRounds = p.sections.flatMap((s) => s.rounds.filter((r) => r.chart).map((r) => ({ ...r, colour: s.colour })));
  const notes = (p.notes || []).join(' ');
  const steps = trackerSteps(p);
  const art = p.image?.type === 'photo'
    ? `<img src="${esc(p.image.src)}" alt="${esc(p.image.alt)}" width="1200" height="1200" loading="eager">`
    : p.image?.art === 'sunflower' ? sunflowerArt() : '';

  const sections = p.sections
    .map(
      (s) => `
          <h3 class="pattern-section">${esc(s.title)}${s.make > 1 ? ` <span class="make">make ${s.make}</span>` : ''}${s.colourName ? ` <span class="swatch swatch-${esc(s.colour)}">${esc(s.colourName)}</span>` : ''}</h3>
          <ol class="pattern-rounds" role="list">
            ${s.rounds
              .map(
                (r) =>
                  `<li><span class="tick" aria-hidden="true"></span><span class="r">${esc(r.r)}</span><span class="t">${esc(r.text)}</span><span class="s">${r.count ? `(${esc(r.count)})` : ''}</span></li>`,
              )
              .join('\n            ')}
          </ol>`,
    )
    .join('');

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
      <article class="container article pattern-page" data-pattern="${esc(p.slug)}" data-title="${esc(p.title)}" data-hook="${esc(p.hook)}" data-yarn="${esc(p.yarn)}" data-notes="${esc(notes)}">
        <div class="prose">
          <h1>${esc(p.title)}</h1>
          <p class="lead">${esc(p.lead)}</p>
          <div class="pattern-actions no-print">
            <a class="btn btn-primary btn-lg" href="#pattern">Jump to Pattern</a>
            <button type="button" class="btn btn-outline btn-lg" data-open-pattern>Open in Tracker</button>
          </div>
          <p class="field-hint no-print">Open in Tracker saves the pattern on your phone, so you can tick off each round as you go.</p>
          <p class="open-status" aria-live="polite"></p>
        </div>

        <figure class="pattern-photo">
          ${art}
          ${p.image?.type === 'photo' ? '' : '<figcaption><span class="badge">Illustration</span> The real photo is coming soon.</figcaption>'}
        </figure>

        <div class="prose">
          <dl class="facts pattern-info">
            <div><dt>Level</dt><dd>${esc(p.level)}</dd></div>
            <div><dt>Time</dt><dd>${esc(p.time)}</dd></div>
            <div><dt>Hook</dt><dd>${esc(p.hook)}</dd></div>
            <div><dt>Yarn</dt><dd>${esc(p.yarn)}</dd></div>
            <div><dt>Finished size</dt><dd>${esc(p.size)}</dd></div>
            <div><dt>Terms</dt><dd><a href="/guides/us-vs-uk-crochet-terms/">${esc(p.terms)} terms</a></dd></div>
          </dl>

          <h2>Materials</h2>
          <ul>${(p.materials || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>

          <h2>Abbreviations</h2>
          <ul class="abbr-list">${abbrList(p.abbreviations || [])}</ul>
          <p class="no-print">Need more? See the full <a href="/crochet-abbreviations/">crochet abbreviations chart</a>.</p>

          ${p.notes?.length ? `<h2>Before you start</h2><ul>${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}

          <h2 id="pattern">Pattern</h2>
          ${sections}

          <div class="print-box no-print">
            <button type="button" class="btn btn-outline" data-print>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>
              Print / Save as PDF
            </button>
            <p class="field-hint">For a PDF, choose “Save as PDF” as the printer.</p>
          </div>

          ${chartRounds.length ? `<h2 id="chart">Round chart</h2>
          <p class="no-print">The chart shows one centre from the middle out, then the petal round. Read it anticlockwise from the magic ring.</p>
          <figure class="chart-box">${roundChart(chartRounds, `Round chart for the ${p.title}`)}${legend(chartSymbols(p))}</figure>` : ''}
        </div>

        <section class="tracker-cards no-print" aria-labelledby="tracker-h">
          <h2 id="tracker-h">Follow it round by round in the tracker</h2>
          <div class="grid grid-3">
            <div class="tile"><div class="tile-icon bg-rose" aria-hidden="true">1</div><h3>Open it</h3><p>Tap Open in Tracker. The pattern is saved on your device.</p></div>
            <div class="tile"><div class="tile-icon bg-mint" aria-hidden="true">2</div><h3>Tap Done</h3><p>Finish a round, tap Done, and the next round moves up.</p></div>
            <div class="tile"><div class="tile-icon bg-sky" aria-hidden="true">3</div><h3>Pick up later</h3><p>Close the app any time. Your progress is saved.</p></div>
          </div>
          <button type="button" class="btn btn-primary btn-lg" data-open-pattern>Open in Tracker</button>
          <p class="open-status" aria-live="polite"></p>
        </section>

        <div class="prose">
          ${p.tested ? `<p class="tested">${esc(p.tested)}</p>` : ''}
          ${p.tips?.length ? `<h2>Tips</h2><ul>${p.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        </div>

        ${p.faq?.length ? `<section class="no-print" aria-labelledby="faq-h"><h2 id="faq-h">Questions</h2><div class="faq">${p.faq
          .map((q) => `<details class="faq-item"><summary>${esc(q.q)}</summary><p>${esc(q.a)}</p></details>`)
          .join('')}</div></section>` : ''}

        ${p.related?.length ? `<div class="prose no-print"><h2>You might also like</h2><ul class="related">${p.related
          .map((r) => `<li><a href="${esc(r.url)}">${esc(r.title)}</a></li>`)
          .join('')}</ul></div>` : ''}

        <script type="application/json" data-tracker>${JSON.stringify(steps).replace(/</g, '\\u003c')}</script>
      </article>
    </main>
    <!--@include footer-->
  </body>
</html>
`;
}

// Hub-page card for each (non-draft) pattern.
export function patternCards(patterns) {
  return patterns
    .filter((p) => !p.draft)
    .map(
      (p) =>
        `<a class="tile pattern-card" href="/free-patterns/${p.slug}/"><h3>${esc(p.title)}</h3><p>${esc(p.level)} · ${esc(p.time)} · ${esc(p.size)}</p><span class="more">See the pattern →</span></a>`,
    )
    .join('');
}

// Write every page. Returns the warnings so the caller can print them.
export function generatePatternPages() {
  const patterns = loadPatterns();
  const warnings = [];
  for (const p of patterns) {
    warnings.push(...checkCounts(p));
    const dir = path.join(OUT_DIR, p.slug);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'index.html');
    const html = renderPattern(p);
    // Only write when changed, so the dev server doesn't reload for nothing.
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html) fs.writeFileSync(file, html);
  }
  for (const w of warnings) console.warn(`\x1b[33m[patterns] stitch count check: ${w}\x1b[0m`);
  return { patterns, warnings };
}
