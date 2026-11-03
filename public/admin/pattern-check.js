// Stitch count check for a pattern. Shared by the build (build/pattern-pages.js
// prints warnings) and the admin panel (/admin/ asks before saving).
// Plain JavaScript with no imports, so the browser can load it as it is.
//
// A round chart of type "ring" starts the count, "inc" must grow it by one stitch
// for every nth stitch, "even" keeps it the same, and "petals" uses 2 stitches per petal.

export function checkCounts(p) {
  const warnings = [];
  let prev = 0;
  for (const s of p.sections || []) {
    for (const r of s.rounds || []) {
      const c = r.chart;
      if (!c || !c.type) continue;
      const label = [p.slug, s.title, r.r].filter(Boolean).join(' ');
      if (c.type === 'ring') prev = c.count;
      else if (c.type === 'inc') {
        const n = c.every || 1; // inc in every nth stitch
        const want = prev + Math.floor(prev / n);
        if (prev && c.count !== want) warnings.push(`${label}: inc in every ${n === 1 ? '' : `${n}th `}stitch of ${prev} should give ${want}, not ${c.count}.`);
        prev = c.count;
      } else if (c.type === 'even') {
        if (prev && c.count !== prev) warnings.push(`${label}: one stitch in each of ${prev} should give ${prev}, not ${c.count}.`);
      } else if (c.type === 'petals') {
        if (prev && prev / 2 !== c.count) warnings.push(`${label}: ${prev} stitches make ${prev / 2} petals (petal + sl st), not ${c.count}.`);
      }
      if (r.count && /^\d+$/.test(r.count) && c.count && Number(r.count) !== c.count) {
        warnings.push(`${label}: written count (${r.count}) and chart count (${c.count}) don't match.`);
      }
    }
  }
  return warnings;
}

// Data saved by the admin panel can have empty strings, empty objects and
// "label + details" rows. Turn it into the shape the page builder expects.
export function normalizePattern(p) {
  const out = { ...p };
  out.materialsTable = (p.materialsTable || []).map((m) => (Array.isArray(m) ? m : [m.item || '', m.details || '']));
  out.sections = (p.sections || []).map((s) => ({
    ...s,
    rounds: (s.rounds || []).map((r) => {
      const round = { ...r, count: r.count == null ? '' : String(r.count) };
      const c = r.chart;
      if (!c || !c.type) delete round.chart;
      else round.chart = { ...c, count: Number(c.count) || 0, ...(c.every ? { every: Number(c.every) } : {}) };
      return round;
    }),
  }));
  return out;
}
