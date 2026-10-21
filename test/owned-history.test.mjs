import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import sharp from 'sharp';
import {createBingService} from '../lib/bing.mjs';

const now=()=>Date.parse('2026-10-21T04:00:00Z');
const row={id:'OHR.OwnedImage',date:'2026-10-20',market:'zh-CN',title:'测试风景',description:'测试',copyright:'© Test',credit:'© Test',sourceUrl:'https://www.bing.com'};
const original=await sharp({create:{width:3840,height:2160,channels:3,background:'#668899'}}).jpeg().toBuffer();
async function setup(t,extras={}) {
  const dir=await mkdtemp(join(tmpdir(),'daily-owned-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const options={cacheDir:join(dir,'cache'),historyDir:join(dir,'history'),now,...extras};
  return {options,service:createBingService(options)};
}
test('ordinary history reads never fetch third-party indexes or images',async t=>{
  let calls=0;const {service}=await setup(t,{fetchImpl:async()=>{calls++;throw new Error('offline');}});
  await service.history.ingest({images:[row]});
  assert.equal((await service.history.month('2026-10')).images.length,1);
  assert.equal((await service.history.month('2018-09')).imported,false);
  await assert.rejects(service.history.image(row.date,row.id,'thumb'),{status:404});
  assert.equal(calls,0);
});
test('background image collection persists three variants and survives an offline restart',async t=>{
  let calls=0;const {service,options}=await setup(t,{fetchImpl:async()=>{calls++;return new Response(original,{headers:{'Content-Type':'image/jpeg'}});}});
  await service.history.ingest({images:[row]});
  await service.history.saveImage(row.date,row.id);
  assert.equal(calls,1);
  const again=createBingService({...options,fetchImpl:async()=>{throw new Error('must remain offline');}});
  assert.deepEqual(await again.history.image(row.date,row.id),original);
  assert.equal((await sharp(await again.history.image(row.date,row.id,'thumb')).metadata()).width,640);
  assert.equal((await sharp(await again.history.image(row.date,row.id,'preview')).metadata()).width,1920);
  await assert.rejects(again.history.image(row.date,row.id,'invalid'),{status:400});
});
