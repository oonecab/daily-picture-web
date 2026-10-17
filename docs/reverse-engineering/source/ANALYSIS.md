# Daily Picture 本机逆向分析

**架构档案入口：** [ARCHITECTURE.md](ARCHITECTURE.md) 连接各专题；图片下载、文件名生成、缓存淘汰、索引提交和地区请求路径见 [DEEP_ANALYSIS.md](DEEP_ANALYSIS.md)。下文保留首次调查记录；后续明确恢复的算法和系统调用以相应专题为准。

分析日期：2026-10-17（Asia/Shanghai）。范围：本机已安装的 Daily Picture 1.4.13.0。使用 REA 6.5.0 的 PE/CLI、PE 资源检查和 Rizin 命令取证，结合已安装 Windows SDK 的 PRI 解码、XBF 元数据解析、应用缓存与设置文件的只读检查。

**主要结论：这是一个 UWP / XAML 的 Bing 每日图片客户端。EXE 是很小的启动入口，主要逻辑位于 .NET Native 1.7 编译的 x64 DLL。已找到默认传入 7 的图片列表请求路径、图片缓存结构、壁纸与锁屏接口相关实现、后台 60 分钟重复触发配置，以及与截图和当前 Windows 壁纸配置相互对应的本地图片。**

本报告区分原始字节/资源/持久化状态的观察、根据这些材料归纳的程序行为，以及需要实际运行才能验证的内容。没有恢复原始 C# 项目，没有对应用进行调试注入或网络抓包；没有启动应用、更改其配置或写入壁纸设置。输出仅写入本分析工作区。

## 1. 目标身份与编译结构

| 项目 | 核实结果 |
|---|---|
| 显示名、发布者显示名 | Daily Picture；Duracellko.NET |
| 包名 | `14403Duracellko.NET.BingImageoftheDay` |
| 包版本、架构 | `1.4.13.0`，x64 |
| PackageFamilyName | `14403Duracellko.NET.BingImageoftheDay_1wy5t1va6xay4` |
| 安装目录 | `C:\Program Files\WindowsApps\14403Duracellko.NET.BingImageoftheDay_1.4.13.0_x64__1wy5t1va6xay4` |
| EXE | `Duracellko.BingImage.Universal.exe`，15,872 bytes |
| 核心 DLL | `Duracellko.BingImage.Universal.dll`，6,566,400 bytes |
| 技术栈 | UWP / XAML，.NET Native Framework/Runtime 1.7，VCLibs 140 |
| 打包编译信息 | VS 2017；`ilc.exe 1.7.25927.00` |
| 清单声明能力 | `internetClient` |

EXE 的导入表只有来自主 DLL 的 `RHBinder__ShimExeMain`，因此主要分析目标是 DLL。DLL 的 PE/CLI 检查确认 CLI data directory 缺失，常规 CIL/C# 反编译路径不可用。主 DLL 导出 `RHBinder__ShimExeMain` 和 `DllGetActivationFactory`，与启动入口及 WinRT 后台组件注册相符。

这里的 .NET Native 1.7 与现代 .NET 8 NativeAOT 不应混为一谈。主 DLL 中保留了部分类型和方法名称，但名称不是完整原始源码。PE FileVersion/ProductVersion 都是 `1.0.0.0`，软件安装版本应以 Appx 的 `1.4.13.0` 为准。

核心 DLL SHA-256：`d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a`。

来源：[身份与哈希](evidence/identity.json)、[清单副本](evidence/resources/original/AppxManifest.xml)、[EXE 导入 REA 证据](evidence/rea/exe-imports.json)、[DLL 导出证据](evidence/rea/dll-exports.json)、[MCP 证据包](evidence/rea/mcp-evidence-bundle.json)。

## 2. 功能结构

下面是基于保留类型名、打包 UI 元数据、原生代码引用与实际缓存归纳的结构，不是完整恢复的调用图。

