# Daily Picture 1.4.13：下载、缓存淘汰与地区选择

后续完整架构档案见 [ARCHITECTURE.md](ARCHITECTURE.md)。新恢复的前台/后台差异、UI 语言赋值、设置迁移和平台调用在对应专题记录；本报告的默认 `n=7` 主要描述前台批量缓存路径，后台提供器分别请求 `n=1`。

分析日期：2026-10-17（Asia/Shanghai）。本报告继续分析本机安装的 `14403Duracellko.NET.BingImageoftheDay_1.4.13.0_x64__1wy5t1va6xay4`。主要结果来自 REA/Rizin 的原生指令、经过验证的 .NET Native 导入映射、匹配的微软框架 PDB，以及上一轮只读采集的本地缓存。

**已恢复的核心规则是：默认请求 7 条图片元数据，逐张判断“旧完整 URL 命中且同名文件存在”，未命中才下载；只有本轮确实下载了图片且整轮成功，才保存新归档并清理旧图片。清理按归档产生的文件名保留，不按时间、大小或 LRU 淘汰。应用在这条请求路径上没有显式选择地区，直接使用 Bing 响应中的图片 URL。**

这是控制流和数据流的语义恢复，伪代码不是原始 C#，也不是可直接编译的完整项目。所有地址都是主 DLL 的首选映像 VA，不能直接用作运行时 ASLR 地址。本轮没有启动应用、操作界面、修改设置、下载 Bing 图片或删除应用缓存；联网仅用于取得公开框架符号和技术参考，输出保存在分析工作区。

核心 DLL：`C:\Program Files\WindowsApps\14403Duracellko.NET.BingImageoftheDay_1.4.13.0_x64__1wy5t1va6xay4\Duracellko.BingImage.Universal.dll`。

SHA-256：`d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a`。

## 1. 从请求列表到保存和清理的完整顺序

默认的无参数列表入口在 `0x1804c11e0` 状态机中传入整数 7，经过 `0x1804c0d00` 包装器进入 `0x1804c0e20`。该函数调用 `String.Format(CultureInfo.InvariantCulture, template, count)`，得到：

```text
http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=7
```

`7` 是请求参数。服务端是否总返回 7 项、是否按固定天数返回，本次没有请求服务端核实；程序的淘汰方法也没有把 7 作为本地文件数上限。

下面的流程省略编译器生成的 async 状态保存和资源释放，但保留业务条件与执行顺序：

```csharp
// Role names are reconstructed; this is not the author's original source.
async Task<bool> UpdateImageCache() {           // state: 0x180518c60
    bool changed = await manager.DownloadImages();
    if (changed)                              // branch: 0x180518d3d
        await storage.DeleteOldImages();      // call: 0x180518d46
    return changed;
}

async Task<bool> DownloadImages() {            // state: 0x1804b9f40
    await storage.InitializeImages();
    previousUrls = await LoadLocalArchiveUrlProjection();
    var remoteArchive = await downloader.GetImageArchive();
    var images = ProjectArchiveToImageModels(remoteArchive);
    bool anyDownloaded = false;

    foreach (var image in images) {            // serial, await each image
        if (await EnsureImage(image.Url))
            anyDownloaded = true;
    }

    if (anyDownloaded)                        // 0x1804ba272 / 0x1804ba276
        await storage.SaveImageArchive(remoteArchive);
    return anyDownloaded;
}

async Task<bool> EnsureImage(string url) {      // state: 0x1804b7e10
    if (previousUrls != null
        && previousUrls.Contains(url, StringComparer.OrdinalIgnoreCase)
        && await storage.ExistsImage(url))
        return false;

    byte[] bytes = await downloader.DownloadImage(url);
    await storage.SaveImage(url, bytes);
    return true;
}
```

**这个顺序解释了下载与清理的几个非直观行为：**

