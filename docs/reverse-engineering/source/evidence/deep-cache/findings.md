# Daily Picture 1.4.13 缓存与淘汰逻辑恢复

分析对象为本机安装的 `Duracellko.BingImage.Universal.dll`，SHA-256 为 `d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a`。以下地址均为 PE 首选映像地址，不是运行进程地址。只读取安装文件并运行 REA/Rizin 静态解析；没有启动应用、下载应用图片、删除缓存或修改设置。伪代码表达已恢复的控制流，并非原作者源代码。

## 已确认的核心行为

`Images` 目录的淘汰是**根据已保存的 `ImageArchive.json` 计算保留文件名，然后删除其他文件**。没有在这个方法中出现按最后访问时间、修改时间、文件大小、总字节数、固定图片数或 LRU 排序的策略。文件名比较忽略大小写。保留集合从存档中的 URL 提取 `id` 查询参数；没有该参数时使用 `Path.GetFileName`。

下载协调器在本地初始化和读取成功之后，每次调用都会请求一次新的网络 archive，再串行处理其中图片。只有至少一张图片实际完成下载和保存，且整个图片循环成功结束，才写入新 archive。某张图片下载/保存失败会使这一整次任务失败；没有恢复成 `false` 后继续下一张的分支。已写入的前几张图片不回滚，而尚未开始写入的新 archive 不会替换旧索引。

外层 `0x180518c60` 已进一步确认：它 await 下载协调器，只有结果为 true 才 await `DeleteOldImages`。因此这一条调用路径的顺序是“全部图片处理完成 → 保存新 archive → 根据持久化 archive 清理”。任何下载或索引保存失败都会阻止它抵达清理点。具体 UI 或后台触发条件仍属于更上层的分析。

## 恢复伪代码

