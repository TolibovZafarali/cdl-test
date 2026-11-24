import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

function workerHarness({ workerUrl = 'https://example.test/sw.js', cached = new Map(), onlineResponse = null, cacheNames = [] } = {}) {
  const listeners = new Map();
  const requests = [];
  const matches = [];
  const writes = [];
  const names = new Set(cacheNames);
  const deleted = [];
  let claimed = false;
  const self = {
    location: new URL(workerUrl),
    addEventListener: (type, handler) => listeners.set(type, handler),
    skipWaiting: async () => {},
    clients: { claim: async () => { claimed = true; } },
  };
  const caches = {
    keys: async () => [...names],
    async delete(name) { deleted.push(name); return names.delete(name); },
    async match(key) {
      matches.push(key);
      return cached.get(key)?.clone();
    },
    async open(name) {
      names.add(name);
      return {
        async put(key, response) {
          writes.push({ key, response });
          cached.set(key, response);
        },
      };
    },
  };
  vm.runInNewContext(source, {
    self, caches, URL, Response,
    fetch: async request => {
      requests.push(request);
      if (onlineResponse) return onlineResponse.clone();
      throw new Error('The network is offline');
    },
  }, { filename: 'sw.js' });

  return {
    requests, matches, writes, deleted,
    cacheNames: () => [...names],
    claimed: () => claimed,
    async activate() {
      const lifetimes = [];
      listeners.get('activate')({ waitUntil(promise) { lifetimes.push(promise); } });
      await Promise.all(lifetimes);
    },
    async dispatch(url, method = 'GET') {
      let responsePromise;
      const lifetimes = [];
      const request = { url, method };
      listeners.get('fetch')({
        request,
        respondWith(promise) { responsePromise = Promise.resolve(promise); },
        waitUntil(promise) { lifetimes.push(promise); },
      });
      if (!responsePromise) return { intercepted: false, response: null };
      const response = await responsePromise;
      await Promise.all(lifetimes);
      return { intercepted: true, response };
    },
  };
}

test('offline hash-route navigation resolves to the cached application shell', async () => {
  const worker = workerHarness({ cached: new Map([
    ['https://example.test/', new Response('<main>Saved examination</main>')],
  ]) });
  const result = await worker.dispatch('https://example.test/#exam');
  assert.equal(result.intercepted, true);
  assert.equal(result.response.status, 200);
  assert.equal(await result.response.text(), '<main>Saved examination</main>');
  assert.deepEqual(worker.matches, ['https://example.test/']);
  assert.equal(worker.requests[0].url, 'https://example.test/#exam');
});

test('offline root queries and fragments share the canonical shell cache entry', async () => {
  const worker = workerHarness({ cached: new Map([
    ['https://example.test/', new Response('Offline test home')],
  ]) });
  for (const route of ['?resume=1', '?resume=1#exam', '?source=shortcut#results']) {
    const result = await worker.dispatch(`https://example.test/${route}`);
    assert.equal(result.intercepted, true, route);
    assert.equal(await result.response.text(), 'Offline test home');
  }
  assert.deepEqual(worker.matches, Array(3).fill('https://example.test/'));
});

test('subdirectory deployments resolve offline assets relative to the worker scope', async () => {
  const assetUrl = 'https://example.test/training/assets/icon.svg';
  const worker = workerHarness({
    workerUrl: 'https://example.test/training/sw.js',
    cached: new Map([[assetUrl, new Response('<svg>40 psi</svg>', {
      headers: { 'Content-Type': 'image/svg+xml' },
    })]]),
  });
  const result = await worker.dispatch(`${assetUrl}?version=2#gauge`);
  assert.equal(result.intercepted, true);
  assert.equal(result.response.headers.get('Content-Type'), 'image/svg+xml');
  assert.equal(await result.response.text(), '<svg>40 psi</svg>');
  assert.deepEqual(worker.matches, [assetUrl]);

  const outsideScope = await worker.dispatch('https://example.test/assets/icon.svg');
  assert.equal(outsideScope.intercepted, false);
  assert.equal(worker.requests.length, 1);
});

