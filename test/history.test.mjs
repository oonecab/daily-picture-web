import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBingService } from '../lib/bing.mjs';
import { jpeg } from './fixtures/jpeg.mjs';

const clock = Date.parse('2026-10-21T04:00:00Z');
const row = (date = '2024-04-03') => ({ date, title: '彩虹', description: '山间彩虹', copyright: '© Test',
  url: `https://bing.npanuhin.me/CN/zh/${date}.jpg`, bing_url: `https://bing.com/th?id=OHR.Rainbow${date.replaceAll('-', '')}_ZH-CN123_UHD.jpg` });
const recent = (date, id = date.replaceAll('-', '')) => ({ id: `OHR.Day${id}`, date, market: 'zh-CN', title: '每日风景',
  description: '山川', copyright: '© Test', credit: '© Test', sourceUrl: 'https://www.bing.com', wallpaper: true });
async function setup(t, fetchImpl, extras = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'daily-history-'));
  t.after(() => rm(dir, {recursive:true,force:true}));
  // These original-provider regressions model the supplementary source as missing.
  // Dual-source request/merge behavior is exercised in history-sources.test.mjs.
  const fetchSources=(url,options)=>url.hostname==='raw.githubusercontent.com' ? Promise.resolve(new Response('',{status:404})) : fetchImpl(url,options);
  return {dir,service:createBingService({historyMode:'import',cacheDir:dir,historyDir:join(dir,'history'),now:()=>clock,fetchImpl:fetchSources,...extras})};
}
test('history requests only the selected month, coalesces concurrent readers and preserves attribution', async t => {
  const calls=[];
  const {service} = await setup(t, async url => {calls.push(String(url));return Response.json([row()]);});
  const [a,b] = await Promise.all([service.history.month('2024-04'),service.history.month('2024-04')]);
  assert.equal(calls.length,1); assert.equal(calls[0],'https://bing.npanuhin.me/CN-zh.2024.04.json');
  assert.deepEqual(a,b); assert.equal(a.images[0].credit,'© Test'); assert.equal(a.images[0].history,true);
  assert.equal(a.images[0].availability.status,'unchecked');
  await service.history.month('2024-04'); assert.equal(calls.length,1);
});
test('history validates calendar, range, dates and external image addresses before exposing records', async t => {
  const {service} = await setup(t, async()=>Response.json([{...row(),url:'https://example.org/secret.jpg'}]));
  for (const month of ['2024-00','2024-13','../../x','2018-08','2027-01']) await assert.rejects(service.history.month(month), {status:400});
  for (const date of ['2024-02-30','2024-04-31','../../secret','2024-04-03?url=x']) await assert.rejects(service.history.image(date), {status:400});
  await assert.rejects(service.history.month('2024-04'),{status:502});
});
test('daily indexes accumulate across months, concurrent imports and restart without losing old records', async t => {
  const {service,dir} = await setup(t, async()=> {throw new Error('offline');});
  await Promise.all([service.history.ingest({images:[recent('2026-09-30')]}),service.history.ingest({images:[recent('2026-10-01')]})]);
  await service.history.ingest({images:[{...recent('2026-09-30'),title:'更新标题'}]});
  const again=createBingService({historyMode:'import',cacheDir:dir,historyDir:join(dir,'history'),now:()=>clock,fetchImpl:async()=>{throw new Error('offline');}});
  assert.equal((await again.history.month('2026-09')).images[0].title,'更新标题');
  assert.equal((await again.history.month('2026-10')).images[0].date,'2026-10-01');
  assert.equal((await again.history.month('2026-09')).stale,true);
  const disk=JSON.parse(await readFile(join(dir,'history','2026-09.json'),'utf8'));
  assert.equal(disk.images.length,1);
});
test('missing month is explicit, transient failure is not an empty archive, local entries survive',async t=>{
  const {service}=await setup(t,async()=>new Response('',{status:404}));
  const empty=await service.history.month('2024-04'); assert.equal(empty.images.length,0); assert.equal(empty.providerMissing,true);
  await service.history.ingest({images:[recent('2024-04-03')]});
  assert.equal((await service.history.month('2024-04')).images.length,1);
  const other=await setup(t,async()=>new Response('',{status:503}));
  await assert.rejects(other.service.history.month('2024-05'),{status:502});
});
test('old image checks reject HTML, tiny placeholders and broken JPEG, retain metadata and recover',async t=>{
  let bytes=jpeg(80,80),time=clock,calls=0;
  const {service}=await setup(t,async url=>{
    if(String(url).endsWith('.json')) return Response.json([row()]);
    calls++; return new Response(bytes,{headers:{'Content-Type':'image/jpeg'}});
  },{now:()=>time});
  await service.history.month('2024-04');
  await assert.rejects(service.history.image('2024-04-03'),{status:502});
  assert.equal((await service.history.month('2024-04')).images[0].availability.status,'unavailable');
  await assert.rejects(service.history.image('2024-04-03')); assert.equal(calls,2); // Archive and same-picture UHD, then negative cache.
  time+=61000; bytes=jpeg();
  const result=await service.history.image('2024-04-03'); assert.deepEqual(result,bytes);
  const a=(await service.history.month('2024-04')).images[0].availability;
  assert.equal(a.status,'available');assert.equal(a.width,1920);
});

