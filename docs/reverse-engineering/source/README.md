# Daily Picture 本机 REA 架构档案

本目录记录本机 **Daily Picture 1.4.13.0 x64** 的交付物、逻辑架构、功能流程、数据和设置契约、系统集成及逆向证据。主要实现来自 .NET Native 主 DLL；这是有证据支撑的逆向文档与分析脚本，不是原作者源码或已经编译验证的重建项目。

**阅读入口：[ARCHITECTURE.md](ARCHITECTURE.md)。** 它把各层和关键执行流程连接起来。需要核对具体结论时，再进入下列专题和对应证据。

| 文档 | 内容 |
|---|---|
| [架构总览](ARCHITECTURE.md) | 物理/逻辑分层、前台与后台边界、关键调用与数据流 |
| [安装包与依赖](docs/packaging-and-dependencies.md) | 24 个安装文件、原生编译输入、146 条构建组件、WinRT 激活和框架绑定 |
| [UI 与生命周期](docs/ui-and-lifecycle.md) | 启动、语言、页面导航、ViewModel、命令门控、计时器、通知和保存 |
| [图片加载与释放](docs/image-loading-and-lifetime.md) | ImageSource 惰性加载、文件读流、BitmapImage、Source 回调及 Unloaded 清理边界 |
| [应用挂起与恢复](docs/suspend-and-resume.md) | App 真正构造、Suspending 订阅、deferral、启动状态读取和显式 Dispose |
| [计时器与释放](docs/timers-and-disposal.md) | 两只 DispatcherTimer、Tick/Start/Stop、主 VM Dispose、委托及调用者边界 |
| [网络与下载](docs/network-and-download.md) | Bing 请求、响应流、串行下载、命中和提交条件、地区边界 |
| [数据模型与存储](docs/data-model-and-storage.md) | JSON、文件名、目录、设置读写、局部漫游迁移、清理和异常 |
| [后台与个性化](docs/background-and-personalization.md) | 注册条件、Run/deferral、磁贴、锁屏、桌面更新和图像处理 |
| [覆盖与证据](docs/coverage-and-evidence.md) | 问题覆盖矩阵、结论来源、已解/部分/未知的边界 |
| [方法与复查](docs/methodology-and-reproduction.md) | REA/Rizin、符号和 ABI 方法、脚本入口、限制及复查命令 |

可供程序读取或后续接手的索引：

- [函数索引 JSON](docs/function-map.json) / [CSV](docs/function-map.csv)：重点函数 VA/RVA、语义职责、PE 范围、关联 Evidence ID、直接调用与未展开间接调用。它是架构入口索引，不是全部源码方法清单。
- [架构结论索引](docs/architecture-ledger.json)：组件、主要关系和证据位置。
- [未解问题](docs/unknowns.json)：保留具体缺口和所需下一类证据。
- [REA 证据总索引](evidence/index.json)、[原始字节核验](evidence/validation.json)、[文档交付验证](evidence/architecture/documentation-validation.json)。

之前两轮的记录仍保留：[初次分析](ANALYSIS.md)、[下载/缓存/地区深入分析](DEEP_ANALYSIS.md)。后续专题补足 UI 语言、配置迁移、后台调用，以及图片/应用/计时器各自的生命周期；新结果没有将旧证据改写为原始源码。

本次还通过 REA 调用用户指定 Cutter 目录中的 Rizin/rz-ghidra，补充局部原生伪代码。使用的是随 Cutter 分发的命令行引擎及 SLEIGH 资源；没有连接 Cutter GUI 会话。复查方法与资源哈希见 [方法文档](docs/methodology-and-reproduction.md)。

目标包：`14403Duracellko.NET.BingImageoftheDay_1.4.13.0_x64__1wy5t1va6xay4`。主 DLL SHA-256：`d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a`。地址均为首选映像地址，主 DLL 基址 `0x180000000`。

本档案基于只读安装文件、既存本地状态和静态指令分析；没有为完成文档而启动目标、改动设置、修改图片缓存或执行系统壁纸操作。文档中的运行效果、服务器选区和异常中断结果，按证据明确区分直接观察、静态推导与尚未观察。
