# 业务与计算规则

<!-- project-governance:managed:start -->
本目录保存公式、统计口径、精度、舍入、单位、币种、时间边界和异常处理等规则的唯一权威定义。

- 每项重要规则使用独立文件和稳定规则 ID。
- 修改规则时必须同时更新受影响代码、测试设计、可执行回归测试、API/报表/用户说明。
- 规则文件必须说明生效版本或日期，并保留只追加的变更记录。
- 示例应明确输入、输出、单位和边界，尽量与自动化测试共用夹具。
- 不得用代码注释代替权威规则文档，也不得在多份文档中分别维护同一公式。

新建规则时复制 `_template.md`。其中的 `project-governance:managed` 标记只表示 `_template.md` 本身由生成器维护；复制为实际规则文件后应删除两行标记，实际规则全文由项目自主管理。
<!-- project-governance:managed:end -->

## 规则索引

| 规则 ID | 名称 | 权威文档 | 生效版本/日期 | 责任人 |
|---|---|---|---|---|
| DP-DATE / DP-IMAGE / DP-HTTP | 市场日期、图片来源与本机 HTTP 边界 | [catalog.md](catalog.md) | 1.0.0 / 2026-10-17 | 项目维护者 |
| DP-METADATA / DP-CACHE / DP-RETRY | 元数据提交、旧数据与失败预算 | [cache.md](cache.md) | 1.0.0 / 2026-10-17 | 项目维护者 |
| DP-LOCAL / DP-LIFECYCLE | 收藏、离线与页面生命周期 | [browser-state.md](browser-state.md) | 1.0.0 / 2026-10-17 | 项目维护者 |

前六项规则中的已登记引用可由 manifest consistency 检查；完整测试覆盖与限制见 [测试基线](../testing/current-baseline.md)。首次建档整理现有行为，没有改变业务口径。