- 本地初始化和旧索引读取成功后，协调器仍会请求新的网络列表；它没有先检查“本地已经有 7 张”然后跳过列表请求的分支。
- 图片循环串行等待每一张。所见方法没有并发池、应用级重试循环，也没有某张失败后继续下一张的处理；不能据此否定 HTTP 框架内部的重定向或连接重试。
- 同名文件存在但旧索引没有该完整 URL，仍下载并覆盖；旧索引有该 URL 但文件不存在，也重新下载。
- URL 全部命中时，`anyDownloaded=false`：不保存新归档，这条外层路径也不清理旧图。
- 因而只修改版权说明、重新排序、或返回旧 URL 的一个子集，并不会仅凭元数据变化触发保存。返回一个非 null 的空图片集合也没有成功下载项，不会经此流程用空集合覆盖旧索引。

最后两项是由分支条件推导出的行为，没有通过伪造响应或运行目标做实验。它们说明本程序的“更新判据”是实际下载成功过图片，而不是比较两份索引是否相同。

证据：[下载协调器及存储](evidence/deep-cache/storage-json.json)，Evidence `ev_e559ec21919cdf6b212f0ca080a9bd67dc539290d48532d43846200b774840eb`；[外层保存后清理顺序](evidence/deep-download/refresh-cleanup-sequence.json)，Evidence `ev_942fda182a00886a8532bfe6e4e76dc47d0b6ddae19c7cad395d86bd8041c909`；[外层 async 包装器](evidence/deep-download/update-cache-async-wrapper.json)。这里确认的是进入该缓存更新方法后的行为，未据此断言每次打开窗口或每次后台唤醒一定执行此方法。

首次使用时没有 `ImageArchive.json` 属于正常分支：本地读取状态机先枚举 `LocalFolder`，忽略大小写查找该文件名；找不到就返回 null，上层转为空的旧 URL 列表。文件存在但读取或反序列化抛出异常则会向上传播，未被当成“空缓存”自动恢复。对应读取状态机为 `0x1804b96b0`，不存在分支由 `0x1804b98a0` 跳至 `0x1804b9a3a`；上层 `0x1804b8e0b` 检查 null。

## 2. 网络图片怎样下载

图片下载状态机 `0x1804bfc90` 使用：

```csharp
async Task<byte[]> DownloadImageBytes(string relativeUrl) {
    string address = String.Concat("http://www.bing.com", relativeUrl);
    var request = CreateHttpRequest(address);
    using (var response = await GetResponseAsyncBridge(request))
    using (var source = response.GetResponseStream())
    using (var buffer = new MemoryStream()) {
        source.CopyTo(buffer);  // synchronous Stream.CopyTo in this body
        return buffer.ToArray();
    }
}
```

这里是字符串拼接，不是这个位置调用 `new Uri(base, relative)`。它直接使用归档中返回的 `url`，没有在这个下载状态机中把 URL 重写成另一个分辨率或市场。截图对应的输入例子为：

```text
/th?id=OHR.SneffelsAutumn_EN-US3953128777_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp
```

列表下载则是响应流 → `StreamReader` → JSON reader/deserializer → 归档数据对象。没有把 JSON 先用 `ReadToEnd` 读成字符串的直接调用证据，因此不把该实现补写成那种形式。

共同请求包装器 `0x1804c0080 → 0x1804c00d0` 构造 `Uri`，校验 `http/https` scheme，进入默认前缀的请求工厂。响应桥 `0x1804bfe90 → 0x1804bfee0` 使用 `TaskFactory<T>.FromAsyncImpl` 适配 Begin/End 风格的请求。它与 `WebRequest.CreateHttp` / `GetResponseAsync` 路径相符，不是曾经可能凭名称猜测的 `HttpClient.GetStreamAsync`。

框架 PDB 明确给出了关键导入的名称：

