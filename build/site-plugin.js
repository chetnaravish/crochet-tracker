// Vite plugin that turns plain HTML pages into SEO-ready static pages.
//
// In every HTML page it:
//   - expands <!--@include name--> with src/partials/name.html
//   - expands <!--@meta {json}--> into title, description, canonical, OG/Twitter
//     tags, icons and JSON-LD (BreadcrumbList, Article, HowTo, WebApplication)
//   - builds FAQPage JSON-LD from <details class="faq-item"> blocks on the page
//   - replaces {{SITE_URL}}, {{SITE_NAME}} and {{YEAR}}
//   - marks the current header link with aria-current="page"
//
// After a production build it writes sitemap.xml, robots.txt and sw.js to dist/.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SITE_URL, SITE_NAME, THEME_COLOR, OG_IMAGE } from '../site.config.js';
import { miniChart, symbol } from './drawings.js';
import { stepClip } from './clips.js';
import { generatePatternPages, loadPatterns, patternCards } from './pattern-pages.js';

const PARTIALS_DIR = path.resolve('src/partials');

const escAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Strip tags and decode the few entities used in our content -> plain text for JSON-LD.
function toText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&times;/g, '×')
    .replace(/\s+/g, ' ')
    .trim();
}

const abs = (p) => SITE_URL + p;
const jsonLd = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

function breadcrumbSchema(crumbs) {
  const items = [['Home', '/'], ...crumbs];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, p], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      ...(p ? { item: abs(p) } : {}),
    })),
  };
}

function faqSchema(html) {
  const re = /<details[^>]*class="[^"]*faq-item[^"]*"[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g;
  const qs = [...html.matchAll(re)].map((m) => ({
    '@type': 'Question',
    name: toText(m[1]),
    acceptedAnswer: { '@type': 'Answer', text: toText(m[2]) },
  }));
  return qs.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qs } : null;
}

const h1Text = (html) => toText((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]);

function howToSchema(html, meta) {
  const ol = html.match(/<ol[^>]*data-howto[^>]*>([\s\S]*?)<\/ol>/);
  if (!ol) return null;
  const steps = [...ol[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    text: toText(m[1]),
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: h1Text(html),
    description: meta.description,
    image: abs(OG_IMAGE),
    tool: [{ '@type': 'HowToTool', name: 'Crochet hook' }],
    supply: [{ '@type': 'HowToSupply', name: 'Yarn' }],
    step: steps,
  };
}

function articleSchema(html, meta) {
  const org = { '@type': 'Organization', name: SITE_NAME, url: SITE_URL };
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: h1Text(html),
    description: meta.description,
    image: abs(meta.ogImage || OG_IMAGE),
    datePublished: meta.date || '2026-10-30',
    dateModified: meta.modified || meta.date || '2026-10-30',
    author: org,
    publisher: { ...org, logo: { '@type': 'ImageObject', url: abs('/icons/icon-512.png') } },
    mainEntityOfPage: abs(meta.path),
  };
}

function webAppSchema(meta) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: abs('/app/'),
    description: meta.description,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any (runs in a web browser)',
    browserRequirements: 'Requires JavaScript and a modern browser.',
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    image: abs(OG_IMAGE),
  };
}

// Homepage: who runs the site and what it is called (helps Google show the site name).
function siteSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': abs('/#website'), name: SITE_NAME, url: abs('/'), inLanguage: 'en', publisher: { '@id': abs('/#org') } },
      { '@type': 'Organization', '@id': abs('/#org'), name: SITE_NAME, url: abs('/'), logo: abs('/icons/icon-512.png') },
    ],
  };
}

// Hub pages (stitches, guides, free patterns): a list of the child pages they link to.
function collectionSchema(html, meta) {
  const seen = new Map();
  // Links to a direct child page of this hub, e.g. /stitches/chain/ on /stitches/.
  const re = /<a[^>]+href="(\/[\w-]+\/[\w-]+\/)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const [, href, inner] of html.matchAll(re)) {
    if (!href.startsWith(meta.path)) continue;
    const name = toText((inner.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/) || [, inner])[1]);
    if (name && !seen.has(href)) seen.set(href, name);
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: h1Text(html),
    description: meta.description,
    url: abs(meta.path),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [...seen].map(([href, name], i) => ({ '@type': 'ListItem', position: i + 1, url: abs(href), name })),
    },
  };
}

