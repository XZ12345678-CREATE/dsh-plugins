import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { analyzeRepository } from '../packages/dsh-repo-ownership/scripts/ownership-map.mjs';

function fixture() {
  const repo = mkdtempSync(join(tmpdir(), 'dsh-ownership-'));
  const git = (args, env = {}) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  git(['init', '-b', 'main']);
  const commit = (name, email, date, files) => {
    for (const [path, text] of Object.entries(files)) { mkdirSync(join(repo, path, '..'), { recursive: true }); writeFileSync(join(repo, path), text); }
    git(['add', '--all']);
    git(['-c', 'commit.gpgSign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'synthetic fixture'], { GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
  };
  return { repo, git, commit, cleanup: () => rmSync(repo, { recursive: true, force: true }) };
}

test('real Git history yields exact activity shares and excludes bot changes', () => {
  const f = fixture();
  try {
    f.commit('Alice', 'alice@example.test', '2026-08-01T00:00:00Z', { 'auth/login.js': '1', 'a file\nwith newline.js': 'a' });
    f.commit('Alice', 'alice@example.test', '2026-08-02T00:00:00Z', { 'auth/login.js': '2' });
    f.commit('Bob', 'bob@example.test', '2026-08-03T00:00:00Z', { 'auth/login.js': '3' });
    f.commit('dependabot[bot]', 'bot@example.test', '2026-08-04T00:00:00Z', { 'auth/login.js': '4' });
    const report = analyzeRepository(f.repo, { since: '2026-01-01', now: new Date('2026-11-03T00:00:00Z') });
    const login = report.files.find((file) => file.path === 'auth/login.js');
    assert.equal(login.touches, 3);
    assert.equal(login.owners[0].name, 'Alice');
    assert.equal(login.owners[0].share, 2 / 3);
    assert.equal(report.counts.excludedBotCommits, 1);
    assert.equal(report.files.some((file) => file.path.includes('\n')), true);
    assert.equal(JSON.stringify(report).includes('alice@example.test'), false);
    assert.equal(report.limits.shallowRepository, false);
    const included = analyzeRepository(f.repo, { since: '2026-01-01', includeBots: true });
    assert.equal(included.files.find((file) => file.path === 'auth/login.js').touches, 4);
  } finally { f.cleanup(); }
});

test('caps and exclusion gaps are disclosed instead of treated as complete history', () => {
  const f = fixture();
  try {
    f.commit('A', 'a@example.test', '2026-08-01T00:00:00Z', { 'auth/one.js': '1', 'two.js': '2' });
    f.commit('B', 'b@example.test', '2026-08-02T00:00:00Z', { 'two.js': '3' });
    const limited = analyzeRepository(f.repo, { since: '2026-01-01', maxCommits: 1 });
    assert.equal(limited.limits.historyTruncated, true);
    assert.equal(limited.counts.filesWithoutHistoryInWindow, 1);
    const excluded = analyzeRepository(f.repo, { since: '2026-01-01', maxFilesPerCommit: 1 });
    assert.equal(excluded.counts.excludedLargeCommits, 1);
    assert.equal(excluded.counts.filesWithoutHistoryInWindow, 1);
    assert.throws(() => analyzeRepository(f.repo, { maxCommits: 0 }));
  } finally { f.cleanup(); }
});

test('mailmap combines aliases and historical deleted files are omitted', () => {
  const f = fixture();
  try {
    f.commit('Old Alice', 'old@example.test', '2026-08-01T00:00:00Z', { 'auth/one.js': '1', 'deleted.txt': 'old' });
    rmSync(join(f.repo, 'deleted.txt'));
    f.commit('Alice', 'alice@example.test', '2026-08-02T00:00:00Z', { '.mailmap': 'Alice <alice@example.test> Old Alice <old@example.test>\n', 'auth/one.js': '2' });
    const report = analyzeRepository(f.repo, { since: '2026-01-01' });
    const one = report.files.find((file) => file.path === 'auth/one.js');
    assert.equal(one.owners.length, 1);
    assert.equal(one.owners[0].name, 'Alice');
    assert.ok(one.flags.includes('sensitive-single-contributor'));
    assert.equal(report.files.some((file) => file.path === 'deleted.txt'), false);
  } finally { f.cleanup(); }
});
