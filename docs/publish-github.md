# 上传一个 GitHub 仓库

推荐仓库名：`dsh-plugins`。不需要为四个功能各建一个仓库。

1. 解压本版 GitHub 源码包，上传里面的全部文件和子目录，保证 `README.md`、根 `package.json` 和 `packages/` 直接位于仓库根目录。
2. 一并上传隐藏的 `.github/`、`.gitignore`、`.gitattributes`。macOS Finder 可用 Command + Shift + . 显示隐藏文件。
3. 保留各个插件内的 LICENSE、NOTICE 与 Notion 第三方许可。根 README 已链接四个独立插件的说明。
4. 上传后等待 GitHub Actions。工作流会生成整套副本，验证四个包、组合加载和脱离仓库的安装包。
5. 创建预览 Release，附上 `dist/` 中的五个 `.tgz` 和 SHA256SUMS.txt；用户可以只下载其中一个。可以把多个附件放在同一个 Release。

`packages/dsh-workflow-suite/bundled/` 和 `dist/` 都是生成产物，不放进源码上传包。要在本地生成它们，运行根目录的 `npm run sync` 与 `npm run pack:plugins`。发行 tarball 内已经包含所需运行文件。

根 `package.json` 为 `private: true` 的开发工作区；真正可安装和发布的插件位于 `packages/`。不要把仓库根目录当作 DSH 插件安装，也不要发布根 npm 包。

如果以后发布 npm，请先核实包名或采用自己的 scope。修改名称需同步调整 catalog、patch、文档并重新打包；目前没有发布账户、仓库链接或自动发布配置。

GitHub 上传步骤见 [官方说明](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)。本次只准备文件，没有创建或上传远端仓库。
