# Git 提交身份修正验收

日期：2026-10-20；[问题 014](../../issues/014-git-identity-correction.md) / [计划 010](../../plans/010-git-identity-correction.md) / [里程碑 010](../../milestones/010-git-identity-correction.md)。

## 第一阶段：修正邮箱

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

## 第二阶段：统一四条既有身份

用户进一步要求将四条 ZZZping 提交的作者和提交者统一为 `oonecab <hisaohisaochao@foxmail.com>`。本阶段从 `bba97626cc36ca72ae88af1d46b802aed28d7b79` 开始，以 `ec35db0e64141319c395d041a1b3392c03a6fdd2` 为不变边界。四条身份变更使后六条的父引用随之更新；最早六条提交对象不变。第一阶段表格和验证结论保留当时状态，当前历史按下表继续追溯。

| 本阶段原提交 | 统一后提交 | 变更范围 |
| --- | --- | --- |
| `3f1bfd54863c87b9af020b0b8672f98584658065` | [f8fc3700d8b54e62c69eef0b19f187f9251530e6](https://github.com/oonecab/daily-picture-web/commit/f8fc3700d8b54e62c69eef0b19f187f9251530e6) | 作者、提交者身份 |
| `6f53a8839801ed07cf1951feb6da70c59d5c2242` | [7dd97647607d0c9add67ac91ec8a3b9df4a8e8d7](https://github.com/oonecab/daily-picture-web/commit/7dd97647607d0c9add67ac91ec8a3b9df4a8e8d7) | 作者、提交者身份及父引用 |
| `b7f1fa19c9e0b743cd25e698c6047a07d10bba5e` | [7223fb435563f5e275f8060d14194ece27c1d76d](https://github.com/oonecab/daily-picture-web/commit/7223fb435563f5e275f8060d14194ece27c1d76d) | 作者、提交者身份及父引用 |
| `befde160edcde1178f6fe1cae68de5ea6f131a00` | [fcedbffebb73e43e8c195b7e7cf005f137459ebe](https://github.com/oonecab/daily-picture-web/commit/fcedbffebb73e43e8c195b7e7cf005f137459ebe) | 作者、提交者身份及父引用 |
| `940c487d352b65e0b2a4052d6e6f1807d24d5cc3` | [974e6acedb6766b7721c746f837a94522c5d8d7f](https://github.com/oonecab/daily-picture-web/commit/974e6acedb6766b7721c746f837a94522c5d8d7f) | 父引用 |
| `c83eaf34bd1515a2a8827bdafc7765468d2bd634` | [de855deca99e3d9bd8b9712e18e0c243fad42428](https://github.com/oonecab/daily-picture-web/commit/de855deca99e3d9bd8b9712e18e0c243fad42428) | 父引用 |
| `28c1865bf29d9b89f6119b016fd62045948fa49a` | [1c7e9519b46328f4ab2e584b199d797f9335ea97](https://github.com/oonecab/daily-picture-web/commit/1c7e9519b46328f4ab2e584b199d797f9335ea97) | 父引用 |
| `bdddb239b3847d9b13a7747b0d46d24bc1db8837` | [be09b8c09dad2cf14c320b60f525412085997051](https://github.com/oonecab/daily-picture-web/commit/be09b8c09dad2cf14c320b60f525412085997051) | 父引用 |
| `4c13a54a7d9d907603bd8ece869c1b66c97fac35` | [47cdca756bf8031387355caf8d5ef1a32a150f02](https://github.com/oonecab/daily-picture-web/commit/47cdca756bf8031387355caf8d5ef1a32a150f02) | 父引用 |
| `bba97626cc36ca72ae88af1d46b802aed28d7b79` | [2b924ec2ee8310e816a097845cbd176ccf9d0751](https://github.com/oonecab/daily-picture-web/commit/2b924ec2ee8310e816a097845cbd176ccf9d0751) | 父引用 |

十组文件树完全相同；还原目标身份字段与父引用后，原始 commit 对象逐字节一致。作者/提交者时间、时区、提交说明及其他字段保持原样。更新前原分支、完整 bundle 及摘要已保存，bundle 校验通过。远端更新使用原 main 完整 SHA 的 `--force-with-lease`，远端变化时停止。

实际生产发布源 `308269a` 经第一阶段映射为 `bdddb23`，本阶段再映射为 `be09b8c`；三个文件树相同。早期手机发布源 `3f1bfd5` 对应 `f8fc370`。历史发布元数据和包摘要保留当时事实。

本阶段显式 lease 推送成功，远端更新到 `2b924ec2ee8310e816a097845cbd176ccf9d0751`。GitHub API 返回的全部 16 条提交，作者和提交者 login 均为 oonecab，邮箱均为用户确认的地址；原十条对象已离开 main 历史。统计页面展示未作本次浏览器验收，账号关联以 API 实际返回为证据。

本阶段重新运行 `npm run check`、`npm test`、`python3 -X utf8 tools/verify_research.py`，三个命令退出码均为 0；48 项回归全通过，研究校验覆盖 238 个文件、432 条链接，无失败。15 个部署源文件 SHA-256 与现有发布清单一致，生产元数据保留，未重新部署或声称新的服务器验收。

公开范围检查覆盖 345 个候选文件和 11 个修改文档，49 条本地链接有效；已知实例标识和凭据模式无命中，私有备份与测试输出被 Git 忽略；3 项原生事实、8 组规则引用及环境/安全清单一致。`git diff --check` 通过。原分支、完整 bundle、对象映射、命令退出码和 API 响应保存在本地忽略目录。最后的验收记录按相同身份正常提交推送，最终 SHA、Git 三方一致性、全部账号关联与干净工作区由交付回执记录。