| 主 DLL 导入槽 | 框架方法 | 对恢复逻辑的意义 |
|---|---|---|
| `0x1802a2f98` | `String.Concat` | 拼接图片地址 |
| `0x1802a2f70` | `String.Format` | 格式化列表请求 |
| `0x1802a4758` | `CultureInfo/FormatProvider.get_InvariantCulture`，编译器合并别名 | 固定数字格式 |
| `0x18029f248` | `MemoryStream..ctor` | 创建内存缓冲 |
| `0x18029f3d8` | `Stream.CopyTo` | 将图片响应流完整复制到内存 |
| `0x18029f308` | `MemoryStream.ToArray` | 返回图片字节数组 |
| `0x18029f468` | `StreamReader..ctor` | 读取 JSON 文本流 |

因此可以确认：这一实现先将整张图片缓冲为 `byte[]`，然后才进入磁盘保存；它不是直接把网络流写到图片文件的下载器。保存路径 `0x1804b81c0` 获取 `LocalFolder/Images`，用 `CreateFileAsync(name, ReplaceExisting=1)` 创建或替换文件，再 `FileIO.WriteBytesAsync`。

URL 字面值使用 HTTP。是否实际重定向到 HTTPS、最终响应内容及网络错误表现，尚无目标进程请求记录。初始字符串不能替代抓包结果。

证据：[图片下载 REA](evidence/rea/image-url-http-assembly.json)、[列表下载 REA](evidence/rea/archive-url-assembly.json)、[对应框架符号](evidence/deep-symbols/download-archive-imports.json)、[符号方法与调用点汇总](evidence/deep-symbols/symbols-findings.json)。

## 3. 文件名、缓存命中与淘汰

文件名转换已经恢复到具体字符串操作。`GetImageFileName` 位于 `0x1804a0060`，其查询参数助手位于 `0x1804a0100`：

```csharp
string GetImageFileName(string url) {
    if (String.IsNullOrEmpty(url))
        throw new ArgumentNullException("url");
    var uri = new Uri(new Uri("http://www.bing.com"), url);
    string id = GetUriQueryId(uri);
    return id ?? Path.GetFileName(url); // original url string in fallback
}

string GetUriQueryId(Uri uri) {
    string query = uri.Query;
    if (String.IsNullOrEmpty(query)) return null;
    if (query[0] == '?') query = query.Substring(1);
    foreach (string part in query.Split('&')) {
        int equal = part.IndexOf('=');
        if (equal > 0 && String.Equals(part.Substring(0, equal), "id",
                                      StringComparison.OrdinalIgnoreCase))
            return part.Substring(equal + 1);
    }
    return null;
}
```

所以截图这张图片保存为 `OHR.SneffelsAutumn_EN-US3953128777_1920x1080.jpg`；`rf`、`pid` 不进入本地文件名。查询键忽略大小写；多个 `id` 取第一个；值可以包含后续的 `=`；`id=` 返回空串而非 null，所以不会触发 `Path.GetFileName` 回退。这里没有额外 URL 解码调用，使用的是 `Uri.Query` 暴露的字符串；没有单独验证底层 `Uri` 对转义字符的规范化，不能将其描述为任意输入逐字节原样复制。

`ExistsImage` 的实现获取 `Images` 下的文件列表，使用 `Any(file.Name == derivedName)`，按 `OrdinalIgnoreCase` 比较。**缓存命中没有图片解码、长度或哈希检查。** 因此这条判断能证明有同名文件，不能证明其内容完整。

`DeleteOldImages` 位于 `0x1804bed50`，入口包装器为 `0x1804becb0`：

```csharp
async Task DeleteOldImages() {
    var archive = await ReadLocalImageArchive();
    if (archive == null || archive.Images == null) return;

    var keep = archive.Images.Select(x => GetImageFileName(x.Url)).ToList();
    var folder = await ApplicationData.Current.LocalFolder.GetFolderAsync("Images");
    foreach (var file in await folder.GetFilesAsync()) {
        if (!keep.Contains(file.Name, StringComparer.OrdinalIgnoreCase))
            await file.DeleteAsync();
    }
}
```

