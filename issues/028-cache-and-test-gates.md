# 028：缓存恢复与测试门禁完善

状态：完成，1.6.6 已发布。依据[项目评估](../docs/testing/project-review-20261102.md)的 F1/F2/F3，用户授权逐步修复并使用 change-verification 验证。修复共用近期缓存的占位图污染、旧条目恢复；补真实调度测试与独立浏览器 CI。原评估报告保留为修复前证据。

影响：近期代理、SW 图片缓存及测试基础设施；无数据迁移。保留用户数据，限定淘汰已确认无效的单张缓存。新增开发依赖不参与运行服务。关联[计划](../plans/028-cache-and-test-gates.md)、[验收](../docs/testing/cache-and-test-gates.md)、[里程碑](../milestones/028-cache-and-test-gates.md)。

用户授权发布后，已推送 main 并部署，服务器 166 项测试及线上浏览器检查通过，GitHub Actions 验证成功；详见验收发布补充。
