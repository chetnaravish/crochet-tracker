// Backup export + "please back up" reminder logic.
import { getAllPatterns } from '../lib/db.js';
import { makeBackup } from '../lib/patterns.js';
import { getSettings, setSetting } from '../lib/settings.js';

const DAY = 86400000;
const REMIND_AFTER = 14 * DAY; // since the last backup
const SNOOZE = 7 * DAY; // after tapping "Later"

// Downloads all patterns as a JSON file. Returns how many were exported.
export async function exportBackup() {
  const patterns = await getAllPatterns();
  if (!patterns.length) return 0;
  const blob = new Blob([JSON.stringify(makeBackup(patterns), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crochet-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setSetting('lastBackupAt', Date.now());
  return patterns.length;
}

/**
 * Remind when there is something worth saving that isn't in a backup yet:
 * patterns changed since the last backup, and either there has never been a backup
 * (and the user has real work: 2+ patterns or some progress) or it's 14+ days old.
 */
export function shouldRemind(patterns, now = Date.now()) {
  const { lastBackupAt, backupSnoozedAt } = getSettings();
  if (!patterns.length) return false;
  if (backupSnoozedAt && now - backupSnoozedAt < SNOOZE) return false;
  const lastChange = Math.max(...patterns.map((p) => p.updatedAt || 0));
  if (lastBackupAt && lastChange <= lastBackupAt) return false;
  if (!lastBackupAt) return patterns.length >= 2 || patterns.some((p) => p.done > 0);
  return now - lastBackupAt >= REMIND_AFTER;
}

export const snoozeReminder = () => setSetting('backupSnoozedAt', Date.now());
