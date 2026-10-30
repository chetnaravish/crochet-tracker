import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchEntries } from '../src/js/lib/search.js';

const entries = [
  { u: '/stitches/magic-ring/', t: 'How to Crochet: Magic Ring', d: 'Start amigurumi in the round.', k: 'Stitch', h: 'Step by step', x: 'pull the tail' },
  { u: '/crochet-abbreviations/?q=FLO', t: 'FLO – Front loop only', d: 'UK: Front loop only.', k: 'Abbreviation', a: 'FLO' },
  { u: '/crochet-abbreviations/', t: 'Crochet Abbreviations', d: 'US and UK terms, FLO, BLO and more.', k: 'Glossary', x: 'FLO front loop only' },
];

test('exact abbreviation ranks first', () => {
  assert.equal(searchEntries(entries, 'flo')[0].u, '/crochet-abbreviations/?q=FLO');
});

test('all words must match', () => {
  assert.deepEqual(searchEntries(entries, 'magic ring').map((e) => e.u), ['/stitches/magic-ring/']);
  assert.equal(searchEntries(entries, 'magic banana').length, 0);
});

test('empty query returns nothing', () => {
  assert.equal(searchEntries(entries, '   ').length, 0);
});