// Bar under the header: a Back link (to the parent page; site.js upgrades it to
// history.back() when the visitor came from another page of this site) + breadcrumbs.
function crumbBar(crumbs) {
  const items = [['Home', '/'], ...crumbs];
  const parent = items.length > 1 ? items[items.length - 2][1] : '/';
  const lis = items
    .map(([name, p], i) =>
      i === items.length - 1
        ? `<li aria-current="page">${escAttr(name)}</li>`
        : `<li><a href="${p}">${escAttr(name)}</a></li>`,
    )
    .join('');
  return `<div class="crumbbar">
      <div class="container crumbbar-inner">
        <a class="back-link" href="${parent}" data-back><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg><span>Back</span></a>
        <nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${lis}</ol></nav>
      </div>
    </div>`;
}

// Website pages always open at the top (hero): on refresh and when arriving from any
// link, the browser must not keep the old scroll spot (e.g. the footer). Exceptions:
// a #section link still jumps to that section, and browser Back/Forward (and our Back
// button) returns to where you were, using the spot saved in history.state on leave.
const SCROLL_TOP_SCRIPT = `(function(){var h=history;if(!('scrollRestoration' in h))return;h.scrollRestoration='manual';
addEventListener('pagehide',function(){try{h.replaceState(Object.assign({},h.state,{ctY:scrollY}),'')}catch(e){}});
var n=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
var y=n&&n.type==='back_forward'&&h.state&&h.state.ctY;
if(location.hash)return;
if(!y){scrollTo(0,0);return}
var go=function(){scrollTo(0,y)};addEventListener('DOMContentLoaded',go);addEventListener('load',go)})()`.replace(/\n/g, '');

function renderMeta(meta, html) {
  const url = abs(meta.path);
  const ogImage = abs(meta.ogImage || OG_IMAGE);
  const ogAlt = meta.ogImageAlt || `${SITE_NAME} – track crochet patterns round by round`;
  const tags = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    // Tiny inline flag so CSS can collapse the mobile menu only when JS can open it again.
    "<script>document.documentElement.classList.add('js')</script>",
    meta.path.startsWith('/app/') ? '' : `<script>${SCROLL_TOP_SCRIPT}</script>`,
    `<title>${escAttr(meta.title)}</title>`,
    `<meta name="description" content="${escAttr(meta.description)}">`,
    `<meta name="robots" content="${meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">`,
    meta.noindex ? '' : `<link rel="canonical" href="${url}">`,
    `<meta name="theme-color" content="${THEME_COLOR}" media="(prefers-color-scheme: light)">`,
    '<meta name="theme-color" content="#1f1a1d" media="(prefers-color-scheme: dark)">',
    '<meta name="color-scheme" content="light dark">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/icons/icon-32.png" sizes="32x32" type="image/png">',
    '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes">',
    `<meta name="apple-mobile-web-app-title" content="${SITE_NAME}">`,
    `<meta property="og:type" content="${meta.ogType || (meta.schema === 'article' || meta.schema === 'howto' ? 'article' : 'website')}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${escAttr(meta.ogTitle || meta.title)}">`,
    `<meta property="og:description" content="${escAttr(meta.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${ogImage}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${escAttr(ogAlt)}">`,
    '<meta property="og:locale" content="en_US">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escAttr(meta.ogTitle || meta.title)}">`,
    `<meta name="twitter:description" content="${escAttr(meta.description)}">`,
    `<meta name="twitter:image" content="${ogImage}">`,
    `<meta name="twitter:image:alt" content="${escAttr(ogAlt)}">`,
  ];

  if (!meta.noindex) {
    if (meta.crumbs) tags.push(jsonLd(breadcrumbSchema(meta.crumbs)));
    if (meta.schema === 'article') tags.push(jsonLd(articleSchema(html, meta)));
    if (meta.schema === 'howto') {
      const s = howToSchema(html, meta);
      if (s) tags.push(jsonLd(s));
      tags.push(jsonLd(articleSchema(html, meta)));
    }
    if (meta.schema === 'webapp') {
      tags.push(jsonLd(webAppSchema(meta)));
      tags.push(jsonLd(siteSchema()));
    }
    if (meta.schema === 'collection') tags.push(jsonLd(collectionSchema(html, meta)));
    const faq = faqSchema(html);
    if (faq) tags.push(jsonLd(faq));
  }
  return tags.filter(Boolean).join('\n    ');
}