```csharp
// 0x1804a0060..0x1804a00fb; helper 0x1804a0100..0x1804a0215
string GetImageFileName(string url) {
    if (String.IsNullOrEmpty(url))
        throw new ArgumentNullException("url");
    var uri = new Uri(new Uri("http://www.bing.com"), url);
    string id = GetUriQueryId(uri);
    return id ?? Path.GetFileName(url); // fallback uses original url string
}

string GetUriQueryId(Uri uri) {
    string query = uri.Query;
    if (String.IsNullOrEmpty(query)) return null;
    if (query[0] == '?') query = query.Substring(1);
    foreach (string part in query.Split(new char[] { '&' })) {
        int i = part.IndexOf('=');
        if (i > 0 && String.Equals(part.Substring(0, i), "id",
                                  StringComparison.OrdinalIgnoreCase))
            return part.Substring(i + 1); // first matching key wins
    }
    return null;
}

// wrapper 0x1804bb130; async state 0x1804bb1d0
async Task InitializeImages() {
    await ApplicationData.Current.LocalFolder.CreateFolderAsync(
        "Images", CreationCollisionOption.OpenIfExists); // enum value 3
}

// wrapper 0x1804b88c0; async state 0x1804b8970; predicate 0x1804a0000
async Task<bool> ExistsImage(string url) {
    if (String.IsNullOrEmpty(url)) throw new ArgumentNullException("url");
    var folder = await ApplicationData.Current.LocalFolder.GetFolderAsync("Images");
    string name = GetImageFileName(url);
    var files = await folder.GetFilesAsync();
    return files.Any(file => String.Equals(file.Name, name,
                                         StringComparison.OrdinalIgnoreCase));
}

// wrapper 0x1804b8110; async state 0x1804b81c0
async Task SaveImage(string url, byte[] bytes) {
    if (String.IsNullOrEmpty(url)) throw new ArgumentNullException("url");
    if (bytes == null) throw new ArgumentNullException(/* observed null guard */);
    var folder = await ApplicationData.Current.LocalFolder.GetFolderAsync("Images");
    var file = await folder.CreateFileAsync(GetImageFileName(url),
                                          CreationCollisionOption.ReplaceExisting);
    await FileIO.WriteBytesAsync(file, bytes); // no additional decoding/hash validation here
}

// wrapper 0x1804b7d60; async state 0x1804b7e10
async Task<bool> DownloadImage(string url) {
    if (previousUrls != null &&
        previousUrls.Contains(url, StringComparer.OrdinalIgnoreCase) &&
        await storage.ExistsImage(url))
        return false;
    byte[] bytes = await downloader.DownloadImage(url);
    await storage.SaveImage(url, bytes);
    return true;
}

// wrapper 0x1804b9ea0; async state 0x1804b9f40; names describe observed roles
async Task<bool> DownloadImages() {
    await storage.InitializeImages();                   // 0x1804ba024
    previousUrls = await LoadLocalArchiveUrlProjection(); // 0x1804ba07a, assignment 0x1804ba0dd
    var remote = await downloader.GetImageArchive();    // 0x1804ba0f1
    var images = ProjectArchiveToImageModels(remote);   // 0x1804ba16f
    bool anyDownloaded = false;
    foreach (var image in images) {
        if (await DownloadImage(image.Url))              // 0x1804ba1e4; GetResult 0x1804ba20b
            anyDownloaded = true;                      // 0x1804ba215
    }
    if (anyDownloaded)                                 // 0x1804ba272/0x1804ba276
        await storage.SaveImageArchive(remote);        // 0x1804ba287
    return anyDownloaded;
    // Compiler-generated async handlers propagate failures into the returned Task.
}

// outer async state 0x180518c60, supplied and independently checked from parent evidence
async Task<bool> DownloadAndClean() {
    bool changed = await manager.DownloadImages();     // 0x180518cbf
    if (changed)                                      // 0x180518d3b/0x180518d3d
        await storage.DeleteOldImages();              // 0x180518d46
    return changed;
}

// wrapper 0x1804becb0; async state 0x1804bed50
async Task DeleteOldImages() {
    var archive = await ReadLocalImageArchive();        // 0x1804bee09 -> 0x1804b9580
    if (archive == null || archive.Images == null) return;
    List<string> keep = archive.Images
        .Select(image => GetImageFileName(image.Url)).ToList();
    var folder = await ApplicationData.Current.LocalFolder.GetFolderAsync("Images");
    foreach (var file in await folder.GetFilesAsync()) {
        if (!keep.Contains(file.Name, StringComparer.OrdinalIgnoreCase))
            await file.DeleteAsync();                  // 0x1804bf329, awaited before next item
    }
}

// wrapper 0x1804b44d0; async state 0x1804b4580
async Task DeleteOldFiles(StorageFolder folder, string keepName) {
    if (folder == null) throw new ArgumentNullException("folder");
    try {
        foreach (var file in await folder.GetFilesAsync()) {
            if (!String.Equals(file.Name, keepName, StringComparison.OrdinalIgnoreCase))
                await file.DeleteAsync();
        }
    } catch (/* exact managed catch type NOT recovered */) {
        // Native funclet 0x1804b482c returns success continuation 0x1804b47e5.
        // This is not evidence that every exception is caught.
    }
}
```

## 大小写、命中条件与边界

| 比较位置 | 比较对象 | 恢复结果 | 指令证据 |
|---|---|---|---|
| `GetUriQueryId` | 查询键是否为 `id` | `String.Equals(..., 5)`，OrdinalIgnoreCase | `0x1804a01df..0x1804a01e8` |
| `ExistsImage` | `file.Name` 与提取文件名 | 同上 | `0x1804a001d..0x1804a002a` |
| 本地索引是否存在 | `file.Name` 与 `ImageArchive.json` | 同上 | `0x1804a0240..0x1804a0249` |
| `DownloadImage` | 旧索引中的**完整 URL 字符串**与新 URL | `StringComparer.OrdinalIgnoreCase` + Contains | `0x1804b7ebd..0x1804b7ed3` |
| `DeleteOldImages` | 文件名是否在索引导出的名称列表 | 同上 | `0x1804bf2fa..0x1804bf310` |
| `DeleteOldFiles` | `file.Name` 与单个保留名 | `String.Equals(..., 5)` | `0x1804b471f..0x1804b472c` |

这些缓存方法中没有发现“某处区分大小写、另一处不区分”的差异；真正的差异是比较对象：下载命中同时需要旧索引的完整 URL 命中和磁盘文件名命中，清理只比较提取后的文件名。

