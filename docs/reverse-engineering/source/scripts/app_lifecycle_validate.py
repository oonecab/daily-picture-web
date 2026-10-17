"""Check only App-lifecycle-owned documentation, evidence and function boundaries."""
import hashlib,json,re
from pathlib import Path
from deep_symbols_resolve import APP,PE
root=Path(__file__).resolve().parents[1];out=root/'evidence/app-lifecycle';pe=PE(APP)
failures=[];counts=dict(rea_files=0,pseudocode_files=0,instruction_byte_observations=0,functions=0,local_links=0)
def check(value,message):
    if not value:failures.append(message)
doc=root/'docs/suspend-and-resume.md'
for link in re.findall(r'\]\(([^)]+)\)',doc.read_text(encoding='utf-8')):
    if '://' in link or link.startswith('#'):continue
    counts['local_links']+=1;check((doc.parent/link.split('#')[0]).exists(),'missing link: '+link)
for p in sorted(out.glob('*.json')):
    x=json.loads(p.read_text(encoding='utf-8-sig'))
    if not isinstance(x,dict) or not x.get('evidence_id'):continue
    n=x['normalized_result'];counts['rea_files']+=1
    check(n.get('completion_status')=='complete',p.name+' incomplete')
    check(n.get('artifact_changed') is False,p.name+' changed')
    check(n.get('output_truncated') is False,p.name+' truncated')
    check(n.get('artifact_sha256_after')==hashlib.sha256(pe.data).hexdigest(),p.name+' hash differs')
    try:ins=json.loads(n['stdout'])
    except (KeyError,json.JSONDecodeError):
        if p.with_suffix('.c').exists():
            counts['pseudocode_files']+=1
            check(n.get('stderr')=='',p.name+' pseudocode stderr')
            check('Ghidra Decompiler Error' not in n['stdout'],p.name+' decompiler error')
            continue
        failures.append(p.name+' invalid output JSON');continue
    for i in ins:
        if not i.get('bytes'):continue
        counts['instruction_byte_observations']+=1
        try:check(pe.readva(i['offset'],len(i['bytes'])//2).hex()==i['bytes'],p.name+' mismatched bytes '+hex(i['offset']))
        except Exception as ex:failures.append(p.name+' byte read '+str(ex))
for f in json.loads((out/'functions.json').read_text(encoding='utf-8'))['functions']:
    counts['functions']+=1;addr=int(f['address'],16);owner=pe.owner(addr)
    check(owner and owner['start']==f['address'],'not pdata start '+f['address'])
    observed=False
    for ep in f['evidence_paths']:
        x=json.loads((root/ep).read_text(encoding='utf-8-sig'))
        check(x['evidence_id'] in f['evidence_ids'],'ID mismatch '+ep)
        ins=json.loads(x['normalized_result']['stdout'])
        observed=observed or any(i.get('offset')==addr for i in ins)
    check(observed,'function start not in referenced REA: '+f['address'])
result=dict(status='pass' if not failures else 'fail',target=str(APP),target_sha256=hashlib.sha256(pe.data).hexdigest(),counts=counts,failures=failures,
            scope='App-lifecycle-owned evidence only. Raw byte equality does not establish correct instruction boundaries at intentionally excluded range prefixes/tails or runtime behavior.')
(out/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False));assert not failures
