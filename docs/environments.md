# 环境事实

<!-- project-governance:managed:start -->
## 环境变量名

- PORT

## 服务

- HTTPS www.bing.com：固定归档和图片读取；不要求账号或令牌
- 生产 Nginx HTTPS 反向代理与 daily-picture.service；部署事实见下文

## 端口与端点

- Node HTTP 默认 127.0.0.1:8787；CLI 数字参数优先于进程环境 PORT
- 生产 Nginx 443 提供 HTTPS，80 重定向至 HTTPS；反向代理到 127.0.0.1:8787

本文件严禁写入凭据或生产数据。`.env.example` 必须与环境变量名清单同步。
<!-- project-governance:managed:end -->

## 项目专属环境说明

当前有本机运行、隔离测试和既有生产实例。启动方式见 [README](../README.md)。命令行数字端口优先，其次是进程环境 `PORT`，最后默认 8787；服务代码不自动读取 `.env` 文件。`.env.example` 仅登记变量名，复制为 `.env` 不会使它生效。

PowerShell 可用 `$env:PORT = '8788'` 设置当前进程环境，再 `npm start`；也可直接 `node server.mjs 8788`。这会改变浏览器来源，收藏/缓存不会自动迁移。平时使用固定地址。

运行时磁盘数据位于 `.cache`；浏览器数据由浏览器同源存储管理。Node 测试使用独立系统临时目录和端口。Python 校验不联网，也不执行研究快照里的历史脚本。

## 生产环境（2026-10-19 实测）

- 入口：[https://dailypicture.zzzping.top/](https://dailypicture.zzzping.top/)。Nginx 终止 TLS，HTTP 80 重定向 HTTPS；转发时 Host 固定为 `127.0.0.1:8787`，保留应用 Host 白名单。
- 服务：`daily-picture.service`，用户/组 `dailypicture`，进程环境 `PORT=8787`，Node v24.22.0，执行文件 `/opt/daily-picture/node/bin/node`。
- 应用：`/var/www/dailypicture.zzzping.top/releases/<release>`，`current` 指向生效版本；systemd 工作目录使用 current。
- 状态：每个版本的 `.cache` 链接到 `/var/lib/daily-picture`，目录归 dailypicture 所有；版本代码由 root 管理。浏览器收藏、偏好仍归各自同源存储所有。
- 服务限制：只读系统、禁止提升权限、独立临时目录，写入仅开放缓存目录；本次发布沿用现有配置。

发布步骤见 [deployment.md](deployment.md)，具体提交、版本和验证见 [手机修复发布验收](testing/mobile-release.md)。这里记录当前部署事实，历史本机验证记录保留原时间与边界。
