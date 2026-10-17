"""Build scoped timer findings, function index and evidence validation; no target writes."""
import hashlib,json,re,struct
from pathlib import Path
from cache_pe import PE
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/timer-cleanup'
p=PE();assert p.sha=='d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a'

def read(rel):return json.loads((ROOT/rel).read_text(encoding='utf-8-sig'))
def write(name,obj):(OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def ev(rel):
    r={'path':rel}
    if not (ROOT/rel).exists():return r
    d=read(rel)
    if isinstance(d,dict) and d.get('evidence_id'):r['evidence_id']=d['evidence_id']
    return r
def sources(*rels):return [ev(x) for x in rels]

ctor='evidence/architecture-ui/mainvm-constructor.json'
props='evidence/architecture-ui/mainvm-property-and-refresh.json'
select='evidence/architecture-ui/mainvm-selection-navigation.json'
factory='evidence/architecture-ui/viewmodel-factory.json'
frame='evidence/architecture-ui/frame-on-navigated.json'
dispose='evidence/timer-cleanup/mainvm-dispose-instructions.json'
booldispose='evidence/timer-cleanup/timer-second-operation.json'
nav='evidence/timer-cleanup/navigator-forwarded-event.json'
layout='evidence/timer-cleanup/type-and-abi-evidence.json'
refs='evidence/timer-cleanup/reference-inventory.json'
irefs='evidence/timer-cleanup/dispose-reference-inventory.json'

claims=[
 dict(id='TIMER-01',status='confirmed',claim='主 VM 构造为每个新实例建立两只 DispatcherTimer：+0x30 一小时周期刷新、+0x38 五秒通知；周期计时器在构造末尾 Start。',addresses=['0x1804a22c0','0x1804a20e0'],evidence=sources(ctor,factory,layout,'evidence/architecture-ui/timer-download-thunk.json'),limits=['这里的时长是配置的 Interval，不是 UI 阻塞、挂起或后台条件下的现场执行保证。']),
 dict(id='TIMER-02',status='confirmed',claim='两个 Tick 委托是绑定同一主 VM 实例的闭合实例委托；remove_Tick 包装器仅在已找到的构造注册路径作为移除回调参数被建立。',addresses=['0x1804a27dd','0x1804a27e4','0x1804a28c1','0x1804a28c8','0x1804a38b0','0x1804a38e0'],evidence=sources(ctor,select,refs,'evidence/timer-cleanup/interface-event-symbols.json'),limits=['构造移除委托不等于正在解绑；框架事件注册实现可能在内部或错误处理时使用它。','委托的目标引用已证，但没有 GC roots 或对象存活时长的运行时取证。']),
 dict(id='TIMER-03',status='confirmed-body-derived-identity',claim='0x180531e10 的已解正常路径依次 Stop 主 VM 的两只计时器并 GC.SuppressFinalize(this)；EEType 0x18001c678 实现 IDisposable，其额外方法表指向该函数，支持恢复为主 VM Dispose。',addresses=['0x180531e10','0x180531e33','0x180531e48','0x180531e50','0x18001c638'],evidence=sources(dispose,'evidence/timer-cleanup/mainvm-dispose-pseudocode.json',layout,'evidence/timer-cleanup/suppress-finalize-symbol.json'),limits=['主体没有 Tick 解绑、字段清空、disposed 标志或异步取消。','未建立异常发生后保证后续清理的本地 EH 路径；前一个 Stop 若抛出，后续步骤不受当前已证正常路径保证。','PE unwind flags 为 0 不足以排除所有处理器；.NET Native 托管 EH 元数据尚未完整解析，异常后的实际控制转移仍未知。','主 DLL 原始 PDB 不可得；Dispose 为接口身份、指针链和机器码共同支持的恢复名称。']),
 dict(id='TIMER-04',status='confirmed-body-derived-role',claim='0x18053eb80 在 bool 参数为 false 时返回，为 true 时依次 Stop +0x30 与 +0x38；语义等同一个 Dispose(bool) 辅助本体。',addresses=['0x18053eb80'],evidence=sources(booldispose,irefs),limits=['没有找到公开 Dispose 对它的直接调用；公开函数自身展开同样两次 Stop。','本体行为确定，原始源码方法名/可见性和编译器内联关系未恢复。']),
 dict(id='TIMER-05',status='bounded-static-negative',claim='已枚举的全镜像 E8/E9、REX RIP lea/mov、FF15/FF25 编码中，没有对两只清理本体的代码引用；IDisposable 方法表与元数据引用仍存在。UI/导航候选 IDisposable 调用均有其它对象来源，尚未建立主 VM 自动释放调用者。',addresses=['0x180531e10','0x18053eb80'],evidence=sources(refs,irefs,layout,'evidence/timer-cleanup/callsite-classification.json'),limits=['字节扫描只覆盖列出的编码；不能排除接口分派、其它生成模式、反射或运行时调用。','没有直接 xref 不等于死代码或永不执行。','544 个匹配 IDisposable 类型的候选分派单元不等于 544 个主 VM 清理路径。']),
 dict(id='TIMER-06',status='confirmed-selected-lifecycle-paths',claim='Navigator.Frame.Navigated 只在新 Content.DataContext 为 null 时创建 VM；随后调用的具体 override 0x1804a1c30 只按 CanGoBack 更新系统返回按钮显隐，没有读取/释放旧 VM。App 挂起和图片 Unloaded 的已恢复处理器也不调用主 VM Dispose。',addresses=['0x1804a9930','0x1804a1c30','0x180461f60','0x1804c86e0'],evidence=sources(frame,nav,layout,'evidence/architecture-ui/app-constructor.json','evidence/app-lifecycle/app-constructor-real.json','evidence/image-lifetime/image-unloaded-handler.json'),limits=['只对具体完整处理器和已恢复链作结论，不把它延伸为系统不存在其它回收或调度规则。','App/Navigator 自身 Dispose 与自动退出清理是否连接，仍见 App 生命周期专题。']),
 dict(id='TIMER-07',status='derived-conditional',claim='Dispose 仅停止当前计时器，未将 VM 变为不可再用；若此后已有异步回调或其它持有者调用通知函数，非空通知会重新 Start 通知计时器。',addresses=['0x1804a2e90','0x1804a2f34','0x1804a2b50'],evidence=sources(dispose,props,'evidence/architecture-ui/download-state-and-handlers.json','evidence/architecture-ui/personalization-command-flow.json','evidence/architecture-ui/lockscreen-command-flow.json','evidence/architecture-ui/save-command-state.json'),limits=['这是由函数组合推出的条件行为，不是本轮观察到的竞态、实际复活或内存泄漏。','Stop 不等于本函数取消所有在途异步操作；系统层对已入队 Tick 的处理未测。']),
 dict(id='TIMER-08',status='derived-conditional',claim='每次确实走主 VM 工厂都会分配新 VM 并创建新的计时器对；若不同页面对象都满足 DataContext 为空，则可以存在多个独立计时器实例。',addresses=['0x1804a20e0','0x1804a22c0','0x1804a9930'],evidence=sources(factory,ctor,frame,layout),limits=['未确认 Frame.CacheSize、NavigationCacheMode、每次返回的页面复用规则及旧页面 GC 可达性。','不能据此断言每次返回都创建新实例、计时器重复运行或发生泄漏。'])
]

ri=read(irefs)
class_rows=[
 ('0x180304900','0x1804a1009','旧后台任务名单枚举器','evidence/background/old-task-unregister.json'),
 ('0x180304910','0x1804a102a','同一枚举器的异常清理 funclet','evidence/timer-cleanup/unregister-enumerator-cleanup.json'),
 ('0x180304960','0x1804a347c','LoadImages 中图片记录集合的枚举器',props),
 ('0x180304970','0x1804a354d','同一集合枚举器的异常清理 funclet',props),
 ('0x180304bc0','0x1804a8caa','图片项 LoadImage 返回的流','evidence/image-lifetime/image-load-state.json'),
 ('0x180304bd0','0x1804a8cfa','同一流的异常清理 funclet','evidence/image-lifetime/image-load-state.json'),
 ('0x180308880','0x180531dea','App+0x58 中的 Navigator','evidence/timer-cleanup/timer-cleanup-and-adjacent.json'),
 ('0x180308890','0x180531f76','App+0x58 中的 Navigator','evidence/timer-cleanup/navigation-disposal-candidate.json')]
classified=[]
for cell,addr,role,src in class_rows:
    rawcell=next(x for x in ri['idisposable_dispatch_cells'] if x['cell']==cell)
    r=next(x for x in rawcell['code_references'] if x['instruction']==addr)
    d=read(src);items=json.loads(d['normalized_result']['stdout'])
    ins=next((x for x in items if x['offset']==int(addr,16)),None)
    classified.append(dict(cell=cell,instruction=addr,owner=r['owner'],object_source=role,evidence=sources(src),instruction_present_in_complete_REA=ins is not None))
# Source attribution is validated against whole functions, not the interface name alone.
write('callsite-classification.json',dict(target=str(p.path),sha256=p.sha,scope=['0x1804a0000 <= candidate instruction < 0x1804ab000','0x180531000 <= candidate instruction < 0x180532500'],candidate_dispatch_cells_all_image=len(ri['idisposable_dispatch_cells']),classified_calls=classified,limits=['Selected application/UI code windows, not a universal proof that all interface calls in the image were interpreted.','Tagged dispatch-cell interpretation and object source both matter; unrelated stream/enumerator disposal is not MainVM cleanup.']))
# Complete the claim sources now that classification exists.
for c in claims:
    for e in c['evidence']:
        assert (ROOT/e['path']).exists(),e['path']
write('findings.json',dict(target=str(p.path),sha256=p.sha,image_base=hex(p.base),mode='static-read-only',app_executed=False,settings_modified=False,cache_modified=False,findings=claims,open_questions=['主 VM IDisposable 的真实运行时调用者及触发时机。','尚未恢复的元数据分派关系是否提供自动释放连接。','页面缓存/复用策略、旧 VM 与委托的 GC 根、实测实例数量。','系统挂起、恢复、线程忙碌期间的实际 Tick 次数、时间及已排队回调规则。']))

rows=[
 (0x180531e10,'主 ViewModel Dispose：双 Stop 后 SuppressFinalize(this)',[dispose,'evidence/timer-cleanup/mainvm-dispose-pseudocode.json',layout],'derived-high'),
 (0x18053eb80,'主 ViewModel bool 清理候选：disposing=true 才双 Stop',[booldispose],'derived-high'),
 (0x1804a1c30,'Navigator 导航后覆盖方法：按 CanGoBack 设置系统返回按钮',[nav,layout],'confirmed'),
 (0x1804a38b0,'DispatcherTimer.remove_Tick 投影包装器',[select,layout],'confirmed'),
 (0x1804a38e0,'DispatcherTimer.add_Tick 投影包装器',[select,layout],'confirmed'),
 (0x1804a3910,'通知 Tick：Stop 通知计时器并清空通知',[select,layout],'confirmed'),
 (0x1804a2e90,'显示通知：替换消息并 Stop/有条件 Start 通知计时器',[props,layout],'confirmed'),
 (0x1804a22c0,'主 ViewModel 构造：两计时器和绑定实例 Tick 委托',[ctor,layout],'confirmed'),
 (0x1804a20e0,'主 ViewModel 工厂：分配依赖和新 VM',[factory,layout],'confirmed'),
 (0x1804a9930,'Navigator.Frame.Navigated：DataContext 空才创建 VM，随后转交导航回调',[frame,layout],'confirmed'),
 (0x1804a101d,'后台任务枚举器的 IDisposable 异常清理 funclet',['evidence/timer-cleanup/unregister-enumerator-cleanup.json','evidence/background/old-task-unregister.json'],'confirmed')]
functions=[]
for addr,role,files,confidence in rows:
    owner=p.owner(addr);assert owner and int(owner['start'],16)==addr
    functions.append(dict(address=hex(addr),end_exclusive=owner['end'],role=role,evidence_paths=files,evidence_ids=[e['evidence_id'] for e in sources(*files) if 'evidence_id' in e],confidence=confidence,name_kind='semantic-role-not-original-source-symbol'))
write('functions.json',dict(target=str(p.path),sha256=p.sha,image_base=hex(p.base),functions=functions))

raw_checks=[];manifest_paths=set()
for f in OUT.glob('*.json'):
    d=json.loads(f.read_text(encoding='utf-8-sig'))
    if not isinstance(d,dict) or 'evidence_id' not in d:continue
    n=d['normalized_result'];assert n['completion_status']=='complete' and not n['output_truncated'] and n['artifact_changed'] is False
    assert n['artifact_sha256_after']==p.sha
    count=0;bytecount=0
    if n['stdout'].lstrip().startswith('['):
        for ins in json.loads(n['stdout']):
            if not ins.get('bytes'):continue
            b=bytes.fromhex(ins['bytes']);off=p.offset(ins['offset']);assert p.data[off:off+len(b)]==b
            count+=1;bytecount+=len(b)
    raw_checks.append(dict(path=str(f.relative_to(ROOT)).replace('\\','/'),evidence_id=d['evidence_id'],complete=True,target_unchanged=True,instruction_count_compared=count,instruction_bytes_compared=bytecount))
    manifest_paths.add(f)
for c in claims:
    for e in c['evidence']:manifest_paths.add(ROOT/e['path'])
for x in classified:
    for e in x['evidence']:manifest_paths.add(ROOT/e['path'])
for x in OUT.glob('*'):
    if x.is_file() and x.name not in ('evidence-manifest.json','validation.json'):manifest_paths.add(x)
for x in (ROOT/'scripts').glob('timer_cleanup_*'):manifest_paths.add(x)
if (ROOT/'docs/timers-and-disposal.md').exists():manifest_paths.add(ROOT/'docs/timers-and-disposal.md')
write('evidence-manifest.json',dict(target=str(p.path),sha256=p.sha,files=[dict(path=str(x.relative_to(ROOT)).replace('\\','/'),bytes=x.stat().st_size,sha256=hashlib.sha256(x.read_bytes()).hexdigest()) for x in sorted(manifest_paths)]))
doc=ROOT/'docs/timers-and-disposal.md'
links=re.findall(r'\]\(([^)]+)\)',doc.read_text(encoding='utf-8'))
local_links=[x for x in links if not x.startswith(('https:','http:','#'))]
missing=[x for x in local_links if not (doc.parent/x.split('#')[0]).exists()]
assert not missing,missing
write('validation.json',dict(target_sha256_verified=p.sha,rea_outputs=raw_checks,function_starts_verified=len(functions),classification_count=len(classified),classification_instruction_presence={x['instruction']:x['instruction_present_in_complete_REA'] for x in classified},document_local_links_verified=len(local_links),missing_document_links=missing,limits=['Exact byte comparisons validate transcription, not all semantic interpretations.','The early adjacent-code capture starts inside the preceding function; no claim relies on its leading partial instruction. MainVM Dispose additionally has its own exact 78-byte capture.']))
print(json.dumps(dict(findings=len(claims),functions=len(functions),rea_outputs=len(raw_checks),manifest_files=len(manifest_paths),classification_presence=[x['instruction_present_in_complete_REA'] for x in classified]),ensure_ascii=False))
