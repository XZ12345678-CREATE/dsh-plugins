import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, realpathSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { plugins } from '../tooling/catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(process.env.DSH_CONTRACT_ROOT ? resolve(process.env.DSH_CONTRACT_ROOT, 'package.json') : new URL('../package.json', import.meta.url));
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href);
const { default: SkillService } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-skill')).href);
const manifest = JSON.parse(readFileSync(join(root, 'dist/manifest.json'), 'utf8'));
assert.equal(manifest.length, 5);
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-independent-packages-')));
const expectedSkills = plugins.flatMap((plugin) => plugin.skills).sort();
function node(script, args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: scratch, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
  assert.equal(result.status, expectedStatus, `${script}: ${result.stderr}`);
  return result.stdout;
}
function helperCheck(packageRoot, family) {
  if (family === 'dsh-notion-research') {
    const source = join(scratch, 'notion-sources.json');
    const report = join(scratch, 'notion-report.md');
    writeFileSync(source, readFileSync(join(root, 'packages/dsh-notion-research/examples/notion-sources.json')));
    writeFileSync(report, readFileSync(join(root, 'packages/dsh-notion-research/examples/notion-report.md')));
    assert.equal(JSON.parse(node(join(packageRoot, 'scripts/check-evidence.mjs'), [source, report])).ok, true);
  } else if (family === 'dsh-github-workflows') {
    const fixture = join(scratch, 'ci-snapshot.json');
    writeFileSync(fixture, readFileSync(join(root, 'packages/dsh-github-workflows/examples/ci-snapshot.json')));
    assert.equal(JSON.parse(node(join(packageRoot, 'scripts/inspect-ci.mjs'), ['--input', fixture])).verdict, 'failures-observed');
  } else if (family === 'dsh-repo-ownership') {
    const repo = join(scratch, `git-${Math.random().toString(16).slice(2)}`);
    mkdirSync(repo);
    const git = (args) => execFileSync('git', ['-C', repo, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init', '-b', 'main']);
    writeFileSync(join(repo, 'sample.js'), 'export const value = 1;\n');
    git(['add', 'sample.js']);
    git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', '-c', 'commit.gpgSign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'fixture']);
    const report = JSON.parse(node(join(packageRoot, 'scripts/ownership-map.mjs'), ['--repo', repo]));
    assert.equal(report.counts.filesWithHistory, 1);
  } else if (family === 'dsh-sentry-regression') {
    const cwd = join(scratch, `test-${Math.random().toString(16).slice(2)}`);
    mkdirSync(cwd);
    writeFileSync(join(cwd, 'test.cjs'), "require('node:assert/strict').equal(require('./value.cjs'),2,'regression-packed');\n");
    writeFileSync(join(cwd, 'value.cjs'), 'module.exports=1;\n');
    const script = join(packageRoot, 'scripts/regression-run.mjs');
    const before = join(cwd, 'before.json');
    const after = join(cwd, 'after.json');
    const common = ['--cwd', cwd, '--issue', 'PACKED-1', '--test-file', 'test.cjs'];
    node(script, ['run', ...common, '--phase', 'before', '--expect-failure', 'regression-packed', '--out', before, '--', process.execPath, 'test.cjs'], 1);
    writeFileSync(join(cwd, 'value.cjs'), 'module.exports=2;\n');
    node(script, ['run', ...common, '--phase', 'after', '--out', after, '--', process.execPath, 'test.cjs']);
    assert.equal(JSON.parse(node(script, ['compare', before, after])).ok, true);
  }
}
try {
  for (const item of manifest) {
    const folder = join(scratch, item.name);
    mkdirSync(folder);
    execFileSync('tar', ['-xzf', join(root, 'dist', item.file), '-C', folder]);
    const packageRoot = join(folder, 'package');
    const packageJSON = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
    assert.equal(packageJSON.name, item.name);
    assert.equal(packageJSON.version, item.version);
    assert.deepEqual(packageJSON.dependencies ?? {}, {});
    assert.ok(existsSync(join(packageRoot, 'LICENSE')));
    const plugin = await import(pathToFileURL(join(packageRoot, 'index.js')).href);
    const ctx = new Context();
    const service = await ctx.plugin(SkillService);
    const fiber = await ctx.plugin(plugin);
    try {
      const entries = await ctx.skills.list();
      const expected = item.name === 'dsh-workflow-suite' ? expectedSkills : plugins.find((entry) => entry.name === item.name).skills;
      assert.deepEqual(entries.map((entry) => entry.name).sort(), [...expected].sort());
      for (const entry of entries) {
        const skill = await ctx.skills.get(entry.name);
        const path = relative(packageRoot, skill.resourceBase.path);
        assert.ok(!path.startsWith('..') && !isAbsolute(path));
        assert.ok(skill.content.startsWith('# '));
      }
      if (item.name === 'dsh-workflow-suite') {
        for (const family of plugins) helperCheck(join(packageRoot, 'bundled', family.name), family.name);
        assert.ok(existsSync(join(packageRoot, 'bundled/dsh-notion-research/THIRD_PARTY_LICENSES/notion-research-documentation-MIT.txt')));
      } else helperCheck(packageRoot, item.name);
    } finally {
      await fiber.dispose();
      assert.equal((await ctx.skills.list()).length, 0);
      await service.dispose();
    }
    console.log(`${item.name}: isolated tarball, resource paths, helpers and unload passed.`);
  }
} finally { rmSync(scratch, { recursive: true, force: true }); }
