# dsh-sentry-regression · 错误复现与回归记录

对同一测试记录修复前后的失败与通过结果。

社区预览版 `0.1.0-preview.2`。可以单独安装，运行时不依赖本仓库其他插件或未发布的 npm 包。

## 安装

在本插件目录（有 `package.json` 的目录）执行：

```sh
dsh plugin --profile web add .
dsh --profile web --dump-config
```

也可以下载本插件自己的 Release 安装包后执行：

```sh
dsh plugin --profile web add ./dsh-sentry-regression-0.1.0-preview.2.tgz
```

候选基线：Node.js `^22.19.0 || >=24.0.0`，DSH `>=0.2.1-rc.5 <0.2.2-0`。Profile 需要技能服务和模型可调用的 `skill` 工具。安装后按 DSH 提示重载或重启。

可使用已授权的 Sentry 连接器或用户提供的报错；测试通过 DSH 正常执行工具运行。

## 技能

- `dsh-sentry-regression`

> 使用 dsh-sentry-regression，调查这个报错，在本地复现并修复，保留同一回归测试的前后记录。

## 随包助手

在插件目录运行；路径应替换成本次任务的实际位置：

```sh
node scripts/regression-run.mjs compare /absolute/workspace/before.json /absolute/workspace/after.json
```

卸载：

```sh
dsh plugin --profile web remove dsh-sentry-regression
```

## 组合与验证

可以与其他三个独立插件组合安装；同一 Profile 请选择“独立插件”或“整套包”中的一种模式，避免重复启用相同功能。独立插件的配置行 ID 是 `dsh-sentry-regression-skills`。

本插件已纳入仓库级本地行为测试、真实技能服务检查和脱离仓库的安装包检查。完整 DSH Web/Desktop 和真实账户集成仍待验收；不能由服务级检查推断所有候选版本都兼容。完整记录在仓库根目录的 VALIDATION.md。

## 许可

MIT；保留随包的 [LICENSE](LICENSE) 与 [NOTICE.md](NOTICE.md)。

[回归记录完整用法](skills/dsh-sentry-regression/references/receipts.md)
