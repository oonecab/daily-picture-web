"""Publish the bounded background architecture reconstruction from retained evidence."""
import hashlib, json, re
from pathlib import Path
from deep_symbols_resolve import APP, PE

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/architecture-background'
DOC=ROOT/'docs/background-and-personalization.md'

def evidence(key):
    path=ROOT/'evidence'/(key+'.json')
    obj=json.loads(path.read_text(encoding='utf-8-sig'))
    return f"REA [{path.stem}](../evidence/{key}.json)，完整证据 ID：`{obj['evidence_id']}`"

text=r'''# Daily Picture 后台任务、磁贴与系统个性化架构

本文覆盖本机 Daily Picture `1.4.13.0 x64` 的后台注册、任务生命周期、三个自动更新分支、磁贴图像管线以及桌面/锁屏系统调用。与之相邻的前台生命周期见 [ui-and-lifecycle.md](ui-and-lifecycle.md)，归档网络请求见 [network-and-download.md](network-and-download.md)，文件和设置库见 [data-model-and-storage.md](data-model-and-storage.md)。

目标为安装包中的 `Duracellko.BingImage.Universal.dll`，SHA-256：`d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a`。以下地址为 PE 首选映像地址，ImageBase=`0x180000000`，不是当前进程地址。取证只读；未启动目标、主动触发后台任务、设置壁纸/锁屏、更新磁贴或修改应用设置。伪代码是行为重建，非原始源码。

**标记规则：**“已确认”指安装二进制中的指令、参数、字节或本机 WinMD 中的接口事实；“静态派生”指这些事实支持的角色及调用关系，尚未执行验证；“未知”保留未恢复的信息。主 DLL 的原始 PDB 不可用；下文中文函数角色不冒充原始 C# 方法名。精确 REA 证据 ID 随关键条目列出，机器可读版本见 [findings.json](../evidence/architecture-background/findings.json)，函数表见 [functions.json](../evidence/architecture-background/functions.json)。

## BGA-01：后台入口与整体执行图

**已确认：**[安装包清单](../evidence/resources/original/AppxManifest.xml) 将 `Duracellko.BingImage.Universal.Service.UpdateLiveTileBackgroundTask` 声明为后台入口，声明任务类型 `systemEvent`、`timer`，包包含 `internetClient` 能力。清单只能证明可用扩展声明，不能证明当前系统已成功登记或正在运行任务。

**静态派生：**入口的主要状态机为 `0x1804c29b0`，包装器 `0x1804c2900` 使用 `AsyncVoidMethodBuilder`，与 `IBackgroundTask.Run` 的 void 契约一致。ABI 桥 `0x18055e200` 从 COM this 指针取得托管目标，经接口解析调用后台入口。整体关系如下：

```mermaid
flowchart TD
    UI[MainPage Loaded] --> Register[请求后台权限、清理旧名、登记定时任务]
    OS[Windows 后台激活] --> Run[Run：GetDeferral]
    Run --> Construct[创建共享网络提供器与设置仓库]
    Construct --> Tile[顺序 await 磁贴更新包装器]
    Tile --> Lock[顺序 await 锁屏更新包装器]
    Lock --> Desktop[顺序 await 桌面更新包装器]
    Desktop --> Complete[最终 Complete deferral]
    Tile --> A1[请求 archive n=1]
    Lock --> LOn{锁屏自动开关}
    LOn -->|开启| A2[独立请求 archive n=1]
    Desktop --> DOn{桌面自动开关}
    DOn -->|开启| A3[独立请求 archive n=1]
    A1 --> Dedup[各自取第一张，与对应 Current URL 比较]
    A2 --> Dedup
    A3 --> Dedup
    Dedup -->|新 URL| Download[各自下载、派生图像、调用系统]
    Dedup -->|相同或无有效 URL| Skip[本分支结束]
```

此图的 Tile→Lock→Desktop 身份由构造参数、EEType 相对方法表、各个状态机的字符串与调用行为交叉确认，属于高置信静态派生，不是完整解码 .NET Native 虚调用元数据后的运行时证明。具体映射见 BGA-05。

{{EV:architecture-background/background-entry-and-dispatch}}

{{EV:architecture-background/deferral-bridge}}

## BGA-02：前台何时登记后台任务

**已确认：**UI 专题恢复了 `0x180532060` 在页面 DataContext 为空时安装 Loaded handler；`0x180531fb0` 在 Loaded 回调内创建注册器并调用包装器 `0x1804a0800`。这条链连接了主页面初始化和后台注册；事件接口为 `IFrameworkElement.add_Loaded/remove_Loaded`，不能因旧证据文件名而误称 DataContextChanged。

**已确认：**注册状态机 `0x1804a08a0` 获取 `BackgroundExecutionManager` 并调用 `RequestAccessAsync`，await 完成后进入旧任务清理和注册准备。`0x1804a095b` 的 GetResult 后到注册准备之间，未见针对返回权限枚举的显式条件分支。不能据此推断 Windows 必然批准注册。注册状态机异常 funclet `0x1804a0a76` 调用 `AsyncVoidMethodBuilder.SetException`，并非空 catch。

{{EV:architecture-ui/mainpage-context-changed}}

{{EV:background/task-registration}}

{{EV:architecture-background/registration-exception}}

## BGA-03：任务名、去重登记与旧名称清理

**已确认：**注册路径传入任务名 `UpdateLiveTileTask` 与清单同名完整后台入口。`0x1804a0ab0` 先调用名称查找 `0x1804a0be0`；查到现有对象便跳过新 builder 路径。新 builder 路径分配 `Windows.ApplicationModel.Background.BackgroundTaskBuilder`，设名称、入口、触发器和条件后注册。

**静态派生：**静态初始化 `0x18034e0d0` 创建只含 `UpdateLiveTileMaintenanceTask` 的数组；注册前将该数组交给 `0x1804a0f80`，后者逐名查找并在存在时传入 Boolean true 调用接口。结合对象类型与 API 形状，这是旧任务的 `Unregister(true)` 清理。它不支持“同时运行第二个维护任务”的结论；本次没有建立 `MaintenanceTrigger` 构造调用。已有登记对象的触发条件是否陈旧、系统是否真正删除旧任务均未动态验证。

{{EV:background/background-builder}}

{{EV:background/background-task-find}}

{{EV:background/old-task-unregister}}

## BGA-04：60 分钟重复触发与网络条件

**已确认：**`0x1804a098c–0x1804a0996` 向 TimeTrigger 构造包装器传 `60,false`。`0x1804a0d90` 定位 TimeTrigger 类，`0x1804a0dd0` 工厂包装传递两个参数。按 Microsoft API 契约，这是 freshnessTime=60 分钟、oneShot=false 的重复触发请求，不是“每小时一定执行”的观察。[TimeTrigger 构造契约](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.background.timetrigger.-ctor?view=winrt-26100)。

**已确认：**两个 SystemCondition 构造参数分别为 `3` 和 `7`，均加入 builder 条件集合，对应 `InternetAvailable`、`FreeNetworkAvailable`（免费/非计费网络）。二者是登记条件，实际网络分类和系统调度历史未知。[SystemConditionType 枚举](https://learn.microsoft.com/en-us/uwp/api/windows.applicationmodel.background.systemconditiontype?view=winrt-26100)。

{{EV:background/time-trigger}}

{{EV:background/time-trigger-factory}}

{{EV:background/system-condition}}

## BGA-05：构造注入、共享对象与提供器身份

**已确认：**Run 状态机分配下列 EEType，并经两个已解码构造器写入依赖字段。`0x180432c20` 将第二、第三参数写入 this+8、this+0x10；`0x180382c10` 再将第四参数写入 this+0x18。网络提供器与设置对象各创建一次，由三个更新提供器共同引用。

| EEType 地址 | 静态派生角色 | 相关相对方法表中的目标 |
|---|---|---|
| `0x18001c1b0` | 设置仓库 | 三组 Current URL 和两组自动开关的读写方法 |
| `0x18001c460` | 网络图像提供器 | `4bfb70` 下载、`4c0d00` 带数量的归档、`4c10c0` 默认归档 |
| `0x18001c350` | 磁贴更新提供器 | `0x1804bd770` → 状态机 `0x1804bd810` |
| `0x18001c2a0` | 锁屏更新提供器 | `0x1804c1bf0` → 状态机 `0x1804c1cb0`；另有手动入口及设置代理 |
| `0x18001c3c0` | 桌面更新提供器 | `0x1804be170` → 状态机 `0x1804be230`；另有手动入口及设置代理 |
| `0x18001bfd0` | 锁屏系统提供器 | `0x1804b5550`、`0x1804b68c0` |
| `0x18001bf60` | 桌面系统提供器 | `0x1804b73c0`、`0x1804b7990`、`0x18051d810` |

表中的数据来自类型地址+0x40 处 signed-relative 指针指向的独立方法数组，每项再以项地址加 signed-relative 值得到代码地址，目标均经 `.pdata` 核验。**不能把紧邻 EEType 后面的任意代码指针归给当前类型**；辅助文件还保留这种早期候选，但本表只使用 `relative_table` / `table_entries`。仍未完整恢复 NativeFormat 类型名和接口槽分派图，因此角色名保留为静态派生。

原始布局、dispatch cell、常量见 [layout-evidence.json](../evidence/architecture-background/layout-evidence.json)；它是本地 PE 辅助解析产物，没有伪造 REA ID。构造参数的实际存储由下列 REA 记录支持。

{{EV:architecture-background/dependency-constructor-two}}

{{EV:architecture-background/dependency-constructor-three}}

## BGA-06：GetDeferral、顺序 await 和 Complete

**已确认：**`0x1804c29ea` 通过 IBackgroundTaskInstance dispatch cell 取得对象，保存至状态机+0x30。投影方法 `0x1805a3a70` 的泛型上下文对应同接口，调用 WinRT ABI slot 14，即 `GetDeferral`。Run 在三个 await 之间保存自身状态；调用点依次为 `0x1804c2b66`、`0x1804c2bc5`、`0x1804c2c2b`，分别进入 `0x1804c26d0`、`0x1804c24a0`、`0x1804c2270` 包装器。这是串行等待，未见 Task.WhenAll。

正常结束在 `0x1804c2ca4` 调用 Complete 包装器 `0x1804c2d40`；finally funclet `0x1804c2ce8` 对状态值做判断，结束/异常路径经 `0x1804c2cfd` 调用同一 Complete，而普通 await 暂停不完成 deferral。包装器使用 IBackgroundTaskDeferral ABI slot 6=`Complete`。随后正常路径完成 AsyncVoid builder，外层异常路径调用 SetException。此处能证明静态的资源生命周期设计，不能证明系统取消、进程终止等情况下实际回调完成。

{{EV:architecture-background/get-deferral-projection}}

{{EV:architecture-background/background-entry-and-dispatch}}

## BGA-07：异常隔离的准确边界

**已确认：**三个更新包装状态机 `0x1804c2770`、`0x1804c2540`、`0x1804c2310` 各有空的异常 funclet：`0x1804c281d`、`0x1804c25ed`、`0x1804c23bd` 返回正常 SetResult continuation。同时，它们也各有外层 SetException funclet。Run 自身亦有 `0x1804c2cd8` 返回正常结束 continuation 的 catch 分支及外层异常完成路径。

**静态派生：**匹配这些 catch 的异常可被包装器吞掉，从而允许后续提供器继续执行。**未知：**托管 catch 的类型过滤元数据尚未恢复，所以不能写成 catch-all、所有网络错误都被忽略或三个分支一定都会执行。已查看范围没有建立自动重试、退避或 Cancel 事件订阅；这属于范围内未见，非全程序不存在的证明。

{{EV:architecture-background/background-entry-and-dispatch}}

## BGA-08：后台每个分支独立请求 n=1

**已确认：**锁屏和桌面在取归档前都有两道 Boolean 门控。桌面在 `0x1804be2c7` 取得系统提供器字段+0x18，调用 cell `0x1803056d0` 后若返回 false 则退出；随后 `0x1804be2e0` 取得设置仓库字段+0x10，检查自动开关。锁屏对应 `0x1804c1d47` / cell `0x180305a10`，以及 `0x1804c1d60` 的设置检查。**静态派生：**第一道是系统提供器的支持性/可用性条件；完整虚调映射未解，不能无条件写成“两个分支都显式调用同一个 WinRT IsSupported”。BGA-01 图只画自动开关以保持简洁。

**已确认：**磁贴状态机 `0x1804bd810` 在 `0x1804bd952`、锁屏状态机 `0x1804c1cb0` 在 `0x1804c1d80`、桌面状态机 `0x1804be230` 在 `0x1804be300` 均把归档数量参数设为 `1`。三个调用经过各自 dispatch cell，网络对象的方法表包含带数量入口 `0x1804c0d00`。其 URL 格式和 HTTP 行为详见网络专题。

**静态派生：**Run 共享网络提供器对象，未共享一次取得的归档响应；三个启用的分支分别请求归档。前台默认无参入口取 7 张，不能套用到后台。默认两个自动开关键缺省为 false 时，锁屏/桌面在开关检查后直接退出，只有磁贴分支继续请求。若都开启且执行走到相应调用，最多有三次这里描述的单图归档调用；这是代码路径计数，不是实际抓包次数。

**已确认：**每个分支先取得 archive，再比较 Current URL。相同 URL 可以省去后续图像下载和系统更新，但不能省掉已经发生的本分支归档调用。

{{EV:architecture-background/provider-and-settings}}

{{EV:architecture-background/background-entry-and-dispatch}}

## BGA-09：第一张选择与 Current URL 去重

**已确认：**磁贴 `0x1804bd1b0`、桌面 `0x1804be100`、锁屏 `0x1804c1b80` 三个选择器取 archive 中图像集合的第一项，取得 URL，再对空 URL 和对应 Current URL 比较。字符串比较常量 `5` 配合已恢复的 `String.Equals` 重载，语义为 `OrdinalIgnoreCase`；相同则返回 null，使调用者跳过下载。这里没有按日期排序、查找“今天”或取列表最后一项的逻辑。

共享辅助函数 `0x1803eec30` 的语义为 FirstOrDefault：source 为 null 抛 `ArgumentNull("source")`；列表 Count>0 取 index0，否则 null；非列表仅 MoveNext 一次并返回 Current，随后 Dispose 枚举器。原始泛型方法名未恢复，这一名称表示已确认的行为。

```text
archive = await provider.GetArchive(1)
item = FirstOrDefault(archive.images)
newUrl = item?.Url
if IsNullOrEmpty(newUrl) or Equals(newUrl, currentUrl, OrdinalIgnoreCase):
    return  # 本分支不再下载图像
image = await provider.DownloadImage(newUrl)
await apply(image)
settings.CurrentUrl = newUrl  # 必须走到 apply 的成功 continuation
```

伪代码省略文件准备、异常包装和各提供器差异，不是逐句反编译结果。领域转换 `0x1804b9190` 的细节由存储专题记录。

{{EV:architecture-background/archive-first-selector}}

{{EV:architecture-background/tile-convert-and-select}}

{{EV:architecture-background/provider-and-settings}}

## BGA-10：磁贴更新的实际流水线

**已确认：**`0x1804bd810` 先确保 `LiveTiles` 目录，再请求单图 archive，转换并选择新 URL。如果需要更新，调用文件名助手 `0x1804a0060`，从网络提供器取得图像字节，经 `0x1804bc650` 包装的解码状态机和 `0x1804bbb00` 包装的保存状态机生成文件，再调用 `0x1804bb510` 发布通知。随后写 `CurrentLiveTileImageUrl`，最后进入旧磁贴文件清理。

**静态派生：**这条路径以后台提供器下载得到的字节为输入，不要求先更新前台 `Images`/`ImageArchive.json` 主缓存。三个派生目录与主缓存的关系应依各自调用链判断。写入 Current URL 与清理顺序也有意义：若通知 API 或其前面的图像工作抛错，URL 写入不可达；如果 URL 已写入之后清理失败，该值可能保留。

**已确认：**磁贴状态机自身的异常终点为 AsyncTaskMethodBuilder.SetException，是否被更外层隔离取决于 BGA-07 中尚未知类型的 catch。

{{EV:architecture-background/provider-and-settings}}

{{EV:architecture-background/tile-save-and-notification}}

## BGA-11：解码、像素与 PNG 编码

**已确认：**解码状态机 `0x1804bc790` 将输入字节组织为流，调用 BitmapDecoder/IBitmapFrame 路径取得像素数据，读取像素格式、alpha 模式、DPI、宽高，并 DetachPixelData 到字节数组。保存状态机 `0x1804bbbb0` 打开 `LiveTiles` 中的目标文件，建立 BitmapEncoder；`0x1804bbed7` 对应 `IBitmapEncoderStatics.PngEncoderId`，后续 CreateAsync 用该 GUID。它设 BitmapTransform，传入完整像素参数，最后 await FlushAsync。

**已确认：**`0x1804bc200` SetPixelData 包装器把解码结果中的格式、alpha、尺寸、DPI 和像素字节转发到编码器。目标文件名来自 URL 的文件名助手，编码器格式独立由 PNG GUID 决定，因此名字沿用 `.jpg` 并不意味着文件内容仍是 JPEG。存储专题已有本地 `LiveTiles` 文件 PNG 头和 310×150 尺寸的旁证。

**已确认：**打开的输出流有正常与 finally 释放路径。后续补证已确定解码调用为无参 GetPixelDataAsync，其 EXIF/色彩默认属于系统 API 契约，详见 BGA-21；实际特殊图片、损坏数据和不同编解码器的结果仍未运行验证。

{{EV:architecture-background/tile-convert-and-select}}

{{EV:architecture-background/tile-save-and-notification}}

{{EV:architecture-background/tile-encoder-set-pixels}}

## BGA-12：310×150 中心裁切与 Fant 插值

**已确认：**`0x1804bb330` 根据原始宽 w、高 h 执行整数计算：先让宽为 310，按比例计算高度；若高度不足 150，则改为高 150 并按比例计算宽。其后居中计算裁切矩形，最终 bounds 固定 310×150。

```text
scaledW = 310
scaledH = floor(h * 310 / w)
if scaledH < 150:
    scaledH = 150
    scaledW = floor(w * 150 / h)
x = max(0, floor((scaledW - 310) / 2))
y = max(0, floor((scaledH - 150) / 2))
bounds = (x, y, 310, 150)
```

`0x1804bb430` 调用 transform 的 ScaledWidth、ScaledHeight、Bounds setters；`0x1804bb414` 传插值枚举 `3`，按 Windows.Graphics.Imaging 定义为 **Fant**。这是一种保持比例后裁切填满目标的管线，不是把原始画面任意拉伸成 310×150。计算是整数运算，不能写成无限精度浮点缩放。

{{EV:architecture-background/image-resize}}

API 对照的 IID、槽序及源码存档见 [abi-evidence.json](../evidence/architecture-background/abi-evidence.json) 与 [本机 WinMD](../evidence/architecture-background/system-winmd.json)。

## BGA-13：磁贴 XML、资源 URI 和两天过期时间

**已确认：**`0x1804bb510` 把文件名拼到 `ms-appdata:///local/LiveTiles/`，调用 TileUpdateManager.GetTemplateContent，模板枚举 `10` 对应 `TileWideImage`。代码获取 `image` 节点，设置 `src` 为上述 URI、`alt` 为本地化资源 `LiveTileText`。之后创建 TileNotification，通过当前应用的 TileUpdater 调用 Update。

**已确认：**通知过期时间起点是本函数中调用 `DateTimeOffset.UtcNow` 得到的时刻，然后 `AddDays(2.0)`。`0x180144818` 的 double 原字节为 `0000000000000040`，即 2.0；随后 `0x1804bb6d0` 调用 ITileNotification.SetExpirationTime。它不是图片拍摄日期加两天，也不是调度器计划触发时刻加两天。

**未知：**本次没有观察当前 Windows Shell 是否显示这类旧式磁贴、系统实际保留通知多久或调用最终结果。该函数范围没有建立启用通知队列或远程周期 feed 的行为。

{{EV:architecture-background/tile-save-and-notification}}

常量字节见 [layout-evidence.json](../evidence/architecture-background/layout-evidence.json)。

## BGA-14：桌面/锁屏现代系统 API 与返回 Boolean

**已确认：**桌面应用状态机 `0x1804b6d40` 取得 `UserProfilePersonalizationSettings.Current`，调用 `TrySetWallpaperImageAsync` 并 await Boolean。锁屏对应 `0x1804b4190`，调用 `TrySetLockScreenImageAsync`。接口 IID 与本机 WinMD 的方法序一致：前者 ABI slot7，后者 slot6。

| 结果 | 本状态机后续行为 | 对上层 Current URL 的影响 |
|---|---|---|
| `true` | 读取已用文件的 Name；调用清理助手，保留该文件并删除目录中的其他候选文件；完成 await 链 | 只有随后上层 apply continuation 正常到达，才写新 URL；清理若仍抛错也可能阻止上层写入 |
| `false` | 调用 DeleteAsync 删除这次尝试使用的文件；等待完成后抛 InvalidOperationException | 不会作为成功返回给上层，后续 Current URL 赋值不可达 |
| API/文件/清理异常 | 异步状态机调用 SetException；交由外层 await/catch | 取决于抛错点；不能把 await 已结束等同于成功设图 |

false 分支的异常消息分别为 `Setting of desktop background failed.` 与 `Setting of lock screen failed.`。若 false 分支的删除本身失败，则传播的是删除路径异常，未必到达自定义异常构造。底层已设成功但后续旧文件清理失败，也可能出现“系统图像已变、Current URL 未更新”的状态；这是控制流推出的可能性，没有做故障注入验证。

桌面系统提供器的方法表把 `0x1804b73c0`/`0x1804b7990` 关联为字节输入与文件输入入口，前者状态机 `0x1804b7480` 准备 Wallpaper 目录及文件后进入这里。其他文件准备和清理规则见存储专题。[Microsoft 个性化 API](https://learn.microsoft.com/en-us/uwp/api/windows.system.userprofile.userprofilepersonalizationsettings?view=winrt-26100) 仅用于说明外部契约，应用控制流以上述机器码为依据。

{{EV:architecture-background/desktop-personalization-apply}}

{{EV:architecture-background/lockscreen-personalization-apply}}

## BGA-15：能力检查、旧锁屏 API 与未支持实现

**已确认：**`0x18051d810` 使用 UserProfilePersonalizationSettings 的静态 IsSupported 调用，状态/命令层还有代理方法。二进制也包含传统 `Windows.System.UserProfile.LockScreen` 路径：`0x1804c1510` 使用 ILockScreenStatics ABI slot9=`SetImageStreamAsync`；`0x1804c1780` 使用 slot8=`SetImageFileAsync`。相应异步状态机为 `0x1804c1380` 与 `0x1804c15f0`。

**静态派生：**可确定存在不同平台/能力适配实现，不应把所有入口都描述成同一个现代 API。Run 中分配的 EEType 与方法数组已列于 BGA-05；完整平台选择策略和每种设备上实际使用哪个适配器尚未恢复。应用还包含 `SetDesktopBackgroundImage is not supported.` 的抛错实现，不能因为接口存在就断言任何 Windows/设备上都能自动换壁纸。

{{EV:architecture-background/settings-and-capabilities}}

{{EV:architecture-background/personalization-providers}}

{{EV:architecture-background/provider-and-settings}}

## BGA-16：自动开关的确切缺省行为

**已确认：**两个 Boolean 键存于 ApplicationData.LocalSettings，写入前装箱。桌面写/读为 `0x18051d430`/`0x18051d510`，键 `UseBingImageAsDesktopBackground`；锁屏写/读为 `0x18051d650`/`0x18051d730`，键 `UseBingImageAsLockScreen`。两个读取函数在查不到对象时保留全零 Nullable<Boolean>，再调用已匹配 SharedLibrary PDB 的 `Nullable<Boolean>.GetValueOrDefault`，故键缺省时都返回 **false**。

这是缺省逻辑，不是对用户当前开关状态的替代读取。先前本地状态快照只有 CurrentLiveTileImageUrl，而没有两个 Boolean 键，该快照与 false 缺省逻辑相容；后台实际运行时设置可能变化。后续精确符号恢复加强了最初仅依据 NEAT 辅助函数指令的结论，详见 [SharedLibrary 符号取证](../evidence/deep-symbols/symbols-findings.md)。

{{EV:background/desktop-settings-read}}

{{EV:background/lockscreen-settings-read}}

## BGA-17：三个 Current URL 独立持久化

**已确认：**以下方法访问 LocalSettings 中各自的字符串键。不存在“换壁纸成功便顺便更新三个 URL”的依据。

| 键 | 写函数 | 读函数 | 消费者 |
|---|---|---|---|
| CurrentLiveTileImageUrl | `0x1804be7f0` | `0x1804be880` | 磁贴选择器 |
| CurrentDesktopBackgroundImageUrl | `0x1804be910` | `0x1804be9a0` | 桌面选择器 |
| CurrentLockScreenImageUrl | `0x1804bea30` | `0x1804beac0` | 锁屏选择器 |

**已确认：**新 URL 的持久化出现在对应应用操作 await 的成功 continuation。对桌面/锁屏，必须同时考虑 TrySet 的 Boolean 与清理步骤，详见 BGA-14；对磁贴，是发布通知调用后写 URL、再清理旧文件，详见 BGA-10。这些 URL 是去重状态，不能替代对系统当前壁纸、图像存在性或缓存完整性的验证。

{{EV:architecture-background/url-settings-and-invalidation}}

{{EV:architecture-background/provider-and-settings}}

{{EV:architecture-background/background-entry-and-dispatch}}

## BGA-18：旧 Roaming 锁屏设置迁移

**已确认：**`0x1804beb50` 同时取得 LocalSettings 与 RoamingSettings：前者在 ApplicationData ABI slot10，后者 slot11。对于给定键，如果 Roaming 值非 null，先将其写入 Local 的 Values，再将 Roaming 的同键赋 null。`0x1804bec80` 对 `UseBingImageAsLockScreen` 和 `CurrentLockScreenImageUrl` 调用这一助手。

这是一条从旧漫游设置向本地设置迁移的路径。其赋值没有先判断 Local 是否已有值，因此非空旧值可覆盖 Local；对旧键的动作是“赋 null”，不能提升成已证实调用 Remove。证据文件名 `url-settings-and-invalidation` 是工作中早期命名，**最终语义为 URL 读写及设置迁移，不是把当前 URL 全部失效**。UI 启动侧的内联迁移见 UI/数据专题。

{{EV:architecture-background/url-settings-and-invalidation}}

## BGA-19：WinRT ABI 与框架符号依据

**已确认：**本次将本机 `C:\Windows\System32\WinMetadata` 中的 Windows.ApplicationModel、Windows.UI、Windows.System、Windows.Graphics WinMD 以 PEReader/MetadataReader 只读解析，保留文件 hash、GuidAttribute 原字节与 MethodDef 顺序，没有加载或执行目标程序集。共对照 23 个使用中的接口，IID 全部与 Microsoft windows-rs 生成接口定义相同。原始方法名字可能因重载投影重命名而不同，所以 `abi-crosscheck.json` 的“all_method_orders_match”是 false，不能引用成所有名字完全一致；本篇使用的具体 slot 均逐项核对。

| 用途 | WinRT 接口/ABI slot |
|---|---|
| 后台访问请求 | IBackgroundExecutionManagerStatics.RequestAccessAsync / 6 |
| 延长后台生命周期 | IBackgroundTaskInstance.GetDeferral / 14；IBackgroundTaskDeferral.Complete / 6 |
| 获取现代个性化对象、支持性 | IUserProfilePersonalizationSettingsStatics.Current / 6；IsSupported / 7 |
| 锁屏/桌面设置 | IUserProfilePersonalizationSettings.TrySetLockScreenImageAsync / 6；TrySetWallpaperImageAsync / 7 |
| PNG 编码 | IBitmapEncoderStatics.PngEncoderId / 8；CreateAsync / 13 |
| 像素处理 | IBitmapEncoder.BitmapTransform / 15；SetPixelData / 16；FlushAsync / 19 |
| 裁切变换 | IBitmapTransform.SetScaledWidth / 7；SetScaledHeight / 9；SetInterpolationMode / 11；SetBounds / 17 |
| 磁贴 XML/发布 | ITileUpdateManagerStatics.GetTemplateContent / 9；CreateTileUpdaterForApplication / 6；ITileUpdater.Update / 6 |
| 过期时间 | ITileNotification.SetExpirationTime / 7 |

这里的 slot 包括 IUnknown/IInspectable 前缀，是 **WinRT ABI slot**；不能与 .NET Native 托管 dispatch cell 中的接口方法编号混用。泛型上下文→接口的关联通过目标中字节 IID、EEType 指针与包装器参数共同建立。

审计材料：[system-winmd.json](../evidence/architecture-background/system-winmd.json)、[abi-evidence.json](../evidence/architecture-background/abi-evidence.json)、[abi-crosscheck.json](../evidence/architecture-background/abi-crosscheck.json)。共享框架调用名来自精确 GUID/age 与节映射验证后的 Microsoft PDB，解析说明见 [symbols-findings.md](../evidence/deep-symbols/symbols-findings.md)。代码折叠可使一个地址有多个名称别名，文档没有把任一折叠别名当成目标应用的源码名。

## BGA-20：复查范围与未解决问题

本篇补充的 REA 数据由 [bg_arch_inspect.py](../scripts/bg_arch_inspect.py) 按明确的地址和长度执行 `pDj`；没有进行整包全量分析。每份原始 JSON 保留命令、完整输出、证据 ID、目标前后 hash、完成状态。辅助汇总由 [bg_arch_publish.py](../scripts/bg_arch_publish.py) 生成，证据清单见 [evidence-manifest.json](../evidence/architecture-background/evidence-manifest.json)。局部数据/接口映射由 [bg_arch_layout.py](../scripts/bg_arch_layout.py)、[bg_arch_abi.py](../scripts/bg_arch_abi.py)、[bg_arch_winmd.ps1](../scripts/bg_arch_winmd.ps1) 保存。

有两个必须保留的反汇编范围限制：`provider-and-settings.json` 从 `0x1804bd740` 开始，前缀位于此前 funclet 中间，本篇只使用 `0x1804bd770` 及之后已知 `.pdata` 函数；部分连续范围在末尾截断下一函数，本篇不依据该尾部推论。工具输出 complete 只表示命令执行完整，不代表范围自动覆盖所有逻辑函数或所有异常类型。

尚未解决的具体问题：

1. 主应用全部 NativeFormat 类型/字段名与虚调用槽映射；当前身份以构造、相对表和实际行为交叉恢复。
2. 托管 catch 类型过滤；空 catch funclet 的存在已确认，catch-all 不成立。
3. 运行时是否登记成功、后台调度次数、取消/终止历史、当前实际自动开关与系统策略影响。
4. 所有平台适配器的选择条件，以及当前 Windows Shell 的磁贴显示行为。
5. 带 EXIF 旋转/色彩配置图片的实测结果，以及网络/文件/系统 API 故障后的实机状态；无参解码重载及其默认契约已在 BGA-21 补证，本轮没有执行目标或注入故障。

这些缺口不会改变已由指令确认的 n=1、三个独立 Current URL、顺序 await、缺省 false、310×150 PNG、两天通知期限和 TrySet(false) 抛错路径；它们限制的是完整源码恢复与运行时效果的声称。

## BGA-21：无参像素解码、EXIF/色彩默认及尺寸边界

**已确认：**状态机 `0x1804bc790` 在 `0x1804bc918` 将槽号设为 `16`，上下文 `0x18010f8f0` 首指针为 `0x18000d2a8`，后者已用 IID 对应到 IBitmapFrame。桥 `0x180402590` 把槽号传到 `0x180402630`，后者按 `vtable[slot]` 调用，只传 this 和输出指针。本机 WinMD 第 10 个方法（加 IInspectable 前缀后为槽 16）的签名是零输入参数，槽 17 才是五参数转换重载。因此这里实际调用 **GetPixelDataAsync()**。

**外部 API 契约：**微软文档说明此无参重载使用帧的像素格式和 alpha 模式，尊重 EXIF 方向，并在存在嵌入配置时将颜色管理至 sRGB；它没有由应用显式指定的变换参数。[Microsoft GetPixelDataAsync 文档](https://learn.microsoft.com/en-us/uwp/api/windows.graphics.imaging.bitmapdecoder.getpixeldataasync)。这是已识别调用对应的系统契约，不能扩展成已观察所有图片的解码效果。

**已确认：**应用随后在 `0x1804bc9fb` / `0x1804bca13` 读取槽 12/13，即原始 PixelWidth/PixelHeight，而不是已考虑方向的 OrientedPixelWidth/OrientedPixelHeight（槽 14/15），并把尺寸与像素数组共同转交 `0x180476f70`。**静态派生：**若 EXIF 旋转交换宽高，已定向像素排列与传入尺寸可能不一致；这是一项有条件的契约不匹配，未复现具体图片的错误输出。普通无旋转图片不能据此判错。

机器可读补证：[decoder-contract.json](../evidence/lifecycle-supplement/decoder-contract.json)，包括原始指令字节断言、本机 WinMD 签名和 API 来源。该结论只针对磁贴 BitmapDecoder 管线，不自动适用于前台 BitmapImage.SetSourceAsync。

{{EV:architecture-background/tile-convert-and-select}}

{{EV:lifecycle-supplement/pixel-data-abi-bridge}}

{{EV:lifecycle-supplement/no-input-interface-slot}}
'''

