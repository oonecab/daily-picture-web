# 图片目录、市场与日期规则

状态：CURRENT；基线版本：1.0.0；生效日期：2026-10-17；维护角色：项目维护者。

权威范围：当前 Web 行为。代码入口 [lib/bing.mjs](../../lib/bing.mjs)，回归入口 [test/app.test.mjs](../../test/app.test.mjs)。改变本文件规则须同改实现、测试设计及必要的用户说明；原生研究只作来源。

## DP-DATE：市场与发布日期

支持市场和时间区固定为：`zh-CN → Asia/Shanghai`、`en-US → America/Los_Angeles`、`en-GB → Europe/London`、`ja-JP → Asia/Tokyo`、`de-DE → Europe/Berlin`、`fr-FR → Europe/Paris`。它们是显示约定，不能保证服务器按该地区返回独占图片。默认 `zh-CN`；未知市场报 400。

`fullstartdate` 为 12 位数字且可解析时，把年月日时分作为 UTC 时刻，通过该市场时间区得到 `YYYY-MM-DD`；例如 `202610161600` 在中国显示 `2026-10-17`。回退到 8 位数字 `startdate` 时只格式化原值，不做时区平移。两者均不可用则拒绝归档。原字段另存 `originalDate/fullStartDate`。当前格式与 Date 解析并不完整拒绝所有不存在的日历日期，若扩展严格日期校验必须补边界测试。

## DP-IMAGE：来源、标识与尺寸

归档只取非空 `images` 数组的前 7 项，解析图片地址时要求主机 `www.bing.com`、路径 `/th`；从其中提取 ID。ID 必须匹配 `^OHR\.[A-Za-z0-9_-]{1,180}$`，不允许路径、查询串或 URL 注入；同一归档的重复 ID 拒绝。

尺寸仅为 `640x360`、`1920x1080`、`UHD`、`1080x1920`；默认下载/主图接口尺寸为 `1920x1080`。尺寸参数是请求约定，不承诺每张上游图片都以相同像素返回。服务重新构造固定 HTTPS Bing URL，不直接使用元数据中的原始 URL 请求。

版权文本与原始介绍链接应保留；可点击来源只接受 HTTPS 的 `www.bing.com` 或 `cn.bing.com`，其他链接回退 Bing 首页。格式映射详见 [Bing 契约](../contracts/bing.md)。

## DP-HTTP：本机服务边界

CLI 只监听 `127.0.0.1`，Host 仅允许 `localhost` / `127.0.0.1`。请求仅允许 GET/HEAD；HEAD 不返回响应体，但仍可能执行对应获取/缓存流程。API 与静态文件均使用固定路由/白名单；不因某文件位于项目内就允许读取。

资料、磁盘缓存、治理配置与工作区路径不得暴露为通用静态目录。修改访问范围、代理目标、CSP 或新增写入操作属于边界变化，需按完整变更流程处理。

## 变更记录（只追加）

- 2026-10-17：依据现有代码建立 DP-DATE / DP-IMAGE / DP-HTTP 文档基线，未改变行为；[问题 001](../../issues/001-governance-adoption.md)。
