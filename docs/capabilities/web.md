# Web 与 API 边界规范

<!-- project-governance:managed:start -->
- 明确浏览器、API、授权和持久化边界；服务端必须自行验证输入与权限，不能依赖前端隐藏按钮。
- API 兼容性变化同步唯一契约、受影响调用方和契约/回归测试；区分身份认证与具体资源授权。
- 列表分页、导出、错误语义和用户可见边界应有真实路径验证；容量、超时和并发限制由项目实测决定，不填造统一阈值。
- 访问生产或外部系统仍需明确授权；启用本规范不授权启动服务、发送请求、迁移数据库或部署。
<!-- project-governance:managed:end -->

## 项目权威入口与例外

[当前架构](../architecture/web-app.md)、[HTTP 与图片边界](../rules/catalog.md)、[浏览器持久化](../rules/browser-state.md)、[测试基线](../testing/current-baseline.md)。当前无账号鉴权；服务定位为本机回环，不能直接把这一设计推广到公开服务。