| 层次 | 具体线索 | 可支持的结论 |
|---|---|---|
| 界面 | `MainPage`、`ApplicationSettingsPage`、`AboutPage`；`FlipView`、`Images`、`SelectedIndex`、`IsBusy` | 图片翻页、选择、忙碌指示、设置与关于页 |
| 命令与视图模型 | `MainPageViewModel`、`ApplicationSettingsViewModel`；Refresh/Save/SetDesktopBackgroundImage/SetLockScreenImage Command | 界面使用视图模型和命令分离的结构 |
| 图片数据与下载 | `BingImageDownloader`、`BingImageManager`、`BingImageData`、`GetImageArchive`、`DownloadImage` | 图片列表与图片数据下载有独立组件；精确函数到类型的全部映射尚未恢复 |
| 本地存储 | `LocalBingImageStorage`、`LoadImageArchive`、`SaveImageArchive`、`DeleteOldImages`、`GetUriQueryId` | 后续已恢复文件名、命中、保存与淘汰条件，见深入报告 |
| 系统壁纸/锁屏 | `DesktopBackgroundProvider`、`PersonalizationLockScreenProvider`；`UserProfilePersonalizationSettings` 原生引用 | 通过 Windows 个性化相关接口集成壁纸与锁屏 |
| 后台 | `UpdateLiveTileBackgroundTask`；UpdateLiveTile/UpdateLockScreen/UpdateDesktopBackground 名称及清单注册 | 后台组件承担动态磁贴及相关更新功能；每条路径实际执行情况需要运行观察 |

截图底部的功能与资源一致：刷新、设桌面壁纸、设锁屏、保存、设置和更多/关于。设置页有两个自动每日更新选项：`UseBingImageAsDesktopBackground`、`UseBingImageAsLockScreen`。

已用现有 MakePRI 成功解出 48 个命名资源、52 个候选，其中 33 条字符串、14 个路径候选和 5 个内嵌 XBF。五个 XBF 的元数据表边界均经过验证；没有解码完整 node stream，因此不把元数据字符串邻接关系视作完整控件树。主包的 33 条 UI 文本都是英文；其他独立语言资源包未在本轮全面检查。

来源：[资源结论](evidence/resources/resource-findings.json)、[PRI 解码](evidence/resources/resources.detailed.xml)、[XBF 元数据](evidence/resources/xbf-metadata.json)、[筛选后的程序字符串](evidence/native/selected-strings.json)。

## 3. Bing 图片请求路径

DLL 中存在以下真实 UTF-16 字符串：

```text
http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n={0}
http://www.bing.com
```

这不是只凭字符串作出的功能猜测。已逐步核对原生指令：

1. `0x1804c11e0` 的调用路径先将 `edi` 清零，在 `0x1804c1209` 使用 `lea edx,[rdi+7]`，随后于 `0x1804c120c` 调用 `0x1804c0d00`。
2. `0x1804c0d00` 将传入的 `edx` 存入状态结构，在 `0x1804c0de0` 调用 `0x1804c0e20`。
3. `0x1804c0e20` 从状态结构 `+0x18` 取该整数，准备装箱参数，`0x1804c0e73` 引用上述 URL 模板对应的冻结字符串对象，并继续调用共同请求路径 `0x1804c0080`、`0x1804bfe90`。
4. 另一图片路径 `0x1804bfc90` 引用 `http://www.bing.com`，与保存的相对 `/th?id=...` 地址组合，再进入同一请求路径。

这些指令支持高置信度结论：**默认列表请求路径传入 7，构造 `format=js&idx=0&n=7` 的请求。** 本地 JSON 恰有 7 条，是另一类相互支持的证据。不能把这里的默认请求数量扩展为所有情况下的缓存上限或服务端返回保证。

地址均为该文件的首选映像基址下静态 VA，不是 ASLR 后可直接用于运行进程的地址。

没有在本次调查中访问该接口。模板使用 HTTP；实际响应、重定向至 HTTPS、代理影响、地区选择、错误重试等均未抓包核实。本轮也没有将 About 页或隐私链接当成图片 API。

关键 REA Evidence：

