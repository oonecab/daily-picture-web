# 026：统一下拉菜单样式

状态：验证中；日期：2026-10-31；风险：重要变更（正式发布）。

Windows 原生菜单的白底、蓝色高亮和紧凑行距与页面风格不一致。范围为顶部地区、历史地区、历史年份、历史月份四个原生 select，统一展开面板和交互状态。

采用 CSS 可定制原生选择器渐进增强，保留原有选择和联动逻辑。不支持 appearance:base-select 的浏览器继续使用原生菜单；不引入 JavaScript 组件或依赖。更新 README、TECH、浏览器规则及外壳版本；API、环境、收藏和媒体缓存不变，无数据迁移。

用户已授权清理已合并分支及美化全部下拉框；沿用本会话的提交、推送和服务器部署授权。codex/image-bandwidth 已确认与 main 同为 c023a4f 后删除本地和远端引用。

关联：[计划](../plans/026-select-styling.md)、[验证](../docs/testing/select-styling.md)、[里程碑](../milestones/026-select-styling.md)。