test('all three Word sources, question banks, and interface translations remain available offline', async () => {
  const documentBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
  const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const urls = ['air-brakes', 'general-knowledge', 'combination-vehicles'].map(name => `https://example.test/source/${name}.docx`);
  const banks = ['questions', 'general-knowledge', 'combination-vehicles', 'index', 'interface-uz', 'keywords'].map(name => `https://example.test/data/${name}.js`);
  banks.push('https://example.test/keywords.js');
  const cached = new Map([
    ...urls.map(url => [url, new Response(documentBytes, { headers: { 'Content-Type': mime } })]),
    ...banks.map(url => [url, new Response('export const QUESTIONS = [];')]),
  ]);
  const worker = workerHarness({ cached });
  for (const url of urls) {
    const result = await worker.dispatch(url);
    assert.equal(result.intercepted, true, url);
    assert.equal(result.response.headers.get('Content-Type'), mime);
    assert.deepEqual(new Uint8Array(await result.response.arrayBuffer()), documentBytes);
  }
  for (const url of banks) {
    const result = await worker.dispatch(url);
    assert.equal(result.intercepted, true, url);
    assert.equal(await result.response.text(), 'export const QUESTIONS = [];');
  }
});

test('activation removes obsolete application caches while preserving the current and unrelated caches', async () => {
  const old = ['missouri-cdl-v1', 'cdl-pdf-practice-v2', 'cdl-document-practice-v3', 'cdl-document-practice-v4', 'cdl-document-practice-v5', 'cdl-document-practice-v6', 'cdl-document-practice-v7', 'cdl-document-practice-v8', 'cdl-document-practice-v9', 'cdl-document-practice-v10', 'cdl-document-practice-v11', 'cdl-document-practice-v12', 'cdl-document-practice-v13', 'cdl-document-practice-v14', 'cdl-document-practice-v15', 'cdl-document-practice-v16', 'cdl-document-practice-v17', 'cdl-document-practice-v18', 'cdl-document-practice-v19', 'cdl-document-practice-v20', 'cdl-document-practice-v21', 'cdl-document-practice-v22', 'cdl-document-practice-v23', 'cdl-document-practice-v24', 'cdl-document-practice-v25', 'cdl-document-practice-v26', 'cdl-document-practice-v27'];
  const keep = ['cdl-document-practice-v28', 'unrelated-site-cache'];
  const worker = workerHarness({ cacheNames: [...old, ...keep] });
  await worker.activate();
  assert.deepEqual(worker.deleted, old);
  assert.deepEqual(worker.cacheNames(), keep);
  assert.equal(worker.claimed(), true);
});

test('the replaced PDF cannot be served from an obsolete cache entry', async () => {
  const oldUrl = 'https://example.test/source/generalknowledge.pdf';
  const worker = workerHarness({ cached: new Map([[oldUrl, new Response('Obsolete source')]]) });
  const result = await worker.dispatch(oldUrl);
  assert.equal(result.intercepted, false);
  assert.deepEqual(worker.requests, []);
  assert.deepEqual(worker.matches, []);
});

test('third-party requests are left to the browser without cache interception', async () => {
  const worker = workerHarness();
  const result = await worker.dispatch('https://dor.mo.gov/forms/CDL%20Manual.pdf#page=71');
  assert.equal(result.intercepted, false);
  assert.equal(result.response, null);
  assert.deepEqual(worker.requests, []);
  assert.deepEqual(worker.matches, []);
});

test('non-GET requests are never answered from the application cache', async () => {
  const worker = workerHarness({ cached: new Map([
    ['https://example.test/', new Response('Cached GET body')],
  ]) });
  for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) {
    const result = await worker.dispatch('https://example.test/', method);
    assert.equal(result.intercepted, false, method);
  }
  assert.deepEqual(worker.requests, []);
  assert.deepEqual(worker.matches, []);
});

test('unknown same-origin paths are not replaced with unrelated cached content', async () => {
  const worker = workerHarness();
  const result = await worker.dispatch('https://example.test/unrelated-page?x=1');
  assert.equal(result.intercepted, false);
  assert.deepEqual(worker.requests, []);
  assert.deepEqual(worker.matches, []);
});

test('online cache refresh writes the canonical URL for subsequent offline navigation', async () => {
  const worker = workerHarness({ onlineResponse: new Response('Fresh examination screen') });
  const result = await worker.dispatch('https://example.test/index.html?launch=1#exam');
  assert.equal(result.intercepted, true);
  assert.equal(await result.response.text(), 'Fresh examination screen');
  assert.equal(worker.writes.length, 1);
  assert.equal(worker.writes[0].key, 'https://example.test/index.html');
  assert.equal(await worker.writes[0].response.text(), 'Fresh examination screen');
  assert.deepEqual(worker.matches, []);
});

test('a missing offline cache entry produces a network error rather than an invalid response', async () => {
  const worker = workerHarness();
  const result = await worker.dispatch('https://example.test/#exam');
  assert.equal(result.intercepted, true);
  assert.ok(result.response instanceof Response);
  assert.equal(result.response.type, 'error');
  assert.equal(result.response.status, 0);
});
