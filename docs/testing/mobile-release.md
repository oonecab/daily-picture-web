# 手机体验修复发布验收

日期：2026-10-19（Asia/Shanghai）；[问题 009](../../issues/009-mobile-release.md) / [计划 005](../../plans/005-mobile-release.md) / [里程碑 005](../../milestones/005-mobile-release.md)。

## 发布基线与场景

本地 macOS / Node v24.21.0；服务器 Linux / Node v24.22.0。Git 初始 main = origin/main = ec35db0；生产原 current 指向 `20261017-eb0c4d4`，Nginx 与 daily-picture 均 active。server.mjs 和 lib/bing.mjs 的本地/生产摘要相同。

| ID | 验收目标 | 结果 |
| --- | --- | --- |
| REL-01 | 登记语法、27 项回归、研究完整性检查 | check、27/27、研究 238 文件 / 432 引用通过，退出码均为 0 |
| REL-02 | 暂存文件边界、凭据扫描、提交、普通推送与远端 SHA | 待执行 |
| REL-03 | 运行包来自提交、服务器 SHA-256、运行环境回归 | 待执行 |
| REL-04 | 保留旧目录、原子切换、服务/回环/HTTPS 健康 | 待执行 |
| REL-05 | 公网运行文件摘要、手机全屏回退与页脚实际渲染 | 待执行 |
| REL-06 | 最终 Git HEAD/远端一致、生产运行树一致、工作区干净 | 待执行 |

## 额外工具与边界

本机 `validate_project.py --strict .` 报告 manifest 的 adoption、capabilities、consistency、paths、record_templates、workflow 为未知字段；仓库记录生成器 0.5.0，当前本机工具不支持该 schema。此项记录为工具不兼容，不计通过；替代核对原生 package 命令、consistency 文件/标记/JSON 事实、环境清单、文档链接及修改差异。

替代检查已通过：3 项原生 JSON 事实、7 项规则引用、环境变量清单、TECH 架构事实逐项一致；修改文档的 113 个相对链接存在；24 个候选文件的定向凭据模式扫描为 0 命中。此扫描不等同于完整安全审计。

本机 curl 对站点的 TLS 握手失败；服务器自身 HTTPS 返回 200，ego-browser 可打开正式域名。本轮公网页面与下载响应使用真实浏览器通道验证，并与服务端校验分开记录。不得将 curl 失败写为通过，也不改变证书验证。

## 发布记录

应用提交、发布目录、摘要与最终结果在实际执行后追加。本次在源代码提交后部署；若后续只追加验收文档，比较最终 HEAD 的运行文件与已部署版本，记录两者关系。
