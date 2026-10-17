const VERSION = 'daily-picture-v1';
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;
const IMAGES = `${VERSION}-images`;
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/icon.svg', '/manifest.webmanifest'];

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
      event.waitUntil((async () => {
        await cache.put(key, copy);
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - 80)).map((old) => cache.delete(old)));
      })().catch(() => {}));
    }
    return response;
  } catch { return new Response('', { status: 503 }); }
}
async function shell(request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch { return await cache.match(request) || (request.mode === 'navigate' ? await cache.match('/') : null) || new Response('', { status: 503 }); }
}
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/api/archive') event.respondWith(archive(event.request));
  else if (url.pathname === '/api/image') event.respondWith(image(event.request, event));
  else if (ASSETS.includes(url.pathname)) event.respondWith(shell(event.request));
});
