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
  await history.ingest(data);
  const failures=[];let saved=0,next=0;
  await Promise.all([0,1].map(async()=>{
    while(next<data.images.length) {
      const row=data.images[next++];
      try {await history.saveImage(row.date,row.id);saved++;}
      catch(error){failures.push({date:row.date,message:error.message});}
    }
  }));
  const stale=now()-fetchedAt>48*3600000;
  const error=stale?'每日采集索引已超过 48 小时，请检查 GitHub Actions。':failures.length?'部分每日图片保存失败，服务将在下一轮重试。':null;
  await history.recordSync({source:'github-actions',repository,branch:DATA_BRANCH,fetchedAt:data.fetchedAt,
    checkedAt:new Date(now()).toISOString(),saved,total:data.images.length,failures,stale,error,
    ...(!error?{lastMediaSuccessAt:new Date(now()).toISOString()}:{} )});
  return {fetchedAt:data.fetchedAt,transport,images:data.images.length,saved,failures,stale,error};
}
