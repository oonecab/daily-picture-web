# 实施计划：社区资料与反馈入口

- 状态：`completed`
- 关联问题单：[问题 010](../issues/010-community-standards.md)
- 目标里程碑：[里程碑 006](../milestones/006-community-standards.md)
- 负责人：项目维护者

## 目标与范围

补齐 GitHub 推荐社区资料，建立真实的安全与社区反馈渠道，并提交推送到 main。应用代码、业务规则及服务器部署不在本次变更范围内。

## 实施步骤

1. `[completed]` 核对本地/远端基线、现有规范和 GitHub 管理入口。
2. `[completed]` 编写社区文件及轻量表单，核实私密联系渠道，更新 About 和漏洞报告设置。
3. `[completed]` 验证命令、YAML、链接、第三方许可和变更范围，完成本地检查。
4. `[completed]` 提交 b7f1fa1 已推送，远端 SHA 一致，社区八项全部识别；结果与验证边界已记录。

## 文档同步计划

社区政策分别由根目录的贡献指南、行为准则和安全政策维护；README 与 `docs/README.md` 只提供导航。内部安全规范补充公开报告入口链接。行为准则由项目独立撰写，未引入第三方文本；执行证据统一保存在[验收记录](../docs/testing/community-standards.md)。

## 测试与验证计划

- 基线：GitHub 页面明确显示六项缺失；不新增应用行为测试，原因是本次不改变运行代码。
- 运行 `npm run check`、`npm test`、`python3 -X utf8 tools/verify_research.py`。
- 解析新增 YAML，检查表单必填项、唯一字段 ID、联系方式与本地文档链接；核对无未替换占位符、凭据或运行数据。
- 推送后读回 main SHA，检查 Community Standards、问题模板入口、安全政策和 About。

## 依赖、发布与回滚

仓库管理权限已通过实际设置操作确认；用户已指定行为准则的私密联系邮箱。先完成文档和设置验证，再普通提交推送。回退通过 revert 文档提交并恢复 About 原值、按需关闭私密报告完成；有未处理报告时应先保障报告沟通持续可用。无需应用迁移和服务器发布。
