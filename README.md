# Daily Picture · 每日一景

依据本工作区 Daily Picture 1.4.13.0 行为与架构分析独立实现的本地 Web 应用。界面、服务和缓存均为新实现；不依赖已安装的 UWP 应用，也不读取它的设置或图片目录。

## 启动

需要 **Node.js 22 或更高版本**，首次启动前执行 `npm ci` 安装锁定的 Sharp 图片处理依赖，无构建步骤。当前版本在 macOS / Node.js 24.21.0 验证；Windows 启动器需先完成依赖安装。

Windows 双击本目录的 **`start.cmd`**。服务就绪后会打开默认浏览器；保持命令窗口开启，关闭窗口或按 `Ctrl+C` 停止。

首次获取项目并启动（PowerShell 或其他终端）：

```powershell
git clone https://github.com/oonecab/daily-picture-web.git
cd daily-picture-web
npm ci
npm start
```

打开 [http://localhost:8787](http://localhost:8787/)。请通过该地址使用应用，不要直接双击 `public/index.html`。Node 服务只监听 `127.0.0.1`；已配置的公网实例通过 Nginx 提供 [HTTPS 访问](https://dailypicture.zzzping.top/)，部署环境与回滚方式见 [发布说明](docs/deployment.md)。

端口被占用时可执行 `node server.mjs 8788`，然后打开对应端口。浏览器按来源（包含端口）隔离收藏与缓存；长期使用建议保持同一地址。启动器支持 `start.cmd 8788` 和用于验证的 `start.cmd --no-open`。

## 已实现

| 功能 | 行为 |
| --- | --- |
| 中国区历史 | 从 2018 年 9 月起按年/月浏览，单月最多 31 项；缩略图进入视野后加载，保留第三方来源和摄影版权 |
| 持续索引 | GitHub Actions 每日从 Bing 采集；本站后台同步并持久保存原图、缩略图和预览 |
| 每日精选 | 并行请求两批 Bing 归档，合并去重后展示最近十五日、最多 15 张图片，保留日期、标题、说明及摄影版权 |
| 地区切换 | 中国、美国、英国、日本、德国、法国；显式传递 `mkt`，实际内容以 Bing 返回为准 |
| 浏览 | 缩略图、左右切换、手机横向滑动、全屏、完整比例显示；原生全屏不可用时自动进入网页视口看图模式 |
| 幻灯片 | 每 8 秒切换；页面隐藏、打开弹窗或手动切换时停止 |
| 收藏 | 当前浏览器保存最多 200 张的图片信息，刷新后保留，同源多标签页同步 |
| 下载 | 1920×1080、UHD、1080×1920；真实尺寸取决于 Bing 响应 |
| 图片详情 | 保留原始版权说明，提供 Bing 原始介绍链接 |
| 定时刷新 | 页面可见时每分钟检查是否超过一小时；重新可见、恢复联网时补查 |
| 缓存与离线 | 本地服务缓存元数据和 JPEG；Service Worker 保存应用外壳和已请求的图片；失败回退明确标记 |
| 无障碍与适配 | 语义按钮、模态对话框、焦点反馈、图片替代文字、状态播报、减少动画偏好、手机布局 |
| 项目源码 | 首页页脚提供 GitHub 仓库链接，在新标签页打开 |

快捷键：`←` / `→` 切换，`L` 收藏或取消，`F` 全屏，`Esc` 退出对话框/全屏。

## 浏览历史壁纸

点击“历史壁纸”，在年月选择栏中选择年份和月份；支持原生菜单和键盘操作。可查询范围从 **2018 年 9 月**起，首月最早收录为 **2018-09-11**。网站只读取本站保存的月索引及图片，缺档会明确提示。

历史数据**一次性导入**自以下两个项目，来源声明长期保留在网站“关于每日一景”、图片详情和本文档：

| 项目 | 初次导入的贡献 |
| --- | --- |
| [zxyongyo/bing-daily-wallpaper](https://github.com/zxyongyo/bing-daily-wallpaper) | 2018-09 起的中国区历史索引、摄影署名和 Bing 图片链接 |
| [npanuhin/Bing-Wallpaper-Archive](https://github.com/npanuhin/Bing-Wallpaper-Archive) | 2024-04 起的中国区月索引、图片说明与可用图片备份 |

历史浏览直接访问本站图库，不再访问这两个项目。列表只读取所选月份；缩略图进入视野后最多两张并行加载，实际宽度上限 640 像素；主图使用宽度上限 1920 像素的预览，点击下载才取原图。三者独立存储、独立缓存；小图不会放大。下载标注原图实际尺寸，链接中的 4K 字样不代表原生 4K 细节。

新增索引由 [GitHub Actions](.github/workflows/collect-wallpapers.yml) 每日计划在北京时间 05:17 从 Bing 获取最近十五日并按日期合并（同日多版本取最新发布）到本仓库的 `codex/wallpaper-data` 分支，支持手动运行；调度可能延迟。网站服务启动及每轮结束一小时后同步该分支，并从 Bing 下载尚未保存的图片。历史文件存于 `HISTORY_DIR`，图库原图不参与临时缓存淘汰。重复执行不会重复下载已校验的图片；失败记录和待重试状态保留。超过 48 小时未更新会显示提示。

初次导入必须使用隔离目录；不要与运行中的服务同时写一个目录：

```sh
node tools/import-history.mjs --history-dir /path/to/staging-history
```

可选 `--from 2018-09 --through 2026-10` 限定月份、`--indexes-only` 仅导入索引、`--source-dir /path/to/bing-daily-wallpaper` 读取该仓库本地的月文件。导入断点在已保存的月文件和媒体清单中，重新执行即可复用；`import-report.json` 记录成功、失败与链接冲突隔离项。异常退出留下 `.import.lock` 时，确认该导入进程已经结束后再移除锁。恢复重试同样在隔离目录操作；保留旧目录后切换，详见 [部署](docs/deployment.md)。

图片入库检查 HTTP 类型、20 MiB 上限、JPEG 结构与完整解码、40 百万像素上限，并记录 SHA-256 和实际尺寸；无法获取的图片保留索引。校验不等于逐图人工语义核对。两项目软件许可证均为 MIT，摄影作品和说明仍归各自权利人；见 [第三方声明](THIRD_PARTY_NOTICES.md)。规则、接口和证据见 [历史规则](docs/rules/history.md)、[契约](docs/contracts/history.md)、[自有图库验收](docs/testing/owned-history.md)。

## 与原应用的对应和差异

参考 [架构总览](docs/reverse-engineering/source/ARCHITECTURE.md)、[网络与下载](docs/reverse-engineering/source/docs/network-and-download.md)、[数据与存储](docs/reverse-engineering/source/docs/data-model-and-storage.md) 和 [计时器与清理](docs/reverse-engineering/source/docs/timers-and-disposal.md)。

- 保留 Bing 归档 → 图片列表 → 展示/下载的核心流程。原应用前台默认取得 7 张；Web 版使用 `idx=0&n=8` 和 `idx=7&n=8` 两批请求，按图片 ID 去重、日期降序排列，最多保留 15 张。将原模板的 HTTP 升级为 HTTPS。
- 原应用请求未显式指定市场；网页版提供显式市场选择。日期优先将 `fullstartdate` 作为 UTC 发布时刻转换为该市场时区，同时保留原始字段。仅有 `startdate` 时才直接使用它。
- 原应用仅在实际下载新图片后写入归档；本版独立提交元数据，因此标题、版权或顺序变化也会更新。
- 同一市场或同一图片的在途请求合并。切换地区会取消前端旧请求并丢弃迟到结果，避免旧地区覆盖新选择。
- 页面隐藏时停止幻灯片和刷新检查，页面恢复后按需重新建立。卸载时取消在途归档请求、停止计时器并释放下载对象 URL。
- 普通网页没有直接设置 Windows 桌面/锁屏的标准接口。本版提供下载，由用户在系统设置中应用图片。
- 没有实现 Windows 后台任务、动态磁贴或系统锁屏；中国区每日索引由 Node 服务在页面关闭后继续采集，前提是服务仍运行。原生集成需要另加桌面程序或本机辅助服务。
- 每日精选的十五日窗口依据 Bing 当前返回能力；历史标签另外提供中国区已收录的年月记录，仍不保证每一天完整；上游少于 15 张时显示实际数量。收藏保存图片标识与说明，不能保证 Bing 永久提供远端历史图片。

## 数据位置与失败行为

- `.cache/archives/<market>.json`：各市场最后成功归档，在线缓存有效期 15 分钟；手动刷新跳过有效期，同市场实际刷新间隔至少 30 秒。冷却期间复用上次结果并提示稍后再试。两批归档均通过校验后，写临时文件并重命名提交；任一批失败都不会覆盖完整旧缓存。升级后旧七张缓存会重新获取，失败时仍以 `stale: true` 回退；启动时跳过损坏缓存。
- `.history/YYYY-MM.json` 与 `.history/media/`：独立持久化月索引、原图、缩略图及预览；可由 `HISTORY_DIR` 指定目录。跨版本保留并独立备份，只允许一个服务进程写入。Actions 记录保存在自己的数据分支；Bing 近期窗口之外的遗漏不能自动补回。
- `.cache/images/`：缓存 JPEG，清理目标为最多 140 项、总计不超过 256 MiB，按写入时间移除旧项。没有读取原应用的图片缓存。
- 浏览器 `localStorage`：收藏、偏好、上次归档。清理此网站的数据会清除这些内容；没有账号或跨设备同步。
- 浏览器历史索引缓存：最多保存 13 个年月目录/月度请求条目；只对已访问且未淘汰的月份提供离线回退。
- 浏览器 Cache Storage：应用外壳、按地区的归档、最多 80 个且图片响应体合计不超过 64 MiB 的图片尺寸版本。1.4.1 更新外壳缓存版本，保留收藏、偏好及归档/图片缓存；图片缓存渐进整理。存储空间不足时清理旧图片并有限重试，仍失败会提示离线保存不可用。收藏不会永久固定图片字节；未成功缓存或已被淘汰的图离线时不能显示。
- 外壳请求在网络异常、5xx 或等待超过 5 秒时使用已有缓存；恢复联网后更新。没有预先缓存的资源仍需联网获取。
- 首次使用需要联网；Bing 网络异常时保留现有列表，显示缓存或重试提示。单张图片失败提供重试入口，不用样例图代替真实结果。
- Service Worker 依赖安全上下文，`localhost` 可用。安装按钮仅在浏览器发出安装事件时显示；未验证安装为操作系统应用。

浏览器机制参考：[MDN 同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) 与 [PWA 离线和后台运行](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)。Bing 接口实测没有 `Access-Control-Allow-Origin`，因此通过本地服务转发固定 Bing 端点，避免让页面跨域读取归档。

## 结构与接口

```text
daily-picture-web/
  server.mjs              Node HTTP 服务、静态文件和路由
  lib/bing.mjs            Bing 请求、验证、日期、缓存和并发合并
  lib/history.mjs         历史月度索引、持续采集和固定归档适配
  lib/jpeg.mjs            旧图 JPEG 结构与尺寸检查
  lib/media.mjs           持久化原图、缩略图、预览及完整解码
  lib/owned-index.mjs     自有数据分支同步与后台图片保存
  tools/import-history.mjs 一次性历史导入
  tools/collect-index.mjs  GitHub Actions 每日索引采集
  public/index.html       页面和对话框
  public/styles.css       桌面/手机样式
  public/app.js           浏览、收藏、下载、计时器和偏好
  public/sw.js            离线缓存
  public/manifest.webmanifest
  test/app.test.mjs        Node 内置测试
  start.cmd               Windows 启动入口
```

| 路径 | 用途 |
| --- | --- |
| `GET /api/health` | 服务名称、版本和就绪检查 |
| `GET /api/markets` | 支持的市场和时区 |
| `GET /api/archive?market=zh-CN` | 归档；`refresh=1` 跳过 TTL，仍遵守市场刷新冷却 |
| `GET /api/history` | 中国区可查询年月目录和索引采集状态 |
| `GET /api/history?month=2024-04` | 读取本站一个月索引；refresh=1 重新读取本站数据 |
| `GET /api/history/image?date=2024-04-03` | 本站已保存的图片；size=thumb / preview / original（默认）；download=1 下载 |
| `GET /api/image?id=OHR.…&size=1920x1080` | 固定来源图片；`download=1` 添加下载响应头 |

仅允许明确的市场、`OHR` 图片标识和四种尺寸（含 `640x360` 缩略图），不接受任意远端 URL。上游设置超时、体积限制与 JPEG 验证；不跟随远端重定向。每批归档或单张图片在连接失败和 HTTP 408/429/5xx 时最多重试一次；两批并行归档及其重试共用 20 秒时限，图片请求及其重试使用独立的 20 秒时限。仍失败则回退缓存或返回明确错误。静态文件使用明确白名单，不暴露 `.cache`、分析证据或其他工作区文件。

上游操作共用 4 个执行槽和 32 个等待位置，排队包含在原超时预算内；队列满时返回 503 与重试时间，有旧归档仍可回退。静态页面、脚本和样式提供 ETag，内容未变化的条件请求返回 304，减少重复传输。详细规则见 [缓存与资源限制](docs/rules/cache.md) 和 [HTTP 边界](docs/rules/catalog.md)。

## 验证

```powershell
npm run check
npm test
```

自动测试覆盖日期与归档完整性、来源和 HTTP 边界、并发与队列/时限、刷新冷却、ETag/304、外壳失败回退、图片存储配额/预算、缩略图节点与焦点，以及原有全屏和浏览器生命周期。DOM、Cache Storage 与异常配额使用隔离替身；真实浏览器交互、升级兼容与负载证据见 [1.1.1 验收](docs/testing/cache-resource-reliability.md)。这些测试不代替真实手机或长期公网运行验证。

1.1.0 的真实 Bing、桌面/手机宽度及缓存升级验收见 [最近十五日验证](docs/testing/fifteen-day-archive.md)；初版历史记录见 [VERIFICATION.md](VERIFICATION.md)。

手机全屏与页脚修复见 [2026-10-19 验证记录](docs/testing/mobile-fullscreen-footer.md)。点击图片右上角全屏按钮即可欣赏完整比例图片；浏览器不提供或拒绝原生全屏时，自动铺满网页可用视口，点击右上角关闭按钮返回原阅读位置。键盘支持 F 切换、Esc 退出。手机地址栏与系统状态栏由浏览器控制，网页回退模式不能强制隐藏；横屏可为横向照片提供更大的显示面积。

## 参与与反馈

欢迎通过 [Issue 模板](https://github.com/oonecab/daily-picture-web/issues/new/choose)反馈问题或提出建议。参与开发请先阅读[贡献指南](CONTRIBUTING.md)与[行为准则](CODE_OF_CONDUCT.md)；安全问题请按[安全政策](SECURITY.md)私密报告。

## 许可证与来源

项目自行实现的代码及自行撰写的项目文档采用 [MIT License](LICENSE)，允许使用、修改、分发和商用，并要求保留版权与许可证声明。版权行使用 `Daily Picture Web contributors`。

Bing 摄影作品及上游内容、原生应用内容，以及 `docs/reverse-engineering/source/` 中的原始研究快照不纳入本项目 MIT 授权范围；具体说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。图片权利归原摄影师及相应权利人。

这份实现保留来源与版权信息，与原 Daily Picture 作者、Duracellko.NET 及 Microsoft 没有隶属关系。研究导航见 [REA 资料说明](docs/reverse-engineering/README.md)。

## 免责声明

- **非官方项目**：本项目为独立实现的开源 Web 应用，与 Microsoft、Bing、原 Daily Picture 作者及 Duracellko.NET 没有隶属、合作或背书关系。相关名称、商标和标志的权利归各自权利人所有。
- **第三方内容权利**：Bing 图片、版权说明、原应用内容及研究快照的权利不因本项目开源而转移。项目的 MIT 许可证不授予这些内容的使用、商用或再分发许可；下载、缓存或展示功能也不代表获得相关授权。使用这些内容时，应自行确认适用许可并保留来源与版权信息，具体范围见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- **上游服务与数据**：本项目依赖 Bing 的外部接口和图片服务，无法控制其内容、更新频率、地区差异、访问限制或服务变更。不保证接口持续可用、始终返回完整十五日图片、图片长期可访问，或所有元数据与分辨率准确完整。收藏和缓存不等同于永久备份，重要内容应在取得相应许可后自行备份。
- **使用与部署责任**：使用者及部署者应遵守适用法律、第三方内容许可和相关服务条款，包括适用的 [Microsoft 服务协议](https://www.microsoft.com/zh-cn/servicesagreement/)。自行部署时，应根据实际环境配置访问控制、HTTPS、安全更新和数据备份；本项目提供源码不构成对某个部署环境安全性或合规性的保证。
- **按现状提供**：在适用法律允许的范围内，本软件按“现状”提供，不提供明示或默示担保；作者及版权持有人的责任限制以 [MIT License](LICENSE) 原文为准。本声明不变更 MIT 对项目自有代码的授权，也不排除或限制依法不得排除或限制的责任。
