import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile,writeFile,stat,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBingService} from '../lib/bing.mjs';
import {jpeg} from './fixtures/jpeg.mjs';
import {createImageCache} from '../lib/image-cache.mjs';
import {createMediaStore} from '../lib/media.mjs';
import {createApp} from '../server.mjs';
import {once} from 'node:events';
import {verifyHistoryBackup,migrateHistory} from '../tools/migrate-history.mjs';
import {bingImageUrl} from '../lib/bing-images.mjs';

test('hybrid daily sync persists a thumbnail and index without persistent preview or original',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'daily-hybrid-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const now=()=>Date.parse('2026-10-21T04:00:00Z');
 const row={date:'2026-10-21',id:'OHR.HybridDaily',market:'zh-CN',title:'风景',description:'说明',copyright:'© Test',credit:'© Test'};
 const service=createBingService({cacheDir:join(dir,'cache'),historyDir:join(dir,'history'),now,
  fetchImpl:async url=>url.hostname==='raw.githubusercontent.com'?Response.json({schemaVersion:1,market:'zh-CN',fetchedAt:new Date(now()).toISOString(),images:[row]}):new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}})});
 assert.equal((await service.syncHistory()).saved,1);
 const names=await readdir(join(dir,'history/media'));
 assert.equal(names.filter(n=>n.endsWith('.thumb.jpg')).length,1);
 assert.equal(names.filter(n=>/\.(original|preview)\.jpg$/.test(n)).length,0);
 const stored=(await service.history.month('2026-10')).images[0];
 assert.equal(stored.availability.thumbnailStored,true);assert.equal(stored.availability.stored,false);
 assert.match(await service.history.remoteImage(row.date,row.id,'original'),/^https:\/\/www.bing.com\/th\?id=OHR.HybridDaily_UHD.jpg/);
});

test('one cache enforces its total budget before concurrent commits and after restart',async t=>{
 const root=await mkdtemp(join(tmpdir(),'daily-cache-budget-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const cache=createImageCache({root,maxBytes:100,maxEntries:4}),bytes=Buffer.alloc(60);bytes[0]=255;bytes[1]=216;
 await Promise.all(Array.from({length:20},(_,i)=>cache.put(`image${i}.jpg`,bytes)));
 const usage=async()=>{const paths=await readdir(root);return (await Promise.all(paths.map(async n=>(await stat(join(root,n))).size))).reduce((a,b)=>a+b,0);};
 assert.ok(await usage()<=100);assert.equal((await readdir(root)).length,1);
 assert.equal(await cache.put('oversize.jpg',Buffer.alloc(101)),false);
 await writeFile(join(root,'legacy.jpg'),bytes);await writeFile(join(root,'left.jpg.11111111-1111-1111-1111-111111111111.tmp'),bytes);
 const restarted=createImageCache({root,maxBytes:100,maxEntries:4});await restarted.ready;
 assert.ok(await usage()<=100);assert.equal((await readdir(root)).some(n=>n.endsWith('.tmp')),false);
 await assert.rejects(restarted.put('../escape.jpg',bytes));
});

test('old Bing variants redirect directly while protected originals remain local and IDs are checked',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'daily-direct-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const historyDir=join(dir,'history'),now=()=>Date.parse('2026-10-21T04:00:00Z');let calls=0;
 const service=createBingService({historyDir,cacheDir:join(dir,'cache'),now,fetchImpl:async()=>{calls++;return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});}});
 const row={date:'2018-09-11',id:'OHR.OldVariant',market:'zh-CN',title:'历史',description:'历史',copyright:'© Test',credit:'© Test'};
 await service.history.ingest({images:[row]});
 const path=join(historyDir,'2018-09.json'),data=JSON.parse(await readFile(path));
 data.images[0].bingVariant='1920x1080';data.images[0].delivery={mode:'bing',original:{variant:'1920x1080'},preview:{variant:'1920x1080'}};
 await writeFile(path,JSON.stringify(data));
 const app=createApp({service});app.listen(0,'127.0.0.1');await once(app,'listening');t.after(()=>new Promise(resolve=>{app.closeAllConnections();app.close(resolve);}));
 const base=`http://127.0.0.1:${app.address().port}/api/history/image?date=${row.date}&id=${row.id}`;
 const response=await fetch(`${base}&size=original&direct=1`,{redirect:'manual'});
 assert.equal(response.status,302);assert.equal(calls,0);
 const target=new URL(response.headers.get('location'));assert.equal(target.hostname,'cn.bing.com');assert.equal(target.searchParams.get('id'),`${row.id}_1920x1080.jpg`);assert.equal(target.searchParams.get('w'),'3840');
 assert.equal((await fetch(base.replace(row.id,'OHR.Wrong')+'&direct=1',{redirect:'manual'})).status,404);
 assert.equal((await fetch(base+'&size=unknown&direct=1',{redirect:'manual'})).status,400);
 await createMediaStore({root:join(historyDir,'media')}).put(row,jpeg());data.images[0].delivery.mode='local';await writeFile(path,JSON.stringify(data));
 const local=await fetch(base+'&direct=1&download=1',{redirect:'manual'});assert.equal(local.status,200);assert.match(local.headers.get('content-disposition'),/attachment/);assert.deepEqual(Buffer.from(await local.arrayBuffer()),jpeg());assert.equal(calls,0);
});

