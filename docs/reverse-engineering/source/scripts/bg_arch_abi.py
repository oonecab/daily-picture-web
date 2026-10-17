"""Capture primary WinRT ABI references and match shipped IID/type records."""
import datetime,hashlib,json,re,struct,urllib.request,uuid
from pathlib import Path
from deep_symbols_resolve import APP,PE
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/architecture-background';OUT.mkdir(parents=True,exist_ok=True)
modules={
 'background':('ApplicationModel/Background',['IBackgroundTask','IBackgroundTaskInstance','IBackgroundTaskDeferral','IBackgroundTaskBuilder','IBackgroundTaskRegistration','IBackgroundTaskRegistrationStatics','IBackgroundExecutionManagerStatics','ITimeTriggerFactory','ISystemConditionFactory']),
 'notifications':('UI/Notifications',['ITileUpdateManagerStatics','ITileUpdater','ITileNotification','ITileNotificationFactory']),
 'personalization':('System/UserProfile',['IUserProfilePersonalizationSettings','IUserProfilePersonalizationSettingsStatics','ILockScreenStatics']),
 'imaging':('Graphics/Imaging',['IBitmapEncoderStatics','IBitmapEncoder','IBitmapDecoderStatics','IBitmapDecoder','IBitmapFrame','IBitmapTransform','IPixelDataProvider']),
}
pe=PE(APP);rows=[];sources=[]
for label,(namespace,names) in modules.items():
    url='https://raw.githubusercontent.com/microsoft/windows-rs/master/crates/libs/windows/src/Windows/'+namespace+'/mod.rs'
    path=OUT/(label+'-reference.rs')
    if not path.exists():
        with urllib.request.urlopen(url,timeout=35) as response:path.write_bytes(response.read())
    raw=path.read_bytes();source=raw.decode('utf-8');sources.append(dict(url=url,path=str(path.relative_to(ROOT)),sha256=hashlib.sha256(raw).hexdigest()))
    for name in names:
        m=re.search(r'define_interface!\('+name+r',\s*\w+,\s*0x([0-9a-f_]+)\)',source)
        if not m:raise ValueError(name)
        guid=uuid.UUID(m.group(1).replace('_',''));hits=[];pos=0
        while (pos:=pe.data.find(guid.bytes_le,pos))!=-1:
            s=next(s for s in pe.sections if s['raw']<=pos<s['raw']+s['size']);va=pe.base+s['rva']+pos-s['raw'];typ=pe.u64(pos-24)
            hits.append(dict(va=hex(va),offset=hex(pos),type_pointer=hex(typ),bytes=pe.data[pos-24:pos+32].hex()));pos+=1
        start=source.index('pub struct '+name+'_Vtbl {');end=source.index('\n}',start)+2;definition=source[start:end]
        fields=re.findall(r'^    pub (\w+):',definition,re.M);methods=[dict(slot=6+i,name=f) for i,f in enumerate(fields[1:])]
        # Static generic call contexts frequently begin with this exact EEType pointer.
        pointers=[]
        for typ in set(int(h['type_pointer'],16) for h in hits):
            needle=struct.pack('<Q',typ);pos=0
            while (pos:=pe.data.find(needle,pos))!=-1:
                s=next(s for s in pe.sections if s['raw']<=pos<s['raw']+s['size']);pva=pe.base+s['rva']+pos-s['raw'];pointers.append(hex(pva));pos+=1
        rows.append(dict(name=name,iid=str(guid),hits=hits,pointer_candidates=pointers,methods=methods,definition=definition))
targets={int(p,16):row['name'] for row in rows for p in row['pointer_candidates']};targets.update({int(h['type_pointer'],16):row['name'] for row in rows for h in row['hits']})
refs=[]
for s in pe.sections:
    if not s['flags']&0x20000000:continue
    for p in range(s['raw'],s['raw']+s['size']-7):
        if 0x48<=pe.data[p]<=0x4f and pe.data[p+1] in (0x8d,0x8b) and pe.data[p+2]&0xc7==5:
            va=pe.base+s['rva']+p-s['raw'];target=va+7+struct.unpack_from('<i',pe.data,p+3)[0]
            if target in targets:refs.append(dict(instruction=hex(va),target=hex(target),interface=targets[target],owner=pe.owner(va)))
result=dict(target=str(APP),sha256=pe.sha256,time_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),sources=sources,interfaces=rows,reference_candidates=refs,limitations=['IIDs plus preceding EEType pointer bytes corroborate static generic contexts; they are not runtime COM observations.','RIP-relative byte patterns require REA decoding. COM ABI slot numbers apply only after the target interface is matched.'])
(OUT/'abi-evidence.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(interfaces=[dict(name=r['name'],hits=r['hits'],methods=r['methods']) for r in rows],references=refs),ensure_ascii=False,indent=2))
