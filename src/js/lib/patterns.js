// Pattern data model helpers. Pure functions – no DOM, no storage – so they are easy to test.
//
// Pattern shape:
// {
//   id, title, hook, yarn, notes,
//   rounds: [{ id, text, stitches }],
//   done: number,          // how many rounds (from the start) are completed
//   stitchCount: number,   // live stitch counter for the current round
//   createdAt, updatedAt, lastOpenedAt   // epoch ms (lastOpenedAt may be null)
// }

export const BACKUP_FORMAT = 'crochet-tracker-backup';
export const BACKUP_VERSION = 1;

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const newRound = (text = '', stitches = '') => ({ id: uid(), text, stitches });

export function createPattern(fields = {}) {
  const now = Date.now();
  return {
    id: fields.id || uid(),
    title: fields.title || '',
    hook: fields.hook || '',
    yarn: fields.yarn || '',
    notes: fields.notes || '',
    rounds: fields.rounds || [newRound()],
    done: 0,
    stitchCount: 0,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
  };
}

export function progressOf(p) {
  const total = p.rounds.length;
  const done = Math.min(p.done || 0, total);
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, complete: total > 0 && done >= total };
}

export function duplicatePattern(p) {
  const copy = createPattern({
    title: `${p.title} (copy)`,
    hook: p.hook,
    yarn: p.yarn,
    notes: p.notes,
    rounds: p.rounds.map((r) => newRound(r.text, r.stitches)),
  });
  return copy;
}

/**
 * "Rounds `from` to `to` are the same as Round `source`" (1-based numbers).
 * Overwrites or appends rounds as needed and returns a new rounds array.
 * Throws an Error with a user-friendly message when the input is invalid.
 */
export function applyRepeat(rounds, from, to, source) {
  const [f, t, s] = [from, to, source].map(Number);
  if (![f, t, s].every((n) => Number.isInteger(n) && n > 0)) throw new Error('Please enter whole round numbers.');
  if (t < f) throw new Error('"To" must be the same as or bigger than "From".');
  if (s > rounds.length) throw new Error(`Round ${s} doesn't exist yet.`);
  if (s >= f && s <= t) throw new Error(`Round ${s} can't be copied onto itself.`);
  if (f > rounds.length + 1) throw new Error(`Add rounds up to ${f - 1} first, so there are no gaps.`);
  if (t - f > 199) throw new Error('That is a lot of rounds! Please repeat at most 200 at a time.');

  const src = rounds[s - 1];
  const next = rounds.slice();
  for (let n = f; n <= t; n++) next[n - 1] = newRound(src.text, src.stitches);
  return next;
}

// Validate/clean one pattern coming from a backup file. Returns null if unusable.
export function sanitizePattern(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const str = (v, max = 5000) => (typeof v === 'string' ? v.slice(0, max) : '');
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const title = str(raw.title, 200).trim();
  if (!title || !Array.isArray(raw.rounds)) return null;
  const rounds = raw.rounds
    .filter((r) => r && typeof r === 'object')
    .slice(0, 2000)
    .map((r) => ({ id: str(r.id, 64) || uid(), text: str(r.text), stitches: str(r.stitches, 60) }));
  const now = Date.now();
  return {
    id: str(raw.id, 64) || uid(),
    title,
    hook: str(raw.hook, 100),
    yarn: str(raw.yarn, 200),
    notes: str(raw.notes, 20000),
    rounds,
    done: Math.max(0, Math.min(Math.floor(num(raw.done)), rounds.length)),
    stitchCount: Math.max(0, Math.floor(num(raw.stitchCount))),
    createdAt: num(raw.createdAt, now),
    updatedAt: num(raw.updatedAt, now),
    lastOpenedAt: Number.isFinite(raw.lastOpenedAt) ? raw.lastOpenedAt : null,
  };
}

export function makeBackup(patterns) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), patterns };
}

// Accepts our backup object (or a bare array of patterns). Returns clean patterns.
export function readBackup(data) {
  const list = Array.isArray(data) ? data : data?.format === BACKUP_FORMAT ? data.patterns : null;
  if (!Array.isArray(list)) throw new Error("This file isn't a Crochet Tracker backup.");
  const patterns = list.map(sanitizePattern).filter(Boolean);
  if (list.length && !patterns.length) throw new Error('No valid patterns were found in this file.');
  return patterns;
}
