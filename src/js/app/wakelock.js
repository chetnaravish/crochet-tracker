// Keeps the screen on while following a pattern (Screen Wake Lock API).
// The browser drops the lock when the tab is hidden, so we re-acquire it on return.
// Browsers without support simply keep their normal screen timeout.

let sentinel = null;
let wanted = false;
let onChange = () => {};

export const wakeLockSupported = () => 'wakeLock' in navigator;

async function acquire() {
  if (!wanted || !wakeLockSupported() || document.visibilityState !== 'visible') return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    onChange(true);
    sentinel.addEventListener('release', () => {
      sentinel = null;
      onChange(false);
    });
  } catch {
    onChange(false); // e.g. battery saver mode or permission policy
  }
}

const onVisibility = () => {
  if (document.visibilityState === 'visible' && !sentinel) acquire();
};

export function keepScreenOn(listener = () => {}) {
  wanted = true;
  onChange = listener;
  document.addEventListener('visibilitychange', onVisibility);
  acquire();
}

export function releaseScreen() {
  wanted = false;
  onChange = () => {};
  document.removeEventListener('visibilitychange', onVisibility);
  sentinel?.release().catch(() => {});
  sentinel = null;
}
