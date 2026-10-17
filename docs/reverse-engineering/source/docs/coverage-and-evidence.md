# 架构覆盖、结论与证据入口

“记录完整架构”在此落实为覆盖交付物、启动/界面、业务编排、网络、数据/设置、后台、平台集成、异常及复查方法，并为不能确定的内容保留明确问题。它不代表已恢复所有源代码或做完所有运行时实验。

| 领域/问题 | 当前覆盖 | 关键来源 | 明确边界 |
|---|---|---|---|
| 安装身份、物理文件、目标哈希 | 已记录并重新核对 24 个既存安装文件 | [包布局](../evidence/architecture/package-layout.json) | 不是原始项目目录或完整签名信任链验证 |
| 原生编译和组件来源 | 已提取完整 NETNATIVEBUILDINFO；146 条输入 | [构建资源](../evidence/architecture/NETNATIVEBUILDINFO.txt) | Model/UI 是编译输入身份；原始解决方案未知 |
| .NET Native 与 SharedLibrary 绑定 | 已验证描述符/NEAT/PDB；重点调用有具体名称 | [符号恢复](../evidence/deep-symbols/symbols-findings.json) | 折叠别名要消歧；应用本身无完整符号 |
| 前台 App、Frame、语言和导航 | 已补 native 调用与 ABI | [UI 专题](ui-and-lifecycle.md) | 不把 UI Language 当 HTTP 市场选择 |
| 页面、ViewModel、命令与计时器 | 已记录资源、构造、门控和定向调用 | [UI 专题](ui-and-lifecycle.md) | XBF node stream 未完整解码；完整控件树仍部分未知 |
| 图片加载与释放 | 已恢复惰性 getter、异步 BitmapImage 加载、流清理和 Source 回调注册/解除 | [图片生命周期](image-loading-and-lifetime.md) | Unloaded 不等于释放 BitmapImage；实际渲染资源和 GC 尚无运行观察 |
| App 挂起与恢复 | 已定位 App 构造和真实 Suspending 订阅；handler 立即完成 deferral；启动读取状态后无恢复分支 | [挂起与恢复](suspend-and-resume.md) | 未建立其他生命周期事件的应用订阅链，未观察 OS 挂起/终止/再启动 |
| 计时器清理 | 已恢复 MainVM 双 Stop、Navigator 事件清理及类型对应 | [计时器与释放](timers-and-disposal.md) | Stop 不等于移除 Tick；尚未建立页面退出/挂起自动调用 VM.Dispose 的链 |
| 下载/缓存编排 | 已恢复默认数量、串行、命中、提交和清理条件 | [网络专题](network-and-download.md) | 前台默认 n=7，不覆盖后台 n=1 的独立编排 |
| 归档字段、文件名和目录 | 已恢复已有字段、命名、读写与清理 | [数据专题](data-model-and-storage.md) | 本地样本不是未来服务响应保证 |
| 设置、Current URL、迁移 | 已核实 LocalSettings、类型处理与两键迁移 | [数据专题](data-model-and-storage.md) | 不是全量数据迁移；错类型不等于缺省值 |
| 后台注册与 Run/deferral | 已恢复配置、入口和顺序处理 | [后台专题](background-and-personalization.md) | 注册请求不证明本机当前注册状态和准点执行 |
| 磁贴/壁纸/锁屏提供器 | 已补取图、门控、去重、图像与提交路径 | [后台专题](background-and-personalization.md) | 实际屏幕效果和系统调用成功率未运行观察 |
| 磁贴 EXIF / 色彩管理 | 已确证无参 GetPixelDataAsync、原始尺寸读取，并对照公开默认合同 | [BGA-21](background-and-personalization.md) | 旋转宽高互换的影响为条件性推导；未作图像运行实验 |
| 地区、头与 Cookie | 客户端请求形成路径已恢复 | [地区证据](../evidence/deep-region/region-findings.json) | 最终头、重定向和服务端选区仍未知 |
| 故障和一致性 | 已记录静态传播、提交顺序和残留推导 | [深入报告](../DEEP_ANALYSIS.md) | 无故障注入；部分 catch 精确类型尚未知 |

## 可追溯层次

从结论开始，可依次追到专题中的地址/结论编号、[function-map.json](function-map.json)、原始 REA Evidence、Evidence 内的源文件 SHA-256/命令/返回结果。语义角色名、普通 PE 范围、SharedLibrary 符号和 WinRT ABI 核对共同约束解释；不能把任意一个字符串引用等同于完整功能实现。

[architecture-ledger.json](architecture-ledger.json) 记录组件和逻辑关系。[function-map.csv](function-map.csv) 适合快速按地址、领域或职责筛选；JSON 版还保留函数内直接调用与间接调用位置。索引不是全程序调用图，不能用“未在精选索引出现”推断代码不存在。

## 新旧记录的关系

- [初次分析](../ANALYSIS.md) 保留首次调查时的技术栈、资源和既存状态。
- [深入分析](../DEEP_ANALYSIS.md) 详细记录下载、文件名、淘汰和地区请求链。
- 本次 `docs/` 增加应用生命周期、前台两个计时器、设置迁移、后台 n=1/顺序及平台集成，并形成统一导航和机器索引。
- 后续深入结果增加图片加载/释放、App 挂起/恢复、计时器清理三篇专题，并将原先笼统的生命周期未解项缩小为具体调用者、间接分派与运行时可达性问题。
- 原先 Cutter 的 rz-ghidra 缺少 SLEIGH 定位而不能生成伪代码；本轮指定随安装包分发的资源目录后已成功。历史失败保留，成功证据与工具资源哈希另存，详见 [方法文档](methodology-and-reproduction.md)。
- 后续证据确认 UI 实际使用 `ApplicationLanguages` 设置界面 Language；旧报告已补充该事实，仍不把它扩展为 HTTP 语言头赋值。
- 所有原始 REA JSON 保留；早期命名假设、失败探针和边界解码不被改造成成功证据。

## 未解问题与复查结果

具体问题、当前已知部分和所需证据在 [unknowns.json](unknowns.json)。原始源码/完整类型方法映射、完整 XBF 节点、最终网络请求上下文、服务端市场规则、部分托管 catch 类型、归档写入虚调用的精确 ABI、故障时持久化结果及调度实际执行仍保留。生命周期方面，挂起处理器内容、ImageSource 创建和局部释放方法已恢复；剩余重点是显式 Dispose 的自动调用者、未覆盖间接分派、挂起时异步操作的现场顺序，以及图片实际可达性和渲染资源释放时机。磁贴解码默认合同也已补证，异常图像与方向/色彩影响的现场结果仍未观察。

最后生成的 [documentation-validation.json](../evidence/architecture/documentation-validation.json) 包含文档数、链接核对数、精选函数数、对应 Evidence 数、文档哈希和失败列表；[validation.json](../evidence/validation.json) 记录原始哈希和机器码核对。检验数量不表示覆盖了相同数量的功能测试。可复查步骤见 [方法与复查](methodology-and-reproduction.md)。
