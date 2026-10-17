# 实施计划

<!-- project-governance:managed:start -->
多步骤、高风险、跨边界或需要多人协调的工作必须创建计划。

- 关联来源问题单，并定义可观察的完成条件。
- 按依赖关系排列步骤，同时最多只能有一个步骤处于 `in-progress`。
- 实施前明确测试、文档同步、迁移与回滚工作，不得将其留到代码完成后再补想。
- 技术栈或业务/计算规则变更必须在计划中安排权威文档、变更记录及回归测试的同步步骤。
- 随实际情况更新状态；计划是执行辅助，不是完成证据。
- 创建新计划时复制 `_template.md`。复制后删除两行 `project-governance:managed` 标记；实际计划全文由项目自主管理。
<!-- project-governance:managed:end -->

## 项目自定义计划规则

当前计划：[001 治理接入](001-governance-adoption.md)。更新计划时保留实际完成与未完成的区别，结果以关联验收记录为准。

首次源码发布：[002 提交并推送到 GitHub](002-initial-publication.md)。

十五日窗口扩展：[004 最近十五日与 GitHub 入口](004-fifteen-day-archive.md)。
