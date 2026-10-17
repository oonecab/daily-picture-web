"""Bounded REA observations for application lifecycle."""
import argparse, json, os, re, subprocess
from pathlib import Path
from deep_symbols_resolve import APP, Resolver

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/app-lifecycle'
CLI=Path(r'C:\Users\wangq\AppData\Roaming\npm\node_modules\rea-agents\scripts\rea.mjs')
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('name');p.add_argument('start',type=lambda s:int(s,0));p.add_argument('length',type=lambda s:int(s,0))
a=p.parse_args();assert re.fullmatch('[a-z0-9-]+',a.name);assert 0<a.length<=0x12000
OUT.mkdir(parents=True,exist_ok=True);dest=OUT/(a.name+'.json')
assert not dest.exists(),str(dest)
env=os.environ.copy();env.update(REA_RIZIN_COMMAND=r'E:\Softwares\Cutter-v2.5.0-Windows-x86_64\rizin.exe',PYTHONUTF8='1',PYTHONIOENCODING='utf-8')
command=f'pDj {a.length} @ {a.start:#x}'
r=subprocess.run(['node',str(CLI),'execute-rizin-command',str(APP),command,'--format','json'],capture_output=True,encoding='utf-8',env=env)
assert r.returncode==0,r.stderr
e=json.loads(r.stdout);n=e['normalized_result'];dest.write_text(r.stdout,encoding='utf-8')
assert n['completion_status']=='complete' and not n['artifact_changed'] and not n['output_truncated']
resolver=Resolver();lines=[];imports={};literals={}
for i in json.loads(n['stdout']):
    dis=i.get('disasm',i['opcode']);labels=[]
    for m in re.finditer(r'call qword \[(0x[0-9a-f]+)\]',dis):
        slot=int(m.group(1),16);item=resolver.resolve(slot);imports[hex(slot)]=item
        labels.extend(x['name'] for x in item.get('symbols',[])[:3])
    for m in re.finditer(r'lea \w+, (?:qword )?\[(0x[0-9a-f]+)\]',dis):
        va=int(m.group(1),16)
        try:
            raw=resolver.app.readva(va,12);length=int.from_bytes(raw[8:12],'little')
            if 0<length<512:
                value=resolver.app.readva(va+12,length*2).decode('utf-16le')
                if all(c.isprintable() or c in '\n\r\t' for c in value):literals[hex(va)]=value;labels.append(repr(value))
        except (ValueError,UnicodeDecodeError):pass
    owner=resolver.app.owner(i['offset'])
    if owner and owner['start']==hex(i['offset']):lines.append('\n; FUNCTION '+owner['start']+' END '+owner['end_exclusive'])
    lines.append(f"{i['offset']:#x} {i['bytes']:24s} {dis}"+(' ; '+' | '.join(labels) if labels else ''))
(OUT/(a.name+'.asm')).write_text('\n'.join(lines)+'\n',encoding='utf-8')
(OUT/(a.name+'-annotations.json')).write_text(json.dumps(dict(imports=imports,literals=literals),ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(file=str(dest),evidence_id=e['evidence_id'],command=command,instructions=len(lines),imports=len(imports),literals=literals,stderr=n['stderr']),ensure_ascii=False,indent=2))
