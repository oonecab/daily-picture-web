# 证据方法、复查步骤与覆盖边界

本工作区是逆向分析档案，不是恢复的原始源码仓库。文档中真实类名、框架符号、语义角色名、逻辑分层和地址的证据级别各不相同。复查时先确认目标 SHA-256，再读取具体的完整证据记录。

## 证据等级

| 等级 | 本项目中的含义 | 示例 |
|---|---|---|
| observed-artifact | 原始字节、资源、声明或快照中直接存在 | 包版本、字符串、清单能力、JSON 字段 |
| derived-static | 由已解码指令、参数和数据流推出的行为 | anyDownloaded 条件、先写索引再清理、按名字比较 |
| inferred-architecture | 多份证据支持的职责/逻辑层划分，尚无全部原始符号 | 组件依赖图、部分 interface dispatch 的角色 |
| observed-snapshot | 采集时已有的本地状态 | 7 条索引与 7 张图片、settings.dat 的值 |
| unknown-runtime | 需要实际运行或外部服务上下文才能确认 | 最终 HTTP 头、调度时刻、故障中断后的真实文件内容 |

地址统一为首选映像 VA；主 DLL image base 为 `0x180000000`。它们不是进程中的实际 ASLR 地址。`.pdata` 有 16,404 条 RUNTIME_FUNCTION 记录，包括编译器助手与异常 funclet，不能称为“16,404 个应用业务方法”。

## 工具路径及可复查步骤

已使用 REA 6.5.0 与本机 Rizin 0.9.1。当前 CLI 路径来自已有安装，没有为了本次文档安装其他反编译器。

```powershell
Set-Location -LiteralPath 'E:\study\rea\daily-picture'

# 只读重核实安装文件和 REA 资源边界，更新工作区派生清单。
python -X utf8 scripts/architecture_inventory.py

# 核实已保留 REA 记录的源哈希与机器码，更新工作区验证结果。
python -X utf8 scripts/verify_evidence.py

# 为给定 .NET Native 导入槽读取绑定表和匹配框架符号。
# 若使用 --output，应选择工作区内新的文件名，避免覆盖原始证据。
python -X utf8 scripts/deep_symbols_resolve.py 0x1802a2f70

# 对既有缓存快照做文件名对应检查，不访问 Bing 或运行目标。
python -X utf8 scripts/download_snapshot.py

# 重新生成架构函数索引并检查文档/证据引用。
python -X utf8 scripts/build_architecture_index.py
python -X utf8 scripts/build_architecture_ledger.py
python -X utf8 scripts/verify_architecture_docs.py
```

需要补取指定函数的原生指令时，先用 PE `.pdata` 确认边界，再执行有界 REA 命令。例如以下包装脚本把输出保存在工作区并拒绝已有 EvidenceName：

```powershell
$env:REA_RIZIN_COMMAND = 'E:\Softwares\Cutter-v2.5.0-Windows-x86_64\rizin.exe'
./scripts/rea_native.ps1 -AnalysisCommand 'pDj 356 @ 0x180518c60' `
    -EvidenceName 'new-review-cache-update'
```

这个例子是静态解码，不会加载目标代码执行。新建证据需要使用新名称，保留旧记录；不要因为一个工具预览截断而裁改完整 JSON。`pDj` 参数是字节长度，不能用函数数量代替。

## Cutter 随附 rz-ghidra 的补充反编译路线

后续生命周期调查检查了用户提供的 `E:\Softwares\Cutter-v2.5.0-Windows-x86_64`。其中 `rizin.exe`、`core_ghidra.dll` 与 `lib/rizin/plugins/rz_ghidra_sleigh/x86-64.sla` 等资源均存在；显式设置进程内的 `ghidra.sleighhome` 后，Navigator.Dispose 的单函数反编译成功。此前的缺失 SLEIGH 错误保留为历史结果，本轮已用不同配置解决该路径问题。

```powershell
# 只在本次 Rizin 进程内指定资源目录、建立函数分析并输出伪代码。
# EvidenceName 选新的名称；脚本不会覆盖已有证据。
./scripts/rea_native.ps1 -AnalysisCommand 'e scr.color=0; e ghidra.sleighhome=E:/Softwares/Cutter-v2.5.0-Windows-x86_64/lib/rizin/plugins/rz_ghidra_sleigh; af @ 0x180531e90; pdg @ 0x180531e90' `
    -EvidenceName 'new-review-navigator-pseudocode'

# 或使用本轮包装脚本；地址必须为已验证的 .pdata 起点。
python -X utf8 scripts/lifecycle_supplement.py pseudo new-review-navigator 0x180531e90
```

