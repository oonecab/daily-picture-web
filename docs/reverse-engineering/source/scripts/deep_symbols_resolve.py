"""Read-only .NET Native 1.7 custom-import resolver for this installed package.

The custom-header layout is corroborated by Synacktiv dotNIET's primary source:
https://github.com/synacktiv/dotNIET/blob/main/dotNIET_plugin.py
This implementation validates descriptors against ordinary PE $NEAT$ imports;
it does not load/execute the DLL or change any analysis database.
"""
import argparse
import bisect
import hashlib
import json
import re
import struct
import uuid
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
APP=Path(r'C:\Program Files\WindowsApps\14403Duracellko.NET.BingImageoftheDay_1.4.13.0_x64__1wy5t1va6xay4\Duracellko.BingImage.Universal.dll')
SHARED=Path(r'C:\Program Files\WindowsApps\Microsoft.NET.Native.Framework.1.7_1.7.27413.0_x64__8wekyb3d8bbwe\SharedLibrary.dll')

class PE:
    def __init__(self,path):
        self.path=Path(path);self.data=self.path.read_bytes()
        self.sha256=hashlib.sha256(self.data).hexdigest()
        self.pe=self.u32(0x3c);self.opt=self.pe+24
        assert self.data[:2]==b'MZ' and self.u16(self.opt)==0x20b
        self.base=self.u64(self.opt+24)
        self.sections=[]
        for i in range(self.u16(self.pe+6)):
            p=self.opt+self.u16(self.pe+20)+i*40
            vs,rva,size,raw=struct.unpack_from('<IIII',self.data,p+8)
            self.sections.append(dict(name=self.data[p:p+8].rstrip(b'\0').decode(),rva=rva,virtual_size=vs,size=size,raw=raw,flags=self.u32(p+36)))
        exc,size=self.directory(3)
        self.functions=[]
        if exc:
            p=self.off(exc)
            self.functions=sorted(struct.unpack_from('<III',self.data,a) for a in range(p,p+size,12))
        self.starts=[f[0] for f in self.functions]
    def u16(self,p):return struct.unpack_from('<H',self.data,p)[0]
    def u32(self,p):return struct.unpack_from('<I',self.data,p)[0]
    def u64(self,p):return struct.unpack_from('<Q',self.data,p)[0]
    def off(self,rva):
        for s in self.sections:
            if s['rva']<=rva<s['rva']+s['size']:return s['raw']+rva-s['rva']
        raise ValueError(f'Unmapped RVA {rva:#x} in {self.path.name}')
    def readva(self,va,n):
        p=self.off(va-self.base);return self.data[p:p+n]
    def directory(self,i):return struct.unpack_from('<II',self.data,self.opt+112+8*i)
    def strz(self,rva):
        p=self.off(rva);return self.data[p:self.data.index(b'\0',p)].decode('ascii',errors='replace')
    def owner(self,va):
        rva=va-self.base;i=bisect.bisect_right(self.starts,rva)-1
        if i>=0 and self.functions[i][0]<=rva<self.functions[i][1]:
            a,b,u=self.functions[i];return dict(start=hex(self.base+a),end_exclusive=hex(self.base+b),length=b-a,unwind_rva=hex(u))
        return None
    def imports(self):
        rva,size=self.directory(1)
        if not rva:return []
        items=[];p=self.off(rva)
        for a in range(p,p+size,20):
            original,stamp,chain,name,first=struct.unpack_from('<IIIII',self.data,a)
            if not any((original,stamp,chain,name,first)):break
            dll=self.strz(name);idx=0
            lookup=self.off(original or first)
            while True:
                raw=self.u64(lookup+idx*8)
                if not raw:break
                items.append(dict(dll=dll,va=hex(self.base+first+idx*8),name=None if raw>>63 else self.strz(raw+2),ordinal=raw&0xffff if raw>>63 else None))
                idx+=1
        return items
    def exports(self):
        rva,size=self.directory(0)
        if not rva:return []
        p=self.off(rva)
        first,nfunctions,nnames,functions,names,ordinals=struct.unpack_from('<IIIIII',self.data,p+16)
        items=[]
        for i in range(nnames):
            ordinal=self.u16(self.off(ordinals)+i*2)
            assert ordinal<nfunctions
            frva=self.u32(self.off(functions)+ordinal*4)
            items.append(dict(name=self.strz(self.u32(self.off(names)+i*4)),ordinal=first+ordinal,rva=frva,va=self.base+frva))
        return items
    def codeview(self):
        rva,size=self.directory(6);records=[]
        if not rva:return records
        p=self.off(rva)
        for a in range(p,p+size,28):
            if self.u32(a+12)!=2:continue
            n=self.u32(a+16);raw=self.u32(a+24)
            if self.data[raw:raw+4]!=b'RSDS':continue
            guid=uuid.UUID(bytes_le=self.data[raw+4:raw+20]);age=self.u32(raw+20)
            pdb=self.data[raw+24:raw+n].split(b'\0')[0].decode(errors='replace')
            basename=pdb.replace('\\','/').split('/')[-1]
            key=guid.hex.upper()+f'{age:X}'
            records.append(dict(guid=str(guid),age=age,path=pdb,basename=basename,symbol_key=key,symbol_url=f'https://msdl.microsoft.com/download/symbols/{basename}/{key}/{basename}'))
        return records

