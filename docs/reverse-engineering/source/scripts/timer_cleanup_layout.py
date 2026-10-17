"""Read-only, selected EEType and ABI evidence; not a general NativeFormat parser."""
import hashlib,json,struct,uuid
from pathlib import Path
from cache_pe import PE
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/timer-cleanup'
p=PE()
assert p.sha=='d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a'

def u16(a):return struct.unpack_from('<H',p.data,p.offset(a))[0]
def u64(a):return p.u64(p.offset(a))
def rel32(a):return a+struct.unpack_from('<i',p.data,p.offset(a))[0]
def raw(a,n):return p.data[p.offset(a):p.offset(a)+n].hex()
def shape(a):
    nv,ni=u16(a+0x10),u16(a+0x12)
    assert nv<64 and ni<64
    slots=[dict(field=hex(a+0x18+8*i),value=hex(u64(a+0x18+8*i)),owner=p.owner(u64(a+0x18+8*i))) for i in range(nv)]
    interfaces=[dict(field=hex(a+0x18+8*nv+8*i),value=hex(u64(a+0x18+8*nv+8*i))) for i in range(ni)]
    return dict(ee_type=hex(a),header_bytes=raw(a,24),base_type=hex(u64(a+8)),virtual_slot_count=nv,interface_count=ni,virtual_slots=slots,interface_entries=interfaces)

main=shape(0x18001c678)
main['interface_names']={'0x1802a5151':'tagged indirect import 0x1802a5150: INotifyPropertyChanged','0x1802a6749':'tagged indirect import 0x1802a6748: IDisposable'}
main['interface_symbol_evidence']='evidence/timer-cleanup/interface-event-symbols.json'
field=0x18001c6c0;table=rel32(field);method=rel32(table)
assert table==0x18001c638 and method==0x180531e10
main['extra_method_table']=dict(field=hex(field),field_offset='0x48',field_bytes=raw(field,4),table=hex(table),entry_bytes=raw(table,4),entry_target=hex(method),owner=p.owner(method),confidence='derived-high',limit='The selected pointer chain and interface identity are validated, not the complete runtime dispatch-map format.')
unwind=0x180000000+int(p.owner(method)['unwind_rva'],16)
main['dispose_unwind']=dict(address=hex(unwind),header_bytes=raw(unwind,12),version=p.data[p.offset(unwind)]&7,flags=p.data[p.offset(unwind)]>>3,limitation='PE UNWIND_INFO flags are observed only; .NET Native managed EH metadata has not been fully decoded. A zero flag does not rule out every local managed exception handler.')
assert main['dispose_unwind']['flags']==0
main['discarded_hypothesis']='A generic +0x40 relative-table interpretation is inapplicable here: +0x40 holds 0x18014cf28. The earlier reference-inventory.json candidate is not used as a method mapping.'
nav=shape(0x18001bd50)
assert nav['virtual_slots'][5]['value']=='0x1804a1c30'

ui=json.loads((ROOT/'evidence/architecture-ui/abi-evidence.json').read_text(encoding='utf-8'))
timer=next(x for x in ui['interfaces'] if x['name']=='IDispatcherTimer')
assert hashlib.sha256(Path(timer['winmd_path']).read_bytes()).hexdigest()==timer['winmd_sha256']
contexts=[dict(address=hex(a),bytes=raw(a,16),first_type_pointer=hex(u64(a)),interface='IDispatcherTimer') for a in (0x18010f128,0x18010f138,0x18010f148)]
assert all(x['first_type_pointer']=='0x1800084e0' for x in contexts)

metadata=json.loads((OUT/'system-navigation-winmd.json').read_text(encoding='utf-8-sig'))
matched=[]
for file in metadata:
    assert hashlib.sha256(Path(file['path']).read_bytes()).hexdigest()==file['sha256']
    for typ in file['types']:
        attr=next((x for x in typ['attributes'] if x.get('guid')),None)
        if attr is None:continue
        guid=uuid.UUID(attr['guid']);hits=[];pos=0
        while (pos:=p.data.find(guid.bytes_le,pos))>=0:
            sec=next(x for x in p.sections if x['raw']<=pos<x['raw']+x['size'])
            va=p.base+sec['rva']+pos-sec['raw']
            hits.append(dict(iid_va=hex(va),type=hex(p.u64(pos-24)),bytes=p.data[pos-24:pos+16].hex()))
            pos+=1
        matched.append(dict(name=typ['name'],iid=str(guid),source=file['path'],sha256=file['sha256'],iid_hits=hits,methods=[dict(slot=x['index']+6,name=x['name'],signature=x['signature']) for x in typ['methods']]))
navcontexts=[]
for a in (0x18010f100,0x18010f118):
    tp=hex(u64(a));names=[i['name'] for i in matched if any(x['type']==tp for x in i['iid_hits'])]
    navcontexts.append(dict(address=hex(a),bytes=raw(a,16),type=tp,matched_interfaces=names))
assert all(len(x['matched_interfaces'])==1 for x in navcontexts)
out=dict(target=str(p.path),sha256=p.sha,image_base=hex(p.base),mainvm=main,navigator=nav,timer_interface=timer,timer_contexts=contexts,system_navigation_interfaces=matched,system_navigation_contexts=navcontexts,limitations=['Method/type names of app classes are reconstructed semantic labels; exact framework interface names come from a validated PDB or local WinMD.','Static metadata does not prove any lifecycle or finalizer invocation.','These two EEType layouts were decoded with their own counts and validated field contents; offsets must not be copied to unrelated types.'])
(OUT/'type-and-abi-evidence.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(main_vm_interfaces=main['interface_names'],dispose_method=main['extra_method_table'],navigation_contexts=navcontexts),ensure_ascii=False,indent=2))
