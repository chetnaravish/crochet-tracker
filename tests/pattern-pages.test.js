import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCounts, trackerSteps, loadPatterns, renderPattern } from '../build/pattern-pages.js';
import { roundChart } from '../build/drawings.js';

const base = (rounds) => ({ slug: 't', sections: [{ title: 'Body', rounds }] });

test('stitch count check accepts a correct pattern', () => {
  const p = base([
    { r: 'R1', count: '6', chart: { type: 'ring', sym: 'sc', count: 6 } },
    { r: 'R2', count: '12', chart: { type: 'inc', sym: 'sc', count: 12 } },
    { r: 'R3', count: '6 petals', chart: { type: 'petals', count: 6 } },
  ]);
  assert.deepEqual(checkCounts(p), []);
});

test('stitch count check warns about a wrong increase round', () => {
  const p = base([
    { r: 'R1', count: '6', chart: { type: 'ring', sym: 'sc', count: 6 } },
    { r: 'R2', count: '14', chart: { type: 'inc', sym: 'sc', count: 14 } },
  ]);
  assert.equal(checkCounts(p).length, 1);
});

test('tracker steps repeat sections marked "make 2"', () => {
  const p = { sections: [{ title: 'Centre', make: 2, rounds: [{ r: 'R1', text: '6 sc in MR', count: '6' }] }] };
  assert.deepEqual(trackerSteps(p), [
    { text: 'Centre 1, R1: 6 sc in MR', stitches: '6 sts' },
    { text: 'Centre 2, R1: 6 sc in MR', stitches: '6 sts' },
  ]);
});

test('every pattern data file renders and passes the count check', () => {
  for (const p of loadPatterns()) {
    assert.deepEqual(checkCounts(p), [], p.slug);
    const html = renderPattern(p);
    assert.match(html, /data-tracker/);
    assert.match(html, /id="pattern"/);
  }
});

test('round chart draws one symbol per stitch', () => {
  const svg = roundChart([
    { chart: { type: 'ring', sym: 'sc', count: 6 } },
    { chart: { type: 'inc', sym: 'sc', count: 12 } },
  ]);
  assert.equal((svg.match(/<g class="sym /g) || []).length, 18);
});
