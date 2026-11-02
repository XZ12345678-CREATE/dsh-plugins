import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { isMain, printError, readJSON, redact, writeJSON } from '../lib/io.js';

function safeURL(value) {
  try { const url = new URL(value); if (url.protocol !== 'https:') return null; url.username = ''; url.password = ''; url.search = ''; url.hash = ''; return url.href; }
  catch { return null; }
}
function latestBy(items, key) {
  const map = new Map();
  for (const item of items) {
    const id = key(item);
    if (!map.has(id) || Number(item.id) > Number(map.get(id).id)) map.set(id, item);
  }
  return [...map.values()];
}
function checkState(run) {
  if (run.status !== 'completed') return 'pending';
  if (run.conclusion === 'success') return 'passed';
  if (['skipped', 'neutral'].includes(run.conclusion)) return 'skipped';
  if (['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure', 'stale'].includes(run.conclusion)) return 'failed';
  return 'unknown';
}

export function summarizeCI(snapshot) {
  if (snapshot?.schemaVersion !== 1 || !Array.isArray(snapshot.checkRuns) || !Array.isArray(snapshot.statuses) || !Array.isArray(snapshot.unavailable)) throw new Error('Expected a CI snapshot with schemaVersion 1, checkRuns[], statuses[], unavailable[].');
  const checks = latestBy(snapshot.checkRuns, (run) => `${run.app?.id ?? run.app?.slug ?? 'unknown'}:${run.name}`).map((run) => ({
    id: run.id, name: redact(run.name ?? 'unnamed'), state: checkState(run), conclusion: run.conclusion ?? null,
    url: safeURL(run.html_url), detailsURL: safeURL(run.details_url),
    summary: redact(run.output?.summary ?? '').slice(0, 4000),
  }));
  const statuses = latestBy(snapshot.statuses, (status) => status.context).map((status) => ({
    name: redact(status.context ?? 'unnamed'), state: status.state === 'success' ? 'passed' : ['failure', 'error'].includes(status.state) ? 'failed' : status.state === 'pending' ? 'pending' : 'unknown',
    description: redact(status.description ?? ''), url: safeURL(status.target_url),
  }));
  const counts = { passed: 0, failed: 0, pending: 0, skipped: 0, unknown: 0 };
  for (const row of [...checks, ...statuses]) counts[row.state]++;
  const complete = !snapshot.unavailable.length && !snapshot.headChanged;
  const total = checks.length + statuses.length;
  const verdict = !complete ? 'incomplete' : !total ? 'no-checks-observed' : counts.failed ? 'failures-observed' : counts.pending ? 'pending' : counts.unknown ? 'unknown' : counts.skipped ? 'passed-with-skips' : 'passed';
  return { schemaVersion: 1, repo: snapshot.repo, pullRequest: snapshot.pullRequest, headSha: snapshot.headSha, complete, verdict, counts, checks, statuses, unavailable: snapshot.unavailable.map(redact), logs: snapshot.logs ?? [], limits: 'Observed check runs and commit statuses are not a branch-protection, review-approval or mergeability decision. External-provider logs may be unavailable.' };
}