- `?id=A.jpg&id=B.jpg` 选择第一个值；`?ID=A.jpg` 也匹配。`id=` 得到空串，因外层只判断 `null`，不会转入文件名 fallback。
- 解析器在第一个 `=` 分割键与值，因此 `id=A=B.jpg` 的值保留后面的 `=`。
- 没有看到显式 `UrlDecode`、非法文件名替换、目录清理等步骤；值来自 `Uri.Query`，所以不能据此断言所有百分号编码都会原样保留。底层 `Uri` 的规范化行为未单独运行验证。
- `ExistsImage` 只枚举并比较名字。这个路径不验证字节数、哈希、图像解码成功或文件内容，因此“有同名文件”不能等同于“图片完好”。
- 完整 URL 改了其他参数但 `id` 相同，旧完整 URL 可能不匹配，导致重新下载并以同名替换。只有大小写变化则这个比较本身仍判等。
- `DeleteOldImages` 的存档或 `Images` 字段为 `null` 时跳过；非 null 的空列表则没有任何保留名，删除枚举到的全部 `Images` 文件。这与网络返回空列表不同：下载循环无成功下载时不会保存空的新 archive。
- 删除顺序采用 `GetFilesAsync()` 返回的枚举顺序，没有应用内排序；每个删除 await 完成后再取下一项。没有恢复具体目录枚举顺序，也没有把它称为按时间排序。

## 失败时的实际分支

| 阶段 | 静态控制流 | 可推导影响（未经故障注入） |
|---|---|---|
| 初始化 `Images` 失败 | `0x1804bb2fe` handler -> SetException | 后续网络列表请求不会执行 |
| 读取旧本地 archive 失败 | `0x1804b9ac0` handler -> SetException；协调器继续传播 | 网络请求之前即可失败；未看到在协调器中忽略坏索引 |
| 单张下载/写文件失败 | `0x1804b8040..0x1804b805c` SetException | 不返回 false；外层 await 抛出 |
| 外层图片循环失败 | `0x1804ba33f..0x1804ba35b` SetException | 循环中止，新 archive 写入点尚未到达；前几张已落盘文件不回滚 |
| 图片写入 | 先 ReplaceExisting 创建，再 WriteBytesAsync | 应用层没有临时文件加原子重命名；不能保证中断时仍保留原文件内容 |
| 新 archive 保存失败 | `SaveImageArchive` 的 handler -> SetException | 图片可能已全部写好，但索引保存失败；不要把“完成下载”等同于提交成功 |
| `DeleteOldImages` 删除失败 | 单个 outer handler `0x1804bf424..0x1804bf440` SetException | 没有逐文件吞错继续；可能已删除部分文件，无回滚 |
| `DeleteOldFiles` 某些异常 | 空 catch funclet `0x1804b482c` 返回正常完成地址 | 匹配 catch 的异常可被吞掉；类型未知，不能泛化成任何失败都成功 |

`DownloadImages` 所称“每次请求新列表”仅适用于它已经成功执行初始化和旧索引读取之后的正常路径；不是断言每次打开窗口或每一次 UI 刷新都一定走入该方法。新列表的更新判据是 `anyDownloaded`，不是内容是否不同。因此若 URL 全部命中，只更改版权字段、排序或删除一些条目，这个方法不会仅因元数据变化而保存新 archive；后续基于旧持久化索引的清理仍可能保留旧条目。

外层 `0x180518c60` 的 false 结果还会直接跳过清理；成功返回 true 前已经完成新索引保存。若新索引保存成功但后续删除失败，新索引可以已提交、旧图片仍部分留存；这条链没有跨图片写入、JSON 写入和删除的整体事务。

本地索引首次不存在与读取损坏是两个不同分支。`0x1804b96b0` 先枚举 `LocalFolder`，利用 `0x1804a0220` 谓词检查 `ImageArchive.json`；不存在时 `0x1804b98a0` 跳到返回 null。协调器的本地 URL 投影 `0x1804b8d60` 在 `0x1804b8e0b` 检查 null，随后构造空 `List<string>`（类型导入 `0x1802a5968` 已由匹配 PDB 证实），从而允许首次完整下载。打开、读取或反序列化异常则经 `0x1804b9ac0` 的 SetException 传播，未被转换为“空列表”。

