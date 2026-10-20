# Git 提交身份修正验收

日期：2026-10-20；[问题 014](../../issues/014-git-identity-correction.md) / [计划 010](../../plans/010-git-identity-correction.md) / [里程碑 010](../../milestones/010-git-identity-correction.md)。

## 目标与方法

修正最近五条提交的邮箱，保留各自文件树、作者/提交者名字与时间、提交说明以及此前历史。原 main 为 `dee8f91da1721f065c9368799e1c3fa0db8a5207`，重写边界为 `befde160edcde1178f6fe1cae68de5ea6f131a00`。此前 GitHub API 对五条提交返回空 author/committer 关联；本次要求两者均返回 oonecab。

无应用规则、数值、时间口径或存储格式变化；时间验证针对 Git 元数据原样保留。发布源提交和包摘要保留为历史事实，通过旧新提交映射连接现有分支。

| ID | 验收条件 | 结果 |
| --- | --- | --- |
| ID-01 | 原分支与 bundle 备份可读，边界外提交不变 | 通过；bundle 为完整历史，摘要与备份引用一致，前十条对象不变 |
| ID-02 | 五条提交树和非目标元数据逐字节相同 | 通过；逐条归一化目标邮箱和父引用后与原对象完全相同 |
| ID-03 | 显式 lease 更新远端，五条 author/committer 均关联 oonecab | 通过；远端更新到 4c13a54，GitHub API 的五组关联全部正确，旧五条已离开 main 历史 |
| ID-04 | 运行包源文件、登记检查、文档链接和公开范围 | 通过；15 个运行包源文件、48 项回归及下述资料检查通过 |
| ID-05 | 最终记录使用正确身份，Git 三方一致且工作区干净 | 本记录按正常提交推送；最终 SHA、账号映射和干净工作区由交付回执记录 |

统计图可能异步更新，以提交页面/API 的作者关联作为直接证据。操作与备份明细保留在 Git 忽略的私有位置。

## 旧新提交对应

| 原提交 | 修正后提交 | 内容 |
| --- | --- | --- |
| `79064fcce411a7f33544fe988fb0b56f2e771664` | [940c487d352b65e0b2a4052d6e6f1807d24d5cc3](https://github.com/oonecab/daily-picture-web/commit/940c487d352b65e0b2a4052d6e6f1807d24d5cc3) | docs: fix environment links and protect deployment details |
| `9ee56da6b1bb4235e435fe133ccb9bbc2310e9a2` | [c83eaf34bd1515a2a8827bdafc7765468d2bd634](https://github.com/oonecab/daily-picture-web/commit/c83eaf34bd1515a2a8827bdafc7765468d2bd634) | docs: record public environment verification |
| `8c1124a002671404f7447f9cb18d672c23fb0ab8` | [28c1865bf29d9b89f6119b016fd62045948fa49a](https://github.com/oonecab/daily-picture-web/commit/28c1865bf29d9b89f6119b016fd62045948fa49a) | fix: improve cache recovery and browsing reliability |
| `308269a5c737f1e86ea7bf329872efd7c038515a` | [bdddb239b3847d9b13a7747b0d46d24bc1db8837](https://github.com/oonecab/daily-picture-web/commit/bdddb239b3847d9b13a7747b0d46d24bc1db8837) | docs: record reliability fix verification and delivery |
| `dee8f91da1721f065c9368799e1c3fa0db8a5207` | [4c13a54a7d9d907603bd8ece869c1b66c97fac35](https://github.com/oonecab/daily-picture-web/commit/4c13a54a7d9d907603bd8ece869c1b66c97fac35) | docs: record verified 1.1.1 production release |

每组提交的完整 tree SHA 相同；恢复父提交号和邮箱后，整个 commit 对象与原对象逐字节一致。这同时确认了作者/提交者名字、时间与时区、提交说明及其他头字段保留。五条之前的十条提交对象保持不变。

生产发布源 `308269a` 对应当前历史中的 `bdddb23`，二者文件树完全相同。服务器发布元数据、发布包摘要以及原验收中的旧提交号保留当时记录，无需重新部署。

## 执行结果与边界

在本机 macOS 执行 `npm run check`、`npm test` 和 `python3 -X utf8 tools/verify_research.py`。语法检查通过；48 项 Node 测试全部通过，无失败或跳过；研究校验覆盖 238 个文件、432 条本地链接，无失败。本次变更只涉及 Git 身份元数据和追溯文档，没有新增应用行为测试。

公开范围检查覆盖 345 个候选文件，其中 20 个文档新增或修改，111 条本地文档链接有效。已知生产实例标识及凭据模式均无命中，私有备份与测试输出未进入候选文件；3 项原生事实、8 组规则引用和环境/安全清单一致，研究快照及环境文档未改变。此模式检查仅说明所列规则未命中，不声称覆盖所有潜在敏感信息。`git diff --check` 通过。

本仓库后续作者和提交者使用 `oonecab <hisaohisaochao@foxmail.com>`，账号关联以 GitHub API 返回值核对。应用版本仍为 1.1.1；15 个源文件的 SHA-256 与已有发布清单一致。本次没有重新执行服务器或浏览器验收，原生产验收保持原日期和边界。原分支、bundle、旧新对象比较、API 响应和检查日志均保存在本地忽略目录。
