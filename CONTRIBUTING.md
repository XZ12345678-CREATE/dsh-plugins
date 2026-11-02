# 开发与贡献

四个独立插件是维护入口。修改 `packages/dsh-notion-research`、`dsh-repo-ownership`、`dsh-sentry-regression` 或 `dsh-github-workflows` 内的技能与助手。

公共提供器实现保存在 `tooling/provider-runtime.js`，包的名称、版本和技能清单在 `tooling/catalog.mjs`。修改后运行：

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

`sync` 会更新各包元数据/入口/公共提供器，并重新生成整套包的运行副本。`bundled/` 和 `dist/` 被 Git 忽略，不手工修改或提交。

每个包拥有自己的版本，可在 catalog 中分别增加。整套包更新所含插件时，也应增加整套包版本。独立包不能引入对仓库根目录或兄弟插件的运行时路径依赖。

行为修改应有相关测试。外部账户或完整 DSH 应用验收需记录真实版本、步骤和未通过项；本地模拟数据不能宣称真实服务验收。保留许可，不提交凭据与私人研究内容。
