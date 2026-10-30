import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import sitePlugin from './build/site-plugin.js';

const root = path.resolve('src');

// Every .html file under src/ (except partials) is its own page.
function findPages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'partials' ? [] : findPages(full);
    return d.name.endsWith('.html') ? [full] : [];
  });
}

const input = Object.fromEntries(
  findPages(root).map((file) => [path.relative(root, file).replace(/\\/g, '/').replace(/\.html$/, ''), file]),
);

export default defineConfig({
  root,
  publicDir: path.resolve('public'),
  appType: 'mpa',
  build: {
    outDir: path.resolve('dist'),
    emptyOutDir: true,
    target: 'es2020',
    rolldownOptions: { input },
  },
  plugins: [sitePlugin()],
});