保存 archive 的已见路径为 `0x1804ba550` 指定 `ImageArchive.json`，`0x1804ba557` 指定值 1，调用 `0x1804ba720`；内部异步状态 `0x1804ba8f0` 调用 IStorageFolder 的托管接口单元 `0x180305620`，获取 StorageFile 后打开写流，调用已由 PDB 确认的 `StreamWriter` 构造器（导入 `0x18029f5b8`），再执行 JSON writer/serializer 逻辑。整段没有临时名字、Rename 或事务提交。CreateFileAsync/ReplaceExisting 是由接口类型、参数和返回类型共同支持的强推断；该托管虚调用单元的具体方法槽未单独解码，所以这里没有把“参数 1”孤立地当作枚举身份的硬证明。图片 `SaveImage` 的 ReplaceExisting 则已有明确 WinRT ABI 槽位与枚举双重证据。

## 三类派生目录与主图片目录的区别

`FileHelper.DeleteOldFiles` 保留的是单个给定名称。直接调用点有锁屏成功分支 `0x1804b42e1`、桌面壁纸成功分支 `0x1804b6e91`、以及 `LiveTiles` 清理 `0x1804bd42d`。后者先通过虚调用获取当前 URL，调用 `GetImageFileName`，再获取 `LocalFolder/LiveTiles` 并传入名称。它们不是 `Images` 使用的“存档列表保留”算法。

锁屏设置方法 `0x1804b4190` 的可见分支：系统 `TrySetLockScreenImageAsync` 返回 true 后才调用 `DeleteOldFiles`；false 分支先删除新文件再构造异常。桌面路径具有对应调用点；此处未重复扩大平台权限/实际设置结果的分析。

## 证据如何相互约束

REA `pDj` 指令记录是主证据；本目录所有完整 REA JSON 均记录 `artifact_changed=false`、`completion_status=complete`、`output_truncated=false`。目标 DLL 方法名主要由任务已有类型/字符串索引和指令角色恢复，不能等同于拥有主 DLL 的完整调试符号。

`filename-imports-symbols.json`、`extra-imports-symbols.json`、`cleanup-imports-symbols.json` 与 `generic-symbols.json` 使用已校验匹配的 Microsoft `SharedLibrary.pdb` 解析 .NET Native `$NEAT$` 导入。GUID、DBI age 及 22 个节布局与本机框架 DLL 一致。`StringComparer.OrdinalIgnoreCase`、`Uri.Query`、`Path.GetFileName` 等名称来自该对应符号；`0x18041fc30` 通过 `List<T>..ctor` 而不是 ToArray 实现名称列表实体化。早期 ToArray 猜测已被此证据否定。

