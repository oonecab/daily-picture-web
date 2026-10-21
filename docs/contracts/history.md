# 中国区历史归档契约

状态：CURRENT，1.2.0；2026-10-21。本项目独立编写适配代码，消费公开归档数据，没有复制上游源码。

## 外部来源

项目：[npanuhin/Bing-Wallpaper-Archive](https://github.com/npanuhin/Bing-Wallpaper-Archive)，接口说明以其 README 为准；网站：[Bing Wallpaper Archive](https://bing.npanuhin.me/)。项目仓库声明 MIT；摄影作品、版权和说明不因仓库许可证转为本项目的 MIT 内容。见 [第三方声明](../../THIRD_PARTY_NOTICES.md)。上游声明可能变化，以下是当前消费约定，不是 SLA。

- 月度索引：固定 `https://bing.npanuhin.me/CN-zh.YYYY.MM.json`，数组，日期升序；本项目规范化后降序。
- 图片副本：固定 `https://bing.npanuhin.me/CN/zh/YYYY-MM-DD.jpg`。
- 上游 404 表示记录或图片不存在。只按需取月索引和用户浏览的图片，不下载完整图库。
- `date` 原样保留；`caption` 优先作为标题，回退 `title`；`description` 回退 `title`；`copyright` 保留为版权/署名；`url` 必须精确匹配固定图片路径。`bing_url` 仅用于抽取合法 OHR ID，允许指定 Bing HTTPS 主机的 `/th`，不直接代理该地址。
- 字符串上限：标题 300 字符、说明 5000 字符、版权 1000 字符。单月非数组、超过 31 项、重复/无效日期、跨月或任意来源 URL 均拒绝整次刷新。
- 上游文档提醒旧 Bing 链接可能返回占位图，因此优先读取其保存副本；不将 HTTP 200 当作有效图片证明。

## 本地 API

| 请求 | 返回 |
| --- | --- |
| `GET /api/history` | `market`、降序 `months`、`latest`、来源信息及 `sync.lastSuccessAt/error`。可选 `market` 只接受 zh-CN |
| `GET /api/history?month=2024-04` | schemaVersion=1、month、market、images、providerFetchedAt、providerMissing、source、stale、warning；`refresh=1` 绕过 TTL，仍受 60 秒冷却 |
| `GET /api/history/image?date=2024-04-03` | 已有索引对应的原始 JPEG；可选 `id` 必须匹配当前记录，前端用它隔离图片更新后的缓存；`download=1` 返回 `Bing_CN_YYYY-MM-DD.jpg` 附件名 |

月度条目兼容现有收藏字段，附加 `history:true`、`source:npanuhin|bing`、`snapshot:boolean`、`availability`。图片参数不接收 URL 或路径；原图接口不提供尺寸转换。元数据 `no-store`，图片 `public,max-age=86400`；错误 `no-store`。

非法输入 400，未收录图片日期 404，损坏的本地历史文件 500，无可回退索引或无有效图片 502，上游队列满 503 + Retry-After。GET/HEAD 继续受 Host 和方法白名单约束，HEAD 不返回正文。客户端断开不取消服务已开始的共享上游请求，但上游预算保持有界。

持久化、采集、合并、失败和加载规则的唯一权威来源为 [历史规则](../rules/history.md)。本次真实读取和浏览器证据见 [验证](../testing/china-history.md)。
