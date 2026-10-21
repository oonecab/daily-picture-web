import {mkdtemp,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {createBingService} from '../lib/bing.mjs';

export async function collectIndex({output,fetchImpl=fetch,now=Date.now}) {
  const cache=await mkdtemp(join(tmpdir(),'daily-index-'));
  try {
    await mkdir(output,{recursive:true});
    const service=createBingService({cacheDir:cache,historyDir:output,fetchImpl,now});
    const result=await service.archive('zh-CN',true);
    if(result.stale || result.historyWarning)throw new Error('Daily index collection did not finish');
    const dates=new Set(),images=result.images.filter(row=>{if(dates.has(row.date))return false;dates.add(row.date);return true;});
    const data={schemaVersion:1,market:'zh-CN',fetchedAt:result.fetchedAt,images};
    const path=join(output,'latest.json'),temporary=`${path}.tmp`;
    await writeFile(temporary,JSON.stringify(data,null,2)+'\n');await rename(temporary,path);
    return {count:data.images.length,newest:data.images[0].date,oldest:data.images.at(-1).date};
  }finally{await rm(cache,{recursive:true,force:true});}
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const {values}=parseArgs({options:{output:{type:'string'}}});
  if(!values.output)throw new Error('--output is required');
  console.log(JSON.stringify(await collectIndex({output:resolve(values.output)})));
}
