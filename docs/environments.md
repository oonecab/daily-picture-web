# 环境事实

<!-- project-governance:managed:start -->
## 环境变量名

- PORT
- HISTORY_DIR
- HISTORY_REPOSITORY
- HISTORY_COLLECTOR

## 服务

- HTTPS www.bing.com / cn.bing.com：固定 Bing 归档和图片；浏览器直连历史大图，服务端按需读取与缩略图采集
- HTTPS bing.npanuhin.me：导入月索引与图片；海外已索引图片由服务器按需读取固定路径
- HTTPS raw.githubusercontent.com：本站自有数据分支；一次性导入时读取历史来源仓库
- HTTPS api.github.com：上述固定 JSON 文件的备用入口，无令牌且受访问限额约束
- GitHub Actions：每日从 Bing 采集并通过 GITHUB_TOKEN 写入同仓库 codex/wallpaper-data 分支
- 自部署 Nginx HTTPS 反向代理与 systemd；图片代理关闭额外缓存、缓冲落盘，配置见 docs/environments.md

## 端口与端点

- Node HTTP 默认 127.0.0.1:8787；CLI 数字参数优先于进程环境 PORT
- 自部署 HTTPS 通常使用 443，HTTP 80 重定向至 HTTPS；上游使用应用实际监听的回环端口

本文件严禁写入凭据或生产数据。`.env.example` 必须与环境变量名清单同步。
<!-- project-governance:managed:end -->

## 项目专属环境说明

本项目支持本机运行、隔离测试及通过 HTTPS 反向代理自部署。启动方式和公开访问入口见 [README](../README.md)。命令行数字端口优先，其次是进程环境 `PORT`，最后默认 8787；服务代码不自动读取 `.env` 文件。`.env.example` 仅登记变量名，复制为 `.env` 不会使它生效。

PowerShell 可用 `$env:PORT = '8788'` 设置当前进程环境，再 `npm start`；也可直接 `node server.mjs 8788`。这会改变浏览器来源，收藏/缓存不会自动迁移。平时使用固定地址。

运行时图片缓存位于 `.cache`，历史索引默认位于 `.history`（`HISTORY_DIR` 可指定绝对路径，或相对项目根路径）；浏览器数据由浏览器同源存储管理。Node 测试使用独立系统临时目录和端口。Python 校验不联网，也不执行研究快照里的历史脚本。

## 自部署配置要求

以下为通用要求，具体实例配置由部署者私下维护。

- 入口：反向代理终止 TLS，将 HTTP 重定向到 HTTPS。应用保持回环监听，转发 `Host` 使用 `127.0.0.1:<应用端口>`，与应用实际端口一致并保留 Host 白名单。
- 服务：使用满足 [package.json](../package.json) 兼容基线的 Node.js，由服务管理器设置 `PORT`。服务单元名、执行文件位置和运行账户按部署环境确定。
- 应用：采用独立版本目录和稳定的当前版本入口，切换前保存旧目标及配置快照。
- 状态：把 `.cache` 连接到独立持久化目录；为历史索引设置稳定的 `HISTORY_DIR` 或持久化 `.history` 链接，服务账户需可写，并单独备份。一个历史目录仅允许一个服务进程写入；服务账户仅有必要的读取和缓存写入权限，应用代码由部署管理者维护。浏览器收藏、偏好仍属于各自同源存储。
- 服务限制：按宿主能力配置只读文件系统、禁止提权、隔离临时目录及最小写入范围。

发布步骤见 [deployment.md](deployment.md)，历史验证结论见 [手机修复发布验收](testing/mobile-release.md)。实例的管理地址、账户、服务名、绝对路径、运行时精确版本和配置快照存放于私有运维记录。仅供本机使用的副本可放入 Git 忽略的 `.private/`，发布前按[安全规范](governance/SECURITY.md)检查文档与附件。

1.2.0：服务运行时启动即采集中国区每日索引，此后每轮结束一小时再采集；不依赖浏览器打开，不另建系统定时任务。停止进程则停止采集。历史目录不得置于版本发布目录内后随旧版本清理；不将运行时索引或图片提交到源码仓库。

