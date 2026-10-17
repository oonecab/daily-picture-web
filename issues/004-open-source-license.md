# 004：添加开源许可证及范围说明

- 状态：resolved（本地许可证及说明完成）。
- 创建日期：2026-10-17（Asia/Shanghai）。
- 维护角色：项目维护者。
- 来源：用户准备自行创建 GitHub 仓库，要求推荐名称并选择、添加合适的许可证。
- 推荐仓库名：`daily-picture-web`，与现有 package 名称一致；仓库是否可创建由用户账户中的名称占用情况决定，本次未查询或创建远端仓库。

## 范围与选择

采用标准 MIT License，版权行使用 `Copyright (c) 2026 Daily Picture Web contributors`。适用于项目自行实现的软件和自行撰写的文档；Bing 内容、原应用内容、整个原始研究快照和另有许可的第三方材料按 THIRD_PARTY_NOTICES 说明处理。

选择理由：便于个人部署、修改、分发和商用，要求保留声明，不强制衍生项目公开源码。参考 [MIT 标准文本](https://opensource.org/license/mit) 与 [GitHub 的 MIT 说明](https://choosealicense.com/licenses/mit/)。

本次为本地发布准备，修改项目元数据和文档，不执行正式发布、远端写入或业务行为变更。计划/里程碑/新业务回归测试：none，范围没有应用逻辑、API、数据格式、环境或技术栈变化；以本记录保存范围、文档影响和实际检查。后续上传 GitHub 是独立操作，不能由本次许可文件存在推断已完成。

## 文档影响评估

- 结论：required。
- 新增：LICENSE、THIRD_PARTY_NOTICES.md。
- 同步：package.json 的 `license`、README 的许可证段落、文档目录与研究导航；README 的四个原生资料入口改为仓库内快照路径，使其不依赖上级研究目录。
- 现有 README 是项目自主管理文件，本次用户要求授权补充许可证；生成器仍应 PRESERVE。
- 原始研究快照与历史初始化审计保持原样。初始化审计记录的是当时文件状态，不代表添加许可证后的当前文件摘要。

## 验收与边界

检查标准 MIT 正文、package 元数据、相对链接、研究快照摘要与官方治理 strict/重复预览。按已登记门禁运行应用语法及现有测试，不新增仅验证文本措辞的测试。

本记录不构成第三方材料已获再分发许可的结论。根目录 MIT 不覆盖研究快照；具体范围在 THIRD_PARTY_NOTICES 明示。

## 活动记录（只追加）

- 2026-10-17：读取现有治理、package、项目说明与研究来源，确认项目没有已有根许可证、没有 Git 仓库；添加标准 MIT 及范围说明，等待验证。
- 2026-10-17：完成验证，环境为 Windows、Node.js 24.14.0、Python 3.12.1；以下检查均通过。本次没有创建远端仓库、提交或推送。

| 检查 | 实际结果 |
| --- | --- |
| MIT 正文与 SPDX 官方 MIT.txt 比较 | 从 Permission 段落起，仅归一化空白后一致；标题和项目版权行单独保留 |
| package.json 许可字段 | `MIT`，JSON 解析通过 |
| 六份新增/修改文档的相对链接 | 46 条，全部存在且位于 Web 项目内 |
| `validate_project.py --strict` | 退出码 0，无错误或警告 |
| 治理重复预览 | 27 UNCHANGED、2 PRESERVE，无 CREATE/UPDATE/CONFLICT |
| `python -X utf8 tools/verify_research.py` | 238 个文件、432 条链接，0 失败，原始快照保持完整 |
| `npm run check` | 退出码 0 |
| `npm test` | 10 通过、0 失败、0 跳过，退出码 0 |

标准正文比较来源：[SPDX license-list-data / MIT.txt](https://raw.githubusercontent.com/spdx/license-list-data/main/text/MIT.txt)。本次应用代码未变，不重跑真实 Bing、浏览器交互或服务器部署测试。

## 2026-10-17 后续：README 免责声明

用户要求在 README 补充免责声明，延续既有提交推送授权。新增非官方关系、第三方内容权利、上游可用性、使用/部署责任和按现状提供说明；以现有 LICENSE / THIRD_PARTY_NOTICES 为准，不增加“仅限学习”或“禁止商用”等与 MIT 冲突的软件许可条件。措辞参考 [MIT 标准文本](https://opensource.org/license/mit) 和 [Microsoft 服务协议](https://www.microsoft.com/zh-cn/servicesagreement/)。

文档影响：README 必须更新；LICENSE、第三方范围、技术事实、业务规则、API、缓存和部署配置均不变。此为既有许可范围的说明补充，不新增应用行为或正式版本；不为文案添加模拟业务测试，沿用已登记检查及文档/许可一致性评审。本次检查通过：`npm run check`、`npm test`（16/16，0 跳过）、研究校验（238 文件 / 432 引用）、治理 strict、11 条文档本地链接和 `git diff --check`。差异确认仅为 README 与本记录，许可证及应用文件未修改；没有重跑真实 Bing、浏览器或部署验收。提交与推送结果以 Git 记录及交付时的远端 SHA 核对为准。
