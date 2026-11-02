// Generated from the four standalone plugins; do not edit bundled copies.
import * as family0 from './bundled/dsh-notion-research/index.js';
import * as family1 from './bundled/dsh-repo-ownership/index.js';
import * as family2 from './bundled/dsh-sentry-regression/index.js';
import * as family3 from './bundled/dsh-github-workflows/index.js';
export const name = 'dsh-workflow-suite';
export const inject = ['skills'];
export const skillNames = Object.freeze(["dsh-notion-research","dsh-repo-ownership","dsh-sentry-regression","dsh-ci-diagnose","dsh-pr-review","dsh-pr-publish"]);
const families = [family0, family1, family2, family3];
export async function apply(ctx, config = {}) {
  const selected = config.enabledSkills ?? [...skillNames];
  if (!Array.isArray(selected) || selected.some((value) => !skillNames.includes(value))) throw new Error('Invalid enabledSkills for dsh-workflow-suite.');
  for (const family of families) {
    const enabledSkills = family.skillNames.filter((value) => selected.includes(value));
    if (enabledSkills.length) await ctx.plugin(family, { enabledSkills });
  }
}
