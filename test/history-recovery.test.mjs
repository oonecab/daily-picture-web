import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBingService} from '../lib/bing.mjs';
import {jpeg} from './fixtures/jpeg.mjs';

const day=86400000;
const row=(date,id,fullStartDate)=>({date,id,fullStartDate,market:'zh-CN',title:id,description:'review fixture',copyright:'test',credit:'test',sourceUrl:'https://www.bing.com'});
const envelope=(time,images)=>({schemaVersion:1,market:'zh-CN',fetchedAt:new Date(time).toISOString(),images});
async function directory(t){const dir=await mkdtemp(join(tmpdir(),'daily-review-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}

test('an older Actions snapshot must not replace a newer already stored Bing publication',async t=>{
  const dir=await directory(t),now=()=>Date.parse('2026-10-21T04:00:00Z');
  const old=row('2026-10-21','OHR.ReviewOld','202610210100');
  const latest=row('2026-10-21','OHR.ReviewNew','202610210200');
  const service=createBingService({cacheDir:join(dir,'cache'),historyDir:join(dir,'history'),now,
    fetchImpl:async url=>url.hostname==='raw.githubusercontent.com'
      ?Response.json(envelope(Date.parse('2026-10-21T01:30:00Z'),[old]))
      :new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}})});
  await service.history.ingest(envelope(Date.parse('2026-10-21T03:00:00Z'),[latest]));
  await service.history.saveImage(latest.date,latest.id);
  assert.ok((await service.history.image(latest.date,latest.id,'original')).length>0);
  const result=await service.syncHistory();
  const persisted=(await service.history.month('2026-10')).images[0];
  let oldFavoriteStatus=200;
  try{await service.history.image(latest.date,latest.id,'original');}catch(e){oldFavoriteStatus=e.status;}
  t.diagnostic(JSON.stringify({before:latest.id,after:persisted.id,oldFavoriteStatus,syncError:result.error}));
  assert.equal(persisted.id,latest.id,'the newer publication must remain authoritative across separate ingestion batches');
  assert.equal(oldFavoriteStatus,200);
  assert.equal(persisted.availability.stored,true);
  assert.equal(result.error,null,'the collector must save the winning ID, not the obsolete snapshot ID');
});

test('a pending failed thumbnail must still retry after it leaves latest.json',async t=>{
  const dir=await directory(t);let time=Date.parse('2026-10-21T04:00:00Z'),broken=true;
  const dates=()=>Array.from({length:15},(_,i)=>new Date(time-i*day).toISOString().slice(0,10));
  const rows=()=>dates().map(date=>row(date,`OHR.Day${date.replaceAll('-','')}`,`${date.replaceAll('-','')}0100`));
  const missingId='OHR.Day20261007',calls=[];
  const service=createBingService({cacheDir:join(dir,'cache'),historyDir:join(dir,'history'),now:()=>time,
    fetchImpl:async url=>{
      if(url.hostname==='raw.githubusercontent.com')return Response.json(envelope(time,rows()));
      const id=url.searchParams.get('id');calls.push(id);
      if(id.startsWith(missingId)&&broken)return new Response('',{status:404});
      return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});
    }});
  const first=await service.syncHistory();assert.equal(first.failures.length,1);
  const attemptsBefore=calls.filter(id=>id.startsWith(missingId)).length;
  broken=false;time+=day;
  const second=await service.syncHistory();
  const attemptsAfter=calls.filter(id=>id.startsWith(missingId)).length;
  const pending=(await service.history.month('2026-10')).images.find(i=>i.id===missingId);
  const sync=(await service.history.catalog()).sync;
  let status=200;try{await service.history.image(pending.date,pending.id,'thumb');}catch(e){status=e.status;}
  t.diagnostic(JSON.stringify({firstFailures:first.failures.length,secondSaved:second.saved,secondFailures:second.failures.length,
    pendingAvailability:pending.availability.status,pendingImageStatus:status,attemptsBefore,attemptsAfter,reportedError:sync.error}));
  assert.equal(status,200,'the background retry must restore the thumbnail');
  assert.equal(sync.error,null);
  assert.ok(attemptsAfter>attemptsBefore,'the durable pending item must be retried even after leaving the recent window');
});

