import sharp from 'sharp';
import {inspectJpeg} from './jpeg.mjs';
import {HttpError} from './errors.mjs';

export function bingImageUrl(item,size='original',variant) {
  if(!/^OHR\.[A-Za-z0-9_-]{1,180}$/.test(item?.id||'')||item.id.startsWith('OHR.HistoryCN_')||!['thumb','preview','original'].includes(size))throw new HttpError(400,'图片来源标识无效。');
  variant ||= item.delivery?.[size]?.variant || item.delivery?.original?.variant || item.bingVariant || 'UHD';
  if(!['UHD','1920x1080'].includes(variant))throw new HttpError(400,'图片来源尺寸无效。');
  const url=new URL(variant==='1920x1080'?'https://cn.bing.com/th':'https://www.bing.com/th');
  url.searchParams.set('id',`${item.id}_${size==='thumb'&&variant==='UHD'?'640x360':variant}.jpg`);
  if(size!=='original'||variant==='1920x1080'){
    const [w,h]=size==='thumb'?[640,360]:size==='preview'?[1920,1080]:[3840,2160];
    url.searchParams.set('w',String(w));url.searchParams.set('h',String(h));url.searchParams.set('rs','1');url.searchParams.set('c','4');
  }
  return url;
}
export function bingImageCandidates(item,size){
  const first=bingImageUrl(item,size),other=first.hostname==='cn.bing.com'?'UHD':'1920x1080';
  return [first,bingImageUrl(item,size,other)];
}
let active=0;const waiting=[];
export async function validateRemoteJpeg({bytes,type}) {
  if(!type.startsWith('image/jpeg')||bytes.length>20*1024*1024)throw new Error('来源图片无效。');
  const dimensions=inspectJpeg(bytes);
  if(active>=2){if(waiting.length>=32)throw new HttpError(503,'图片校验繁忙，请稍后重试。');await new Promise(resolve=>waiting.push(resolve));}else active++;
  try{await sharp(bytes,{failOn:'warning',limitInputPixels:40000000}).timeout({seconds:15}).stats();return dimensions;}
  finally{const next=waiting.shift();if(next)next();else active--;}
}
