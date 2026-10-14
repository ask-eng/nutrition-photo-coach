import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = 'dist';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.lang, 'zh-Hant');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert(manifest.name.includes('餐照'));
for (const size of [192, 512]) {
  const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}` && icon.purpose === 'any');
  assert(icon, `Missing ${size} icon`);
  const data = fs.readFileSync(path.join(root, icon.src.replace(/^\//, '')));
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
console.log('PASS: manifest, standalone, zh-Hant, icon dimensions, maskable, SW precache and app shell.');
console.log('Browser installation/offline lifecycle still requires HTTPS Android testing.');