保留名实体化为 `List<string>`，再做带 comparer 的包含判断；这里的“保留集合”是逻辑含义，不冒充底层使用了 `HashSet`。删除顺序沿用文件枚举，没有应用内排序，每项删除都 await 后再继续。

| 目录/判断 | 使用的规则 | 已确定的限制 |
|---|---|---|
| 图片下载是否跳过 | 旧归档完整 URL 命中，并且 `Images` 中有派生文件名 | 两个条件缺一不可；均忽略大小写 |
| `Images` 淘汰 | 读取已保存归档，保留归档 URL 导出的所有名称 | 无 TTL、LRU、字节上限或独立的 7 张硬上限 |
| `Wallpaper`、`LockScreen`、`LiveTiles` 清理 | 共用 `DeleteOldFiles(folder, keepName)`，保留一个指定文件名 | 与主图片归档列表的规则不同 |
| 同 URL 的坏图片 | 同名文件仍可能通过命中判定 | 此路径不主动发现内容损坏 |
| URL 只改 `rf/pid` 等参数 | 完整 URL 可能不命中，但派生文件名相同 | 可重新下载并替换同名文件 |
| null 归档 / null `Images` | `DeleteOldImages` 直接跳过 | 非 null 的空集合则无保留名，清理方法会删除枚举到的全部文件 |

“空集合清空目录”是独立清理方法的规则；它不会推翻上一节的提交条件。新的网络空集合经正常下载协调器不会因为零次下载而被写成新索引。

派生目录的公共清理实现 `0x1804b4580` 使用单个 `keepName` 和 `OrdinalIgnoreCase`。锁屏成功分支 `0x1804b42e1`、桌面成功分支 `0x1804b6e91`、磁贴清理 `0x1804bd42d` 均调用它。旧锁屏或磁贴文件存在，不能单凭文件年龄判定清理故障，因为清理需要相应更新路径被执行。

