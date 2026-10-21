import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { HttpError } from './errors.mjs';
import { inspectJpeg } from './jpeg.mjs';

export const HISTORY_SOURCE = Object.freeze({ name: 'npanuhin/Bing-Wallpaper-Archive',
  url: 'https://github.com/npanuhin/Bing-Wallpaper-Archive', firstMonth: '2024-04' });
const ORIGIN = 'https://bing.npanuhin.me';
const HOUR = 3600000;
const imageID = /^OHR\.[A-Za-z0-9_-]{1,180}$/;
function chinaToday(now) { return new Date(now() + 8 * HOUR).toISOString().slice(0, 10); }
export function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date;
}
function text(value, limit = 1000) { return typeof value === 'string' ? value.slice(0, limit) : ''; }
async function atomic(path, data) {
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(data)); await rename(temporary, path); }
  finally { await unlink(temporary).catch(() => {}); }
}
export function createHistoryService({ historyDir, cacheDir, upstream, now = Date.now, pruneImages, onError = () => {} }) {
  async function ready() { await mkdir(historyDir, { recursive: true }); }
  const flights = new Map(), attempts = new Map();
  let writes = Promise.resolve(), syncError = null;
  function validateMonth(month) {
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
      || month < HISTORY_SOURCE.firstMonth || month > chinaToday(now).slice(0, 7)) throw new HttpError(400, '请选择 2024 年 4 月至今的月份。');
  }
  function validateDate(date) {
    if (!validDate(date) || date > chinaToday(now)) throw new HttpError(400, '图片日期无效。');
    validateMonth(date.slice(0, 7));
  }
  async function readMonth(month) {
    await ready();
    try {
      const data = JSON.parse(await readFile(join(historyDir, `${month}.json`), 'utf8'));
      if (data.schemaVersion !== 1 || data.month !== month || !Array.isArray(data.images) || data.images.length > 31
        || !data.images.every(i => validDate(i.date) && i.date.startsWith(month) && imageID.test(i.id))) throw new Error('Invalid history file');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') return {schemaVersion:1, month, providerFetchedAt:null, providerMissing:false, images:[]};
      // History is durable data: never replace a damaged file with an empty index.
      onError('history read', error); throw new HttpError(500, '历史索引无法读取，请检查服务端存储。');
    }
  }
  function transaction(month, update) {
    const task = writes.then(async () => {
      const data = await readMonth(month);
      await update(data);
      data.images.sort((a,b) => b.date.localeCompare(a.date));
      await atomic(join(historyDir, `${month}.json`), data);
      return data;
    });
    writes = task.catch(() => {});
    return task;
  }
  function coalesce(key, work) {
    if (flights.has(key)) return flights.get(key);
    const promise = work().finally(() => flights.delete(key));
    flights.set(key, promise); return promise;
  }
  function normalize(rows, month) {
    if (!Array.isArray(rows) || rows.length > 31) throw new Error('归档列表无效。');
    const dates = new Set();
    return rows.map(row => {
      validateDate(row?.date);
      if (!row.date.startsWith(month) || dates.has(row.date) || row.url !== `${ORIGIN}/CN/zh/${row.date}.jpg`) throw new Error('归档日期或来源无效。');
      dates.add(row.date);
      let id = `OHR.HistoryCN_${row.date.replaceAll('-', '')}`;
      if (row.bing_url) {
        const url = new URL(row.bing_url);
        if (url.protocol !== 'https:' || !['bing.com','www.bing.com','cn.bing.com'].includes(url.hostname) || url.pathname !== '/th' || url.port || url.username || url.password) throw new Error('原图地址无效。');
        const candidate = (url.searchParams.get('id') || '').replace(/_(?:\d+x\d+|UHD)\.jpg$/i, '');
        if (!imageID.test(candidate)) throw new Error('原图标识无效。');
        id = candidate;
      }
      return {id, date:row.date, market:'zh-CN', history:true, title:text(row.caption || row.title,300) || '每日风景',
        description:text(row.description || row.title,5000), credit:text(row.copyright) || '版权信息未提供',
        copyright:text(row.copyright), sourceUrl:HISTORY_SOURCE.url, source:'npanuhin', snapshot:true,
        availability:{status:'unchecked'}};
    });
  }
  function result(data, stale = false, warning = null) { return {...data, market:'zh-CN', source:HISTORY_SOURCE, stale, warning}; }
  async function month(month, force = false) {
    validateMonth(month);
    return coalesce(`month:${month}`, async () => {
      const cached = await readMonth(month);
      const age = now() - Date.parse(cached.providerFetchedAt);
      const ttl = month === chinaToday(now).slice(0,7) ? HOUR : 24 * HOUR;
      if (!force && age >= 0 && age < ttl) return result(cached);
      const previous = attempts.get(month);
      if (previous && now() - previous.at < 60000) {
        if (previous.error && !cached.images.length && !cached.providerFetchedAt) throw previous.error;
        return result(cached, Boolean(previous.error), previous.error?.message);
      }
      const attempt = {at:now()}; attempts.set(month, attempt);
      try {
        let rows, missing = false;
        try {
          const {bytes} = await upstream(new URL(`${ORIGIN}/CN-zh.${month.replace('-', '.')}.json`), 1024 * 1024);
          rows = normalize(JSON.parse(bytes.toString('utf8')), month);
        } catch (error) { if (error.upstreamStatus !== 404) throw error; rows=[]; missing=true; }
        const data = await transaction(month, data => {
          const byDate = new Map(data.images.map(i=>[i.date,i]));
          for (const row of rows) {
            const old = byDate.get(row.date);
            byDate.set(row.date, old?.source === 'bing' ? {...old,snapshot:old.id === row.id}
              : {...row, availability:old?.id === row.id ? old.availability : row.availability});
          }
          data.images = [...byDate.values()];
          data.providerFetchedAt = new Date(now()).toISOString(); data.providerMissing = missing;
        });
        return result(data);
      } catch (error) {
        onError(`history month ${month}`, error);
        attempt.error = new HttpError(error.status === 503 ? 503 : 502, '历史归档暂时不可用，请稍后重试。');
        if (cached.images.length || cached.providerFetchedAt) return result(cached, true, '历史归档暂时不可用，正在显示本地保存的索引。');
        throw attempt.error;
      }
    });
  }
  async function ingest(archive) {
    const grouped = new Map();
    for (const item of archive.images) {
      if (item.market !== 'zh-CN') continue;
      validateDate(item.date);
      if (!imageID.test(item.id)) throw new Error('Invalid daily image ID');
      const key=item.date.slice(0,7);
      if (!grouped.has(key)) grouped.set(key,[]);
      grouped.get(key).push(item);
    }
    for (const [month, items] of grouped) await transaction(month, data => {
      const byDate = new Map(data.images.map(i=>[i.date,i]));
      for (const item of items) {
        const old=byDate.get(item.date);
        byDate.set(item.date,{...item,history:true,source:'bing',snapshot:old?.snapshot === true && old.id === item.id,
          availability:old?.id === item.id ? old.availability : {status:'unchecked'}});
      }
      data.images=[...byDate.values()];
    });
    await ready();
    await atomic(join(historyDir,'sync.json'),{lastSuccessAt:new Date(now()).toISOString()});
    syncError=null;
  }
  async function catalog() {
    const latest = chinaToday(now).slice(0,7), months=[];
    for (let year=2024;year<=Number(latest.slice(0,4));year++) for(let m=1;m<=12;m++) {
      const value=`${year}-${String(m).padStart(2,'0')}`;
      if(value>=HISTORY_SOURCE.firstMonth && value<=latest) months.unshift(value);
    }
    let sync={lastSuccessAt:null};
    try { sync=JSON.parse(await readFile(join(historyDir,'sync.json'),'utf8')); } catch { /* First run. */ }
    return {market:'zh-CN',months,source:HISTORY_SOURCE,sync:{...sync,error:syncError},latest};
  }
  async function availability(date, value, id) {
    await transaction(date.slice(0,7), data => {
      const item=data.images.find(i=>i.date===date);
      if(item?.id === id) item.availability={...value,checkedAt:new Date(now()).toISOString()};
    });
  }
  async function image(date, expectedId) {
    validateDate(date);
    if(expectedId != null && !imageID.test(expectedId)) throw new HttpError(400,'图片标识无效。');
    return coalesce(`image:${date}:${expectedId || 'current'}`, async () => {
      // A valid date alone is not permission to proxy an image; an indexed row is required.
      const data=await readMonth(date.slice(0,7));
      const item=data.images.find(i=>i.date===date);
      if(!item || (expectedId && expectedId !== item.id)) throw new HttpError(404,'图片索引未找到或已更新，请重新打开对应月份。');
      const path=join(cacheDir,'images',`history_CN_${date}_${item.id}_${item.snapshot ? 'archive' : 'bing'}.jpg`);
      try { const bytes=await readFile(path); inspectJpeg(bytes); return bytes; } catch { /* Recheck missing/corrupt cache. */ }
      if(['unavailable','error'].includes(item.availability?.status) && now()-Date.parse(item.availability.checkedAt)<60000) throw new HttpError(502,'这张旧图暂时不可用，请稍后重试。');
      try {
        let bytes;
        if(item.snapshot) {
          const response=await upstream(new URL(`${ORIGIN}/CN/zh/${date}.jpg`),20*1024*1024);
          if(!response.type.startsWith('image/jpeg')) throw new Error('归档未返回 JPEG 图片。');
          bytes=response.bytes;
        } else {
          const url=new URL('https://www.bing.com/th');
          url.search=new URLSearchParams({id:`${item.id}_UHD.jpg`}).toString();
          const response=await upstream(url,20*1024*1024);
          if(!response.type.startsWith('image/jpeg')) throw new Error('Bing 未返回 JPEG 图片。');
          bytes=response.bytes;
        }
        const dimensions=inspectJpeg(bytes);
        await mkdir(join(cacheDir,'images'),{recursive:true});
        const temporary=`${path}.${crypto.randomUUID()}.tmp`;
        try {await writeFile(temporary,bytes);await rename(temporary,path);} finally {await unlink(temporary).catch(()=>{});}
        await availability(date,{status:'available',...dimensions},item.id);
        await pruneImages();
        return bytes;
      } catch(error) {
        onError(`history image ${date}`,error);
        const transient=error.status===503 || error.upstreamStatus>=500 || [408,429].includes(error.upstreamStatus) || error.name==='TimeoutError' || error.name==='AbortError' || error instanceof TypeError;
        await availability(date,{status:transient?'error':'unavailable'},item.id);
        throw new HttpError(error.status===503?503:502,'这张旧图暂时不可用，索引仍保留，可稍后重试。');
      }
    });
  }
  return {catalog,month,ingest,image,markSyncError(){syncError='每日索引同步失败，服务将在下一轮重试。';}};
}

export function startHistoryCollector({collect,onError=()=>{},intervalMs=3600000,setTimer=setTimeout,clearTimer=clearTimeout}) {
  let stopped=false,timer;
  const done=(async function run(){
    try {await collect();} catch(error){onError(error);}
    if(!stopped){timer=setTimer(run,intervalMs);timer.unref?.();}
  })();
  return {done,stop(){stopped=true;if(timer)clearTimer(timer);}};
}
