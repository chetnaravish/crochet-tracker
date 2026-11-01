// Builds a pattern from a free-pattern article on the website and opens it in the app.
// The rounds are read straight from the page (single source of truth).
import { getPattern, savePattern } from './db.js';
import { createPattern, newRound } from './patterns.js';

export async function openFreePattern(article) {
  const id = `free-${article.dataset.pattern}`;
  // Re-opening keeps the user's existing progress.
  if (!(await getPattern(id))) {
    // Pattern pages built from data files carry their tracker steps as JSON;
    // the older inline patterns are read from their [data-round] list items.
    const data = article.querySelector('script[data-tracker]');
    const rounds = data
      ? JSON.parse(data.textContent).map((s) => newRound(s.text, s.stitches || ''))
      : [...article.querySelectorAll('[data-round]')].map((li) =>
          newRound(li.querySelector('.t').textContent.trim(), li.dataset.stitches || ''),
        );
    const pattern = createPattern({
      id,
      title: article.dataset.title,
      hook: article.dataset.hook,
      yarn: article.dataset.yarn,
      notes: article.dataset.notes,
      rounds,
    });
    await savePattern(pattern);
  }
  location.href = `/app/#/work/${encodeURIComponent(id)}`;
}
