# daily-picture-web — 技术事实唯一来源

<!-- project-governance:managed:start -->
## 项目目的

依据 Daily Picture 静态研究独立实现本地 Bing 每日图片浏览、收藏、下载与离线缓存。

## 项目分类

- 项目类型：`web-fullstack`
- 治理级别：`standard`

## 技术栈基线

### 语言

- JavaScript（ES modules）
- HTML
- CSS
- Python（仅资料校验工具）

### 框架与核心库

- 无第三方框架；使用 Node.js 内置 HTTP 和原生浏览器 API

### 运行时与工具链

- Node.js >=22（package.json 为权威；本机 24.14.0 已测）
- 现代浏览器（已有 Chrome 实测；其他浏览器未验证）
- Python >=3.10（仅治理与资料校验；本机 3.12.1）

## 源码边界

- lib
- public
- test
- tools

## 架构事实

- 无第三方运行依赖，无安装或构建步骤；任务定义以 package.json 为准。
- server.mjs 提供回环 HTTP 与静态白名单；lib/bing.mjs 隔离上游、校验和磁盘缓存。
- public/app.js 与 public/sw.js 管理浏览器状态和离线缓存；不读取原 UWP 应用数据。
- 当前架构见 docs/architecture/web-app.md；外部消费约定见 docs/contracts/bing.md。
- REA 资料和来源清单见 docs/reverse-engineering/README.md；历史快照不参与运行或静态文件服务。
- test 为可执行测试，docs/testing 为测试设计；公网经 Nginx HTTPS 转发到回环 Node 服务，系统壁纸集成尚未实现。

## 项目类型约束

- 明确浏览器、服务端与持久化边界。
- 把 API 契约和数据库迁移作为必须评审的兼容界面。
- 同时验证用户可见行为和服务级契约。

## 项目专属规则

- 以 web 目录为项目根加载治理入口；上级目录为独立原生研究工作区。
- 当前业务规则统一维护在 docs/rules；README 与 VERIFICATION 保留为人工使用说明和历史验证记录。
- 技术任务定义与 Node 兼容基线以 package.json 为权威；治理清单只登记必要快照。
- 研究快照的来源与摘要保存在 docs/reverse-engineering/provenance.json；追加解释不得静默篡改快照。
- 每次结论区分代码观察、自动测试、真实上游/浏览器实测与未验证项；时间和环境须可追溯。
- 记录实际检查结果，不以结构校验、配置声明或历史实测替代本次验证。
<!-- project-governance:managed:end -->

## 已确认的技术细节

- [部署环境与运行方式](docs/environments.md) / [发布与回滚](docs/deployment.md)。
- [当前 Web 架构](docs/architecture/web-app.md)：模块职责、依赖方向和数据所有权。
- [Bing 消费契约](docs/contracts/bing.md)：固定上游端点与字段转换。
- [业务规则](docs/rules/README.md)：日期、来源、缓存、重试及浏览器生命周期。
- [REA 设计依据](docs/reverse-engineering/README.md) / [原生与 Web 对应](docs/reverse-engineering/web-mapping.md)。
- [测试基线](docs/testing/current-baseline.md) / [初始化验收](docs/governance/INITIALIZATION.md)。

运行任务和 Node 兼容范围以 [package.json](package.json) 为准。Python 仅用于治理/资料校验，启动应用不需要 Python。没有数据库或第三方框架；`lint` 分类登记的是现有 JavaScript 语法检查，未配独立 linter。没有打包/构建/格式化任务，不应把空命令表解释为它们已经通过。

1.1.0 业务增量：归档改为两批并行合并、最多 15 项，首页加入 GitHub 链接；缓存窗口标识与浏览器升级兼容见 [问题 007](issues/007-fifteen-day-archive.md) 和 [验收记录](docs/testing/fifteen-day-archive.md)。此项不改变技术栈或运行兼容基线。

1.1.1 可靠性补丁：外壳失败回退、图片缓存预算与配额恢复、上游总量与刷新冷却、缩略图节点复用、静态 ETag/304，见 [问题 012](issues/012-cache-resource-reliability.md) 和 [验收记录](docs/testing/cache-resource-reliability.md)。运行栈、兼容基线、环境变量与存储 schema 不变。

1.2.0 新增 `lib/history.mjs` 月度索引和采集、`lib/jpeg.mjs` 图片结构检查、`lib/errors.mjs` 公共 HTTP 错误。独立历史目录由 HISTORY_DIR 指定；新增固定只读归档服务，无第三方依赖或数据库。中国区按年/月浏览与资源边界见 [历史规则](docs/rules/history.md)、[契约](docs/contracts/history.md) 和 [验证](docs/testing/china-history.md)。

1.2.1 调整历史年月选择栏的布局、焦点和窄屏样式，保留原生 select 与既有切换逻辑；验证见 [年月选择器验收](docs/testing/history-picker.md)。此次只升级应用外壳缓存，不改变运行栈、接口、环境或历史数据格式。

1.3.0 在历史模块接入 zxyongyo/bing-daily-wallpaper 固定月度 JSON，双来源合并扩大至 2018-09；图片同 ID 回退，下载展示实际尺寸，署名移至页脚。schemaVersion 1 增加可选逐源新鲜度/来源字段并兼容旧文件；运行栈、依赖和环境变量不变，新增外部服务已登记。见 [双来源验收](docs/testing/dual-history.md)。

1.3.1 为 GitHub 原始文件连接失败提供同仓库官方 API 备用读取；增加固定只读域名、8 秒原始入口 / 20 秒总预算及文件响应校验。无新依赖或秘密变量。

## 技术栈变更索引（只追加）

“技术栈变更”至少包括语言、运行时、框架、核心库、构建工具、数据库或中间件的新增、移除、替换、主版本升级，以及兼容基线变化。普通补丁升级仅在影响行为、兼容性或安全基线时记录。

| 日期 | 变更前 → 变更后 | 科学/工程理由 | 兼容、迁移与回滚影响 | 问题单 / ADR |
|---|---|---|---|---|
| 2026-10-17 | 原生 Node/浏览器应用 → 应用栈不变，增加 Python 标准库资料校验工具 | 核对导入研究字节与引用，防止历史证据漂移 | 仅维护阶段需要 Python；无业务数据迁移或运行依赖变化 | [问题 001](issues/001-governance-adoption.md) |

> 详细论证写入问题单或 ADR；本表保存可追踪索引，不得覆盖历史记录。
