"""Read-only PE/string reference index. Pattern hits remain candidates until decoded."""
import bisect
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = Path(r"C:\Program Files\WindowsApps\14403Duracellko.NET.BingImageoftheDay_1.4.13.0_x64__1wy5t1va6xay4\Duracellko.BingImage.Universal.dll")
data = TARGET.read_bytes()
u16 = lambda p: struct.unpack_from('<H', data, p)[0]
u32 = lambda p: struct.unpack_from('<I', data, p)[0]
pe = u32(0x3c)
optional = pe + 24
base = struct.unpack_from('<Q', data, optional + 24)[0]
assert u16(optional) == 0x20b
sections = []
for i in range(u16(pe + 6)):
    p = optional + u16(pe + 20) + 40*i
    vs, rva, size, raw = struct.unpack_from('<IIII', data, p+8)
    sections.append(dict(name=data[p:p+8].rstrip(b'\0').decode(), rva=rva, virtual_size=vs, raw=raw, size=size, characteristics=u32(p+36)))
def file_offset(rva):
    for s in sections:
        if s['rva'] <= rva < s['rva'] + s['size']:
            return s['raw'] + rva - s['rva']
    raise ValueError(hex(rva))
exception_rva, exception_size = struct.unpack_from('<II', data, optional + 112 + 3*8)
exception_offset = file_offset(exception_rva)
functions = [struct.unpack_from('<III', data, p) for p in range(exception_offset, exception_offset + exception_size, 12)]
functions.sort()
starts = [f[0] for f in functions]
def owner(va):
    rva = va-base
    i = bisect.bisect_right(starts, rva)-1
    if i >= 0 and functions[i][0] <= rva < functions[i][1]:
        a,b,u = functions[i]
        return dict(start=hex(base+a), end_exclusive=hex(base+b), unwind_rva=hex(u))
    return None
e = json.loads((ROOT/'evidence/rea/dll-strings.json').read_text(encoding='utf-8-sig'))
strings = json.loads(e['normalized_result']['stdout'])
needles = ['http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n={0}', 'http://www.bing.com', 'ImageArchive.json', 'Images', 'Wallpaper', 'LockScreen', 'LiveTiles', 'UpdateLiveTileTask', 'UpdateLiveTileMaintenanceTask', 'Windows.ApplicationModel.Background.TimeTrigger', 'Windows.ApplicationModel.Background.MaintenanceTrigger', 'Windows.ApplicationModel.Background.SystemTrigger', 'UseBingImageAsLockScreen', 'UseBingImageAsDesktopBackground', 'CurrentLiveTileImageUrl', 'Windows.System.UserProfile.UserProfilePersonalizationSettings']
selected = [x for x in strings if x['type']=='utf16le' and x['string'] in needles]
refs = []
for s in sections:
    if not s['characteristics'] & 0x20000000:
        continue
    raw=s['raw']; stop=raw+s['size']-7
    for p in range(raw,stop):
        if 0x48 <= data[p] <= 0x4f and data[p+1] in (0x8d,0x8b) and data[p+2]&0xc7 == 5:
            va=base+s['rva']+p-raw
            dest=va+7+struct.unpack_from('<i',data,p+3)[0]
            for st in selected:
                if st['vaddr']-24 <= dest <= st['vaddr']+4:
                    refs.append(dict(kind='byte-pattern-candidate', string=st['string'], instruction=hex(va), file_offset=hex(p), target=hex(dest), text_address=hex(st['vaddr']), target_minus_text=dest-st['vaddr'], bytes=data[p:p+7].hex(), containing_runtime_function=owner(va)))
result=dict(target=str(TARGET),sha256=hashlib.sha256(data).hexdigest(), image_base=hex(base), sections=sections, runtime_function_count=len(functions), source_evidence_id=e['evidence_id'], selected_strings=selected, reference_candidates=refs, limitation='RIP-relative byte patterns are candidates, not decoded instructions or runtime observations. Containment uses PE exception table entries, which may split logical functions.')
(ROOT/'evidence/native/reference-index.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(sections=sections,runtime_function_count=len(functions),selected_strings=len(selected),reference_candidates=refs),ensure_ascii=False,indent=2))
