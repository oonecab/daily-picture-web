"""Build auditable read-only data architecture evidence from retained REA and PE bytes.

Writes only evidence/architecture-data; original REA records are never rewritten.
"""
import datetime
import hashlib
import json
import re
import struct
import uuid
from pathlib import Path

from cache_pe import PE

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/architecture-data'
EXPECTED = 'd9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a'
p = PE()
assert p.sha == EXPECTED
OUT.mkdir(parents=True, exist_ok=True)


def read_json(rel):
    return json.loads((ROOT / rel).read_text(encoding='utf-8-sig'))


def save(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def ledger(rel):
    data = (ROOT / rel).read_bytes()
    result = {'path': rel, 'sha256': hashlib.sha256(data).hexdigest(), 'length': len(data)}
    if rel.endswith('.json'):
        j = json.loads(data.decode('utf-8-sig'))
        if isinstance(j, dict) and 'evidence_id' in j:
            result['evidence_id'] = j['evidence_id']
        if isinstance(j, dict) and 'normalized_result' in j:
            n = j['normalized_result']
            result['REA_status'] = {k: n.get(k) for k in ('completion_status', 'output_truncated', 'artifact_changed')}
            assert n.get('completion_status') == 'complete'
            assert not n.get('output_truncated')
            assert n.get('artifact_changed') is False
    return result


# Official Windows ABI reference already saved and hashed during deep-cache work.
reference_path = 'evidence/deep-cache/windows-storage-reference.rs'
reference = (ROOT / reference_path).read_text(encoding='utf-8')
interfaces = []
for name, contexts in [
    ('IApplicationDataStatics', [0x18010f488]),
    ('IApplicationData', [0x18010fa20, 0x18010f4a0]),
    ('IApplicationDataContainer', [0x18010fa38]),
    ('IStorageFolder', [0x18010f4b8]),
]:
    iid_text = re.search(r'define_interface!\(' + name + ', ' + name + r'_Vtbl, 0x([0-9a-f_]+)\)', reference)[1]
    iid = uuid.UUID(iid_text.replace('_', ''))
    declaration = re.search(r'pub struct ' + name + r'_Vtbl \{.*?\n\}', reference, re.S)[0]
    method_names = re.findall(r'    pub (\w+): unsafe', declaration)
    hits = []
    pos = 0
    while (pos := p.data.find(iid.bytes_le, pos)) >= 0:
        sec = next(s for s in p.sections if s['raw'] <= pos < s['raw'] + s['size'])
        va = p.base + sec['rva'] + pos - sec['raw']
        hits.append({'iid_file_offset': hex(pos), 'iid_va': hex(va),
                     'record_eetype_pointer': hex(p.u64(pos - 24)),
                     'record_bytes': p.data[pos - 24:pos + 24].hex()})
        pos += 16
    context_details = [p.pointer(c) for c in contexts]
    assert all(any(c['value'] == h['record_eetype_pointer'] for h in hits) for c in context_details)
    interfaces.append({'name': name, 'iid': str(iid), 'contexts': context_details,
                       'iid_records': hits, 'abi_methods': [{'slot': 6+i, 'name': m} for i, m in enumerate(method_names)],
                       'reference_declaration': declaration})

cells = []
for cell in [0x180305860, 0x180305870, 0x180305880, 0x180305890,
             0x180305e90, 0x180305ea0, 0x180305eb0, 0x180305ec0, 0x180305ed0]:
    off = p.offset(cell)
    raw_signed = struct.unpack_from('<q', p.data, off + 8)[0]
    tagged = cell + 8 + raw_signed
    cells.append({'cell_va': hex(cell), 'bytes': p.data[off:off+16].hex(),
                  'stub': hex(p.u64(off)), 'relative_raw_signed': raw_signed,
                  'tagged_type_reference': hex(tagged), 'low_tag': tagged & 3,
                  'import_slot_after_clearing_tag': hex(tagged & ~3)})
    assert tagged & ~3 == 0x1802a6fe0
save('abi-and-settings-types.json', {
    'evidence_id': 'DP-DATA-ABI-20261017', 'target': str(p.path), 'target_sha256': p.sha,
    'reference': {**ledger(reference_path), 'url': 'https://raw.githubusercontent.com/microsoft/windows-rs/master/crates/libs/windows/src/Windows/Storage/mod.rs'},
    'interfaces': interfaces, 'dictionary_dispatch_cells': cells,
    'import_type_evidence': 'evidence/architecture-data/settings-type-symbols.json',
    'limitations': ['IID record/context matches and ABI slots establish the Windows interface calls. This is static evidence, not invocation tracing.',
                    'Dispatch-cell tag recovery identifies IDictionary<string,object>; it is not a general reconstruction of every managed method slot.',
                    'A null dictionary assignment is recorded as assignment, not assumed to be Remove.']})

reused = [
    ('model-projection', 'evidence/deep-cache/storage-json.json', 0x1804b9190, 0x1804b9573),
    ('archive-load', 'evidence/deep-cache/storage-json.json', 0x1804b96b0, 0x1804b9ae7),
    ('archive-save', 'evidence/deep-cache/storage-json.json', 0x1804ba4b0, 0x1804bb100),
    ('get-image-file', 'evidence/deep-cache/extra-cache.json', 0x1804bf900, 0x1804bfb70),
    ('desktop-boolean-read', 'evidence/background/desktop-settings-read.json', 0x18051d510, 0x18051d5c9),
    ('desktop-boolean-write', 'evidence/background/desktop-settings-write.json', 0x18051d430, 0x18051d4c9),
    ('lockscreen-boolean-read', 'evidence/background/lockscreen-settings-read.json', 0x18051d730, 0x18051d7e9),
    ('lockscreen-boolean-write', 'evidence/background/lockscreen-settings-write.json', 0x18051d650, 0x18051d6e9),
]
reuse_index = []
for name, path, start, end in reused:
    e = read_json(path)
    instructions = json.loads(e['normalized_result']['stdout'])
    chosen = [i for i in instructions if start <= i['offset'] < end]
    assert chosen and chosen[0]['offset'] == start
    text = '\n'.join(f"{i['offset']:#x} {i.get('bytes', ''):20} {i.get('disasm', i.get('opcode', '<undecoded>'))}" for i in chosen)
    dest = OUT / ('reused-' + name + '.asm')
    dest.write_text(f"; Re-rendered subset, not a new REA observation.\n; Source: {path}\n; Evidence: {e['evidence_id']}\n; Target: {p.sha}\n" + text + '\n', encoding='utf-8')
    reuse_index.append({'output': str(dest.relative_to(ROOT)).replace('\\', '/'), 'range_start': hex(start), 'range_end_exclusive': hex(end), 'source': ledger(path)})
save('reuse-index.json', reuse_index)

snapshot = read_json('evidence/local-state/local-state.json')
archive = read_json('evidence/local-state/ImageArchive.observed.json')
save('model-observations.json', {
    'evidence_id': 'DP-DATA-MODEL-20261017', 'target_sha256': p.sha,
    'source_archive': ledger('evidence/local-state/ImageArchive.observed.json'),
    'source_snapshot': ledger('evidence/local-state/local-state.json'),
    'snapshot_utc': snapshot['collection_start_utc'],
    'top_level_type': type(archive).__name__, 'top_level_keys': list(archive),
    'image_count': len(archive['images']), 'image_object_key_sets': sorted({tuple(x.keys()) for x in archive['images']}),
    'observed_field_types': {'images': 'array', 'images[].url': 'string', 'images[].copyright': 'string'},
    'projection': {'constructor': '0x1804b9190', 'selector': '0x1804b9510',
                   'input_collection_offset': '0x8', 'output_collection_offset': '0x8',
                   'item_copies': [{'input': '0x8', 'output': '0x8', 'semantic_field': 'URL'}, {'input': '0x10', 'output': '0x10', 'semantic_field': 'Copyright'}],
                   'computed_item_field': {'offset': '0x18', 'value': 'GetImageFileName(output.Url)'},
                   'output_item_eetype': '0x180004d58', 'output_item_base_size_from_eetype': p.u32(p.offset(0x180004d58)+4),
                   'input_null': 'ArgumentNullException', 'input_images_null': 'new empty list', 'input_item_null': 'no explicit guard before dereference'},
    'limitations': ['Observed keys describe the persisted local snapshot, not the complete Bing service response contract.',
                    'NativeFormat type-name strings and field offsets support semantic model roles; a full type-to-EEType/field metadata graph was not decoded.',
                    'Offsets are native x64 implementation layout, not a portable serialization format.',
                    'Serializer attributes, converters, custom contract resolvers, and all accepted malformed-JSON cases are not completely recovered.']})

# Shared function-map import contract requested by the parent; role names are semantic.
functions = []


def func(address, role, evidence, confidence='high'):
    owner = p.owner(address)
    assert owner and int(owner['start'], 16) == address, (hex(address), owner)
    functions.append({'address': hex(address), 'role': role, 'evidence_paths': evidence,
                      'confidence': confidence, 'pdata_end_exclusive': owner['end'],
                      'name_provenance': 'semantic reconstruction from instructions and metadata; not main-module PDB'})


new_settings = ['evidence/architecture-data/settings-url-and-migrate.json', 'evidence/architecture-data/abi-and-settings-types.json', 'evidence/architecture-data/settings-type-symbols.json']
for a, role in [(0x1804be7f0, 'SettingsRepository 设置 CurrentLiveTileImageUrl'),
                (0x1804be880, 'SettingsRepository 读取 CurrentLiveTileImageUrl 并强制转换 String'),
                (0x1804be910, 'SettingsRepository 设置 CurrentDesktopBackgroundImageUrl'),
                (0x1804be9a0, 'SettingsRepository 读取 CurrentDesktopBackgroundImageUrl 并强制转换 String'),
                (0x1804bea30, 'SettingsRepository 设置 CurrentLockScreenImageUrl'),
                (0x1804beac0, 'SettingsRepository 读取 CurrentLockScreenImageUrl 并强制转换 String'),
                (0x1804beb50, '按键迁移非空 Roaming 值到 Local，然后向 Roaming 同键赋 null'),
                (0x1804bec80, '只迁移 UseBingImageAsLockScreen 与 CurrentLockScreenImageUrl 的包装函数')]:
    func(a, role, new_settings)
for a, role, path in [
    (0x18051d430, '写入本地 UseBingImageAsDesktopBackground 布尔设置', 'evidence/background/desktop-settings-write.json'),
    (0x18051d510, '读取本地 UseBingImageAsDesktopBackground：null 为 false，非空强转 Boolean', 'evidence/background/desktop-settings-read.json'),
    (0x18051d650, '写入本地 UseBingImageAsLockScreen 布尔设置', 'evidence/background/lockscreen-settings-write.json'),
    (0x18051d730, '读取本地 UseBingImageAsLockScreen：null 为 false，非空强转 Boolean', 'evidence/background/lockscreen-settings-read.json'),
    (0x1804b53d0, 'LockScreen 初始化异步状态：LocalFolder/CreateFolder/OpenIfExists', 'evidence/architecture-data/lockscreen-folder-init.json'),
    (0x1804b7240, 'Wallpaper 初始化异步状态：LocalFolder/CreateFolder/OpenIfExists', 'evidence/architecture-data/wallpaper-folder-init.json'),
    (0x1804bd610, 'LiveTiles 初始化异步状态：LocalFolder/CreateFolder/OpenIfExists', 'evidence/architecture-data/livetiles-folder-init.json'),
    (0x1804bb1d0, 'Images 初始化异步状态：LocalFolder/CreateFolder/OpenIfExists', 'evidence/deep-cache/storage-json.json'),
    (0x1804b9190, '数据 archive 投影为图像领域列表；null collection 变空列表', 'evidence/deep-cache/storage-json.json'),
    (0x1804b9510, '单张数据记录投影：复制 URL/Copyright，计算 FileName', 'evidence/deep-cache/storage-json.json'),
    (0x1804b96b0, '读取本地 ImageArchive.json 异步状态；无文件返回 null', 'evidence/deep-cache/storage-json.json'),
    (0x1804ba4b0, '保存 ImageArchive.json 异步状态；原名写 JSON', 'evidence/deep-cache/storage-json.json'),
    (0x1804ba8f0, '打开 archive 写入流的异步状态；StorageFolder 托管槽具体方法尚未恢复', 'evidence/deep-cache/storage-json.json'),
    (0x1804bf900, '从 LocalFolder/Images 按派生文件名取得图像 StorageFile', 'evidence/deep-cache/extra-cache.json'),
]:
    func(a, role, [path], 'high' if a != 0x1804ba8f0 else 'medium-high')
save('functions.json', functions)

claims = [
    ('DATA-01', 'high', '持久化分为 LocalState 文件与 LocalSettings 对象键值；核心对象关系由 JSON、类型字符串和投影代码交叉定位。', ['model-observations.json', 'abi-and-settings-types.json']),
    ('DATA-02', 'high-observation / medium-high-type-identity', '本地 archive 快照为 images 数组，元素只有 url/copyright 字符串；领域投影另计算 FileName。', ['model-observations.json', 'native-data-index.json', 'reuse-index.json']),
    ('DATA-03', 'high', '投影拒绝 null archive，将 null images 转成空列表；坏 URL 和 null 项没有转换为空项的分支。', ['reuse-index.json']),
    ('DATA-04', 'high', 'ImageArchive.json 不存在时返回 null，旧 URL 投影变空列表；打开/读取/反序列化异常传播。', ['reuse-index.json']),
    ('DATA-05', 'high / archive-create-mode-medium-high', 'JSON 按原文件名写入；未见应用层临时文件重命名事务。托管 CreateFile 槽未完全恢复。', ['reuse-index.json']),
    ('DATA-06', 'high', 'Images/LockScreen/Wallpaper/LiveTiles 均以 LocalFolder + OpenIfExists 初始化。', ['lockscreen-folder-init.json', 'wallpaper-folder-init.json', 'livetiles-folder-init.json', 'abi-and-settings-types.json']),
    ('DATA-07', 'high', '文件名来自首个不区分大小写的 id 查询键；无 id 时 Path.GetFileName 原 URL；命中检查不验证图像内容。', ['../deep-cache/filename.json', '../deep-cache/filename-predicate.json', '../deep-cache/storage-json.json']),
    ('DATA-08', 'high', '下载协调器初始化并读旧索引后请求新 archive，串行下载；至少一张实际保存且循环成功才写新索引。', ['../deep-cache/storage-json.json', '../deep-download/refresh-cleanup-sequence.json']),
    ('DATA-09', 'high', 'Images 清理保留持久化 archive 导出的文件名；派生目录保留一个给定名称。比较均忽略大小写。', ['../deep-cache/extra-cache.json', '../deep-cache/personalization-cleanup.json', '../deep-cache/tile-cleanup-call.json']),
    ('DATA-10', 'high', '三个 Current*ImageUrl 键均在 LocalSettings；读取强转 String，写入未作 URL 规范化。', ['settings-url-and-migrate.json', 'abi-and-settings-types.json', 'settings-type-symbols.json']),
    ('DATA-11', 'high', '两自动设置布尔值在 LocalSettings，读取 null 默认 false；非空值强转 Boxed_Boolean，错误类型不被本地吞掉。', ['reuse-index.json', 'settings-type-symbols.json']),
    ('DATA-12', 'high', '启动迁移仅两个锁屏键：非空 Roaming 值覆盖 Local，再给 Roaming 同键赋 null；无本地存在检查。', ['settings-url-and-migrate.json', 'abi-and-settings-types.json', '../architecture-ui/app-lifecycle-candidate.json']),
    ('DATA-13', 'high-observation', '持久化设置快照仅见 CurrentLiveTileImageUrl；不能据此断言当前内存、UI 状态或历史配置。', ['../local-state/local-state.json']),
    ('DATA-14', 'high-static / runtime-unverified', '图片、archive、删除、设置迁移不是一个整体事务；失败可留下部分写入、旧索引或部分残留文件。', ['settings-url-and-migrate.json', '../deep-cache/storage-json.json', '../deep-cache/extra-cache.json', '../deep-download/refresh-cleanup-sequence.json']),
]
save('findings.json', {
    'evidence_id': 'DP-ARCHITECTURE-DATA-20261017', 'recorded_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'target': str(p.path), 'target_sha256': p.sha, 'read_only_target': True,
    'target_execution': False, 'settings_written': False, 'cache_written': False, 'hive_mounted': False,
    'document': 'docs/data-model-and-storage.md',
    'claims': [{'id': c[0], 'confidence': c[1], 'conclusion': c[2], 'evidence_relative_to_architecture_data': c[3]} for c in claims],
    'limits': ['No full native field/type metadata graph or main-module PDB.', 'No live failure injection or app API execution.',
               'Exact catch type in FileHelper.DeleteOldFiles remains unknown.', 'Archive CreateFile managed dispatch slot is not independently resolved.',
               'Null assignment semantics in underlying roaming store are not equated to explicit Remove.']})

paths = {
    'docs/data-model-and-storage.md', 'scripts/data_arch_inspect.py',
    'scripts/data_arch_index.py', 'scripts/data_arch_evidence.py',
    'evidence/rea/dll-strings.json', 'evidence/local-state/local-state.json',
    'evidence/local-state/ImageArchive.observed.json', 'evidence/deep-cache/abi-evidence.json', reference_path,
    'evidence/deep-cache/storage-json.json', 'evidence/deep-cache/extra-cache.json',
    'evidence/deep-cache/filename.json', 'evidence/deep-cache/filename-predicate.json',
    'evidence/deep-cache/archive-file-predicate.json', 'evidence/deep-cache/personalization-cleanup.json',
    'evidence/deep-cache/tile-cleanup-call.json', 'evidence/deep-cache/findings.json',
    'evidence/deep-download/refresh-cleanup-sequence.json', 'evidence/architecture-ui/app-lifecycle-candidate.json',
    *[x[1] for x in reused],
}
paths.update(str(f.relative_to(ROOT)).replace('\\', '/') for f in OUT.iterdir() if f.is_file() and f.name not in {'evidence-manifest.json', 'validation.json'})
save('evidence-manifest.json', {'target': str(p.path), 'target_sha256': p.sha, 'files': [ledger(s) for s in sorted(paths)],
                                'note': 'Generated artifact hashes bind the files on disk. Re-rendered ASM subsets preserve references to their full retained source REA JSON; they are not new REA IDs.'})
print(json.dumps({'functions': len(functions), 'claims': len(claims), 'ledger_files': len(paths), 'target_sha256': p.sha}, ensure_ascii=False))
