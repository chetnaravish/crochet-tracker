// Turns a pasted, free-form crochet pattern into separate rounds.
//
// Recognised round headings (case-insensitive):
//   R1, R 1, Rnd 1, Rnds 3-5, Rd 2, Round 1, Rounds 6 to 8, Row 1, Rows 2–4, R3-5, R3 & 4
// If no headings are found at all, numbered lines like "1. ..." or "2: ..." are used instead.
// Lines without a heading are joined onto the previous round; lines before the first
// round become notes. A trailing stitch count such as "(12)", "[18 sts]" or "= 24 sts"
// is moved into the round's stitch-count field.

const HEADING = /^\s*(?:rounds?|rnds?|rds?|rows?|r)\.?\s*(\d+)/i;
const NUMBERED = /^\s*(\d+)\s*[.:)]\s+/;
const MAX_RANGE = 200;

// Works out whether the text after "R3" continues with a range ("-5", " to 5", " - 5:").
function readRange(rest) {
  const tight = rest.match(/^\s?[-–—~](\d+)/); // R3-5, R3 -5
  const word = rest.match(/^\s+(?:to|thru|through|and|&)\s+(\d+)/i); // R3 to 5
  // A spaced dash is only a range when a separator follows: "R3 - 5: sc around".
  // Otherwise "R1 - 6 sc in mr" would wrongly become rounds 1 to 6.
  const loose = rest.match(/^\s*[-–—]\s*(\d+)(?=\s*(?:[:.)\]]|$))/);
  const m = tight || word || loose;
  return m ? { end: Number(m[1]), length: m[0].length } : null;
}

const cleanText = (s) => s.replace(/^\s*[:.)\]\-–—]+\s*/, '').trim();

// Pull a trailing stitch count off the end of the text.
export function extractStitches(text) {
  const patterns = [
    /\s*[([]\s*(\d+)\s*(?:sts?|stitches)?\s*[)\]]\s*\.?\s*$/i, // (12)  [18 sts]
    /\s*[-–—=]\s*(\d+)\s*(?:sts?|stitches)?\s*\.?\s*$/i, // = 24  – 24 sts
    /\s+(\d+)\s+(?:sts|stitches)\s*\.?\s*$/i, // ... 30 sts
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m.index > 0) return { text: text.slice(0, m.index).trim(), stitches: `${m[1]} sts` };
  }
  return { text: text.trim(), stitches: '' };
}

/**
 * @param {string} input
 * @returns {{ rounds: {number:number, label:string, text:string, stitches:string}[], notes: string, warnings: string[] }}
 */
export function parsePattern(input) {
  const lines = String(input || '').replace(/\r\n?/g, '\n').split('\n');
  const useNumbered = !lines.some((l) => HEADING.test(l));
  const blocks = []; // { start, end, label, lines: [] }
  const notes = [];
  const warnings = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = useNumbered ? line.match(NUMBERED) : line.match(HEADING);
    if (!m) {
      if (blocks.length) blocks[blocks.length - 1].lines.push(line);
      else notes.push(line);
      continue;
    }
    const start = Number(m[1]);
    let rest = line.slice(m[0].length);
    let end = start;
    if (!useNumbered) {
      const range = readRange(rest);
      if (range && range.end > start) {
        end = range.end;
        rest = rest.slice(range.length);
        if (end - start >= MAX_RANGE) {
          warnings.push(`Rounds ${start}-${end} is a very big range, so only ${MAX_RANGE} rounds were created.`);
          end = start + MAX_RANGE - 1;
        }
      }
    }
    const label = line.slice(0, line.length - rest.length).replace(/[\s:.\-–—]+$/, '');
    blocks.push({ start, end, label, lines: [cleanText(rest)].filter(Boolean) });
  }

  const rounds = [];
  let expected = 1;
  for (const b of blocks) {
    if (b.start !== expected) {
      if (b.start < expected) warnings.push(`"${b.label}" repeats or goes back to round ${b.start} – check the numbering.`);
      else warnings.push(`Round ${expected === b.start - 1 ? expected : `${expected}–${b.start - 1}`} seems to be missing before "${b.label}".`);
    }
    const { text, stitches } = extractStitches(b.lines.join('\n'));
    if (!text) warnings.push(`"${b.label}" has no instructions.`);
    for (let n = b.start; n <= b.end; n++) rounds.push({ number: n, label: b.label, text, stitches });
    expected = b.end + 1;
  }

  if (!rounds.length) warnings.push('No rounds found. Start each round on a new line with "R1", "Rnd 1", "Round 1" or "Row 1".');
  return { rounds, notes: notes.join('\n'), warnings };
}
