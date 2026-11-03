// Stitch popup on pattern pages. Tapping a stitch word (sc, inc, MR…) in the pattern
// shows its name, the UK name, one line on how it's made, a small drawing and a
// "Full lesson" button, without leaving the pattern.
//   Phone / narrow screens: a sheet that slides up from the bottom.
//   Desktop: a small card under the word; it also opens on hover and keyboard.
// The words are normal links (built in build/pattern-pages.js), so without
// JavaScript, or with Ctrl/Cmd-click, they just open the lesson.

export function initStitchPop(dataEl) {
  let info;
  try {
    info = JSON.parse(dataEl.textContent);
  } catch {
    return;
  }

  const sheetMq = matchMedia('(max-width: 719px)');
  const hoverMq = matchMedia('(hover: hover) and (pointer: fine)');

  const back = document.createElement('div');
  back.className = 'st-pop-back';
  back.hidden = true;

  const pop = document.createElement('div');
  pop.className = 'st-pop';
  pop.hidden = true;
  pop.tabIndex = -1;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-labelledby', 'st-pop-h');
  pop.innerHTML = `
    <button type="button" class="st-pop-x" aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <div class="st-pop-fig" aria-hidden="true"></div>
    <div class="st-pop-body">
      <p class="st-pop-ab"><span class="ab"></span><small></small></p>
      <h2 id="st-pop-h"></h2>
      <p class="st-pop-line"></p>
      <a class="btn btn-primary st-pop-go" href="/stitches/">Full lesson <span aria-hidden="true">→</span></a>
    </div>`;
  document.body.append(back, pop);

  const $ = (sel) => pop.querySelector(sel);
  let current = null; // the word link the popup belongs to
  let byHover = false;
  let openTimer = 0;
  let closeTimer = 0;

  function fill(key, word) {
    const d = info[key];
    $('.st-pop-ab .ab').textContent = word;
    $('.st-pop-ab small').textContent = d.uk || '';
    $('#st-pop-h').textContent = d.name;
    $('.st-pop-line').textContent = d.line;
    $('.st-pop-fig').innerHTML = d.svg; // built at build time from our own drawings
    $('.st-pop-go').href = d.url;
  }

  // Desktop: place the card just under the word (or above if there's no room).
  function place(link) {
    if (sheetMq.matches) {
      pop.style.left = pop.style.top = '';
      return;
    }
    const r = link.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12);
    const below = r.bottom + 10;
    const top = below + h > innerHeight - 8 && r.top - h - 10 > 8 ? r.top - h - 10 : below;
    pop.style.left = `${left + scrollX}px`;
    pop.style.top = `${top + scrollY}px`;
    pop.classList.toggle('is-above', top < r.top);
  }

  function open(link, { hover = false, focus = false } = {}) {
    clearTimeout(closeTimer);
    if (current === link && !pop.hidden) {
      if (!hover) byHover = false;
      return;
    }
    if (current) current.removeAttribute('aria-expanded');
    current = link;
    byHover = hover;
    fill(link.dataset.st, link.textContent);
    link.setAttribute('aria-expanded', 'true');
    pop.classList.toggle('is-sheet', sheetMq.matches);
    pop.hidden = false;
    back.hidden = !sheetMq.matches;
    place(link);
    // Restart the entry animation.
    pop.classList.remove('is-in');
    void pop.offsetWidth;
    pop.classList.add('is-in');
    if (focus || sheetMq.matches) pop.focus({ preventScroll: true });
  }

  function close({ returnFocus = false } = {}) {
    clearTimeout(openTimer);
    if (pop.hidden) return;
    pop.hidden = true;
    back.hidden = true;
    const link = current;
    current = null;
    link?.removeAttribute('aria-expanded');
    if (returnFocus) link?.focus({ preventScroll: true });
  }

  const wordFrom = (target) => target.closest?.('a.ab[data-st]');

  document.addEventListener('click', (e) => {
    const link = wordFrom(e.target);
    if (link && info[link.dataset.st]) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      // A second tap on the same word closes it (unless it was only hover-opened).
      if (current === link && !pop.hidden && !byHover) close();
      else open(link, { focus: e.detail === 0 }); // detail 0 = keyboard Enter
      return;
    }
    if (!pop.hidden && !pop.contains(e.target)) close();
  });

  back.addEventListener('click', () => close());
  $('.st-pop-x').addEventListener('click', () => close({ returnFocus: true }));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) {
      e.preventDefault();
      close({ returnFocus: true });
    }
  });

  // Keep keyboard focus inside the card while it's open from the keyboard: Tab past
  // the last button goes back to the word in the pattern.
  pop.addEventListener('focusout', (e) => {
    if (!pop.hidden && e.relatedTarget && !pop.contains(e.relatedTarget) && !wordFrom(e.relatedTarget)) close();
  });

  // Desktop hover: open after a short pause, close when the mouse leaves both.
  if (hoverMq.matches) {
    document.addEventListener('mouseover', (e) => {
      const link = wordFrom(e.target);
      if (link && info[link.dataset.st]) {
        clearTimeout(closeTimer);
        clearTimeout(openTimer);
        if (current !== link || pop.hidden) openTimer = setTimeout(() => open(link, { hover: true }), 320);
      } else if (pop.contains(e.target)) {
        clearTimeout(closeTimer);
      }
    });
    document.addEventListener('mouseout', (e) => {
      const from = wordFrom(e.target) || (pop.contains(e.target) ? pop : null);
      if (!from) return;
      clearTimeout(openTimer);
      const to = e.relatedTarget;
      if (to && (pop.contains(to) || (current && current.contains(to)))) return;
      if (byHover) closeTimer = setTimeout(() => close(), 260);
    });
  }

  // Keep the card next to its word if the window changes size; the sheet stays put.
  addEventListener('resize', () => {
    if (!current || pop.hidden) return;
    const sheet = sheetMq.matches;
    pop.classList.toggle('is-sheet', sheet);
    back.hidden = !sheet;
    place(current);
  });
}
