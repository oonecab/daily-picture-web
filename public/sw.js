const VERSION = 'daily-picture-v1';
const SHELL = `${VERSION}-shell-1.1.1`;
const DATA = `${VERSION}-data`;
const IMAGES = `${VERSION}-images`;
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/icon.svg', '/manifest.webmanifest'];
const IMAGE_COUNT = 80;
const IMAGE_BYTES = 64 * 1024 * 1024;
let imageWrites = Promise.resolve();

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('daily-picture-') && ![SHELL, DATA, IMAGES].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function archive(request) {
  const url = new URL(request.url);
  url.searchParams.delete('refresh');
  const key = url.href;
  const cache = await caches.open(DATA);
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error('Archive unavailable');
    await cache.put(key, response.clone()).catch(() => {});
    return response;
  } catch {
    const cached = await cache.match(key);
    if (cached) {
      const data = await cached.json();
      return Response.json({ ...data, stale: true, cache: 'browser-offline', warning: '离线浏览：正在显示上次成功更新的图片。' });
    }
    return Response.json({ error: '离线状态下尚无此地区的图片，请联网后重试。' }, { status: 503 });
  }
}
async function saveImage(cache, key, response) {
  const blob = await response.blob();
  if (blob.size > IMAGE_BYTES) throw new Error('Image exceeds offline budget');
  const entries = [];
  for (const request of await cache.keys()) {
    if (request.url === key) continue;
    const cached = await cache.match(request);
    if (!cached) continue;
    const header = cached.headers.get('Content-Length');
    const declared = header === null ? NaN : Number(header);
    const bytes = Number.isSafeInteger(declared) && declared >= 0 ? declared : (await cached.blob()).size;
    entries.push({ request, bytes });
  }
  let bytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  while (entries.length >= IMAGE_COUNT || bytes + blob.size > IMAGE_BYTES) {
    const oldest = entries.shift();
    if (!oldest) break;
    await cache.delete(oldest.request); bytes -= oldest.bytes;
  }
  const headers = new Headers(response.headers);
  headers.set('Content-Length', String(blob.size));
  const copy = () => new Response(blob, { status: response.status, statusText: response.statusText, headers });
  try { await cache.put(key, copy()); }
  catch (error) {
    if (error.name !== 'QuotaExceededError') throw error;
    // Browser quota is shared with other storage and may be smaller than our budget.
    const evict = entries.slice(0, Math.max(8, Math.ceil(entries.length / 4)));
    for (const entry of evict) await cache.delete(entry.request);
    await cache.put(key, copy());
  }
}
async function image(request, event) {
  const url = new URL(request.url);
  url.searchParams.delete('download');
  const key = url.href;
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response.ok && response.headers.get('Content-Type')?.startsWith('image/')) {
      const copy = response.clone();
      imageWrites = imageWrites.then(() => saveImage(cache, key, copy)).catch(async () => {
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) client.postMessage({ type: 'offline-cache-unavailable' });
      }).catch(() => {});
      event.waitUntil(imageWrites);
    }
    return response;
  } catch { return new Response('', { status: 503 }); }
}
async function shell(request) {
  const cache = await caches.open(SHELL);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (request.signal?.aborted) abort();
  else request.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 5000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.status >= 500) throw new Error('App shell unavailable');
    if (response.ok) await cache.put(request, response.clone()).catch(() => {});
    controller.signal.throwIfAborted();
    return response;
  } catch { return await cache.match(request) || (request.mode === 'navigate' ? await cache.match('/') : null) || new Response('', { status: 503 }); }
  finally { clearTimeout(timeout); request.signal?.removeEventListener('abort', abort); }
}
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/api/archive') event.respondWith(archive(event.request));
  else if (url.pathname === '/api/image') event.respondWith(image(event.request, event));
  else if (ASSETS.includes(url.pathname)) event.respondWith(shell(event.request));
});
