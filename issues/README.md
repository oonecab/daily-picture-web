# 问题单

<!-- project-governance:managed:start -->
每个需要持续协作、可独立评审的问题或决策使用一个文件。

建议命名：`issue_YYYYMMDD_HHMMSS_short-title.md`。

状态流转：`open` → `confirmed` → `in-progress` → `resolved` 或 `rejected`。

- 写明已观察事实、影响、范围、风险、验收条件与验证证据。
- 明确变更类型；技术栈、业务/计算规则、API/数据结构、安全、环境或用户可见行为的变更必须填写对应联动字段。
- 对文档影响作出结论：列出需要同步的权威文档；若无需更新，必须写明可复核的理由。
- 以追加方式记录有意义的调查与决策历史，不得抹去不利或失败的既有发现。
- 按当前风险档关联必要的实施计划、测试设计、ADR 与里程碑；不适用项写 none 和理由，普通修复不强制补全四份记录。
- 创建问题单时复制 `_template.md`，不得把模板本身当作真实问题单编辑。复制后删除两行 `project-governance:managed` 标记；实际问题单全文由项目自主管理。
<!-- project-governance:managed:end -->

## 项目自定义问题单规则

| 编号 | 内容 | 当前状态入口 |
| --- | --- | --- |
| 001 | 治理接入与 REA 归档 | [问题 001](001-governance-adoption.md) |
| 002 | 间歇性上游连接失败 | [问题 002](002-upstream-connection.md) |
| 003 | 长期、真机、PWA 等验证缺口 | [问题 003](003-validation-gaps.md) |
| 004 | 开源许可证与第三方范围 | [问题 004](004-open-source-license.md) |
| 005 | 首次提交并推送到 GitHub | [问题 005](005-initial-publication.md) |
| 007 | 最近十五日归档与首页 GitHub 入口 | [问题 007](007-fifteen-day-archive.md) |
| 008 | 手机全屏回退与页脚图标 | [问题 008](008-mobile-fullscreen-footer.md) |
| 009 | 手机体验修复发布 | [问题 009](009-mobile-release.md) |

当前没有外部问题跟踪服务；由项目维护者在本目录维护。既有记录编号保留，后续新文件可采用上方建议命名。
