import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = 'dist';
const base = process.env.PWA_BASE_PATH || '/';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.lang, 'zh-Hant');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.id, base);
assert.equal(manifest.start_url, base);
assert.equal(manifest.scope, base);
assert(manifest.name.includes('餐照'));
for (const size of [192, 512]) {
  const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}` && icon.purpose === 'any');
  assert(icon, `Missing ${size} icon`);
  assert(icon.src.startsWith(base), 'Icon escaped the project scope');
  const data = fs.readFileSync(path.join(root, icon.src.slice(base.length)));
  assert.equal(data.readUInt32BE(16), size);
  assert.equal(data.readUInt32BE(20), size);
}
assert(manifest.icons.some(icon => icon.purpose === 'maskable'));
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert(sw.length > 100, 'Service Worker missing/empty');
assert(sw.includes('precacheAndRoute'), 'No Workbox precache registration');
assert(sw.includes('index.html'), 'App shell is not precached');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('manifest.webmanifest'), 'Manifest is not linked');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (match[1].startsWith('/')) assert(match[1].startsWith(base), `Asset escaped project path: ${match[1]}`);
}
if (base !== '/') {
  const assets = fs.readdirSync(path.join(root, 'assets')).filter(name => name.endsWith('.js')).map(name => fs.readFileSync(path.join(root, 'assets', name), 'utf8')).join('\n');
  assert(assets.includes(`${base}sw.js`), 'SW registration must use project path');
  assert(sw.includes(`${base}index.html`), 'Navigation fallback must use project path');
}
console.log('PASS: manifest, standalone, zh-Hant, icon dimensions, maskable, SW precache and app shell.');
console.log('Browser installation/offline lifecycle still requires HTTPS Android testing.');
