import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createBingService,normalizeArchive} from '../lib/bing.mjs';
import {createApp} from '../server.mjs';
import {jpeg} from './fixtures/jpeg.mjs';
import {importRegion,MINIMUM_FREE_BYTES} from '../tools/import-regions.mjs';
import {collectIndex} from '../tools/collect-index.mjs';
import {MARKETS,marketIndexPath} from '../lib/markets.mjs';
import {createMediaStore} from '../lib/media.mjs';
import sharp from 'sharp';

const now=()=>Date.parse('2026-10-26T00:30:00Z');
async function fixture(t,fetchImpl=async()=>{throw Error('unexpected network');},options={}) {
  const dir=await mkdtemp(join(tmpdir(),'daily-regions-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const settings={cacheDir:join(dir,'cache'),historyDir:join(dir,'history'),now,fetchImpl,...options};
  return {dir,settings,service:createBingService(settings)};
}
const row=(market,date='2026-10-25')=>({market,date,id:'OHR.SameDay',title:market,description:'description',copyright:'© Test',credit:'© Test'});

test('foreign daily feeds use the global endpoint and reject a different returned market including cached metadata',async t=>{
  const body=id=>({images:[{urlbase:'/th?id='+id,startdate:'20261025',fullstartdate:'202610250700',title:'Daily',copyright:'Daily (© Test)'}]});
  assert.throws(()=>normalizeArchive(body('OHR.Wrong_ZH-CN123'),'en-US',new Date(now()).toISOString()),/地区/);
  const {dir,service}=await fixture(t,async url=>{
    assert.equal(url.hostname,'global.bing.com');assert.equal(url.searchParams.get('mkt'),'en-US');
    return Response.json(body('OHR.Correct_EN-US123'));
  });
  await mkdir(join(dir,'cache/archives'),{recursive:true});
  await writeFile(join(dir,'cache/archives/en-US.json'),JSON.stringify({schemaVersion:1,market:'en-US',windowDays:15,fetchedAt:new Date(now()).toISOString(),images:[{...row('en-US'),id:'OHR.Wrong_ZH-CN123'}]}));
  const actual=await service.archive('en-US');
  assert.equal(actual.stale,false);assert.equal(actual.images[0].id,'OHR.Correct_EN-US123');
});

test('valid regional metadata repairs a mislabelled daily row even when its publication timestamp is older',async t=>{
  const {dir,service}=await fixture(t);const market='ja-JP',history=service.historyFor(market);
  const folder=join(dir,'history/markets',market);await mkdir(folder,{recursive:true});
  await writeFile(join(folder,'2026-10.json'),JSON.stringify({schemaVersion:1,market,month:'2026-10',images:[{...row(market),id:'OHR.Wrong_ZH-CN123',source:'bing',sources:['bing'],fullStartDate:'202610250100',observedAt:new Date(now()).toISOString()}]}));
  const correct={...row(market),id:'OHR.Correct_JA-JP123',fullStartDate:'202610250000'};
  await history.ingest({images:[correct],fetchedAt:new Date(now()).toISOString()});
  assert.equal((await history.month('2026-10')).images[0].id,correct.id);
  await assert.rejects(history.ingest({images:[{...correct,id:'OHR.Wrong_ZH-CN123'}]}),/market/);
  assert.equal((await history.month('2026-10')).images[0].id,correct.id);
});

test('six regions retain independent history, dates, sync state and legacy China paths',async t=>{
  const {dir,service}=await fixture(t);
  for(const market of ['zh-CN','en-US','en-GB','ja-JP','de-DE','fr-FR']) {
    const history=service.historyFor(market);await history.ingest({images:[row(market)]});
    const catalog=await history.catalog();
    assert.equal(catalog.market,market);
    assert.equal(catalog.firstMonth,market==='zh-CN'?'2018-09':market==='en-US'?'2010-01':'2024-04');
    assert.equal((await history.month('2026-10')).images[0].title,market);
  }
  assert.equal((await service.history.month('2026-10')).images[0].market,'zh-CN');
  assert.ok(await readFile(join(dir,'history/2026-10.json')));
  assert.ok(await readFile(join(dir,'history/markets/en-US/2026-10.json')));
  await assert.rejects(service.historyFor('en-US').ingest({images:[row('en-US','2026-10-26')]}),{status:400});
  assert.throws(()=>service.historyFor('../../escape'),{status:400});
});

test('overseas archive imports thumbnails only and serves old originals through bounded on-demand storage',async t=>{
  const calls=[];
  const {dir,service,settings}=await fixture(t,async url=>{
    calls.push(url.href);
    if(url.pathname.endsWith('.json'))return Response.json([{date:'2010-01-01',title:'Old US',copyright:'© Test',bing_url:null,url:'https://bing.npanuhin.me/US/en/2010-01-01.jpg'}]);
    assert.equal(url.href,'https://bing.npanuhin.me/US/en/2010-01-01.jpg');
    return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});
  },{historyMode:'import'});
  const history=service.historyFor('en-US'),data=await history.month('2010-01'),item=data.images[0];
  assert.equal(item.market,'en-US');assert.equal(item.id,'OHR.HistoryUS_20100101');
  await history.saveThumbnail(item.date,item.id);
  const media=join(dir,'history/markets/en-US/media');
  assert.equal((await readdir(media)).filter(n=>n.endsWith('.thumb.jpg')).length,1);
  assert.equal((await readdir(media)).some(n=>/\.(preview|original)\.jpg$/.test(n)),false);
  const local=createBingService({...settings,historyMode:'local'}).historyFor('en-US');
  assert.equal(await local.remoteImage(item.date,item.id),null);
  assert.deepEqual(await local.image(item.date,item.id),jpeg());
  const count=calls.length;await local.image(item.date,item.id);assert.equal(calls.length,count);
  assert.equal((await readdir(media)).some(n=>/\.(preview|original)\.jpg$/.test(n)),false);
  await assert.rejects(local.image(item.date,'OHR.Wrong'),{status:404});
});

