import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink,open} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import sharp from 'sharp';
import {HttpError} from './errors.mjs';
import {inspectJpeg} from './jpeg.mjs';
import {createImageReadPool,MAX_IMAGE_BYTES} from './image-reads.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const MEDIA_SIZES=Object.freeze(['thumb','preview','original']);
sharp.cache({memory:32,files:0,items:32});
sharp.concurrency(1);
let resizing=0;const resizeQueue=[];
export async function resizeJpeg(bytes,width,quality) {
  if(resizing>=2){if(resizeQueue.length>=32)throw new HttpError(503,'图片处理繁忙，请稍后重试。');await new Promise(resolve=>resizeQueue.push(resolve));}else resizing++;
  try{return await sharp(bytes,{failOn:'warning',limitInputPixels:40000000,sequentialRead:true}).rotate()
    .resize({width,withoutEnlargement:true}).jpeg({quality,mozjpeg:false}).timeout({seconds:15}).toBuffer();}
  finally{const next=resizeQueue.shift();if(next)next();else resizing--;}
}

// Persistent original/derivative files are independent of the disposable cache.
export function createMediaStore({root,maxConcurrent=2,maxQueued=32,reads=createImageReadPool()}) {
  if(!Number.isSafeInteger(maxConcurrent) || maxConcurrent<1 || !Number.isSafeInteger(maxQueued) || maxQueued<0)throw new TypeError('Invalid media resource limit');
  let active=0;const queue=[],flights=new Map(),storeKey=resolve(root);
  function key(item) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(item?.date || '') || !/^OHR\.[A-Za-z0-9_-]{1,180}$/.test(item?.id || '')) throw new HttpError(400,'图片标识无效。');
    return `${item.date}_${digest(item.id).slice(0,32)}`;
  }
  async function atomic(path,bytes) {
    const temporary=`${path}.${randomUUID()}.tmp`;
    try {await writeFile(temporary,bytes);await rename(temporary,path);}
    finally {await unlink(temporary).catch(()=>{});}
  }
  async function manifest(item) {
    const name=key(item);
    try {
      const data=JSON.parse(await readFile(join(root,`${name}.json`),'utf8'));
      return data.schemaVersion===1 && data.id===item.id && data.date===item.date && data.files ? data : null;
    } catch(error) {if(error.code && error.code!=='ENOENT')throw error;return null;}
  }
  async function get(item,size='original') {
    if(!MEDIA_SIZES.includes(size))throw new HttpError(400,'不支持这个历史图片尺寸。');
    const name=key(item);
    const lease=await reads.acquire(`${storeKey}:${name}:${size}`,async()=>{
      const file=(await manifest(item))?.files[size];
      if(!file || !Number.isSafeInteger(file.bytes) || file.bytes<1 || file.bytes>MAX_IMAGE_BYTES)return null;
      let handle;
      try {
        handle=await open(join(root,`${name}.${size}.jpg`),'r');
        if((await handle.stat()).size!==file.bytes)return null;
        // A fixed allocation also bounds growth/corruption while a file is open.
        const bytes=Buffer.alloc(file.bytes);let offset=0;
        while(offset<bytes.length) {
          const {bytesRead}=await handle.read(bytes,offset,bytes.length-offset,offset);
          if(!bytesRead)return null;
          offset+=bytesRead;
        }
        return digest(bytes)===file.sha256 ? bytes : null;
      }catch(error){if(error.code==='ENOENT')return null;throw error;}
      finally{await handle?.close();}
    });
    try{return lease.bytes;}finally{lease.release();}
  }
  async function put(item,bytes,{thumbnailOnly=false}={}) {
    const name=key(item);
    if(flights.has(name))return flights.get(name);
    const task=(async()=>{
      if(active>=maxConcurrent) {
        if(queue.length>=maxQueued)throw new HttpError(503,'图片处理繁忙，请稍后重试。');
        await new Promise(resolve=>queue.push(resolve));
      } else active++;
      try {
        if(bytes.length>20*1024*1024)throw new Error('图片超过存储限制。');
        const dimensions=inspectJpeg(bytes);
        const options={failOn:'warning',limitInputPixels:40000000,sequentialRead:true};
        // Full decode while resizing rejects malformed scan data, not only bad headers.
        const previous=thumbnailOnly?await manifest(item):null;
        const resized={},sizes={original:dimensions};
        for(const [size,width,quality] of [['thumb',640,78],['preview',1920,86]]) {
          if(thumbnailOnly&&size!=='thumb')continue;
          const {data,info}=await sharp(bytes,options).rotate().resize({width,withoutEnlargement:true})
            .jpeg({quality,mozjpeg:false}).timeout({seconds:15}).toBuffer({resolveWithObject:true});
          resized[size]=data;sizes[size]={width:info.width,height:info.height};
        }
        const files={...(previous?.files||{})},all={...(!thumbnailOnly?{original:bytes}:{}),...resized};
        await mkdir(root,{recursive:true});
        for(const [size,content] of Object.entries(all)) {
          const metadata=sizes[size];
          files[size]={...metadata,bytes:content.length,sha256:digest(content)};
          await atomic(join(root,`${name}.${size}.jpg`),content);
        }
        const result={schemaVersion:1,id:item.id,date:item.date,...(previous?.files.original?{width:previous.width,height:previous.height}:dimensions),files};
        await atomic(join(root,`${name}.json`),JSON.stringify(result));
        return result;
      } finally {const next=queue.shift();if(next)next();else active--;}
    })().finally(()=>flights.delete(name));
    flights.set(name,task);return task;
  }
  return {get,put,manifest};
}
