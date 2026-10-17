"""Bounded-target full-image byte-reference candidates, plus App type bytes."""
import json,struct
from pathlib import Path
from deep_symbols_resolve import APP,PE,Resolver
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/app-lifecycle';p=PE(APP)
abi=json.loads((OUT/'abi-evidence.json').read_text(encoding='utf8'))
wanted={'IApplication','IApplication2','IApplication3','IApplicationOverrides','ISuspendingEventArgs','ISuspendingOperation','ISuspendingDeferral','ILeavingBackgroundEventArgs','IEnteredBackgroundEventArgs'}
types={int(h['preceding_type_pointer'],16):i['name'] for i in abi['interfaces'] if i['name'] in wanted for h in i['iid_hits']}
contexts={}
for t,name in types.items():
    start=0
    while (start:=p.data.find(struct.pack('<Q',t),start))!=-1:
        s=next(s for s in p.sections if s['raw']<=start<s['raw']+s['size']);va=p.base+s['rva']+start-s['raw']
        if 0x180100000<=va<0x180130000:contexts[va]=name
        start+=1
targets=dict(contexts)
for a in [0x180461dd0,0x180461e40,0x180461e60,0x180461f60,0x180462210,0x1804620c0,0x180531dc0,0x180531f50,0x180531e60,0x180531e90,
          0x18051e240,0x18051e270,0x18051e280,0x18051e310,0x18051e340,0x18051e350,0x18051e3e0,0x18051e410,0x18051e420,0x18051e4b0,0x18051e4e0]:targets[a]='method'
refs=[]
for s in p.sections:
    if not s['flags']&0x20000000:continue
    for off in range(s['raw'],s['raw']+s['size']-7):
        va=p.base+s['rva']+off-s['raw'];op=p.data[off]
        if 0x48<=op<=0x4f and p.data[off+1] in (0x8d,0x8b) and p.data[off+2]&0xc7==5:dest=va+7+struct.unpack_from('<i',p.data,off+3)[0];kind='rip-memory'
        elif op in (0xe8,0xe9):dest=va+5+struct.unpack_from('<i',p.data,off+1)[0];kind='direct-control'
        else:continue
        if dest in targets:refs.append(dict(address=hex(va),target=hex(dest),label=targets[dest],kind=kind,owner=p.owner(va)))
data=[]
for s in p.sections:
    if s['flags']&0x20000000:continue
    for off in range(s['raw'],s['raw']+s['size']-8):
        va=p.base+s['rva']+off-s['raw']
        for kind,dest in [('absolute64',struct.unpack_from('<Q',p.data,off)[0]),('relative32',va+struct.unpack_from('<i',p.data,off)[0])]:
            if dest in targets and targets[dest]=='method':data.append(dict(address=hex(va),target=hex(dest),kind=kind))
type_rows=[]
for a in [0x18001af90,0x18001b090,0x18001bd50]:
    vs,ifs=struct.unpack('<HH',p.readva(a+16,4));head=0x18
    vtable=[dict(slot=i,address=hex(a+head+i*8),value=hex(struct.unpack('<Q',p.readva(a+head+i*8,8))[0])) for i in range(vs)]
    interfaces=[dict(index=i,address=hex(a+head+(vs+i)*8),value=hex(struct.unpack('<Q',p.readva(a+head+(vs+i)*8,8))[0])) for i in range(ifs)]
    type_rows.append(dict(address=hex(a),bytes=p.readva(a,head+8*(vs+ifs)+32).hex(),vslot_count=vs,interface_count=ifs,base_pointer=hex(struct.unpack('<Q',p.readva(a+8,8))[0]),vtable=vtable,interfaces=interfaces))
resolver=Resolver();bindings=[resolver.resolve(a) for a in [0x1802a6748,0x1802a6380,0x1802a27d8]]
obj=dict(target=str(APP),sha256=p.sha256,contexts={hex(a):v for a,v in contexts.items()},code_candidates=refs,data_candidates=data,types=type_rows,exact_shared_bindings=bindings,limitation='Code/data byte hits are candidates until decoded. Header counts agree with examined EEType layout; this is not complete NativeFormat dispatch metadata recovery.')
(OUT/'reference-candidates.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(dict(contexts={hex(a):v for a,v in contexts.items()},code=refs,data=data,type_counts=[{k:r[k] for k in ['address','vslot_count','interface_count']} for r in type_rows]),ensure_ascii=False,indent=2))
