# Daily Picture: native import and PDB symbol findings

The installed app DLL has 4,737 .NET Native custom imports. Its custom descriptor was checked against the ordinary SharedLibrary.dll!$NEAT$ import, then joined with the installed framework RVA table and Microsoft PDB. This is static symbol recovery; it is not recovered application source.

PDB validation: matching GUID FE6DCBB5-864A-4F9D-8101-638B869D98AE, matching DBI/PE age 1, and all 22 section layouts match. The PDB info stream has age 3. The raw PDB SHA-256 is d3200600d44d7de49f986207738efab5823cc7ac4d0b9693d134982d02ef918a.

Coverage: 4480 named import slots, 257 unresolved. 55,968 public-symbol records and 41,909 framed procedure records were indexed. All 14,638 complete procedure headers in LLVM's successful dump prefix agree with the custom parser.

## Key labels

| App import slot | Method/meaning | SharedLibrary address |
|---|---|---|
| `0x1802a2f70` | System.String.Format | `0x1804824e0` |
| `0x1802a2f98` | System.String.Concat | `0x180426e40` |
| `0x1802a4758` | CultureInfo.InvariantCulture / FormatProvider.InvariantCulture (folded aliases) | `0x1805125a0` |
| `0x18029f248` | MemoryStream constructor | `0x1804829c0` |
| `0x18029f308` | MemoryStream.ToArray | `0x18050fb00` |
| `0x18029f3d8` | Stream.CopyTo | `0x1805569b0` |
| `0x18029f3e0` | Stream.Dispose | `0x1804973b0` |
| `0x18029f468` | StreamReader constructor | `0x1805563b0` |
| `0x18029f130` | Uri constructor | `0x18045f6e0` |
| `0x18029f170` | Uri.Query | `0x180660010` |
| `0x18029f178` | Uri.Scheme | `0x18065f3f0` |
| `0x18029f528` | Path.GetFileName | `0x1806667e0` |
| `0x1802a2e00` | String.Equals | `0x18046da10` |
| `0x1802a2e10` | String inequality | `0x180417fd0` |
| `0x1802a2e30` | String.IsNullOrEmpty | `0x18041a1b0` |
| `0x1802a3050` | StringComparer.OrdinalIgnoreCase | `0x18061d340` |
| `0x1802a2a20` | Nullable<Boolean>.GetValueOrDefault (also folded with unrelated methods) | `0x1805687d0` |
| `0x1802a1178` | TaskFactory<T>.FromAsyncImpl | `0x1803a4db0` |

## Scoped behavior

- Download state body `0x1804bfc90`: URL concatenation → asynchronous response acquisition → response stream → MemoryStream → synchronous Stream.CopyTo → MemoryStream.ToArray → byte-array task result.
- Archive state body `0x1804c0e20`: InvariantCulture + String.Format URL → asynchronous response → stream → StreamReader → app-local JSON reader/deserializer. No direct StreamReader.ReadToEnd import is observed in this body.
- Request wrapper `0x1804c0080` creates Uri; the async wrapper uses a TaskFactory<T>.FromAsyncImpl adapter. These should not be mislabeled as HttpClient constructors/GetStreamAsync.
- Cache comparer slot `0x1802a3050` is StringComparer.OrdinalIgnoreCase. Filename-related slots resolve to Uri.Query and Path.GetFileName.
- Boolean setting fallback slot `0x1802a2a20` has a Nullable<Boolean>.GetValueOrDefault procedure alias; this strengthens the earlier false-default reconstruction.

## Evidence and limits

- `download-image-body`: `evidence/rea/image-url-http-assembly.json`, Evidence `ev_348c554d94d9d44272336ade5d39f5e043b7eebe3a8107dbd902272579aeb922`; scope 0x1804bfc90–0x1804bfdf5 (exclusive).
- `archive-json-body`: `evidence/rea/archive-url-assembly.json`, Evidence `ev_6478a71aad1bff76fe4f8a4d997fcc5df47efdc3a25652c2138e6c8fe622593f`; scope 0x1804c0e20–0x1804c1006 (exclusive).
- `request-string-uri-wrapper.json`: Evidence `ev_02e56c1831668c95ed0030b0afaf05baec41e307aa8a4dfbf88e0c85727a207c`.
- `request-delegate-wrapper.json`: Evidence `ev_a155bade41b99ffd570000e96baa56af880c31cb0f87c0e938b6de85597b3286`.
- `request-uri-factory.json`: Evidence `ev_2fe974fadb4991c032ea151874e0f06c04f722ade1e4c1f9bdbe4c4ed66f7a73`.
- `request-delegate-body.json`: Evidence `ev_2eadebb2880e0278c11168417ffe5d2ab2aa0dbf09a9672af4df1a4536a0d10d`.
- `request-task-wrapper.json`: Evidence `ev_b73a26ec5f54c20cc1dc44c170cd8790a2f4a9a0d7837f4440438ec2d56fac41`.

- `symbols-findings.json` contains source-bound call-site rows; `named-custom-imports.json` contains all import mappings; `verification.json` and `symbol-validation.json` record validation.
- Compiler-folded routines have multiple aliases. A symbol match alone does not identify which source method the app intended. Full aliases are kept separately; per-slot output declares truncation.
- The main application PDB lookup returned 404. The app NativeFormat method-RVA map and managed catch types remain unresolved. Target files and runtime state were not changed.

Format sources: [Synacktiv dotNIET](https://github.com/synacktiv/dotNIET/blob/main/dotNIET_plugin.py), [LLVM PDB DBI](https://www.llvm.org/docs/PDB/DbiStream.html), [LLVM module symbol stream](https://www.llvm.org/docs/PDB/ModiStream.html).

Reusable command: `python -X utf8 scripts/deep_symbols_resolve.py 0x1802a2f70 --output evidence/deep-symbols/selected.json`. Add `--from-evidence <REA-pDj-json>` to extract referenced slots. In Python, `Resolver().resolve(slot)` returns the validated mapping and symbol records.
