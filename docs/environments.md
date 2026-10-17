# 环境事实

<!-- project-governance:managed:start -->
## 环境变量名

- PORT

## 服务

- HTTPS www.bing.com：固定归档和图片读取；不要求账号或令牌

## 端口与端点

- 本地 HTTP 默认 127.0.0.1:8787；CLI 数字参数优先于进程环境 PORT

本文件严禁写入凭据或生产数据。`.env.example` 必须与环境变量名清单同步。
<!-- project-governance:managed:end -->

## 项目专属环境说明

当前只有本机运行与隔离测试环境，没有预发布/生产部署。启动方式见 [README](../README.md)。命令行数字端口优先，其次是进程环境 `PORT`，最后默认 8787；服务代码不自动读取 `.env` 文件。`.env.example` 仅登记变量名，复制为 `.env` 不会使它生效。

PowerShell 可用 `$env:PORT = '8788'` 设置当前进程环境，再 `npm start`；也可直接 `node server.mjs 8788`。这会改变浏览器来源，收藏/缓存不会自动迁移。平时使用固定地址。

运行时磁盘数据位于 `.cache`；浏览器数据由浏览器同源存储管理。Node 测试使用独立系统临时目录和端口。Python 校验不联网，也不执行研究快照里的历史脚本。
