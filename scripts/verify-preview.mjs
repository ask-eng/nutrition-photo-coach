import assert from 'node:assert/strict';
const url = new URL(process.argv[2]);
assert.equal(url.protocol, 'https:');
assert.equal(url.hostname, 'ask-eng.github.io');
assert.equal(url.pathname, '/nutrition-photo-coach/');
async function request(path) {
  const target = new URL(path, url);
  assert.equal(target.origin, url.origin);
  assert(target.pathname.startsWith(url.pathname));
  let response;
  for (let attempt = 0; attempt < 6; attempt++) {
    response = await fetch(target, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (response.ok) return response;
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error(`HTTPS verification failed (${response.status}): ${target}`);
}
const html = await (await request('./')).text();
assert(html.includes('餐照營養教練'));
assert(html.includes('/nutrition-photo-coach/manifest.webmanifest'));
const manifest = await (await request('manifest.webmanifest')).json();
assert.equal(manifest.start_url, url.pathname);
assert.equal(manifest.scope, url.pathname);
for (const icon of manifest.icons) await request(icon.src);
await request('sw.js');
await request('third-party-notices.txt');
for (const [, asset] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (asset.startsWith('/nutrition-photo-coach/')) await request(asset);
}
console.log(`PASS: HTTPS preview, manifest, icons, SW, HTML assets and license link at ${url.href}`);
console.log('This is an HTTP smoke check, not Android device acceptance.');
