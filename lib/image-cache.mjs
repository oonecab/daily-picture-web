import {mkdir,readdir,stat,open,writeFile,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {MAX_IMAGE_BYTES} from './image-reads.mjs';

export const IMAGE_CACHE_BYTES=256*1024*1024;
export function createImageCache({root,maxBytes=IMAGE_CACHE_BYTES,maxEntries=140}) {
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isSafeInteger(maxEntries)||maxEntries<1)throw new TypeError('Invalid image cache budget');
  let writes=Promise.resolve();
  function path(key){if(!/^[A-Za-z0-9_.-]{1,300}\.jpg$/.test(key))throw new TypeError('Invalid cache key');return join(root,key);}
  async function files(){
    return (await Promise.all((await readdir(root)).filter(n=>n.endsWith('.jpg')).map(async name=>{
      try{const info=await stat(join(root,name));return info.isFile()?{name,bytes:info.size,time:info.mtimeMs}:null;}
      catch(e){if(e.code==='ENOENT')return null;throw e;}
    }))).filter(Boolean).sort((a,b)=>a.time-b.time||a.name.localeCompare(b.name));
  }
  async function remove(name){await unlink(join(root,name)).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  async function trim(incoming=0){
    const entries=await files();let bytes=entries.reduce((sum,e)=>sum+e.bytes,0);
    while(entries.length && (bytes+incoming>maxBytes || entries.length+(incoming?1:0)>maxEntries)){
      const entry=entries.shift();await remove(entry.name);bytes-=entry.bytes;
    }
  }
  const ready=(async()=>{
    await mkdir(root,{recursive:true});
    // One service owns this directory. Abandoned atomic writes count as disk use.
    for(const name of await readdir(root))if(/\.jpg\.[0-9a-f-]{36}\.tmp$/.test(name))await remove(name);
    await trim();
  })();
  async function get(key){
    const target=path(key);await ready;let handle;
    try{
      handle=await open(target,'r');const size=(await handle.stat()).size;
      if(size<4||size>Math.min(maxBytes,MAX_IMAGE_BYTES))return null;
      const bytes=Buffer.alloc(size);let offset=0;
      while(offset<size){const result=await handle.read(bytes,offset,size-offset,offset);if(!result.bytesRead)return null;offset+=result.bytesRead;}
      return bytes[0]===255&&bytes[1]===216?bytes:null;
    }catch(e){if(e.code==='ENOENT')return null;throw e;}
    finally{await handle?.close();}
  }
  async function put(key,bytes){
    const target=path(key);if(bytes.length>Math.min(maxBytes,MAX_IMAGE_BYTES))return false;
    const work=writes.then(async()=>{
      await ready;
      // Evict before creating a temporary file, so concurrent writes cannot overshoot.
      await remove(key);await trim(bytes.length);
      const temporary=`${target}.${randomUUID()}.tmp`;
      try{await writeFile(temporary,bytes,{flag:'wx'});await rename(temporary,target);}
      finally{await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
      return true;
    });writes=work.catch(()=>{});return work;
  }
  return {get,put,ready};
}
