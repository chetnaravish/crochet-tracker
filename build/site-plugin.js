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
    image: abs(OG_IMAGE),
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

function renderMeta(meta, html) {
  const url = abs(meta.path);
  const ogImage = abs(OG_IMAGE);
  const tags = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
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
    `<meta property="og:image:alt" content="${SITE_NAME} – track crochet patterns round by round">`,
    '<meta property="og:locale" content="en_US">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escAttr(meta.ogTitle || meta.title)}">`,
    `<meta name="twitter:description" content="${escAttr(meta.description)}">`,
    `<meta name="twitter:image" content="${ogImage}">`,
  ];

  if (!meta.noindex) {
    if (meta.crumbs) tags.push(jsonLd(breadcrumbSchema(meta.crumbs)));
    if (meta.schema === 'article') tags.push(jsonLd(articleSchema(html, meta)));
    if (meta.schema === 'howto') {
      const s = howToSchema(html, meta);
      if (s) tags.push(jsonLd(s));
      tags.push(jsonLd(articleSchema(html, meta)));
    }
    if (meta.schema === 'webapp') tags.push(jsonLd(webAppSchema(meta)));
    const faq = faqSchema(html);
    if (faq) tags.push(jsonLd(faq));
  }
  return tags.filter(Boolean).join('\n    ');
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    return d.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

export default function sitePlugin() {
  let isBuild = false;
  let outDir = 'dist';
  const pages = new Map(); // path -> { noindex, priority }

  return {
    name: 'crochet-site',
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

        // 2. Meta block
        const metaMatch = html.match(/<!--@meta\s+([\s\S]*?)-->/);
        if (metaMatch) {
          const meta = JSON.parse(metaMatch[1]);
          pages.set(meta.path, { noindex: !!meta.noindex, priority: meta.priority });
          html = html.replace(metaMatch[0], () => renderMeta(meta, html));
          if (meta.nav) {
            html = html.replace(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`);
          }
        }

        // 3. Constants
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
