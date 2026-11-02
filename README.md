# DSH Plugins · 四个独立插件，一个仓库

Notion 研究、代码维护活动分析、错误复现与回归记录、GitHub CI/PR 工作流可以分别安装、分别维护。需要全部功能时，可选择自包含的整套包。

社区预览版 `0.1.0-preview.2`。完整 DSH 应用与真实账户集成仍待验收，详见 [验证记录](VALIDATION.md)。

## 选择插件

| 插件 | 功能 | 独立说明 |
|---|---|---|
| `dsh-notion-research` | Notion 多页面研究、来源摘录与引用检查 | [说明](packages/dsh-notion-research/README.md) |
| `dsh-repo-ownership` | Git 维护活动、敏感路径与审阅者线索 | [说明](packages/dsh-repo-ownership/README.md) |
| `dsh-sentry-regression` | 报错复现、同一回归测试的前后记录 | [说明](packages/dsh-sentry-regression/README.md) |
| `dsh-github-workflows` | CI 排错、PR 审阅反馈、按授权发布 Draft PR | [说明](packages/dsh-github-workflows/README.md) |
| `dsh-workflow-suite`（可选） | 四类功能整套安装，共六个技能 | [说明](packages/dsh-workflow-suite/README.md) |

前四个是独立产品包。第五个从前四份源码生成，每个预览 tarball 都可直接分发，不依赖尚未发布的其他 npm 包。

## 单独安装

在本仓库根目录执行所需的命令：

```sh
dsh plugin --profile web add ./packages/dsh-notion-research
dsh plugin --profile web add ./packages/dsh-repo-ownership
dsh plugin --profile web add ./packages/dsh-sentry-regression
dsh plugin --profile web add ./packages/dsh-github-workflows
```

只执行你需要的行即可。四个独立包可在同一个 Profile 中组合使用，无需先安装仓库级开发依赖。根目录的 `package.json` 是私有开发工作区，安装时请选择 `packages/` 中的具体插件。

也可以下载 Release 中某一个 `.tgz` 文件后安装：

```sh
dsh plugin --profile web add ./dsh-repo-ownership-0.1.0-preview.2.tgz
```

候选运行基线：Node.js `^22.19.0 || >=24.0.0`，DSH `>=0.2.1-rc.5 <0.2.2-0`。Profile 需要技能服务和 `skill` 工具；安装后按 DSH 提示重载或重启。

Notion、Sentry、GitHub 的账户访问继续由用户已授权的连接器或 CLI 提供。安装插件不等于完成服务登录。

## 整套安装

下载整套 Release 安装包：

```sh
dsh plugin --profile web add ./dsh-workflow-suite-0.1.0-preview.2.tgz
```

从源码安装整套包时，先在根目录运行一次生成命令，再安装：

```sh
npm run sync
dsh plugin --profile web add ./packages/dsh-workflow-suite
```

`sync` 只使用 Node.js 内置功能，不联网、不需要先 `npm install`。整套包的 `bundled/` 是生成产物，不进入 GitHub 源码上传包，但已经包含在整套 `.tgz` 安装包里。

**同一 Profile 请选择独立插件模式或整套模式。** 两种模式同时启用相同插件会重复注册同名提供器。切换方式和旧版迁移见 [迁移说明](docs/migration.md)。

## 使用

- Notion：`使用 dsh-notion-research，整理这些 Notion 页面，关键结论附来源和摘录。`
- 维护分析：`使用 dsh-repo-ownership，分析这个仓库的维护活动和审阅者线索。`
- 回归记录：`使用 dsh-sentry-regression，复现并修复这个报错，保留同一测试的前后记录。`
- GitHub：使用 `dsh-ci-diagnose`、`dsh-pr-review` 或 `dsh-pr-publish`。

## 仓库结构

```text
packages/
  dsh-notion-research/     可单独安装
  dsh-repo-ownership/      可单独安装
  dsh-sentry-regression/   可单独安装
  dsh-github-workflows/    可单独安装，包含三个技能
  dsh-workflow-suite/      可选整套包，内置副本由 sync 生成
tooling/                  元数据、公共运行时模板与打包工具
test/                     行为、组合加载和独立安装包检查
docs/                     迁移和 GitHub 发布说明
```

每个独立插件都有自己的 `package.json`、加载配置、入口、说明、许可、技能和助手。运行时不会从其他插件目录或仓库根目录导入代码。

## 开发与打包

```sh
npm ci --ignore-scripts
npm run sync
npm run check:sync
npm test
npm run test:host
npm run check:examples
npm run pack:plugins
npm run test:packed
```

`dist/` 会生成四个独立安装包、一个整套包和 SHA-256 校验清单。开发时只编辑四个独立包；不要直接修改整套包的生成副本。包名、技能清单和各自版本在 `tooling/catalog.mjs` 中维护，可以分别调整版本。

## 发布与许可

这一个仓库即可承载四个插件。GitHub 上传与 Release 附件步骤见 [发布说明](docs/publish-github.md)，开发约定见 [贡献指南](CONTRIBUTING.md)。候选包名尚未核实 npm 可用性，不需要先发布 npm 才能使用本地目录或 `.tgz`。

本项目采用 MIT；Notion 适配的上游版权与许可已保留，见 [来源说明](NOTICE.md)。这不是 DeepSeek、OpenAI、Notion、Sentry 或 GitHub 的官方产品。
