# Daily Picture 本机持久化状态取证

证据编号：`DP-LOCAL-STATE-20261017`。采集时间：北京时间 **2026-10-17 16:32:01**。此编号是本地辅助证据编号，不冒充 REA MCP Evidence ID。

范围限定为：`C:\Users\wangq\AppData\Local\Packages\14403Duracellko.NET.BingImageoftheDay_1wy5t1va6xay4`，另读取 `HKCU\Control Panel\Desktop\WallPaper` 以核对该应用的壁纸文件。应用数据、注册表与设置均未写入；未启动应用、未挂载 hive、未复制或恢复 hive/事务日志、未扫描已删除记录。分析输出仅写到本目录。

完整文件清单、绝对路径、SHA-256、字节数、UTC/北京时间、图像真实格式与尺寸、hive 节点和值的文件偏移见 `local-state.json`；复现程序见 `inspect_local_state.py`。`ImageArchive.observed.json` 是读取到的普通 JSON 原字节副本。16 个文件共 **3,162,219 bytes**，每个文件在本次采集后的二次读取 SHA-256 均相同。此检查表示逐文件读取稳定，不表示跨文件原子快照。

## 已观察到的状态

| 文件/位置（相对应用数据根） | 观察 | 可支持的结论与边界 |
|---|---|---|
| `LocalState\ImageArchive.json` | 1,403 bytes；JSON 根仅有 `images` 数组；7 项，每项仅 `url` 和 `copyright` | 持久化的图片列表结构得到确认。该文件没有图片日期、分辨率字段、下载状态或完整 API 响应字段。无法仅由这些记录确定刷新算法。 |
| `LocalState\Images` | 7 张真实 JPEG，均为 1920×1080 RGB；名称均含 `EN-US` | 缓存与 JSON 七项一一对应。当前文件集合不等于证明程序的缓存上限恒为 7。 |
| `LocalState\Wallpaper\OHR.SneffelsAutumn_EN-US3953128777_1920x1080.jpg` | 340,562 bytes；与 `Images` 目录同名文件 SHA-256 完全相同 | 壁纸副本与缓存副本字节一致。 |
| `HKCU\Control Panel\Desktop\WallPaper` | 当前存储的路径指向上述 Wallpaper 文件 | Windows 当前配置的壁纸文件来自此应用目录；未观察桌面刷新过程或截取桌面以确认最终显示。 |
| `LocalState\LiveTiles\OHR.ChauvetPaintingsFrance_ZH-CN3150703955_1920x1080.jpg` | 文件扩展名为 `.jpg`，实际内容是 **PNG，310×150 RGB**，86,602 bytes | 图块资源与普通缓存图不同，真实格式/尺寸以解析结果为准。文件保留了原图命名，但已不是名称声称的 1920×1080 JPEG。生成算法需代码侧核对。 |
| `LocalState\LockScreen\OHR.BigMoon_ZH-CN2508603883_1920x1080.jpg` | JPEG，1920×1080 RGB，333,773 bytes；mtime 为北京时间 2025-07-20 13:07:27 | 有旧锁屏资源留存；不能据此声称它仍是当前锁屏或自动锁屏更新仍开启。 |
| `Settings\settings.dat` | 8,192 bytes，REGF hive；两个 sequence 均为 1689；header checksum 正确 | 可读且本次解析检查通过，仍只是磁盘中已持久化的状态，不包含可能尚未写盘的设置。 |
| `Settings\settings.dat.LOG1` / `.LOG2` | 分别 16,384 / 8,192 bytes；mtime 均为 2023-11-03 | 只登记文件身份，未重放、恢复、解析日志。它们不是本次发现的应用运行文本日志。 |

`LocalState\Images` 七张图的 mtime 为北京时间 2026-10-17 00:58:14–00:58:17。JSON 的 mtime 为 00:58:17。LiveTiles 文件的 mtime 为同日 10:59:25。不同目录中的 `EN-US` 和 `ZH-CN` 命名确实并存，但本机状态证据本身不解释地区选取或前后台更新机制。

## 截图对应图片

图片数组首项是 `/th?id=OHR.SneffelsAutumn_EN-US3953128777_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp`。其说明文本是：

> Mount Sneffels in the San Juan Mountains near Ridgway, Colorado (© lightphoto/Getty Images)

这与用户截图底部文字一致，结合本地同名图片可定位截图所示条目。图片字节 SHA-256 为 `9652c212d8afe26ca878ae6d27229064156e7e26e377eb2452c60c9a1c24c95a`。JSON SHA-256 为 `c3be13096bc893f9cba52998905b70273187a88bb7008e909a692d066aab828b`。

## settings.dat 的只读解析结果

只遍历 REGF 根指针可达的已分配节点；未按字符串搜索自由空间，也未试图恢复旧设置。

- 根 `Test`，文件 cell 偏移 `0x1020`：2 个子键，0 个值。
- `Test\LocalState`，cell 偏移 `0x1208`：0 个子键，**1 个值**。
- `Test\RoamingState`，cell 偏移 `0x1290`：0 个子键，0 个值。

唯一存储值：

| 字段 | 内容 |
|---|---|
| 名称 | `CurrentLiveTileImageUrl` |
| 类型原值 | `0x05f5e10c`，UWP UnicodeString |
| VK cell 文件偏移 | `0x1108` |
| 数据文件偏移 | `0x14ac` |
| 数据长度 | 200 bytes，UTF-16LE 零结尾字符串及末尾 8-byte FILETIME |
| 解码值 | `/th?id=OHR.ChauvetPaintingsFrance_ZH-CN3150703955_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp` |
| 值更新时间 | 北京时间 **2026-10-17 10:59:25.425536**，与 LocalState 节点 last-write 相同 |
| hive SHA-256 | `75d55a133159507db99a68371374229b55f6e21277293822f9da4761e1870707` |

格式解释核对了 [python-registry 的 RegistryParse.py](https://github.com/williballenthin/python-registry/blob/master/Registry/RegistryParse.py)：其设置值类型取低 12 位，`0x10c` 为 UnicodeString，并把末尾 8 bytes 解释为设置时间戳。没有安装或执行该第三方工具；本目录程序保留了实际解码过程、原值字节和偏移，便于复核。

REGF header 与根/空 RoamingState 节点仍含 2012 年的记录时间，明显不同于 LocalState 中 2026 年的值更新时间。不得用这个 header 时间声称此程序最后运行于 2012 年。

## 剩余未知

- 这里只证明当前落盘 hive 中没有其他可达设置值，不能判定默认地区、自动壁纸、自动锁屏、图片分辨率或下载策略。默认值应从代码/资源或真实 UI 读取。
- 没有 HTTP 抓包，不能把已存 URL 当成这次会话里观察到的网络请求。
- 没有验证后台任务注册、定时唤醒、网络错误重试及其当前执行状态。
- 未确认当前锁屏界面；也未把旧锁屏图片时间解释为错误、停用或权限问题。
- 此分析没有更改任何壁纸、锁屏、设置或应用文件。
