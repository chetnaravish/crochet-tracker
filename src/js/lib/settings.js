// Small per-device preferences (text size, focus mode). Kept in localStorage so they can be
// applied synchronously before the first paint. Pattern data itself lives in IndexedDB.

const KEY = 'ct-settings';
const DEFAULTS = { textSize: 'normal', focusMode: false, lastBackupAt: null, backupSnoozedAt: null };
export const TEXT_SIZES = ['normal', 'large', 'xlarge'];

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setSetting(name, value) {
  const next = { ...getSettings(), [name]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / storage full – setting just won't persist */
  }
  applySettings(next);
  return next;
}

export function applySettings(s = getSettings()) {
  document.documentElement.dataset.textSize = TEXT_SIZES.includes(s.textSize) ? s.textSize : 'normal';
}
