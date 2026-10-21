import {githubFile} from './github-file.mjs';

export const DATA_REPOSITORY='oonecab/daily-picture-web';
export const DATA_BRANCH='codex/wallpaper-data';

export async function syncOwnedIndex({history,upstream,repository=DATA_REPOSITORY,now=Date.now}) {
  const {bytes,transport}=await githubFile({repository,ref:DATA_BRANCH,path:'latest.json',upstream});
  const data=JSON.parse(bytes.toString('utf8'));
  const fetchedAt=Date.parse(data.fetchedAt);
  if(data.schemaVersion!==1 || data.market!=='zh-CN' || !Array.isArray(data.images) || !data.images.length || data.images.length>15
    || !Number.isFinite(fetchedAt) || fetchedAt>now()+300000)throw new Error('每日采集索引无效。');
  const dates=new Set();
  for(const row of data.images) {
    if(row.market!=='zh-CN' || dates.has(row.date) || !['title','description','copyright','credit'].every(k=>typeof row[k]==='string'))throw new Error('每日采集记录无效。');
    dates.add(row.date);
  }
  const current=await history.ingest(data);
  const backlog=await history.pendingImages({excludeDates:current.map(row=>row.date)});
  const work=[...current,...backlog.images];
  const failures=[];let saved=0,next=0;
  await Promise.all([0,1].map(async()=>{
    while(next<work.length) {
      const row=work[next++];
      // Resolve the current ID at save time, including concurrent recent-archive updates.
      try {await history.saveThumbnail(row.date);saved++;}
      catch(error){failures.push({date:row.date,message:error.message});}
    }
  }));
  const pending=(await history.pendingImages({limit:0})).total;
  const stale=now()-fetchedAt>48*3600000;
  const problems=[];
  if(stale)problems.push('每日采集索引已超过 48 小时，请检查 GitHub Actions。');
  if(pending)problems.push(`仍有 ${pending} 张每日缩略图待保存，服务将在下一轮重试。`);
  else if(failures.length)problems.push('本轮缩略图校验未完成，服务将在下一轮重试。');
  const error=problems.join(' ') || null;
  await history.recordSync({source:'github-actions',mediaPolicy:'thumbnails',repository,branch:DATA_BRANCH,fetchedAt:data.fetchedAt,
    checkedAt:new Date(now()).toISOString(),saved,total:work.length,retryTotal:backlog.images.length,pending,failures,stale,error,
    ...(!error?{lastMediaSuccessAt:new Date(now()).toISOString(),lastThumbnailSuccessAt:new Date(now()).toISOString()}:{} )});
  return {fetchedAt:data.fetchedAt,transport,images:data.images.length,saved,total:work.length,retryTotal:backlog.images.length,pending,failures,stale,error};
}
