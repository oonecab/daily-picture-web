"""Read-only, process-local Cutter rz-ghidra decompilation for one verified function."""
import argparse,json,os,re,subprocess
from pathlib import Path
from deep_symbols_resolve import APP,PE
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/app-lifecycle'
p=argparse.ArgumentParser();p.add_argument('name');p.add_argument('address',type=lambda x:int(x,0));a=p.parse_args()
assert re.fullmatch('[a-z0-9-]+',a.name);owner=PE(APP).owner(a.address);assert owner and int(owner['start'],16)==a.address
dest=OUT/(a.name+'.json');assert not dest.exists()
env=os.environ.copy();env.update(REA_RIZIN_COMMAND=r'E:\Softwares\Cutter-v2.5.0-Windows-x86_64\rizin.exe',PYTHONUTF8='1',PYTHONIOENCODING='utf-8')
cmd=f'e scr.color=0; e ghidra.sleighhome=E:/Softwares/Cutter-v2.5.0-Windows-x86_64/lib/rizin/plugins/rz_ghidra_sleigh; af @ {a.address:#x}; pdg @ {a.address:#x}'
r=subprocess.run(['node',r'C:\Users\wangq\AppData\Roaming\npm\node_modules\rea-agents\scripts\rea.mjs','execute-rizin-command',str(APP),cmd,'--format','json'],capture_output=True,encoding='utf8',env=env);assert r.returncode==0,r.stderr
x=json.loads(r.stdout);n=x['normalized_result'];assert n['completion_status']=='complete' and not n['artifact_changed'] and not n['output_truncated']
dest.write_text(r.stdout,encoding='utf8');(OUT/(a.name+'.c')).write_text(n['stdout'],encoding='utf8')
print(json.dumps(dict(path=str(dest),evidence_id=x['evidence_id'],stderr=n['stderr'],size=len(n['stdout'])),ensure_ascii=False))
