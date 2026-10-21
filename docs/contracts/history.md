# 中国区历史归档契约

状态：CURRENT，1.3.1；2026-10-21。本项目独立编写适配代码，消费公开归档数据，没有复制上游源码。

## 外部来源

项目：[npanuhin/Bing-Wallpaper-Archive](https://github.com/npanuhin/Bing-Wallpaper-Archive)，接口说明以其 README 为准；网站：[Bing Wallpaper Archive](https://bing.npanuhin.me/)。项目仓库声明 MIT；摄影作品、版权和说明不因仓库许可证转为本项目的 MIT 内容。见 [第三方声明](../../THIRD_PARTY_NOTICES.md)。上游声明可能变化，以下是当前消费约定，不是 SLA。

- 月度索引：固定 `https://bing.npanuhin.me/CN-zh.YYYY.MM.json`，数组，日期升序；本项目规范化后降序。
- 图片副本：固定 `https://bing.npanuhin.me/CN/zh/YYYY-MM-DD.jpg`。
- 上游 404 表示记录或图片不存在。只按需取月索引和用户浏览的图片，不下载完整图库。
- `date` 原样保留；`caption` 优先作为标题，回退 `title`；`description` 回退 `title`；`copyright` 保留为版权/署名；`url` 必须精确匹配固定图片路径。`bing_url` 仅用于抽取合法 OHR ID，允许指定 Bing HTTPS 主机的 `/th`，不直接代理该地址。
- 字符串上限：标题 300 字符、说明 5000 字符、版权 1000 字符。单月非数组、超过 31 项、重复/无效日期、跨月或任意来源 URL 均拒绝整次刷新。
- 上游文档提醒旧 Bing 链接可能返回占位图，因此优先读取其保存副本；不将 HTTP 200 当作有效图片证明。

补充项目：[zxyongyo/bing-daily-wallpaper](https://github.com/zxyongyo/bing-daily-wallpaper)，MIT，Copyright (c) 2023 zxyongyo。读取固定 `https://raw.githubusercontent.com/zxyongyo/bing-daily-wallpaper/master/archives/YYYY/YYYY-MM/YYYY-MM.json`，不读取整库 map.json。

- 消费 `date`、`title`、`copyright` 和 `url_4k`（缺失时 url_1080），其余图片 URL 若有也须属于同一 ID。该项目提供链接，不为本站提供图片备份。
- Bing 链接只接受 HTTPS、bing.com / www.bing.com / cn.bing.com、`/th`、无端口/用户信息、唯一 id 参数。提取规范 OHR ID 与 UHD / 1920x1080 变体后由本站构造固定请求，不保存/代理任意 URL 或参数。
- 不从 URL 的市场后缀反推发布日期或重写源日期；旧记录可能含其他市场 ID，按其中国区历史集合展示。月内唯一真实日期、最多 31 条及字符串约束与原来源一致。
- 原图可在同 ID 上依次使用归档副本、Bing UHD、记录的 1920x1080 文件加 3840×2160 请求参数；标记 4K 不等于原生 4K，显示实际解码尺寸。

1.3.1 增加传输故障备用入口 `https://api.github.com/repos/zxyongyo/bing-daily-wallpaper/contents/archives/YYYY/YYYY-MM/YYYY-MM.json?ref=master`。只解码 type=file、encoding=base64、path 精确匹配、size 等于解码长度的响应；忽略 download_url，不跟随任意链接。providers 内可选 transport 为 archive / raw / github-api，便于诊断，不改变条目来源归属。两个入口总预算 20 秒，原始入口最多 8 秒。API 不使用令牌，受公开访问限额约束。

## 本地 API

| 请求 | 返回 |
| --- | --- |
| `GET /api/history` | `market`、降序 `months`、`latest`、`firstMonth:2018-09`、`sources` 两来源信息及 `sync.lastSuccessAt/error`。可选 `market` 只接受 zh-CN |
| `GET /api/history?month=2024-04` | schemaVersion=1、month、market、images、providerFetchedAt、providerMissing、providers、source、sources、stale、warning；`refresh=1` 绕过 TTL，仍受 60 秒冷却 |
| `GET /api/history/image?date=2024-04-03` | 已有索引对应的原始 JPEG；可选 `id` 必须匹配当前记录，前端用它隔离图片更新后的缓存；`download=1` 返回 `Bing_CN_YYYY-MM-DD.jpg` 附件名 |

`providers` 按来源记录 fetchedAt/missing；providerMissing 仅在所有适用来源均明确缺档时为 true。兼容保留 source 为原 npanuhin 描述，完整来源请读 sources。旧文件的 providerFetchedAt 只代表 npanuhin，读取后转为可选 providers 字段；schemaVersion 保持 1。

月度条目兼容现有收藏字段，附加 `history:true`、`source:npanuhin|zxyongyo|bing`、`sources`（同 ID 的贡献来源）、可选 `bingVariant`、`snapshot:boolean`、`availability`。图片参数不接收 URL 或路径；原图接口不提供尺寸转换。元数据 `no-store`，图片 `public,max-age=86400`；错误 `no-store`。

非法输入 400，未收录图片日期 404，损坏的本地历史文件 500，无可回退索引或无有效图片 502，上游队列满 503 + Retry-After。GET/HEAD 继续受 Host 和方法白名单约束，HEAD 不返回正文。客户端断开不取消服务已开始的共享上游请求，但上游预算保持有界。

持久化、采集、合并、失败和加载规则的唯一权威来源为 [历史规则](../rules/history.md)。本次真实读取和浏览器证据见 [双来源验证](../testing/dual-history.md)。
