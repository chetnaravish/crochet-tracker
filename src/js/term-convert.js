// US ⇄ UK pattern line converter (guides/us-vs-uk-crochet-terms).
// Every stitch name is swapped in ONE pass (longest names first), so "dc" that was
// just made from "tr" is never converted a second time.
import { convertTerms } from './lib/terms.js';

const box = document.querySelector('[data-term-convert]');
if (box) {
  const input = box.querySelector('.tc-in');
  const out = box.querySelector('.tc-out');
  const from = box.querySelector('[data-tc-from]');
  const to = box.querySelector('[data-tc-to]');
  let dir = 'uk-us';

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const render = () => {
    const parts = convertTerms(input.value, dir);
    out.innerHTML = parts.map((p) => (p.changed ? `<mark title="was “${esc(p.was)}”">${esc(p.text)}</mark>` : esc(p.text))).join('') || '&nbsp;';
  };

  box.querySelectorAll('[data-dir]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.dir === dir) return;
      // Switching direction: carry the converted text over, so it reads as a round trip.
      input.value = convertTerms(input.value, dir).map((p) => p.text).join('');
      dir = b.dataset.dir;
      box.querySelectorAll('[data-dir]').forEach((x) => {
        x.classList.toggle('is-on', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
      from.textContent = dir === 'uk-us' ? 'UK' : 'US';
      to.textContent = dir === 'uk-us' ? 'US' : 'UK';
      render();
    }),
  );
  input.addEventListener('input', render);
  render();
}
