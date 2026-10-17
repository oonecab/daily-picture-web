"""Capture bounded application EEType/dispatch bytes without executing the target."""
import json,struct
from pathlib import Path
from deep_symbols_resolve import PE,APP
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/architecture-background';p=PE(APP)
types=[0x18001c350,0x18001c2a0,0x18001c3c0,0x18001c1b0,0x18001c460,0x18001bfd0,0x18001bf60]
rows=[]
for a in types:
    candidates=[]
    for i in range(0x40,0x70,4):
        val=struct.unpack('<i',p.readva(a+i,4))[0];target=a+i+val;owner=p.owner(target)
        if owner and int(owner['start'],16)==target:candidates.append(dict(field=hex(a+i),raw=hex(val&0xffffffff),target=hex(target),owner=owner))
    field=a+0x40;table=field+struct.unpack('<i',p.readva(field,4))[0];slots=[]
    for i in range(16):
        pos=table+i*4;dest=pos+struct.unpack('<i',p.readva(pos,4))[0];owner=p.owner(dest)
        if not owner or int(owner['start'],16)!=dest:break
        slots.append(dict(index=i,entry=hex(pos),target=hex(dest),owner=owner))
    rows.append(dict(type_address=hex(a),bytes=p.readva(a,0x70).hex(),relative_code_pointer_candidates=candidates,relative_table_field=hex(field),relative_table=hex(table),table_entries=slots))
cells=[]
for a in [0x180305a30,0x180305a20,0x180307de0,0x180307dd0,0x180308900,0x1803077a0,0x1803077b0,0x1803083f0,0x180305a10,0x180307dc0,0x1803057e0,0x1803058e0]:
    val=struct.unpack('<q',p.readva(a+8,8))[0];tag=val&3;target=a+8+(val&~3)
    tail=None
    for i in range(0,0x800,16):
        stub,cache=struct.unpack('<QQ',p.readva(a+i,16))
        if stub==0:tail=dict(address=hex(a+i),slot=cache);break
    cells.append(dict(address=hex(a),bytes=p.readva(a,16).hex(),tag=tag,relative_target=hex(target),group_terminator=tail))
constants=[dict(address=hex(a),bytes=p.readva(a,8).hex(),double=struct.unpack('<d',p.readva(a,8))[0]) for a in [0x180144818]]
result=dict(target=str(APP),sha256=p.sha256,types=rows,dispatch_cells=cells,constants=constants,limitations=['Relative code pointers are candidates, not a complete EEType parser.','Dispatch cache tag3 corresponds to local relative type, tag2 to imported-indirect type in this image; terminal slot is a managed-interface ordinal, not the COM ABI slot.'])
(OUT/'layout-evidence.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