test('overseas import rejects a different country or untrusted archive address',async t=>{
  for(const url of ['https://evil.example/US/en/2010-01-01.jpg','https://bing.npanuhin.me/JP/ja/2010-01-01.jpg']) {
    const {service}=await fixture(t,async()=>Response.json([{date:'2010-01-01',url,bing_url:null}]),{historyMode:'import'});
    await assert.rejects(service.historyFor('en-US').month('2010-01'),{status:502});
  }
});

test('history HTTP market routing isolates same-day IDs and preserves old China requests',async t=>{
  const {service}=await fixture(t);
  await service.history.ingest({images:[row('zh-CN')]});
  await service.historyFor('ja-JP').ingest({images:[row('ja-JP')]});
  const app=createApp({service});app.listen(0,'127.0.0.1');await once(app,'listening');
  t.after(()=>new Promise(resolve=>{app.closeAllConnections();app.close(resolve);}));
  const base='http://127.0.0.1:'+app.address().port;
  assert.equal((await (await fetch(base+'/api/history?month=2026-10')).json()).images[0].market,'zh-CN');
  assert.equal((await (await fetch(base+'/api/history?market=ja-JP&month=2026-10')).json()).images[0].market,'ja-JP');
  assert.equal((await fetch(base+'/api/history?market=bad')).status,400);
  assert.equal((await fetch(base+'/api/history/image?market=bad&date=2026-10-25&id=OHR.SameDay')).status,400);
});

test('regional import resumes from thumbnails and stops before fetching below the disk reserve',async t=>{
  const {dir}=await fixture(t);let calls=0;
  const historyDir=join(dir,'stage'),options={historyDir,market:'en-US',from:'2010-01',through:'2010-01',now,
    getFreeBytes:async()=>MINIMUM_FREE_BYTES+1024**3,fetchImpl:async url=>{
      calls++;
      return url.pathname.endsWith('.json')?Response.json([{date:'2010-01-01',title:'Old US',bing_url:null,url:'https://bing.npanuhin.me/US/en/2010-01-01.jpg'}]):new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});
    }};
  await assert.rejects(importRegion({...options,getFreeBytes:async()=>MINIMUM_FREE_BYTES-1}),/Import paused/);
  assert.equal(calls,0);
  const first=await importRegion(options);assert.equal(first.saved,1);assert.deepEqual(first.failures,[]);
  const count=calls,again=await importRegion(options);assert.equal(again.saved,1);assert.equal(calls,count);
  const files=await readdir(join(historyDir,'markets/en-US/media'));assert.equal(files.some(n=>/\.(original|preview)\.jpg$/.test(n)),false);
  await assert.rejects(importRegion({...options,market:'zh-CN'}),/existing China importer/);
});

test('daily indexes keep regional paths and one failed region cannot stop other regions syncing',async t=>{
  const {dir}=await fixture(t);
  for(const market of Object.keys(MARKETS)) {
    await collectIndex({output:dir,market,now,fetchImpl:async url=>{
      assert.equal(url.searchParams.get('mkt'),market);
      return Response.json({images:[{urlbase:'/th?id=OHR.Shared',startdate:'20261025',title:market,copyright:'© Test'}]});
    }});
    assert.equal(JSON.parse(await readFile(join(dir,marketIndexPath(market)))).market,market);
  }
  const {service}=await fixture(t,async url=>{
    if(url.hostname==='raw.githubusercontent.com') {
      const market=/markets\/([^/]+)\//.exec(url.pathname)?.[1]||'zh-CN';
      if(market==='ja-JP')return new Response('',{status:404});
      return new Response(await readFile(join(dir,marketIndexPath(market))),{headers:{'Content-Type':'application/json'}});
    }
    return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});
  });
  const result=await service.syncAllHistory();
  assert.equal(result.markets.length,6);assert.match(result.error,/日本/);
  for(const market of Object.keys(MARKETS)) {
    const catalog=await service.historyFor(market).catalog();
    if(market==='ja-JP'){assert.ok(catalog.sync.error);continue;}
    assert.equal(catalog.sync.error,null);assert.equal(catalog.sync.saved,1);
    assert.equal((await service.historyFor(market).month('2026-10')).images[0].title,market);
  }
});

