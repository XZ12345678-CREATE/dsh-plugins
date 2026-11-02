import test from 'node:test';
import assert from 'node:assert/strict';
import { collectCI, summarizeCI } from '../packages/dsh-github-workflows/scripts/inspect-ci.mjs';

const sha = 'a'.repeat(40);
const empty = () => ({ schemaVersion: 1, repo: 'owner/repo', pullRequest: 1, headSha: sha, checkRuns: [], statuses: [], unavailable: [], logs: [] });
const check = (id, conclusion, extra = {}) => ({ id, app: { id: 1 }, name: 'tests', status: 'completed', conclusion, ...extra });

test('no checks, skipped checks and inaccessible statuses never report complete success', () => {
  assert.equal(summarizeCI(empty()).verdict, 'no-checks-observed');
  assert.equal(summarizeCI({ ...empty(), checkRuns: [check(1, 'skipped')] }).verdict, 'passed-with-skips');
  assert.equal(summarizeCI({ ...empty(), checkRuns: [check(1, 'success')], unavailable: ['Forbidden'] }).verdict, 'incomplete');
  assert.equal(summarizeCI({ ...empty(), checkRuns: [check(1, 'success')], headChanged: true }).verdict, 'incomplete');
});

test('latest attempt wins per app and name; newest status wins per context', () => {
  const report = summarizeCI({ ...empty(), checkRuns: [check(1, 'failure'), check(2, 'success')], statuses: [{ id: 9, context: 'external', state: 'success' }, { id: 8, context: 'external', state: 'failure' }] });
  assert.equal(report.counts.passed, 2);
  assert.equal(report.verdict, 'passed');
  const otherApp = summarizeCI({ ...empty(), checkRuns: [check(1, 'failure'), check(2, 'success', { app: { id: 2 } })] });
  assert.equal(otherApp.verdict, 'failures-observed');
});

test('pending, cancelled and unknown conclusions preserve their meaning', () => {
  assert.equal(summarizeCI({ ...empty(), checkRuns: [check(1, null, { status: 'in_progress' })] }).verdict, 'pending');
  assert.equal(summarizeCI({ ...empty(), checkRuns: [check(1, 'cancelled')] }).verdict, 'failures-observed');
  assert.equal(summarizeCI({ ...empty(), checkRuns: [check(1, 'new-unknown-value')] }).verdict, 'unknown');
});

test('read-only CLI collection merges paginated snapshots and only requests scoped Actions logs', () => {
  const calls = [];
  const syntheticToken = ['gh', 'p_', 'A'.repeat(36)].join('');
  const invoke = (args) => {
    calls.push(args);
    if (args[0] === 'run') return `synthetic failure\n${syntheticToken}`;
    assert.equal(args[1], '--method');
    assert.equal(args[2], 'GET');
    const endpoint = args[3];
    if (endpoint.endsWith('/pulls/5')) return JSON.stringify({ head: { sha }, base: { sha: 'b'.repeat(40) } });
    if (endpoint.includes('/check-runs?')) return JSON.stringify([{ check_runs: [check(1, 'failure', { details_url: 'https://github.com/owner/repo/actions/runs/100', output: { summary: 'api_key=should-not-survive', text: 'unneeded payload' } })] }, { check_runs: [check(2, 'failure', { name: 'external', details_url: 'https://evil.example/owner/repo/actions/runs/200' })] }]);
    if (endpoint.includes('/statuses?')) return JSON.stringify([[{ id: 3, context: 'external-ci', state: 'failure' }], []]);
    throw new Error('Unexpected call');
  };
  const snapshot = collectCI({ repo: 'owner/repo', pr: 5, logs: true, invoke });
  assert.equal(snapshot.checkRuns.length, 2);
  assert.equal(snapshot.statuses.length, 1);
  assert.equal(calls.filter((args) => args[0] === 'run').length, 1);
  assert.equal(snapshot.logs[0].text.includes('ghp_'), false);
  assert.equal(snapshot.checkRuns[0].output.text, undefined);
  assert.equal(snapshot.checkRuns[0].output.summary.includes('should-not-survive'), false);
  assert.ok(calls.filter((args) => args[3]?.includes('commits/')).every((args) => args.includes('--paginate') && args.includes('--slurp')));
});

test('capture marks a PR head race and handles one denied API without inventing green status', () => {
  let pulls = 0;
  const invoke = (args) => {
    if (args[3].includes('/pulls/')) return JSON.stringify({ head: { sha: ++pulls === 1 ? sha : 'b'.repeat(40) } });
    if (args[3].includes('/check-runs?')) return JSON.stringify([{ check_runs: [check(1, 'success')] }]);
    throw new Error('Forbidden');
  };
  const report = summarizeCI(collectCI({ repo: 'owner/repo', pr: 1, invoke }));
  assert.equal(report.verdict, 'incomplete');
  assert.equal(report.unavailable.length, 2);
  assert.throws(() => collectCI({ repo: '../escape', pr: 1, invoke }));
});
