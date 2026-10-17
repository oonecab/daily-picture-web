"""Match native WinRT context handles to local WinMD IID/method declarations.

Run ui_arch_winmd.ps1 first. No target code or API call is executed.
"""
from pathlib import Path
import hashlib,json,struct,uuid
from deep_symbols_resolve import PE,APP

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/app-lifecycle'
metadata_path=OUT/'system-winmd.json'
metadata=json.loads(metadata_path.read_text(encoding='utf-8-sig'))
pe=PE(APP);interfaces=[]
for file in metadata:
    assert hashlib.sha256(Path(file['path']).read_bytes()).hexdigest()==file['sha256']
    for typ in file['types']:
        attribute=next((a for a in typ['attributes'] if a.get('guid')),None)
        if attribute is None:continue
        guid=uuid.UUID(attribute['guid'])
        hits=[];pos=0
        while (pos:=pe.data.find(guid.bytes_le,pos))!=-1:
            sec=next(s for s in pe.sections if s['raw']<=pos<s['raw']+s['size'])
            va=pe.base+sec['rva']+pos-sec['raw'];descriptor=struct.unpack_from('<Q',pe.data,pos-24)[0]
            hits.append(dict(iid_va=hex(va),iid_file_offset=hex(pos),preceding_type_pointer=hex(descriptor),surrounding_bytes=pe.data[pos-24:pos+32].hex()));pos+=1
        if not hits:continue
        interfaces.append(dict(name=typ['name'],namespace=typ['ns'],iid=str(guid),winmd_path=file['path'],winmd_sha256=file['sha256'],guid_attribute=attribute,iid_hits=hits,
            methods=[dict(slot=6+m['index'],name=m['name'],signature=m['signature']) for m in typ['methods']]))

contexts={}
for path in OUT.glob('*.json'):
    try:e=json.loads(path.read_text(encoding='utf-8-sig'))
    except (ValueError,UnicodeError):continue
    if not isinstance(e,dict) or 'evidence_id' not in e:continue
    try: instructions=json.loads(e['normalized_result']['stdout'])
    except (ValueError,KeyError):continue  # Pseudocode evidence is prose, not a pDj instruction list.
    for ins in instructions:
        ptr=ins.get('ptr')
        if not ptr or not 0x180100000<=ptr<0x180130000:continue
        offset=8 if ptr==0x18010ef38 else 0
        pointer=struct.unpack('<Q',pe.readva(ptr+offset,8))[0]
        matched=[i for i in interfaces if any(int(h['preceding_type_pointer'],16)==pointer for h in i['iid_hits'])]
        if matched:contexts[hex(ptr)]=dict(pointer=hex(pointer),type_offset=offset,offset_basis='0x180465840 loads context+8 as callee interface' if offset else 'first generic-context type pointer',interfaces=[i['name'] for i in matched],references=contexts.get(hex(ptr),{}).get('references',[])+[dict(file=str(path.relative_to(ROOT)),evidence_id=e['evidence_id'],instruction=hex(ins['offset']))])
out=dict(target=str(APP),sha256=pe.sha256,metadata_file=str(metadata_path.relative_to(ROOT)),interfaces=interfaces,contexts=contexts,
    limitation='Local system WinMD supplies stable IID and declared method ABI order, not exact app source. Selected interfaces derive from IInspectable (six base slots). Native generic contexts reference the type pointer 24 bytes before a literal IID. Calls still require instruction/argument analysis. No app code or WinRT API was executed.')
(OUT/'abi-evidence.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(interfaces=len(interfaces),contexts={k:v['interfaces'] for k,v in contexts.items()}),ensure_ascii=False,indent=2))
