// Pinterest pins: one tall 1000x1500 (2:3) PNG per pattern in public/pins/.
// The "Save to Pinterest" button on each pattern page uses this picture.
// Run with: npm run pins   (output is committed; rerun after adding a pattern)
//
// Uses the pattern's real photo when it has one (image.type "photo"),
// otherwise the same illustration as the pattern card.
import sharp from 'sharp';
import fs from 'node:fs';
import { loadPatterns, cardArt } from '../build/pattern-pages.js';
import { SITE_NAME } from '../site.config.js';

const W = 1000;
const H = 1500;
const BG = { sunflower: '#fff0c4', ball: '#f8d4df', coaster: '#d9f0e1', flower: '#e7def6' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function lines(text, max) {
  const out = [''];
  for (const w of text.split(' ')) {
    const cur = out[out.length - 1];
    if (cur && (cur + ' ' + w).length > max) out.push(w);
    else out[out.length - 1] = cur ? `${cur} ${w}` : w;
  }
  return out;
}

// Picture panel: from under the title down to y 1200
const PX = 80;
const PW = W - PX * 2;

fs.mkdirSync('public/pins', { recursive: true });
for (const p of loadPatterns()) {
  if (p.draft) continue;
  const photo = p.image?.type === 'photo' && p.image.src ? `public${p.image.src}` : null;
  if (!photo && !p.image?.art) continue;
  if (photo && !fs.existsSync(photo)) {
    console.warn(`pins: ${p.slug}: photo ${photo} not found, skipped`);
    continue;
  }
  const accent = p.theme?.accent || '#b4436c';
  const dark = p.theme?.dark || '#3a2a30';
  const cream = p.theme?.cream || '#fbe3ec';
  const title = lines(p.title, 15).slice(0, 3);
  const titleY = 222;
  const PY = titleY + (title.length - 1) * 94 + 72;
  const PHT = 1200 - PY;
  const facts = [p.level, p.time && p.time.replace(/^About /, '~ '), p.size && p.size.replace(/^About /, '~ ')].filter(Boolean).join('   ·   ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fffaf4"/><stop offset="1" stop-color="${cream}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="18" fill="${accent}"/>
  <text x="${W / 2}" y="${titleY - 104}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800" letter-spacing="5" fill="${accent}">FREE CROCHET PATTERN</text>
  ${title.map((l, i) => `<text x="${W / 2}" y="${titleY + i * 94}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="88" font-weight="700" fill="${dark}">${esc(l)}</text>`).join('\n  ')}
  <rect x="${PX}" y="${PY}" width="${PW}" height="${PHT}" rx="56" fill="${photo ? '#fff' : BG[p.image.art] || '#f8d4df'}"/>
  ${photo ? '' : `<svg x="${PX + 20}" y="${PY + 60}" width="${PW - 40}" height="${PHT - 120}" viewBox="0 0 240 180">${cardArt(p.image.art)}</svg>
  <text x="${PX + 34}" y="${PY + PHT - 34}" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="#6e5961" opacity=".8">Illustration</text>`}
  <text x="${W / 2}" y="1262" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="600" fill="#6e5961">${esc(facts)}</text>
  <rect x="${W / 2 - 330}" y="1300" width="660" height="88" rx="44" fill="${accent}"/>
  <text x="${W / 2}" y="1357" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="800" fill="#fff">Free printable PDF + round chart</text>
  <text x="${W / 2}" y="1456" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" fill="${dark}" opacity=".75">${esc(SITE_NAME)} · no ads, follow it round by round</text>
</svg>`;

  let img = sharp(Buffer.from(svg));
  if (photo) {
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PHT}"><rect width="${PW}" height="${PHT}" rx="56" fill="#fff"/></svg>`);
    const pic = await sharp(photo).resize(PW, PHT, { fit: 'cover' }).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    img = sharp(await img.png().toBuffer()).composite([{ input: pic, left: PX, top: PY }]);
  }
  await img.png({ compressionLevel: 9, palette: !photo }).toFile(`public/pins/${p.slug}.png`);
  console.log('pin:', p.slug);
}