test('on-demand history validates and caches the recorded variant without creating durable originals',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'daily-ondemand-'));t.after(()=>rm(dir,{recursive:true,force:true}));let calls=0;
 const options={historyDir:join(dir,'history'),cacheDir:join(dir,'cache'),now:()=>Date.parse('2026-10-21T04:00:00Z')};
 const service=createBingService({...options,fetchImpl:async url=>{calls++;return url.hostname==='www.bing.com'?new Response('',{status:404}):new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}});}});
 const row={date:'2018-09-11',id:'OHR.VariantFallback',market:'zh-CN',title:'历史',description:'历史',copyright:'© Test',credit:'© Test'};
 await service.history.ingest({images:[row]});
 const images=await Promise.all(Array.from({length:8},()=>service.history.image(row.date,row.id,'original')));
 assert.equal(calls,2);assert.ok(images.every(bytes=>bytes.equals(jpeg())));
 assert.equal((await readdir(options.historyDir)).some(n=>n==='media'),false);
 const offline=createBingService({...options,fetchImpl:async()=>{throw new Error('offline');}});
 assert.deepEqual(await offline.history.image(row.date,row.id,'original'),jpeg());
});

test('migration preserves failed links, requires verified backup, and prunes only audited matching files',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'daily-migration-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const now=()=>Date.parse('2026-10-21T04:00:00Z');
 const service=createBingService({cacheDir:join(dir,'cache'),historyDir:dir,now,fetchImpl:async()=>new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}})});
 const rows=['Good','Missing','Degraded'].map((name,i)=>({date:`2026-10-${20-i}`,id:`OHR.${name}`,market:'zh-CN',title:name,description:'',copyright:'© Test',credit:'© Test'}));
 await service.history.ingest({images:rows});for(const row of rows)await service.history.saveImage(row.date,row.id);
 const receipt=await verifyHistoryBackup({root:dir,now});
 const available={status:'available',variant:'UHD',width:1920,height:1080};
 const audit={schemaVersion:1,images:rows.map((row,i)=>({...row,checkedAt:new Date(now()).toISOString(),original:i===1?{status:'unknown'}:i===2?{...available,width:640,height:360}:available,preview:available}))};
 const before=await readFile(join(dir,'2026-10.json'));
 await assert.rejects(migrateHistory({historyDir:dir,audit,receipt:{schemaVersion:1,files:{}},prune:true,now}),/backup required/);
 assert.deepEqual(await readFile(join(dir,'2026-10.json')),before,'failed preflight must not change indexes');
 assert.equal((await readdir(join(dir,'media'))).filter(n=>n.endsWith('.original.jpg')).length,3);
 const result=await migrateHistory({historyDir:dir,audit,receipt,prune:true,now});
 assert.equal(result.remote,1);assert.equal(result.retained.length,2);assert.equal(result.removedFiles,2);
 const saved=(await service.history.month('2026-10')).images;
 assert.equal(saved[0].delivery.mode,'bing');assert.equal(saved[0].availability.stored,false);
 assert.equal(saved[1].delivery.mode,'local');assert.equal(saved[2].delivery.mode,'local');
 assert.equal((await readdir(join(dir,'media'))).filter(n=>n.endsWith('.thumb.jpg')).length,3);
 assert.equal((await readdir(join(dir,'media'))).filter(n=>n.endsWith('.original.jpg')).length,2);
 assert.equal((await migrateHistory({historyDir:dir,audit,receipt,prune:true,now})).removedFiles,0);
});

