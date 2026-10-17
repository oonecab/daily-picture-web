import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import http from 'node:http';
import { createBingService, normalizeArchive, displayDate, validateImage } from '../lib/bing.mjs';
import { createApp } from '../server.mjs';

function sample(title = '风景') {
  return { images: [{ urlbase: '/th?id=OHR.Example_ZH-CN123', title, copyright: '山谷，中国 (© Photographer)', copyrightlink: 'https://www.bing.com/search?q=valley', startdate: '20261016', fullstartdate: '202610161600', wp: true }] };
}
async function temporary(t) {
  const path = await mkdtemp(join(tmpdir(), 'daily-picture-test-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test('market date uses the UTC publication instant, including US daylight-saving time', () => {
  assert.equal(displayDate(sample().images[0], 'zh-CN'), '2026-10-17');
  assert.equal(displayDate({ fullstartdate: '202610170700' }, 'en-US'), '2026-10-17');
  assert.equal(displayDate({ fullstartdate: '202612170800' }, 'en-US'), '2026-12-17');
  assert.equal(displayDate({ startdate: '20261017' }, 'ja-JP'), '2026-10-17');
});

test('archive normalization preserves attribution and rejects arbitrary image hosts', () => {
  const result = normalizeArchive(sample(), 'zh-CN', '2026-10-17T01:00:00Z');
  assert.equal(result.images[0].id, 'OHR.Example_ZH-CN123');
  assert.equal(result.images[0].credit, '© Photographer');
  assert.equal(result.images[0].description, '山谷，中国');
  const bad = sample(); bad.images[0].urlbase = 'https://example.org/th?id=OHR.Example';
  assert.throws(() => normalizeArchive(bad, 'zh-CN', 'now'));
  const unsafe = sample(); unsafe.images[0].copyrightlink = 'javascript:alert(1)';
  assert.equal(normalizeArchive(unsafe, 'zh-CN', 'now').images[0].sourceUrl, 'https://www.bing.com');
});

test('image validation rejects traversal, URL injection, and unknown sizes', () => {
  for (const id of ['../secret', 'https://example.org', 'OHR.Test&url=x', 'OHR.Test%2fsecret', 'OHR.']) assert.throws(() => validateImage(id, 'UHD'));
  assert.throws(() => validateImage('OHR.Test', '999x999'));
  assert.doesNotThrow(() => validateImage('OHR.Example_EN-US123', 'UHD'));
});

test('concurrent archive requests share one upstream request and cache metadata', async (t) => {
  const cacheDir = await temporary(t);
  let calls = 0;
  const service = createBingService({ cacheDir, fetchImpl: async () => { calls++; await new Promise((r) => setTimeout(r, 30)); return Response.json(sample()); } });
  const results = await Promise.all(Array.from({ length: 5 }, () => service.archive('zh-CN')));
  assert.equal(calls, 1);
  assert.equal(results[0].images.length, 1);
  assert.equal((await service.archive('zh-CN')).cache, 'hit');
  assert.equal(calls, 1);
});

test('metadata-only changes are committed even when image IDs do not change', async (t) => {
  const cacheDir = await temporary(t);
  let title = '旧标题';
  const service = createBingService({ cacheDir, fetchImpl: async () => Response.json(sample(title)) });
  await service.archive(); title = '新标题';
  const result = await service.archive('zh-CN', true);
  assert.equal(result.images[0].title, '新标题');
  assert.equal(JSON.parse(await readFile(join(cacheDir, 'archives', 'zh-CN.json'), 'utf8')).images[0].title, '新标题');
});

test('a transient connection failure is retried once within the original time budget', async (t) => {
  const cacheDir = await temporary(t);
  let calls = 0;
  const signals = [];
  const service = createBingService({ cacheDir, fetchImpl: async (_url, options) => {
    calls++; signals.push(options.signal);
    if (calls === 1) throw new TypeError('fetch failed');
    return Response.json(sample());
  } });
  assert.equal((await service.archive()).stale, false);
  assert.equal(calls, 2);
  assert.equal(signals[0], signals[1]);
});

test('network failure returns explicitly stale data, including after service restart', async (t) => {
  const cacheDir = await temporary(t);
  const service = createBingService({ cacheDir, fetchImpl: async () => Response.json(sample()) });
  await service.archive();
  const restarted = createBingService({ cacheDir, fetchImpl: async () => { throw new Error('offline'); } });
  const stale = await restarted.archive('zh-CN', true);
  assert.equal(stale.stale, true); assert.equal(stale.cache, 'fallback'); assert.equal(stale.images.length, 1);
  await assert.rejects(() => restarted.archive('en-US'), (error) => error.status === 502);
});

test('a corrupt archive cache can recover from the network', async (t) => {
  const cacheDir = await temporary(t);
  await mkdir(join(cacheDir, 'archives'), { recursive: true });
  await writeFile(join(cacheDir, 'archives', 'zh-CN.json'), '{broken');
  const service = createBingService({ cacheDir, fetchImpl: async () => Response.json(sample()) });
  assert.equal((await service.archive()).stale, false);
});

test('non-image responses cannot poison the image cache', async (t) => {
  const cacheDir = await temporary(t);
  let calls = 0;
  const service = createBingService({ cacheDir, fetchImpl: async () => { calls++; return new Response('<html>denied</html>', { headers: { 'Content-Type': 'text/html' } }); } });
  await assert.rejects(() => service.image('OHR.Test'), (error) => error.status === 502);
  await assert.rejects(() => service.image('OHR.Test'), (error) => error.status === 502);
  assert.equal(calls, 2);
});

test('HTTP routes serve the app, reject writes and invalid hosts, and hide workspace files', async (t) => {
  const server = createApp({ service: { archive: async () => ({ images: [] }), image: async () => Buffer.from([255,216,255,217]) } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base);
  assert.equal(page.status, 200); assert.match(await page.text(), /每日一景/);
  assert.match(page.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.equal((await fetch(`${base}/.cache/archives/zh-CN.json`)).status, 404);
  assert.equal((await fetch(`${base}/api/archive`, { method: 'POST' })).status, 405);
  const foreignHostStatus = await new Promise((resolve, reject) => {
    http.get(base, { headers: { Host: 'untrusted.example' } }, (response) => { response.resume(); resolve(response.statusCode); }).on('error', reject);
  });
  assert.equal(foreignHostStatus, 403);
  assert.equal((await fetch(base, { method: 'HEAD' })).status, 200);
  const image = await fetch(`${base}/api/image?id=OHR.Test&size=UHD&download=1`);
  assert.equal(image.headers.get('Content-Disposition'), 'attachment; filename="OHR.Test_UHD.jpg"');
});
