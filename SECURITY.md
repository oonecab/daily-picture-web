# 安全政策

## 支持范围

安全修复优先针对本仓库 `main` 分支的最新代码提供。历史提交、旧部署版本及第三方 Fork 不单独维护安全补丁；报告问题时请附受影响的提交 SHA 或版本，以及访问的是本地实例还是公开网站。

## 私密报告漏洞

请使用 GitHub 的 [Report a vulnerability](https://github.com/oonecab/daily-picture-web/security/advisories/new) 入口向仓库维护者提交私密报告，需要登录 GitHub。也可以从仓库的 **Security and quality → Advisories → Report a vulnerability** 进入。

请提供以下信息，尽可能使用最小化、脱敏的复现示例：

- 受影响的版本/提交、环境，以及相关页面或接口。
- 复现步骤、观察到的行为和可能的安全影响。
- 如有可行的修复建议或临时缓解措施，也请一并说明。

漏洞利用细节、凭据和个人数据请通过私密渠道提供，不要放进公开 Issue、PR、评论或截图。如果报告入口暂时不可用，可以先开一个只请求恢复私密联系渠道的 Issue，待渠道建立后再发送细节。

维护者会通过报告页面沟通复现情况、修复进展及适当的披露方式。项目由个人维护，无法承诺固定响应时间或修复期限。普通功能缺陷与使用问题请使用 [Issue 模板](https://github.com/oonecab/daily-picture-web/issues/new/choose)。

## 验证与责任边界

请优先在自己的本地实例、隔离测试数据上验证，避免读取他人数据、破坏数据或影响公开服务可用性。本政策不授予对第三方服务或其他部署实例进行测试的权限。

Bing 服务、原 Daily Picture 应用及其他第三方产品的问题应向其维护方报告；本仓库负责自身实现。开发和部署操作的内部要求见[安全边界与红线](docs/governance/SECURITY.md)，部署者仍需维护各自实例的安全更新与配置。
