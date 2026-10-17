# 安装包、编译结构与依赖边界

对象限定为本机 Daily Picture `1.4.13.0` x64 安装包。这里记录的是交付物架构和可恢复的编译来源，不把逻辑组件名补写成原作者的解决方案、目录或项目文件。

## PKG-01：交付物布局

安装根目录为 `C:\Program Files\WindowsApps\14403Duracellko.NET.BingImageoftheDay_1.4.13.0_x64__1wy5t1va6xay4`。本轮逐个重新读取原先清单中的 24 个文件，尺寸和 SHA-256 均未变化。完整清单在 [package-layout.json](../evidence/architecture/package-layout.json)。

| 文件/组 | 实际职责或证据含义 |
|---|---|
| `Duracellko.BingImage.Universal.exe`，15,872 B | 极小 PE 启动入口；导入主 DLL 的 `RHBinder__ShimExeMain` |
| `Duracellko.BingImage.Universal.dll`，6,566,400 B | x64 .NET Native 主实现，含应用逻辑、部分框架实现、WinRT/XAML 适配、元数据及资源 |
| `Duracellko.BingImage.Universal.Service.winmd`，3,584 B | 后台组件对外 WinRT 元数据；不能当作包含原始方法 IL 的实现程序集 |
| `Duracellko.BingImage.Universal.xr.xml`，10,333 B | XAML 保留类型、属性、事件和属性路径的声明 |
| `resources.pri`，28,008 B | 资源索引、英文文本、打包路径及内嵌 XBF |
| `Assets/*`、`Images/Background.png` | 磁贴/启动图标和界面背景等静态资源 |
| `clrcompression.dll`，65,720 B | 编译记录中的压缩支持库；其存在不证明每个压缩功能实际使用 |
| `AppxManifest.xml` | 应用身份、依赖、激活入口、后台声明与能力 |
| `AppxBlockMap.xml`、`AppxSignature.p7x`、`CodeIntegrity.cat` | 安装包结构和签名相关交付文件；本轮没有进行完整签名信任链验证 |
| `microsoft.system.package.metadata/*.pri` | 本机包资源元数据；不当成原作者源码 |

EXE、主 DLL 的 PE FileVersion/ProductVersion 均为 `1.0.0.0`，不能用它们代替 Appx 版本 `1.4.13.0`。

证据：[目标身份](../evidence/identity.json)、[EXE 导入](../evidence/rea/exe-imports.json)、[主 DLL 导出](../evidence/rea/dll-exports.json)、[原始安装清单](../evidence/resources/original/AppxManifest.xml)。

## PKG-02：应用层编译输入与物理部署不同

REA 的 `inspect_pe_resources` 完整列出主 DLL 内的 `NETNATIVEBUILDINFO` 资源：文件偏移 `3439888`，长度 `11038`，SHA-256 `b06dca39cd39228af162c880766a7d53fcfcd61b369fd77b01663713ac6cc0fd`。本轮按该确切边界提取并校验，没有依赖字符串工具只显示出的 2,047 字节前缀。

| 构建记录里的输入 | 原始版本文本 | 能支持的结论 |
|---|---|---|
| `Duracellko.BingImage.Model.dll` | `1.0.0.0` | 编译输入曾具有独立的 Model 组件身份 |
| `Duracellko.BingImage.UI.dll` | `1.0.0.0` | 编译输入曾具有独立的 UI 组件身份 |
| `Newtonsoft.Json.dll` | `12.0.1.22727` | Json.NET 输入及其构建记录版本；不据此补写 NuGet 锁文件版本 |
| `System.*`、`Microsoft.*` 等 | 各条目原样保留 | 编译时列出的框架输入，不能据此断言全部功能可达或实际加载 |

完整记录共有 146 条输入，见 [原始构建资源文本](../evidence/architecture/NETNATIVEBUILDINFO.txt) 与 [结构化清单](../evidence/architecture/package-layout.json)。这些 `Model.dll`、`UI.dll`、`Newtonsoft.Json.dll` 没有作为单独文件出现在这份安装清单中；类型/方法与相关实现已经进入原生交付物。命名可以帮助组织逻辑分层，但原始 `.sln`、`.csproj`、项目引用和源码目录尚未获得。

