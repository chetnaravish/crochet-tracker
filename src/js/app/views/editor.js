// Create / edit a pattern: details, round cards, abbreviation chips, repeat helper, paste parser.
import { getPattern, savePattern } from '../../lib/db.js';
import { createPattern, newRound, applyRepeat } from '../../lib/patterns.js';
import { parsePattern } from '../../lib/parse.js';
import { navigate, setLeaveGuard } from '../router.js';
import { esc, icons, toast, openDialog, confirmDialog, plural } from '../ui.js';

// [text inserted, accessible description]
const CHIPS = [
  ['mr', 'magic ring'],
  ['ch', 'chain'],
  ['sl st', 'slip stitch'],
  ['sc', 'single crochet'],
  ['hdc', 'half double crochet'],
  ['dc', 'double crochet'],
  ['tr', 'treble crochet'],
  ['inc', 'increase'],
  ['dec', 'decrease'],
  ['BLO', 'back loop only'],
  ['FLO', 'front loop only'],
  ['( ) x6', 'repeat group 6 times'],
  ['[ ]', 'square brackets'],
];

export async function renderEditor(view, id, { paste = false } = {}) {
  const existing = id ? await getPattern(id) : null;
  if (id && !existing) {
    view.innerHTML = notFound();
    return;
  }

  const draft = existing
    ? { ...existing, rounds: existing.rounds.map((r) => ({ ...r })) }
    : { title: '', hook: '', yarn: '', notes: '', rounds: [newRound()] };
  let dirty = false;
  const markDirty = () => (dirty = true);

  view.innerHTML = `
    <header class="topbar">
      <button type="button" class="icon-btn" data-act="back" aria-label="Back">${icons.back}</button>
      <h1 class="topbar-title">${existing ? 'Edit pattern' : 'New pattern'}</h1>
      <button type="submit" form="editor" class="btn btn-primary topbar-save">Save</button>
    </header>
    <form id="editor" class="page editor" novalidate>
      <div class="field">
        <label for="f-title">Title <span class="req">(required)</span></label>
        <input id="f-title" name="title" type="text" maxlength="200" autocomplete="off" enterkeyhint="next"
          placeholder="e.g. Little amigurumi bear" aria-describedby="title-err" value="${esc(draft.title)}">
        <p class="error-text" id="title-err" hidden>Please give your pattern a title.</p>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="f-hook">Hook size <span class="field-hint">(optional)</span></label>
          <input id="f-hook" name="hook" type="text" maxlength="100" autocomplete="off" placeholder="e.g. 3.5 mm" value="${esc(draft.hook)}">
        </div>
        <div class="field">
          <label for="f-yarn">Yarn <span class="field-hint">(optional)</span></label>
          <input id="f-yarn" name="yarn" type="text" maxlength="200" autocomplete="off" placeholder="e.g. Cotton DK, pink" value="${esc(draft.yarn)}">
        </div>
      </div>
      <div class="field">
        <label for="f-notes">Notes <span class="field-hint">(optional)</span></label>
        <textarea id="f-notes" name="notes" rows="2" placeholder="Gauge, stuffing tips, where you found the pattern…">${esc(draft.notes)}</textarea>
      </div>

      <section class="rounds-section" aria-labelledby="rounds-h">
        <div class="rounds-head">
          <h2 id="rounds-h">Rounds <span class="count" id="round-count"></span></h2>
        </div>
        <div class="rounds-tools">
          <button type="button" class="btn btn-outline" data-act="paste">${icons.paste} Paste full pattern</button>
          <button type="button" class="btn btn-outline" data-act="repeat">${icons.repeat} Repeat rounds</button>
        </div>
        <ol id="rounds" class="round-cards" role="list"></ol>
        <p class="error-text" id="rounds-err" hidden>Add instructions to at least one round.</p>
        <button type="button" class="btn btn-outline btn-block add-round" data-act="add">${icons.plus} Add Round</button>
      </section>

      <button type="submit" class="btn btn-primary btn-lg btn-block save-bottom">${icons.check} Save pattern</button>
    </form>
    <div class="chips-bar" role="toolbar" aria-label="Insert crochet abbreviation" hidden>
      <div class="chips-scroll">
        ${CHIPS.map(([t, label]) => `<button type="button" class="chip-btn" data-chip="${esc(t)}" aria-label="Insert ${esc(t)} (${esc(label)})">${esc(t)}</button>`).join('')}
      </div>
    </div>`;

  const form = view.querySelector('#editor');
  const list = view.querySelector('#rounds');
  const chipsBar = view.querySelector('.chips-bar');

  /* ----- Rounds rendering ----- */
  function drawRounds(focus) {
    view.querySelector('#round-count').textContent = `(${draft.rounds.length})`;
    list.innerHTML = draft.rounds
      .map((r, i) => {
        const n = i + 1;
        return `
        <li class="round-card" data-index="${i}">
          <div class="round-card-head">
            <h3 class="round-label" id="rl-${r.id}">Round ${n}</h3>
            <div class="round-actions">
              <button type="button" class="icon-btn" data-act="up" aria-label="Move round ${n} up" ${i === 0 ? 'disabled' : ''}>${icons.up}</button>
              <button type="button" class="icon-btn" data-act="down" aria-label="Move round ${n} down" ${i === draft.rounds.length - 1 ? 'disabled' : ''}>${icons.down}</button>
              <button type="button" class="icon-btn danger" data-act="delete" aria-label="Delete round ${n}">${icons.trash}</button>
            </div>
          </div>
          <label class="visually-hidden" for="rt-${r.id}">Round ${n} instructions</label>
          <textarea id="rt-${r.id}" class="round-text" data-field="text" rows="2" placeholder="${n === 1 ? 'e.g. 6 sc in mr' : 'e.g. (sc, inc) x6'}">${esc(r.text)}</textarea>
          <div class="stitch-field">
            <label for="rs-${r.id}">Stitch count</label>
            <input id="rs-${r.id}" data-field="stitches" type="text" maxlength="60" autocomplete="off" placeholder="e.g. ${6 * n} sts" value="${esc(r.stitches)}">
          </div>
        </li>`;
      })
      .join('');
    if (focus) list.querySelector(focus)?.focus();
  }

  list.addEventListener('input', (e) => {
    const field = e.target.dataset.field;
    if (!field) return;
    const i = Number(e.target.closest('[data-index]').dataset.index);
    draft.rounds[i][field] = e.target.value;
    markDirty();
  });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const i = Number(btn.closest('[data-index]').dataset.index);
    const act = btn.dataset.act;
    const rounds = draft.rounds;
    if (act === 'up' && i > 0) {
      [rounds[i - 1], rounds[i]] = [rounds[i], rounds[i - 1]];
      drawRounds(`[data-index="${i - 1}"] [data-act="${i - 1 === 0 ? 'down' : 'up'}"]`);
    } else if (act === 'down' && i < rounds.length - 1) {
      [rounds[i + 1], rounds[i]] = [rounds[i], rounds[i + 1]];
      drawRounds(`[data-index="${i + 1}"] [data-act="${i + 1 === rounds.length - 1 ? 'up' : 'down'}"]`);
    } else if (act === 'delete') {
      const [removed] = rounds.splice(i, 1);
      if (!rounds.length) rounds.push(newRound());
      drawRounds();
      toast(`Round ${i + 1} deleted`, {
        actionLabel: 'Undo',
        onAction: () => {
          if (rounds.length === 1 && !rounds[0].text && !rounds[0].stitches) rounds.length = 0;
          rounds.splice(i, 0, removed);
          drawRounds(`#rt-${removed.id}`);
        },
      });
    }
    markDirty();
  });

  /* ----- Toolbar actions ----- */
  view.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'back') return history.length > 1 ? history.back() : navigate('/');
    if (act === 'add') {
      draft.rounds.push(newRound());
      markDirty();
      drawRounds(`#rt-${draft.rounds.at(-1).id}`);
      list.lastElementChild.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    if (act === 'repeat') openRepeat();
    if (act === 'paste') openPaste();
  });

  form.addEventListener('input', (e) => {
    const name = e.target.name;
    if (name && name in draft) {
      draft[name] = e.target.value;
      markDirty();
      if (name === 'title') showError('title-err', false);
    }
  });
  // Pressing Enter in a single-line input must not save the form by accident.
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });

  function showError(idName, show) {
    const el = view.querySelector('#' + idName);
    el.hidden = !show;
    if (idName === 'title-err') view.querySelector('#f-title').setAttribute('aria-invalid', String(show));
  }

  async function save() {
    const title = draft.title.trim();
    const rounds = draft.rounds
      .map((r) => ({ ...r, text: r.text.trim(), stitches: r.stitches.trim() }))
      .filter((r) => r.text || r.stitches);
    showError('title-err', !title);
    showError('rounds-err', !rounds.length);
    if (!title) return view.querySelector('#f-title').focus();
    if (!rounds.length) return view.querySelector('.round-text')?.focus();

    const p = existing ? { ...existing } : createPattern();
    Object.assign(p, {
      title,
      hook: draft.hook.trim(),
      yarn: draft.yarn.trim(),
      notes: draft.notes.trim(),
      rounds,
      updatedAt: Date.now(),
    });
    p.done = Math.min(p.done, rounds.length);
    try {
      await savePattern(p);
    } catch (err) {
      console.error(err);
      return toast('Could not save – is storage full or blocked?');
    }
    dirty = false;
    toast(existing ? 'Changes saved' : 'Pattern saved! Happy crocheting 🧶');
    navigate(`/work/${p.id}`, { replace: true });
  }

  /* ----- Repeat helper ----- */
  async function openRepeat() {
    const count = draft.rounds.length;
    let result = null;
    await openDialog(
      `<form method="dialog" class="dialog-body" novalidate>
        <h2 class="dialog-title">Repeat rounds</h2>
        <p class="dialog-hint">Copy one round's instructions onto a range of rounds. Missing rounds are created for you.</p>
        <div class="repeat-sentence">
          <label for="rep-from">Rounds</label>
          <input id="rep-from" type="number" inputmode="numeric" min="1" value="${count + 1}">
          <label for="rep-to">to</label>
          <input id="rep-to" type="number" inputmode="numeric" min="1" value="${count + 3}">
          <label for="rep-src">are the same as Round</label>
          <input id="rep-src" type="number" inputmode="numeric" min="1" value="${count}">
        </div>
        <p class="error-text" role="alert" id="rep-err"></p>
        <div class="dialog-actions">
          <button class="btn btn-outline" value="">Cancel</button>
          <button class="btn btn-primary" value="ok" id="rep-apply">Apply</button>
        </div>
      </form>`,
      {
        onOpen(dlg) {
          // Enter in a number field should apply, not hit the first (Cancel) button.
          dlg.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
              e.preventDefault();
              dlg.querySelector('#rep-apply').click();
            }
          });
          dlg.querySelector('#rep-apply').addEventListener('click', (e) => {
            e.preventDefault();
            const v = (s) => dlg.querySelector(s).value;
            try {
              result = applyRepeat(draft.rounds, v('#rep-from'), v('#rep-to'), v('#rep-src'));
              dlg.close('ok');
            } catch (err) {
              dlg.querySelector('#rep-err').textContent = err.message;
            }
          });
        },
      },
    );
    if (!result) return;
    const added = result.length - draft.rounds.length;
    draft.rounds = result;
    markDirty();
    drawRounds();
    toast(added > 0 ? `Added ${plural(added, 'round')}` : 'Rounds updated');
  }

  /* ----- Paste full pattern ----- */
  async function openPaste() {
    let parsed = null;
    const hasRounds = draft.rounds.some((r) => r.text.trim());
    const choice = await openDialog(
      `<form method="dialog" class="dialog-body paste-dialog">
        <h2 class="dialog-title">Paste full pattern</h2>
        <p class="dialog-hint">Start each round on a new line with <b>R1</b>, <b>Rnd 1</b>, <b>Round 1</b> or <b>Row 1</b>. Ranges like <b>R3-5</b> become separate rounds.</p>
        <label for="paste-text">Pattern text</label>
        <textarea id="paste-text" rows="7" placeholder="R1: 6 sc in mr (6)&#10;R2: inc x6 (12)&#10;R3-5: sc around (12)"></textarea>
        <div class="paste-preview" id="paste-preview" aria-live="polite"></div>
        ${
          hasRounds
            ? `<fieldset class="paste-mode" hidden>
          <legend>Your current rounds</legend>
          <label><input type="radio" name="mode" value="replace" checked> Replace them</label>
          <label><input type="radio" name="mode" value="append"> Add after them</label>
        </fieldset>`
            : ''
        }
        <div class="dialog-actions">
          <button class="btn btn-outline" value="">Cancel</button>
          <button class="btn btn-primary" value="use" id="paste-use" disabled>Use rounds</button>
        </div>
      </form>`,
      {
        className: 'dialog-wide',
        onOpen(dlg) {
          const ta = dlg.querySelector('#paste-text');
          const preview = dlg.querySelector('#paste-preview');
          const useBtn = dlg.querySelector('#paste-use');
          const mode = dlg.querySelector('.paste-mode');
          const update = () => {
            if (!ta.value.trim()) {
              preview.innerHTML = '';
              useBtn.disabled = true;
              if (mode) mode.hidden = true;
              return;
            }
            parsed = parsePattern(ta.value);
            const n = parsed.rounds.length;
            useBtn.disabled = !n;
            useBtn.textContent = n ? `Use ${plural(n, 'round')}` : 'Use rounds';
            if (mode) mode.hidden = !n;
            preview.innerHTML = `
              <h3>Preview: ${plural(n, 'round')} found</h3>
              ${parsed.warnings.map((w) => `<p class="warn">⚠ ${esc(w)}</p>`).join('')}
              ${parsed.notes ? `<p class="preview-notes"><b>Notes:</b> ${esc(parsed.notes)}</p>` : ''}
              <ol class="preview-list" role="list">${parsed.rounds
                .map(
                  (r, i) =>
                    `<li><span class="pv-num">Round ${i + 1}</span><span class="pv-text">${esc(r.text) || '<em>(empty)</em>'}</span>${r.stitches ? `<span class="pv-sts">${esc(r.stitches)}</span>` : ''}</li>`,
                )
                .join('')}</ol>`;
          };
          let t;
          ta.addEventListener('input', () => {
            clearTimeout(t);
            t = setTimeout(update, 150);
          });
          ta.addEventListener('paste', () => setTimeout(update, 0));
          dlg.querySelector('form').addEventListener('submit', (e) => {
            if (e.submitter?.value === 'use') {
              e.preventDefault();
              dlg.close(dlg.querySelector('input[name="mode"]:checked')?.value || 'replace');
            }
          });
          setTimeout(() => ta.focus(), 50);
        },
      },
    );
    if (!parsed || !parsed.rounds.length || (choice !== 'replace' && choice !== 'append')) return;

    const rounds = parsed.rounds.map((r) => newRound(r.text, r.stitches));
    const keep = draft.rounds.filter((r) => r.text.trim() || r.stitches.trim());
    draft.rounds = choice === 'append' ? [...keep, ...rounds] : rounds;

    // Text before the first round: a short first line becomes the title (if empty), the rest goes to notes.
    let noteLines = parsed.notes ? parsed.notes.split('\n') : [];
    if (!draft.title.trim() && noteLines.length && noteLines[0].length <= 80) {
      draft.title = noteLines.shift();
      view.querySelector('#f-title').value = draft.title;
      showError('title-err', false);
    }
    if (noteLines.length) {
      draft.notes = [draft.notes.trim(), noteLines.join('\n')].filter(Boolean).join('\n');
      view.querySelector('#f-notes').value = draft.notes;
    }
    markDirty();
    drawRounds();
    toast(`${plural(rounds.length, 'round')} added from your pattern`);
  }

  /* ----- Abbreviation chips ----- */
  let target = null; // the textarea chips insert into
  const placeBar = () => {
    const vv = window.visualViewport;
    const keyboard = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    chipsBar.style.transform = `translateY(${-keyboard}px)`;
  };
  view.addEventListener('focusin', (e) => {
    if (e.target.matches('.round-text, #f-notes')) {
      target = e.target;
      chipsBar.hidden = false;
      document.body.classList.add('typing');
      placeBar();
    }
  });
  view.addEventListener('focusout', (e) => {
    if (chipsBar.contains(e.relatedTarget) || e.relatedTarget?.matches?.('.round-text, #f-notes')) return;
    chipsBar.hidden = true;
    document.body.classList.remove('typing');
  });
  // pointerdown + preventDefault keeps the textarea focused (and the keyboard open).
  chipsBar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-chip]')) e.preventDefault();
  });
  chipsBar.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]')?.dataset.chip;
    if (chip && target) insertChip(target, chip);
  });
  window.visualViewport?.addEventListener('resize', placeBar);
  window.visualViewport?.addEventListener('scroll', placeBar);

  /* ----- Unsaved changes guard ----- */
  setLeaveGuard(async () =>
    !dirty ||
    confirmDialog({
      title: 'Discard changes?',
      message: "You have changes that aren't saved yet.",
      confirmText: 'Discard',
      cancelText: 'Keep editing',
      danger: true,
    }),
  );
  const beforeUnload = (e) => {
    if (dirty) e.preventDefault();
  };
  window.addEventListener('beforeunload', beforeUnload);

  drawRounds();
  if (paste) openPaste();
  else if (!existing) view.querySelector('#f-title').focus({ preventScroll: true });

  return () => {
    window.removeEventListener('beforeunload', beforeUnload);
    window.visualViewport?.removeEventListener('resize', placeBar);
    window.visualViewport?.removeEventListener('scroll', placeBar);
    document.body.classList.remove('typing');
  };
}

