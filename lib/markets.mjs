import {join} from 'node:path';
import {HttpError} from './errors.mjs';

export const MARKETS=Object.freeze({
  'zh-CN':{label:'中国',timeZone:'Asia/Shanghai',country:'CN',language:'zh',firstMonth:'2018-09'},
  'en-US':{label:'美国',timeZone:'America/Los_Angeles',country:'US',language:'en',firstMonth:'2010-01'},
  'en-GB':{label:'英国',timeZone:'Europe/London',country:'GB',language:'en',firstMonth:'2024-04'},
  'ja-JP':{label:'日本',timeZone:'Asia/Tokyo',country:'JP',language:'ja',firstMonth:'2024-04'},
  'de-DE':{label:'德国',timeZone:'Europe/Berlin',country:'DE',language:'de',firstMonth:'2024-04'},
  'fr-FR':{label:'法国',timeZone:'Europe/Paris',country:'FR',language:'fr',firstMonth:'2024-04'},
});
export function validateMarket(market){
  if(!Object.hasOwn(MARKETS,market))throw new HttpError(400,'不支持这个图片地区。');
  return market;
}
export function marketToday(market,now=Date.now){
  validateMarket(market);
  return new Intl.DateTimeFormat('en-CA',{timeZone:MARKETS[market].timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now()));
}
export function marketHistoryDir(root,market){
  validateMarket(market);
  return market==='zh-CN'?root:join(root,'markets',market);
}
export function marketIndexPath(market){
  validateMarket(market);
  return market==='zh-CN'?'latest.json':`markets/${market}/latest.json`;
}
