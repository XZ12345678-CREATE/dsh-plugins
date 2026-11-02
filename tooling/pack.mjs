import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { plugins, suiteVersion } from './catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { out: { type: 'string' } } });
const destination = resolve(root, values.out ?? 'dist');
mkdirSync(destination, { recursive: true });
execFileSync(process.execPath, [join(root, 'tooling/sync-packages.mjs'), '--check'], { stdio: 'inherit' });
const packages = [...plugins, { name: 'dsh-workflow-suite', version: suiteVersion }];
const result = [];
for (const plugin of packages) {
  const output = execFileSync('npm', ['pack', join(root, 'packages', plugin.name), '--ignore-scripts', '--offline', '--json', '--pack-destination', destination], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const [pack] = JSON.parse(output);
  const archive = join(destination, pack.filename);
  result.push({ name: plugin.name, version: plugin.version, file: pack.filename, bytes: readFileSync(archive).length, sha256: createHash('sha256').update(readFileSync(archive)).digest('hex') });
}
writeFileSync(join(destination, 'manifest.json'), JSON.stringify(result, null, 2) + '\n');
writeFileSync(join(destination, 'SHA256SUMS.txt'), result.map((item) => `${item.sha256}  ${item.file}\n`).join(''));
writeFileSync(join(destination, 'INSTALL.txt'), 'DSH Plugins 0.1.0-preview.2\n\n前四个 .tgz 是独立插件，可按需选择或组合安装。dsh-workflow-suite 是包含全部功能的整套包。\n同一 Profile 请选择独立模式或整套模式，避免重复注册。\n\n安装示例：\ndsh plugin --profile web add ./dsh-repo-ownership-0.1.0-preview.2.tgz\n\n整套示例：\ndsh plugin --profile web add ./dsh-workflow-suite-0.1.0-preview.2.tgz\n\n这些是预览安装包，候选 DSH 基线 >=0.2.1-rc.5 <0.2.2-0；完整应用与真实账户集成仍待验收。\nGitHub 发布时可把五个 .tgz、SHA256SUMS.txt 和本说明作为同一个 Release 的附件。\n');
console.log(JSON.stringify(result, null, 2));
