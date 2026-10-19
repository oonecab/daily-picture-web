# 当前测试设计与证据基线

适用日期：2026-10-17。执行测试在 `test/`；测试设计在 `docs/testing/`。本文件描述覆盖关系，真实结果必须注明执行日期、环境和范围。

## 自动回归映射

入口 [test/app.test.mjs](../../test/app.test.mjs)，Node 内置测试运行器。假上游、独立临时缓存及临时回环端口，不访问真实 Bing，不改变使用者的 `.cache` 或浏览器收藏。

| 测试名称 | 规则 / 路径 |
| --- | --- |
| `market date uses the UTC publication instant, including US daylight-saving time` | DP-DATE，UTC→市场与美国夏令时 |
| `archive normalization preserves attribution and rejects arbitrary image hosts` | DP-IMAGE，版权及来源 |
| `image validation rejects traversal, URL injection, and unknown sizes` | DP-IMAGE，参数边界 |
| `concurrent archive requests share one pair of upstream requests and cache metadata` | DP-CACHE，同键两批归档合并 |
| `two overlapping archive pages merge into fifteen dated images with recent-page precedence` | DP-ARCHIVE，参数、去重优先级、跨月排序、共享时限、完整落盘 |
| `each archive page validates its eighth image and rejects duplicate IDs within that page` | DP-IMAGE，第八项校验、单批重复拒绝 |
| `merged archives are limited to the latest fifteen images even when pages do not overlap` | DP-ARCHIVE，最多 15 项 |
| `failure of the older page cannot replace a complete cached archive with a partial result` | DP-METADATA / DP-CACHE，第二批失败时磁盘不变 |
| `an empty older page is rejected without writing a partial archive` | DP-ARCHIVE，空批次与无缓存 502 |
| `a fresh legacy seven-image cache is upgraded online and preserved as stale when offline` | DP-CACHE，旧窗口联网升级、离线保留 |
| `metadata-only changes are committed even when image IDs do not change` | DP-METADATA，元数据独立提交 |
| `a transient connection failure is retried once within the original time budget` | DP-RETRY，连接失败重试及共享信号 |
| `network failure returns explicitly stale data, including after service restart` | DP-CACHE，重启与旧数据回退 |
| `a corrupt archive cache can recover from the network` | DP-METADATA，缓存恢复 |
| `non-image responses cannot poison the image cache` | DP-IMAGE，错误内容拒绝 |
| `HTTP routes serve the app, reject writes and invalid hosts, and hide workspace files` | DP-HTTP，静态/API/Host/方法边界，十五日标题与 GitHub 目标/新标签属性 |

```text
npm run check
npm test
python -X utf8 tools/verify_research.py
```

`check` 只是 JavaScript 语法检查，没有额外 linter、类型检查或构建。`verify_research.py` 只验证资料完整性。治理 manifest 的 consistency 检查文件、字面标记和原生 JSON 事实快照，不能证明测试已经执行或业务语义正确。

## 既有实测与本次检查

[VERIFICATION.md](../../VERIFICATION.md) 是本地网页版开发阶段的原始记录：10 项自动测试、六市场实时接口、四尺寸样例解码、桌面/窄屏、收藏/设置/幻灯片、地区竞态，以及停止服务后的离线重载。该文件本次逐字保留，其真实上游与浏览器结果是历史证据，本次治理接入不自动刷新这些结论。

本次接入的结构校验、资料摘要、既有文件保留与自动回归结果另记于 [初始化验收](../governance/INITIALIZATION.md)。

1.1.0 新增六项测试，共 16 项；旧实现的失败证明及修改后的自动检查、真实上游和浏览器结果见 [最近十五日验收](fifteen-day-archive.md)。不覆盖或改写初版证据。

2026-10-19 手机修复追加 [browser-ui.test.mjs](../../test/browser-ui.test.mjs) 的 11 项浏览器状态回归，合计 27 项。测试执行完整 app.js，以隔离 DOM 和 Fullscreen API 替身覆盖接口缺失/拒绝/禁用、标准/前缀退出、焦点/滚动/背景恢复、空列表/收藏、弹窗和异步请求边界。实际视口、图片渲染与桌面原生全屏另行使用浏览器验证，见 [手机全屏与页脚验收](mobile-fullscreen-footer.md)。

## 后续验收边界

开放项见 [问题 003](../../issues/003-validation-gaps.md)：实际一小时刷新、真实手机触摸、其他浏览器、PWA 系统安装、最终下载文件以及长期缓存压力。测试名称不能超出断言范围，例如共享 AbortSignal 测试不是实际等待 20 秒超时的端到端证明。

涉及缓存规则应追加真实失败路径的回归；涉及浏览器生命周期应验证取消/迟到结果、可见性和离线回退，保留环境与截图/日志。纯文档变更按风险评估选择检查，不为复制实现而增加无意义测试。
