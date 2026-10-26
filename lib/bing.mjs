import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { HttpError } from './errors.mjs';
import { createHistoryService } from './history.mjs';
import { syncOwnedIndex, DATA_REPOSITORY } from './owned-index.mjs';
import {createImageCache} from './image-cache.mjs';
import {MARKETS,validateMarket,marketHistoryDir} from './markets.mjs';
import {createImageReadPool} from './image-reads.mjs';
export { HttpError } from './errors.mjs';
export {MARKETS,validateMarket} from './markets.mjs';
export const SIZES = ['640x360', '1920x1080', 'UHD', '1080x1920'];
const ID_PATTERN = /^OHR\.[A-Za-z0-9_-]{1,180}$/;
const TTL = 15 * 60 * 1000;
const ARCHIVE_DAYS = 15;
const PAGE_SIZE = 8;

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

export function createBingService({ cacheDir, historyDir = join(cacheDir, 'history'), historyMode = 'local', historyRepository = DATA_REPOSITORY, fetchImpl = fetch, now = Date.now, onError = () => {},
  maxConcurrent = 4, maxQueued = 32, requestTimeoutMs = 20000, refreshCooldownMs = 30000 } = {}) {
  for (const [value, minimum] of [[maxConcurrent, 1], [maxQueued, 0], [requestTimeoutMs, 1], [refreshCooldownMs, 1]]) {
    if (!Number.isSafeInteger(value) || value < minimum) throw new TypeError('Invalid upstream resource limit.');
  }
  const archives = new Map();
  const inFlight = new Map();
  const lastRefresh = new Map();
  const queue = [];
  let active = 0;
  const imageCache=createImageCache({root:join(cacheDir,'images')});
  const ready = Promise.all(['archives', 'images'].map((name) => mkdir(join(cacheDir, name), { recursive: true })));

  async function upstream(url, limit, signal = AbortSignal.timeout(requestTimeoutMs)) {
    signal.throwIfAborted();
    if (active < maxConcurrent) active++;
    else {
      if (queue.length >= maxQueued) throw new HttpError(503, '图片服务繁忙，请稍后重试。');
      await new Promise((resolve, reject) => {
        const entry = { start() { signal.removeEventListener('abort', abort); active++; resolve(); } };
        function abort() { const index = queue.indexOf(entry); if (index >= 0) queue.splice(index, 1); reject(signal.reason); }
        queue.push(entry);
        signal.addEventListener('abort', abort, { once: true });
      });
    }
    try { signal.throwIfAborted(); return await fetchUpstream(url, limit, signal); }
    finally { active--; queue.shift()?.start(); }
  }

  async function fetchUpstream(url, limit, signal) {
    for (let attempt = 0; attempt < 2; attempt++) {
      signal.throwIfAborted();
      let response;
      try {
        response = await fetchImpl(url, {
          signal,
          redirect: 'error',
          headers: { 'User-Agent': 'DailyPictureWeb/1.1', Accept: '*/*' },
        });
      } catch (error) {
        if (attempt || signal.aborted) throw error;
        await delay(300, undefined, { signal });
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        if (!attempt && !signal.aborted && (response.status >= 500 || [408, 429].includes(response.status))) {
          await delay(300, undefined, { signal });
          continue;
        }
        throw Object.assign(new Error(`Upstream HTTP ${response.status}`), { upstreamStatus: response.status });
      }
      return { bytes: await readLimited(response, limit), type: response.headers.get('content-type') || '' };
    }
  }

  async function recentArchive(market = 'zh-CN', force = false) {
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
    const previous = lastRefresh.get(market);
    const remaining = previous ? refreshCooldownMs - (now() - previous.at) : 0;
    if (remaining > 0) {
      if (previous.error) throw previous.error;
      return { ...previous.result, cache: 'cooldown', retryAfter: Math.ceil(remaining / 1000) };
    }
    const attempt = { at: now() };
    lastRefresh.set(market, attempt);
    const task = (async () => {
      try {
        const signal = AbortSignal.timeout(requestTimeoutMs);
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
        if (error.status === 503) throw error;
        throw new HttpError(502, '暂时无法获取 Bing 图片，请检查网络后重试。');
      }
    })();
    inFlight.set(key, task);
    try { attempt.result = await task; return attempt.result; }
    catch (error) { attempt.error = error; throw error; }
    finally { inFlight.delete(key); }
  }

  async function image(id, size = '1920x1080') {
    validateImage(id, size);
    await ready;
    const key = `${id}_${size}.jpg`;
    const hit=await imageCache.get(key).catch(error=>{onError('image cache read',error);return null;});if(hit)return hit;
    if (inFlight.has(key)) return inFlight.get(key);
    const task = (async () => {
      const url = new URL('https://www.bing.com/th');
      url.search = new URLSearchParams({ id: key }).toString();
      try {
        const { bytes, type } = await upstream(url, 20 * 1024 * 1024);
        if (!type.startsWith('image/jpeg') || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('无效的 JPEG 响应。');
        await imageCache.put(key,bytes).catch(error=>onError('image cache',error));
        return bytes;
      } catch (error) { onError(`image ${id} ${size}`, error); if (error.status === 503) throw error; throw new HttpError(502, '这张图片暂时无法加载，请稍后重试。'); }
    })();
    inFlight.set(key, task);
    try { return await task; } finally { inFlight.delete(key); }
  }
  const histories=new Map(),indexingStates=new Map(),mediaReads=createImageReadPool();
  function historyFor(market='zh-CN') {
    validateMarket(market);
    if(!histories.has(market))histories.set(market,createHistoryService({market,historyDir:marketHistoryDir(historyDir,market),cacheDir,upstream,now,onError,mode:historyMode,imageCache,mediaReads}));
    return histories.get(market);
  }
  const history=historyFor();
  async function archive(market = 'zh-CN', force = false) {
    const result = await recentArchive(market, force);
    const target=historyFor(market);
    if(!indexingStates.has(market))indexingStates.set(market,{});
    const state=indexingStates.get(market);
    if (!result.stale && result.fetchedAt !== state.indexedAt) {
      try {
        if (!state.indexing) state.indexing = target.ingest(result).then(() => {state.indexedAt=result.fetchedAt;}).finally(() => {state.indexing=null;});
        await state.indexing;
        if(state.indexedAt !== result.fetchedAt) await target.ingest(result).then(()=>{state.indexedAt=result.fetchedAt;});
      }
      catch (error) { onError('history save', error); await target.markSyncError(); return {...result, historyWarning:'每日索引保存失败，请检查服务端存储。'}; }
    }
    return result;
  }
  const syncing=new Map();let allSync;
  function syncHistory(market='zh-CN') {
    const target=historyFor(market);
    if(!syncing.has(market))syncing.set(market,syncOwnedIndex({market,history:target,upstream,repository:historyRepository,now}).finally(()=>syncing.delete(market)));
    return syncing.get(market);
  }
  function syncAllHistory() {
    if(!allSync)allSync=(async()=>{
      const results=[];
      for(const market of Object.keys(MARKETS)) {
        try{results.push({market,...await syncHistory(market)});}
        catch(error){onError(`history sync ${market}`,error);await historyFor(market).markSyncError();results.push({market,error:'地区索引同步失败，请检查采集任务。'});}
      }
      return {markets:results,error:results.filter(r=>r.error).map(r=>`${MARKETS[r.market].label}：${r.error}`).join(' ')||null};
    })().finally(()=>{allSync=null;});
    return allSync;
  }
  return { archive, image, history, historyFor, syncHistory, syncAllHistory };
}
