// Home: continue the last pattern, quick actions, install hint.
import { getAllPatterns } from '../../lib/db.js';
import { progressOf } from '../../lib/patterns.js';
import { esc, icons, formatDate, toast, plural } from '../ui.js';
import { exportBackup, shouldRemind, snoozeReminder } from '../backup.js';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export async function renderHome(view) {
  const patterns = await getAllPatterns();
  const recent = patterns
    .filter((p) => !progressOf(p).complete)
    .sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt))[0];

  view.innerHTML = `
    <header class="topbar">
      <a class="brand" href="/" aria-label="Crochet Tracker website"><span class="brand-mark">${icons.yarn}</span><span>Crochet Tracker</span></a>
      <a class="icon-btn" href="#/settings" aria-label="Settings">${icons.settings}</a>
    </header>
    <div class="page">
      <h1 class="page-title">Hello, crocheter!</h1>
      <p class="lead">Write a pattern once, then tick off each round as you go.</p>

      ${
        shouldRemind(patterns)
          ? `<section class="card backup-card" id="backup-reminder" aria-labelledby="backup-h">
          <div class="backup-icon" aria-hidden="true">${icons.shield}</div>
          <div>
            <h2 id="backup-h">Keep your patterns safe</h2>
            <p>Your patterns are saved only on this device. If the browser data is cleared, they're gone. Download a backup file, it takes one tap.</p>
            <div class="backup-actions">
              <button type="button" class="btn btn-primary" data-act="backup">${icons.download} Back up now</button>
              <button type="button" class="btn btn-ghost" data-act="later">Later</button>
            </div>
          </div>
        </section>`
          : ''
      }

      ${
        recent
          ? (() => {
              const pr = progressOf(recent);
              return `
        <section aria-labelledby="continue-h" class="continue">
          <h2 id="continue-h" class="section-label">Continue where you left off</h2>
          <a class="card pattern-card continue-card" href="#/work/${esc(recent.id)}">
            <span class="pattern-title">${esc(recent.title)}</span>
            <span class="progress" aria-hidden="true"><span style="width:${pr.pct}%"></span></span>
            <span class="pattern-meta"><span>${pr.done} / ${pr.total} rounds</span><span>Next: Round ${pr.done + 1}</span></span>
          </a>
        </section>`;
            })()
          : ''
      }

      <section aria-label="Quick actions" class="quick-grid">
        <a class="quick quick-rose" href="#/create">${icons.plus}<span>New pattern</span></a>
        <a class="quick quick-butter" href="#/create?paste">${icons.paste}<span>Paste a pattern</span></a>
        <a class="quick quick-mint" href="#/saved">${icons.saved}<span>Saved patterns <small>${patterns.length}</small></span></a>
        <a class="quick quick-sky" href="/free-patterns/">${icons.yarn}<span>Free patterns</span></a>
      </section>

      <div id="install" class="card install-card" hidden></div>

      <section class="card learn-card" aria-labelledby="learn-h">
        <h2 id="learn-h">Learn &amp; explore</h2>
        <ul class="link-list" role="list">
          <li><a href="/crochet-abbreviations/"><span>Crochet abbreviations</span>${icons.forward}</a></li>
          <li><a href="/stitches/"><span>Stitch guides</span>${icons.forward}</a></li>
          <li><a href="/guides/how-to-read-a-crochet-pattern/"><span>How to read a pattern</span>${icons.forward}</a></li>
          <li><a href="/"><span>Crochet Tracker website</span>${icons.forward}</a></li>
        </ul>
      </section>
      ${patterns.length ? `<p class="fine-print">Last change ${formatDate(Math.max(...patterns.map((p) => p.updatedAt))).toLowerCase()}. Your patterns are stored only on this device.</p>` : '<p class="fine-print">Your patterns are stored only on this device – no account needed.</p>'}
    </div>`;

  const reminder = view.querySelector('#backup-reminder');
  reminder?.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'backup') {
      const count = await exportBackup();
      toast(`Backup saved: ${plural(count, 'pattern')}. Keep the file somewhere safe.`);
      reminder.remove();
    } else if (act === 'later') {
      snoozeReminder();
      reminder.remove();
      toast('OK, we will remind you next week');
    }
  });

  setupInstall(view.querySelector('#install'));
  const onInstallable = () => setupInstall(view.querySelector('#install'));
  document.addEventListener('installable', onInstallable);
  return () => document.removeEventListener('installable', onInstallable);
}

function setupInstall(box) {
  if (!box || isStandalone()) return;
  if (window.__installPrompt) {
    box.hidden = false;
    box.innerHTML = `<div><strong>Install the app</strong><p>Add Crochet Tracker to your home screen. It works offline.</p></div>
      <button class="btn btn-primary" type="button">${icons.download} Install</button>`;
    box.querySelector('button').addEventListener('click', async () => {
      const prompt = window.__installPrompt;
      window.__installPrompt = null;
      prompt.prompt();
      await prompt.userChoice;
      box.hidden = true;
    });
  } else if (isIos()) {
    box.hidden = false;
    box.innerHTML = `<div><strong>Add to Home Screen</strong><p>In Safari, tap the Share button, then “Add to Home Screen”. It works offline.</p></div>`;
  }
}
