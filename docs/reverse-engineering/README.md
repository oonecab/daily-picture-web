# Daily Picture 逆向资料

这里保存网页版的设计依据：Daily Picture **1.4.13.0 x64** 的 REA 静态分析及证据快照。导入日期为 2026-10-17。它说明原应用的观察结果，不是本 Web 项目的运行代码，也不证明原应用的运行时行为。

许可范围：`source/` 原始快照不纳入项目根目录 MIT 许可，保留各项材料原有权利状态；快照之外由本项目自行撰写的说明适用项目许可。详见 [第三方内容说明](../../THIRD_PARTY_NOTICES.md)。

## 从哪里开始

| 入口 | 内容 |
| --- | --- |
| [原始研究入口](source/README.md) | 目标、分析范围、文档导航 |
| [原始架构总览](source/ARCHITECTURE.md) | 分层、主要调用与数据流 |
| [初步分析](source/ANALYSIS.md) / [深入分析](source/DEEP_ANALYSIS.md) | 逆向过程与证据结论 |
| [网络与下载](source/docs/network-and-download.md) | Bing 请求模板、缓存与下载提交条件 |
| [数据模型与存储](source/docs/data-model-and-storage.md) | 字段、持久化与清理 |
| [图片加载与生命周期](source/docs/image-loading-and-lifetime.md) | 懒加载、异步加载、对象持有关系 |
| [计时器与清理](source/docs/timers-and-disposal.md) / [挂起与恢复](source/docs/suspend-and-resume.md) | 生命周期的静态路径与未证实边界 |
| [函数索引](source/docs/function-map.json) / [CSV](source/docs/function-map.csv) | 函数地址、语义与证据引用 |
| [未解问题](source/docs/unknowns.json) | 12 项 partial / unobserved-runtime 问题，保留原状态 |
| [Web 对应表](web-mapping.md) | 原应用观察与网页版实现的区别 |
| [来源与摘要清单](provenance.json) | 导入文件、SHA-256、完整源目录索引、未打包引用 |

## 证据边界

- `source/` 是只读参考快照，文件逐字节复制，未改写证据、换行或相对链接。改进说明应写在本目录的新文档中，不回写历史结论。
- 快照包含 14 篇主要 Markdown、索引和它们递归引用的文本证据。未声称完整打包原始工作区；JSON 内部路径和历史脚本的依赖没有递归打包。原始安装包、全部符号/PDB、完整运行环境并不在此快照中。
- 原始工作区：`E:\study\rea\daily-picture`；来源会话：`逆向-dailyPicture`，ID `01a148f9-71c4-7f30-80d8-a02db939ad20`。这些是来源定位信息，不是可随项目迁移的依赖。
- 原始主 DLL 的 SHA-256 为 `d9c4f3d1803ed27c3da21c1e70164423166c1460f53f0020f4ac2c68b413033a`。这标识分析目标；不是当前 Web 代码的摘要。
- 历史校验报告列出 215 个重点函数、179 条 REA 证据记录，失败列表为空。导入没有重跑原生分析、执行目标程序或验证系统壁纸操作；历史成功不能替代本次检查。
- 原应用行为需分别标注静态观察、推断、运行时证明和未知。Web 测试通过不能关闭原应用的未知项，也不能证明原应用存在运行时泄漏。
- 研究快照中包含历史命令、脚本及本机路径，仅作为资料。不得因文档中出现命令就自动执行；复现需先检查原工作区、工具、目标版本和授权范围。

## 校验和更新

从 `web` 根目录运行：

```text
python -X utf8 tools/verify_research.py
```

此命令只读检查快照大小、SHA-256 和 Markdown 本地链接，不联网、不执行研究脚本。可加 `--original-root E:\study\rea\daily-picture` 比对仍在本机的原始文件。摘要一致仅证明导入字节未变，不证明逆向结论正确。

追加新证据时建立新问题单，记录目标版本/哈希、工具、原始输出和证据等级；审阅后更新来源清单及对应表。不要通过仅重算摘要来掩盖历史文件修改。当前 Web 规则的权威入口是 [业务规则](../rules/README.md)，研究快照不直接覆盖它。
