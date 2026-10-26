import {mkdir,open,unlink,writeFile,rename,statfs} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {createBingService} from '../lib/bing.mjs';
import {MARKETS,marketHistoryDir,validateMarket} from '../lib/markets.mjs';

export const MINIMUM_FREE_BYTES=10*1024**3;
async function freeBytes(path){const info=await statfs(path);return info.bavail*info.bsize;}

// This importer deliberately calls saveThumbnail, never saveImage. Full-size
// source bytes exist only in bounded memory while a thumbnail is being created.
export async function importRegion({historyDir,cacheDir=join(historyDir,'.cache'),market,from,through,
  fetchImpl=fetch,now=Date.now,concurrency=2,minimumFreeBytes=MINIMUM_FREE_BYTES,getFreeBytes=freeBytes,onProgress=()=>{}}) {
  validateMarket(market);
  if(market==='zh-CN')throw new Error('Use the existing China importer; this command only adds overseas regions');
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)throw new Error('Concurrency must be 1 to 4');
  if(!Number.isFinite(minimumFreeBytes)||minimumFreeBytes<MINIMUM_FREE_BYTES)throw new Error('Keep at least 10 GiB free');
  await mkdir(historyDir,{recursive:true});
  const lockPath=join(historyDir,'.regions-import.lock'),lock=await open(lockPath,'wx');
  const report={market,startedAt:new Date(now()).toISOString(),months:[],images:0,saved:0,failures:[],minimumFreeBytes};
  const regionDir=marketHistoryDir(historyDir,market);
  let saves=Promise.resolve(),stopped;
  const checkpoint=()=>{
    const value=JSON.stringify(report,null,2)+'\n';
    saves=saves.then(async()=>{await mkdir(regionDir,{recursive:true});const file=join(regionDir,'import-report.json');await writeFile(`${file}.tmp`,value);await rename(`${file}.tmp`,file);});
    return saves;
  };
  const guard=async()=>{
    if(stopped)throw stopped;
    const available=await getFreeBytes(historyDir);
    if(!Number.isFinite(available)||available<minimumFreeBytes) {
      stopped=new Error(`Import paused: ${available} bytes available; reserve ${minimumFreeBytes}`);
      throw stopped;
    }
  };
  try {
    await guard();
    const history=createBingService({historyDir,cacheDir,historyMode:'import',fetchImpl,now}).historyFor(market);
    const months=(await history.catalog()).months.reverse();
    from ||= MARKETS[market].firstMonth;through ||= months.at(-1);
    if(!months.includes(from)||!months.includes(through)||from>through)throw new Error('Invalid import month range');
    Object.assign(report,{from,through,concurrency});
    for(const month of months.filter(value=>value>=from&&value<=through)) {
      await guard();
      let items;
      try {
        const data=await history.month(month);items=data.images;
        report.months.push({month,count:items.length,stale:data.stale,missing:data.providerMissing});report.images+=items.length;
        if(data.stale||data.providerMissing)report.failures.push({month,kind:'index',message:data.warning||'Source month is missing'});
      } catch(error) {
        report.months.push({month,count:0,error:error.message});report.failures.push({month,kind:'index',message:error.message});
      }
      onProgress({market,phase:'index',...report.months.at(-1)});await checkpoint();
      if(!items)continue;
      let next=0;
      const workers=await Promise.allSettled(Array.from({length:concurrency},async()=>{
        while(next<items.length&&!stopped) {
          await guard();
          const row=items[next++];if(!row)break;
          try {await history.saveThumbnail(row.date,row.id);report.saved++;}
          catch(error){report.failures.push({date:row.date,id:row.id,kind:'thumbnail',message:error.message});}
          onProgress({market,phase:'thumbnail',date:row.date,saved:report.saved,failures:report.failures.length});
        }
      }));
      await checkpoint();
      const failure=workers.find(value=>value.status==='rejected');if(failure)throw failure.reason;
    }
    report.finishedAt=new Date(now()).toISOString();await checkpoint();return report;
  } catch(error) {
    report.pausedAt=new Date(now()).toISOString();report.error=error.message;await checkpoint();throw error;
  } finally {await lock.close();await unlink(lockPath);}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const {values}=parseArgs({options:{'history-dir':{type:'string'},'cache-dir':{type:'string'},market:{type:'string',default:'all'},from:{type:'string'},through:{type:'string'},concurrency:{type:'string',default:'2'}}});
  if(!values['history-dir'])throw new Error('--history-dir is required; use an isolated staging directory');
  const historyDir=resolve(values['history-dir']),markets=values.market==='all'?Object.keys(MARKETS).filter(m=>m!=='zh-CN'):[validateMarket(values.market)];
  for(const market of markets) {
    const report=await importRegion({historyDir,cacheDir:resolve(values['cache-dir']||join(historyDir,'.cache')),market,from:values.from,through:values.through,
      concurrency:Number(values.concurrency),onProgress:value=>console.log(JSON.stringify(value))});
    console.log(JSON.stringify({market,finished:true,images:report.images,saved:report.saved,failures:report.failures.length}));
    if(report.failures.length)process.exitCode=1;
  }
}
