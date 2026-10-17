# Bing 外部契约

状态：**CURRENT（应用消费约定，1.1.0）**。来源为 [适配源码](../../lib/bing.mjs)、[最近十五日验收](../testing/fifteen-day-archive.md)、[初版实测记录](../../VERIFICATION.md) 和 [原生研究](../reverse-engineering/source/docs/network-and-download.md)。这些材料不是 Bing 官方稳定 API 或服务可用性承诺；接口变化需重新验证。

## 调用范围与证据

| 维度 | 当前事实 | 证据 / 限度 |
| --- | --- | --- |
| 本次任务授权 | 用户要求扩展最近十五日、首页 GitHub 链接，验证后提交推送指定仓库 | 不推导生产服务器更新、其他账号操作或第三方图片再分发授权 |
| 代码使用 | 固定 HTTPS `www.bing.com` 归档与 `/th` 图片端点，禁止跟随重定向 | `createBingService`；不接收用户提供的任意 URL |
| 当前实测 | 六市场经两批合并各返回 15 个唯一 ID，日期为 2026-10-17 至 2026-10-03 | 2026-10-17 本地 1.1.0 实际调用，详见最近十五日验收；不保证未来数量 |
| 历史实测 | 初版六市场各返回 7 张；一个图片样例的四种尺寸实际解码 | 保留原验证记录，不将历史尺寸验证扩大为全部图片 |
| 未知 | 长期稳定性、全部图片尺寸、历史图片永久可用、上游完整服务政策 | 不由本地检查或原生静态研究推出 |

归档向 `https://www.bing.com/HPImageArchive.aspx` 并行发送 `format=js&idx=0&n=8&mkt=<market>` 和 `format=js&idx=7&n=8&mkt=<market>`，使用相同市场。两批分别校验，按图片 ID 合并去重，重叠时优先 idx=0 批次；按市场显示日期降序排列，同日按原始发布时间降序，最多 15 项。任一批失败或为空则整次刷新失败，不提交部分结果。图片请求：`https://www.bing.com/th?id=<OHR标识>_<size>.jpg`。市场和尺寸必须来自 [目录规则](../rules/catalog.md)，重试、限额和旧数据规则见 [缓存规则](../rules/cache.md)。

## 字段映射

| 上游字段 | 本地字段 | 转换 / 失败语义 |
| --- | --- | --- |
| `images` | `images` | 每批必须为非空数组，最多取前 8 项；单批重复 ID 拒绝整个刷新，跨批重复按上述规则去重。允许少于 15 项，不补图 |
| `urlbase`，否则 `url` | `id` | 解析 `/th` 的 id，移除已知尺寸/JPEG 后缀，再过 OHR 校验；从不直接代理该 URL |
| `fullstartdate` / `startdate` | `date`、`fullStartDate`、`originalDate` | DP-DATE；保留原始字段，不把字符串长度校验称为完整日历校验 |
| `title` / `copyright` | `title` | 标题有回退，截断至 300 字符 |
| `copyright` | `copyright`、`description`、`credit` | 版权文本截断至 1000 字符，再按末尾 `(©` 拆分说明与署名；格式变更可能降低拆分效果 |
| `copyrightlink` | `sourceUrl` | 仅接受 HTTPS Bing 指定主机；其他值回退 Bing 首页 |
| `wp` | `wallpaper` | 只有布尔值 `true` 转为 true；不等同授予图片使用权 |
| 本机时间 / 请求参数 | `fetchedAt`、`market`、`marketLabel`、`schemaVersion` | 成功规范化后生成，本地 schemaVersion 为 1 |
| 本地归档窗口 | `windowDays` | 1.1.0 的完整两批结果写入 15；该值表示请求窗口，实际数量以 images.length 为准。旧缓存缺少该字段时重新获取，失败仍可 stale 回退 |

本地 API 的错误为 JSON `error`。参数不合法 400；未命中静态/路由白名单 404；方法不允许 405；上游失败且无可用缓存 502。Service Worker 无归档可回退时为 503。已有缓存的成功响应需结合 `stale` 与 `cache` 判断新鲜度，不能仅凭 HTTP 200 宣称实时。

保留图片来源、版权及介绍链接。此项目未获得、也未声称拥有原应用或上游图片的再许可；可见界面与下载功能的实现不改变作品权利。
