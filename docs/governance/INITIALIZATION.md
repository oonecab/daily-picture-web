# 项目治理初始化验收

日期：2026-10-17（Asia/Shanghai）。目标：`E:\study\rea\daily-picture\web`。使用用户指定的 `E:\dongdong\codeup\init-project-governance-skill\init-project-governance`，生成器版本 0.5.0。

## 接入选择

治理级别 `standard`，类型 `web-fullstack`；显式启用模块架构、Web、外部集成规范和按风险分流。选择架构与外部契约记录模板；实际记录另存，不把模板当成已完成事实。

Codex/OpenCode 共享 `AGENTS.md`，Claude Code 通过 `CLAUDE.md` 的 `@AGENTS.md` 导入。应以 **web 目录作为项目根**。已检查入口结构，未启动其他 Agent 产品来验证真实加载。没有生成 OPENCODE.md、工具私有设置、CI 或公开部署配置。

可执行测试仍在 `test/`，测试设计映射到 `docs/testing/`。原 `README.md` 和 `.gitignore` 声明为人工权威；原 `VERIFICATION.md` 保持历史实测记录。

## 导入的逆向内容

[研究导航](../reverse-engineering/README.md) 收录 14 篇主要分析文档及递归引用的文本证据，共 **238 个文件、57,210,584 字节（约 54.6 MiB）**。另有 [来源清单](../reverse-engineering/provenance.json) 记录 SHA-256、原始路径、目标 DLL、完整源目录索引和导入范围。

历史函数索引含 215 个重点函数；原生 12 项未解问题保留状态。本次复制不重新执行原生目标、历史脚本或 REA 探针。JSON 内部引用与脚本依赖未递归打包，完整复现仍需原工作区及工具，不能称为完整原生重建包。

[对应表](../reverse-engineering/web-mapping.md) 把原生静态观察与 Web 实现联系起来，并明确 HTTPS/市场参数、日期、独立元数据提交、在途合并、计时器和系统能力的调整。当前规则分别在 [目录规则](../rules/catalog.md)、[缓存规则](../rules/cache.md)、[浏览器状态](../rules/browser-state.md) 维护。

## 已执行检查

环境：Windows、Node.js 24.14.0、Python 3.12.1。完整命令输出见 [检查证据](evidence/initialization-checks.json)。

| 检查 | 结果 | 能证明的范围 |
| --- | --- | --- |
| 官方 preview → apply | 27 CREATE、2 PRESERVE、0 UPDATE、0 CONFLICT | 生成器范围内安全接入；保留人工文件 |
| 官方 `validate_project.py --strict` | 通过，未报告错误或警告 | 结构、受管内容、路径、适配入口、6 条引用关系与 3 条 package 事实一致 |
| 官方重复 preview | 27 UNCHANGED、2 PRESERVE | 项目自主管理补充保留，生成器无新写入计划 |
| `python -X utf8 tools/verify_research.py --original-root E:\study\rea\daily-picture` | 238 文件、432 本地 Markdown 链接，0 失败 | 快照摘要/大小、与母目录相同、文档链接存在；不验证原生语义 |
| `npm run check` | 通过 | 现有四个 JavaScript 入口语法 |
| `npm test` | 10 通过、0 失败/跳过 | 原有隔离 Node 回归；不访问真实 Bing |

最终文档链接、原有文件保留和新增文件清单见 [最终文件审计](evidence/final-audit.json)。归档核对未执行一小时、真机、PWA 安装或新的真实上游/浏览器测试；这些结果仍以原验证记录的日期和范围为准。

## 变更范围与恢复

初始研究/实际文档导入为 253 个新增文件，其中 238 个为原始快照；生成器新增 27 个文件。之后只在新增治理文件的自主管理区补充导航，以及添加本验收和检查证据。现有业务代码、包任务、启动器、README、验证记录和缓存的保留情况按最终审计逐项核对。

初始化前的 52 个 Web 文件已经保存字节级基线和恢复副本：`C:\Users\wangq\AppData\Local\Temp\daily-picture-governance-knrcuzhl\before.json`、同目录 `before.zip`。此临时目录仅为本次操作恢复辅助，不能当作长期备份。恢复时先核对最终审计的新增文件清单与之后的用户修改；不得直接删除整个项目。

原研究工作区保持原位置；未来使用 Git 时，`.gitattributes` 的研究快照 `-text` 规则避免换行转换破坏摘要。当前目录没有 Git 仓库，本次没有执行 git init、提交或推送。

## 后续维护

项目配置权威为 [.project-governance.json](../../.project-governance.json)。受管标记内内容由生成器更新；具体规则、研究对应和实际记录由项目维护。Skill 完整源码在上述用户指定目录，本次没有全局或项目安装副本。

从该 Skill 目录执行：

```powershell
python -X utf8 scripts/init_project.py --target E:\study\rea\daily-picture\web --diff
# 审阅后执行同一命令并加 --apply，再运行：
python -X utf8 scripts/validate_project.py E:\study\rea\daily-picture\web --strict
python -X utf8 scripts/init_project.py --target E:\study\rea\daily-picture\web
```

从 Web 根目录运行已登记的 `npm run check`、`npm test` 和 `python -X utf8 tools/verify_research.py`。生成器不会代为执行这些项目命令。

开放事项继续保留：[002 上游连接失败根因](../../issues/002-upstream-connection.md)、[003 长期及平台验证](../../issues/003-validation-gaps.md)。初始化不构成它们的修复或验收。
