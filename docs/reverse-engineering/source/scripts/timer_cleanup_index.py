"""Read-only bounded reference inventory; byte candidates are not final xrefs."""
import json,struct
from pathlib import Path
from cache_pe import PE
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/timer-cleanup';OUT.mkdir(exist_ok=True,parents=True)
p=PE()
labels={0x18001c678:'MainVM EEType',0x18001d2c0:'DispatcherTimer wrapper EEType',0x1800084e0:'IDispatcherTimer EEType',0x18010f128:'timer Start/Stop context',0x18010f138:'timer remove context',0x18010f148:'timer add context',0x1804a38b0:'remove_Tick wrapper',0x1804a38e0:'add_Tick wrapper',0x1804a3910:'notification Tick',0x180602cc0:'download Tick thunk',0x1804a22c0:'MainVM ctor',0x1804a4f20:'DispatcherTimer wrapper ctor',0x1804a20e0:'MainVM factory',0x1804a2e90:'show notification',0x1802a4700:'managed removal helper import',0x1802a4728:'native/static removal helper import'}
labels.update({0x180531e10:'MainVM Dispose body',0x18053eb80:'MainVM disposing-bool helper'})
refs=[]
for sec in p.sections:
 if not sec['characteristics']&0x20000000:continue
 for off in range(sec['raw'],sec['raw']+sec['size']-7):
  va=p.base+sec['rva']+off-sec['raw'];target=None;kind=None;size=None
  if 0x48<=p.data[off]<=0x4f and p.data[off+1] in (0x8d,0x8b) and p.data[off+2]&0xc7==5:
   target=va+7+struct.unpack_from('<i',p.data,off+3)[0];kind='RIP-relative lea/mov candidate';size=7
  elif p.data[off] in (0xe8,0xe9):
   target=va+5+struct.unpack_from('<i',p.data,off+1)[0];kind='direct call/jump candidate';size=5
  elif p.data[off]==0xff and p.data[off+1] in (0x15,0x25):
   target=va+6+struct.unpack_from('<i',p.data,off+2)[0];kind='RIP-indirect call/jump candidate';size=6
  if target in labels:refs.append({'instruction':hex(va),'target':hex(target),'label':labels[target],'kind':kind,'bytes':p.data[off:off+size].hex(),'owner':p.owner(va)})
types=[]
for a in [0x18001c678,0x18001d2c0,0x1800084e0]:
 field=a+0x40;table=field+struct.unpack_from('<i',p.data,p.offset(field))[0];slots=[]
 try:
  for i in range(64):
   pos=table+i*4;dest=pos+struct.unpack_from('<i',p.data,p.offset(pos))[0];owner=p.owner(dest)
   if not owner or int(owner['start'],16)!=dest:break
   slots.append({'index':i,'entry':hex(pos),'target':hex(dest),'owner':owner})
 except ValueError:pass
 types.append({'type':hex(a),'bytes':p.data[p.offset(a):p.offset(a)+0x80].hex(),'relative_table_candidate':hex(table),'consecutive_pdata_start_entries':slots})
absrefs=[]
for a in [0x18001c678,0x18001d2c0,0x1800084e0,0x1804a38b0,0x1804a38e0,0x1804a3910,0x180602cc0]:
 raw=struct.pack('<Q',a);start=0;hits=[]
 while (start:=p.data.find(raw,start))>=0:
  sec=next(s for s in p.sections if s['raw']<=start<s['raw']+s['size'])
  hits.append({'file_offset':hex(start),'va':hex(p.base+sec['rva']+start-sec['raw']),'section':sec['name']});start+=1
 absrefs.append({'target':hex(a),'label':labels[a],'qword_occurrences':hits})
out={'target':str(p.path),'sha256':p.sha,'scan_scope':'all executable section bytes; selected REX RIP lea/mov, E8/E9 and FF15/FF25 patterns; .pdata boundaries used as attribution, instruction alignment not assumed','references':refs,'type_layout_candidates':types,'absolute_pointer_occurrences':absrefs,'limitations':['No references found is bounded to these encodings and targets; indirect/delegate/reflection/dynamic construction can evade this inventory.','Relative method table candidates stop at the first value not matching a .pdata function start; they are not a full type/interface parser.']}
(OUT/'reference-inventory.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'references':refs,'types':types},indent=2,ensure_ascii=False))
