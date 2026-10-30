# 1.6.3 下拉菜单验收

日期：2026-10-31。范围：#market、#history-market、#history-year、#history-month。

## 本地浏览器

Windows Chrome 156.0.8078.48，Playwright 隔离上下文。先在旧实现运行样式验收，appearance 为 auto 而非 base-select，断言失败；修改后四个选择器均通过，展开菜单圆角 12px、选项高度 40px、背景 rgb(255,255,250)。元数据及图片使用本地固定夹具，不将此项视为生产上游可用性验证。

键盘 Space 打开、方向键选择、Enter 确认、Escape 关闭、Tab 移动焦点通过。地区切换同步顶部与历史字段，年份切换重建月份，月份切换保持正确值。检查 320、390、768px 宽度无横向溢出；390px 触摸模拟四个控件与选项高度均为 48px，菜单左右边界位于视口内。

视觉检查覆盖四个展开菜单、长年份列表滚动、390px 页面。高对比度模拟最初发现选中文字被系统背景遮住，使用系统 Highlight/HighlightText 配色并修正选中项强制颜色处理后，文字和勾选标记可见；减少动态效果偏好通过。浏览器无 pageerror。

证据与执行脚本位于 Git 忽略的 .private/selects-163/：before-results.json、local-results.json、verify-selects.mjs 及各选择器截图。真实 Firefox、Safari、Windows 系统级屏幕阅读器未运行；触摸为 Chrome 模拟，不等同于真机验证。

## 复验步骤

1. 启动应用并进入历史壁纸，等待年月字段可用。
2. 逐个打开上述四个控件，检查面板、选中勾选、鼠标悬停和滚动；按 Escape 关闭。
3. 用 Tab/Space/方向键/Enter 切换地区、年份、月份，核对联动及列表内容。
4. 在 320/390px 宽度与触摸模拟下重复，确认面板不越界；开启 forced-colors 和 reduced-motion 检查清晰度。
5. 不支持 base-select 时不应用增强块，保留原生交互；不能据此宣称其他浏览器实测通过。

## 发布

本地语法检查 19 项、现有测试 158/158、研究资料检查 238 文件/432 链接、严格治理检查与 git diff --check 均通过。运行提交 b7ed5e3 已推送 main，并部署 1.6.3；服务器语法检查与 158/158 测试通过。回滚使用前一独立代码版本，保留共享媒体、历史数据和收藏缓存。


线上 HTTPS 健康版本为 1.6.3，服务 active、NRestarts=0，42 个发布文件摘要匹配。Nginx 配置及 3 个受保护原图摘要未变，1.6.2 独立版本保留，可切回旧代码并重启服务回滚，无数据迁移。

独立 Chrome 访问实际线上域名，无 API/图片拦截：四个菜单展开样式正确，地区各 6 项、年份 9 项、当前年份月份 10 项；键盘将 2026-10 切换至 2026-09 后显示“本月收录 30 张影像”。主图完成解码、页面无脚本错误；390px 无横向溢出。线上 styles.css SHA-256 与发布源一致，浏览器外壳缓存为 daily-picture-v1-shell-1.6.3。证据为 .private/selects-163/live-results.json、live-*.png 和 deployment.json。

本次为样式发布，未重复执行公网压测；未将此前容量测量作为本次新增结果。
