// Share images for every pattern page (Facebook, WhatsApp, Pinterest, X and the
// Article image Google reads). One 1200x630 PNG per pattern in public/og/.
// Run with: npm run og   (output is committed; rerun after adding a pattern)
import sharp from 'sharp';
import fs from 'node:fs';
import { loadPatterns, cardArt } from '../build/pattern-pages.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const BG = { sunflower: '#fff0c4', ball: '#f8d4df', coaster: '#d9f0e1', flower: '#e7def6' };

// Break the title into lines of about 14 characters.
function lines(text, max = 14) {
  const out = [''];
  for (const w of text.split(' ')) {
    const cur = out[out.length - 1];
    if (cur && (cur + ' ' + w).length > max) out.push(w);
    else out[out.length - 1] = cur ? `${cur} ${w}` : w;
  }
  return out;
}

fs.mkdirSync('public/og', { recursive: true });
for (const p of loadPatterns()) {
  if (p.draft || !p.image?.art) continue;
  const accent = p.theme?.accent || '#b4436c';
  const dark = p.theme?.dark || '#3a2a30';
  const title = lines(p.title);
  const top = 300 - (title.length - 1) * 36;
  const facts = [p.level, p.time && p.time.replace(/^About /, '~ '), `${p.terms || 'US'} terms`].filter(Boolean).join('  ·  ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fffaf4"/><stop offset="1" stop-color="${p.theme?.cream || '#fbe3ec'}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="0" y="0" width="1200" height="14" fill="${accent}"/>
  <rect x="60" y="75" width="500" height="480" rx="48" fill="${BG[p.image.art] || '#f8d4df'}"/>
  <svg x="70" y="130" width="480" height="360" viewBox="0 0 240 180">${cardArt(p.image.art)}</svg>
  <text x="620" y="${top - 70}" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="3" fill="${accent}">FREE CROCHET PATTERN</text>
  ${title.map((l, i) => `<text x="620" y="${top + i * 72}" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700" fill="${dark}">${esc(l)}</text>`).join('\n  ')}
  <text x="620" y="${top + title.length * 72 - 10}" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#6e5961">${esc(facts)}</text>
  <rect x="620" y="${top + title.length * 72 + 30}" width="380" height="64" rx="32" fill="${accent}"/>
  <text x="810" y="${top + title.length * 72 + 72}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="27" font-weight="700" fill="#fff">Printable · Open in Tracker</text>
  <text x="1140" y="590" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="#6e5961">Crochet Tracker</text>
</svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(`public/og/${p.slug}.png`);
  console.log('og:', p.slug);
}