test('shared media read budgets never coalesce different regions with the same date and ID',async t=>{
  const {dir,service}=await fixture(t);
  const cn=row('zh-CN'),us=row('en-US');
  await service.history.ingest({images:[cn]});await service.historyFor('en-US').ingest({images:[us]});
  const cnStore=createMediaStore({root:join(dir,'history/media')}),usStore=createMediaStore({root:join(dir,'history/markets/en-US/media')});
  await cnStore.put(cn,jpeg(1920,1080),{thumbnailOnly:true});await usStore.put(us,jpeg(800,1080),{thumbnailOnly:true});
  const expected=await Promise.all([cnStore.get(cn,'thumb'),usStore.get(us,'thumb')]);
  assert.notDeepEqual(expected[0],expected[1]);
  const actual=await Promise.all([service.history.image(cn.date,cn.id,'thumb'),service.historyFor('en-US').image(us.date,us.id,'thumb')]);
  assert.deepEqual(actual[0],expected[0]);assert.deepEqual(actual[1],expected[1]);
});

test('overseas previews resize the actual JPEG, keep original cache separate, and fallback only to the same indexed Bing ID',async t=>{
  const calls=[];
  const {service,settings,dir}=await fixture(t,async url=>{
    calls.push(url.href);
    if(url.pathname.endsWith('.json'))return Response.json(['03','04'].map(day=>({date:`2024-04-${day}`,title:day,bing_url:`https://www.bing.com/th?id=OHR.Modern${day}_UHD.jpg`,url:`https://bing.npanuhin.me/JP/ja/2024-04-${day}.jpg`}))) ;
    if(url.hostname==='bing.npanuhin.me'&&url.pathname.endsWith('04.jpg'))return new Response('',{status:404});
    if(url.hostname==='www.bing.com'){assert.match(url.searchParams.get('id'),/^OHR.Modern04_/);return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});}
    return new Response(jpeg(3840,2160),{headers:{'Content-Type':'image/jpeg'}});
  },{historyMode:'import'});
  await service.historyFor('ja-JP').month('2024-04');
  const history=createBingService({...settings,historyMode:'local'}).historyFor('ja-JP');
  assert.equal(await history.remoteImage('2024-04-03','OHR.Modern03'),null);
  assert.equal((await sharp(await history.image('2024-04-03','OHR.Modern03','preview')).metadata()).width,1920);
  assert.deepEqual(await history.image('2024-04-03','OHR.Modern03','original'),jpeg(3840,2160));
  const count=calls.length;await history.image('2024-04-03','OHR.Modern03','preview');assert.equal(calls.length,count);
  assert.deepEqual(await history.image('2024-04-04','OHR.Modern04','original'),jpeg());
  assert.equal((await readdir(join(dir,'cache/images'))).length,3);
  await assert.rejects(readdir(join(dir,'history/markets/ja-JP/media')),{code:'ENOENT'});
});

test('fixed archive JPEGs can omit content-type, while explicit non-image types and pixel bombs remain rejected',async t=>{
  for(const type of ['', 'application/octet-stream', 'text/html']) {
    const {service,settings}=await fixture(t,async url=>url.pathname.endsWith('.json')?
      Response.json([{date:'2010-01-01',title:'Archive',bing_url:null,url:'https://bing.npanuhin.me/US/en/2010-01-01.jpg'}]):
      new Response(jpeg(),{headers:type?{'Content-Type':type}:{}}),{historyMode:'import'});
    const history=service.historyFor('en-US');await history.month('2010-01');
    if(type==='text/html'){await assert.rejects(history.saveThumbnail('2010-01-01'),/来源图片无效/);continue;}
    await history.saveThumbnail('2010-01-01');
    const local=createBingService({...settings,historyMode:'local'}).historyFor('en-US');
    assert.deepEqual(await local.image('2010-01-01'),jpeg());
  }
  const bomb=Buffer.from(jpeg()),marker=bomb.indexOf(Buffer.from([0xff,0xc0]));assert.ok(marker>0);
  bomb.writeUInt16BE(7000,marker+5);bomb.writeUInt16BE(7000,marker+7);
  const {service}=await fixture(t,async url=>url.pathname.endsWith('.json')?
    Response.json([{date:'2010-01-01',title:'Archive',bing_url:null,url:'https://bing.npanuhin.me/US/en/2010-01-01.jpg'}]):new Response(bomb),{historyMode:'import'});
  await service.historyFor('en-US').month('2010-01');
  await assert.rejects(service.historyFor('en-US').saveThumbnail('2010-01-01'),/pixel limit/);
});
