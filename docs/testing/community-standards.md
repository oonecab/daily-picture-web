# 社区资料验收

- 日期：2026-10-19（Asia/Shanghai）
- 关联：[问题 010](../../issues/010-community-standards.md)、[计划 006](../../plans/006-community-standards.md)、[里程碑 006](../../milestones/006-community-standards.md)
- 规则权威文档：根目录 CONTRIBUTING.md、CODE_OF_CONDUCT.md、SECURITY.md。
- 业务公式、日期、数值、缓存、API 与应用状态边界：不适用，本次无运行代码变更。

## 基线与场景

初始 main 为 `6f53a8839801ed07cf1951feb6da70c59d5c2242`，工作区干净。GitHub 已识别 README/License，其余六项缺失；About 简介及网站均为空，公开 Security 页面没有漏洞报告入口。

| ID | 验收目标 | 结果 |
| --- | --- | --- |
| COM-01 | 支持的文件位置、完整内容、真实联系渠道与第三方许可 | 根目录社区文件与 .github 模板完整；行为反馈邮箱由用户提供，准则由项目撰写，无第三方文本引入 |
| COM-02 | YAML 可解析、表单字段唯一且必填信息合理、文档链接有效 | 3 份 YAML 解析通过；18 个变更文件的 92 个本地文档链接有效，无未填写字段 |
| COM-03 | 贡献说明与真实命令一致，语法/Node 回归/研究资料检查通过 | npm run check 通过，npm test 27/27 通过，研究 238 文件/432 引用检查通过 |
| COM-04 | About 生效、私密漏洞入口可用、社区页面识别所有文件 | About 与私密漏洞入口已生效；公开 Community Standards 八项全部 Added，截图已查看 |
| COM-05 | 提交范围与凭据检查、普通推送、HEAD/远端一致和工作区状态 | 18 个候选文件定向凭据模式扫描 0 命中，diff --check 通过；b7f1fa1 普通推送成功，HEAD/origin/main/远端 main 一致，工作区干净 |

本次基线失败由实际缺失文件与 GitHub 页面证明；不添加复刻文档内容的运行测试。YAML 与链接检查作为本次维护验证；未提交测试 Issue、PR 或漏洞报告。

本地环境为 macOS / Node v24.21.0 / Python 3.14.6。YAML 使用系统 Ruby 的 Psych 3.1.0 `safe_load` 解析并核对模板元数据、唯一字段 ID 和必填属性。最初 Python 缺少 PyYAML，且当前 Psych 没有 `safe_load_file` 方法，随后采用 `safe_load(File.read(...))` 完成检查，未增加项目依赖。

## GitHub 设置

2026-10-19 已通过登录的仓库管理页面保存 About：简介为“一个轻量的 Bing 每日图片浏览器，支持最近十五日浏览、收藏、下载、沉浸式看图与离线缓存。”，网站为 `https://dailypicture.zzzping.top/`。原值均为空。

私密漏洞报告原为 Disabled，启用后页面显示 `Disable private vulnerability reporting` 和配置入口，确认已启用。安全政策的报告链接与该功能配套，未创建实际漏洞报告。

公开 Security 页也已出现 `Report a vulnerability`，目标为本仓库 `security/advisories/new`。行为准则使用用户明确提供并授权公开的邮箱；验证未发送测试邮件，不把地址确认等同于邮件投递测试。

2026-10-19 22:41 Asia/Shanghai 的本地核对记录保存在忽略目录 `test-output/community-20261019/prepush.json`：18 个候选文件，92 个有效本地链接，无未填写字段，定向凭据模式扫描 0 命中。扫描不构成完整安全审计。运行代码、测试、package.json 和环境配置均无变化，应用无需重新部署。

## 远端与浏览器结果

社区资料提交：[b7f1fa19c9e0b743cd25e698c6047a07d10bba5e](https://github.com/oonecab/daily-picture-web/commit/b7f1fa19c9e0b743cd25e698c6047a07d10bba5e)。通过已有 GitHub SSH 身份普通推送到 main，未修改持久化 remote 配置或重写历史；提交后本地 HEAD、origin/main 和 `git ls-remote origin refs/heads/main` 均为该 SHA，工作区干净。

公开 [Community Standards](https://github.com/oonecab/daily-picture-web/community) 已显示 Description、README、Code of conduct、Contributing、License、Security policy、Issue templates、Pull request template 八项全部 Added。实际查看了 1440×1050 截图，保存在忽略目录 `test-output/community-20261019/community-standards.png`。

Issue 入口的匿名浏览器访问先遇连接中断，重试后到达 GitHub 登录页面，这是创建 Issue 所需的登录门槛。表单的填写和提交交互未实测；已完成 YAML 结构、必填字段、链接和 GitHub 在线识别验证，不将这些结果扩大为完整交互测试。

最后仅追加本验收及问题、计划、里程碑状态；最终记录提交的 SHA 和工作区/远端一致性在交付前再次读回。

## 文档影响与退出条件

新政策各有单一入口，导航与内部规范只链接引用。运行栈、环境和业务规则不变，相关权威文档无需修改。必要的结构、内容、社区识别与远端验证已完成；表单交互和邮件投递的验证范围如上记录。
