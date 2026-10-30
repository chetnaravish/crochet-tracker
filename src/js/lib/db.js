// Tiny promise wrapper around IndexedDB. All patterns live in one object store.

const DB_NAME = 'crochet-tracker';
const DB_VERSION = 1;
const STORE = 'patterns';

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Database is blocked by another open tab.'));
    });
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

// Run `fn(store)` inside a transaction and resolve with its request result.
async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    const req = fn(store);
    if (req) req.onsuccess = () => (result = req.result);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

export const getAllPatterns = () => run('readonly', (s) => s.getAll());
export const getPattern = (id) => run('readonly', (s) => s.get(id));
export const savePattern = (pattern) => run('readwrite', (s) => s.put(pattern));
export const deletePattern = (id) => run('readwrite', (s) => s.delete(id));

export function savePatterns(patterns) {
  return run('readwrite', (s) => {
    for (const p of patterns) s.put(p);
  });
}
