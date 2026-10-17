# Bing 外部契约

状态：**CURRENT（应用消费约定）**。来源为 [适配源码](../../lib/bing.mjs)、[2026-10-17 实测记录](../../VERIFICATION.md) 和 [原生研究](../reverse-engineering/source/docs/network-and-download.md)。这些材料不是 Bing 官方稳定 API 或服务可用性承诺；接口变化需重新验证。

## 调用范围与证据

| 维度 | 当前事实 | 证据 / 限度 |
| --- | --- | --- |
| 本地任务授权 | 用户要求实现本地 Web，后续要求初始化治理并纳入逆向资料 | 不推导外部发布、其他账号操作或第三方图片再分发授权 |
| 代码使用 | 固定 HTTPS `www.bing.com` 归档与 `/th` 图片端点，禁止跟随重定向 | `createBingService`；不接收用户提供的任意 URL |
| 已有实测 | 六市场各返回 7 张；一个图片样例的四种尺寸实际解码 | 2026-10-17 原验证记录，本次治理没有再次联网实测 |
| 未知 | 长期稳定性、全部图片尺寸、历史图片永久可用、上游完整服务政策 | 不由本地检查或原生静态研究推出 |

归档请求：`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=7&mkt=<market>`。图片请求：`https://www.bing.com/th?id=<OHR标识>_<size>.jpg`。市场和尺寸必须来自 [目录规则](../rules/catalog.md)，重试、限额和旧数据规则见 [缓存规则](../rules/cache.md)。

## 字段映射

| 上游字段 | 本地字段 | 转换 / 失败语义 |
| --- | --- | --- |
| `images` | `images` | 必须为非空数组，最多取前 7 项；重复 ID 拒绝整个归档 |
| `urlbase`，否则 `url` | `id` | 解析 `/th` 的 id，移除已知尺寸/JPEG 后缀，再过 OHR 校验；从不直接代理该 URL |
| `fullstartdate` / `startdate` | `date`、`fullStartDate`、`originalDate` | DP-DATE；保留原始字段，不把字符串长度校验称为完整日历校验 |
| `title` / `copyright` | `title` | 标题有回退，截断至 300 字符 |
| `copyright` | `copyright`、`description`、`credit` | 版权文本截断至 1000 字符，再按末尾 `(©` 拆分说明与署名；格式变更可能降低拆分效果 |
| `copyrightlink` | `sourceUrl` | 仅接受 HTTPS Bing 指定主机；其他值回退 Bing 首页 |
| `wp` | `wallpaper` | 只有布尔值 `true` 转为 true；不等同授予图片使用权 |
| 本机时间 / 请求参数 | `fetchedAt`、`market`、`marketLabel`、`schemaVersion` | 成功规范化后生成，本地 schemaVersion 为 1 |

本地 API 的错误为 JSON `error`。参数不合法 400；未命中静态/路由白名单 404；方法不允许 405；上游失败且无可用缓存 502。Service Worker 无归档可回退时为 503。已有缓存的成功响应需结合 `stale` 与 `cache` 判断新鲜度，不能仅凭 HTTP 200 宣称实时。

保留图片来源、版权及介绍链接。此项目未获得、也未声称拥有原应用或上游图片的再许可；可见界面与下载功能的实现不改变作品权利。
