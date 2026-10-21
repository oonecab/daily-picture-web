import {HttpError} from './errors.mjs';

export const MAX_IMAGE_BYTES=20*1024*1024;

// A lease owns its buffer until the consumer has finished sending/using it.
// Reserve the maximum BEFORE loading; concurrent consumers of one key share it.
export function createImageReadPool({maxBytes=64*1024*1024,maxItemBytes=MAX_IMAGE_BYTES,
  maxActive=4,maxQueued=32,maxConsumers=64,waitTimeoutMs=5000}={}) {
  for(const [value,min] of [[maxBytes,1],[maxItemBytes,1],[maxActive,1],[maxQueued,0],[maxConsumers,1],[waitTimeoutMs,1]]) {
    if(!Number.isSafeInteger(value) || value<min)throw new TypeError('Invalid image read limit');
  }
  if(maxItemBytes>maxBytes)throw new TypeError('Image read budget cannot fit one image');
  const entries=new Map(),queue=[];
  let active=0,reservedBytes=0,consumers=0;
  const busy=()=>new HttpError(503,'图片读取繁忙，请稍后重试。');
  const canStart=()=>active<maxActive && reservedBytes+maxItemBytes<=maxBytes;

  function remove(entry) {
    if(entry.state==='closed')return;
    clearTimeout(entry.timer);
    const index=queue.indexOf(entry);
    if(index>=0)queue.splice(index,1);
    entries.delete(entry.key);
    reservedBytes-=entry.reserved;
    entry.reserved=0;entry.value=null;entry.load=null;entry.state='closed';
  }
  function release(entry,consumer) {
    if(consumer.released)return;
    consumer.released=true;
    consumer.signal?.removeEventListener('abort',consumer.abort);
    entry.consumers.delete(consumer);consumers--;
    // An abandoned in-flight loader still owns its reservation until it settles.
    if(!entry.consumers.size && entry.state!=='loading')remove(entry);
    pump();
  }
  function deliver(entry,consumer) {
    consumer.signal?.removeEventListener('abort',consumer.abort);
    consumer.resolve({bytes:entry.value,release:()=>release(entry,consumer)});
  }
  function fail(entry,error) {
    remove(entry);
    for(const consumer of [...entry.consumers]) {
      consumer.reject(error);release(entry,consumer);
    }
    pump();
  }
  async function execute(entry) {
    let value,error;
    try {
      value=await entry.load();
      if(value!==null && !Buffer.isBuffer(value))throw new TypeError('Image reader must return a Buffer or null');
      if(value?.length>maxItemBytes)throw new Error('图片超过读取限制。');
    }catch(cause){error=cause;}
    active--;
    if(error){fail(entry,error);return;}
    reservedBytes-=entry.reserved-(value?.length || 0);
    entry.reserved=value?.length || 0;entry.value=value;entry.load=null;entry.state='ready';
    if(!entry.consumers.size)remove(entry);
    else for(const consumer of entry.consumers)deliver(entry,consumer);
    pump();
  }
  function pump() {
    while(queue.length && canStart()) {
      const entry=queue.shift();
      clearTimeout(entry.timer);
      entry.state='loading';entry.reserved=maxItemBytes;
      active++;reservedBytes+=maxItemBytes;
      void execute(entry);
    }
  }
  function acquire(key,load,{signal}={}) {
    if(signal?.aborted)return Promise.reject(signal.reason);
    if(consumers>=maxConsumers)return Promise.reject(busy());
    let entry=entries.get(key),fresh=false;
    if(!entry) {
      if(!canStart() && queue.length>=maxQueued)return Promise.reject(busy());
      entry={key,load,state:'queued',reserved:0,value:null,consumers:new Set()};
      entries.set(key,entry);fresh=true;
    }
    const result=new Promise((resolve,reject)=>{
      const consumer={resolve,reject,signal,released:false};
      consumer.abort=()=>{reject(signal.reason);release(entry,consumer);};
      consumers++;entry.consumers.add(consumer);
      signal?.addEventListener('abort',consumer.abort,{once:true});
      if(entry.state==='ready')deliver(entry,consumer);
    });
    if(fresh) {
      queue.push(entry);pump();
      if(entry.state==='queued')entry.timer=setTimeout(()=>fail(entry,busy()),waitTimeoutMs);
    }
    return result;
  }
  return {acquire,stats:()=>({active,queued:queue.length,consumers,reservedBytes,entries:entries.size})};
}
