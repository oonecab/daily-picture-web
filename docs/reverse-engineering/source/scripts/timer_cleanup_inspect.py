"""Bounded read-only REA disassembly for timer lifetime reconstruction."""
import argparse,json,os,re,subprocess
from pathlib import Path
from cache_pe import PE,TARGET
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/timer-cleanup'
a=argparse.ArgumentParser();a.add_argument('name');a.add_argument('start',type=lambda s:int(s,0));a.add_argument('end',type=lambda s:int(s,0));a.add_argument('--pdg',action='store_true');args=a.parse_args()
assert re.fullmatch('[a-z0-9-]+',args.name) and 0<args.end-args.start<=0x10000
p=PE();assert p.sha=='d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a'
OUT.mkdir(parents=True,exist_ok=True);dest=OUT/(args.name+'.json');assert not dest.exists()
env=os.environ.copy();env.update(REA_RIZIN_COMMAND=r'E:\Softwares\Cutter-v2.5.0-Windows-x86_64\rizin.exe',PYTHONUTF8='1',PYTHONIOENCODING='utf-8')
cli=r'C:\Users\wangq\AppData\Roaming\npm\node_modules\rea-agents\scripts\rea.mjs'
cmd=f'pDj {args.end-args.start} @ {hex(args.start)}'
if args.pdg:cmd=f'e scr.color=0; e ghidra.sleighhome=E:/Softwares/Cutter-v2.5.0-Windows-x86_64/lib/rizin/plugins/rz_ghidra_sleigh; af @ {hex(args.start)}; pdg @ {hex(args.start)}'
r=subprocess.run(['node',cli,'execute-rizin-command',str(TARGET),cmd,'--format','json'],env=env,capture_output=True,text=True,encoding='utf-8')
if r.returncode:raise RuntimeError(r.stderr+r.stdout)
e=json.loads(r.stdout);dest.write_text(r.stdout,encoding='utf-8');n=e['normalized_result']
assert n['completion_status']=='complete' and not n['output_truncated'] and n['artifact_changed'] is False
if args.pdg:dest.with_suffix('.c').write_text(n['stdout'],encoding='utf-8')
else:
 items=json.loads(n['stdout']);dest.with_suffix('.asm').write_text('\n'.join(hex(i['offset'])+' '+i.get('bytes','').ljust(24)+' '+i.get('disasm',i.get('opcode','<undecoded>')) for i in items)+'\n',encoding='utf-8')
print(json.dumps({'file':str(dest.relative_to(ROOT)),'evidence_id':e['evidence_id'],'command':cmd,'sha256':p.sha}))