test('expired audits retain originals and a tampered local backup cannot receive a receipt',async t=>{
 const root=await mkdtemp(join(tmpdir(),'daily-migration-expiry-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const now=()=>Date.parse('2026-10-21T04:00:00Z'),item={date:'2018-09-11',id:'OHR.Expired'};
 const media=createMediaStore({root:join(root,'media')});await media.put(item,jpeg());
 await writeFile(join(root,'2018-09.json'),JSON.stringify({schemaVersion:1,month:'2018-09',images:[{...item,availability:{stored:true}}]}));
 const receipt=await verifyHistoryBackup({root,now}),good={status:'available',variant:'UHD',width:1920,height:1080};
 const audit={schemaVersion:1,images:[{...item,checkedAt:'2026-10-01T00:00:00Z',original:good,preview:good}]};
 assert.equal((await migrateHistory({historyDir:root,audit,receipt,prune:true,now})).removedFiles,0);
 const name=(await readdir(join(root,'media'))).find(n=>n.endsWith('.original.jpg'));
 await writeFile(join(root,'media',name),'corrupt');await assert.rejects(verifyHistoryBackup({root,now}),/mismatch/);
});

test('thumbnail retry preserves transient failure when the alternate variant is missing',async t=>{
 const root=await mkdtemp(join(tmpdir(),'daily-thumb-retry-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const now=()=>Date.parse('2026-10-21T04:00:00Z'),row={date:'2026-10-21',id:'OHR.TransientThumb',market:'zh-CN',title:'风景',description:'',copyright:'© Test',credit:'© Test'};
 const service=createBingService({cacheDir:join(root,'cache'),historyDir:join(root,'history'),now,fetchImpl:async url=>url.hostname==='raw.githubusercontent.com'?Response.json({schemaVersion:1,market:'zh-CN',fetchedAt:new Date(now()).toISOString(),images:[row]}):new Response('',{status:url.hostname==='www.bing.com'?500:404})});
 const result=await service.syncHistory();assert.equal(result.pending,1);assert.equal(result.saved,0);
 assert.equal((await service.history.month('2026-10')).images[0].availability.status,'error');
});

test('cache disk failures do not prevent valid recent or historical images from loading',async t=>{
 const root=await mkdtemp(join(tmpdir(),'daily-cache-fault-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const cacheDir=join(root,'cache'),now=()=>Date.parse('2026-10-21T04:00:00Z'),row={date:'2026-10-21',id:'OHR.CacheFault',market:'zh-CN'};
 const service=createBingService({cacheDir,historyDir:join(root,'history'),now,fetchImpl:async()=>new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}})});
 await service.history.ingest({images:[row]});
 const remote='remote_'+createHash('sha256').update(bingImageUrl(row).href).digest('hex')+'.jpg';
 for(const name of [`${row.id}_UHD.jpg`,remote])await mkdir(join(cacheDir,'images',name),{recursive:true});
 assert.deepEqual(await service.image(row.id,'UHD'),jpeg());
 assert.deepEqual(await service.history.image(row.date,row.id,'original'),jpeg());
});