// Step drawings: <li data-fig='{"loops":2,"yo":true}'> gets an SVG drawing.
// Each step gets its own small animated "clip" (see build/clips.js). Steps that are
// better shown as a chart keep the chart drawing, with the new stitches popping in.
function figureFor(spec) {
  if (spec.chart) return miniChart(spec.chart).replace('class="fig ', 'class="clip k-chart fig ');
  return stepClip(spec);
}

// The few words every step list uses, explained once above the steps.
const HOWTO_TERMS = `<aside class="howto-terms" aria-label="Words used in these steps">
            <p class="howto-terms-title">Words used in these steps</p>
            <dl>
              <div><dt>Working yarn</dt><dd>The yarn coming from the ball.</dd></div>
              <div><dt>Yarn over (yo)</dt><dd>Wrap the working yarn over your hook from back to front.</dd></div>
              <div><dt>Pull up a loop</dt><dd>With the yarn caught in the hook, pull the hook back out through the stitch.</dd></div>
              <div><dt>Loops on your hook</dt><dd>The loops sitting around the hook. Each step tells you how many there should be.</dd></div>
            </dl>
          </aside>`;

function expandDrawings(html) {
  html = html.replace(/<!--@symbol\s+([\w-]+)\s*-->/g, (_, name) => symbol(name));
  html = html.replace(/<!--@chart\s+([\w-]+)\s*-->/g, (_, name) => `<figure class="mini-chart">${miniChart(name)}</figure>`);
  return html.replace(/<ol([^>]*data-howto[^>]*)>([\s\S]*?)<\/ol>/, (whole, attrs, inner) => {
    const items = inner.replace(/<li(?: data-fig='([^']+)')?>([\s\S]*?)<\/li>/g, (li, json, text) => {
      if (!json) return li;
      const spec = JSON.parse(json);
      const cap = spec.cap ? `<span class="step-cap">${spec.cap}</span>` : '';
      return `<li><span class="step-text">${text}</span><span class="step-fig">${figureFor(spec)}${cap}</span></li>`;
    });
    return `${HOWTO_TERMS}
          <ol${attrs}>${items}</ol>`;
  });
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    return d.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}