function invokeGH(args) {
  return execFileSync('gh', args, { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
function boundedSnapshot(snapshot) {
  return {
    ...snapshot,
    checkRuns: snapshot.checkRuns.map((run) => ({
      id: run.id, name: redact(run.name ?? 'unnamed'), status: run.status, conclusion: run.conclusion, head_sha: run.head_sha,
      app: { id: run.app?.id, slug: run.app?.slug }, html_url: safeURL(run.html_url), details_url: safeURL(run.details_url),
      output: { summary: redact(run.output?.summary ?? '').slice(0, 4000) },
    })),
    statuses: snapshot.statuses.map((status) => ({ id: status.id, context: redact(status.context ?? 'unnamed'), state: status.state, description: redact(status.description ?? ''), target_url: safeURL(status.target_url) })),
    logs: (snapshot.logs ?? []).map((log) => ({ runId: log.runId, text: redact(log.text ?? '').slice(-32000), boundedTail: true })),
    unavailable: snapshot.unavailable.map(redact),
  };
}
/** All REST requests are explicit GETs; optional log retrieval uses gh run view. */
export function collectCI({ repo, pr, logs = false, invoke = invokeGH }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repo ?? '') || !Number.isSafeInteger(pr) || pr < 1) throw new Error('Use --repo OWNER/REPO and a positive --pr number.');
  const api = (endpoint, paginate = false) => JSON.parse(invoke(['api', '--method', 'GET', endpoint, ...(paginate ? ['--paginate', '--slurp'] : [])]));
  const pull = api(`repos/${repo}/pulls/${pr}`);
  const sha = pull.head?.sha;
  if (!/^[a-f0-9]{40,64}$/.test(sha ?? '')) throw new Error('GitHub did not return a valid PR head SHA.');
  const snapshot = { schemaVersion: 1, repo, pullRequest: pr, headSha: sha, baseSha: pull.base?.sha, collectedAt: new Date().toISOString(), checkRuns: [], statuses: [], unavailable: [], logs: [], headChanged: false };
  try {
    const pages = api(`repos/${repo}/commits/${sha}/check-runs?per_page=100&filter=latest`, true);
    if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page.check_runs))) throw new Error('Malformed check-run pages.');
    snapshot.checkRuns = pages.flatMap((page) => page.check_runs);
  } catch (error) { snapshot.unavailable.push(`Check runs unavailable: ${redact(error.message).slice(0, 500)}`); }
  try {
    const pages = api(`repos/${repo}/commits/${sha}/statuses?per_page=100`, true);
    if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page))) throw new Error('Malformed status pages.');
    snapshot.statuses = pages.flat();
  } catch (error) { snapshot.unavailable.push(`Commit statuses unavailable: ${redact(error.message).slice(0, 500)}`); }
  if (logs) {
    const runIds = new Set();
    const latestChecks = latestBy(snapshot.checkRuns, (run) => `${run.app?.id ?? run.app?.slug ?? 'unknown'}:${run.name}`);
    for (const check of latestChecks.filter((run) => checkState(run) === 'failed')) {
      const url = safeURL(check.details_url);
      if (!url) continue;
      const parsed = new URL(url);
      const prefix = `/${repo}/actions/runs/`;
      if (parsed.hostname !== 'github.com' || !parsed.pathname.startsWith(prefix)) continue;
      const runId = parsed.pathname.slice(prefix.length).split('/')[0];
      if (/^\d+$/.test(runId)) runIds.add(runId);
    }
    for (const runId of [...runIds].slice(0, 5)) {
      try { snapshot.logs.push({ runId, text: redact(invoke(['run', 'view', runId, '--repo', repo, '--log-failed'])).slice(-32000), boundedTail: true }); }
      catch (error) { snapshot.unavailable.push(`Run ${runId} logs unavailable: ${redact(error.message).slice(0, 500)}`); }
    }
    if (runIds.size > 5) snapshot.unavailable.push('More than five failing Actions runs; only five logs requested.');
  }
  try { snapshot.headChanged = api(`repos/${repo}/pulls/${pr}`).head?.sha !== sha; if (snapshot.headChanged) snapshot.unavailable.push('PR head changed during capture; repeat for the current commit.'); }
  catch { snapshot.unavailable.push('Could not recheck PR head after capture.'); }
  return boundedSnapshot(snapshot);
}

if (isMain(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { input: { type: 'string' }, repo: { type: 'string' }, pr: { type: 'string' }, out: { type: 'string' }, logs: { type: 'boolean' } } });
    const snapshot = values.input ? readJSON(values.input) : collectCI({ repo: values.repo, pr: Number(values.pr), logs: values.logs });
    const report = summarizeCI(snapshot);
    if (values.out) writeJSON(values.out, { snapshot: boundedSnapshot(snapshot), report });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.verdict === 'incomplete' ? 1 : 0;
  } catch (error) { printError(error); }
}
