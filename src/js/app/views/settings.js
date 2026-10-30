// Settings: text size and JSON backup / restore.
import { getAllPatterns, savePatterns } from '../../lib/db.js';
import { makeBackup, readBackup } from '../../lib/patterns.js';
import { getSettings, setSetting } from '../../lib/settings.js';
import { icons, toast, confirmDialog, plural } from '../ui.js';

const SIZES = [
  ['normal', 'Normal'],
  ['large', 'Large'],
  ['xlarge', 'Extra large'],
];

export function renderSettings(view) {
  const current = getSettings().textSize;
  view.innerHTML = `
    <header class="topbar">
      <a class="icon-btn" href="#/" aria-label="Back to home">${icons.back}</a>
      <h1 class="topbar-title">Settings</h1>
      <span class="topbar-spacer"></span>
    </header>
    <div class="page settings">
      <section class="card settings-card" aria-labelledby="ts-h">
        <h2 id="ts-h">Text size</h2>
        <p class="field-hint">Bigger text is easier to read while your hands are busy.</p>
        <div class="segmented segmented-lg" role="radiogroup" aria-labelledby="ts-h">
          ${SIZES.map(([v, l]) => `<button type="button" role="radio" data-size="${v}" aria-checked="${v === current}">${l}</button>`).join('')}
        </div>
        <p class="size-preview">R3: (sc, inc) x6 <span>(18 sts)</span></p>
      </section>

      <section class="card settings-card" aria-labelledby="bk-h">
        <h2 id="bk-h">Backup</h2>
        <p class="field-hint">Your patterns are saved only in this browser. Download a backup file to keep them safe or move them to another device.</p>
        <div class="settings-actions">
          <button type="button" class="btn btn-primary" data-act="export">${icons.download} Export all patterns</button>
          <label class="btn btn-outline file-btn">
            ${icons.upload} Import from backup
            <input type="file" accept="application/json,.json" class="visually-hidden" id="import-file">
          </label>
        </div>
        <p class="field-hint">Importing adds the patterns from the file. Patterns that already exist on this device are updated.</p>
      </section>

      <section class="card settings-card" aria-labelledby="ab-h">
        <h2 id="ab-h">About</h2>
        <p>Crochet Tracker is free and works offline. No account, no tracking – your data never leaves your device.</p>
        <p class="settings-links"><a href="/">Website</a> · <a href="/about/">About</a> · <a href="/privacy/">Privacy</a> · <a href="/crochet-abbreviations/">Abbreviations</a></p>
      </section>
    </div>`;

  view.querySelector('.segmented').addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    setSetting('textSize', b.dataset.size);
    for (const x of view.querySelectorAll('[data-size]')) x.setAttribute('aria-checked', String(x === b));
  });

  view.querySelector('[data-act="export"]').addEventListener('click', async () => {
    const patterns = await getAllPatterns();
    if (!patterns.length) return toast('No patterns to export yet');
    const blob = new Blob([JSON.stringify(makeBackup(patterns), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crochet-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Exported ${plural(patterns.length, 'pattern')}`);
  });

  view.querySelector('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let patterns;
    try {
      patterns = readBackup(JSON.parse(await file.text()));
    } catch (err) {
      return toast(err instanceof SyntaxError ? "That file isn't valid JSON." : err.message);
    }
    if (!patterns.length) return toast('The backup file is empty');
    const existing = new Set((await getAllPatterns()).map((p) => p.id));
    const updates = patterns.filter((p) => existing.has(p.id)).length;
    const ok = await confirmDialog({
      title: `Import ${plural(patterns.length, 'pattern')}?`,
      message: updates
        ? `${plural(updates, 'pattern')} already on this device will be replaced by the version in “${file.name}”.`
        : `From “${file.name}”.`,
      confirmText: 'Import',
    });
    if (!ok) return;
    await savePatterns(patterns);
    toast(`Imported ${plural(patterns.length, 'pattern')}`);
  });
}
