import {readFile,readdir,writeFile,rename,unlink,open} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {validDate} from '../lib/history.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function key(item){
 if(!validDate(item.date)||!/^OHR\.[A-Za-z0-9_-]{1,180}$/.test(item.id))throw Error('Invalid migration identity');
 return `${item.date}_${hash(item.id).slice(0,32)}`;
}
async function atomic(path,data){const temporary=`${path}.${randomUUID()}.tmp`;try{await writeFile(temporary,JSON.stringify(data));await rename(temporary,path);}finally{await unlink(temporary).catch(()=>{});}}
async function verified(path,meta){
 if(!meta||!Number.isSafeInteger(meta.bytes)||meta.bytes<1||meta.bytes>20*1024*1024||!/^[a-f0-9]{64}$/.test(meta.sha256))throw Error('Invalid backup metadata');
 const handle=await open(path,'r');
 try{if((await handle.stat()).size!==meta.bytes)throw Error('Backup size mismatch');const bytes=await handle.readFile();if(bytes.length!==meta.bytes||hash(bytes)!==meta.sha256)throw Error('Backup digest mismatch');}
 finally{await handle.close();}
}
export async function verifyHistoryBackup({root,now=Date.now}){
 const files={},identities=[];
 for(const name of (await readdir(join(root,'media'))).filter(n=>n.endsWith('.json')).sort()){
  const manifest=JSON.parse(await readFile(join(root,'media',name))),base=key(manifest);
  if(name!==base+'.json')throw Error('Backup manifest identity mismatch');
  for(const [size,meta] of Object.entries(manifest.files)){
   if(!['original','preview','thumb'].includes(size))throw Error('Invalid backup size');
   const filename=base+`.${size}.jpg`;await verified(join(root,'media',filename),meta);files[filename]={bytes:meta.bytes,sha256:meta.sha256};
  }
  identities.push({date:manifest.date,id:manifest.id});
 }
 return {schemaVersion:1,verifiedAt:new Date(now()).toISOString(),identities,files};
}
export async function migrateHistory({historyDir,audit,receipt,prune=false,now=Date.now}){
 if(audit.schemaVersion!==1||receipt.schemaVersion!==1||!Array.isArray(audit.images)||!receipt.files)throw Error('Invalid migration evidence');
 const lockPath=join(historyDir,'.migration.lock'),lock=await open(lockPath,'wx');
 try{
  const auditRows=new Map();for(const row of audit.images){const name=key(row);if(auditRows.has(name))throw Error('Duplicate audited identity');auditRows.set(name,row);}
  const months=[],work=[];
  for(const name of (await readdir(historyDir)).filter(n=>/^\d{4}-\d{2}\.json$/.test(n)).sort()){
   const path=join(historyDir,name),data=JSON.parse(await readFile(path));if(!Array.isArray(data.images))throw Error('Invalid month index');
   months.push({path,data});
   for(const item of data.images){
    const base=key(item),manifestPath=join(historyDir,'media',base+'.json'),manifest=JSON.parse(await readFile(manifestPath));
    if(manifest.id!==item.id||manifest.date!==item.date)throw Error('Media identity mismatch');
    await verified(join(historyDir,'media',base+'.thumb.jpg'),manifest.files.thumb);
    const checked=auditRows.get(base),age=now()-Date.parse(checked?.checkedAt);
    const original=checked?.original,preview=checked?.preview,saved=manifest.files.original;
    const available=[original,preview].every(v=>v?.status==='available'&&['UHD','1920x1080'].includes(v.variant)&&v.width>=320&&v.height>=180);
    const qualifies=available&&age>=-300000&&age<=48*3600000&&!checked.preserveOriginal&&(!saved||(original.width>=saved.width&&original.height>=saved.height));
    // Fresh thumbnail-only rows need no migration. Preserve existing fallback data.
    const remote=qualifies||(!saved&&item.availability?.thumbnailStored===true&&item.delivery?.mode!=='local');
    const removing=[];
    if(qualifies)for(const size of ['original','preview']){
      const meta=manifest.files[size];if(!meta)continue;
      const filename=base+`.${size}.jpg`,proof=receipt.files[filename];
      if(!proof||proof.bytes!==meta.bytes||proof.sha256!==meta.sha256)throw Error('Verified local backup required before migration');
      try{await verified(join(historyDir,'media',filename),meta);removing.push({filename,bytes:meta.bytes});}
      catch(e){if(e.code!=='ENOENT'||item.delivery?.mode!=='bing')throw e;}
    }
    work.push({item,base,manifestPath,manifest,checked,remote,qualifies,removing});
   }
  }
  // Validate the complete plan before changing any index or deleting any image.
  let removedBytes=0,removedFiles=0;
  for(const entry of work){
    const {item,checked,manifest,remote,qualifies}=entry;
    if(qualifies)item.delivery={mode:'bing',checkedAt:checked.checkedAt,original:checked.original,preview:checked.preview};
    else if(!remote)item.delivery={mode:'local',checkedAt:checked?.checkedAt||null,reason:'remote-unconfirmed-or-lower-resolution'};
    if(prune&&qualifies){
      for(const file of entry.removing){await unlink(join(historyDir,'media',file.filename));removedBytes+=file.bytes;removedFiles++;}
      delete manifest.files.original;delete manifest.files.preview;await atomic(entry.manifestPath,manifest);
    }
    item.availability={...item.availability,status:'available',thumbnailStored:true,stored:Boolean(manifest.files.original),
      ...(qualifies?{width:checked.original.width,height:checked.original.height}:{} )};
  }
  for(const month of months)await atomic(month.path,month.data);
  return {total:work.length,remote:work.filter(e=>e.remote).length,retained:work.filter(e=>!e.remote).map(e=>({date:e.item.date,id:e.item.id})),removedFiles,removedBytes,prune};
 }finally{await lock.close();await unlink(lockPath);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{'backup-dir':{type:'string'},'history-dir':{type:'string'},audit:{type:'string'},receipt:{type:'string'},offline:{type:'boolean'},prune:{type:'boolean'}}});
 if(values['backup-dir']){
  if(!values.receipt)throw Error('--receipt is required');
  const receipt=await verifyHistoryBackup({root:resolve(values['backup-dir'])});await atomic(resolve(values.receipt),receipt);console.log(JSON.stringify({verified:receipt.identities.length,files:Object.keys(receipt.files).length}));
 }else{
  if(!values.offline||!values['history-dir']||!values.audit||!values.receipt)throw Error('Stop the writer, then provide --offline --history-dir --audit --receipt; --prune releases verified files');
  console.log(JSON.stringify(await migrateHistory({historyDir:resolve(values['history-dir']),audit:JSON.parse(await readFile(values.audit)),receipt:JSON.parse(await readFile(values.receipt)),prune:values.prune===true})));
 }
}
