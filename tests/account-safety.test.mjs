import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const load = (file, extra = {}) => {
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const ctx = { exports: {}, ...extra };
  vm.runInNewContext(out, ctx);
  return ctx;
};

test('account deletion needs the exact email address', () => {
  const { emailConfirmed } = load('lib/account/delete-guard.ts').exports;
  assert.equal(emailConfirmed('Yaw@Example.com ', 'yaw@example.com'), true);
  assert.equal(emailConfirmed('', ''), false);
  assert.equal(emailConfirmed(undefined, 'yaw@example.com'), false);
  assert.equal(emailConfirmed('yaw@example.co', 'yaw@example.com'), false);
  assert.equal(emailConfirmed('delete', 'yaw@example.com'), false);
  assert.equal(emailConfirmed('yaw@example.com', null), false);
});

function browser(href) {
  const store = new Map();
  const url = new URL(href);
  const window = {
    location: { get href() { return url.href; } },
    history: { state: null, replaceState(_s, _t, path) { const u = new URL(path, url.origin); url.pathname = u.pathname; url.search = u.search; url.hash = u.hash; } },
  };
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  window.localStorage = localStorage;
  return { window, localStorage, URL, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary'), escape, unescape, encodeURIComponent, decodeURIComponent, Date, JSON, url };
}

test('a pending save survives sign-up in the same browser and in another one', () => {
  const b1 = browser('https://ared.design/home-next/explore?q=craft');
  const m1 = load('app/home-next/pending-save.ts', b1).exports;
  m1.setPending({ id: 'rec-1', title: 'Kente Cloth', kind: 'book' });
  const ret = m1.returnUrlWithPending();
  assert.match(ret, /^\/home-next\/explore\?q=craft&ared_save=/);

  // Same browser: local storage is enough, and consuming clears it.
  const first = m1.consumePending();
  assert.equal(first.id, 'rec-1');
  assert.equal(m1.consumePending(), null);

  // Different browser after email confirmation: the return URL carries the item.
  const b2 = browser('https://ared.design' + ret);
  const m2 = load('app/home-next/pending-save.ts', b2).exports;
  const carried = m2.consumePending();
  assert.equal(carried.id, 'rec-1');
  assert.equal(carried.title, 'Kente Cloth');
  assert.ok(!b2.url.search.includes('ared_save'), 'the parameter is removed from the address bar');
});

test('a corrupted return parameter is ignored', () => {
  const b = browser('https://ared.design/home-next/explore?ared_save=%%%not-valid');
  const m = load('app/home-next/pending-save.ts', b).exports;
  assert.equal(m.consumePending(), null);
});

test('a stale pending save is dropped after six hours', () => {
  const b = browser('https://ared.design/home-next/explore');
  const m = load('app/home-next/pending-save.ts', b).exports;
  b.localStorage.setItem('ared:pending-save', JSON.stringify({ item: { id: 'old' }, at: Date.now() - 7 * 3600e3 }));
  assert.equal(m.consumePending(), null);
});
