# 文档职责索引

<!-- project-governance:managed:start -->
每类事实只能有一个权威来源：

- `../TECH.md`：技术栈、架构、路径、依赖、兼容边界与技术栈变更索引。
- `../AGENTS.md`：短小的 Agent 入口和不可协商红线。
- `../.project-governance.json`：结构化项目设置与已登记命令。
- `governance/`：工作流、测试、安全、变更控制、发布和风险规范。
- `environments.md`：不含秘密的环境变量名、服务和端口清单。
- `rules/`：公式、统计口径、舍入、单位、币种、时间边界等业务/计算规则的权威文档。
- `decisions/`：受控级别下难以回退的技术与架构决策。

- `capabilities/modular-architecture.md`：模块边界规范；仅定义规范，不重复维护项目事实。
- `capabilities/web.md`：Web 与 API 边界规范；仅定义规范，不重复维护项目事实。
- `capabilities/external-integration.md`：外部集成规范；仅定义规范，不重复维护项目事实。
- `governance/CHANGE_TRIAGE.md`：按风险选择记录和验证；仅定义规范，不重复维护项目事实。
- `architecture/_template.md`：架构状态与边界记录模板；按需复制为项目记录，不代表已实现或已验证。
- `contracts/_template.md`：外部契约与证据记录模板；按需复制为项目记录，不代表已实现或已验证。
- manifest 的 `consistency`：只读核对显式引用和原生事实快照；不是测试执行或语义证明。原生构建文件拥有依赖/任务定义，登记快照不成为第二权威。

禁止在多个文件中手工维护同一事实。其他文档必须链接到权威来源。代码变更完成前必须评估并同步受影响文档。
<!-- project-governance:managed:end -->

## 项目文档

| 想了解的内容 | 权威入口 |
| --- | --- |
| 启动和使用 | [原 README](../README.md) |
| 贡献、社区行为与漏洞报告 | [贡献指南](../CONTRIBUTING.md)、[行为准则](../CODE_OF_CONDUCT.md)、[安全政策](../SECURITY.md) |
| 开源许可证与第三方范围 | [MIT License](../LICENSE)、[第三方说明](../THIRD_PARTY_NOTICES.md) |
| 当前技术与架构 | [TECH](../TECH.md)、[Web 架构](architecture/web-app.md) |
| 运行环境与自部署 | [环境事实与配置要求](environments.md)、[发布与回滚](deployment.md) |
| 前期 REA 分析 | [研究导航](reverse-engineering/README.md)、[原生→Web 对应表](reverse-engineering/web-mapping.md) |
| 数据来源与字段 | [Bing 契约](contracts/bing.md) |
| 日期、缓存、重试、浏览器状态 | [规则目录](rules/README.md) |
| 检查和已知限度 | [测试基线](testing/current-baseline.md)、[原实测记录](../VERIFICATION.md) |
| 本次初始化结果与后续更新方法 | [初始化验收](governance/INITIALIZATION.md) |
| 当前工作与开放问题 | [问题单](../issues/README.md)、[计划](../plans/README.md)、[里程碑](../milestones/README.md) |

`reverse-engineering/source/` 保留历史研究的原始字节；当前实现规则在 `rules/`，两者不互相覆盖。上级工作区仍是原生研究母目录，本项目快照只覆盖清单中列出的文件。