class Resolver:
    def __init__(self,app=APP,shared=SHARED):
        self.app=PE(app);self.shared=PE(shared)
        h=next(s for s in self.app.sections if s['name']=='.rdata')['rva']
        desc=h+self.app.u32(self.app.off(h+0x120))
        count=self.app.u32(self.app.off(h+0x124))
        assert 1<=count<=32
        self.descriptors=[]
        ordinary={int(i['va'],16):i for i in self.app.imports()}
        for i in range(count):
            p=self.app.off(desc+i*12)
            eat,iat,n=struct.unpack_from('<III',self.app.data,p)
            imp=ordinary.get(self.app.base+eat)
            self.descriptors.append(dict(index=i,eat_rva=hex(eat),iat_rva=hex(iat),count=n,ordinary_eat_import=imp))
        own=self.descriptors[0]
        assert own['eat_rva']==own['iat_rva'] and own['count']==0
        self.shared_desc=next(x for x in self.descriptors if x['ordinary_eat_import'] and x['ordinary_eat_import']['name']=='$NEAT$' and x['ordinary_eat_import']['dll'].lower()=='sharedlibrary.dll')
        self.neat=next(x for x in self.shared.exports() if x['name']=='$NEAT$')
        self.start=self.app.base+int(self.shared_desc['iat_rva'],16)
        self.end=self.start+8*self.shared_desc['count']
        self.symbols={};self.symbol_validation=None
        symbol_file=ROOT/'evidence/deep-symbols/sharedlibrary-symbols.json'
        if symbol_file.exists():
            symbol_data=json.loads(symbol_file.read_text(encoding='utf-8'))
            self.symbol_validation=symbol_data['validation']
            assert self.symbol_validation['guid']==self.shared.codeview()[0]['guid']
            assert self.symbol_validation['dbi_age']==self.shared.codeview()[0]['age']
            self.symbols=symbol_data['symbols']
    def metadata(self):
        return dict(app=dict(path=str(self.app.path),sha256=self.app.sha256,codeview=self.app.codeview()),shared=dict(path=str(self.shared.path),sha256=self.shared.sha256,codeview=self.shared.codeview()),custom_descriptors=self.descriptors,neat_export=dict(va=hex(self.neat['va']),rva=hex(self.neat['rva'])),shared_import_range=dict(start=hex(self.start),end_exclusive=hex(self.end),count=self.shared_desc['count']),layout_source='https://github.com/synacktiv/dotNIET/blob/main/dotNIET_plugin.py',symbol_validation=self.symbol_validation)
    def symbols_for(self,va):
        trace=[];seen=set();current=va
        for _ in range(5):
            if current in seen:break
            seen.add(current)
            exact=self.symbols.get(hex(current),[])
            if exact:return dict(symbols=exact[:64],symbol_record_count=len(exact),symbols_truncated=len(exact)>64,symbol_address=hex(current),symbol_trace=trace)
            rva=current-self.shared.base
            section=next((s for s in self.shared.sections if s['rva']<=rva<s['rva']+s['size']),None)
            if section is None:break
            raw=self.shared.readva(current,8)
            if section['flags']&0x20000000:
                if raw[0]==0xe9:
                    target=current+5+struct.unpack_from('<i',raw,1)[0]
                    trace.append(dict(kind='direct-relative-jump-bytes',source=hex(current),target=hex(target),bytes=raw[:5].hex()))
                elif raw[:2]==b'\xff\x25':
                    slot=current+6+struct.unpack_from('<i',raw,2)[0]
                    try:target=struct.unpack('<Q',self.shared.readva(slot,8))[0]
                    except ValueError:break
                    trace.append(dict(kind='indirect-rip-jump-bytes',source=hex(current),slot=hex(slot),target=hex(target),bytes=raw[:6].hex()))
                else:break
            else:
                target=struct.unpack('<Q',raw)[0]
                trace.append(dict(kind='data-pointer-dereference',source=hex(current),target=hex(target),bytes=raw.hex()))
            current=target
        return dict(symbols=[],symbol_record_count=0,symbols_truncated=False,symbol_address=None,symbol_trace=trace)
    def resolve(self,va):
        if not self.start<=va<self.end or (va-self.start)%8:
            return dict(slot_va=hex(va),status='outside-validated-custom-import-range')
        p=self.app.off(va-self.app.base);raw=self.app.u64(p)
        idx=raw&0x7fffffffffffffff
        assert raw>>63==1
        eraw=self.shared.off(self.neat['rva']+idx*4)
        rva=self.shared.u32(eraw);dest=self.shared.base+rva
        section=next(s['name'] for s in self.shared.sections if s['rva']<=rva<s['rva']+s['size'])
        return dict(slot_va=hex(va),slot_file_offset=hex(p),raw=hex(raw),neat_index=idx,neat_entry_file_offset=hex(eraw),resolved_rva=hex(rva),resolved_va=hex(dest),resolved_section=section,owner=self.shared.owner(dest),bytes=self.shared.readva(dest,32).hex(),**self.symbols_for(dest),status='resolved-by-validated-custom-descriptor')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('slots',nargs='*',type=lambda s:int(s,0))
    parser.add_argument('--from-evidence',action='append',default=[])
    parser.add_argument('--all',action='store_true',help='Resolve all custom imports without disassembly.')
    parser.add_argument('--output')
    args=parser.parse_args();resolver=Resolver();slots=set(args.slots)
    if args.all:slots.update(range(resolver.start,resolver.end,8))
    for path in args.from_evidence:
        e=json.loads(Path(path).read_text(encoding='utf-8-sig'))
        for ins in json.loads(e['normalized_result']['stdout']):
            slots.update(int(m,16) for m in re.findall(r'\bcall qword \[(0x[0-9a-f]+)\]',ins.get('disasm','')))
    output=dict(**resolver.metadata(),resolved_slots=[resolver.resolve(s) for s in sorted(slots)],limitations=['No target or runtime binder execution; this maps shipped custom descriptors and SharedLibrary table bytes.','A resolved address alone does not establish its source method name; symbol or instruction corroboration is needed.','Per-address symbol records are capped at 64 with explicit total/truncation flags. Complete aliases remain in sharedlibrary-symbols.json; compiler folding can create thousands of aliases at a single ret instruction.'])
    text=json.dumps(output,ensure_ascii=False,indent=2)
    if args.output:
        dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(text,encoding='utf-8')
        print(json.dumps(dict(output=str(dest),resolved_slots=len(output['resolved_slots']),metadata=resolver.metadata()),ensure_ascii=False,indent=2))
    else:print(text)

if __name__=='__main__':main()
