import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { plugins } from '../tooling/catalog.mjs';
import * as suite from '../packages/dsh-workflow-suite/index.js';

const require = createRequire(process.env.DSH_CONTRACT_ROOT ? resolve(process.env.DSH_CONTRACT_ROOT, 'package.json') : new URL('../package.json', import.meta.url));
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href);
const { default: SkillService } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-skill')).href);
const modules = await Promise.all(plugins.map((plugin) => import(`../packages/${plugin.name}/index.js`)));
const allSkills = plugins.flatMap((plugin) => plugin.skills).sort();
const ctx = new Context();
const service = await ctx.plugin(SkillService);
const fibers = [];
try {
  for (const plugin of modules) fibers.push(await ctx.plugin(plugin));
  assert.deepEqual((await ctx.skills.list()).map((entry) => entry.name).sort(), allSkills);
  for (const name of allSkills) assert.ok((await ctx.skills.get(name)).content.startsWith('# '));
  await fibers[1].dispose();
  assert.equal(await ctx.skills.get('dsh-repo-ownership'), undefined);
  assert.equal((await ctx.skills.list()).length, 5);
  for (const fiber of fibers) await fiber.dispose();
  assert.equal((await ctx.skills.list()).length, 0);
  const bundle = await ctx.plugin(suite);
  assert.deepEqual((await ctx.skills.list()).map((entry) => entry.name).sort(), allSkills);
  await bundle.dispose();
  assert.equal((await ctx.skills.list()).length, 0);
  const partial = await ctx.plugin(suite, { enabledSkills: ['dsh-ci-diagnose', 'dsh-notion-research'] });
  assert.deepEqual((await ctx.skills.list()).map((entry) => entry.name).sort(), ['dsh-ci-diagnose', 'dsh-notion-research']);
  await partial.dispose();
  assert.equal((await ctx.skills.list()).length, 0);
  console.log('Real DSH registry: four plugins coexist; one unload preserves the others; suite and selective suite load/unload pass.');
} finally {
  for (const fiber of fibers) await fiber.dispose();
  await service.dispose();
}