证据：[缓存详细恢复](evidence/deep-cache/findings.md)、[文件名原生指令](evidence/deep-cache/filename.json)、[Images 清理](evidence/deep-cache/extra-cache.json)、[派生目录公共清理及锁屏调用](evidence/deep-cache/personalization-cleanup.json)、[LiveTiles 清理调用](evidence/deep-cache/tile-cleanup-call.json)。WinRT 接口的 GUID、槽位和碰撞枚举还与 [Microsoft Windows Storage ABI](https://github.com/microsoft/windows-rs/blob/master/crates/libs/windows/src/Windows/Storage/mod.rs) 对照，保留在 [abi-evidence.json](evidence/deep-cache/abi-evidence.json)。

## 4. 失败、中断与索引提交边界

写图片、写归档和删除旧图是按次序执行的多个操作，所见应用代码没有把它们合成一个事务。

归档保存的 `0x1804ba4b0` 状态机把 `ImageArchive.json` 与模式值 1 交给文件创建/打开助手，经 folder dispatch 返回 `StorageFile`，再打开写流并用 `StreamWriter` 写入 JSON。没有观察到临时文件加原子重命名。模式值 1、对象类型和返回值与 `ReplaceExisting` 一致，但该助手的虚派发到具体接口槽还没有完全解析，因此这里只对图片文件的 `ReplaceExisting` 作已验证的确定结论，不把归档助手的解释提升到相同证据等级。

| 失败或无变化的位置 | 根据控制流可推导的结果 |
|---|---|
| 所有 URL 和文件都命中 | 不写归档、不走外层旧图清理；额外孤立文件可继续存在 |
| 初始化或旧索引读取失败 | 可以在请求网络列表之前失败；协调器没有忽略异常继续的分支 |
| 第 k 张下载或保存失败 | 终止图片循环；先前写好的图片留下；新归档写入点尚未到达，旧索引未被这一步覆盖 |
| 所有图片完成，但写归档失败 | 图片可能全部落盘；索引没有成功提交；外层 await 失败，不走后续旧图清理 |
| 索引保存成功，清理中途失败 | 新索引已保存，部分旧图可能已删除，其余可残留；没有回滚 |
| ReplaceExisting 后写文件中断 | 不能保证旧文件内容还在；未观察到应用层临时文件加重命名保护 |

因下载失败留下的新文件不一定在旧索引中，下次运行即使看到它的文件名，也仍可能重新下载：跳过条件同时要求完整 URL 已在旧索引。

`DeleteOldImages` 未看到逐文件吞错后继续的逻辑。与之不同，派生目录的 `DeleteOldFiles` 存在内层空 catch funclet `0x1804b482c`，跳转到成功完成位置；但其**精确托管异常类型尚未恢复**，不能描述为“所有清理异常都忽略”。以上失败结果是静态分支推导，没有做磁盘/网络故障注入，也没有检查强制中断后的实际文件内容。

## 5. 地区选择具体发生在哪里

**在恢复出的应用路径里，没有独立的地区选择算法。应用请求不带市场参数，随后使用服务端返回的 URL。能够恢复的是客户端如何形成请求；仅凭本机代码无法恢复 Bing 服务端的市场选择规则。**

证据链不是只搜索字符串：

1. `0x1804c0e20` 把数量格式化进唯一的列表模板。`InvariantCulture` 对应整数格式，不能据此推断请求采用 `en-US` 市场。
2. 请求创建之后立即进入响应桥。在这段具体控制流中，没有应用层 `mkt/cc` 拼接，也没有按系统语言赋值 `Accept-Language` 的调用。
3. 默认请求构造 `0x180583f90` 创建空的头集合，`CookieContainer` 保持 null。发送状态机 `0x180584180` 复制已有请求头；所见路径没有自行生成市场语言头。
4. 发送代码检测到 CookieContainer 为 null 后，调用 `0x18058aa20` 将 handler 的 `UseCookies` 置 false。在可用性检测成功的 WinRT 分支，还将 `HttpBaseProtocolFilter.CookieUsageBehavior` 设为枚举值 1，即 `NoCookies`。这不支持“继承浏览器 Bing Cookie 决定本次地区”的解释。[微软枚举定义](https://learn.microsoft.com/en-us/uwp/api/windows.web.http.filters.httpcookieusagebehavior?view=winrt-26100)
5. 图片下载直接拼接响应 `url`，缓存命名则提取其中的 `id`。`EN-US` / `ZH-CN` 因此是已经返回的图片标识的一部分，不是客户端从文件名推导地区后再选择图片。

整份 DLL 的限定字节搜索也未发现 `mkt=`、`cc=`、`setmkt=`、`setlang=`、`zh-CN`、`_EDGE_S`、`SRCHHPGUSR`（ASCII 与 UTF-16LE，大小写敏感）。这些负搜索只作为上述调用路径的补充，不能排除运行时合成值或系统行为。

后续架构分析已确认 `ApplicationLanguages` 在前台启动路径中实际使用：取列表第一项设置 Frame 所属 FrameworkElement 的 Language 属性，见 [UI 与生命周期](docs/ui-and-lifecycle.md)。这是界面语言赋值，尚无该值进入 HTTP 请求语言头的证据。`Accept-Language` 的既有候选仍处于通用头表范围；字符串本身和包内英文界面文本都不能证明网络市场固定为美国。

最终线上请求仍有一层未知：底层 HTTP 组件可能补充头，而公开的默认头集合不必反映所有实际发送字段。[微软对默认请求头的说明](https://learn.microsoft.com/en-us/uwp/api/windows.web.http.httpclient.defaultrequestheaders?view=winrt-26100) 本次没有抓到应用实际发送的 `Accept-Language`、重定向链或响应，所以无法确定出口 IP、底层请求头及 Bing 服务端默认规则各占多大作用。

当前磁贴的 `ZH-CN` 与图片列表的 `EN-US` 可以确定属于不同的持久化记录和更新时间；没有找到前后台主动写入不同市场参数的证据，不能将这个结果倒推成“两套客户端地区选择策略”。

完整地域证据：[region-findings.json](evidence/deep-region/region-findings.json)、[带符号与字面值注释的反汇编](evidence/deep-region/assembly.txt)、[框架导入映射](evidence/deep-region/framework-imports.json)。保存的 4 份 dotnet/corefx v1.0.0 官方历史源码仅用于解释框架语义，已验证 Git blob SHA-1 和 SHA-256；不是本机 DLL 精确版本的原始源码，见 [源码溯源](evidence/deep-region/framework-reference/source-provenance-validated.json)。

## 6. 与本地样本的对应及证据质量

上一轮的只读缓存快照记录了 `ImageArchive.json` 的 7 条 URL 和 `Images` 的 7 个文件。按恢复的 `id` 提取规则做离线一致性核对，7 条全部命中对应文件，快照中没有额外 `Images` 文件。截图的 Mount Sneffels 图片也准确映射到上述文件名。[离线对应记录](evidence/deep-download/snapshot-walkthrough.json)

这只是保存快照与恢复规则的一致性检查。它不等于实际执行下载逻辑，也不声称未来的网络响应仍与快照相同。条件性预测是：若未来返回完全相同的 URL，且这些文件名仍存在，该循环将跳过全部图片下载，并且不提交新索引或清理。

本轮解决 .NET Native 符号难题的方法是解析主 DLL 自定义导入描述符，验证其绑定到 `SharedLibrary.dll!$NEAT$`，再对照安装的框架 RVA 表和来自微软符号服务器的匹配 PDB。4,737 个导入槽中 4,480 个可关联符号名；部分地址经过编译器折叠，有多个不相干别名，结论结合调用点参数与控制流确定，未直接选一个别名当作源方法。

框架 PDB 的 GUID、DBI age 1、全部 22 个节布局与本机 DLL 匹配。PDB info stream 的 age 3 也保留记录，没有隐去这个差异；应用本身的精确 PDB 查询返回 404。布局依据为 [Synacktiv dotNIET 原始工具](https://github.com/synacktiv/dotNIET/blob/main/dotNIET_plugin.py)，符号格式依据为 [LLVM DBI](https://www.llvm.org/docs/PDB/DbiStream.html) 与 [模块符号流说明](https://www.llvm.org/docs/PDB/ModiStream.html)。解析器保存在 [deep_symbols_resolve.py](scripts/deep_symbols_resolve.py)，验证见 [symbols-findings.md](evidence/deep-symbols/symbols-findings.md) 和 [verification.json](evidence/deep-symbols/verification.json)。

工作区证据的最终完整性检查见 [validation.json](evidence/validation.json) 和 [index.json](evidence/index.json)。检查逐条核对保留的反汇编机器码与安装文件字节，并核对源文件 SHA-256；少量跨窗口边界的无效解码单独列出，不用于支撑完整方法结论。Ghidra 缺少所需 sleigh 规格的失败仍保留为工具限制，并未当作反编译成功。

本轮汇总检查记录 70 条 REA Evidence，其中 65 条为 Rizin 命令取证；核对 12,474 条保留反汇编条目的字节（包括重叠采样与填充，23 条无效/边界解码已单独标识），涉及 3 个 PE 原件，未发现源哈希或解码字节不一致。这是证据完整性验证，不是 12,474 次功能测试。

关键结论均有对应的完整函数或状态机本体。仍未完成的窄范围问题是：最终实际发送的请求头、Bing 服务端选择地区的规则、派生目录空 catch 的精确托管类型，以及故障情况下的真实文件系统时序。它们不影响本报告已经恢复出的下载条件、文件名规则、索引提交条件和正常淘汰算法。
