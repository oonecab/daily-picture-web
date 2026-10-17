import { mkdir, readFile, writeFile, rename, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

export const MARKETS = Object.freeze({
  'zh-CN': { label: '中国', timeZone: 'Asia/Shanghai' },
  'en-US': { label: '美国', timeZone: 'America/Los_Angeles' },
  'en-GB': { label: '英国', timeZone: 'Europe/London' },
  'ja-JP': { label: '日本', timeZone: 'Asia/Tokyo' },
  'de-DE': { label: '德国', timeZone: 'Europe/Berlin' },
  'fr-FR': { label: '法国', timeZone: 'Europe/Paris' },
});
export const SIZES = ['640x360', '1920x1080', 'UHD', '1080x1920'];
const ID_PATTERN = /^OHR\.[A-Za-z0-9_-]{1,180}$/;
const TTL = 15 * 60 * 1000;
const ARCHIVE_DAYS = 15;
const PAGE_SIZE = 8;

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function validateMarket(market) {
  if (!Object.hasOwn(MARKETS, market)) throw new HttpError(400, '不支持这个图片地区。');
  return market;
}

export function validateImage(id, size) {
  if (!ID_PATTERN.test(id || '') || !SIZES.includes(size)) throw new HttpError(400, '图片标识或分辨率无效。');
}

export function displayDate(item, market) {
  const raw = item.fullstartdate;
  if (/^\d{12}$/.test(raw || '')) {
    const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:00Z`;
    const time = new Date(iso);
    if (Number.isFinite(time.getTime())) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: MARKETS[market].timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(time);
    }
  }
  if (/^\d{8}$/.test(item.startdate || '')) return `${item.startdate.slice(0, 4)}-${item.startdate.slice(4, 6)}-${item.startdate.slice(6, 8)}`;
  throw new Error('Bing 返回了无效的图片日期。');
}

export function normalizeArchive(body, market, fetchedAt) {
  validateMarket(market);
  if (!Array.isArray(body.images) || body.images.length === 0) throw new Error('Bing 没有返回图片列表。');
  const seen = new Set();
  const images = body.images.slice(0, PAGE_SIZE).map((item) => {
    const url = new URL(item.urlbase || item.url, 'https://www.bing.com');
    if (url.hostname !== 'www.bing.com' || url.pathname !== '/th') throw new Error('Bing 返回了不支持的图片地址。');
    const id = (url.searchParams.get('id') || '').replace(/_(?:\d+x\d+|UHD)\.jpg$/i, '');
    validateImage(id, '1920x1080');
    if (seen.has(id)) throw new Error('Bing 返回了重复图片。');
    seen.add(id);
    const copyright = String(item.copyright || 'Bing 每日图片').slice(0, 1000);
    const creditStart = copyright.lastIndexOf('(©');
    let sourceUrl = 'https://www.bing.com';
    try {
      const source = new URL(item.copyrightlink);
      if (source.protocol === 'https:' && ['www.bing.com', 'cn.bing.com'].includes(source.hostname)) sourceUrl = source.href;
    } catch { /* Use the Bing homepage when attribution has no link. */ }
    return {
      id, market, date: displayDate(item, market),
      title: String(item.title || copyright.split('(')[0] || '每日风景').slice(0, 300),
      description: (creditStart > 0 ? copyright.slice(0, creditStart) : copyright).trim(),
      credit: creditStart >= 0 ? copyright.slice(creditStart).replace(/^\(|\)$/g, '') : 'Bing',
      copyright, sourceUrl,
      originalDate: item.startdate || null, fullStartDate: item.fullstartdate || null,
      wallpaper: item.wp === true,
    };
  });
  return { schemaVersion: 1, market, marketLabel: MARKETS[market].label, fetchedAt, images };
}

async function readLimited(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('上游响应过大。');
  }
  if (!response.body) throw new Error('上游响应为空。');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new Error('上游响应过大。');
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, length);
}

async function atomicWrite(path, data) {
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, data);
    await rename(temporary, path);
  } finally { await unlink(temporary).catch(() => {}); }
}

export function createBingService({ cacheDir, fetchImpl = fetch, now = Date.now, onError = () => {} } = {}) {
  const archives = new Map();
  const inFlight = new Map();
  let prunePromise;
  const ready = Promise.all(['archives', 'images'].map((name) => mkdir(join(cacheDir, name), { recursive: true })));

  async function upstream(url, limit, signal = AbortSignal.timeout(20000)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response;
      try {
        response = await fetchImpl(url, {
          signal,
          redirect: 'error',
          headers: { 'User-Agent': 'DailyPictureWeb/1.1', Accept: '*/*' },
        });
      } catch (error) {
        if (attempt || signal.aborted) throw error;
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        if (!attempt && !signal.aborted && (response.status >= 500 || [408, 429].includes(response.status))) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }
        throw new Error(`Bing HTTP ${response.status}`);
      }
      return { bytes: await readLimited(response, limit), type: response.headers.get('content-type') || '' };
    }
  }

  async function archive(market = 'zh-CN', force = false) {
    validateMarket(market);
    await ready;
    if (!archives.has(market)) {
      try {
        const saved = JSON.parse(await readFile(join(cacheDir, 'archives', `${market}.json`), 'utf8'));
        if (saved.schemaVersion === 1 && saved.market === market && saved.images?.length && Number.isFinite(Date.parse(saved.fetchedAt))) {
          for (const item of saved.images) validateImage(item.id, '1920x1080');
          archives.set(market, saved);
        }
      } catch { /* A missing or damaged cache must not block a fresh download. */ }
    }
    const cached = archives.get(market);
    if (!force && cached?.windowDays === ARCHIVE_DAYS && now() - Date.parse(cached.fetchedAt) < TTL) return { ...cached, stale: false, cache: 'hit' };
    const key = `archive:${market}`;
    if (inFlight.has(key)) return inFlight.get(key);
    const task = (async () => {
      try {
        const signal = AbortSignal.timeout(20000);
        const responses = await Promise.allSettled([0, 7].map(async (offset) => {
          const url = new URL('https://www.bing.com/HPImageArchive.aspx');
          url.search = new URLSearchParams({ format: 'js', idx: String(offset), n: String(PAGE_SIZE), mkt: market }).toString();
          const { bytes } = await upstream(url, 1024 * 1024, signal);
          return JSON.parse(bytes.toString('utf8'));
        }));
        const failed = responses.find((response) => response.status === 'rejected');
        if (failed) throw failed.reason;
        const fetchedAt = new Date(now()).toISOString();
        const pages = responses.map((response) => normalizeArchive(response.value, market, fetchedAt));
        const unique = new Map();
        // The newer page wins overlaps, regardless of which request finishes first.
        for (const page of pages) for (const item of page.images) if (!unique.has(item.id)) unique.set(item.id, item);
        const images = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date)
          || String(b.fullStartDate || '').localeCompare(String(a.fullStartDate || ''))).slice(0, ARCHIVE_DAYS);
        const result = { ...pages[0], windowDays: ARCHIVE_DAYS, images };
        // Commit only after both pages validate; image cache hits never suppress metadata updates.
        await atomicWrite(join(cacheDir, 'archives', `${market}.json`), JSON.stringify(result));
        archives.set(market, result);
        return { ...result, stale: false, cache: 'fresh' };
      } catch (error) {
        onError(`archive ${market}`, error);
        if (cached) return { ...cached, stale: true, cache: 'fallback', warning: '暂时无法连接 Bing，正在显示上次成功更新的图片。' };
        throw new HttpError(502, '暂时无法获取 Bing 图片，请检查网络后重试。');
      }
    })();
    inFlight.set(key, task);
    try { return await task; } finally { inFlight.delete(key); }
  }

  async function pruneImages() {
    const folder = join(cacheDir, 'images');
    const entries = (await readdir(folder)).filter((name) => name.endsWith('.jpg'));
    const files = await Promise.all(entries.map(async (name) => {
      try { const info = await stat(join(folder, name)); return { name, size: info.size, time: info.mtimeMs }; }
      catch { return null; }
    }));
    const sorted = files.filter(Boolean).sort((a, b) => b.time - a.time);
    let bytes = 0;
    await Promise.all(sorted.map(async (file, index) => {
      bytes += file.size;
      if (index >= 140 || bytes > 256 * 1024 * 1024) await unlink(join(folder, file.name)).catch(() => {});
    }));
  }

  async function image(id, size = '1920x1080') {
    validateImage(id, size);
    await ready;
    const key = `${id}_${size}.jpg`;
    const path = join(cacheDir, 'images', key);
    try {
      const bytes = await readFile(path);
      if (bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return bytes;
    } catch { /* Cache misses are fetched below. */ }
    if (inFlight.has(key)) return inFlight.get(key);
    const task = (async () => {
      const url = new URL('https://www.bing.com/th');
      url.search = new URLSearchParams({ id: key }).toString();
      try {
        const { bytes, type } = await upstream(url, 20 * 1024 * 1024);
        if (!type.startsWith('image/jpeg') || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('无效的 JPEG 响应。');
        await atomicWrite(path, bytes);
        if (!prunePromise) prunePromise = pruneImages().catch(() => {}).finally(() => { prunePromise = undefined; });
        return bytes;
      } catch (error) { onError(`image ${id} ${size}`, error); throw new HttpError(502, '这张图片暂时无法加载，请稍后重试。'); }
    })();
    inFlight.set(key, task);
    try { return await task; } finally { inFlight.delete(key); }
  }
  return { archive, image };
}
