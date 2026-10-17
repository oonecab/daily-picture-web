# 002：GitHub 首次源码发布

- 状态：`in-progress`
- 目标日期：2026-10-17。
- 负责人：项目维护者。
- 仓库：[oonecab/daily-picture-web](https://github.com/oonecab/daily-picture-web)，分支 `main`。

## 范围与验收

发布本地 Web 应用、测试、MIT 许可和第三方范围说明、治理文档与既有 238 份研究快照。应用检查、快照完整性和治理检查须通过；远端 SHA 须等于本地 HEAD，工作区干净。没有要求建立服务器部署或 GitHub Release。

## 依赖

- [问题 005](../issues/005-initial-publication.md)
- [计划 002](../plans/002-initial-publication.md)
- [验收与执行证据](../docs/testing/initial-publication.md)

## 代码—测试—文档一致性证据

| 对象 | 检查与证据 |
| --- | --- |
| 应用与测试 | 沿用 1.0.0 实现与 `test/app.test.mjs`，本次无业务逻辑变更；语法和 10 项测试通过 |
| 研究资料 | 238 份文件与原始目录、provenance 逐字节一致；238 份 Git 暂存对象摘要一致；432 条本地链接有效 |
| 用户说明与治理 | README 使用实际克隆命令；本次文档链接、strict 校验与重复预览通过；其余运行边界、规则和环境不变 |
| 发布 | 等待提交、普通推送与远端 SHA 核对 |

当前一致性结论：代码、测试与文档仍表达相同的 1.0.0 本地应用边界。本地验收通过，等待实际推送证据后关闭里程碑。

## 延期工作

原有 [上游连接问题](../issues/002-upstream-connection.md) 与 [长期、真机和 PWA 验证缺口](../issues/003-validation-gaps.md) 保留原状态。源码发布不代表这些问题已解决。