test('Bing versions compare publication time first, observations second, and retain legacy saved state',async t=>{
  const dir=await directory(t),time=Date.parse('2026-10-21T06:00:00Z');
  const create=()=>createBingService({cacheDir:join(dir,'cache'),historyDir:join(dir,'history'),now:()=>time,
    fetchImpl:async()=>new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}})});
  let app=create();
  const current=row('2026-10-21','OHR.Current','202610210200');
  await app.history.ingest(envelope(time-3600000,[current]));
  await app.history.saveImage(current.date,current.id);
  const path=join(dir,'history','2026-10.json'),legacy=JSON.parse(await readFile(path));
  delete legacy.images[0].observedAt;await writeFile(path,JSON.stringify(legacy));
  app=create();
  await app.history.ingest(envelope(Date.parse('2026-10-21T01:30:00Z'),[row(current.date,'OHR.MissingPublication')]));
  assert.equal((await app.history.month('2026-10')).images[0].id,current.id,'a legacy publication time still proves an earlier snapshot is stale');
  await app.history.ingest(envelope(time,[row(current.date,'OHR.Older','202610210100')]));
  assert.equal((await app.history.month('2026-10')).images[0].id,current.id);
  const newest=row(current.date,'OHR.Newest','202610210300');
  await app.history.ingest(envelope(time-1800000,[newest]));
  assert.equal((await app.history.month('2026-10')).images[0].id,newest.id);
  assert.equal((await app.history.month('2026-10')).images[0].availability.status,'unchecked');
  await app.history.saveImage(newest.date,newest.id);
  await app.history.ingest(envelope(time,[{...newest,title:'最新说明'}]));
  await app.history.ingest(envelope(time-1000,[{...newest,title:'旧说明'}]));
  const saved=(await app.history.month('2026-10')).images[0];
  assert.equal(saved.title,'最新说明');assert.equal(saved.availability.stored,true);
});

test('missing publication timestamps use collection time and equal snapshots cannot change image identity',async t=>{
  const dir=await directory(t),time=Date.parse('2026-10-21T06:00:00Z');
  const app=createBingService({cacheDir:join(dir,'cache'),historyDir:join(dir,'history'),now:()=>time,fetchImpl:async()=>{throw Error('unexpected');}});
  const latest=row('2026-10-21','OHR.Observed');
  await app.history.ingest(envelope(time,[latest]));
  await app.history.ingest(envelope(time-1000,[row(latest.date,'OHR.Older')]));
  await app.history.ingest(envelope(time,[row(latest.date,'OHR.Tied')]));
  assert.equal((await app.history.month('2026-10')).images[0].id,latest.id);
  await app.history.ingest(envelope(time,[{...latest,title:'补充说明'}]));
  assert.equal((await app.history.month('2026-10')).images[0].title,'补充说明');
});

test('durable retries cross months and restarts, bound each batch, rotate failures, and keep deferred errors visible',async t=>{
  const dir=await directory(t);let time=Date.parse('2026-10-21T04:00:00Z'),broken=true;
  const old=Array.from({length:20},(_,i)=>row(`2026-09-${String(i+1).padStart(2,'0')}`,`OHR.Pending${i}`));
  const latest=row('2026-10-21','OHR.Today'),calls=[];
  const create=()=>createBingService({cacheDir:join(dir,'cache'),historyDir:join(dir,'history'),now:()=>time,
    fetchImpl:async url=>{
      if(url.hostname==='raw.githubusercontent.com')return Response.json(envelope(time,[latest]));
      const id=url.searchParams.get('id');calls.push(id);
      if(id.startsWith('OHR.Pending')&&broken)return new Response('',{status:404});
      return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});
    }});
  let app=create();await app.history.ingest(envelope(time,old));
  const first=await app.syncHistory();
  assert.equal(first.total,16);assert.equal(first.retryTotal,15);assert.equal(first.pending,20);
  assert.equal(first.failures.length,15);assert.ok(first.error);
  app=create();time+=3600000;
  const second=await app.syncHistory();
  assert.equal(second.retryTotal,15);assert.equal(second.pending,20);
  for(const image of old)assert.ok(calls.includes(`${image.id}_640x360.jpg`),'all old dates eventually get an attempt');
  broken=false;time+=3600000;
  const partial=await app.syncHistory(),partialStatus=(await app.history.catalog()).sync;
  assert.equal(partial.failures.length,0);assert.equal(partial.pending,5);assert.ok(partial.error);
  assert.equal(partialStatus.lastMediaSuccessAt,undefined,'unattempted backlog cannot be reported as a complete success');
  app=create();time+=3600000;
  const recovered=await app.syncHistory();
  assert.equal(recovered.pending,0);assert.equal(recovered.error,null);assert.equal(recovered.retryTotal,5);
  assert.ok((await app.history.catalog()).sync.lastMediaSuccessAt);
  for(const image of old)assert.ok((await app.history.image(image.date,image.id,'thumb')).length);
});
