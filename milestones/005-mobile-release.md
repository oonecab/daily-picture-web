# 005：手机体验修复上线

- 状态：in-progress；目标日期：2026-10-19（Asia/Shanghai）。
- 组成：[问题 009](../issues/009-mobile-release.md)、[计划 005](../plans/005-mobile-release.md)、[发布验收](../docs/testing/mobile-release.md)。

## 验收条件

- 手机全屏回退、退出恢复和页脚 SVG 已实现，代码、11 项 UI 状态回归与文档一致。
- 登记检查通过，源码和记录正常推送到 main，最终远端与本地提交一致。
- 服务器独立版本已验证并激活，旧版可回滚；服务健康，公网 HTTPS 与关键交互通过。
- 最终生产运行文件与 Git HEAD 摘要一致，工作区干净。

## 证据状态

本地功能验收已完成，发布证据待 [验收记录](../docs/testing/mobile-release.md) 回填。实体 iPhone、系统安装和长期缓存压力沿用既有验证范围。
