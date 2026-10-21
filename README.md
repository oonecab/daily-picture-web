# Bing 中国区壁纸索引

本分支由 daily-picture-web 自行维护。GitHub Actions 每日从 Bing 获取最近十五日，按日期合并，不删除历史月份。图片原图、缩略图和预览保存在网站自己的持久图库中，不包含于本 Git 分支。月份和图片可能缺档。

历史初次导入来源：

- [zxyongyo/bing-daily-wallpaper](https://github.com/zxyongyo/bing-daily-wallpaper)：2018-09 起的中国区索引及 Bing 图片链接。
- [npanuhin/Bing-Wallpaper-Archive](https://github.com/npanuhin/Bing-Wallpaper-Archive)：2024-04 起的中国区索引、说明与图片备份。

各条记录保留 source/sources 与摄影版权，日常更新直接从 Bing 获取。两个来源的软件许可证为 MIT；摄影作品、版权说明及上游内容的权利仍属于各自权利人，不因导入和保存成为本项目 MIT 软件内容。详情见主分支 THIRD_PARTY_NOTICES.md。

latest.json 是 Actions 最近一次完整采集结果，fetchedAt 为采集时间；YYYY-MM.json 为累积月份索引。availability 只反映生成索引的环境，图库可用性以网站自己的媒体清单和检查结果为准。