refs=[]
def expand(m):
    key=m.group(1);refs.append(key);return evidence(key)
DOC.parent.mkdir(parents=True,exist_ok=True)
DOC.write_text(re.sub(r'\{\{EV:([^}]+)\}\}',expand,text),encoding='utf-8')

rows=[
('0x1804a08a0','后台权限请求、旧任务清理与登记状态机','background/task-registration','confirmed'),
('0x1804a0a76','后台登记异常完成 funclet','architecture-background/registration-exception','confirmed'),
('0x1804a0ab0','按名称检查后创建后台任务 builder','background/background-builder','confirmed'),
('0x1804a0be0','按任务名查找注册对象','background/background-task-find','derived-high'),
('0x1804a0d90','TimeTrigger 构造包装器','background/time-trigger','confirmed'),
('0x1804a0dd0','TimeTrigger 工厂 ABI 包装器','background/time-trigger-factory','confirmed'),
('0x1804a0c90','SystemCondition 构造包装器','background/system-condition','confirmed'),
('0x1804a0f80','旧任务名单清理，Unregister(true) 语义','background/old-task-unregister','derived-high'),
('0x180432c20','二依赖对象字段初始化构造器','architecture-background/dependency-constructor-two','confirmed'),
('0x180382c10','三依赖对象字段初始化构造器','architecture-background/dependency-constructor-three','confirmed'),
('0x18055e200','IBackgroundTask.Run 的反向 WinRT ABI 桥','architecture-background/deferral-bridge','derived-high'),
('0x1805a3a70','IBackgroundTaskInstance.GetDeferral 投影','architecture-background/get-deferral-projection','confirmed'),
('0x1804c2900','后台 Run 异步 void 包装器','architecture-background/background-entry-and-dispatch','derived-high'),
('0x1804c29b0','后台 Run：构造依赖及依次更新磁贴、锁屏、桌面','architecture-background/background-entry-and-dispatch','derived-high'),
('0x1804c2770','磁贴更新调用及异常隔离状态机','architecture-background/background-entry-and-dispatch','derived-high'),
('0x1804c2540','锁屏更新调用及异常隔离状态机','architecture-background/background-entry-and-dispatch','derived-high'),
('0x1804c2310','桌面更新调用及异常隔离状态机','architecture-background/background-entry-and-dispatch','derived-high'),
('0x1804c2d40','BackgroundTaskDeferral.Complete ABI 包装器','architecture-background/background-entry-and-dispatch','confirmed'),
('0x1804bd770','磁贴自动更新异步包装器','architecture-background/provider-and-settings','derived-high'),
('0x1804bd810','磁贴自动更新完整状态机','architecture-background/provider-and-settings','confirmed'),
('0x1804be170','桌面自动更新异步包装器','architecture-background/provider-and-settings','derived-high'),
('0x1804be230','桌面自动开关检查、单图获取与系统应用状态机','architecture-background/provider-and-settings','confirmed'),
('0x1804c1bf0','锁屏自动更新异步包装器','architecture-background/background-entry-and-dispatch','derived-high'),
('0x1804c1cb0','锁屏自动开关检查、单图获取与系统应用状态机','architecture-background/background-entry-and-dispatch','confirmed'),
('0x1803eec30','FirstOrDefault 语义：取集合第一项或默认值','architecture-background/archive-first-selector','confirmed'),
('0x1804bd1b0','选归档第一张并与 CurrentLiveTileImageUrl 去重','architecture-background/tile-convert-and-select','confirmed'),
('0x1804be100','选归档第一张并与 CurrentDesktopBackgroundImageUrl 去重','architecture-background/provider-and-settings','confirmed'),
('0x1804c1b80','选归档第一张并与 CurrentLockScreenImageUrl 去重','architecture-background/background-entry-and-dispatch','confirmed'),
('0x1804bc790','磁贴图像解码与像素参数提取状态机','architecture-background/tile-convert-and-select','confirmed'),
('0x1804bbbb0','LiveTiles PNG 文件编码与保存状态机','architecture-background/tile-save-and-notification','confirmed'),
('0x1804bb330','磁贴310×150中心裁切尺寸计算','architecture-background/image-resize','confirmed'),
('0x1804bb430','设置BitmapTransform缩放与裁切属性','architecture-background/image-resize','confirmed'),
('0x1804bc200','BitmapEncoder.SetPixelData 参数包装器','architecture-background/tile-encoder-set-pixels','confirmed'),
('0x1804bb510','构建TileWideImage通知并设UtcNow+2日期限后发布','architecture-background/tile-save-and-notification','confirmed'),
('0x1804bb6d0','设置磁贴通知过期时间 ABI 包装器','architecture-background/tile-save-and-notification','confirmed'),
('0x1804bd2d0','保留当前磁贴文件并清理其他文件的状态机','architecture-background/tile-convert-and-select','derived-high'),
('0x1804b6d40','TrySetWallpaperImageAsync 布尔分支、清理及失败抛错','architecture-background/desktop-personalization-apply','confirmed'),
('0x1804b4190','TrySetLockScreenImageAsync 布尔分支、清理及失败抛错','architecture-background/lockscreen-personalization-apply','confirmed'),
('0x1804c1380','传统LockScreen.SetImageStreamAsync 异步状态机','architecture-background/personalization-providers','confirmed'),
('0x1804c1510','传统LockScreen.SetImageStreamAsync ABI 包装器','architecture-background/personalization-providers','confirmed'),
('0x1804c15f0','传统LockScreen.SetImageFileAsync 异步状态机','architecture-background/personalization-providers','confirmed'),
('0x1804c1780','传统LockScreen.SetImageFileAsync ABI 包装器','architecture-background/personalization-providers','confirmed'),
('0x18051d810','UserProfilePersonalizationSettings.IsSupported','architecture-background/settings-and-capabilities','confirmed'),
('0x18051d430','写UseBingImageAsDesktopBackground','background/desktop-settings-write','confirmed'),
('0x18051d510','读UseBingImageAsDesktopBackground，缺省false','background/desktop-settings-read','confirmed'),
('0x18051d650','写UseBingImageAsLockScreen','background/lockscreen-settings-write','confirmed'),
('0x18051d730','读UseBingImageAsLockScreen，缺省false','background/lockscreen-settings-read','confirmed'),
('0x1804be7f0','写CurrentLiveTileImageUrl','architecture-background/url-settings-and-invalidation','confirmed'),
('0x1804be880','读CurrentLiveTileImageUrl','architecture-background/url-settings-and-invalidation','confirmed'),
('0x1804be910','写CurrentDesktopBackgroundImageUrl','architecture-background/url-settings-and-invalidation','confirmed'),
('0x1804be9a0','读CurrentDesktopBackgroundImageUrl','architecture-background/url-settings-and-invalidation','confirmed'),
('0x1804bea30','写CurrentLockScreenImageUrl','architecture-background/url-settings-and-invalidation','confirmed'),
('0x1804beac0','读CurrentLockScreenImageUrl','architecture-background/url-settings-and-invalidation','confirmed'),
('0x1804beb50','单键从Roaming复制到Local并将旧值赋null','architecture-background/url-settings-and-invalidation','confirmed'),
('0x1804bec80','迁移两个锁屏旧设置入口','architecture-background/url-settings-and-invalidation','confirmed'),
]
pe=PE(APP);functions=[]
for addr,role,key,confidence in rows:
    owner=pe.owner(int(addr,16));assert owner and owner['start']==addr,(addr,owner)
    path='evidence/'+key+'.json';obj=json.loads((ROOT/path).read_text(encoding='utf-8-sig'))
    functions.append(dict(address=addr,role=role,evidence_paths=[path],confidence=confidence,
                          end_exclusive=owner['end_exclusive'],evidence_ids=[obj['evidence_id']],
                          name_kind='semantic-role-not-original-source-symbol'))
