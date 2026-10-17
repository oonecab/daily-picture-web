# 002：首次提交并推送到 GitHub

- 状态：`in-progress`
- 关联问题：[005](../issues/005-initial-publication.md)。
- 目标里程碑：[002](../milestones/002-initial-publication.md)。
- 负责人：项目维护者。

## 目标与范围

把已实现的本地应用、文档和既有研究快照提交到已指定仓库的 `main`，核对远端结果。此次交付是源码发布；服务器部署、域名、HTTPS 和 GitHub Release 不属于此任务。

## 依赖与风险

需要现有 GitHub 凭据具有推送权限。提交身份使用项目级配置；禁止强制推送、提交缓存或执行研究脚本。研究来源摘要必须在 Git 暂存后仍保持一致。

## 实施步骤

1. `[completed]` 核对本地、远端和文件边界，整理 README 与忽略项。
2. `[completed]` 执行已登记检查、治理检查和暂存审阅。
3. `[in-progress]` 提交并普通推送 `main`，比较远端与本地提交。
4. `[pending]` 追加实际推送证据并提交记录，确认最终工作区与上游状态。

## 文档同步与验证

README 的仓库地址与 `origin` 对照；四份发布记录通过相互链接追踪；索引只在自主管理区域追加。没有运行行为变化，不新增仅重复实现或文案的测试，旧实现失败证明不适用。

运行 `npm run check`、`npm test`、`python -X utf8 tools/verify_research.py` 和治理 strict 校验。逐项结果见 [验收记录](../docs/testing/initial-publication.md)。浏览器和真实 Bing 检查仍引用历史验证，不计作本次重新测试。

## 发布与回滚

按审阅过的文件清单暂存，先检查 Git 中的研究文件摘要，再创建首次提交并执行 `git push -u origin main`。远端有意外历史或检查失败时暂停推送并诊断；不修改用户已有数据。成功后追加证据提交，再验证 `git ls-remote`、上游与工作区状态。普通修复追加提交；若需要删除或重写公开历史，另行确认范围。
