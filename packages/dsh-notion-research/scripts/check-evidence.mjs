import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const validSourceId = /^S[1-9]\d*$/;
const validEvidenceId = /^E[1-9]\d*$/;

function notionURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      ['notion.so', 'notion.site'].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

/** Local structural checks only: snapshots and the claims themselves are not authenticated. */
export function checkEvidence(bundle, report) {
  const issues = [];
  const partialSources = [];
  const sources = new Map();
  const evidence = new Map();
  if (!bundle || bundle.schemaVersion !== 1 || !Array.isArray(bundle.sources) || !Array.isArray(bundle.evidence)) {
    return { ok: false, scope: 'local-consistency-only', issues: ['Expected schemaVersion 1, sources[], and evidence[].'] };
  }
  for (const source of bundle.sources) {
    if (!source || !validSourceId.test(source.id) || sources.has(source.id)) {
      issues.push('Source IDs must be unique and match S1, S2, …');
      continue;
    }
    sources.set(source.id, source);
    if (!notionURL(source.url)) issues.push(`${source.id}: expected an HTTPS Notion URL.`);
    if (typeof source.title !== 'string' || !source.title.trim()) issues.push(`${source.id}: missing title.`);
    if (typeof source.text !== 'string' || !source.text.trim()) issues.push(`${source.id}: missing fetched text.`);
    if (typeof source.retrievedAt !== 'string' || !Number.isFinite(Date.parse(source.retrievedAt))) issues.push(`${source.id}: invalid retrievedAt.`);
    if (typeof source.partial !== 'boolean') issues.push(`${source.id}: partial must be true or false.`);
    if (source.partial === true) partialSources.push(source.id);
  }
  for (const item of bundle.evidence) {
    if (!item || !validEvidenceId.test(item.id) || evidence.has(item.id)) {
      issues.push('Evidence IDs must be unique and match E1, E2, …');
      continue;
    }
    evidence.set(item.id, item);
    const source = sources.get(item.sourceId);
    if (!source) issues.push(`${item.id}: unknown source ${item.sourceId}.`);
    if (typeof item.quote !== 'string' || !item.quote.trim()) issues.push(`${item.id}: missing quote.`);
    else if (typeof source?.text === 'string' && !source.text.includes(item.quote)) issues.push(`${item.id}: quote is absent from the saved source text.`);
  }
  const citations = [...new Set([...String(report).matchAll(/\[(E[1-9]\d*)\]/g)].map((match) => match[1]))];
  if (!citations.length) issues.push('Report contains no [E1]-style evidence citations.');
  for (const id of citations) if (!evidence.has(id)) issues.push(`Report cites unknown evidence ${id}.`);
  return {
    ok: issues.length === 0,
    scope: 'local-consistency-only',
    sourceCount: sources.size,
    evidenceCount: evidence.size,
    citedEvidence: citations,
    unusedEvidence: [...evidence.keys()].filter((id) => !citations.includes(id)),
    partialSources,
    issues,
    limits: ['Does not authenticate snapshots, fetch remote pages, establish claim truth, or check citation coverage for every claim.'],
  };
}

function readBounded(path) {
  const maxBytes = 10 * 1024 * 1024;
  if (statSync(path).size > maxBytes) throw new Error('Each input file must be at most 10 MiB.');
  const text = readFileSync(path, 'utf8');
  if (Buffer.byteLength(text) > maxBytes) throw new Error('Input grew beyond the 10 MiB limit.');
  return text;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node check-evidence.mjs sources.json report.md');
    const result = checkEvidence(JSON.parse(readBounded(process.argv[2])), readBounded(process.argv[3]));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, scope: 'local-consistency-only', issues: [error.message] })}\n`);
    process.exitCode = 1;
  }
}
