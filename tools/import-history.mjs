import {mkdir,readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {createBingService} from '../lib/bing.mjs';

export async function importHistory({historyDir,cacheDir,from='2018-09',through,sourceDir,indexesOnly=false,fetchImpl=fetch,now=Date.now,onProgress=()=>{}}) {
  await mkdir(historyDir,{recursive:true});
  const lockPath=join(historyDir,'.import.lock'),lock=await open(lockPath,'wx');
  try {
  let quarantined=[];
  try {quarantined=JSON.parse(await readFile(join(historyDir,'import-report.json'),'utf8')).quarantined || [];}catch(error){if(error.code!=='ENOENT')throw error;}
  const report={startedAt:new Date(now()).toISOString(),from,through,months:[],images:0,saved:0,failures:[],quarantined};
  function sourceResponse(bytes) {
    const rows=JSON.parse(bytes);
    if(!Array.isArray(rows))throw new Error('Invalid source index');
    return Response.json(rows.filter(row=>{
      // Quarantine conflicting references; never guess which image belongs to the date.
      const ids=[row.url_4k,row.url_1080,row.url_preview].filter(Boolean).map(value=>{
        try{return new URL(value).searchParams.get('id')?.replace(/_(?:UHD|\d+x\d+)\.jpg$/i,'');}catch{return null;}
      });
      if(ids.every(id=>/^OHR\.[A-Za-z0-9_-]{1,180}$/.test(id)) && new Set(ids).size>1) {
        if(!report.quarantined.some(q=>q.date===row.date))report.quarantined.push({date:row.date,source:'zxyongyo',reason:'conflicting image IDs',ids});
        return false;
      }
      return true;
    }));
  }
  const sourceFetch=async(url,options)=>{
    if(url.hostname==='raw.githubusercontent.com') {
      const prefix='/zxyongyo/bing-daily-wallpaper/master/';
      if(!url.pathname.startsWith(prefix))throw new Error('Unexpected source path');
      const relative=url.pathname.slice(prefix.length);
      if(!/^archives\/\d{4}\/\d{4}-\d{2}\/\d{4}-\d{2}\.json$/.test(relative))throw new Error('Invalid source path');
      if(sourceDir) {
        try{return sourceResponse(await readFile(join(sourceDir,relative),'utf8'));}
        catch(error){if(error.code==='ENOENT')return new Response('',{status:404});throw error;}
      }
      const response=await fetchImpl(url,options);
      // The ordinary upstream reader still enforces a 1 MiB index budget.
      if(!response.ok)return response;
      const reader=response.body.getReader(),chunks=[];let size=0;
      try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024*1024)throw new Error('Source index too large');chunks.push(value);}}
      catch(error){await reader.cancel();throw error;}finally{reader.releaseLock();}
      return sourceResponse(Buffer.concat(chunks).toString('utf8'));
    }
    return fetchImpl(url,options);
  };
  const service=createBingService({historyDir,cacheDir,historyMode:'import',fetchImpl:sourceFetch,now,
    onError:(context,error)=>onProgress({error:context,message:error.message})});
  const months=(await service.history.catalog()).months.reverse();
  through ||= months.at(-1);report.through=through;
  if(!months.includes(from) || !months.includes(through) || from>through)throw new Error('Invalid import month range');
  await mkdir(historyDir,{recursive:true});
  let saves=Promise.resolve();
  const checkpoint=()=>{
    const value=JSON.stringify(report,null,2);
    saves=saves.then(async()=>{const file=join(historyDir,'import-report.json');await writeFile(`${file}.tmp`,value);await rename(`${file}.tmp`,file);});
    return saves;
  };
  const items=[];
  for(const month of months.filter(m=>m>=from && m<=through)) {
    try {
      const data=await service.history.month(month);
      items.push(...data.images);report.images+=data.images.length;
      report.months.push({month,count:data.images.length,stale:data.stale});
      if(data.stale)report.failures.push({month,kind:'index',message:data.warning});
    }catch(error){report.months.push({month,count:0,error:error.message});report.failures.push({month,kind:'index',message:error.message});}
    onProgress({phase:'index',...report.months.at(-1)});await checkpoint();
  }
  if(!indexesOnly) {
    let next=0;
    await Promise.all([0,1,2,3].map(async()=>{
      while(next<items.length) {
        const row=items[next++];
        try {await service.history.saveImage(row.date,row.id);report.saved++;}
        catch(error){report.failures.push({date:row.date,id:row.id,kind:'image',message:error.message});}
        onProgress({phase:'image',date:row.date,saved:report.saved,failures:report.failures.length,total:items.length});await checkpoint();
      }
    }));
  }
  report.finishedAt=new Date(now()).toISOString();await checkpoint();return report;
  }finally{await lock.close();await unlink(lockPath);}
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const {values}=parseArgs({options:{'history-dir':{type:'string'},'cache-dir':{type:'string'},from:{type:'string'},through:{type:'string'},'source-dir':{type:'string'},'indexes-only':{type:'boolean'}}});
  if(!values['history-dir'])throw new Error('--history-dir is required; use an isolated directory, not a running server directory');
  const historyDir=resolve(values['history-dir']);
  const report=await importHistory({historyDir,cacheDir:resolve(values['cache-dir']||join(historyDir,'.cache')),from:values.from,through:values.through,
    sourceDir:values['source-dir']?resolve(values['source-dir']):undefined,indexesOnly:values['indexes-only'],onProgress:p=>console.log(JSON.stringify(p))});
  console.log(JSON.stringify({finished:true,images:report.images,saved:report.saved,failures:report.failures.length}));
  if(report.failures.length)process.exitCode=1;
}
