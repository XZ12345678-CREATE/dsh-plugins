import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { isMain, printError, writeJSON } from '../lib/io.js';

const digest = (text) => createHash('sha256').update(text).digest('hex');
const sensitive = /(?:^|\/)(?:auth|authentication|authorization|security|crypto|secrets?|permissions?)(?:\/|\.)|\.(?:pem|key)$/i;
const bot = /\[bot\]|dependabot|renovate(?:-bot)?/i;
function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Independent commit-touch analysis. It estimates activity concentration, not expertise. */
export function analyzeRepository(repo, options = {}) {
  const now = options.now ?? new Date();
  const maxCommits = options.maxCommits ?? 1000;
  const maxFilesPerCommit = options.maxFilesPerCommit ?? 100;
  const since = options.since ?? new Date(now.getTime() - 180 * 86400000).toISOString();
  if (!Number.isInteger(maxCommits) || maxCommits < 1 || maxCommits > 10000) throw new Error('maxCommits must be 1..10000.');
  if (!Number.isInteger(maxFilesPerCommit) || maxFilesPerCommit < 1) throw new Error('maxFilesPerCommit must be positive.');
  if (!Number.isFinite(Date.parse(since))) throw new Error('since must be an ISO date or timestamp.');
  const root = realpathSync(git(repo, ['rev-parse', '--show-toplevel']).trim());
  const head = git(root, ['rev-parse', 'HEAD']).trim();
  const currentFiles = new Set(git(root, ['ls-files', '-z']).split('\0').filter(Boolean));
  const tokens = git(root, ['log', '--no-merges', '--use-mailmap', `--since=${since}`, `--max-count=${maxCommits + 1}`, '--format=%H%x00%aN%x00%aE%x00%aI', '-z']).split('\0');
  if (tokens.at(-1) === '') tokens.pop();
  if (tokens.length % 4) throw new Error('Unexpected git log metadata format.');
  const commits = [];
  for (let i = 0; i < tokens.length; i += 4) commits.push({ sha: tokens[i], name: tokens[i + 1], email: tokens[i + 2], date: tokens[i + 3] });
  const historyTruncated = commits.length > maxCommits;
  const files = new Map();
  let excludedBotCommits = 0;
  let excludedLargeCommits = 0;
  let analyzedCommits = 0;
  for (const commit of commits.slice(0, maxCommits)) {
    if (!/^[a-f0-9]{40,64}$/.test(commit.sha)) throw new Error('Unexpected commit ID.');
    if (!options.includeBots && bot.test(`${commit.name} ${commit.email}`)) { excludedBotCommits++; continue; }
    const changed = [...new Set(git(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-r', '-z', commit.sha]).split('\0').filter(Boolean))];
    if (changed.length > maxFilesPerCommit) { excludedLargeCommits++; continue; }
    analyzedCommits++;
    const personId = digest(commit.email.trim().toLowerCase() || commit.name).slice(0, 16);
    for (const path of changed) {
      if (!currentFiles.has(path)) continue;
      let file = files.get(path);
      if (!file) { file = { path, sensitive: sensitive.test(path), touches: 0, lastTouch: commit.date, people: new Map(), commits: [] }; files.set(path, file); }
      file.touches++;
      if (Date.parse(commit.date) > Date.parse(file.lastTouch)) file.lastTouch = commit.date;
      if (file.commits.length < 5) file.commits.push(commit.sha);
      const person = file.people.get(personId) ?? { id: personId, name: commit.name, touches: 0 };
      person.touches++;
      file.people.set(personId, person);
    }
  }
  const resultFiles = [...files.values()].map((file) => {
    const owners = [...file.people.values()].map((person) => ({ ...person, share: person.touches / file.touches })).sort((a, b) => b.touches - a.touches || a.id.localeCompare(b.id));
    const substantiveContributors = owners.filter((person) => person.share >= 0.1).length;
    const ageDays = Math.max(0, Math.floor((now.getTime() - Date.parse(file.lastTouch)) / 86400000));
    const flags = [];
    if (owners[0].share >= 0.8) flags.push('concentrated-history');
    if (file.sensitive && substantiveContributors <= 1) flags.push('sensitive-single-contributor');
    if (ageDays >= 90) flags.push('no-recent-touch');
    const { people, ...rest } = file;
    return { ...rest, owners, substantiveContributors, ageDays, flags };
  }).sort((a, b) => b.flags.length - a.flags.length || b.touches - a.touches || a.path.localeCompare(b.path));
  return {
    schemaVersion: 1, repo: root, head, generatedAt: now.toISOString(), since,
    limits: { maxCommits, maxFilesPerCommit, historyTruncated, shallowRepository: git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true' },
    counts: { analyzedCommits, excludedBotCommits, excludedLargeCommits, filesWithHistory: resultFiles.length, currentTrackedFiles: currentFiles.size, filesWithoutHistoryInWindow: currentFiles.size - resultFiles.length },
    methodology: 'One touch per non-merge commit per current tracked file; mailmap identities; renamed paths are not followed; names are retained and email-derived IDs are hashed.',
    interpretation: 'Historical activity is a reviewer hint, not proof of knowledge, accountability, absence of vulnerabilities, or employee performance.',
    files: resultFiles,
  };
}

if (isMain(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { repo: { type: 'string' }, since: { type: 'string' }, out: { type: 'string' }, 'max-commits': { type: 'string' }, 'include-bots': { type: 'boolean' } } });
    const result = analyzeRepository(values.repo ?? '.', { since: values.since, maxCommits: values['max-commits'] ? Number(values['max-commits']) : undefined, includeBots: values['include-bots'] });
    if (values.out) {
      writeJSON(values.out, result);
      console.log(JSON.stringify({ output: values.out, ...result.counts, ...result.limits, highestPriorityFiles: result.files.slice(0, 10).map(({ path, flags }) => ({ path, flags })) }, null, 2));
    } else console.log(JSON.stringify({ ...result, files: result.files.slice(0, 30), displayTruncated: result.files.length > 30 }, null, 2));
  } catch (error) { printError(error); }
}
