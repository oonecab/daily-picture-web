import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBingService } from '../lib/bing.mjs';
import { jpeg } from './fixtures/jpeg.mjs';

const clock=Date.parse('2026-10-21T04:00:00Z');
const oldRow=(date='2018-09-11',id='OHR.Old_EN-AU123')=>({date,title:'旧日风景',copyright:'© Photographer',
  url_4k:`https://cn.bing.com/th?id=${id}_1920x1080.jpg&w=3840&h=2160`,
  url_1080:`https://cn.bing.com/th?id=${id}_1920x1080.jpg&w=1920&h=1080`,
  url_preview:`https://cn.bing.com/th?id=${id}_1920x1080.jpg&w=480&h=270`});
const archiveRow=(date='2024-04-03',id='OHR.Same')=>({date,title:'归档说明',copyright:'© Photographer',
  url:`https://bing.npanuhin.me/CN/zh/${date}.jpg`,bing_url:`https://www.bing.com/th?id=${id}_UHD.jpg`});
async function setup(t,fetchImpl,extras={}) {
  const dir=await mkdtemp(join(tmpdir(),'daily-dual-history-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const options={historyMode:'import',cacheDir:dir,historyDir:join(dir,'history'),now:()=>clock,fetchImpl,...extras};
  return {dir,options,service:createBingService(options)};
}
test('2018 history loads only the requested monthly JSON and exposes both credits',async t=>{
  const calls=[];const {service}=await setup(t,async url=>{calls.push(String(url));return Response.json([oldRow()]);});
  const catalog=await service.history.catalog();assert.equal(catalog.months.at(-1),'2018-09');assert.equal(catalog.sources.length,2);
  const [a,b]=await Promise.all([service.history.month('2018-09'),service.history.month('2018-09')]);
  assert.deepEqual(a,b);assert.deepEqual(calls,['https://raw.githubusercontent.com/zxyongyo/bing-daily-wallpaper/master/archives/2018/2018-09/2018-09.json']);
  assert.equal(a.images[0].id,'OHR.Old_EN-AU123');assert.equal(a.images[0].source,'zxyongyo');assert.equal(a.images[0].snapshot,false);
  assert.equal(a.images[0].credit,'© Photographer');await service.history.month('2018-09');assert.equal(calls.length,1);
  await assert.rejects(service.history.month('2018-08'),{status:400});
});
test('two sources merge dates with archive metadata and same-picture fallback only',async t=>{
  const {service}=await setup(t,async url=>Response.json(url.hostname==='raw.githubusercontent.com'
    ? [oldRow('2024-04-03','OHR.Same'),oldRow('2024-04-04','OHR.Other'),oldRow('2024-04-05','OHR.OnlyOld')]
    : [archiveRow(),archiveRow('2024-04-04','OHR.Archive')]));
  const data=await service.history.month('2024-04');assert.equal(data.images.length,3);
  const same=data.images.find(i=>i.date==='2024-04-03');assert.equal(same.title,'归档说明');assert.equal(same.snapshot,true);
  assert.deepEqual(new Set(same.sources),new Set(['npanuhin','zxyongyo']));assert.equal(same.bingVariant,'1920x1080');
  const different=data.images.find(i=>i.date==='2024-04-04');assert.equal(different.id,'OHR.Archive');assert.equal(different.bingVariant,'UHD');
});
test('a missing or failing provider does not discard the other source or saved daily rows',async t=>{
  const {service}=await setup(t,async url=>url.hostname==='raw.githubusercontent.com'?Response.json([oldRow('2024-04-03')]):new Response('',{status:503}));
  const data=await service.history.month('2024-04');assert.equal(data.images.length,1);assert.equal(data.stale,true);assert.match(data.warning,/归档/);
  const again=await service.history.month('2024-04');assert.equal(again.stale,true);
});
test('existing version-one indexes fetch the newly added provider and survive restart',async t=>{
  const calls=[];const {service,dir,options}=await setup(t,async url=>{calls.push(String(url));return Response.json([oldRow('2024-04-04')]);});
  await mkdir(join(dir,'history'),{recursive:true});await writeFile(join(dir,'history','2024-04.json'),JSON.stringify({schemaVersion:1,month:'2024-04',providerFetchedAt:new Date(clock).toISOString(),providerMissing:false,images:[{id:'OHR.Kept',date:'2024-04-03',source:'bing',snapshot:false,market:'zh-CN',history:true}]}));
  const data=await service.history.month('2024-04');assert.equal(data.images.length,2);assert.equal(calls.length,1);assert.match(calls[0],/raw.githubusercontent.com/);
  const again=await createBingService(options).history.month('2024-04');assert.equal(again.images.length,2);assert.equal(calls.length,1);
});
for(const bad of ['http://cn.bing.com/th?id=OHR.Bad_UHD.jpg','https://evil.example/th?id=OHR.Bad_UHD.jpg','https://user@cn.bing.com/th?id=OHR.Bad_UHD.jpg','https://cn.bing.com:8443/th?id=OHR.Bad_UHD.jpg','https://cn.bing.com/th?id=OHR.Bad_UHD.jpg&id=OHR.Other_UHD.jpg'])test(`old source rejects unsafe image address ${bad}`,async t=>{
  const {service}=await setup(t,async()=>Response.json([{...oldRow(),url_4k:bad}]));
  await assert.rejects(service.history.month('2018-09'),{status:502});
});
test('old-image download tries UHD then the validated recorded variant within one time budget',async t=>{
  const calls=[],signals=[];const {service,dir}=await setup(t,async(url,options)=>{
    if(url.hostname==='raw.githubusercontent.com')return Response.json([oldRow()]);
    calls.push(String(url));signals.push(options.signal);
    return url.searchParams.get('id').endsWith('_UHD.jpg')?new Response('',{status:404}):new Response(jpeg(3840,2160),{headers:{'Content-Type':'image/jpeg'}});
  });
  await service.history.month('2018-09');assert.deepEqual(await service.history.image('2018-09-11'),jpeg(3840,2160));
  assert.equal(calls.length,2);assert.equal(signals[0],signals[1]);assert.match(calls[1],/1920x1080/);
  const saved=JSON.parse(await readFile(join(dir,'history','2018-09.json'),'utf8'));assert.equal(saved.images[0].availability.width,3840);
  await service.history.image('2018-09-11');assert.equal(calls.length,2);
});
test('archive image failures fall back to Bing for the same indexed picture',async t=>{
  const calls=[];const {service}=await setup(t,async url=>{
    if(url.hostname==='raw.githubusercontent.com')return Response.json([oldRow('2024-04-03','OHR.Same')]);
    if(url.pathname.endsWith('.json'))return Response.json([archiveRow()]);
    calls.push(String(url));return url.hostname==='bing.npanuhin.me'?new Response('',{status:404}):new Response(jpeg(3840,2160),{headers:{'Content-Type':'image/jpeg'}});
  });
  await service.history.month('2024-04');assert.deepEqual(await service.history.image('2024-04-03'),jpeg(3840,2160));
  assert.equal(calls.length,2);assert.match(calls[1],/OHR.Same_UHD/);
});
test('failed manual refresh remains stale during cooldown even if the saved index is fresh',async t=>{
  let time=clock,fail=false,calls=0;
  const {service}=await setup(t,async()=>{calls++;return fail?new Response('',{status:503}):Response.json([oldRow()]);},{now:()=>time});
  await service.history.month('2018-09');time+=61000;fail=true;
  assert.equal((await service.history.month('2018-09',true)).stale,true);
  const before=calls;assert.equal((await service.history.month('2018-09')).stale,true);assert.equal(calls,before);
});
test('a transient candidate failure stays transient when another candidate is missing',async t=>{
  const {service}=await setup(t,async url=>{
    if(url.hostname==='raw.githubusercontent.com')return Response.json([oldRow()]);
    return new Response('',{status:url.searchParams.get('id').endsWith('_UHD.jpg')?503:404});
  });
  await service.history.month('2018-09');await assert.rejects(service.history.image('2018-09-11'),{status:502});
  assert.equal((await service.history.month('2018-09')).images[0].availability.status,'error');
});
test('a new daily ID cannot inherit the previous supplementary download variant',async t=>{
  const {service}=await setup(t,async()=>Response.json([oldRow()]));await service.history.month('2018-09');
  await service.history.ingest({images:[{id:'OHR.DailyReplacement',date:'2018-09-11',market:'zh-CN',title:'每日记录'}]});
  const image=(await service.history.month('2018-09')).images[0];assert.equal(image.source,'bing');assert.equal(image.bingVariant,undefined);assert.deepEqual(image.sources,['bing']);
});
test('a raw GitHub connection failure falls back to the same repository file through the official API',async t=>{
  const calls=[];const bytes=Buffer.from(JSON.stringify([oldRow()]));
  const {service}=await setup(t,async url=>{
    calls.push(String(url));if(url.hostname==='raw.githubusercontent.com')throw new TypeError('connection reset');
    return Response.json({type:'file',encoding:'base64',path:'archives/2018/2018-09/2018-09.json',size:bytes.length,content:bytes.toString('base64')});
  });
  const data=await service.history.month('2018-09');assert.equal(data.images.length,1);assert.equal(data.stale,false);
  assert.equal(calls.at(-1),'https://api.github.com/repos/zxyongyo/bing-daily-wallpaper/contents/archives/2018/2018-09/2018-09.json?ref=master');
  assert.equal(data.providers.zxyongyo.transport,'github-api');assert.equal(calls.length,3);
});
test('the GitHub API fallback rejects mismatched file envelopes',async t=>{
  const bytes=Buffer.from(JSON.stringify([oldRow()]));const calls=[];
  const {service}=await setup(t,async url=>{
    calls.push(url.hostname);if(url.hostname==='raw.githubusercontent.com')throw new TypeError('connection reset');
    return Response.json({type:'file',encoding:'base64',path:'other.json',size:bytes.length,content:bytes.toString('base64'),download_url:'https://evil.example/image'});
  });
  await assert.rejects(service.history.month('2018-09'),{status:502});assert.ok(calls.includes('api.github.com'));assert.ok(!calls.includes('evil.example'));
});
test('a failed uncached month does not claim that saved records are being shown',async t=>{
  const {service}=await setup(t,async()=>new Response('',{status:503}));
  await assert.rejects(service.history.month('2018-09'),error=>error.status===502 && !error.message.includes('正在显示'));
});
