import {mkdtemp,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {createBingService} from '../lib/bing.mjs';
import {MARKETS,marketIndexPath,validateMarket} from '../lib/markets.mjs';

export async function collectIndex({output,market='zh-CN',fetchImpl=fetch,now=Date.now}) {
  validateMarket(market);
  const cache=await mkdtemp(join(tmpdir(),'daily-index-'));
  try {
    await mkdir(output,{recursive:true});
    const service=createBingService({cacheDir:cache,historyDir:output,fetchImpl,now});
    const result=await service.archive(market,true);
    if(result.stale || result.historyWarning)throw new Error('Daily index collection did not finish');
    const dates=new Set(),images=result.images.filter(row=>{if(dates.has(row.date))return false;dates.add(row.date);return true;});
    const data={schemaVersion:1,market,fetchedAt:result.fetchedAt,images};
    const path=join(output,marketIndexPath(market)),temporary=`${path}.tmp`;
    await mkdir(dirname(path),{recursive:true});
    await writeFile(temporary,JSON.stringify(data,null,2)+'\n');await rename(temporary,path);
    return {count:data.images.length,newest:data.images[0].date,oldest:data.images.at(-1).date};
  }finally{await rm(cache,{recursive:true,force:true});}
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const {values}=parseArgs({options:{output:{type:'string'},market:{type:'string',default:'all'}}});
  if(!values.output)throw new Error('--output is required');
  const markets=values.market==='all'?Object.keys(MARKETS):[validateMarket(values.market)];
  for(const market of markets) {
    try {console.log(JSON.stringify({market,...await collectIndex({output:resolve(values.output),market})}));}
    catch(error){console.error(JSON.stringify({market,error:error.message}));process.exitCode=1;}
  }
}
