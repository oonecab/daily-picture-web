# 公开环境文档验收

日期：2026-10-20（Asia/Shanghai）。关联：[问题 011](../../issues/011-public-environment-docs.md)、[计划 007](../../plans/007-public-environment-docs.md)、[里程碑 007](../../milestones/007-public-environment-docs.md)。

## 基线、范围与场景

初始工作区干净，main 为 `befde16`。用户截图及原文显示 Bing 自动链接包含后续中文说明；源码检查确认生产实例明细散落在多个文档中。公开边界由[安全规范](../governance/SECURITY.md)定义；公式、单位、日期、状态及 API 规则均不变，无需新增应用行为测试。

| ID | 验收目标 | 结果 |
| --- | --- | --- |
| DOC-01 | GitHub 中 Bing 链接文字与目标准确，说明文字在链接外 | GitHub Markdown API 及主分支实际 DOM 均通过；1440×1050 视口的服务段和自部署段截图已查看 |
| DOC-02 | 当前文件移除已识别实例标识，私有副本被忽略；历史验证结论保留 | 331 个候选文件定向扫描无命中，原版本有 28 处命中；8 份原始副本摘要一致且被 Git 忽略；历史结论与失败逐项保留 |
| DOC-03 | manifest、环境文档、变量清单一致，本地链接有效 | 103 个相对链接、3 项原生 JSON 事实、7 项规则引用及环境/安全清单一致性检查通过 |
| DOC-04 | 语法、Node 回归、研究快照完整性检查 | check 通过；27/27 回归通过，0 失败/跳过；研究 238 文件、432 内部引用通过 |
| DOC-05 | 作者/提交者及推送账户正确，远端与本地一致 | 79064fc 的作者/提交者符合指定身份，SSH 账户为 oonecab；普通推送成功，HEAD/origin/main/远端 main 一致，追加本记录前工作区干净 |

## 证据边界

本次检查公开文档及 Git 交付，不重验生产运行状态。研究原始快照继续由既有摘要校验保护。实例标识和凭据模式扫描不能替代完整安全审计；当前文件清理不能移除历史提交中的原文。

## 执行记录

本机 macOS / Node v24.21.0 / Python 3.14.6，已执行 `npm run check`、`npm test`、`python3 -X utf8 tools/verify_research.py`，退出码均为 0。Python 命令使用本机可用的 `python3`，执行同一登记脚本；研究原工作区未比对，原生程序未运行。

维护检查覆盖 20 个变更文件，确认应用、测试和原始研究快照字节不变。输出在 Git 忽略的 `test-output/public-docs-20261020/prepush.json`；扫描仅输出位置与规则，私有副本保存在 `.private/operations/environment-before-20261020/`。本机未安装 Gitleaks，本次使用已知实例标识与凭据模式定向扫描并审阅完整差异。

GitHub 原页面实际 DOM 确认中文说明被拼入 Bing 链接目标。对修正后的文档调用 GitHub Markdown API 返回 200，解析 HTML 确认链接文字为 `www.bing.com`，目标为 `https://www.bing.com/`；原始渲染保存在同一忽略目录。推送后重新加载 GitHub 主分支页面，链接文字、目标、自部署要求及实例明细移除均已核对。`github-evidence.json`、`github-services.png` 和 `github-deployment.png` 保存在上述忽略目录；两张截图已实际查看。

初始终端 HTTPS/SSH 连接中断，经本机已有 SOCKS 代理通道读取远端并完成 SSH 身份验证；远端 main 与本地基线一致。Git 提交身份仅写入本仓库配置，使用用户给定的作者名与邮箱。

修正提交：[79064fcce411a7f33544fe988fb0b56f2e771664](https://github.com/oonecab/daily-picture-web/commit/79064fcce411a7f33544fe988fb0b56f2e771664)。普通推送后，`git fetch`、`git ls-remote` 与本地引用读回得到相同 SHA，工作区干净。后续仅追加问题、计划、里程碑及本验收结果；最终记录提交的身份、远端与工作区读回随交付说明提供。

2026-10-20 身份修正补充：本文保留当时的提交号与验收事实；旧新提交映射和 GitHub 实际作者关联见 [修正验收](git-identity-correction.md)。此前身份检查仅覆盖 Git 字段与推送认证，账号关联结论以该修正验收为准。
