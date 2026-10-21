import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {HttpError} from './errors.mjs';
import {inspectJpeg} from './jpeg.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const MEDIA_SIZES=Object.freeze(['thumb','preview','original']);
sharp.cache({memory:32,files:0,items:32});
sharp.concurrency(1);

// Persistent original/derivative files are independent of the disposable cache.
export function createMediaStore({root,maxConcurrent=2,maxQueued=32}) {
  if(!Number.isSafeInteger(maxConcurrent) || maxConcurrent<1 || !Number.isSafeInteger(maxQueued) || maxQueued<0)throw new TypeError('Invalid media resource limit');
  let active=0;const queue=[],flights=new Map();
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
    const name=key(item),data=await manifest(item),file=data?.files[size];
    if(!file)return null;
    try {
      const bytes=await readFile(join(root,`${name}.${size}.jpg`));
      if(bytes.length!==file.bytes || digest(bytes)!==file.sha256)return null;
      return bytes;
    }catch(error){if(error.code==='ENOENT')return null;throw error;}
  }
  async function put(item,bytes) {
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
        const resized={},sizes={original:dimensions};
        for(const [size,width,quality] of [['thumb',640,78],['preview',1920,86]]) {
          const {data,info}=await sharp(bytes,options).rotate().resize({width,withoutEnlargement:true})
            .jpeg({quality,mozjpeg:false}).timeout({seconds:15}).toBuffer({resolveWithObject:true});
          resized[size]=data;sizes[size]={width:info.width,height:info.height};
        }
        const files={},all={original:bytes,...resized};
        await mkdir(root,{recursive:true});
        for(const [size,content] of Object.entries(all)) {
          const metadata=sizes[size];
          files[size]={...metadata,bytes:content.length,sha256:digest(content)};
          await atomic(join(root,`${name}.${size}.jpg`),content);
        }
        const result={schemaVersion:1,id:item.id,date:item.date,...dimensions,files};
        await atomic(join(root,`${name}.json`),JSON.stringify(result));
        return result;
      } finally {const next=queue.shift();if(next)next();else active--;}
    })().finally(()=>flights.delete(name));
    flights.set(name,task);return task;
  }
  return {get,put,manifest};
}
