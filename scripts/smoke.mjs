import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2];
if (!base || !/^https:\/\/[a-z0-9.-]+\/?$/i.test(base)) throw new Error('Usage: node scripts/smoke.mjs https://your-distribution.cloudfront.net');
const expected = JSON.parse(await readFile(path.join(process.env.SITE_DIR || 'dist', 'build-info.json'), 'utf8'));
for (const [name, sha256] of Object.entries(expected.files)) {
  const response = await fetch(new URL(name === 'index.html' ? '/' : name, base.endsWith('/') ? base : `${base}/`), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `HTTP ${response.status} for ${name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256, `Deployed content differs: ${name}`);
  console.log(`Verified deployed ${name}`);
}
console.log('Live HTTPS smoke test passed.');
