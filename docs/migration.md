# 从旧版整套包迁移

旧版 `0.1.0-preview.1` 只有一个安装包。本版 `0.1.0-preview.2` 提供四个独立插件，并保留可选整套包。

## 迁移为独立安装

在你实际使用的同一个 Profile 中执行；下例使用 `web`：

```sh
dsh plugin --profile web remove dsh-workflow-suite
dsh plugin --profile web add ./packages/dsh-notion-research
dsh plugin --profile web add ./packages/dsh-repo-ownership
dsh plugin --profile web add ./packages/dsh-sentry-regression
dsh plugin --profile web add ./packages/dsh-github-workflows
```

安装命令从本仓库根目录执行，只选择需要的行。若旧 Profile 中手动写过 `id: dsh-workflow-suite-skills` 的配置覆盖，移除已不再使用的覆盖，再按 DSH 的重载/重启提示处理。插件卸载与迁移不需要删除工作区的研究资料或测试记录。

## 继续用整套包

卸载四个同类独立插件后再安装新整套包，避免重复注册。也可用插件管理器更新原整套包；仍应确认安装来源指向本版。

新整套包保持 `dsh-workflow-suite-skills` 行和 `enabledSkills` 配置，六个技能名与旧版整套包一致。

## 配置与技能名称

| 独立插件 | 配置行 ID | 技能 |
|---|---|---|
| dsh-notion-research | dsh-notion-research-skills | dsh-notion-research |
| dsh-repo-ownership | dsh-repo-ownership-skills | dsh-repo-ownership |
| dsh-sentry-regression | dsh-sentry-regression-skills | dsh-sentry-regression |
| dsh-github-workflows | dsh-github-workflows-skills | dsh-ci-diagnose、dsh-pr-review、dsh-pr-publish |

更早的单独 Notion 原型使用 `notion-research` 技能名；本版统一使用 `dsh-notion-research`。本版不安装或迁移任何连接器凭据。

四个独立包组合加载、卸载隔离和整套包已在真实 DSH 技能服务中检查。完整 Profile 迁移尚未在实际 DSH 应用中验收。