`abi-evidence.json` 将目标中的 WinRT context/EEType 指针与同一二进制中的 IID 记录相连；该指针位于相应 IID 前 24 字节。然后使用 Microsoft 的 [Windows Storage ABI 定义](https://github.com/microsoft/windows-rs/blob/master/crates/libs/windows/src/Windows/Storage/mod.rs) 核对槽位，原始参考按 SHA-256 保存为 `windows-storage-reference.rs`。这是官方 ABI 对应关系，不是运行时调用截获。

| 本地调用上下文/类型 | 已匹配接口 | 关键 vtable 槽位 |
|---|---|---|
| `0x18010f488` -> `0x18000cbb0` | IApplicationDataStatics | 6 Current |
| `0x18010f4a0` -> `0x18000cb00` | IApplicationData | 12 LocalFolder |
| `0x18010f5d0` / `0x18010f470` -> `0x18000ca60` | IStorageFolder | 7 CreateFile(options), 9 CreateFolder(options), 11 GetFolder, 13 GetFiles |
| `0x18010efa0` / `0x18010f458` -> `0x18000c908` | IStorageItem | 11 Name, 8 Delete(default options) |
| `0x180020558` 直接类型句柄 | IFileIOStatics | 20 WriteBytesAsync |

`CreationCollisionOption` 值 1 对应 ReplaceExisting，值 3 对应 OpenIfExists。

## REA 证据索引

| 文件 | Evidence ID | 范围/用途 |
|---|---|---|
| `filename.json` | `ev_f55360c578fbe40de5b04f98d6e88f52f1236b01a38164bca11767e789445e80` | `0x1804a0040..0x1804a0220` 文件名与查询解析 |
| `filename-predicate.json` | `ev_879efc11f566e597ee7da70eef4e712d5be735bb6d2c2401948fa33cf9048f6a` | `0x1804a0000..0x1804a0040` ExistsImage 比较 |
| `archive-file-predicate.json` | `ev_d49abee0c9b9b008e20bdea59903bf49e5db268e2c84c8a16089fab86924094f` | `0x1804a0220..0x1804a0255` ImageArchive.json 比较 |
| `storage-json.json` | `ev_e559ec21919cdf6b212f0ca080a9bd67dc539290d48532d43846200b774840eb` | `0x1804b7480..0x1804bb500` 下载协调、存在判断、保存、初始化 |
| `extra-cache.json` | `ev_6da75649a5d884360afb0fedf9861d1ad2efaaf237aed1981b2a4a37d3c18b7c` | `0x1804bed50..0x1804bfb70` DeleteOldImages |
| `eviction-wrapper.json` | `ev_310dc62ae28e60c9555e929c97421a6ab029e7c23a6755c29e7cdf96dadada24` | `0x1804becb0..0x1804bed50` DeleteOldImages 入口 |
| `personalization-cleanup.json` | `ev_a7a43ad582f28f2f507cbf93269f50da20a286849c8cd943567c37114d0b4a08` | `0x1804b40e0..0x1804b52b0` 实际 FileHelper.DeleteOldFiles 与锁屏调用 |
| `tile-cleanup-call.json` | `ev_5da8eabffe4f547dbc424b08a85d8297e9b8b14cc28fceebffd429f78cc87a19` | `0x1804bd2d0..0x1804bd500` LiveTiles 清理调用 |
| `any-predicate.json` | `ev_834a1344c4b9d770652432b9cad1a1c9da6f3b3c38bdd3be9bd402d77d7fc784` | `0x1803d60d0` Any(predicate) 等效循环 |
| `contains-comparer.json` | `ev_f7e55ba2ab5a15c95300a1d8de93e90944741c7a535eb9ddf64c444924de59c7` | `0x18047e190` Contains(comparer) 等效循环 |
| `materialize.json` | `ev_d596aa3dd22ef5218a205b98ee519306ba811f4104598541014654bc7315fadc` | `0x18041fc30` new List<T>(source) |
| `../deep-download/refresh-cleanup-sequence.json` | `ev_942fda182a00886a8532bfe6e4e76dc47d0b6ddae19c7cad395d86bd8041c909` | `0x180518c60..0x180518dc4` 外层仅新下载为 true 才清理 |

`delete-old-files.json` 是早期以候选名保存的 `0x1804b5550..0x1804b5b20` 探查，**不是**最终确认的 `FileHelper.DeleteOldFiles`；它包含图像流保存工作。`file-helper-range.json` 是流复制及桌面个性化方法的补充探查。保留原名维护审计链，不以文件名作为身份依据。

最早一次 REA `pD` 文本探查在 120 秒超时，没有获得有效反汇编（Evidence ID `ev_34b134594d2b82dc0e3baac209ac1e0eea4cdc61dadf89f3e192b6dd92f8da7e`）；随后使用限定范围 `pDj` 成功。`contains-comparer` 和 `materialize` 首次格式化在范围尾部跨入下一函数的半条指令而遇到缺少 `disasm` 字段，原始 JSON 完整保存；格式化程序已容忍 `opcode=invalid`，从已有 JSON 重新渲染，没有重新运行或裁改原证据。相关核心函数本体均完整。

## 仍待限定的问题

1. `FileHelper.DeleteOldFiles` 空 catch 的精确托管异常类型尚未恢复；主 DLL PDB 不可用，标准 PE unwind 信息不足以回答。
2. 保存 archive 的托管虚调用 `0x180305620` 尚未单独恢复到方法槽，因此其 ReplaceExisting 为强推断；直接以原名打开、写入及缺少应用层 rename 事务是已见控制流。
3. `0x180518c60` 已补证下载/保存/条件清理顺序，但不能据此推出“每次启动必清理”；具体触发仍由主分析处理。
4. 未做网络故障、磁盘写入失败、非法 URL 或异常图像的运行时实验，因此中断后具体字节内容、文件系统缓存时序等均未测量。
