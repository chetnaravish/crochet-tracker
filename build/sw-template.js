// Crochet Tracker service worker (generated at build time from build/sw-template.js).
// Strategy: precache every page and asset on install, serve them cache-first,
// and fall back to the network for anything else. A new deploy produces a new
// VERSION, which installs a fresh cache and removes the old one.

const VERSION = '__VERSION__';
const CACHE = `ct-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ct-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// "/about" and "/about/index.html" both map to the cached "/about/".
function pageKey(url) {
  let p = url.pathname.replace(/index\.html$/, '');
  if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/';
  return p;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(pageKey(url));
        if (cached) return cached;
        try {
          return await fetch(req);
        } catch {
          const fallback = url.pathname.startsWith('/app') ? '/app/' : '/404.html';
          return (await cache.match(fallback)) || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        // Keep a copy of other same-origin files (e.g. images added later).
        if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
        return res;
      } catch {
        return Response.error();
      }
    })(),
  );
});
