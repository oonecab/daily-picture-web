import { mkdir, readFile, writeFile, rename, unlink, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { HttpError } from './errors.mjs';
import { inspectJpeg } from './jpeg.mjs';
import { createMediaStore, MEDIA_SIZES } from './media.mjs';
import {createImageCache} from './image-cache.mjs';
import {bingImageUrl,bingImageCandidates,validateRemoteJpeg} from './bing-images.mjs';
import {createHash} from 'node:crypto';

export const HISTORY_SOURCE = Object.freeze({ name: 'npanuhin/Bing-Wallpaper-Archive',
  url: 'https://github.com/npanuhin/Bing-Wallpaper-Archive', firstMonth: '2024-04' });
export const HISTORY_SOURCES = Object.freeze([
  Object.freeze({id:'npanuhin',...HISTORY_SOURCE}),
  Object.freeze({id:'zxyongyo',name:'zxyongyo/bing-daily-wallpaper',url:'https://github.com/zxyongyo/bing-daily-wallpaper',firstMonth:'2018-09'}),
]);
const FIRST_MONTH = '2018-09';
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
function transientFailure(error) {
  return error.status===503 || error.upstreamStatus>=500 || [408,429].includes(error.upstreamStatus)
    || error.name==='TimeoutError' || error.name==='AbortError' || error instanceof TypeError;
}
function bingReference(value) {
  const url=new URL(value);
  if(url.protocol!=='https:' || !['bing.com','www.bing.com','cn.bing.com'].includes(url.hostname)
    || url.pathname!=='/th' || url.port || url.username || url.password || url.searchParams.getAll('id').length!==1) throw new Error('原图地址无效。');
  const match=/^(OHR\.[A-Za-z0-9_-]{1,180})_(UHD|\d+x\d+)\.jpg$/i.exec(url.searchParams.get('id'));
  if(!match || !imageID.test(match[1])) throw new Error('原图标识无效。');
  return {id:match[1],variant:match[2]};
}
function publicationTime(value) {
  if(!/^\d{12}$/.test(value || ''))return 0;
  const iso=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(8,10)}:${value.slice(10,12)}:00.000Z`;
  const time=Date.parse(iso);
  return Number.isFinite(time) && new Date(time).toISOString()===iso ? time : 0;
}
function newerBing(old,row) {
  const oldPublication=publicationTime(old.fullStartDate),newPublication=publicationTime(row.fullStartDate);
  if(oldPublication && newPublication && oldPublication!==newPublication)return newPublication>oldPublication;
  // Legacy rows lack observedAt, but cannot have been observed before publication.
  const oldObservation=Date.parse(old.observedAt)||oldPublication,newObservation=Date.parse(row.observedAt)||newPublication;
  if(oldObservation!==newObservation)return newObservation>oldObservation;
  // Equal/unknown versions may refresh metadata, but must not oscillate between IDs.
  return old.id===row.id;
}
function mergeImage(old, row) {
  if(!old) return row;
  const rank={bing:3,npanuhin:2,zxyongyo:1};
  const winner=old.source==='bing' && row.source==='bing' ? (newerBing(old,row)?row:old)
    : (rank[old.source] || 0)>(rank[row.source] || 0) ? old : row;
  if(old.id!==row.id) return winner;
  return {...winner,...(winner.source==='bing' ? {fullStartDate:publicationTime(winner.fullStartDate)?winner.fullStartDate:old.fullStartDate || row.fullStartDate || null}:{}),
    snapshot:old.snapshot===true || row.snapshot===true,
    sources:[...new Set([...(old.sources || [old.source]),...(row.sources || [row.source])])],
    ...(row.bingVariant || old.bingVariant ? {bingVariant:row.bingVariant || old.bingVariant} : {}),
    ...(old.delivery||row.delivery?{delivery:old.delivery||row.delivery}:{}),
    availability:old.availability || row.availability};
}
async function atomic(path, data) {
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(data)); await rename(temporary, path); }
  finally { await unlink(temporary).catch(() => {}); }
}
export function createHistoryService({ historyDir, cacheDir, upstream, now = Date.now, onError = () => {}, mode = 'local', imageCache=createImageCache({root:join(cacheDir,'images')}) }) {
  if(!['local','import'].includes(mode))throw new TypeError('Invalid history mode');
  const media=createMediaStore({root:join(historyDir,'media')});
  async function ready() { await mkdir(historyDir, { recursive: true }); }
  const flights = new Map(), attempts = new Map();
  let writes = Promise.resolve(), syncError = null;
  function validateMonth(month) {
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
      || month < FIRST_MONTH || month > chinaToday(now).slice(0, 7)) throw new HttpError(400, '请选择 2018 年 9 月至今的月份。');
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
      // Additive schema: existing indexes keep their original provider freshness.
      data.providers ||= data.providerFetchedAt ? {npanuhin:{fetchedAt:data.providerFetchedAt,missing:data.providerMissing}} : {};
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') return {schemaVersion:1, month, providerFetchedAt:null, providerMissing:false, providers:{}, images:[]};
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
  async function fetchMonth(provider,month) {
    if(provider.id==='npanuhin') return {...await upstream(new URL(`${ORIGIN}/CN-zh.${month.replace('-', '.')}.json`),1024*1024),transport:'archive'};
    const path=`archives/${month.slice(0,4)}/${month}/${month}.json`;
    const deadline=AbortSignal.timeout(20000);
    try {
      const response=await upstream(new URL(`https://raw.githubusercontent.com/zxyongyo/bing-daily-wallpaper/master/${path}`),1024*1024,
        AbortSignal.any([deadline,AbortSignal.timeout(8000)]));
      return {...response,transport:'raw'};
    } catch(error) {
      // Keep capacity errors, explicit missing files and invalid data explicit.
      // Only transport/transient failures can try the same file on GitHub's API.
      if(!transientFailure(error) || error.status===503 || deadline.aborted) throw error;
      const {bytes}=await upstream(new URL(`https://api.github.com/repos/zxyongyo/bing-daily-wallpaper/contents/${path}?ref=master`),1024*1024,deadline);
      const file=JSON.parse(bytes.toString('utf8'));
      if(file.type!=='file' || file.encoding!=='base64' || file.path!==path || typeof file.content!=='string'
        || !Number.isInteger(file.size) || file.size<0 || file.size>1024*1024) throw new Error('GitHub 文件响应无效。');
      const content=Buffer.from(file.content,'base64');
      if(content.length!==file.size) throw new Error('GitHub 文件长度无效。');
      return {bytes:content,transport:'github-api'};
    }
  }
  function normalize(rows, month, provider) {
    if (!Array.isArray(rows) || rows.length > 31) throw new Error('归档列表无效。');
    const dates = new Set();
    return rows.map(row => {
      validateDate(row?.date);
      if (!row.date.startsWith(month) || dates.has(row.date)) throw new Error('归档日期无效。');
      dates.add(row.date);
      let id = `OHR.HistoryCN_${row.date.replaceAll('-', '')}`;
      let bingVariant;
      if(provider.id==='npanuhin') {
        if(row.url!==`${ORIGIN}/CN/zh/${row.date}.jpg`) throw new Error('归档来源无效。');
        if(row.bing_url) id=bingReference(row.bing_url).id;
      } else {
        const reference=bingReference(row.url_4k || row.url_1080);
        id=reference.id;
        if(!['UHD','1920x1080'].includes(reference.variant)) throw new Error('原图尺寸标识无效。');
        bingVariant=reference.variant;
        for(const value of [row.url_1080,row.url_preview].filter(Boolean)) if(bingReference(value).id!==id) throw new Error('同日图片标识不一致。');
      }
      return {id, date:row.date, market:'zh-CN', history:true, title:text(row.caption || row.title,300) || '每日风景',
        description:text(row.description || row.title,5000), credit:text(row.copyright) || '版权信息未提供',
        copyright:text(row.copyright), sourceUrl:provider.url, source:provider.id, sources:[provider.id], snapshot:provider.id==='npanuhin',
        ...(bingVariant ? {bingVariant} : {}),
        availability:{status:'unchecked'}};
    });
  }
  function result(data, stale = false, warning = null) { return {...data, market:'zh-CN', source:HISTORY_SOURCE, sources:HISTORY_SOURCES, stale, warning}; }
  async function month(month, force = false) {
    validateMonth(month);
    if(mode==='local') {
      const data=await readMonth(month);
      const imported=Boolean(data.importedAt || data.images.length);
      return {...result(data,false,imported?null:'这个月份尚未导入到本站图库。'),imported};
    }
    return coalesce(`month:${month}`, async () => {
      const cached = await readMonth(month);
      const providers=HISTORY_SOURCES.filter(p=>month>=p.firstMonth);
      const ttl = month === chinaToday(now).slice(0,7) ? HOUR : 24 * HOUR;
      const responses=await Promise.all(providers.map(async provider=>{
        const age=now()-Date.parse(cached.providers[provider.id]?.fetchedAt);
        const key=`${month}:${provider.id}`,previous=attempts.get(key);
        if(previous && now()-previous.at<60000) return {provider,cached:true,error:previous.error};
        if(!force && age>=0 && age<ttl) return {provider,cached:true};
        const attempt={at:now()};attempts.set(key,attempt);
        try {
          const {bytes,transport}=await fetchMonth(provider,month);
          return {provider,rows:normalize(JSON.parse(bytes.toString('utf8')),month,provider),missing:false,transport};
        } catch(error) {
          if(error.upstreamStatus===404) return {provider,rows:[],missing:true};
          onError(`history ${provider.id} ${month}`,error);
          attempt.error=new HttpError(error.status===503?503:502,'历史归档暂时不可用，请稍后重试。');
          return {provider,error:attempt.error};
        }
      }));
      const updates=responses.filter(r=>r.rows);
      const data=updates.length ? await transaction(month,data=>{
          const byDate = new Map(data.images.map(i=>[i.date,i]));
          for(const {provider,rows,missing,transport} of updates) {
            for(const row of rows) byDate.set(row.date,mergeImage(byDate.get(row.date),row));
            data.providers[provider.id]={fetchedAt:new Date(now()).toISOString(),missing,...(transport?{transport}:{})};
          }
          data.images = [...byDate.values()];
          data.providerFetchedAt=new Date(now()).toISOString();
          data.providerMissing=providers.every(p=>data.providers[p.id]?.missing===true);
          if(!responses.some(r=>r.error))data.importedAt=new Date(now()).toISOString();
        }) : cached;
      const error=responses.find(r=>r.error)?.error;
      // A missing source plus a failed source is not evidence of an empty month.
      if(error && !data.images.length && !providers.some(p=>data.providers[p.id]?.missing===false)) throw error;
      return result(data,Boolean(error),error ? '部分历史归档暂时不可用，正在显示已获取或保存的索引。' : null);
    });
  }
  async function ingest(archive) {
    const grouped = new Map(),dates=new Set(),selected=[];
    const observedAt=archive.fetchedAt || new Date(now()).toISOString();
    if(!Number.isFinite(Date.parse(observedAt)) || Date.parse(observedAt)>now()+300000)throw new Error('Invalid daily collection time');
    for (const item of archive.images) {
      if (item.market !== 'zh-CN') continue;
      validateDate(item.date);
      if (!imageID.test(item.id)) throw new Error('Invalid daily image ID');
      // The Bing adapter orders same-day publications newest first.
      if(dates.has(item.date))continue;
      dates.add(item.date);
      const key=item.date.slice(0,7);
      if (!grouped.has(key)) grouped.set(key,[]);
      let sourceUrl='https://www.bing.com';
      try {const url=new URL(item.sourceUrl);if(url.protocol==='https:' && ['www.bing.com','cn.bing.com'].includes(url.hostname) && !url.username && !url.password && !url.port)sourceUrl=url.href;}catch{}
      grouped.get(key).push({id:item.id,date:item.date,market:'zh-CN',title:text(item.title,300),description:text(item.description),
        copyright:text(item.copyright),credit:text(item.credit),sourceUrl,originalDate:text(item.originalDate,8)||null,
        fullStartDate:publicationTime(item.fullStartDate)?item.fullStartDate:null,observedAt,wallpaper:item.wallpaper===true});
    }
    for (const [month, items] of grouped) await transaction(month, data => {
      const byDate = new Map(data.images.map(i=>[i.date,i]));
      for (const item of items) {
        const old=byDate.get(item.date);
        byDate.set(item.date,mergeImage(old,{...item,history:true,source:'bing',sources:['bing'],snapshot:false,
          availability:{status:'unchecked'}}));
        selected.push(byDate.get(item.date));
      }
      data.images=[...byDate.values()];
    });
    await ready();
    await recordSync({lastSuccessAt:new Date(now()).toISOString(),lastIndexFetchedAt:archive.fetchedAt || null});
    syncError=null;
    return selected;
  }
  async function pendingImages({excludeDates=[],limit=15}={}) {
    if(!Number.isSafeInteger(limit) || limit<0 || limit>31)throw new TypeError('Invalid retry batch limit');
    await ready();
    const excluded=new Set(excludeDates),pending=[];
    for(const name of await readdir(historyDir)) {
      if(!/^\d{4}-\d{2}\.json$/.test(name))continue;
      const month=name.slice(0,7);validateMonth(month);
      for(const item of (await readMonth(month)).images) {
        if(item.source==='bing' && item.availability?.thumbnailStored!==true) {
          pending.push({date:item.date,id:item.id,checkedAt:item.availability?.checkedAt || null});
        }
      }
    }
    // Least recently attempted first: one permanently missing image cannot starve the rest.
    pending.sort((a,b)=>(Date.parse(a.checkedAt)||0)-(Date.parse(b.checkedAt)||0) || a.date.localeCompare(b.date));
    return {total:pending.length,images:pending.filter(item=>!excluded.has(item.date)).slice(0,limit)};
  }
  function recordSync(values) {
    const task=writes.then(async()=>{
      await ready();let previous={};
      try {previous=JSON.parse(await readFile(join(historyDir,'sync.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
      await atomic(join(historyDir,'sync.json'),{...previous,...values});
    });
    writes=task.catch(()=>{});return task;
  }
  async function catalog() {
    const latest = chinaToday(now).slice(0,7), months=[];
    for (let year=2018;year<=Number(latest.slice(0,4));year++) for(let m=1;m<=12;m++) {
      const value=`${year}-${String(m).padStart(2,'0')}`;
      if(value>=FIRST_MONTH && value<=latest) months.unshift(value);
    }
    let sync={lastSuccessAt:null};
    try { sync=JSON.parse(await readFile(join(historyDir,'sync.json'),'utf8')); } catch { /* First run. */ }
    return {market:'zh-CN',months,source:HISTORY_SOURCE,sources:HISTORY_SOURCES,firstMonth:FIRST_MONTH,sync:{...sync,error:syncError || sync.error || null},latest};
  }
  async function availability(date, value, id) {
    await transaction(date.slice(0,7), data => {
      const item=data.images.find(i=>i.date===date);
      if(item?.id === id) item.availability={...value,checkedAt:new Date(now()).toISOString()};
    });
  }
  async function imageItem(date,expectedId,size) {
    validateDate(date);
    if(!MEDIA_SIZES.includes(size)||(expectedId!=null&&!imageID.test(expectedId)))throw new HttpError(400,'图片标识或尺寸无效。');
    const item=(await readMonth(date.slice(0,7))).images.find(i=>i.date===date);
    if(!item||(expectedId&&item.id!==expectedId))throw new HttpError(404,'图片索引未找到或已更新，请重新打开对应月份。');
    return item;
  }
  function useLocal(item){return item.delivery?.mode==='local'||(!item.delivery&&item.availability?.stored===true)||item.id.startsWith('OHR.HistoryCN_');}
  async function remoteImage(date,expectedId,size='original') {
    const item=await imageItem(date,expectedId,size);
    return size==='thumb'||useLocal(item)||mode==='import'?null:bingImageUrl(item,size).href;
  }
  async function saveThumbnail(date,expectedId) {
    return coalesce(`thumb:${date}:${expectedId||'current'}`,async()=>{
      const item=await imageItem(date,expectedId,'thumb');
      let thumb=await media.get(item,'thumb'),manifest=await media.manifest(item);
      const mark=async()=>availability(date,{...item.availability,status:'available',thumbnailStored:true,stored:Boolean(manifest?.files.original)},item.id);
      if(thumb){await mark();return thumb;}
      if(['unavailable','error'].includes(item.availability?.status)&&now()-Date.parse(item.availability.checkedAt)<60000)throw new HttpError(502,'缩略图暂时不可用，请稍后重试。');
      try{
        let bytes=await media.get(item,'original');
        if(!bytes){
          const signal=AbortSignal.timeout(20000);let last,transient;
          for(const url of bingImageCandidates(item,'thumb')){
            try{const response=await upstream(url,20*1024*1024,signal);await validateRemoteJpeg(response);bytes=response.bytes;break;}
            catch(e){last=e;if(transientFailure(e))transient=e;if(signal.aborted||e.status===503)break;}
          }
          if(!bytes)throw transient||last||new Error('缩略图来源不可用。');
        }
        manifest=await media.put(item,bytes,{thumbnailOnly:true});await mark();return await media.get(item,'thumb');
      }catch(error){
        await availability(date,{...item.availability,status:transientFailure(error)?'error':'unavailable',thumbnailStored:false},item.id);
        throw error;
      }
    });
  }
  async function hybridImage(item,size) {
    if(size==='thumb'||useLocal(item)){
      const hit=await media.get(item,size);if(hit)return hit;
      const original=await media.get(item,'original');
      if(original){await media.put(item,original,{thumbnailOnly:size==='thumb'});return await media.get(item,size);}
      if(size==='thumb')throw new HttpError(404,'这张缩略图尚未保存，可稍后重试。');
    }
    return coalesce(`remote:${item.date}:${item.id}:${size}`,async()=>{
      const signal=AbortSignal.timeout(20000);let last;
      for(const url of bingImageCandidates(item,size)){
        const key=`remote_${createHash('sha256').update(url.href).digest('hex')}.jpg`;
        try{
          const cached=await imageCache.get(key).catch(error=>{onError('history image cache read',error);return null;});if(cached){try{inspectJpeg(cached);return cached;}catch{/* Refetch the same variant if a cache file is damaged. */}}
          const response=await upstream(url,20*1024*1024,signal);await validateRemoteJpeg(response);
          await imageCache.put(key,response.bytes).catch(error=>onError('history image cache',error));
          return response.bytes;
        }catch(error){last=error;if(signal.aborted||error.status===503)break;}
      }
      const fallback=await media.get(item,size);if(fallback)return fallback;
      onError('history remote image',last);throw new HttpError(last?.status===503?503:502,'Bing 暂时无法提供这张图片，可稍后重试。');
    });
  }
  async function saveImage(date, expectedId) {
    validateDate(date);
    if(expectedId != null && !imageID.test(expectedId)) throw new HttpError(400,'图片标识无效。');
    return coalesce(`save:${date}:${expectedId || 'current'}`, async () => {
      // A valid date alone is not permission to proxy an image; an indexed row is required.
      const data=await readMonth(date.slice(0,7));
      const item=data.images.find(i=>i.date===date);
      if(!item || (expectedId && expectedId !== item.id)) throw new HttpError(404,'图片索引未找到或已更新，请重新打开对应月份。');
      const owned=await media.get(item,'original');
      if(owned) {
        if(!await media.get(item,'thumb') || !await media.get(item,'preview'))await media.put(item,owned);
        await availability(date,{status:'available',...inspectJpeg(owned),stored:true},item.id);
        return owned;
      }
      const path=join(cacheDir,'images',`history_CN_${date}_${item.id}_${item.snapshot ? 'archive' : 'bing'}.jpg`);
      try {
        const bytes=await readFile(path);await media.put(item,bytes);
        await availability(date,{status:'available',...inspectJpeg(bytes),stored:true},item.id);return bytes;
      } catch { /* Recheck missing/corrupt cache. */ }
      if(['unavailable','error'].includes(item.availability?.status) && now()-Date.parse(item.availability.checkedAt)<60000) throw new HttpError(502,'这张旧图暂时不可用，请稍后重试。');
      try {
        const candidates=[];
        if(mode==='import' && item.snapshot) candidates.push(new URL(`${ORIGIN}/CN/zh/${date}.jpg`));
        if(!item.id.startsWith('OHR.HistoryCN_')) {
          const url=new URL('https://www.bing.com/th');
          url.search=new URLSearchParams({id:`${item.id}_UHD.jpg`}).toString();
          candidates.push(url);
          if(item.bingVariant==='1920x1080') {
            const recorded=new URL('https://cn.bing.com/th');
            recorded.search=new URLSearchParams({id:`${item.id}_1920x1080.jpg`,w:'3840',h:'2160',rs:'1',c:'4'}).toString();
            candidates.push(recorded);
          }
        }
        const signal=AbortSignal.timeout(20000);
        let bytes,dimensions,lastError,transientError;
        for(const url of candidates) {
          try {
            const response=await upstream(url,20*1024*1024,signal);
            if(!response.type.startsWith('image/jpeg')) throw new Error('来源未返回 JPEG 图片。');
            dimensions=inspectJpeg(response.bytes);
            await media.put(item,response.bytes);bytes=response.bytes;break;
          } catch(error) {lastError=error;if(transientFailure(error))transientError=error;if(signal.aborted)break;}
        }
        if(!bytes) throw transientError || lastError || new Error('图片来源无效。');
        await availability(date,{status:'available',...dimensions,stored:true},item.id);
        return bytes;
      } catch(error) {
        onError(`history image ${date}`,error);
        const transient=transientFailure(error);
        await availability(date,{status:transient?'error':'unavailable'},item.id);
        throw new HttpError(error.status===503?503:502,'这张旧图暂时不可用，索引仍保留，可稍后重试。');
      }
    });
  }
  async function image(date,expectedId,size='original') {
    validateDate(date);
    if(!MEDIA_SIZES.includes(size) || (expectedId!=null && !imageID.test(expectedId)))throw new HttpError(400,'图片标识或尺寸无效。');
    const item=(await readMonth(date.slice(0,7))).images.find(i=>i.date===date);
    if(!item || (expectedId && expectedId!==item.id))throw new HttpError(404,'图片索引未找到或已更新，请重新打开对应月份。');
    if(mode==='local')return hybridImage(item,size);
    const hit=await media.get(item,size);
    if(hit)return hit;
    const original=await media.get(item,'original');
    if(original) {await media.put(item,original);return media.get(item,size);}
    if(mode==='import') {await saveImage(date,expectedId);return media.get(item,size);}
    throw new HttpError(404,'这张图片尚未保存到本站图库，请稍后重试。');
  }
  return {catalog,month,ingest,image,saveImage,saveThumbnail,remoteImage,pendingImages,recordSync,markSyncError(){
    syncError='每日图库同步失败，服务将在下一轮重试。';
    return recordSync({error:syncError,lastFailureAt:new Date(now()).toISOString()}).catch(error=>onError('history sync state',error));
  }};
}

export function startHistoryCollector({collect,onError=()=>{},intervalMs=3600000,setTimer=setTimeout,clearTimer=clearTimeout}) {
  let stopped=false,timer;
  const done=(async function run(){
    try {await collect();} catch(error){await onError(error);}
    if(!stopped){timer=setTimer(run,intervalMs);timer.unref?.();}
  })();
  return {done,stop(){stopped=true;if(timer)clearTimer(timer);}};
}
