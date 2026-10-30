// Small script for the public pages: offline support, "Open in Tracker" buttons
// and the glossary filter. Loaded as a module, so it never blocks rendering.
import { registerServiceWorker } from './lib/sw-register.js';

registerServiceWorker();

// Free patterns: save the pattern into the app's database and open Work Mode.
for (const btn of document.querySelectorAll('[data-open-pattern]')) {
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const { openFreePattern } = await import('./lib/free-pattern.js');
      await openFreePattern(btn.closest('[data-pattern]'));
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      const status = btn.parentElement.querySelector('.open-status');
      if (status) status.textContent = 'Sorry, this browser blocked saving. Try a normal (non-private) window.';
    }
  });
}

// Abbreviation glossary: live filter.
const filter = document.getElementById('abbr-filter');
if (filter) {
  const rows = [...document.querySelectorAll('[data-filter-rows] tbody tr')];
  const count = document.getElementById('abbr-count');
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    for (const row of rows) {
      const match = !q || row.textContent.toLowerCase().includes(q);
      row.hidden = !match;
      if (match) shown++;
    }
    count.textContent = q ? `${shown} of ${rows.length} abbreviations match` : '';
  });
}
