import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import sharp from 'sharp';
import {collectIndex} from '../tools/collect-index.mjs';
import {importHistory} from '../tools/import-history.mjs';
import {createBingService} from '../lib/bing.mjs';
import {createApp,startSavedHistoryCollector} from '../server.mjs';
import {jpeg} from './fixtures/jpeg.mjs';

const clock=Date.parse('2026-10-21T04:00:00Z'),now=()=>clock;
const row={id:'OHR.OwnedDaily',date:'2026-10-21',market:'zh-CN',title:'风景',description:'说明',copyright:'© Test',credit:'© Test',sourceUrl:'https://www.bing.com'};
const index=()=>({schemaVersion:1,market:'zh-CN',fetchedAt:new Date(clock).toISOString(),images:[row]});
async function directory(t){const dir=await mkdtemp(join(tmpdir(),'daily-collector-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
function service(dir,fetchImpl,options={}){return createBingService({cacheDir:join(dir,'cache'),historyDir:join(dir,'history'),fetchImpl,now,...options});}
function page(offset){return {images:Array.from({length:8},(_,i)=>{
  const date=new Date(clock-(offset+i)*86400000).toISOString().slice(0,10).replaceAll('-','');
  return {urlbase:`/th?id=OHR.Day${offset+i}`,startdate:date,title:'风景',copyright:'山谷 (© Test)'};
})};}
test('Actions collection preserves historical months, deduplicates overlap, and never downloads an image',async t=>{
  const dir=await directory(t),calls=[];
  await writeFile(join(dir,'2018-09.json'),'preserved historical bytes');
  const fetchImpl=async url=>{assert.equal(url.pathname,'/HPImageArchive.aspx');calls.push(url);return Response.json(page(Number(url.searchParams.get('idx'))));};
  for(let i=0;i<2;i++)assert.equal((await collectIndex({output:dir,fetchImpl,now})).count,15);
  assert.equal(calls.length,4);
  assert.equal(JSON.parse(await readFile(join(dir,'2026-10.json'))).images.length,15);
  assert.equal(JSON.parse(await readFile(join(dir,'latest.json'))).images[0].date,'2026-10-21');
  assert.equal(await readFile(join(dir,'2018-09.json'),'utf8'),'preserved historical bytes');
  const before=await readFile(join(dir,'latest.json'));
  await assert.rejects(collectIndex({output:dir,now,fetchImpl:async url=>url.searchParams.get('idx')==='0'?Response.json(page(0)):new Response('',{status:404})}));
  assert.deepEqual(await readFile(join(dir,'latest.json')),before);
});
test('daily sync reads only our repository and Bing, persists originals, and becomes offline on visitor requests',async t=>{
  const dir=await directory(t),calls=[];
  const app=service(dir,async url=>{calls.push(String(url));return url.hostname==='raw.githubusercontent.com'?Response.json(index()):new Response(jpeg(3840,2160),{headers:{'Content-Type':'image/jpeg'}});});
  const [a,b]=await Promise.all([app.syncHistory(),app.syncHistory()]);assert.deepEqual(a,b);assert.equal(a.saved,1);
  assert.match(calls[0],/oonecab\/daily-picture-web\/codex\/wallpaper-data\/latest.json$/);
  assert.equal(calls.length,2);assert.match(calls[1],/^https:\/\/www.bing.com\/th/);
  await app.syncHistory();assert.equal(calls.length,3);
  const offline=service(dir,async()=>{throw new Error('offline');});
  assert.equal((await offline.history.month('2026-10')).images[0].availability.stored,true);
  assert.equal((await offline.history.catalog()).sync.source,'github-actions');
  assert.deepEqual(await offline.history.image(row.date,row.id,'original'),jpeg(3840,2160));
  const server=createApp({service:offline});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const base=`http://127.0.0.1:${server.address().port}/api/history/image?date=${row.date}&id=${row.id}`;
  const thumb=await fetch(`${base}&size=thumb`),preview=await fetch(`${base}&size=preview`),download=await fetch(`${base}&size=original&download=1`);
  assert.equal((await sharp(Buffer.from(await thumb.arrayBuffer())).metadata()).width,640);
  assert.equal((await sharp(Buffer.from(await preview.arrayBuffer())).metadata()).width,1920);
  assert.match(download.headers.get('content-disposition'),/attachment; filename="Bing_CN_2026-10-21.jpg"/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()),jpeg(3840,2160));
  const head=await fetch(`${base}&size=thumb`,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await fetch(`${base}&size=bogus`)).status,400);
});
test('daily sync records failed images, retries later, and does not delete the dated index',async t=>{
  const dir=await directory(t);let broken=true,time=clock;
  const app=service(dir,async url=>url.hostname==='raw.githubusercontent.com'?Response.json(index()):broken?new Response('',{status:404}):new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}}),{now:()=>time});
  const failed=await app.syncHistory();assert.equal(failed.failures.length,1);assert.equal(failed.saved,0);
  assert.equal((await app.history.month('2026-10')).images.length,1);
  assert.equal((await app.history.catalog()).sync.failures.length,1);
  broken=false;time+=61000;
  assert.equal((await app.syncHistory()).saved,1);
  assert.equal((await app.history.catalog()).sync.error,null);
});
test('untrusted daily indexes fail validation before any monthly write',async t=>{
  const dir=await directory(t);let value=index();
  const app=service(dir,async()=>Response.json(value));
  for(const bad of [{...row,id:'../../secret'},{...row,date:'2026-02-30'},{...row,date:'2026-10-22'}]){
    value={...index(),images:[row,bad]};await assert.rejects(app.syncHistory());
    assert.equal((await app.history.month('2026-10')).images.length,0);
  }
});
test('stale Actions indexes remain useful but report their true collection time',async t=>{
  const dir=await directory(t),value={...index(),fetchedAt:'2026-10-18T01:00:00Z'};
  const app=service(dir,async url=>url.hostname==='raw.githubusercontent.com'?Response.json(value):new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}}));
  assert.equal((await app.syncHistory()).stale,true);
  assert.match((await app.history.catalog()).sync.error,/48/);
});
test('the service collector preserves the saved stale-index diagnosis instead of overwriting it with a generic failure',async t=>{
  const dir=await directory(t),value={...index(),fetchedAt:'2026-10-18T01:00:00Z'},warnings=[];
  const app=service(dir,async url=>url.hostname==='raw.githubusercontent.com'?Response.json(value):new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}}));
  const collector=startSavedHistoryCollector(app,error=>warnings.push(error.message));
  t.after(()=>collector.stop());await collector.done;
  assert.equal(warnings.length,1);assert.match(warnings[0],/48/);
  assert.match((await app.history.catalog()).sync.error,/48/);
});
test('our GitHub API fallback validates the exact file and ignores its download URL',async t=>{
  const dir=await directory(t),content=Buffer.from(JSON.stringify(index())),calls=[];
  const app=service(dir,async url=>{
    calls.push(String(url));if(url.hostname==='raw.githubusercontent.com')throw new TypeError('connection failed');
    if(url.hostname==='api.github.com')return Response.json({type:'file',path:'latest.json',size:content.length,encoding:'base64',content:content.toString('base64'),download_url:'https://evil.example/'});
    return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});
  });
  assert.equal((await app.syncHistory()).transport,'github-api');
  assert.equal(calls.some(url=>url.includes('evil.example')),false);
});
test('one-time importer quarantines ambiguous source rows, keeps valid dates, and resumes without image requests',async t=>{
  const dir=await directory(t),sourceDir=join(dir,'source'),path=join(sourceDir,'archives/2018/2018-09');await mkdir(path,{recursive:true});
  const good={date:'2018-09-11',title:'旧日',copyright:'© Test',url_4k:'https://www.bing.com/th?id=OHR.Old_UHD.jpg'};
  const bad={...good,date:'2018-09-12',url_1080:'https://www.bing.com/th?id=OHR.Other_1920x1080.jpg'};
  await writeFile(join(path,'2018-09.json'),JSON.stringify([good,bad]));
  let calls=0;const options={historyDir:join(dir,'history'),cacheDir:join(dir,'cache'),sourceDir,from:'2018-09',through:'2018-09',now,
    fetchImpl:async()=>{calls++;return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});}};
  const first=await importHistory(options),second=await importHistory(options);
  assert.equal(first.images,1);assert.equal(first.saved,1);assert.equal(first.quarantined.length,1);
  assert.equal(second.saved,1);assert.equal(second.quarantined.length,1);assert.equal(calls,1);
  assert.equal((await service(dir,async()=>{throw new Error('offline');}).history.month('2018-09')).images[0].source,'zxyongyo');
  await writeFile(join(dir,'history','.import.lock'),'other importer');
  await assert.rejects(importHistory(options),{code:'EEXIST'});
});