// ---------- Article sidebar ----------
// Lesson, guide and info pages get a right-hand column on wide screens: an
// "On this page" list built from the h2 headings and a small tracker card, so the
// page is balanced instead of leaving the right side empty.
const SIDEBAR_PAGES = /^\/(stitches\/[\w-]+|guides\/[\w-]+|about|privacy)\/$/;
const slug = (t) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function addSidebar(html) {
  const m = html.match(/<article class="container article">([\s\S]*)<\/article>(\s*<\/main>)/);
  if (!m) return html;
  // Headings of an in-page contents box or a call-to-action band are not sections.
  let inner = m[1].replace(/(<(?:nav class="toc"|div class="cta-band)[^>]*>\s*)<h2/g, '$1<h2 data-notoc');
  const toc = [];
  inner = inner.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (all, attrs, text) => {
    if (attrs.includes('data-notoc')) return `<h2${attrs.replace(' data-notoc', '')}>${text}</h2>`;
    let id = (attrs.match(/id="([^"]+)"/) || [])[1];
    if (!id) { id = slug(text); attrs += ` id="${id}"`; }
    toc.push(`<li><a href="#${id}">${text.replace(/<[^>]+>/g, '')}</a></li>`);
    return `<h2${attrs}>${text}</h2>`;
  });
  const side = `<aside class="article-side">
          ${toc.length > 1 ? `<nav class="side-card side-toc" aria-label="On this page"><p class="side-title">On this page</p><ol>${toc.join('')}</ol></nav>` : ''}
          <div class="side-card side-cta"><p class="side-title">🧶 Crochet Tracker</p><p>Follow any pattern round by round and never lose your place. Free, no sign-up.</p><a class="btn btn-primary btn-sm" href="/app/">Start Tracking</a></div>
        </aside>`;
  return html.replace(m[0], () => `<article class="container article has-side"><div class="article-main">${inner}</div>${side}</article>${m[2]}`);
}

// ---------- Site search index ----------
// Built from the source pages: one entry per indexable page, plus one per glossary
// abbreviation and per free pattern, so a search for "FLO" lands on the exact row.
function pageType(p) {
  if (p.startsWith('/stitches/') && p !== '/stitches/') return 'Stitch';
  if (p.startsWith('/guides/') && p !== '/guides/') return 'Guide';
  if (p === '/crochet-abbreviations/') return 'Glossary';
  if (p === '/free-patterns/') return 'Patterns';
  if (p.startsWith('/free-patterns/')) return 'Free pattern';
  return 'Page';
}

function buildSearchIndex() {
  const srcRoot = path.resolve('src');
  const entries = [];
  const files = listFiles(srcRoot).filter((f) => f.endsWith('.html') && !f.startsWith('partials/'));
  for (const f of files) {
    const html = fs.readFileSync(path.join(srcRoot, f), 'utf8');
    const m = html.match(/<!--@meta\s+([\s\S]*?)-->/);
    if (!m) continue;
    const meta = JSON.parse(m[1]);
    if (meta.noindex) continue;
    const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [, ''])[1].replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
    entries.push({
      u: meta.path,
      t: h1Text(html) || meta.title,
      d: meta.description,
      k: pageType(meta.path),
      h: [...main.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].map((x) => toText(x[1])).join(' · '),
      x: toText(main).slice(0, 4000),
    });

    if (meta.path === '/crochet-abbreviations/') {
      // The chart is split into several <tbody> groups. Group header rows have a
      // class, so the plain /<tr>/ match below skips them.
      const tbody = (html.match(/<table[^>]*data-filter-rows[^>]*>([\s\S]*?)<\/table>/) || [, ''])[1];
      for (const row of tbody.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
        const [abbr, us, uk, meaning] = [...row[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => toText(c[1]));
        if (!abbr) continue; // header row
        entries.push({ u: `/crochet-abbreviations/?q=${encodeURIComponent(abbr)}`, t: `${abbr} – ${us}`, d: `UK: ${uk}. ${meaning}`, k: 'Abbreviation', a: abbr });
      }
    }
    if (meta.path === '/free-patterns/') {
      for (const art of html.matchAll(/<article class="pattern" id="([\w-]+)"[^>]*data-title="([^"]+)"[\s\S]*?<\/ul>\s*<p>([\s\S]*?)<\/p>/g)) {
        entries.push({ u: `/free-patterns/#${art[1]}`, t: art[2], d: toText(art[3]), k: 'Free pattern' });
      }
    }
  }
  return entries;
}

export default function sitePlugin() {
  let isBuild = false;
  let outDir = 'dist';
  const pages = new Map(); // path -> { noindex, priority }

  return {
    name: 'crochet-site',
    // Dev server: serve a fresh search index on every request.
    configureServer(server) {
      // Rebuild pattern pages when a pattern data file changes.
      const dir = path.resolve('content/patterns');
      server.watcher.add(dir);
      server.watcher.on('all', (_e, file) => {
        if (file.startsWith(dir)) {
          generatePatternPages();
          server.ws.send({ type: 'full-reload' });
        }
      });
      server.middlewares.use('/search-index.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(buildSearchIndex()));
      });
    },

    configResolved(config) {
      isBuild = config.command === 'build';
      outDir = config.build.outDir;
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // 1. Partials (header, footer, ...)
        html = html.replace(/<!--@include\s+([\w-]+)\s*-->/g, (_, name) =>
          fs.readFileSync(path.join(PARTIALS_DIR, `${name}.html`), 'utf8'),
        );

        // Free-pattern cards go in first, so the hub's ItemList schema can list them.
        if (html.includes('<!--@pattern-cards-->')) html = html.replace('<!--@pattern-cards-->', () => patternCards(loadPatterns()));

        // 2. Meta block
        const metaMatch = html.match(/<!--@meta\s+([\s\S]*?)-->/);
        let pagePath = null;
        if (metaMatch) {
          const meta = JSON.parse(metaMatch[1]);
          pagePath = meta.path;
          pages.set(meta.path, { noindex: !!meta.noindex, priority: meta.priority });
          html = html.replace(metaMatch[0], () => renderMeta(meta, html));
          if (meta.nav) {
            html = html.replace(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`);
          }
          // Back button + visible breadcrumbs, built from the same crumbs as the JSON-LD.
          if (meta.crumbs) html = html.replace('<main id="main"', () => `${crumbBar(meta.crumbs)}\n    <main id="main"`);
        }

        // 3. Drawings and the free-pattern cards
        html = expandDrawings(html);
        if (pagePath && SIDEBAR_PAGES.test(pagePath)) html = addSidebar(html);

        // 4. Constants
        return html
          .replaceAll('{{SITE_URL}}', SITE_URL)
          .replaceAll('{{SITE_NAME}}', SITE_NAME)
          .replaceAll('{{YEAR}}', String(new Date().getFullYear()));
      },
    },

    closeBundle() {
      if (!isBuild) return;
      const out = path.resolve(outDir);
      const today = new Date().toISOString().slice(0, 10);

      // Inline the (small) stylesheet into every page so CSS never blocks first paint.
      for (const file of listFiles(out).filter((f) => f.endsWith('.html'))) {
        const full = path.join(out, file);
        const html = fs.readFileSync(full, 'utf8').replace(
          /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g,
          (_, href) => `<style>${fs.readFileSync(path.join(out, href), 'utf8')}</style>`,
        );
        fs.writeFileSync(full, html);
      }

      // sitemap.xml – every indexable page
      const urls = [...pages.entries()]
        .filter(([, p]) => !p.noindex)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(
          ([p, info]) =>
            `  <url><loc>${abs(p)}</loc><lastmod>${today}</lastmod><priority>${info.priority ?? (p === '/' ? '1.0' : '0.7')}</priority></url>`,
        );
      fs.writeFileSync(
        path.join(out, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      );

      // robots.txt
      fs.writeFileSync(
        path.join(out, 'robots.txt'),
        `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`,
      );

      // search-index.json – used by /search/ (and precached below, so search works offline)
      fs.writeFileSync(path.join(out, 'search-index.json'), JSON.stringify(buildSearchIndex()));

      // sw.js – precache every built file so the whole site works offline
      const skip = /(^|\/)(sw\.js|sitemap\.xml|robots\.txt|og-image\.png)$|\.map$/;
      const files = listFiles(out).filter((f) => !skip.test(f));
      const hash = crypto.createHash('sha256');
      for (const f of files) hash.update(f).update(fs.readFileSync(path.join(out, f)));
      const urlsToCache = files
        .map((f) => '/' + f.replace(/(^|\/)index\.html$/, '$1'))
        .sort();
      const template = fs.readFileSync(path.resolve('build/sw-template.js'), 'utf8');
      fs.writeFileSync(
        path.join(out, 'sw.js'),
        template
          .replace('__VERSION__', hash.digest('hex').slice(0, 12))
          .replace('__PRECACHE__', JSON.stringify(urlsToCache, null, 2)),
      );
    },
  };
}
