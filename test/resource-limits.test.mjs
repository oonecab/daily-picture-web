import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createBingService } from '../lib/bing.mjs';
import { createApp } from '../server.mjs';

const jpeg = () => new Response(new Uint8Array([255, 216, 255, 217]), { headers: { 'Content-Type': 'image/jpeg' } });
async function temporary(t) { const directory = await mkdtemp(join(tmpdir(), 'daily-picture-limits-')); t.after(() => rm(directory, { recursive: true, force: true })); return directory; }
const archive = () => Response.json({ images: [{ urlbase: '/th?id=OHR.Limit', startdate: '20261020', title: 'Fixture' }] });

test('different images share bounded upstream capacity and reject queue overflow', async (t) => {
  let release, calls = 0, active = 0, peak = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  const service = createBingService({ cacheDir: await temporary(t), maxConcurrent: 2, maxQueued: 2, fetchImpl: async () => {
    calls++; active++; peak = Math.max(peak, active); await gate; active--; return jpeg();
  } });
  const requests = Array.from({ length: 5 }, (_, i) => service.image(`OHR.Limit${i}`).then(() => 200, (error) => error.status));
  let results;
  try { await delay(40); assert.equal(calls, 2); } finally { release(); results = await Promise.all(requests); }
  assert.equal(peak, 2); assert.equal(results.filter((status) => status === 503).length, 1);
  assert.equal(results.filter((status) => status === 200).length, 4);
  assert.equal((await service.image('OHR.AfterOverflow')).length, 4);
});
test('same image requests still share one upstream operation', async (t) => {
  let calls = 0;
  const service = createBingService({ cacheDir: await temporary(t), maxConcurrent: 1, maxQueued: 0, fetchImpl: async () => { calls++; await delay(20); return jpeg(); } });
  await Promise.all(Array.from({ length: 12 }, () => service.image('OHR.Same')));
  assert.equal(calls, 1);
});
test('queued requests expire in the original budget and capacity is released after failure', async (t) => {
  let calls = 0, slow = true;
  const service = createBingService({ cacheDir: await temporary(t), maxConcurrent: 1, maxQueued: 2, requestTimeoutMs: 40,
    fetchImpl: async (_url, { signal }) => { calls++; if (!slow) return jpeg(); return new Promise((_, reject) => signal.addEventListener('abort', () => { delay(20).then(() => reject(signal.reason)); }, { once: true })); },
  });
  const responses = [service.image('OHR.First'), service.image('OHR.Queued')].map((request) => request.catch((error) => error.status));
  await Promise.race([Promise.all(responses), delay(200).then(() => { throw new Error('Request budget did not bound the queue'); })]);
  assert.equal(calls, 1);
  slow = false;
  assert.equal((await service.image('OHR.Recovered')).length, 4);
});
test('refresh cooldown is per market and preserves failed refresh state', async (t) => {
  let now = 0, calls = 0, fail = false;
  const service = createBingService({ cacheDir: await temporary(t), now: () => now, fetchImpl: async () => { calls++; return fail ? new Response('bad', { status: 400 }) : archive(); } });
  await service.archive('zh-CN');
  for (let i = 0; i < 6; i++) assert.equal((await service.archive('zh-CN', true)).cache, 'cooldown');
  assert.equal(calls, 2);
  await service.archive('en-US', true); assert.equal(calls, 4);
  now += 30000; fail = true;
  assert.equal((await service.archive('zh-CN', true)).stale, true);
  const repeated = await service.archive('zh-CN', true);
  assert.equal(repeated.stale, true); assert.equal(repeated.cache, 'cooldown'); assert.equal(calls, 6);
  now += 30000; fail = false;
  assert.equal((await service.archive('zh-CN', true)).cache, 'fresh'); assert.equal(calls, 8);
});
test('failed refreshes without a cache are cooled down without inventing successful data', async (t) => {
  let calls = 0;
  const service = createBingService({ cacheDir: await temporary(t), fetchImpl: async () => { calls++; return new Response('bad', { status: 400 }); } });
  for (let i = 0; i < 3; i++) await assert.rejects(service.archive('zh-CN', true), (error) => error.status === 502);
  assert.equal(calls, 2);
});
test('archive and image requests share the same upstream pool', async (t) => {
  let release, active = 0, peak = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  const service = createBingService({ cacheDir: await temporary(t), maxConcurrent: 2, maxQueued: 4, fetchImpl: async (url) => {
    active++; peak = Math.max(peak, active); await gate; active--;
    return url.pathname === '/th' ? jpeg() : archive();
  } });
  const requests = [service.archive(), service.image('OHR.Mixed1'), service.image('OHR.Mixed2')];
  await delay(30); release(); await Promise.all(requests);
  assert.equal(peak, 2);
});
test('HTTP overload responses expose a retry delay and cannot be cached', async (t) => {
  const server = createApp({ service: { image: async () => { throw Object.assign(new Error('Busy'), { status: 503 }); } } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/image?id=OHR.Busy`);
  assert.equal(response.status, 503); assert.equal(response.headers.get('retry-after'), '5');
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal((await response.json()).error, 'Busy');
});
test('static validators support GET and HEAD without changing API cache semantics', async (t) => {
  const server = createApp({ service: { archive: async () => ({ images: [] }) } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const initial = await fetch(`${base}/app.js`); const body = await initial.text();
  const etag = initial.headers.get('etag'); assert.match(etag || '', /^"[a-f0-9]+"$/);
  for (const value of [etag, `W/${etag}`, `"older", ${etag}`, '*']) {
    const response = await fetch(`${base}/app.js`, { headers: { 'If-None-Match': value } });
    assert.equal(response.status, 304); assert.equal(await response.text(), '');
    assert.equal(response.headers.get('etag'), etag); assert.equal(response.headers.get('cache-control'), 'no-cache');
  }
  assert.equal((await fetch(`${base}/app.js`, { headers: { 'If-None-Match': '"older"' } })).status, 200);
  const head = await fetch(`${base}/app.js`, { method: 'HEAD' });
  assert.equal(head.headers.get('etag'), etag); assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength(body)); assert.equal(await head.text(), '');
  const api = await fetch(`${base}/api/archive`, { headers: { 'If-None-Match': '*' } });
  assert.equal(api.status, 200); assert.equal(api.headers.get('cache-control'), 'no-store'); assert.equal(api.headers.get('etag'), null);
});
