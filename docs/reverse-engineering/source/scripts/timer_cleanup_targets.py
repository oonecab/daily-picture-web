"""Locate IDisposable casts/cells and selected direct/indirect code pointers."""
import json,struct
from pathlib import Path
from cache_pe import PE
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/timer-cleanup';p=PE()
def vaoff(off):
 s=next(s for s in p.sections if s['raw']<=off<s['raw']+s['size'])
 return p.base+s['rva']+off-s['raw'],s
targetset={0x180531e10,0x18053eb80,0x1804a1cb0,0x1804a1d50,0x1804a38b0,0x1804a38e0}
ptrs=[];casts=[];cells=[]
for sec in p.sections:
 for off in range(sec['raw'],sec['raw']+sec['size']-7):
  va=p.base+sec['rva']+off-sec['raw']
  if not sec['characteristics']&0x20000000:
   v=struct.unpack_from('<i',p.data,off)[0];q=struct.unpack_from('<Q',p.data,off)[0]
   kinds=[]
   if va+v in targetset:kinds.append(('relative32',va+v))
   if p.base+(v&0xffffffff) in targetset:kinds.append(('RVA32',p.base+(v&0xffffffff)))
   if q in targetset:kinds.append(('absolute64',q))
   for kind,dest in kinds:ptrs.append({'at':hex(va),'target':hex(dest),'kind':kind,'section':sec['name'],'bytes':p.data[off:off+8].hex()})
  else:
   if 0x48<=p.data[off]<=0x4f and p.data[off+1] in (0x8b,0x8d) and p.data[off+2]&0xc7==5:
    dest=va+7+struct.unpack_from('<i',p.data,off+3)[0]
    if dest==0x1802a6748:casts.append({'instruction':hex(va),'bytes':p.data[off:off+7].hex(),'owner':p.owner(va)})
# Dispatch-cell stubs and tagged type references: inspect aligned cells only in .data.
for sec in p.sections:
 if sec['name']!='.data':continue
 for off in range(sec['raw'],sec['raw']+sec['size']-15,8):
  va=p.base+sec['rva']+off-sec['raw'];stub=p.u64(off);disp=struct.unpack_from('<q',p.data,off+8)[0]
  if va+8+disp==0x1802a674a:
   cells.append({'cell':hex(va),'stub':hex(stub),'bytes':p.data[off:off+16].hex(),'type_import':'0x1802a6748'})
cellmap={int(c['cell'],16):c for c in cells}
for c in cells:c['code_references']=[]
for sec in p.sections:
 if not sec['characteristics']&0x20000000:continue
 for off in range(sec['raw'],sec['raw']+sec['size']-7):
  if 0x48<=p.data[off]<=0x4f and p.data[off+1] in (0x8d,0x8b) and p.data[off+2]&0xc7==5:
   va=p.base+sec['rva']+off-sec['raw'];dest=va+7+struct.unpack_from('<i',p.data,off+3)[0]
   if dest in cellmap:cellmap[dest]['code_references'].append({'instruction':hex(va),'owner':p.owner(va)})
out={'target':str(p.path),'sha256':p.sha,'selected_pointer_occurrences':ptrs,'idisposable_type_rip_references':casts,'idisposable_dispatch_cells':cells,'direct_call_candidates':[{'target':hex(x),'callers':p.callers(x)} for x in [0x180531e10,0x18053eb80]],'limitation':'Byte-pattern candidates; RIP candidates must be validated by disassembly. Interface map interpretation remains caller-sensitive. Pointer encodings are enumerated only as specified.'}
(OUT/'dispose-reference-inventory.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'pointers':ptrs,'casts':casts,'idisposable_cells':cells},indent=2))
