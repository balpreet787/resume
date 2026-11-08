import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'dist');
await rm(destination, { recursive: true, force: true });
await mkdir(path.join(destination, 'assets'), { recursive: true });
let html = await readFile(path.join(root, 'src/index.html'), 'utf8');
const files = {};
for (const name of ['styles.css', 'app.js', 'favicon.svg']) {
  const bytes = await readFile(path.join(root, 'src', name));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const extension = path.extname(name);
  const target = name === 'favicon.svg' ? name : `assets/${path.basename(name, extension)}.${sha256.slice(0, 12)}${extension}`;
  html = html.replaceAll(`/${name}`, `/${target}`);
  await writeFile(path.join(destination, target), bytes);
  files[target] = sha256;
}
await writeFile(path.join(destination, 'index.html'), html);
files['index.html'] = createHash('sha256').update(html).digest('hex');
await writeFile(path.join(destination, 'build-info.json'), JSON.stringify({
  revision: process.env.CODEBUILD_RESOLVED_SOURCE_VERSION || 'local', files,
}, null, 2) + '\n');
console.log(`Built ${Object.keys(files).length} website files in dist/.`);
