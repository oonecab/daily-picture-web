# 010：提交身份修正计划

- 状态：`completed`；负责人：项目维护者。
- 关联：[问题 014](../issues/014-git-identity-correction.md)、[验收](../docs/testing/git-identity-correction.md)、[里程碑 010](../milestones/010-git-identity-correction.md)。

1. `[completed]` 保存原分支和完整 bundle，校验摘要及备份可读性，生成五条修正提交及对应表。
2. `[completed]` 逐条树/元数据比较通过，显式 lease 更新 main 成功；五条 GitHub author/committer 均关联 oonecab。
3. `[completed]` 追加历史验收对应说明，登记检查及公开范围检查通过；本记录按正常提交推送，最终提交号与三方读回纳入交付回执。

这次为 Git 元数据修正，旧实现失败证明由五条 GitHub 账号映射为空提供；不新增应用行为测试。运行原语法、48 项回归和研究校验，并比较全部运行包源文件。远端变化时停止覆盖；必要时从私有备份恢复原对象。服务器包与运行状态不需要迁移，原发布摘要通过提交映射继续追溯。

## 第二阶段：统一既有账号身份

1. `[completed]` 保存当前完整历史，生成四条身份修正及六条父引用更新；十组文件树和归一化元数据逐字节一致。
2. `[completed]` 登记检查通过，以原 main 的完整 SHA 为 lease 更新远端成功；GitHub API 确认 16 条作者及提交者均关联 oonecab。
3. `[completed]` 追加两阶段映射和历史发布说明，公开资料检查通过；本记录按正常提交推送，最终提交号、账号关联与三方读回纳入交付回执。
