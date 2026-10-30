// App entry: wires the router, bottom navigation and views together.
import { route, startRouter } from './router.js';
import { applySettings } from '../lib/settings.js';
import { registerServiceWorker } from '../lib/sw-register.js';
import { renderHome } from './views/home.js';
import { renderSaved } from './views/saved.js';
import { renderEditor } from './views/editor.js';
import { renderWork } from './views/work.js';
import { renderSettings } from './views/settings.js';

applySettings();
registerServiceWorker();

const view = document.getElementById('view');
const nav = document.querySelector('.bottom-nav');

// Prepares a fresh container for the next view (so old event listeners are dropped),
// shows/hides the bottom nav and highlights the active tab.
function screen(tab, { hideNav = false } = {}) {
  const el = document.createElement('div');
  el.className = 'screen';
  view.replaceChildren(el);
  document.body.classList.toggle('no-nav', hideNav);
  for (const a of nav.querySelectorAll('[data-tab]')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
  return el;
}

route('/', () => renderHome(screen('home')));
route('/saved', () => renderSaved(screen('saved')));
route('/create', (_, q) => renderEditor(screen('create'), null, { paste: q.has('paste') }));
route('/edit/:id', ({ id }) => renderEditor(screen(''), id));
route('/work/:id', ({ id }) => renderWork(screen('', { hideNav: true }), id));
route('/settings', () => renderSettings(screen('home')));

// "Add to Home Screen": keep the browser's install prompt for the Home view's button.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__installPrompt = e;
  document.dispatchEvent(new CustomEvent('installable'));
});

startRouter();