(OUT/'functions.json').write_text(json.dumps(dict(target=str(APP),image_base='0x180000000',functions=functions),ensure_ascii=False,indent=2),encoding='utf-8')

all_keys=sorted(set(refs+[x[2] for x in rows]));catalog=[]
for key in all_keys:
    p=ROOT/'evidence'/(key+'.json');e=json.loads(p.read_text(encoding='utf-8-sig'));n=e.get('normalized_result',{})
    catalog.append(dict(path=p.relative_to(ROOT).as_posix(),evidence_id=e['evidence_id'],
                        sha256=hashlib.sha256(p.read_bytes()).hexdigest(),
                        completion_status=n.get('completion_status'),artifact_changed=n.get('artifact_changed'),
                        output_truncated=n.get('output_truncated')))
(OUT/'evidence-manifest.json').write_text(json.dumps(dict(target=str(APP),target_sha256=hashlib.sha256(pe.data).hexdigest(),evidence=catalog),ensure_ascii=False,indent=2),encoding='utf-8')

findings=[]
for part in re.split(r'(?m)^## ',DOC.read_text(encoding='utf-8'))[1:]:
    title,body=part.split('\n',1);match=re.match(r'(BGA-\d+)：(.+)',title);assert match
    ev_ids=re.findall(r'ev_[0-9a-f]{64}',body)
    paths=re.findall(r'\.\./(evidence/[^)]+)',body)
    findings.append(dict(id=match[1],title=match[2],confidence_labels_present=[x for x in ['已确认','静态派生','未知'] if x in body],
                         evidence_ids=sorted(set(ev_ids)),evidence_paths=sorted(set(paths)),
                         details_document='docs/background-and-personalization.md',details_markdown=body.strip()))
(OUT/'findings.json').write_text(json.dumps(dict(target=str(APP),findings=findings),ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(document=str(DOC),findings=len(findings),functions=len(functions),evidence_files=len(catalog)),ensure_ascii=False))