1.3.0 增加上述 GitHub 原始文件域名的出站只读访问；环境变量、端口与单进程持久化约束不变。schemaVersion 1 的历史文件可直接沿用，逐来源新鲜度是可选新增字段。

1.3.1 原始文件入口出现传输异常时，可在同一请求预算内使用 GitHub 官方 API。增加只读出站域名，环境变量、端口与持久化目录不变。

## 自有图库运行配置（当前 1.6.0）

`HISTORY_REPOSITORY` 为 `owner/repository`，默认 `oonecab/daily-picture-web`；fork 后填写自己的仓库。只读取固定 `codex/wallpaper-data/latest.json` 和 `codex/wallpaper-data/markets/<允许地区>/latest.json`，不能设置任意 URL。`HISTORY_COLLECTOR=off` 关闭当前服务后台同步，适用于隔离验证；其他值或未设置时启用。不影响 GitHub Actions 定时任务。

服务启动及每轮结束一小时后顺序同步自己的六地区数据分支文件，随后从 Bing 获取缺失缩略图，校验并保存到 `HISTORY_DIR/media`。历史预览和原图按需从 Bing 加载。Actions 每日计划北京时间 05:17 执行，允许手动触发；使用 GitHub 自动提供的 GITHUB_TOKEN，仅授予同仓库 contents:write，不需要 SSH 或额外 Secret。新 fork 需启用其 Actions 定时工作流；首次执行会创建数据分支。运行中断超过最近十五日窗口的缺口无法保证补回。

安装使用 `npm ci`，必须在目标 OS/架构安装 Sharp 原生组件，不能复制 macOS node_modules 到 Linux。索引、缩略图及受保护副本需备份；临时图片统一按 256 MiB 预算淘汰。正式服务保持单进程；导入工具在隔离目录续跑，停服务后迁移并保留旧目录用于回滚。以上为当前事实，前述版本段落为迁移历史。

## 1.5.0 浏览器直连与缓存边界

应用 CSP 的 img-src/connect-src 允许 self、https://www.bing.com 与 https://cn.bing.com；不得配置任意远端图片代理。反向代理沿用应用 CSP，避免另加仅允许同源的策略阻断直连。应用保持 Host 白名单和回环监听。

应用的 .cache/images 是全部服务端临时图片的统一存放处，上限 256 MiB。Nginx 图片代理设置 proxy_buffering off、proxy_max_temp_file_size 0，并关闭 proxy_cache，避免在应用预算以外产生缓存或慢客户端下载临时文件。索引和永久缩略图、受保护原图不计入临时缓存预算。

环境变量名与端口保持不变；迁移工具必须在停止写入进程后运行，备份文件及逐图报告置于私有路径。

## 1.6.0 多地区配置

不增加环境变量、服务或端口。已有 HISTORY_DIR 根继续用于中国，海外使用其 markets/<market>/ 子目录；服务账户需具有同等写权限。海外归档图片由服务器出站访问 bing.npanuhin.me，浏览器 CSP 无需增加该站。导入请使用独立暂存目录，完成逐文件验证后停服务接入；不覆盖中国历史目录。10 GiB 空间停止阈值属于 tools/import-regions.mjs，日常全部地区临时图片缓存仍共用 256 MiB。

Windows 使用 PowerShell 执行，远程 Linux 的部署脚本应保存为 LF；实例凭据、绝对部署路径、日志及图库留在私有运维目录。

1.6.0 真实上游连接验证发现，较慢跨境链路可在 Node 默认地址尝试时间内尚未连通。使用原生 fetch 的服务与导入进程将全进程 TCP 地址尝试时间下限设为 2000ms，保留 IPv4/IPv6 自动选择；更高的已有设置不降低。单请求总预算、TLS 验证和主机白名单不变，无新增环境变量。API 依据 [Node net 文档](https://nodejs.org/api/net.html#netsetdefaultautoselectfamilyattempttimeoutvalue)，本次实际运行时原值为 250ms。
