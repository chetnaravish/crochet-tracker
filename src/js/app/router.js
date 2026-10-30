// Minimal hash router: "#/work/abc?x=1" -> handler({ id: 'abc' }, URLSearchParams).
// Handlers may return a cleanup function that runs when the user leaves the view.
// A "leave guard" (e.g. unsaved changes) can cancel navigation.

const routes = [];
let cleanup = null;
let leaveGuard = null;
let currentHash = null;

export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp(
    '^' + pattern.replace(/\/:(\w+)/g, (_, k) => (keys.push(k), '/([^/]+)')) + '/?$',
  );
  routes.push({ re, keys, handler });
}

export function navigate(path, { replace = false } = {}) {
  const hash = '#' + path;
  if (replace) {
    history.replaceState(null, '', hash);
    handle();
  } else if (location.hash === hash) {
    handle();
  } else {
    location.hash = hash;
  }
}

export const setLeaveGuard = (fn) => (leaveGuard = fn);

export function currentPath() {
  return (location.hash.slice(1) || '/').split('?')[0];
}

async function handle() {
  if (leaveGuard && currentHash !== null && location.hash !== currentHash) {
    const ok = await leaveGuard();
    if (!ok) {
      history.pushState(null, '', currentHash); // put the old URL back (fires no hashchange)
      return;
    }
  }
  leaveGuard = null;
  currentHash = location.hash;

  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    cleanup?.();
    cleanup = null;
    const result = await r.handler(params, new URLSearchParams(query));
    if (typeof result === 'function') cleanup = result;
    return;
  }
  navigate('/', { replace: true });
}

export function startRouter() {
  window.addEventListener('hashchange', handle);
  handle();
}
