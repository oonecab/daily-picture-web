# 手机体验修复发布验收

日期：2026-10-19（Asia/Shanghai）；[问题 009](../../issues/009-mobile-release.md) / [计划 005](../../plans/005-mobile-release.md) / [里程碑 005](../../milestones/005-mobile-release.md)。

2026-10-20 公开范围调整：实例账户、服务名、绝对路径、运行时精确版本及版本目录标识转存私有运维记录；以下保留原验收日期、提交、摘要、结果和限制，未重新执行部署验证。

## 发布基线与场景

本地 macOS / Node v24.21.0；服务器 Linux / Node，满足 package.json 兼容基线。Git 初始 main = origin/main = ec35db0；已核对原 current 目标，反向代理与应用服务均 active。server.mjs 和 lib/bing.mjs 的本地/生产摘要相同。

| ID | 验收目标 | 结果 |
| --- | --- | --- |
| REL-01 | 登记语法、27 项回归、研究完整性检查 | check、27/27、研究 238 文件 / 432 引用通过，退出码均为 0 |
| REL-02 | 暂存文件边界、凭据扫描、提交、普通推送与远端 SHA | 24 文件定向扫描 0 命中；3f1bfd5 经 SSH 正常推送，main SHA 读回一致 |
| REL-03 | 运行包来自提交、服务器 SHA-256、运行环境回归 | 13 个源文件和 RELEASE.json 摘要通过；服务用户语法检查及 27/27 回归通过 |
| REL-04 | 保留旧目录、原子切换、服务/回环/HTTPS 健康 | 新版已激活；两服务 active；回环和 HTTPS health 正常；旧版本与配置快照保留 |
| REL-05 | 公网运行文件摘要、手机全屏回退与页脚实际渲染 | 6 个 HTTPS 响应摘要匹配；手机回退与桌面原生全屏、切图、恢复、页脚入口通过 |
| REL-06 | Git HEAD/远端一致、生产运行树一致、工作区干净 | 应用提交三方 SHA 一致且工作区干净；13 个源文件逐项匹配。后续仅追加本验收文档，最终记录提交读回随交付报告 |

## 额外工具与边界

本机 `validate_project.py --strict .` 报告 manifest 的 adoption、capabilities、consistency、paths、record_templates、workflow 为未知字段；仓库记录生成器 0.5.0，当前本机工具不支持该 schema。此项记录为工具不兼容，不计通过；替代核对原生 package 命令、consistency 文件/标记/JSON 事实、环境清单、文档链接及修改差异。

替代检查已通过：3 项原生 JSON 事实、7 项规则引用、环境变量清单、TECH 架构事实逐项一致；修改文档的 113 个相对链接存在；24 个候选文件的定向凭据模式扫描为 0 命中。此扫描不等同于完整安全审计。

本机 curl 对站点的 TLS 握手失败；服务器自身 HTTPS 返回 200，ego-browser 可打开正式域名。本轮公网页面与下载响应使用真实浏览器通道验证，并与服务端校验分开记录。不得将 curl 失败写为通过，也不改变证书验证。

## 发布记录

- 应用提交：[3f1bfd54863c87b9af020b0b8672f98584658065](https://github.com/oonecab/daily-picture-web/commit/3f1bfd54863c87b9af020b0b8672f98584658065)。首次 HTTPS 推送因本机缺少凭据退出；现有 SSH 身份验证后正常推送成功，未重写远端历史。
- 激活版本：来自上述应用提交的独立版本目录；current 与运行进程 cwd 均指向该目录，实际位置保存在私有运维记录。
- 运行包 SHA-256：`5f1802f49ca0924b4d8e4fae2d6a294feee5888ad3d770b0bd6dab7a938f5305`。包从 git archive 生成，排除开发缓存和本地配置。
- 激活时间：2026-10-19 21:47:36（Asia/Shanghai）。重启后的第一次就绪探测暂时拒绝连接，重试成功；最终 health 为 ok=true、app=daily-picture-web。应用版本字段仍为 1.1.0，发布身份以提交和文件摘要判定。
- 服务使用专用账户并保持回环监听；反向代理和应用 active。激活后目标服务 warning 级别日志无条目。服务与反向代理配置摘要与发布前一致。
- 回滚材料：已保存旧版本目标、配置快照、配置摘要与本次包，具体位置保存在私有运维记录；`.cache` 继续指向既有持久化状态目录。

正式域名的 `/`、`/app.js`、`/styles.css`、`/sw.js`、`/icon.svg`、`/manifest.webmanifest` 均通过浏览器 HTTPS 取得并计算摘要，与发布 Git 文件一致。重点文件为：

| 文件 | SHA-256 |
| --- | --- |
| public/index.html | b8b2f9fcc8a44b32ad0ab9118121e3406b1e7ffa0c18a329476cd511ec6943e9 |
| public/app.js | f4d53d399503f75fc19951540ab614d36688b69712d52e1e393550c8c1f36b0c |
| public/styles.css | 7ff587a5af8ec02825e0cf428b7a91edca43174382048bfecbeb3d0d20f5cd17 |

浏览器实际显示 15 张图片，主图解码为 1920×1080。模拟全屏接口缺失后，393×852 视口内 gallery 覆盖完整可用区域、图片 contain、退出按钮可见，切图由 01/15 到 02/15。退出后 scrollY 从 160 恢复到 160，焦点回到全屏按钮，背景解除锁定。页脚宽度无溢出，三个入口高 44px，SVG 和链接属性正确，关于弹窗开关正常。桌面 1280×900 的 document.fullscreenElement 为 gallery，实际 Esc 后退出并解除锁定。

截图已实际查看；本机附件位于忽略目录 `test-output/release-20261019/`，包括 `public-mobile-fullscreen.png`、`public-footer.png`、`public-evidence.json` 和 `server-readback.txt`。手机路径为 Chromium 的尺寸/接口模拟，实体 iPhone 仍需用户设备复核。

发布后只追加问题、计划、里程碑与本验收记录；最终交付前再次比较 HEAD 的全部 13 个运行包源文件与已发布摘要，核对远端及干净工作区。此类记录提交不改变运行文件。

2026-10-20 身份统一补充：本文保留当时的提交号与验收事实；当前历史对应及账号关联见 [身份修正验收](git-identity-correction.md)。
