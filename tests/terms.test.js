import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertTerms } from '../src/js/lib/terms.js';

const conv = (t, d) => convertTerms(t, d).map((p) => p.text).join('');

test('UK to US shifts every stitch one step shorter, in one pass', () => {
  assert.equal(conv('R2: 2 dc in each st around, ss to join (24)', 'uk-us'), 'R2: 2 sc in each st around, sl st to join (24)');
  assert.equal(conv('(dc, 2 tr in next st) x6, miss 1 st', 'uk-us'), '(sc, 2 dc in next st) x6, skip 1 st');
  assert.equal(conv('htr, dtr, trtr, dc2tog', 'uk-us'), 'hdc, tr, dtr, sc2tog');
  assert.equal(conv('Double crochet and half treble', 'uk-us'), 'Single crochet and half double crochet');
});

test('US to UK shifts one step taller and leaves other words alone', () => {
  assert.equal(conv('R3: (sc, inc) x6, sl st to first sc (18)', 'us-uk'), 'R3: (dc, inc) x6, ss to first dc (18)');
  assert.equal(conv('2 DC in next st, skip across, sc2tog', 'us-uk'), '2 TR in next st, miss across, dc2tog');
  assert.equal(conv('missing scrap trace', 'us-uk'), 'missing scrap trace');
});