// Insert an abbreviation at the cursor, adding spaces where needed.
export function insertChip(ta, chip) {
  const { selectionStart: s, selectionEnd: e, value: v } = ta;
  const selected = v.slice(s, e);
  let text;
  let caret;
  if (chip === '( ) x6') {
    text = `(${selected}) x6`;
    caret = selected ? text.length : 1;
  } else if (chip === '[ ]') {
    text = `[${selected}]`;
    caret = selected ? text.length : 1;
  } else {
    text = chip;
    caret = text.length;
  }
  const before = v.slice(0, s);
  const after = v.slice(e);
  if (before && !/[\s([]$/.test(before)) {
    text = ' ' + text;
    caret += 1;
  }
  if (caret === text.length && !/^[\s,)\]]/.test(after)) {
    text += ' ';
    caret += 1;
  }
  ta.focus();
  ta.setRangeText(text, s, e, 'end');
  ta.selectionStart = ta.selectionEnd = s + caret;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

const notFound = () => `
  <header class="topbar"><a class="icon-btn" href="#/saved" aria-label="Back">${icons.back}</a><h1 class="topbar-title">Not found</h1><span></span></header>
  <div class="page empty"><h2>Pattern not found</h2><p>It may have been deleted.</p><a class="btn btn-primary" href="#/saved">Go to saved patterns</a></div>`;
