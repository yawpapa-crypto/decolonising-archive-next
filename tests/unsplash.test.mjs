import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness({ trackingOk = true } = {}) {
  const calls = [];
  const photo = { id: 'sample-id', urls: { regular: 'https://images.unsplash.com/photo-example?ixid=original&ixlib=rb-4.1.0&w=1080' }, alt_description: 'Editorial image', user: { name: 'Photographer', links: { html: 'https://unsplash.com/@photographer' } }, links: { html: 'https://unsplash.com/photos/sample-id', download_location: 'https://api.unsplash.com/photos/sample-id/download?ixid=original' } };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/media/unsplash.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports, URL, AbortSignal, process: { env: { UNSPLASH_ACCESS_KEY: 'test-only-key' } },
    require: name => name === 'next/cache' ? { unstable_cache: fn => { const cache = new Map(); return async q => { if (!cache.has(q)) cache.set(q, fn(q)); return cache.get(q); }; } } : {},
    fetch: async (url, options) => { calls.push({ url: String(url), options }); return { ok: String(url).includes('/download') ? trackingOk : true, json: async () => ({ results: [photo] }) }; },
  });
  return { api: exports, calls, photo };
}

test('editorial selection hotlinks API URLs, preserves ixid, provides credits, tracks exactly once per cached selection', async () => {
  const { api, calls, photo } = harness();
  const result = await api.editorialPhoto('Ghana');
  assert.equal(result.src, photo.urls.regular);
  for (const link of [result.credit, result.page]) {
    const url = new URL(link);
    assert.equal(url.searchParams.get('utm_source'), 'decolonising_archive');
    assert.equal(url.searchParams.get('utm_medium'), 'referral');
  }
  assert.equal(result.photographer, 'Photographer');
  assert.equal(result.downloadLocation, photo.links.download_location);
  await api.editorialPhoto('Ghana');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, photo.links.download_location);
  assert.equal(calls[1].options.headers.Authorization, 'Client-ID test-only-key');
  const resized = new URL(api.resizeUnsplash(result.src, 640));
  assert.equal(resized.searchParams.get('ixid'), 'original');
  assert.equal(resized.searchParams.get('ixlib'), 'rb-4.1.0');
  assert.equal(resized.searchParams.get('w'), '640');
});

test('download tracking rejects untrusted hosts and paths without transmitting credentials', async () => {
  const { api, calls } = harness();
  for (const url of ['https://example.com/photos/a/download', 'http://api.unsplash.com/photos/a/download', 'https://api.unsplash.com/other', 'invalid']) assert.equal(await api.trackPhotoUse(url), false);
  assert.equal(calls.length, 0);
});

test('an editorial image is not adopted when its use cannot be tracked', async () => {
  const { api } = harness({ trackingOk: false });
  assert.equal(await api.editorialPhoto('Ghana'), null);
});