test('corrupt history files are preserved and never replaced by an upstream response',async t=>{
  const {writeFile,mkdir}=await import('node:fs/promises');
  let calls=0;const {service,dir}=await setup(t,async()=>{calls++;return Response.json([row()]);});
  await mkdir(join(dir,'history'),{recursive:true});await writeFile(join(dir,'history','2024-04.json'),'broken');
  await assert.rejects(service.history.month('2024-04'),{status:500});assert.equal(calls,0);
  assert.equal(await readFile(join(dir,'history','2024-04.json'),'utf8'),'broken');
});
for(const kind of ['html','truncated','404','oversize'])test(`history image rejects ${kind} without caching it`,async t=>{
  const {service,dir}=await setup(t,async url=>{
    if(String(url).endsWith('.json'))return Response.json([row()]);
    if(kind==='404')return new Response('',{status:404});
    if(kind==='html')return new Response('<html>error</html>',{headers:{'Content-Type':'text/html'}});
    return new Response(kind==='truncated'?jpeg().subarray(0,20):jpeg(),{headers:{'Content-Type':'image/jpeg',...(kind==='oversize'?{'Content-Length':String(21*1024*1024)}:{})}});
  });
  await service.history.month('2024-04');await assert.rejects(service.history.image('2024-04-03'),{status:502});
  assert.deepEqual((await readdir(join(dir,'images'))).filter(name=>name.endsWith('.jpg')),[]);
});
test('new daily rows survive a delayed provider merge for the same month',async t=>{
  let release,started;const waiting=new Promise(r=>{started=r;});
  const {service}=await setup(t,()=>{started();return new Promise(r=>{release=()=>r(Response.json([row()]));});});
  const pending=service.history.month('2024-04');await waiting;
  await service.history.ingest({images:[recent('2024-04-04')]});release();
  const data=await pending;assert.deepEqual(data.images.map(i=>i.date),['2024-04-04','2024-04-03']);
});
test('same-day Bing metadata wins while retaining the archive snapshot',async t=>{
  const {service}=await setup(t,async()=>Response.json([row()]));
  await service.history.ingest({images:[{...recent('2024-04-03'),id:'OHR.Rainbow20240403_ZH-CN123'}]});
  const a=await service.history.month('2024-04');assert.equal(a.images[0].source,'bing');assert.equal(a.images[0].snapshot,true);assert.equal(a.images[0].title,'每日风景');
});
test('history and Bing share bounded upstream capacity and merge duplicate image reads',async t=>{
  let active=0,peak=0,calls=0;
  const {service}=await setup(t,async url=>{
    active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,10));active--;
    if(String(url).endsWith('.json'))return Response.json([row()]);calls++;return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});
  },{maxConcurrent:1});
  await service.history.month('2024-04');
  await Promise.all([service.history.image('2024-04-03'),service.history.image('2024-04-03'),service.image('OHR.Other','UHD')]);
  assert.equal(peak,1);assert.equal(calls,2);
});
test('collector runs immediately, reschedules after failure and stops without overlapping',async()=>{
  const {startHistoryCollector}=await import('../lib/history.mjs');
  let count=0,callback,delay,cleared=0,errors=0;
  const collector=startHistoryCollector({collect:async()=>{count++;if(count===1)throw new Error('offline');},onError:()=>errors++,setTimer:(fn,ms)=>{callback=fn;delay=ms;return 42;},clearTimer:()=>cleared++});
  await collector.done;assert.equal(count,1);assert.equal(errors,1);assert.equal(delay,3600000);
  await callback();assert.equal(count,2);collector.stop();assert.equal(cleared,1);
});
test('history HTTP routes validate queries, hide files, and return original-image downloads',async t=>{
  const {createApp}=await import('../server.mjs');const {once}=await import('node:events');
  const {service}=await setup(t,async url=>String(url).endsWith('.json')?Response.json([row()]):new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}}));
  const server=createApp({service});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.close();server.closeAllConnections();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const catalog=await (await fetch(`${base}/api/history`)).json();assert.ok(catalog.months.includes('2018-09'));assert.ok(!catalog.months.includes('2018-08'));
  for(const path of ['/api/history?month=2024-13','/api/history?market=unknown','/api/history/image?date=2024-04-31'])assert.equal((await fetch(base+path)).status,400);
  const us=await (await fetch(`${base}/api/history?market=en-US`)).json();assert.equal(us.market,'en-US');assert.equal(us.firstMonth,'2010-01');
  assert.equal((await fetch(`${base}/.history/2024-04.json`)).status,404);
  assert.equal((await fetch(`${base}/api/history/image?date=2024-04-03`)).status,404);
  assert.equal((await fetch(`${base}/api/history?month=2024-04`)).status,200);
  const img=await fetch(`${base}/api/history/image?date=2024-04-03&download=1`);assert.equal(img.status,200);assert.match(img.headers.get('content-disposition'),/Bing_CN_2024-04-03/);
  assert.deepEqual(Buffer.from(await img.arrayBuffer()),jpeg());
  const head=await fetch(`${base}/api/history/image?date=2024-04-03`,{method:'HEAD'});assert.equal((await head.arrayBuffer()).byteLength,0);
});

