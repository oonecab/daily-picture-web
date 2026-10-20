import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'http://localhost';
const imageRequest = (id = 'New') => new Request(`${origin}/api/image?id=OHR.${id}&size=640x360`);
const jpeg = () => new Response(new Uint8Array([255, 216, 255, 217]), { headers: { 'Content-Type': 'image/jpeg' } });
function worker({ fetchImpl = async () => jpeg(), failPut, timers } = {}) {
  const entries = new Map(), messages = [], pending = [];
  const key = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  let attempts = 0, deletions = 0;
  const cache = {
    match: async (request) => entries.get(key(request))?.clone(),
    keys: async () => [...entries.keys()].map((url) => new Request(url)),
    delete: async (request) => { deletions++; return entries.delete(key(request)); },
    put: async (request, response) => {
      attempts++; if (failPut?.(attempts)) throw new DOMException('Storage full', 'QuotaExceededError');
      const stored = response.clone(); await response.arrayBuffer(); entries.set(key(request), stored);
    },
  };
  const context = vm.createContext({ URL, Request, Response, Headers, AbortController, setTimeout: timers?.set || setTimeout, clearTimeout: timers?.clear || clearTimeout,
    fetch: fetchImpl, caches: { open: async () => cache },
    self: { addEventListener() {}, location: { origin }, clients: { matchAll: async () => [{ postMessage: (message) => messages.push(message) }] } },
  });
  vm.runInContext(source, context, { filename: 'public/sw.js' });
  return { context, entries, messages, attempts: () => attempts, deletions: () => deletions,
    seed: (request, response) => entries.set(key(request), response),
    async image(request = imageRequest()) { const response = await context.image(request, { waitUntil: (promise) => pending.push(promise) }); await Promise.all(pending); return response; },
  };
}

for (const status of [500, 502, 503, 504]) test(`cached shell survives HTTP ${status}`, async () => {
  const w = worker({ fetchImpl: async () => new Response('unavailable', { status }) });
  w.seed('/', new Response('cached shell'));
  assert.equal(await (await w.context.shell(new Request(origin))).text(), 'cached shell');
});
test('shell preserves HTTP 404 and updates its cached body after recovery', async () => {
  let status = 404;
  const w = worker({ fetchImpl: async () => new Response(status === 200 ? 'updated shell' : 'missing', { status }) });
  w.seed('/', new Response('cached shell'));
  assert.equal((await w.context.shell(new Request(origin))).status, 404);
  assert.equal(await w.entries.get(`${origin}/`).clone().text(), 'cached shell');
  status = 200;
  await w.context.shell(new Request(origin));
  assert.equal(await w.entries.get(`${origin}/`).text(), 'updated shell');
});
test('shell aborts a slow network within its deadline and uses cached navigation', async () => {
  let deadline, duration, aborted = false;
  const w = worker({ timers: { set: (fn, ms) => { deadline = fn; duration = ms; return 1; }, clear() {} },
    fetchImpl: async (_request, { signal } = {}) => new Promise((_, reject) => signal?.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true })),
  });
  w.seed('/', new Response('offline shell'));
  const response = w.context.shell({ url: `${origin}/index.html`, mode: 'navigate' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof deadline, 'function'); assert.equal(duration, 5000);
  deadline();
  assert.equal(await (await response).text(), 'offline shell'); assert.equal(aborted, true);
});
test('image quota failure evicts old entries and retries once while preserving online response', async () => {
  const w = worker({ failPut: (attempt) => attempt === 1 });
  for (let i = 0; i < 8; i++) w.seed(imageRequest(`Old${i}`), jpeg());
  assert.equal((await w.image()).status, 200);
  assert.equal(w.attempts(), 2); assert.ok(w.deletions() > 0);
  assert.ok(w.entries.has(imageRequest().url)); assert.equal(w.messages.length, 0);
});
test('shell falls back when its deadline expires during a streamed response body', async () => {
  let deadline;
  const w = worker({ timers: { set: (fn) => { deadline = fn; return 1; }, clear() {} },
    fetchImpl: async (_request, { signal }) => new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('partial'));
      signal.addEventListener('abort', () => controller.error(signal.reason), { once: true });
    } })),
  });
  w.seed('/', new Response('complete cached shell'));
  const response = w.context.shell(new Request(origin));
  await new Promise((resolve) => setImmediate(resolve));
  deadline();
  assert.equal(await (await response).text(), 'complete cached shell');
  assert.equal(await w.entries.get(`${origin}/`).text(), 'complete cached shell');
});
test('persistent quota failure has a bounded retry and reports unavailable offline storage', async () => {
  const w = worker({ failPut: () => true });
  w.seed(imageRequest('Old'), jpeg());
  assert.equal((await w.image()).status, 200);
  assert.equal(w.attempts(), 2);
  assert.equal(w.messages.length, 1); assert.equal(w.messages[0].type, 'offline-cache-unavailable');
});
test('image writes enforce both byte and entry budgets, including simultaneous responses', async () => {
  const w = worker();
  // Old cache entries carry the original server Content-Length header.
  for (let i = 0; i < 2; i++) w.seed(imageRequest(`Large${i}`), new Response('fixture', { headers: { 'Content-Length': String(32 * 1024 * 1024) } }));
  await w.image();
  assert.equal(w.entries.size, 2); assert.ok(!w.entries.has(imageRequest('Large0').url));
  w.entries.clear();
  for (let i = 0; i < 80; i++) w.seed(imageRequest(`Small${i}`), jpeg());
  await Promise.all([w.image(imageRequest('A')), w.image(imageRequest('B')), w.image(imageRequest('C'))]);
  assert.equal(w.entries.size, 80);
  for (const id of ['A', 'B', 'C']) assert.ok(w.entries.has(imageRequest(id).url));
});
