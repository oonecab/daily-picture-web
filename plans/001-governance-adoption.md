# 计划 001：本地 Web 治理接入

状态：完成。关联 [问题 001](../issues/001-governance-adoption.md)。

1. [completed] 确认 `web` 目标、上级指令、Git 状态与原有文件，保存字节级基线和恢复副本。
2. [completed] 选 standard / web-fullstack，组合模块架构、Web、外部集成规范；测试设计放 `docs/testing`，不混入可执行 `test`。
3. [completed] 在项目外准备配置、研究导入清单和实际文档；完整预览 CREATE/PRESERVE/CONFLICT。
4. [completed] 应用无冲突的新增文件；只在受管区块之外补项目事实入口。
5. [completed] strict、幂等、规则引用、研究摘要与已有自动检查通过；原有文件保留及最终清单在交付审计中核对。

退出条件：全部门禁通过，问题 002/003 继续开放，结果写入 [初始化验收](../docs/governance/INITIALIZATION.md)。

回退：应用与缓存未更改，可依据本次新增文件清单审阅后移除仅本次创建且之后未改动的文件；如需恢复旧文件应先对比初始化前快照。不得递归删除整个 web，也不得清除之后新增的用户数据。本次没有创建 Git 仓库、安装依赖、全局安装 Skill 或改变部署配置。
