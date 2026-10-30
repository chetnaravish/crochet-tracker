// Shared UI helpers for the app: escaping, icons, toasts, dialogs, dates.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const svg = (body) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  saved: svg('<path d="M6 3h12v18l-6-4-6 4z"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  forward: svg('<path d="m9 18 6-6-6-6"/>'),
  shield: svg('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  focus: svg('<circle cx="12" cy="12" r="3"/><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>'),
  more: svg('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
  up: svg('<path d="m6 15 6-6 6 6"/>'),
  down: svg('<path d="m6 9 6 6 6-6"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  paste: svg('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>'),
  repeat: svg('<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  upload: svg('<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>'),
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  yarn: svg('<circle cx="12" cy="12" r="9"/><path d="M5 7c4 1 9 5 11 13M9 3.5c2 3 6 6 11.5 6.5M3.5 13c4 0 8 2.5 9.5 7.8"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
};

/* ---------- Toasts ---------- */
let toastTimer;
export function toast(message, { actionLabel, onAction, duration = 3500 } = {}) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.innerHTML = `<span>${esc(message)}</span>${actionLabel ? `<button type="button" class="toast-action">${esc(actionLabel)}</button>` : ''}`;
  el.hidden = false;
  el.classList.remove('show');
  void el.offsetWidth; // restart animation
  el.classList.add('show');
  if (actionLabel) {
    el.querySelector('.toast-action').addEventListener('click', () => {
      hideToast();
      onAction?.();
    });
  }
  toastTimer = setTimeout(hideToast, actionLabel ? duration + 2500 : duration);
}
function hideToast() {
  const el = document.getElementById('toast');
  el.classList.remove('show');
  toastTimer = setTimeout(() => (el.hidden = true), 250);
}

/* ---------- Dialogs ---------- */
// Opens a <dialog> with the given inner HTML and resolves with its returnValue when closed.
export function openDialog(innerHtml, { className = '', onOpen } = {}) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = `dialog ${className}`;
    dlg.innerHTML = innerHtml;
    document.body.append(dlg);
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue);
      dlg.remove();
    });
    // Tap on the backdrop closes the dialog.
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close('');
    });
    dlg.showModal();
    onOpen?.(dlg);
  });
}

export async function confirmDialog({ title, message = '', confirmText = 'OK', cancelText = 'Cancel', danger = false }) {
  const result = await openDialog(`
    <form method="dialog" class="dialog-body">
      <h2 class="dialog-title">${esc(title)}</h2>
      ${message ? `<p>${esc(message)}</p>` : ''}
      <div class="dialog-actions">
        <button class="btn btn-outline" value="cancel">${esc(cancelText)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" value="ok" autofocus>${esc(confirmText)}</button>
      </div>
    </form>`);
  return result === 'ok';
}

// Bottom sheet with a list of actions. Resolves with the chosen action id (or '').
export function actionSheet(title, actions) {
  return openDialog(
    `<form method="dialog" class="dialog-body">
      <h2 class="dialog-title sheet-title">${esc(title)}</h2>
      <div class="sheet-actions">
        ${actions
          .map(
            (a) =>
              `<button class="sheet-action${a.danger ? ' danger' : ''}" value="${esc(a.id)}">${icons[a.icon] || ''}<span>${esc(a.label)}</span></button>`,
          )
          .join('')}
        <button class="sheet-action cancel" value="">Cancel</button>
      </div>
    </form>`,
    { className: 'sheet' },
  );
}

/* ---------- Formatting ---------- */
export function formatDate(ts) {
  if (!ts) return 'Never';
  const d = new Date(ts);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Light haptic tap where supported (Android). Silently ignored elsewhere.
export const buzz = (ms = 12) => navigator.vibrate?.(ms);
