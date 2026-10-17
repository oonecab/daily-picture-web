# 原应用观察与 Web 实现对应

状态日期：2026-10-17。原应用列依据同目录 `source/` 的静态研究；Web 列依据当前源码。测试结果和覆盖限度见 [测试基线](../testing/current-baseline.md)。本表负责设计溯源，具体业务规则以 [规则目录](../rules/README.md) 为准。

| 主题 | 原应用观察及依据 | 当前 Web 实现 | 状态 / 验证 |
| --- | --- | --- | --- |
| 归档来源 | [网络与下载](source/docs/network-and-download.md)：HTTP Bing 归档模板，前台默认 7 张；无显式 `mkt` | 固定 HTTPS，`idx=0&n=7`，六个显式市场；保留近七日语义 | 继承核心流程并调整传输/市场；2026-10-17 六市场实测见原验证记录 |
| 发布日期 | [数据模型](source/docs/data-model-and-storage.md)：保留服务返回的日期字段 | 先把 `fullstartdate` 当 UTC 时刻转为市场时区；保留原始字段，必要时回退 `startdate` | Web 规则 DP-DATE；含夏令时单测，不将原始字段直接当显示日期 |
| 元数据落盘 | [网络与下载](source/docs/network-and-download.md)：是否下载新图影响归档提交与清理 | 元数据独立原子提交，即使图片 ID 相同也保存标题/版权变化 | 主动调整；DP-METADATA 回归测试 |
| 图片加载 | [图片生命周期](source/docs/image-loading-and-lifetime.md)：懒加载可重复发起；解绑回调不等同清空位图 | 服务合并同键在途请求；前端切市场取消请求并用代次检查丢弃迟到结果 | 主动调整；服务去重有自动测试，浏览器地区切换有历史实测 |
| 缓存身份 | [网络与下载](source/docs/network-and-download.md)：完整 URL 的比较及命名文件参与命中 | 校验后的 OHR 标识与尺寸组成图片键，市场构成归档键 | 独立设计；DP-IMAGE 与 DP-CACHE |
| 失败恢复 | [未解问题 U-07](source/docs/unknowns.json)：部分原生异常持久化行为缺运行时证据 | 有界重试；失败显式返回 stale 缓存，无缓存时报错；元数据提交失败同样走错误路径 | Web 行为已有回归；不能据此关闭 U-07 |
| 计时器 | [计时器与清理](source/docs/timers-and-disposal.md)：1 小时刷新及 5 秒切换相关静态路径；Dispose 自动调用边界未证实 | 可见页面按分钟检查一小时阈值，幻灯片间隔 8 秒；隐藏停计时，恢复时补查 | Web 主动调整；短时切换已实测，一小时实耗验证仍待完成 |
| 挂起与释放 | [挂起与恢复](source/docs/suspend-and-resume.md)：正常挂起路径取 deferral 后立即完成，未发现相应保存/停止调用 | `pagehide` 取消归档请求、停止计时并回收下载 Blob URL | Web 生命周期设计，不声称修复原生程序或证明其泄漏 |
| 桌面/锁屏/磁贴 | [后台与系统集成](source/docs/background-and-personalization.md)：Windows 专有集成及后台任务静态路径 | 提供下载，由用户自行设置壁纸；无锁屏/磁贴/页面关闭后的任务 | 有意不实现；不能把网页计时器称作 Windows 后台调度 |
| 收藏与离线 | 原应用存储依据见 [数据模型](source/docs/data-model-and-storage.md) | 浏览器收藏元数据、偏好及 Service Worker 缓存；不读取原应用数据库或图片目录 | Web 独立功能；收藏持久化及停服离线重载有历史验证，非永久图片备份 |

源码入口：[Bing 适配](../../lib/bing.mjs)、[HTTP 服务](../../server.mjs)、[浏览器状态](../../public/app.js)、[Service Worker](../../public/sw.js)。

原应用尚有 12 项未解问题，完整状态保留在 [unknowns.json](source/docs/unknowns.json)。其涉及符号、XBF、真实请求、服务器地区选择、异常、存储 ABI、后台调度及 GC 等；此 Web 项目既未继续执行那些探针，也未将静态调用图升级为运行时证明。
