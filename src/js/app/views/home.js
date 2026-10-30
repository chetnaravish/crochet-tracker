// Home: continue the last pattern, quick actions, install hint.
import { getAllPatterns } from '../../lib/db.js';
import { progressOf } from '../../lib/patterns.js';
import { esc, icons, formatDate } from '../ui.js';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export async function renderHome(view) {
  const patterns = await getAllPatterns();
  const recent = patterns
    .filter((p) => !progressOf(p).complete)
    .sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt))[0];

  view.innerHTML = `
    <header class="topbar">
      <div class="brand"><span class="brand-mark">${icons.yarn}</span><span>Crochet Tracker</span></div>
      <a class="icon-btn" href="#/settings" aria-label="Settings">${icons.settings}</a>
    </header>
    <div class="page">
      <h1 class="page-title">Hello, crocheter!</h1>
      <p class="lead">Write a pattern once, then tick off each round as you go.</p>

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

      <p class="home-links">
        <a href="/crochet-abbreviations/">Abbreviations</a> ·
        <a href="/stitches/">Stitch guides</a> ·
        <a href="/guides/how-to-read-a-crochet-pattern/">How to read a pattern</a>
      </p>
      ${patterns.length ? `<p class="fine-print">Last change ${formatDate(Math.max(...patterns.map((p) => p.updatedAt))).toLowerCase()}. Your patterns are stored only on this device.</p>` : '<p class="fine-print">Your patterns are stored only on this device – no account needed.</p>'}
    </div>`;

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
