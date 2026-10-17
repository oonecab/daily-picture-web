"""Bounded read-only REA CLI disassembly for data architecture."""
import argparse,json,os,re,subprocess
from pathlib import Path
from cache_pe import PE,TARGET
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/architecture-data'
p=argparse.ArgumentParser();p.add_argument('name');p.add_argument('start',type=lambda x:int(x,0));p.add_argument('end',type=lambda x:int(x,0));a=p.parse_args()
assert re.fullmatch('[a-z0-9-]+',a.name) and 0<a.end-a.start<=0x10000
OUT.mkdir(parents=True,exist_ok=True);dest=OUT/(a.name+'.json');assert not dest.exists()
env=os.environ.copy();env.update(REA_RIZIN_COMMAND=r'E:\Softwares\Cutter-v2.5.0-Windows-x86_64\rizin.exe',PYTHONUTF8='1',PYTHONIOENCODING='utf-8')
cli=r'C:\Users\wangq\AppData\Roaming\npm\node_modules\rea-agents\scripts\rea.mjs'
command=f'pDj {a.end-a.start} @ {hex(a.start)}'
r=subprocess.run(['node',cli,'execute-rizin-command',str(TARGET),command,'--format','json'],capture_output=True,text=True,encoding='utf-8',env=env)
if r.returncode:raise RuntimeError(r.stderr+r.stdout)
e=json.loads(r.stdout);dest.write_text(r.stdout,encoding='utf-8');n=e['normalized_result']
assert n['completion_status']=='complete' and not n['output_truncated'] and n['artifact_changed'] is False
instructions=json.loads(n['stdout']);dest.with_suffix('.asm').write_text('\n'.join(hex(i['offset'])+' '+i['bytes'].ljust(20)+' '+i.get('disasm',i.get('opcode','<undecoded>')) for i in instructions)+'\n',encoding='utf-8')
print(json.dumps({'file':str(dest),'evidence_id':e['evidence_id'],'command':command,'target_sha256':e['subject']['digest']['sha256']},indent=2))
