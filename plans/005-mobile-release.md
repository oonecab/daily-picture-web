# 005：手机体验修复发布计划

- 状态：in-progress；关联 [问题 009](../issues/009-mobile-release.md)、[里程碑 005](../milestones/005-mobile-release.md)。

## 步骤与验收

1. `[done]` 核对授权、远端和现有部署，补齐环境事实；执行登记检查、差异与凭据检查。
2. `[in-progress]` 按明确清单提交到 main，普通推送；读取远端提交确认。
3. `[pending]` 从提交生成运行包和 SHA-256 清单，上传至独立版本目录；校验、运行服务器回归并连接既有缓存。
4. `[pending]` 原子切换 current，重启 daily-picture；核对服务、HTTPS 文件摘要及实际手机尺寸浏览器交互。
5. `[pending]` 将结果写入验收记录，提交推送记录；核对最终 Git 状态及生产运行文件与最终 HEAD 的一致性。

## 风险与回滚

先保存旧 current 目标与服务/Nginx 配置摘要。重启或健康检查失败即恢复旧 current 并重启，核对健康响应和旧文件摘要。独立版本目录保留；部署不需要数据库迁移。站点收藏在客户端，服务器缓存沿用 `/var/lib/daily-picture`。

## 文档与测试

全屏行为的失败证明、回归与本地浏览器证据见 [手机修复验收](../docs/testing/mobile-fullscreen-footer.md)。本轮重复登记的语法、27 项回归和研究完整性检查，服务器执行同一语法/回归；发布验收额外检查 Git、摘要、服务、HTTP/TLS 和真实页面。同步文件清单及结果见 [发布验收](../docs/testing/mobile-release.md)。
