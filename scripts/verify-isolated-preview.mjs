import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const dist = 'dist';
const js = fs.readdirSync(path.join(dist, 'assets')).filter(p => p.endsWith('.js'))
  .map(p => fs.readFileSync(path.join(dist, 'assets', p), 'utf8')).join('\n');
assert(js.includes('nutrition-photo-coach-goals-preview-v1'), 'Preview database name missing');
assert(!js.includes('nutrition-photo-coach-v1'), 'Production IndexedDB name leaked into preview build');
assert(js.includes('.github.io'), 'GitHub Pages shared-origin host block missing');
assert(js.includes('隔離測試版'), 'Visible preview-only warning/badge missing');
assert(js.includes('此為隔離測試版'), 'No preview-only privacy warning');
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.id, '/');
console.log('PASS: Preview-only database, visible warning, GitHub Pages origin block, root scope for distinct origin.');
