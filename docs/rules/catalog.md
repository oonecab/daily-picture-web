# 图片目录、市场与日期规则

状态：CURRENT；基线版本：1.1.1；生效日期：2026-10-20；维护角色：项目维护者。

权威范围：当前 Web 行为。代码入口 [lib/bing.mjs](../../lib/bing.mjs)，回归入口 [test/app.test.mjs](../../test/app.test.mjs)。改变本文件规则须同改实现、测试设计及必要的用户说明；原生研究只作来源。

## DP-DATE：市场与发布日期

支持市场和时间区固定为：`zh-CN → Asia/Shanghai`、`en-US → America/Los_Angeles`、`en-GB → Europe/London`、`ja-JP → Asia/Tokyo`、`de-DE → Europe/Berlin`、`fr-FR → Europe/Paris`。它们是显示约定，不能保证服务器按该地区返回独占图片。默认 `zh-CN`；未知市场报 400。

`fullstartdate` 为 12 位数字且可解析时，把年月日时分作为 UTC 时刻，通过该市场时间区得到 `YYYY-MM-DD`；例如 `202610161600` 在中国显示 `2026-10-17`。回退到 8 位数字 `startdate` 时只格式化原值，不做时区平移。两者均不可用则拒绝归档。原字段另存 `originalDate/fullStartDate`。当前格式与 Date 解析并不完整拒绝所有不存在的日历日期，若扩展严格日期校验必须补边界测试。

## DP-ARCHIVE：最近十五日归档

同一市场并行请求 `idx=0&n=8` 和 `idx=7&n=8`。两批通过 DP-IMAGE 校验后按图片 ID 去重；重复项保留 idx=0 批次的信息，不受请求完成先后影响。按市场显示日期降序排列，同日按原始 `fullStartDate` 降序，最多返回前 15 项。例：两批各 8 项、重叠 1 项时返回 15 项；无重叠共 16 项时保留最新 15 项。

两批均成功才更新归档，任一批失败或为空都不提交部分结果。Bing 可能返回不足 15 项，界面显示实际数量；不补重复或示例图片，不承诺完整历史图库。1.2.0 的中国区按月历史入口独立遵循 [DP-HISTORY](history.md)。API 保持 schemaVersion=1，新增 `windowDays: 15` 表示请求窗口；旧缓存兼容见 DP-CACHE。

## DP-IMAGE：来源、标识与尺寸

每批只取非空 `images` 数组的前 8 项，解析图片地址时要求主机 `www.bing.com`、路径 `/th`；从其中提取 ID。ID 必须匹配 `^OHR\.[A-Za-z0-9_-]{1,180}$`，不允许路径、查询串或 URL 注入；单批内重复 ID 拒绝，跨批重叠由 DP-ARCHIVE 去重。

尺寸仅为 `640x360`、`1920x1080`、`UHD`、`1080x1920`；默认下载/主图接口尺寸为 `1920x1080`。尺寸参数是请求约定，不承诺每张上游图片都以相同像素返回。服务重新构造固定 HTTPS Bing URL，不直接使用元数据中的原始 URL 请求。

版权文本与原始介绍链接应保留；每日精选的可点击来源只接受 HTTPS 的 `www.bing.com` 或 `cn.bing.com`，其他链接回退 Bing 首页。格式映射详见 [Bing 契约](../contracts/bing.md)。

## DP-HTTP：本机服务边界

CLI 只监听 `127.0.0.1`，Host 仅允许 `localhost` / `127.0.0.1`。请求仅允许 GET/HEAD；HEAD 不返回响应体，但仍可能执行对应获取/缓存流程。API 与静态文件均使用固定路由/白名单；不因某文件位于项目内就允许读取。

资料、磁盘缓存、治理配置与工作区路径不得暴露为通用静态目录。修改访问范围、代理目标、CSP 或新增写入操作属于边界变化，需按完整变更流程处理。

1.1.1 的静态白名单资源提供内容 SHA-256 强 ETag，继续使用 `Cache-Control: no-cache`。GET/HEAD 的 If-None-Match 支持弱比较、逗号列表和 `*`，命中返回无响应体的 304；不匹配返回 200，HEAD 仍省略响应体。API 不复用此条件请求策略，归档仍 no-store，图片仍 public/max-age/immutable。服务资源队列满时返回 JSON 503 与 `Retry-After: 5`，不得缓存错误响应。

## 变更记录（只追加）

- 2026-10-17：依据现有代码建立 DP-DATE / DP-IMAGE / DP-HTTP 文档基线，未改变行为；[问题 001](../../issues/001-governance-adoption.md)。
- 2026-10-17：1.1.0 新增 DP-ARCHIVE，单批校验扩大到 8 项，两批合并最多 15 项；DP-DATE / DP-HTTP 不变；[问题 007](../../issues/007-fifteen-day-archive.md)。
- 2026-10-20：1.1.1 DP-HTTP 增加静态条件请求及资源繁忙响应；[问题 012](../../issues/012-cache-resource-reliability.md)。

- 2026-10-21：1.2.0 新增固定历史归档源和历史 API，安全与日期边界见 [历史规则](history.md)；现有精选请求和尺寸约定保留。
