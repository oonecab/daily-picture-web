# 1.6.6 变更验证

基线：51d653e，保留先前评估报告。当前为基线之上的未提交修复，最终结果见下文。预期来自浏览器缓存恢复、图片边界、生命周期规则及用户修复指令。

已取得三项真实旧版本失败：近期磁盘/上游占位图未拒绝、代理占位图被缓存、无解码器仍保存未验证图片；日志 .private/fixes-166/red.log。服务端改用完整 JPEG 夹具，原资源测试将 4 字节假 JPEG 的长度断言更新为夹具长度，资源数量/容量断言保持。迁移时发现误改了成功请求数量，已恢复应为 4。

调度测试使用可推进 Date 与实际执行/取消的 interval，非等待真实午夜。第一次历史场景夹具设置了 index=3 却没有历史列表，被产品正常钳制为 0；补齐四张历史图片后保留原位置断言。初始背景超时产生的代理请求也被区分于新日期背景，未删除目标断言。

只在隔离测试副本把 scheduleRefresh 置空，新增两项必须失败；这属于错误变体检查，不称为线上缺陷复现。原来 34 项测试对此全绿，如今新增场景能检测到。

真实浏览器测试使用当前 createApp、SW 和 CacheStorage，预置 80×80 旧坏 JPEG，获取后解码为 1920×1080，再离线以 direct=1 读取同图；另用 UI 固定夹具检查背景与历史独立、开关重载保存、1440/390/320px 下四个菜单对齐。无第三方接口依赖。

## 最终结果（2026-11-02，Asia/Shanghai）

基线 51d653e + 本地未提交 1.6.6 差异；关键代码/测试/锁文件的摘要清单位于 .private/fixes-166/verified-files.json，聚合 SHA-256：`335bf6ca9a6bf0c75426ec95d5b52fea888cb9396c8cf785dfb549d8b41f0122`。环境 Windows、Node 24.14.0、npm 10.8.0、固定 Playwright 1.64.1、其配套 Chromium 156.0.8078.4。执行目录为项目 web 根。

| 检查 | 状态 | 执行证据 |
| --- | --- | --- |
| 三项新缓存回归在旧实现 | fail（预期失败） | 磁盘占位图未拒绝、代理坏图被缓存、无解码器仍持久化；red.log |
| npm ci --no-audit --no-fund | pass | 锁文件可安装；保留原 Sharp 平台 libc 元数据，未升级运行依赖 |
| npm run check | pass | 20 个文件 |
| npm test | pass | 166 tests，166 pass，0 fail，0 skipped；full.log |
| 禁用调度器的错误变体 | fail（预期失败） | 36 tests 中 2 个新调度场景失败，其余 34 pass；mutation-final.log |
| npx playwright install chromium | pass | 固定开发依赖对应测试浏览器安装完成 |
| npm run test:browser | pass | 真实 SW 旧坏缓存恢复、离线共享、背景与历史独立、开关重载保存、12 组菜单几何检查；test-output/browser/results.json |
| verify_research.py | pass | 238 文件、432 链接，0 failures |
| 严格治理检查 | pass | 新命令和测试环境变量已同步；首次 managed block 漂移修正为与元数据一致的命令记录 |
| git diff --check | pass | 无格式错误 |
| GitHub Actions 实际运行 | not-run | 工作流已编写，尚未推送触发；Windows 本地通过不能替代 Linux runner 执行 |
| 生产发布/线上修复验证 | not-run | 本轮完成本地修复与验收，未部署 |

实现状态：F1/F2/F3 均 implemented；验证结论：本地必需检查 pass，外部 CI 与生产结果未声明通过。无需为此重新执行无关压测。服务端 JPEG 检查为结构/尺寸检查，不宣称完整熵解码；无解码器的浏览器保持在线但不会新增未验证的近期离线条目。

远端 Actions、生产部署、真机跨浏览器、性能压测及长时间运行未执行，不计为通过。


## 生产发布补充（2026-11-02）

用户随后明确授权提交推送、合入主分支及部署。工作区原本就在 main，无待合并的功能分支；运行提交 72cea2d6d560ff3be8df6029549659f4fc922f6e 已推送 origin/main 并部署 1.6.6。

- pass：服务器语法检查 20 文件，166/166 自动化测试，44 个发布文件摘要匹配；切换独立版本后服务 active、NRestarts=0，HTTPS 健康为 1.6.6。
- pass：Nginx 配置和 3 个受保护原图摘要不变，保留 1.6.5 独立回滚版本及共享数据。
- pass：实际线上 Chrome 背景加载、历史 2026-11→2026-10（31 张）、四个菜单边缘对齐、390px 无溢出，无 pageerror；外壳为 shell-1.6.6，CSS 摘要匹配。
- pass：[Verify application](https://github.com/oonecab/daily-picture-web/actions/runs/41475623266) 已在 GitHub Actions 完成成功；同次推送触发的[采集工作流](https://github.com/oonecab/daily-picture-web/actions/runs/41475623350)也成功。

此前 not-run 是本地验收阶段的历史状态，本段记录实际补验结果。Linux Actions 与服务器执行已补齐；跨浏览器、真实午夜长时间运行、性能压测仍不在本次完成范围。部署及浏览器原始证据位于私有 release-166 目录。
