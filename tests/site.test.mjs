import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// In CodePipeline, test the incoming build artifact, without rebuilding it.
const site = path.resolve(process.env.SITE_DIR || 'dist');
const html = await readFile(path.join(site, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(path.join(site, 'build-info.json'), 'utf8'));

test('resume has a title, description, viewport, language and main landmark', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Balpreet Sekhon/);
  assert.match(html, /<meta name="description" content=".{50,}"/);
  assert.match(html, /<meta name="viewport"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.match(html, /class="skip-link"/);
});

test('resume preserves roles and requested full-time responsibilities', () => {
  for (const text of ['Balpreet', 'Sekhon', 'GuildScroll', 'PennyWise', 'CompetiFit', 'British Columbia Institute of Technology', '200+ automated tests', 'May 2026 — Present', 'Design test plans', 'software release manager', 'Manage and mentor co-op students']) assert.ok(html.includes(text), `Missing resume content: ${text}`);
  assert.equal((html.match(/<h4>QA Software Engineer<\/h4>/g) || []).length, 2);
});

test('every internal link has a unique, existing target', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
  for (const [, target] of html.matchAll(/href="#([^"]*)"/g)) assert.ok(ids.includes(target), `Broken anchor: ${target}`);
});

test('all referenced local assets exist and use rooted paths', async () => {
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https:\/\/|tel:|#)/.test(url)) continue;
    assert.ok(url.startsWith('/') && !url.includes('..'), `Invalid local URL: ${url}`);
    assert.ok((await readFile(path.join(site, url))).length > 0, `Empty asset: ${url}`);
  }
});

test('published files match build manifest hashes', async () => {
  assert.deepEqual(Object.keys(manifest.files).sort(), ['index.html', 'favicon.svg', ...Object.keys(manifest.files).filter(name => name.startsWith('assets/'))].sort());
  assert.equal(Object.keys(manifest.files).length, 4);
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.ok(!name.includes('..') && !path.isAbsolute(name));
    const actual = createHash('sha256').update(await readFile(path.join(site, name))).digest('hex');
    assert.equal(actual, expected, `Corrupt artifact: ${name}`);
  }
  for (const extension of ['css', 'js']) assert.ok(Object.keys(manifest.files).some(name => new RegExp(`^assets/.+\\.[a-f0-9]{12}\\.${extension}$`).test(name)), `Unversioned ${extension} asset`);
});

test('external links use HTTPS and safe new-tab attributes', () => {
  for (const [tag, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)) {
    assert.ok(/^(https:\/\/|tel:\+|#)/.test(href), `Unexpected link: ${href}`);
    if (tag.includes('target="_blank"')) assert.match(tag, /rel="noopener noreferrer"/);
  }
  assert.match(html, /https:\/\/github.com\/balpreet787/);
  assert.match(html, /tel:\+12899810633/);
});

test('artifact contains only website files, not source, credentials or infrastructure', async () => {
  assert.deepEqual((await readdir(site)).sort(), ['assets', 'build-info.json', 'favicon.svg', 'index.html']);
  assert.equal((await readdir(path.join(site, 'assets'))).length, 2);
});

test('site includes responsive, print and reduced-motion styles', async () => {
  const name = Object.keys(manifest.files).find(name => name.endsWith('.css'));
  const css = await readFile(path.join(site, name), 'utf8');
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media print/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /@import/);
});
