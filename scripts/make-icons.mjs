// Generates PNG app icons and the social share image from SVG sources.
// Run with: npm run icons   (output is committed, so this is only needed after design changes)
import sharp from 'sharp';
import fs from 'node:fs';

const yarn = fs.readFileSync('public/favicon.svg');

// Maskable icon: yarn ball centred on a soft background with safe-zone padding.
const maskable = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fde4ec"/>
  <image href="data:image/svg+xml;base64,${yarn.toString('base64')}" x="116" y="116" width="280" height="280"/>
</svg>`);

const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff8f1"/><stop offset="1" stop-color="#fbe3ec"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1080" cy="80" r="180" fill="#ffe1cf"/><circle cx="90" cy="560" r="150" fill="#d9f0e1"/>
  <image href="data:image/svg+xml;base64,${yarn.toString('base64')}" x="90" y="165" width="300" height="300"/>
  <text x="440" y="275" font-family="Segoe UI, Arial, sans-serif" font-size="76" font-weight="800" fill="#3a2a30">Crochet Tracker</text>
  <text x="440" y="355" font-family="Segoe UI, Arial, sans-serif" font-size="40" fill="#6e5961">Free pattern tracker &amp; row counter</text>
  <rect x="440" y="400" width="360" height="72" rx="36" fill="#b4436c"/>
  <text x="620" y="447" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="700" fill="#fff">Start tracking — free</text>
</svg>`);

const jobs = [
  [yarn, 'public/icons/icon-32.png', 32],
  [yarn, 'public/icons/icon-192.png', 192],
  [yarn, 'public/icons/icon-512.png', 512],
  [maskable, 'public/icons/apple-touch-icon.png', 180],
  [maskable, 'public/icons/maskable-512.png', 512],
];
for (const [src, out, size] of jobs) {
  await sharp(src, { density: 600 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
}
await sharp(og).png({ compressionLevel: 9, palette: true }).toFile('public/og-image.png');
console.log('Icons written.');
