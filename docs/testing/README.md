# 测试设计

<!-- project-governance:managed:start -->
本目录保存面向人的测试设计与验收映射。可执行测试仍应放在项目源码或已登记的测试目录中。

- 为重要场景分配稳定 ID。
- 按需覆盖正常、边界、失败、授权、恢复与回归行为。
- 使用 Given/When/Then 或同等可观察的结构描述场景。
- 业务/计算规则测试必须关联规则权威文档及版本，并覆盖公式、精度、舍入、单位/币种、时区和关键边界中适用的维度。
- 关联问题单、计划、里程碑与可执行测试，并留下代码—测试—文档一致性证据。
- 创建新测试设计时复制 `_template.md`。复制后删除两行 `project-governance:managed` 标记；实际测试设计全文由项目自主管理。
<!-- project-governance:managed:end -->

## 项目自定义测试设计规则

[当前测试设计与覆盖关系](current-baseline.md)；[原浏览器/上游验证](../../VERIFICATION.md)；[本次初始化验收](../governance/INITIALIZATION.md)。可执行测试在 `test/app.test.mjs` 与 `test/browser-ui.test.mjs`。后者使用 DOM 替身，不能把 Node 测试结果扩大为全部浏览器行为通过。

首次源码发布的文件、摘要和远端验收见 [initial-publication.md](initial-publication.md)。

1.1.0 归档扩展与首页仓库入口：[fifteen-day-archive.md](fifteen-day-archive.md)。

手机修复：[本地验收](mobile-fullscreen-footer.md) / [发布验收](mobile-release.md)。
