import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import sharp from 'sharp';
import {createMediaStore} from '../lib/media.mjs';

const item={date:'2018-09-30',id:'OHR.TheLongWalk_EN-AU11094733779'};
const original=await sharp({create:{width:3840,height:2160,channels:3,background:'#5e7c92'}}).jpeg({quality:95}).toBuffer();
async function setup(t) {
  const root=await mkdtemp(join(tmpdir(),'daily-media-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  return {root,media:createMediaStore({root})};
}
test('owned images retain original bytes and produce real small thumbnails and previews across restart',async t=>{
  const {root,media}=await setup(t);
  const saved=await media.put(item,original);
  assert.equal(saved.width,3840);assert.equal(saved.height,2160);
  assert.deepEqual(await media.get(item,'original'),original);
  const thumbnail=await media.get(item,'thumb'),preview=await media.get(item,'preview');
  assert.equal((await sharp(thumbnail).metadata()).width,640);
  assert.equal((await sharp(thumbnail).metadata()).height,360);
  assert.equal((await sharp(preview).metadata()).width,1920);
  assert.ok(thumbnail.length<original.length/8);
  assert.deepEqual(await createMediaStore({root}).get(item,'thumb'),thumbnail);
  assert.equal(await media.get({...item,id:'OHR.Different'},'thumb'),null);
});
test('media rejects structurally plausible but undecodable JPEG and never publishes it',async t=>{
  const {media}=await setup(t);
  const malformed=Buffer.from([255,216,255,192,0,11,8,4,56,7,128,1,1,17,0,255,218,0,8,1,1,0,0,63,0,1,2,3,255,217]);
  await assert.rejects(media.put(item,malformed));
  await assert.rejects(media.put(item,Buffer.from('<html>not a photo</html>')));
  assert.equal(await media.get(item,'original'),null);
});
test('media never enlarges small images and rejects unsupported variants and unsafe identifiers',async t=>{
  const {media}=await setup(t);
  const small=await sharp({create:{width:400,height:240,channels:3,background:'#aabbcc'}}).jpeg().toBuffer();
  await media.put(item,small);
  assert.equal((await sharp(await media.get(item,'thumb')).metadata()).width,400);
  await assert.rejects(media.get(item,'../../secret'),{status:400});
  await assert.rejects(media.put({...item,id:'../../secret'},original),{status:400});
});
test('corrupt owned media is not served and can be repaired from the retained original',async t=>{
  const {root,media}=await setup(t);
  await media.put(item,original);
  const files=await readdir(root),thumb=files.find(x=>x.endsWith('.thumb.jpg'));
  await writeFile(join(root,thumb),'damaged');
  assert.equal(await media.get(item,'thumb'),null);
  assert.deepEqual(await media.get(item,'original'),original);
  await media.put(item,original);
  assert.equal((await sharp(await media.get(item,'thumb')).metadata()).width,640);
});
test('a panoramic original produces a valid thumbnail shorter than the original minimum height',async t=>{
  const {media}=await setup(t);
  const panorama=await sharp({create:{width:4000,height:1000,channels:3,background:'#aabbcc'}}).jpeg().toBuffer();
  await media.put(item,panorama);
  assert.equal((await sharp(await media.get(item,'thumb')).metadata()).height,160);
});
test('image processing rejects excess work and releases its capacity after failure',async t=>{
  const {root}=await setup(t),media=createMediaStore({root,maxConcurrent:1,maxQueued:0});
  const first=media.put(item,original);
  await assert.rejects(media.put({...item,id:'OHR.Queue'},original),{status:503});
  await first;
  await assert.rejects(media.put(item,Buffer.from('invalid')));
  await media.put({...item,id:'OHR.AfterFailure'},original);
  assert.ok(await media.get({...item,id:'OHR.AfterFailure'},'thumb'));
});
test('media rejects excessive compressed bytes and decoded pixel count before publication',async t=>{
  const {media}=await setup(t);
  await assert.rejects(media.put(item,Buffer.alloc(21*1024*1024)),/存储限制/);
  const huge=await sharp({create:{width:8000,height:6000,channels:3,background:'#8899aa'}}).jpeg().toBuffer();
  await assert.rejects(media.put(item,huge),/pixel limit/i);
  assert.equal(await media.get(item,'original'),null);
});
test('simultaneous readers share one verified buffer without hiding later disk corruption',async t=>{
  const {root,media}=await setup(t);
  await media.put(item,original);
  const results=await Promise.all(Array.from({length:16},()=>media.get(item,'original')));
  assert.equal(new Set(results).size,1,'one image must not allocate one buffer per reader');
  const file=(await readdir(root)).find(name=>name.endsWith('.original.jpg'));
  await writeFile(join(root,file),Buffer.alloc(original.length));
  assert.equal(await media.get(item,'original'),null,'completed reads must not become an unchecked permanent cache');
});
