# dsh-github-workflows · GitHub CI 与 PR 工作流

CI 证据诊断、PR 审阅反馈处理，以及按明确授权提交和发布 Draft PR。

社区预览版 `0.1.0-preview.2`。可以单独安装，运行时不依赖本仓库其他插件或未发布的 npm 包。

## 安装

在本插件目录（有 `package.json` 的目录）执行：

```sh
dsh plugin --profile web add .
dsh --profile web --dump-config
```

也可以下载本插件自己的 Release 安装包后执行：

```sh
dsh plugin --profile web add ./dsh-github-workflows-0.1.0-preview.2.tgz
```

候选基线：Node.js `^22.19.0 || >=24.0.0`，DSH `>=0.2.1-rc.5 <0.2.2-0`。Profile 需要技能服务和模型可调用的 `skill` 工具。安装后按 DSH 提示重载或重启。

使用已有 GitHub 连接器或已登录的 gh；本包不管理 Token。

## 技能

- `dsh-ci-diagnose`
- `dsh-pr-review`
- `dsh-pr-publish`

> 使用 dsh-ci-diagnose，调查这个 PR 为什么失败，先读取真实日志。

## 随包助手

在插件目录运行；路径应替换成本次任务的实际位置：

```sh
node scripts/inspect-ci.mjs --repo OWNER/REPO --pr 123 --logs --out /absolute/workspace/ci-evidence.json
```

卸载：

```sh
dsh plugin --profile web remove dsh-github-workflows
```

## 组合与验证

可以与其他三个独立插件组合安装；同一 Profile 请选择“独立插件”或“整套包”中的一种模式，避免重复启用相同功能。独立插件的配置行 ID 是 `dsh-github-workflows-skills`。

本插件已纳入仓库级本地行为测试、真实技能服务检查和脱离仓库的安装包检查。完整 DSH Web/Desktop 和真实账户集成仍待验收；不能由服务级检查推断所有候选版本都兼容。完整记录在仓库根目录的 VALIDATION.md。

## 许可

MIT；保留随包的 [LICENSE](LICENSE) 与 [NOTICE.md](NOTICE.md)。
