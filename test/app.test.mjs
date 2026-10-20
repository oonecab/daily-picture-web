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
function archivePage(offset, count = 8) {
  return { images: Array.from({ length: count }, (_, index) => {
    const day = offset + index;
    const date = new Date(Date.UTC(2026, 9, 6, 16) - day * 86400000).toISOString().replace(/[-:TZ.]/g, '');
    return { ...sample(`风景 ${day}`).images[0], urlbase: `/th?id=OHR.Day${day}_ZH-CN123`, startdate: date.slice(0, 8), fullstartdate: date.slice(0, 12) };
  }) };
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

test('concurrent archive requests share one pair of upstream requests and cache metadata', async (t) => {
  const cacheDir = await temporary(t);
  let calls = 0;
  const service = createBingService({ cacheDir, fetchImpl: async () => { calls++; await new Promise((r) => setTimeout(r, 30)); return Response.json(sample()); } });
  const results = await Promise.all(Array.from({ length: 5 }, () => service.archive('zh-CN')));
  assert.equal(calls, 2);
  assert.equal(results[0].images.length, 1);
  assert.equal((await service.archive('zh-CN')).cache, 'hit');
  assert.equal(calls, 2);
});

test('two overlapping archive pages merge into fifteen dated images with recent-page precedence', async (t) => {
  const cacheDir = await temporary(t);
  const requests = [];
  const service = createBingService({ cacheDir, fetchImpl: async (url, options) => {
    requests.push({ url: new URL(url), signal: options.signal });
    const offset = Number(url.searchParams.get('idx'));
    const page = archivePage(offset);
    if (offset === 7) page.images[0].title = '较早批次的过时标题';
    else await new Promise((resolve) => setTimeout(resolve, 10));
    return Response.json({ images: page.images.reverse() });
  } });
  const result = await service.archive('zh-CN');
  assert.equal(result.images.length, 15);
  assert.equal(result.windowDays, 15);
  assert.deepEqual(result.images.map((item) => item.id), Array.from({ length: 15 }, (_, i) => `OHR.Day${i}_ZH-CN123`));
  assert.equal(result.images[0].date, '2026-10-07');
  assert.equal(result.images.at(-1).date, '2026-09-23');
  assert.equal(result.images[7].title, '风景 7');
  assert.equal(result.images[7].credit, '© Photographer');
  assert.deepEqual(requests.map(({ url }) => [url.origin, url.pathname, url.searchParams.get('idx'), url.searchParams.get('n'), url.searchParams.get('mkt')]), [
    ['https://www.bing.com', '/HPImageArchive.aspx', '0', '8', 'zh-CN'],
    ['https://www.bing.com', '/HPImageArchive.aspx', '7', '8', 'zh-CN'],
  ]);
  assert.equal(requests[0].signal, requests[1].signal);
  const stored = JSON.parse(await readFile(join(cacheDir, 'archives', 'zh-CN.json'), 'utf8'));
  assert.deepEqual(stored.images, result.images);
  assert.equal(stored.windowDays, 15);
});

test('each archive page validates its eighth image and rejects duplicate IDs within that page', () => {
  const page = archivePage(0);
  assert.equal(normalizeArchive(page, 'zh-CN', 'now').images.length, 8);
  page.images[7].urlbase = 'https://example.org/th?id=OHR.Untrusted';
  assert.throws(() => normalizeArchive(page, 'zh-CN', 'now'));
  page.images[7] = page.images[0];
  assert.throws(() => normalizeArchive(page, 'zh-CN', 'now'));
});

test('merged archives are limited to the latest fifteen images even when pages do not overlap', async (t) => {
  const service = createBingService({ cacheDir: await temporary(t), fetchImpl: async (url) => Response.json(archivePage(url.searchParams.get('idx') === '0' ? 0 : 8)) });
  const result = await service.archive();
  assert.equal(result.images.length, 15);
  assert.equal(result.images.at(-1).id, 'OHR.Day14_ZH-CN123');
});

test('failure of the older page cannot replace a complete cached archive with a partial result', async (t) => {
  const cacheDir = await temporary(t);
  let failOlder = false;
  let now = Date.now();
  const calls = [];
  const service = createBingService({ cacheDir, now: () => now, fetchImpl: async (url) => {
    const offset = Number(url.searchParams.get('idx')); calls.push(offset);
    if (failOlder && offset === 7) return new Response('unavailable', { status: 503 });
    const page = archivePage(offset);
    if (failOlder) page.images[0].title = '不可提前提交的新标题';
    return Response.json(page);
  } });
  const first = await service.archive();
  const path = join(cacheDir, 'archives', 'zh-CN.json');
  const saved = await readFile(path, 'utf8');
  failOlder = true; calls.length = 0; now += 30000;
  const result = await service.archive('zh-CN', true);
  assert.equal(result.stale, true);
  assert.equal(result.cache, 'fallback');
  assert.deepEqual(result.images, first.images);
  assert.equal(await readFile(path, 'utf8'), saved);
  assert.deepEqual(calls, [0, 7, 7]);
});

test('an empty older page is rejected without writing a partial archive', async (t) => {
  const cacheDir = await temporary(t);
  const service = createBingService({ cacheDir, fetchImpl: async (url) => Response.json(url.searchParams.get('idx') === '0' ? archivePage(0) : { images: [] }) });
  await assert.rejects(() => service.archive(), (error) => error.status === 502);
  await assert.rejects(() => readFile(join(cacheDir, 'archives', 'zh-CN.json')), { code: 'ENOENT' });
});

test('a fresh legacy seven-image cache is upgraded online and preserved as stale when offline', async (t) => {
  const cacheDir = await temporary(t);
  await mkdir(join(cacheDir, 'archives'), { recursive: true });
  const path = join(cacheDir, 'archives', 'zh-CN.json');
  const legacy = normalizeArchive(archivePage(0, 7), 'zh-CN', new Date().toISOString());
  await writeFile(path, JSON.stringify(legacy));
  let calls = 0;
  const online = createBingService({ cacheDir, fetchImpl: async (url) => { calls++; return Response.json(archivePage(Number(url.searchParams.get('idx')))); } });
  const fresh = await online.archive();
  assert.equal(calls, 2); assert.equal(fresh.images.length, 15); assert.equal(fresh.stale, false);
  await writeFile(path, JSON.stringify(legacy));
  const offline = createBingService({ cacheDir, fetchImpl: async () => { throw new Error('offline'); } });
  const fallback = await offline.archive();
  assert.equal(fallback.stale, true); assert.equal(fallback.cache, 'fallback'); assert.equal(fallback.images.length, 7);
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), legacy);
});

test('metadata-only changes are committed even when image IDs do not change', async (t) => {
  const cacheDir = await temporary(t);
  let title = '旧标题';
  let now = Date.now();
  const service = createBingService({ cacheDir, now: () => now, fetchImpl: async () => Response.json(sample(title)) });
  await service.archive(); title = '新标题'; now += 30000;
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
  assert.equal(calls, 3);
  assert.ok(signals.every((signal) => signal === signals[0]));
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
  const html = await page.text();
  assert.equal(page.status, 200); assert.match(html, /每日一景/);
  assert.match(html, /最近十五日/);
  assert.match(html, /<a[^>]+href="https:\/\/github\.com\/oonecab\/daily-picture-web"[^>]+target="_blank"[^>]+rel="noopener noreferrer"[^>]*>GitHub/);
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
