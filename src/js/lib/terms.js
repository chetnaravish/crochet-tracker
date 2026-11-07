// US ⇄ UK crochet term conversion. Returns the text as parts so changed words can be
// highlighted: [{ text, changed, was }].
const US_TO_UK = {
  'half double crochet': 'half treble',
  'single crochet': 'double crochet',
  'double crochet': 'treble',
  'treble crochet': 'double treble',
  'triple crochet': 'double treble',
  'double treble': 'triple treble',
  'yarn over': 'yarn over hook',
  sc2tog: 'dc2tog',
  hdc2tog: 'htr2tog',
  dc2tog: 'tr2tog',
  tr2tog: 'dtr2tog',
  'sl st': 'ss',
  slst: 'ss',
  hdc: 'htr',
  dtr: 'trtr',
  sc: 'dc',
  dc: 'tr',
  tr: 'dtr',
  skip: 'miss',
  gauge: 'tension',
  yo: 'yoh',
};

const UK_TO_US = {
  'half treble crochet': 'half double crochet',
  'half treble': 'half double crochet',
  'double crochet': 'single crochet',
  'triple treble': 'double treble',
  'double treble': 'treble crochet',
  'treble crochet': 'double crochet',
  treble: 'double crochet',
  'yarn over hook': 'yarn over',
  dc2tog: 'sc2tog',
  htr2tog: 'hdc2tog',
  tr2tog: 'dc2tog',
  dtr2tog: 'tr2tog',
  trtr: 'dtr',
  htr: 'hdc',
  dtr: 'tr',
  dc: 'sc',
  tr: 'dc',
  ss: 'sl st',
  miss: 'skip',
  tension: 'gauge',
  yoh: 'yo',
};

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
const build = (map) => {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  // Not part of a longer word: no letter before, no letter/digit after.
  return new RegExp(`(?<![A-Za-z])(${keys.map(escRe).join('|')})(?![A-Za-z0-9])`, 'gi');
};
const TABLES = {
  'us-uk': { map: US_TO_UK, re: build(US_TO_UK) },
  'uk-us': { map: UK_TO_US, re: build(UK_TO_US) },
};

// Keep the writer's style: "DC" stays upper case, "Double crochet" keeps its capital.
function matchCase(word, was) {
  if (was.length > 1 && was === was.toUpperCase()) return word.toUpperCase();
  if (was[0] === was[0].toUpperCase() && was[0] !== was[0].toLowerCase()) return word[0].toUpperCase() + word.slice(1);
  return word;
}

export function convertTerms(text, dir) {
  const { map, re } = TABLES[dir];
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const key = m[0].toLowerCase().replace(/\s+/g, ' ');
    if (!(key in map)) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index), changed: false });
    parts.push({ text: matchCase(map[key], m[0]), changed: true, was: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), changed: false });
  return parts;
}
