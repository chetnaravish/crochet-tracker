import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePattern, extractStitches } from '../src/js/lib/parse.js';
import { applyRepeat, newRound, readBackup, makeBackup, createPattern } from '../src/js/lib/patterns.js';

test('parses common heading styles and stitch counts', () => {
  const { rounds, notes, warnings } = parsePattern(`Cute ball
Use a 3.5 mm hook.

R1: 6 sc in mr (6)
Rnd 2: inc x6 (12)
Round 3: (sc, inc) x6 [18 sts]
Row 4 - (2 sc, inc) x6 = 24 sts`);
  assert.equal(notes, 'Cute ball\nUse a 3.5 mm hook.');
  assert.deepEqual(
    rounds.map((r) => [r.number, r.text, r.stitches]),
    [
      [1, '6 sc in mr', '6 sts'],
      [2, 'inc x6', '12 sts'],
      [3, '(sc, inc) x6', '18 sts'],
      [4, '(2 sc, inc) x6', '24 sts'],
    ],
  );
  assert.deepEqual(warnings, []);
});

test('expands ranges like R3-5, Rnds 6 to 8 and "R9 - 10:"', () => {
  const { rounds } = parsePattern('R1: 6 sc in mr\nR2: inc x6\nR3-5: sc around (12)\nRnds 6 to 8 sc around\nR9 - 10: dec x6 (6)');
  assert.deepEqual(rounds.map((r) => r.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(rounds[3].text, 'sc around');
  assert.equal(rounds[3].stitches, '12 sts');
  assert.equal(rounds[9].text, 'dec x6');
});

test('a spaced dash followed by text is not a range', () => {
  const { rounds } = parsePattern('R1 - 6 sc in mr\nR2 - inc x6');
  assert.deepEqual(rounds.map((r) => [r.number, r.text]), [[1, '6 sc in mr'], [2, 'inc x6']]);
});

test('joins continuation lines and warns about gaps', () => {
  const { rounds, warnings } = parsePattern('R1: 6 sc in mr\nPull the ring tight.\nR3: inc x6');
  assert.equal(rounds[0].text, '6 sc in mr\nPull the ring tight.');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Round 2/);
});

test('falls back to numbered lines when no headings exist', () => {
  const { rounds } = parsePattern('1. 6 sc in mr (6)\n2. inc x6 (12)');
  assert.deepEqual(rounds.map((r) => [r.number, r.text, r.stitches]), [[1, '6 sc in mr', '6 sts'], [2, 'inc x6', '12 sts']]);
});

test('empty input gives a helpful warning', () => {
  const { rounds, warnings } = parsePattern('just some words');
  assert.equal(rounds.length, 0);
  assert.equal(warnings.length, 1);
});

test('extractStitches leaves "x6" alone', () => {
  assert.deepEqual(extractStitches('(sc, inc) x6'), { text: '(sc, inc) x6', stitches: '' });
});

test('applyRepeat copies a round onto a range and validates input', () => {
  const rounds = [newRound('a', '6 sts'), newRound('b', '12 sts'), newRound('c', '18 sts')];
  const next = applyRepeat(rounds, 4, 6, 3);
  assert.equal(next.length, 6);
  assert.deepEqual(next.slice(3).map((r) => r.text), ['c', 'c', 'c']);
  assert.notEqual(next[3].id, rounds[2].id);
  assert.throws(() => applyRepeat(rounds, 6, 7, 1), /gaps/);
  assert.throws(() => applyRepeat(rounds, 2, 3, 2), /itself/);
  assert.throws(() => applyRepeat(rounds, 4, 5, 9), /doesn't exist/);
});

test('backup round-trip keeps patterns and rejects junk', () => {
  const p = createPattern({ title: 'Coaster', rounds: [newRound('ch 3')] });
  p.done = 5; // out of range – should be clamped
  const [back] = readBackup(JSON.parse(JSON.stringify(makeBackup([p]))));
  assert.equal(back.title, 'Coaster');
  assert.equal(back.done, 1);
  assert.throws(() => readBackup({ hello: 1 }), /isn't a Crochet Tracker backup/);
});
