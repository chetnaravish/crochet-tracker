# Crochet Tracker

A free, mobile-first **crochet pattern tracker and row counter**, plus a website with free patterns, stitch lessons and an abbreviations guide.

- **Tracker app (`/app/`):** write or paste a pattern, then follow it round by round with a big Done button and a stitch counter. Works offline as an installable PWA.
- **Website (`/`):** free patterns (each opens in the tracker), stitch lessons, guides and a US/UK abbreviations chart.
- **Admin panel (`/admin/`):** add or edit free patterns and photos in a form (Sveltia CMS). Each pattern is a JSON file in `content/patterns/`.
- **Private by design:** no login, no server. Patterns stay on the user's own device.

## Tech

Vite (multi-page), plain HTML, CSS and vanilla JavaScript, IndexedDB, a service worker for offline use, hosted on Vercel.

## Run locally

```bash
npm install
npm run dev     # http://localhost:5173
npm test
npm run build
```

## License

MIT
