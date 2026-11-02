# DSH Workflow Suite · 可选整套包

社区预览版 `0.1.0-preview.2`。包含四个独立插件的运行时副本，共六个按需技能。

这个安装包是自包含的，不依赖尚未发布的 npm 包，也不会在安装时下载四个子插件。四个独立插件的源码是维护入口，本目录的 `bundled/` 由仓库工具生成。

## 安装

在本目录运行：

```sh
dsh plugin --profile web add .
```

或安装预览 Release 的整套 tarball：

```sh
dsh plugin --profile web add ./dsh-workflow-suite-0.1.0-preview.2.tgz
```

候选基线为 Node.js `^22.19.0 || >=24.0.0`、DSH `>=0.2.1-rc.5 <0.2.2-0`，需要技能服务和 `skill` 工具。对应的外部连接器仍由使用者安装和授权。

**同一个 Profile 请选择整套模式或独立插件模式。** 整套包与相同的独立插件同时启用会重复注册同名技能提供器。切换模式时先卸载旧模式中的插件，再安装新模式；卸载代码包不需要删除工作区中的研究或测试结果。

## 按需启用技能

默认启用六个技能，可在 Profile 配置中选择：

```yaml
- id: dsh-workflow-suite-skills
  config:
    enabledSkills:
      - dsh-repo-ownership
      - dsh-ci-diagnose
```

技能名称：`dsh-notion-research`、`dsh-repo-ownership`、`dsh-sentry-regression`、`dsh-ci-diagnose`、`dsh-pr-review`、`dsh-pr-publish`。

模型加载到的资源路径属于相应的内置子插件。执行助手位于 `bundled/子插件名/scripts/`；生成或解压安装包后，完整回归用法位于 `bundled/dsh-sentry-regression/skills/dsh-sentry-regression/references/receipts.md`。

卸载：

```sh
dsh plugin --profile web remove dsh-workflow-suite
```

本版已通过本地行为与真实 DSH 技能服务检查；完整应用和真实账户仍待验收。许可见 [LICENSE](LICENSE) 与 [NOTICE.md](NOTICE.md)。
