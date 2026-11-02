export const dshRange = '>=0.2.1-rc.5 <0.2.2-0';
export const nodeRange = '^22.19.0 || >=24.0.0';
export const suiteVersion = '0.1.0-preview.2';
export const plugins = Object.freeze([
  { name: 'dsh-notion-research', version: '0.1.0-preview.2', title: 'Notion 资料研究', description: 'Notion-backed research with source excerpts and local citation consistency checks.', skills: ['dsh-notion-research'] },
  { name: 'dsh-repo-ownership', version: '0.1.0-preview.2', title: '代码维护活动分析', description: 'Local Git activity analysis and evidence-backed reviewer hints.', skills: ['dsh-repo-ownership'] },
  { name: 'dsh-sentry-regression', version: '0.1.0-preview.2', title: '错误复现与回归记录', description: 'Sentry-guided local reproduction and matching before/after regression receipts.', skills: ['dsh-sentry-regression'] },
  { name: 'dsh-github-workflows', version: '0.1.0-preview.2', title: 'GitHub CI 与 PR 工作流', description: 'Evidence-first CI diagnosis, review feedback handling, and authorized Draft PR publishing.', skills: ['dsh-ci-diagnose', 'dsh-pr-review', 'dsh-pr-publish'] },
]);
