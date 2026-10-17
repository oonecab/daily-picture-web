"""Verify retained REA observations and instruction bytes against installed artifacts."""
import hashlib
import json
import struct
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
entries, failures, expected_limits, checked_instructions = [], [], [], 0
unique_instructions, decode_limits = set(), []
targets = {}
lines = ['Daily Picture: decoded native instructions (static evidence)', 'Addresses are preferred-image VAs, not live ASLR addresses.', '']
def artifact(path):
    if path in targets:
        return targets[path]
    data=Path(path).read_bytes()
    pe=struct.unpack_from('<I',data,0x3c)[0]
    opt=pe+24
    base=struct.unpack_from('<Q',data,opt+24)[0]
    n=struct.unpack_from('<H',data,pe+6)[0]
    osize=struct.unpack_from('<H',data,pe+20)[0]
    sections=[]
    for i in range(n):
        q=opt+osize+40*i
        _,rva,size,raw=struct.unpack_from('<IIII',data,q+8)
        sections.append((rva,size,raw))
    targets[path]=(data,base,sections)
    return targets[path]

for folder in ('rea','background','deep-download','deep-cache','deep-region','deep-symbols','architecture','architecture-ui','architecture-data','architecture-background','image-lifetime','timer-cleanup','app-lifecycle','lifecycle-supplement'):
    for p in sorted((ROOT/'evidence'/folder).glob('*.json')):
        obj=json.loads(p.read_text(encoding='utf-8-sig'))
        records=obj.get('records',[]) if isinstance(obj,dict) else []
        if isinstance(obj,dict) and 'evidence_id' in obj and 'operation' in obj:
            records=[obj]
        for e in records:
            if not isinstance(e,dict) or 'evidence_id' not in e or 'operation' not in e:
                continue
            entry=dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),evidence_id=e['evidence_id'],operation=e['operation'])
            if e['operation']=='execute_rizin_command':
                r=e['normalized_result']
                entry.update(command=e['parameters']['command'],completion_status=r['completion_status'],exit_code=r['exit_code'],output_truncated=r['output_truncated'],artifact_changed=r['artifact_changed'],stderr=r['stderr'])
                if r['completion_status']!='complete' or r['exit_code']!=0 or r['output_truncated'] or r['artifact_changed']:
                    failures.append(entry)
                if r['stderr']:
                    expected_limits.append(dict(path=entry['path'],stderr=r['stderr']))
                source=e['subject']['local_path']
                raw,base,sections=artifact(source)
                actual=hashlib.sha256(raw).hexdigest()
                if actual!=e['subject']['digest']['sha256']:
                    failures.append(dict(path=source,reason='installed artifact hash changed'))
                try:
                    insns=json.loads(r['stdout'])
                except (ValueError,TypeError):
                    insns=[]
                if isinstance(insns,list) and insns and isinstance(insns[0],dict) and 'opcode' in insns[0]:
                    lines.extend([entry['path'],e['evidence_id'],entry['command']])
                    for x in insns:
                        expected=bytes.fromhex(x['bytes'])
                        va=x['offset']; rva=va-base
                        offsets=[rawpos+rva-start for start,size,rawpos in sections if start<=rva<start+size]
                        if len(offsets)!=1 or raw[offsets[0]:offsets[0]+len(expected)]!=expected:
                            failures.append(dict(path=entry['path'],instruction=hex(va),reason='decoded bytes do not match source'))
                        checked_instructions+=1
                        unique_instructions.add((source,va,x['bytes']))
                        if x.get('type')=='ill' or x.get('opcode')=='invalid' or x.get('disasm')=='invalid':
                            decode_limits.append(dict(path=entry['path'],address=hex(va),bytes=x['bytes'],reason='Invalid decoding or byte-window boundary; not used to claim a complete function.'))
                        lines.append(f"{va:#x}  {x['bytes']:24s}  {x['opcode']}"+(f"  ; ptr={x['ptr']:#x}" if 'ptr' in x else ''))
                    lines.append('')
            entries.append(entry)

validation=dict(observed_at_utc=datetime.now(timezone.utc).isoformat(),evidence_records=len(entries),rizin_records=sum(e['operation']=='execute_rizin_command' for e in entries),decoded_instructions_byte_checked=checked_instructions,unique_instruction_observations=len(unique_instructions),artifact_count=len(targets),failures=failures,provider_limitations=expected_limits,disassembly_decode_limits=decode_limits,scope='Integrity and decoded byte verification only; no target execution, C# source recovery, or behavioral test. Instruction counts include byte-window padding; invalid decodes are separately listed and are not semantic evidence.')
(ROOT/'evidence/index.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'evidence/validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'evidence/native/disassembly.txt').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps(validation,ensure_ascii=False,indent=2))
raise SystemExit(bool(failures))