成功记录为 [REA 伪代码证据](../evidence/rea/cutter-navigator-dispose-pseudocode.json)，工具和语言资源 SHA-256 为 [cutter-support.json](../evidence/lifecycle-supplement/cutter-support.json)。这里实际使用的是 **REA → Cutter 随附 Rizin → rz-ghidra**；没有启动目标程序，也没有改变 Cutter 安装配置。初次 Cutter bridge 查询未发现已连接会话，后续走 CLI，未声称操作过 GUI。

伪代码仅辅助读控制流。例如目标以 DL 传入的 Boolean 可显示为 `in_DL`，托管类型、接口、异常 funclet 和函数原型仍需靠机器码、精确框架符号及 WinRT ABI 核实。REA 原始记录绑定目标字节；额外的语言/插件哈希由本项目补记，不能误称为 REA 自动绑定的外部输入。

## 原始与派生材料

- `evidence/rea/*.json`、各专题目录中的原生分析 JSON：REA 返回的完整 Evidence，包括 source digest、provider、parameters、stdout/stderr、完成状态与限制。工具的 `artifact_changed=false` 只覆盖它读取的目标，不是整个机器的变化证明。
- `.asm`、`disassembly.txt`：从原始记录生成的便读视图。名称中存在早期假设时，以证据中的地址与最终报告为准。
- `evidence/resources/original/`：所选清单/元数据的只读副本，有前后哈希；不是完整安装包备份。
- `evidence/local-state/`：采集时的本地数据快照与核对结果；不是当前实时状态，也不是原作者设计规范。
- `evidence/deep-symbols/`：微软 PDB、解析产物、自定义导入映射与验证。大型文件保留用于复查，不把其中所有符号当成应用实际可达功能。
- `evidence/architecture*/`：此次架构记录补充的原始 REA 数据或带来源的派生结果。
- `evidence/image-lifetime/`、`timer-cleanup/`、`app-lifecycle/` 和 `lifecycle-supplement/`：后续生命周期调查的指令、伪代码、引用扫描、字段/接口映射及有界结论。
- `docs/*.md`、`docs/*.json`、`docs/function-map.csv`：组织过的架构视图与索引，不替代原始证据。

## 验证做了什么

`verify_evidence.py` 逐项核对 Rizin 记录的 source SHA-256、完成状态、输出截断和 artifact_changed 字段，并把每条保留反汇编的机器码重新映射到原 PE 字节。结果在 [validation.json](../evidence/validation.json)。重复窗口、填充字节和无效边界解码单独解释，不能把条目数当成业务测试数量。

`build_architecture_index.py` 将手工选定的语义入口和 PE 函数范围关联到覆盖该地址的 REA 记录，导出调用边和缺口；字节覆盖不等于完整语义恢复。只纳入指令直接编码的调用边，接口/虚方法分派没有解析时保持未知，不以邻近字符串自动补全。

`verify_architecture_docs.py` 检查文档本地链接、待填占位符、索引 Evidence ID 和地址范围等一致性，并写工作区验证报告。这不是应用行为测试。

## 已知方法限制

1. 主 DLL 为 .NET Native，缺少常规 CLI 实现元数据；主应用 PDB 查询失败。保留的方法名字符串不能自动变为完整方法映射或原始 C#。
2. 独立 Ghidra/IDA/Hopper provider 仍未配置为可用的完整路线；Cutter 随附的 rz-ghidra 已通过显式 SLEIGH 目录成功输出指定函数的伪代码。两者不能混称为完整 Ghidra 数据库分析或原始 C# 恢复。
3. .NET Native 自定义导入已验证到 SharedLibrary `$NEAT$` 表。框架 PDB 的 GUID、DBI age 与全部节布局匹配；折叠别名仍必须由调用上下文消歧。
4. XBF 2.1 的元数据表已按边界解析；没有完整 node stream 解码。因此页面字段/控件声明与实际绑定表达式的确信程度需分别记录。
5. Microsoft ABI 与历史框架源码只用于解释相应接口或模式；历史 corefx 不是这份已安装 DLL 的精确源码版本。
6. 所有目标程序操作保持静态/只读边界。没有用现有缓存反推它必然经历了某次特定执行路径。

## 尚未具备的重建输入

没有原始解决方案、全部源码/接口签名、完整 XBF 控件树和全部异常类型。可以根据已记录契约设计兼容实现，但应把新设计与恢复事实分开，并用目标运行对比验证。当前材料不构成已可编译、可发布或功能完全等价的重建项目。
