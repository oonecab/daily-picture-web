import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {createImageReadPool} from '../lib/image-reads.mjs';
import {createApp} from '../server.mjs';

function gate(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
async function until(check){for(let i=0;i<500;i++){if(check())return;await delay(5);}throw Error('Condition did not become true');}
const empty={active:0,queued:0,consumers:0,reservedBytes:0,entries:0};

test('image read leases share a buffer and keep its budget until the final consumer releases it',async()=>{
  const pool=createImageReadPool({maxBytes:8,maxItemBytes:4,maxActive:2,maxQueued:1});
  const a=gate(),b=gate();let calls=0;
  const first=pool.acquire('a',async()=>{calls++;await a.promise;return Buffer.alloc(4);});
  const shared=pool.acquire('a',()=>{throw Error('duplicate load');});
  const second=pool.acquire('b',async()=>{calls++;await b.promise;return Buffer.alloc(4);});
  const queued=pool.acquire('c',async()=>{calls++;return Buffer.alloc(4);});
  await assert.rejects(pool.acquire('overflow',()=>Buffer.alloc(4)),{status:503});
  assert.equal(pool.stats().reservedBytes,8);assert.equal(calls,2);
  a.resolve();b.resolve();const [one,two,three]=await Promise.all([first,shared,second]);
  assert.equal(one.bytes,two.bytes);assert.equal(pool.stats().queued,1);
  one.release();assert.equal(pool.stats().reservedBytes,8,'another slow reader still owns the same buffer');
  two.release();const four=await queued;
  assert.equal(calls,3);assert.equal(pool.stats().reservedBytes,8);
  three.release();four.release();four.release();assert.deepEqual(pool.stats(),empty);
});

test('read queue timeouts, disconnects, failures and oversized results release all capacity',async()=>{
  const pool=createImageReadPool({maxBytes:4,maxItemBytes:4,maxQueued:1,waitTimeoutMs:25});
  const held=await pool.acquire('held',()=>Buffer.alloc(4));
  await assert.rejects(pool.acquire('timed-out',()=>{throw Error('must not load');}),{status:503});
  const abort=new AbortController();
  const cancelled=pool.acquire('cancelled',()=>{throw Error('must not load');},{signal:abort.signal});
  abort.abort();await assert.rejects(cancelled,{name:'AbortError'});
  assert.equal(pool.stats().consumers,1);held.release();
  await assert.rejects(pool.acquire('failed',()=>{throw Error('disk failed');}),/disk failed/);
  await assert.rejects(pool.acquire('too-large',()=>Buffer.alloc(5)),/读取限制/);
  const recovery=await pool.acquire('recovery',()=>Buffer.alloc(4));recovery.release();
  assert.deepEqual(pool.stats(),empty);
});

test('an aborted loader keeps its reservation until it settles and shared readers survive another cancellation',async()=>{
  const pool=createImageReadPool({maxBytes:4,maxItemBytes:4,maxQueued:1,maxConsumers:2});
  const pending=gate(),abort=new AbortController();
  const first=pool.acquire('same',async()=>{await pending.promise;return Buffer.alloc(4);},{signal:abort.signal});
  const shared=pool.acquire('same',()=>{throw Error('duplicate load');});
  await assert.rejects(pool.acquire('same',()=>Buffer.alloc(4)),{status:503});
  abort.abort();await assert.rejects(first,{name:'AbortError'});
  assert.equal(pool.stats().reservedBytes,4);
  const later=pool.acquire('later',()=>Buffer.alloc(4));
  pending.resolve();const survivor=await shared;
  assert.equal(pool.stats().queued,1);survivor.release();
  const last=await later;last.release();assert.deepEqual(pool.stats(),empty);
});

test('all consumers cancelling cannot admit new work until the abandoned read settles',async()=>{
  const pool=createImageReadPool({maxBytes:4,maxItemBytes:4,maxQueued:1});
  const pending=gate(),abort=new AbortController();let nextStarted=false;
  const first=pool.acquire('abandoned',async()=>{await pending.promise;return Buffer.alloc(4);},{signal:abort.signal});
  abort.abort();await assert.rejects(first,{name:'AbortError'});
  const next=pool.acquire('next',()=>{nextStarted=true;return Buffer.alloc(4);});
  assert.equal(pool.stats().reservedBytes,4);assert.equal(nextStarted,false);
  pending.resolve();const recovered=await next;recovered.release();assert.deepEqual(pool.stats(),empty);
});

test('the I/O concurrency limit applies even when the byte budget could fit more reads',async()=>{
  const pool=createImageReadPool({maxBytes:12,maxItemBytes:4,maxActive:1,maxQueued:2}),pending=gate();
  let started=0;
  const first=pool.acquire('one',async()=>{started++;await pending.promise;return Buffer.alloc(4);});
  const second=pool.acquire('two',()=>{started++;return Buffer.alloc(4);});
  const third=pool.acquire('three',()=>{started++;return Buffer.alloc(4);});
  assert.equal(started,1);assert.equal(pool.stats().queued,2);
  pending.resolve();const leases=await Promise.all([first,second,third]);
  assert.equal(started,3);for(const lease of leases)lease.release();assert.deepEqual(pool.stats(),empty);
});

async function httpFixture(t,{maxQueued=0,timeout=30000}={}) {
  const bytes=Buffer.alloc(8*1024*1024,42),pool=createImageReadPool({maxBytes:bytes.length,maxItemBytes:bytes.length,maxQueued});
  let calls=0;
  const image=async()=>{calls++;return bytes;};
  const server=createApp({service:{image,history:{image}},imageReads:pool,imageSendTimeoutMs:timeout});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const requests=[];
  t.after(()=>{for(const request of requests)request.destroy();server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  async function slow(path='/api/history/image?date=2026-10-21&id=OHR.Slow') {
    const request=http.get(base+path);requests.push(request);request.on('error',()=>{});
    const [response]=await once(request,'response');response.on('error',()=>{});response.pause();
    return {request,response};
  }
  return {pool,base,slow,requests,calls:()=>calls};
}
test('slow HTTP clients retain one shared buffer, reject other images at capacity, and free it on disconnect',async t=>{
  const {pool,base,slow,calls}=await httpFixture(t);
  const first=await slow(),second=await slow();
  assert.equal(calls(),1);assert.equal(pool.stats().consumers,2);
  assert.equal(pool.stats().reservedBytes,8*1024*1024);
  const busy=await fetch(base+'/api/image?id=OHR.Different');
  assert.equal(busy.status,503);assert.equal(busy.headers.get('retry-after'),'5');assert.equal(busy.headers.get('cache-control'),'no-store');
  assert.equal((await fetch(base+'/api/health')).status,200);
  first.request.destroy();await until(()=>pool.stats().consumers===1);
  assert.equal(pool.stats().reservedBytes,8*1024*1024);
  second.request.destroy();await until(()=>pool.stats().consumers===0);
  assert.deepEqual(pool.stats(),empty);
  const recovered=await fetch(base+'/api/history/image?date=2026-10-21&id=OHR.Next&download=1');
  assert.equal((await recovered.arrayBuffer()).byteLength,8*1024*1024);
  assert.match(recovered.headers.get('content-disposition'),/Bing_CN_2026-10-21.jpg/);
  const head=await fetch(base+'/api/image?id=OHR.Head',{method:'HEAD'});
  assert.equal(Number(head.headers.get('content-length')),8*1024*1024);assert.equal(await head.text(),'');
  await until(()=>pool.stats().consumers===0);
});

test('queued HTTP disconnects never start a read and stalled responses expire',async t=>{
  const {pool,base,slow,requests,calls}=await httpFixture(t,{maxQueued:1,timeout:500});
  await slow();
  const queued=http.get(base+'/api/image?id=OHR.Queued');requests.push(queued);queued.on('error',()=>{});
  await until(()=>pool.stats().queued===1);
  queued.destroy();await until(()=>pool.stats().queued===0);
  assert.equal(calls(),1);
  await until(()=>pool.stats().consumers===0);
  assert.deepEqual(pool.stats(),empty);
  const after=await fetch(base+'/api/image?id=OHR.AfterTimeout',{method:'HEAD'});
  assert.equal(after.status,200);
});