| 文件 | Evidence ID |
|---|---|
| [默认数量调用者](evidence/rea/archive-count-caller-assembly.json) | `ev_5f75ca8c8a43b69dbf7cd32d4637379b1b390ab4156bef53c95dce2639a55b55` |
| [状态结构初始化](evidence/rea/archive-wrapper-assembly.json) | `ev_4dcd01d5ea353d9e136823ba3eafd0d6007dac30fbc44aea2bd41c98fec72bd3` |
| [URL 模板代码引用](evidence/rea/archive-url-assembly.json) | `ev_6478a71aad1bff76fe4f8a4d997fcc5df47efdc3a25652c2138e6c8fe622593f` |
| [图片地址组合路径](evidence/rea/image-url-http-assembly.json) | `ev_348c554d94d9d44272336ade5d39f5e043b7eebe3a8107dbd902272579aeb922` |
| [完整字符串扫描](evidence/rea/dll-strings.json) | `ev_6d78ad2e69676f5465035956406fa0c999c69638c5261bbda476841afa86a391` |

## 4. 本机缓存与当前壁纸

应用数据根：

```text
C:\Users\wangq\AppData\Local\Packages\14403Duracellko.NET.BingImageoftheDay_1wy5t1va6xay4
```

| 相对路径 | 实际读取结果 |
|---|---|
| `LocalState\ImageArchive.json` | 1,403 bytes；根只有 `images` 数组；7 项，每项为 `url` 和 `copyright` |
| `LocalState\Images` | 7 张 JPEG，均为 1920×1080，和 JSON 一一对应 |
| `LocalState\Wallpaper` | 有截图对应的 SneffelsAutumn 图片，与 Images 副本字节完全相同 |
| `LocalState\LiveTiles` | 一张名为 `.jpg` 的文件，真实内容为 PNG，310×150；文件名保留了原始图片名称 |
| `LocalState\LockScreen` | 留存旧 BigMoon 图片，mtime 为 2025-07-20；不代表当前锁屏仍在使用它 |
| `Settings\settings.dat` | REGF 文件 8,192 bytes；根可达已分配树中，仅 LocalState 有 `CurrentLiveTileImageUrl` 一项，RoamingState 空 |

截图中的图片已定位为：`OHR.SneffelsAutumn_EN-US3953128777_1920x1080.jpg`。JSON 的说明文字与截图的 Mount Sneffels / Colorado / lightphoto / Getty Images 一致。

更直接的实际状态证据是：`HKCU\Control Panel\Desktop\WallPaper` 当前保存的路径指向该应用 `LocalState\Wallpaper` 中的这张图片。Wallpaper 与 Images 中同名文件 SHA-256 都是 `9652c212d8afe26ca878ae6d27229064156e7e26e377eb2452c60c9a1c24c95a`。这确认了 Windows 保存的壁纸配置和文件身份；没有观察桌面刷新过程。

本机 Images/JSON 的修改时间是 2026-10-17 00:58 左右，名称均为 EN-US；LiveTiles 的图片为 ZH-CN，修改时间是当日 10:59:25，与设置值时间相符。这说明前景缓存和磁贴记录不完全同步，但不能单独解释地区差异或断言发生了错误。

16 个数据文件合计 3,162,219 bytes，两次逐文件 SHA-256 一致。该验证不代表跨文件原子快照。settings.dat 采用纯文件读取解析，没有挂载 hive，也没有重放事务日志。

来源：[本机状态报告](evidence/local-state/findings.md)、[原始状态与哈希](evidence/local-state/local-state.json)、[列表观测副本](evidence/local-state/ImageArchive.observed.json)。

## 5. 后台与自动更新设置

Appx 清单注册的入口是 `Duracellko.BingImage.Universal.Service.UpdateLiveTileBackgroundTask`，允许 systemEvent 和 timer 类型。

原生注册路径在 `0x1804a098c` 将第三参数置零，在 `0x1804a098f` 将第二参数置为 `0x3c`，随后调用使用 `Windows.ApplicationModel.Background.TimeTrigger` 的工厂路径。这支持构造 `TimeTrigger(60, false)`：60 分钟、重复触发。该路径还构造 SystemCondition，传入枚举值 3、7，对应 InternetAvailable、FreeNetworkAvailable。

这些参数表示代码中的调度配置；Windows 是否已完成注册、是否允许后台活动、某次是否触发成功，以及实际执行间隔，都需要运行层证据。系统调度可延迟，不能把它写成保证每小时执行一次。API 参数含义依据 Microsoft 的 [TimeTrigger 构造函数](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.background.timetrigger.-ctor) 与 [SystemConditionType](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.background.systemconditiontype)。