test('a changed daily image ID does not inherit another picture snapshot or availability',async t=>{
  const {service}=await setup(t,async()=>Response.json([row()]));
  await service.history.month('2024-04');
  await service.history.ingest({images:[recent('2024-04-03','Replacement')]});
  const item=(await service.history.month('2024-04')).images[0];
  assert.equal(item.snapshot,false);assert.equal(item.availability.status,'unchecked');
});

test('a corrected provider ID resets the previous image availability',async t=>{
  let time=clock,corrected=false;
  const {service}=await setup(t,async url=>String(url).endsWith('.json')
    ? Response.json([{...row(),...(corrected?{bing_url:'https://bing.com/th?id=OHR.Corrected_UHD.jpg'}:{})}])
    : new Response('',{status:404}),{now:()=>time});
  await service.history.month('2024-04');
  await assert.rejects(service.history.image('2024-04-03'),{status:502});
  time+=61000;corrected=true;
  const item=(await service.history.month('2024-04',true)).images[0];
  assert.equal(item.id,'OHR.Corrected');assert.equal(item.availability.status,'unchecked');
});

for(const status of [408,429])test(`history image treats upstream ${status} as a transient error`,async t=>{
  const {service}=await setup(t,async url=>String(url).endsWith('.json')
    ? Response.json([row()]) : new Response('',{status}));
  await service.history.month('2024-04');
  await assert.rejects(service.history.image('2024-04-03'),{status:502});
  assert.equal((await service.history.month('2024-04')).images[0].availability.status,'error');
});

test('a corrected daily ID cannot reuse old image bytes or accept a stale favorite ID',async t=>{
  const {service}=await setup(t,async url=>String(url).endsWith('.json')?Response.json([row()]):new Response(jpeg(String(url).includes('npanuhin')?800:1920),{headers:{'Content-Type':'image/jpeg'}}));
  const first=(await service.history.month('2024-04')).images[0];
  assert.deepEqual(await service.history.image(first.date,first.id),jpeg(800));
  await service.history.ingest({images:[recent(first.date,'Corrected')]});
  await assert.rejects(service.history.image(first.date,first.id),{status:404});
  assert.deepEqual(await service.history.image(first.date,'OHR.DayCorrected'),jpeg(1920));
});
test('automatic daily capture keeps records outside the next recent window and survives restart',async t=>{
  let day='20261001',time=clock;
  const upstream=async()=>Response.json({images:[{urlbase:`/th?id=OHR.Day${day}`,startdate:day,title:'每日风景',copyright:'© Test'}]});
  const {service,dir}=await setup(t,upstream,{now:()=>time});
  await service.archive('zh-CN');day='20261021';time+=3600000;await service.archive('zh-CN',true);
  const disk=JSON.parse(await readFile(join(dir,'history','2026-10.json'),'utf8'));assert.deepEqual(disk.images.map(i=>i.date),['2026-10-21','2026-10-01']);
});
test('unwritable history storage reports a warning while recent pictures remain available',async t=>{
  const {writeFile}=await import('node:fs/promises');const {dir}=await setup(t,async()=>Response.json([]));
  const blocked=join(dir,'blocked');await writeFile(blocked,'not a directory');
  const service=createBingService({historyMode:'import',cacheDir:dir,historyDir:blocked,now:()=>clock,fetchImpl:async()=>Response.json({images:[{urlbase:'/th?id=OHR.Test',startdate:'20261021',copyright:'© Test'}]})});
  const result=await service.archive('zh-CN');assert.equal(result.stale,false);assert.match(result.historyWarning,/保存失败/);assert.equal(result.images.length,1);
});
