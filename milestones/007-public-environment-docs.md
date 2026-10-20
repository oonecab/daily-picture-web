# 007：公开环境文档与运维信息分离

- 状态：`in-progress`；目标日期：2026-10-20（Asia/Shanghai）；负责人：项目维护者。
- 组成：[问题 011](../issues/011-public-environment-docs.md)、[计划 007](../plans/007-public-environment-docs.md)、[验收记录](../docs/testing/public-environment-docs.md)。

## 验收条件

- 环境文档链接范围正确，当前公开资料只保存通用部署要求与可公开验证结论。
- 实例运维明细的本机副本被 Git 忽略，文档、manifest 与变量清单一致。
- 登记检查通过；使用指定提交及推送身份完成普通推送，核对 GitHub 渲染及最终 Git 状态。

## 证据状态

应用代码、测试、技术栈和业务规则保持原行为；文档检查和既有回归结果统一记录在[验收记录](../docs/testing/public-environment-docs.md)。当前待完成验证与远端交付。

历史提交的内容仍可追溯；清理历史与生产部署不属于本次交付。
