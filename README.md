# Crochet Tracker

A free, mobile-first **crochet pattern tracker and row counter**. Write a pattern round by round, save it, then follow it while you crochet: tick off each round as you finish it. Works offline as an installable PWA. No login, no backend: all patterns stay in the browser's IndexedDB.

The public pages (homepage, abbreviations glossary, stitch guides, long-form guides, free patterns) are real static HTML with full SEO markup, so they can rank for searches like "crochet row counter" and "crochet abbreviations".

## Features

**Tracker app (`/app/`)**
- Create and edit patterns: title, hook, yarn, notes, plus one card per round (instructions and stitch count, with move up/down and delete).
- One-tap abbreviation chips (`mr`, `ch`, `sl st`, `sc`, `hdc`, `dc`, `tr`, `inc`, `dec`, `BLO`, `FLO`, `( ) x6`, `[ ]`) that insert at the cursor. They stay above the on-screen keyboard.
- Repeat helper: "Rounds X to Y are the same as Round Z".
- Paste full pattern: `R1`, `Rnd 1`, `Round 1`, `Row 1` and ranges like `R3-5` or `Rnds 6 to 8` are split into rounds. Trailing stitch counts like `(12)` are moved into the stitch-count field, and you see a preview first.
- Saved list with search, sort by Recent or Name, and Edit / Duplicate / Delete through the "…" button or a long-press.
- Work Mode:
  - Done rounds collapse with a green tick, the current round is large, and upcoming rounds are visible but muted.
  - A big Done button, Undo, and a stitch counter inside the current round.
  - Focus Mode, Screen Wake Lock, Reset progress, and a celebration screen when you finish.
  - Keyboard shortcuts on desktop: D (done), U (undo), + and − (counter).
- Saved filters: All / In progress / Completed.
- Work Mode extras: tap a done round to re-read it, and a "Last round!" hint.
- Backup reminder on Home when patterns have changed and haven't been backed up recently.
- Settings: text size (normal, large, extra large), JSON export, import/restore, and links to the website and help pages.

**Website**
- `/` homepage with FAQ
- `/crochet-abbreviations/` glossary (US and UK terms, with a live filter)
- `/stitches/` hub plus 8 stitch pages
- `/guides/` hub plus 2 guides
- `/free-patterns/` with 3 patterns, each with an "Open in Tracker" button
- `/about/`, `/privacy/` and a custom 404 page
- `/search/`: site search over pages, abbreviations and free patterns. It uses `search-index.json`, which is generated at build time and also works offline.
- Every inner page has a sticky Back button with breadcrumbs. A "Back to Tracker" button appears when the visitor came from the app.
- A ☰ menu on mobile, and previous/next lesson links on stitch pages.

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests for the pattern parser and data model (node:test)
npm run build      # production build into dist/
npm run preview    # serve dist/ on http://localhost:4173 (service worker is active here)
npm run icons      # regenerate PNG icons + og-image.png from public/favicon.svg (uses sharp)
```

The service worker is only registered in production builds. To test offline mode, run `npm run build && npm run preview`, open the site once, then switch your browser to offline.

## Configuration

Change the domain in **one place**: `site.config.js`

```js
export const SITE_URL = 'https://crochettracker.example';
```

It is used for canonical URLs, Open Graph tags, JSON-LD, `sitemap.xml` and `robots.txt`.

## Deploying to Vercel

1. Push the repo to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo. Vercel reads `vercel.json`:
   - build command `npm run build`, output directory `dist`
   - `trailingSlash: true`, so `/about` redirects to `/about/`
   - `sw.js` served with `no-cache`, hashed assets cached for a year
   - `X-Robots-Tag: noindex` on `/app/`
3. Set `SITE_URL` in `site.config.js` to your real domain and redeploy.
4. Submit `https://your-domain/sitemap.xml` in Google Search Console.

Vercel serves `dist/404.html` automatically for unknown URLs.

## Project structure

```
├── build/
│   ├── site-plugin.js      # Vite plugin: partials, SEO meta, JSON-LD, inline CSS, sitemap, robots, sw.js
│   └── sw-template.js      # service worker template (precache list injected at build)
├── public/                 # copied as-is: favicon, icons, manifest, og-image
├── scripts/make-icons.mjs  # icon generator (sharp)
├── site.config.js          # SITE_URL and other site constants
├── src/                    # Vite root: every .html file here is a page
│   ├── index.html          # homepage
│   ├── 404.html
│   ├── app/index.html      # the tracker app shell (noindex)
│   ├── crochet-abbreviations/, stitches/, guides/, free-patterns/, about/, privacy/
│   ├── partials/           # header.html, footer.html (included via <!--@include header-->)
│   ├── styles/
│   │   ├── tokens.css      # design tokens (colours, radii, dark mode)
│   │   ├── base.css        # reset, buttons, forms, focus states
│   │   ├── site.css        # public pages
│   │   └── app.css         # tracker app
│   └── js/
│       ├── site.js         # public pages: SW registration, "Open in Tracker", glossary filter
│       ├── lib/            # db.js (IndexedDB), patterns.js (model), parse.js (paste parser),
│       │                   # settings.js, sw-register.js, free-pattern.js
│       └── app/            # main.js, router.js (hash router), ui.js, wakelock.js, views/*.js
├── tests/parse.test.js
├── vercel.json
└── vite.config.js
```

### How pages get their SEO tags

Each page starts its `<head>` with a JSON directive:

```html
<!--@meta {"title":"…","description":"…","path":"/stitches/chain/","crumbs":[["Stitches","/stitches/"],["Chain Stitch (ch)"]],"schema":"howto"}-->
```

At build time (and in dev), `build/site-plugin.js` expands it into:
- the title, meta description, canonical URL, robots tag, Open Graph and Twitter tags, icons and manifest
- JSON-LD: `BreadcrumbList` from `crumbs`, plus `WebApplication`, `Article` or `HowTo` depending on `schema`. HowTo steps are read from the page's `<ol data-howto>`.
- `FAQPage` JSON-LD, generated automatically from any `<details class="faq-item">` blocks on the page

To add a page, create `src/<slug>/index.html` with a `@meta` block. It is picked up by the build and added to the sitemap automatically.

## Data & privacy

- Patterns are stored in IndexedDB (`crochet-tracker` database, `patterns` store). Small preferences (text size, focus mode, sort order) are kept in `localStorage`.
- Nothing is sent to a server. Users can back up and restore with the JSON export/import in Settings.

## License

MIT