REA Evidence：`ev_7190476dc5c405c3e39167420a1ddfb2c0c4f45fead5855596cc2814a8a188ed`，位于 [MCP 证据包](../evidence/rea/mcp-evidence-bundle.json)。完整字符串证据另有 Newtonsoft 程序集身份 `Version=12.0.0.0`；程序集身份版本与上表构建输入版本是不同字段，不相互覆盖。

## PKG-03：编译环境保留原始差异

| 证据位置 | 值 |
|---|---|
| Appx `TargetFrameworkMoniker` | `.NETCore,Version=v5.0`，属于该 UWP 构建标记，不能解释为现代 .NET 5 应用 |
| Appx Visual Studio | Enterprise 2017，15.0 |
| Appx `ilc.exe` | `1.7.25927.00` |
| `NETNATIVEBUILDINFO` 的 `ilc.exe` / `nutc_driver.exe` / `sg.exe` | `1.7.25909.00` |
| 同一构建资源的 `rhbind.exe` | `1.7.25909.0` |
| Appx XAML Build Tasks | `15.0.28307.102` |
| Appx MakePRI | `10.0.17134.12` |

上述版本来自不同来源，差异保留在档案中。没有构建日志解释其阶段或来源，因此不构造“先后升级/重编译”的故事。该目标属于 .NET Native 1.7，不是现代 .NET NativeAOT；主 DLL 的 PE CLI data directory 缺失，常规 CIL 反编译不能还原原始项目。

## PKG-04：系统依赖与激活契约

清单声明 Windows.Universal，最低 `10.0.10586.0`，测试版本上界字段为 `10.0.17134.0`。这些是包声明，不是本轮实测兼容矩阵。

| 清单依赖 | 最低版本 |
|---|---|
| Microsoft.NET.Native.Framework.1.7 | `1.7.25531.0` |
| Microsoft.NET.Native.Runtime.1.7 | `1.7.25531.0` |
| Microsoft.VCLibs.140.00 | `14.0.22929.0` |

前台入口为 `Duracellko.BingImage.Universal.App`，后台入口为 `Duracellko.BingImage.Universal.Service.UpdateLiveTileBackgroundTask`。后台组件由主 DLL 作为 in-process activatable class 提供，声明 ThreadingModel `both`，允许 `timer` 与 `systemEvent` 类型。能力列表仅声明 `internetClient`；不能把能力清单本身当成所有访问行为或所有 WinRT API 的运行验证。

主 DLL 普通 PE 导入有 61 个符号，来自 8 个模块：`SharedLibrary.dll`、`mrt100_app.dll`、WinRT 激活/缓冲 API、COM、OleAut32、localization 和 ntdll。这一层主要反映运行时/互操作机制。应用还通过 .NET Native 自定义表绑定 4,737 个 SharedLibrary 导入，因此只看普通 PE import 表会漏掉大量框架方法。

## PKG-05：框架符号恢复

实际映射采用本机 `Microsoft.NET.Native.Framework.1.7_1.7.27413.0_x64__8wekyb3d8bbwe/SharedLibrary.dll`。通过主 DLL 自定义描述符 → 普通 `$NEAT$` 导入 → 框架 RVA 表 → 匹配微软 PDB，已为 4,480 个导入槽关联名称，257 个仍无名称。匹配检验包括 GUID、DBI/PE age 1、全部 22 个节布局；PDB info stream 的 age 3 单独保留。

编译器会合并相同机器码，让同一地址拥有多个方法别名，所以必须结合参数和调用上下文。不能将一个地址任意显示的别名当作确定的应用源码方法。主应用精确 PDB 查询返回 404；尚无完整的应用方法名和地址映射。

详细方法和原始符号见 [符号恢复说明](../evidence/deep-symbols/symbols-findings.md)、[导入映射](../evidence/deep-symbols/named-custom-imports.json)。
