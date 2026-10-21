# 许可证范围与第三方内容

本项目自行实现的软件代码及自行撰写的项目文档，除下述排除项或另有明确声明的材料外，按根目录 [MIT License](LICENSE) 发布。英文 LICENSE 保留标准正文；本文件用于说明哪些材料不属于本项目授予 MIT 许可的内容，不增加 MIT 软件使用条件。

## Bing 图片及上游内容

从 Bing 获取的摄影作品、版权文字、说明、上游响应及其本地缓存，不因被本软件获取或展示而成为 MIT 授权的软件内容。对应权利仍归各自权利人；本项目不代替权利人授予这些内容的使用或再分发许可。

`.cache/` 是运行时数据，已在 `.gitignore` 中排除。发布源码时不应将下载的图片缓存作为项目自有素材加入。应用中的来源、摄影版权与介绍链接应按原有规则保留。

## 原生应用与研究快照

本项目是独立实现，与原 Daily Picture 作者、Duracellko.NET 或 Microsoft 没有隶属关系，也不声称获得其背书。

`docs/reverse-engineering/source/**` 整个目录作为保留原始字节的历史研究快照，**不纳入根目录 MIT 许可范围**。其中混合了研究记录、目标程序提取内容、反汇编、资源片段及工具输出；具体来源见 [研究说明](docs/reverse-engineering/README.md) 和 [来源清单](docs/reverse-engineering/provenance.json)。原有版权、许可及来源声明继续保留；没有单独许可的材料，本项目不据此额外授予再分发许可。

研究摘要与文件哈希证明来源和完整性，不证明上游材料的再许可权限。本次添加 MIT 没有修改快照或重新许可原应用。快照之外由本项目撰写的架构、业务规则和原生到 Web 的对应说明适用根目录 MIT，除非其中具体材料另有声明。

## 名称与第三方运行环境

MIT 许可证不表示原应用名称、Bing、Microsoft 或其他第三方名称、标志获得商标授权。Node.js、浏览器及部署者自行安装的其他软件遵循各自的许可证；它们的发行文件未随本项目应用代码捆绑。

后续引入第三方源码、字体、图标、依赖或素材时，应保留其实际许可证与署名，并在这里追加准确的来源及适用范围，不能用根目录 MIT 覆盖第三方要求。

## 中国区历史归档

1.2.0 接入 [npanuhin/Bing-Wallpaper-Archive](https://github.com/npanuhin/Bing-Wallpaper-Archive) 的公开中国区月索引和图片副本，站点为 [bing.npanuhin.me](https://bing.npanuhin.me/)。感谢该项目维护历史归档。接口和字段来自该仓库 README；适配、缓存和界面代码由本项目独立编写，没有复制该项目源码或随源码捆绑图片。

该仓库的软件许可证声明为 MIT；各图片及版权文字、说明仍归各自权利人。遵守上游关于合理下载量的说明，1.4.0 经用户授权进行一次历史导入，后续日常浏览读取本站保存的图片与索引，不继续请求该归档；导入采用有限并发并记录来源。网站“关于每日一景”及图片详情保留归档来源，并显示原摄影版权。`.history/` 和自定义 HISTORY_DIR 是运行时索引，应独立保留并从源码发布包排除。

1.3.0 同时接入 [zxyongyo/bing-daily-wallpaper](https://github.com/zxyongyo/bing-daily-wallpaper) 的公开月度 JSON，用于补充 2018-09 起的历史索引、摄影版权与 Bing 图片链接。感谢 zxyongyo 维护该项目；其软件许可证为 [MIT，Copyright (c) 2023 zxyongyo](https://github.com/zxyongyo/bing-daily-wallpaper/blob/master/LICENSE)。本站独立实现数据适配，不复制该项目源码，历史索引导入后保留来源归属并可备份到本站独立数据分支，图片不进入源码发布包。图片通过 Bing 获取，不能将该仓库视为原图备份，也不因链接带有 4K 参数而保证原生分辨率。两项目名称、用途与链接均展示在网站“关于每日一景”和 README；摄影权利范围与上述 Bing 内容规则一致。

## 图片处理依赖

1.4.0 使用 [Sharp](https://github.com/lovell/sharp) 0.35.5（Copyright 2013 Lovell Fuller and others），遵循 Apache-2.0。通过 npm ci 安装，许可证保留于 node_modules/sharp/LICENSE。其平台预编译组件及所含 libvips 依赖按各自许可证分发；Sharp/libvips 和平台包的实际版本由 package-lock.json 锁定，分发部署产物时保留这些包自带的许可证。根目录 MIT 不覆盖这些依赖。
