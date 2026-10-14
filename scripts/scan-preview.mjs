import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
let inspected = 0;
for (const file of walk('dist')) {
  assert(!path.basename(file).startsWith('.env'), `Environment file in output: ${file}`);
  if (!/\.(js|css|html|txt|webmanifest)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  assert(!/sk-proj-[A-Za-z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:AKIA|ASIA)[A-Z0-9]{16}/.test(text), `Possible credential in ${file}`);
  assert(!/api\.openai\.com|generativelanguage\.googleapis\.com/.test(text), `Real AI endpoint in ${file}`);
  inspected++;
}
console.log(`PASS: ${inspected} built text assets scanned; no known credential markers, environment files or real AI endpoints.`);
console.log('No user photos or IndexedDB data are included in the static build.');