自动桌面/锁屏设置的代码使用与 UI 相同的两个键名。缺少落盘键时进入零初始化的可空布尔值路径；对依赖 SharedLibrary 的辅助函数进一步解析支持默认 false。此项属于静态高置信度推断，不能等同于本次已读取运行中 UI 的开关。也不能用存在 Wallpaper 文件来证明自动更新已开启：手动设置同样可以留下它。

另一个名称 `UpdateLiveTileMaintenanceTask` 出现在注册定时任务前的旧任务处理路径，形态符合清理已有任务。它不是本轮已证实的第二个维护触发器，不能仅凭名字把两者都列为当前生效任务。

来源：[后台分析逐项结论与限制](evidence/background/findings.json)、[后台任务注册](evidence/background/task-registration.json)、[TimeTrigger](evidence/background/time-trigger.json)、[SystemCondition](evidence/background/system-condition.json)、[桌面设置读取](evidence/background/desktop-settings-read.json)、[锁屏设置读取](evidence/background/lockscreen-settings-read.json)、[SharedLibrary 辅助函数](evidence/background/sharedlibrary-nullable-helper.json)。

## 6. 分析覆盖与复核

REA 的托管解析、PE 资源解析和 Rizin 原生指令输出成功，完整证据保留在工作区。当前 Ghidra 未配置、Hopper 不支持此 Windows 主机、IDA 未配置；本机已有 Rizin 0.9.1，因此以每进程的 `REA_RIZIN_COMMAND` 指向它，无需改变客户端配置。窄范围反编译探测返回 `No sleigh specification for x86:LE:64:default`，因此没有将 C/C++ 伪代码或 C# 源码恢复列为成果。

可复核入口：

首次调查时证据索引含 32 条 REA 记录，其中 27 条为 Rizin 命令取证，并比对了 1,333 条保留反汇编条目的机器码。深入调查已扩充证据，当前累计数量以 `evidence/validation.json` 为准。对 3 个被分析 PE 文件核对源 SHA-256，未发现字节不一致或原件变更。反编译器不可用作为明确限制记录，未当作成功反编译。

- [REA 证据索引](evidence/index.json)：文件路径、Evidence ID、命令、完成状态、截断/原件变更标记和文件哈希。
- [完整 MCP 证据包](evidence/rea/mcp-evidence-bundle.json)：主 DLL 托管分类、WinMD 成员和 PE 资源等原始记录。
- [解码指令文本](evidence/native/disassembly.txt)：带地址、机器码与 Evidence ID 的原生指令。
- [完整性检查结果](evidence/validation.json)：逐条反汇编机器码和安装文件原字节的比对结果，原件 SHA-256 核对及已知 provider 限制。
- [复核脚本](scripts/verify_evidence.py)、[REA 调用脚本](scripts/rea_native.ps1)、[候选引用定位脚本](scripts/index_native.py)。

| 原始问题 | 覆盖状态 |
|---|---|
| 安装目标、版本、编译技术、主逻辑位置 | 已回答 |
| 主要 UI 功能与组件结构 | 已回答；完整 XBF 控件树未恢复 |
| 图片接口与默认请求数量 | 静态调用链已建立；实际网络交互未观察 |
| 本地缓存格式、截图条目、Windows 壁纸配置 | 已回答；逐文件取证，无桌面显示/操作过程观察 |
| 后台触发配置、网络条件 | 已建立静态证据；实际任务注册和执行状态未验证 |
| 自动更新默认值 | 静态高置信度推断；运行中开关状态未观察 |
| 缓存淘汰、地区选择、网络重试 | 深入报告已恢复应用层下载/淘汰和请求路径；最终发送头与服务端市场判断仍需运行时证据 |
| 原始 C# 项目、完整源码等价、全面安全审计 | 不属于本轮已取得的成果 |

本轮已经形成可复用的本机功能与实现证据。进一步研究可以从确定的后台入口、URL 构造路径和本地状态继续，而无需重新定位软件。
