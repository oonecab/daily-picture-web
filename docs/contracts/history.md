# 中国区历史归档契约

状态：CURRENT，1.4.0；2026-10-21。本项目独立编写适配代码，历史来源仅供一次性导入，日常网站读取自己的索引与图片。

## 一次性历史来源

[npanuhin/Bing-Wallpaper-Archive](https://github.com/npanuhin/Bing-Wallpaper-Archive) 提供中国区月 JSON `https://bing.npanuhin.me/CN-zh.YYYY.MM.json` 与图片副本 `https://bing.npanuhin.me/CN/zh/YYYY-MM-DD.jpg`；[zxyongyo/bing-daily-wallpaper](https://github.com/zxyongyo/bing-daily-wallpaper) 提供月 JSON `https://raw.githubusercontent.com/zxyongyo/bing-daily-wallpaper/master/archives/YYYY/YYYY-MM/YYYY-MM.json`。两个项目软件为 MIT，摄影作品不因索引导入成为本站 MIT 内容；见 [第三方声明](../../THIRD_PARTY_NOTICES.md)。

npanuhin 消费 date、caption/title、description、copyright、url、bing_url；url 必须精确匹配固定图片路径。zxyongyo 消费 date、title、copyright、url_4k（否则 url_1080），其他尺寸若提供必须同一 ID；导入工具把冲突记录隔离到报告，不猜测 URL。标题上限 300、归档说明 5000、版权 1000 字符；每月最多 31 条唯一真实日期。上游日期不做额外时区平移，旧链接可能包含其他市场 ID。

Bing 图片引用仅接受 HTTPS、bing.com/www.bing.com/cn.bing.com、路径 /th、无端口或用户信息、唯一 id 参数和合法 OHR 标识。只提取 ID 与 UHD / 1920x1080 变体，再构造固定请求，不代理任意地址。导入同图可依次使用备份、UHD、记录的 1920x1080 文件加 3840×2160 参数；不代表原生 4K。

GitHub 原始入口最多 8 秒，传输/408/429/5xx 故障可回退同仓库 Contents API，总预算 20 秒；404、非法数据、资源队列满不回退。API 只解码 type=file、encoding=base64、精确 path、有效 size 且解码字节数匹配的响应；不跟随 download_url。无令牌且受公开限额约束。`--source-dir` 可读取事先取得的仓库月文件，不执行源仓库脚本。

## 自有每日数据

工作流从 Bing 的近期接口采集，写入自己的 `codex/wallpaper-data` 分支。latest.json 包含 schemaVersion=1、market=zh-CN、fetchedAt、1～15 项 images；月文件保持 schemaVersion=1，按日期合并，其他月份保留。服务从 HISTORY_REPOSITORY（默认 oonecab/daily-picture-web）的该固定路径读取，沿用上述 GitHub 传输校验。每日记录只保留受限文本、有效日期/ID、允许的 Bing 来源链接，不保留未知对象字段。访客请求不读取该分支或两个历史项目；只有后台同步读取分支并从 Bing 保存新图。

## 本地 API

| 请求 | 返回 |
| --- | --- |
| GET /api/history | market、降序 months、latest、firstMonth:2018-09、sources 两历史来源信息、sync 同步状态。可选 market 只接受 zh-CN |
| GET /api/history?month=2024-04 | 本站月索引及 imported、stale、warning；refresh=1 仍只重读本站文件，不触发第三方访问。未导入返回 images:[] / imported:false 和明确提示 |
| GET /api/history/image?date=2024-04-03&id=OHR.…&size=thumb | 本站 JPEG 缩略图，宽度最多 640 |
| 同一路由 size=preview | 本站 JPEG 预览，宽度最多 1920 |
| 同一路由 size=original 或省略 size | 本站原图原始字节；download=1 附件名 Bing_CN_YYYY-MM-DD.jpg |

图片 ID 可选但前端始终传入，必须匹配当前日期索引；不同 ID/尺寸用不同 URL，隔离缓存。省略 size 沿用旧客户端原图行为。图片以 date 与 ID 的摘要定位，接口不接收 URL/路径。损坏派生图可从本站原图重建；缺失原图返回 404，不在请求中下载上游。

月条目保留 history:true、source:npanuhin|zxyongyo|bing、sources、可选 bingVariant、snapshot、availability。可用图片附 stored:true、width/height 与 checkedAt。providers 与 importedAt 为导入溯源字段，旧 providerFetchedAt 兼容解释为 npanuhin 时间；schemaVersion 保持 1。

sync 字段包括 lastSuccessAt（索引保存）、fetchedAt（Actions 采集）、lastMediaSuccessAt（全部新图保存）、checkedAt、source、repository、branch、saved、total、failures、stale、error。未执行过的字段可能缺失，不能按零或成功解释。

元数据 no-store；成功图片 public,max-age=86400；错误 no-store。非法日期/尺寸/ID 为 400，未收录或未保存为 404，本地文件损坏为 500，图片处理容量满为 503 + Retry-After。GET/HEAD、Host 白名单保持原约束，HEAD 无正文。导入/后台上游失败内部记为 502 并保留索引；浏览器可重新读取本站，不保证源端故障已经恢复。

持久化、时间、采集、合并、可用性和加载规则统一见 [历史规则](../rules/history.md)，验证证据见 [自有图库验收](../testing/owned-history.md)。
