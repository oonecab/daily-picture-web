# 参与贡献

欢迎反馈使用问题、改进界面、补充文档或提交代码。参与讨论前请阅读[行为准则](CODE_OF_CONDUCT.md)。

## 反馈问题与建议

先搜索[已有 Issues](https://github.com/oonecab/daily-picture-web/issues)，确认是否已有相同反馈，再通过[问题模板](https://github.com/oonecab/daily-picture-web/issues/new/choose)提交。请说明访问地址或本地提交版本、设备和浏览器、复现步骤，以及预期与实际结果；界面问题附截图或录屏。上传前隐藏个人信息、令牌和其他敏感内容。

安全漏洞请按[安全政策](SECURITY.md)私下报告。功能建议请说明希望解决的使用场景；较大的改动建议先开 Issue 讨论范围。

## 本地开发

需要 Node.js 22 或更新版本，具体要求和命令以 [package.json](package.json) 为准。项目使用原生 JavaScript、HTML/CSS 和 Node 内置模块，没有安装依赖或构建步骤。

Fork 本仓库并克隆自己的 Fork，在项目根目录创建工作分支，然后运行：

```sh
npm start
```

浏览器打开 [http://localhost:8787](http://localhost:8787/)。首次获取 Bing 图片需要联网；使用和端口说明见 [README](README.md)。

提交前在项目根目录运行：

```sh
npm run check
npm test
```

完整的提交检查还包括研究资料校验，需要 Python 3.10 或更新版本：

```sh
python3 -X utf8 tools/verify_research.py
```

Windows 可使用 `py -3 -X utf8 tools/verify_research.py`，或指向 Python 3 的 `python` 命令。该检查只读本地资料；Node 自动测试使用隔离数据和回环端口，不依赖真实 Bing 服务。`npm run check` 是语法检查，不能代替浏览器验证。

## 提交改动

一次 PR 聚焦一个问题，说明动机、结果、关联 Issue 和实际执行的验证。界面改动提供修改前后截图，记录设备、浏览器、横竖屏或视口尺寸；涉及交互时检查键盘、焦点、返回路径及手机触摸操作。功能修复补充能捕获该问题的回归测试，并明确尚未验证的范围。

修改前查看 [TECH](TECH.md) 和[变更分流](docs/governance/CHANGE_TRIAGE.md)。按风险维护必要记录；技术、业务规则和环境发生变化时，同步对应权威文档。详细要求见[工作流](docs/governance/WORKFLOW.md)和[测试规范](docs/governance/TESTING.md)，无需在贡献指南中另建一套规则。

请保留图片来源与版权，不提交 `.env`、凭据、私人收藏、缓存或生产数据。研究快照的维护方式见[研究说明](docs/reverse-engineering/README.md)。

## 贡献的许可

提交前确认你有权提供相关内容。项目自有代码和文档沿用 [MIT License](LICENSE)；第三方材料需保留实际许可与署名，并在[第三方说明](THIRD_PARTY_NOTICES.md)登记。Bing 图片和原生研究快照的授权范围以该说明为准。
