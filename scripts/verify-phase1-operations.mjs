/**
 * Prove the Phase 1 operational gate from GitHub's immutable run history.
 * Only schedule-triggered runs after the supplied cutover can count, and a
 * run counts only when every publishing/live/discovery step plus its receipt
 * artifact succeeded.
 */
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const REQUIRED_STEPS = Object.freeze([
  'Resolve explicit UTC target',
  'Compute today',
  'Verify publication package',
  'Replay 30 publication days',
  'Commit if changed',
  'Require exact edition in production',
  'Notify IndexNow',
  'Write immutable operation receipt',
  'Upload operation receipt',
]);

const REPOSITORY_EVIDENCE_PATHS = Object.freeze({
  manifest: 'src/data/daily-publication-manifest.json',
  facts: 'src/data/daily.json',
  publication: 'src/data/daily-publication.json',
  horoscopeProgram: 'src/data/horoscope-program.json',
});

const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
};

function nextUtcDate(date) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};

export const canonicalSha256 = (value) => createHash('sha256')
  .update(JSON.stringify(canonical(value)))
  .digest('hex');

const bytesSha256 = (value) => createHash('sha256').update(value).digest('hex');

export function validateCutoverOptions(after, cutoverSha) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(after ?? '')
    || Number.isNaN(Date.parse(after))) {
    throw new Error('--after must be the Phase 1 workflow cutover as an ISO UTC instant ending in Z');
  }
  if (!/^[a-f0-9]{40}$/.test(cutoverSha ?? '')) {
    throw new Error('--cutover-sha must be the full 40-hex Phase 1 closeout commit SHA');
  }
}

export function latestConsecutiveEvidence(entries) {
  let streak = [];
  for (const entry of [...entries].sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    if (!entry.valid) {
      streak = [];
      continue;
    }
    const previous = streak.at(-1);
    streak = previous && nextUtcDate(previous.targetDate) === entry.targetDate
      ? [...streak, entry]
      : [entry];
  }
  return streak;
}

/**
 * The workflow computes TARGET_DATE in this named step using `date -u +%F`.
 * GitHub's job API supplies the step timestamp, so the expected edition is
 * derived from platform-owned evidence rather than an artifact filename or
 * a date repeated inside the receipt itself.
 */
export function scheduledTargetDate(run, jobsPayload) {
  if (run?.event !== 'schedule') {
    throw new Error(`run event must be schedule, received ${run?.event ?? 'missing'}`);
  }
  const candidates = (jobsPayload?.jobs ?? []).flatMap((job) => (
    (job.steps ?? [])
      .filter((step) => step.name === 'Resolve explicit UTC target')
      .map((step) => ({ job, step }))
  ));
  if (candidates.length !== 1) {
    throw new Error(`expected one Resolve explicit UTC target step, found ${candidates.length}`);
  }
  const [{ job, step }] = candidates;
  if (step.conclusion !== 'success') {
    throw new Error(`Resolve explicit UTC target concluded ${step.conclusion ?? 'missing'}`);
  }
  if (job.run_attempt !== run.run_attempt) {
    throw new Error(`target job run attempt ${job.run_attempt ?? 'missing'} does not match API run attempt ${run.run_attempt ?? 'missing'}`);
  }
  const startedAt = Date.parse(step.started_at ?? '');
  if (!Number.isFinite(startedAt)) {
    throw new Error('Resolve explicit UTC target has no valid GitHub step start time');
  }
  const runStartedAt = Date.parse(run.created_at ?? '');
  if (!Number.isFinite(runStartedAt) || startedAt < runStartedAt) {
    throw new Error('Resolve explicit UTC target predates the GitHub workflow run');
  }
  return new Date(startedAt).toISOString().slice(0, 10);
}

function githubHeaders(accept = 'application/vnd.github+json') {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  return {
    accept,
    'user-agent': 'zodiacs-phase1-operations-verifier',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function githubResponse(repo, path, accept) {
  const headers = {
    ...githubHeaders(accept),
  };
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`GitHub ${path} returned HTTP ${response.status}`);
  }
  return response;
}

async function githubJson(repo, path) {
  return (await githubResponse(repo, path, 'application/vnd.github+json')).json();
}

function extractJsonFromZip(bytes) {
  const zip = Buffer.from(bytes);
  const minimumEocd = 22;
  let eocd = -1;
  for (let offset = zip.length - minimumEocd; offset >= Math.max(0, zip.length - 65_557); offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error('receipt artifact is not a readable ZIP archive');

  const entryCount = zip.readUInt16LE(eocd + 10);
  let centralOffset = zip.readUInt32LE(eocd + 16);
  const jsonEntries = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (zip.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error('receipt artifact has a malformed central directory');
    }
    const compression = zip.readUInt16LE(centralOffset + 10);
    const compressedSize = zip.readUInt32LE(centralOffset + 20);
    const nameLength = zip.readUInt16LE(centralOffset + 28);
    const extraLength = zip.readUInt16LE(centralOffset + 30);
    const commentLength = zip.readUInt16LE(centralOffset + 32);
    const localOffset = zip.readUInt32LE(centralOffset + 42);
    const name = zip.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString('utf8');

    if (name.endsWith('.json')) {
      if (zip.readUInt32LE(localOffset) !== 0x04034b50) {
        throw new Error(`${name}: malformed local ZIP entry`);
      }
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = zip.subarray(dataOffset, dataOffset + compressedSize);
      const decoded = compression === 0
        ? compressed
        : compression === 8
          ? inflateRawSync(compressed)
          : null;
      if (!decoded) throw new Error(`${name}: unsupported ZIP compression method ${compression}`);
      jsonEntries.push({ name, value: JSON.parse(decoded.toString('utf8')) });
    }
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  if (jsonEntries.length !== 1) {
    throw new Error(`receipt artifact must contain exactly one JSON file, found ${jsonEntries.length}`);
  }
  return jsonEntries[0].value;
}

export function operationReceiptFailures(receipt, run, targetDate) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return ['receipt JSON must be an object'];
  }
  const failures = [];
  const exact = (field, expected) => {
    if (receipt[field] !== expected) failures.push(`receipt ${field}: expected ${expected}, received ${receipt[field] ?? 'missing'}`);
  };
  exact('schema', 'zodiacs.daily-operation-receipt.v2');
  exact('targetDate', targetDate);
  exact('event', 'schedule');
  exact('runId', run.id);
  exact('runUrl', run.html_url);
  exact('liveVerification', 'exact-match');
  exact('indexNow', 'accepted');
  if (run.event !== 'schedule') failures.push(`GitHub run event: expected schedule, received ${run.event ?? 'missing'}`);
  if (run.run_attempt !== 1) failures.push(`GitHub run attempt: expected 1, received ${run.run_attempt ?? 'missing'}`);
  exact('runAttempt', run.run_attempt);
  if (!/^[a-f0-9]{40}$/.test(receipt.commitSha ?? '')) failures.push('receipt commitSha must be a full Git SHA');
  for (const field of ['publicationCanonicalSha256', 'factsCanonicalSha256', 'horoscopeProgramSha256']) {
    if (!/^[a-f0-9]{64}$/.test(receipt[field] ?? '')) failures.push(`receipt ${field} must be SHA-256`);
  }
  const completedAt = Date.parse(receipt.completedAt ?? '');
  if (!Number.isFinite(completedAt) || completedAt < Date.parse(run.created_at)) {
    failures.push('receipt completedAt must be a valid instant after the run started');
  }
  return failures;
}

function parseEvidenceJson(files, name, failures) {
  try {
    return JSON.parse(files[name]);
  } catch {
    failures.push(`${REPOSITORY_EVIDENCE_PATHS[name]} at receipt commit is not valid JSON`);
    return null;
  }
}

/**
 * Reconcile a receipt against immutable repository objects downloaded at its
 * recorded commit. This keeps a self-consistent but fabricated receipt from
 * proving a publication that the repository never contained.
 */
export function repositoryEvidenceFailures(receipt, run, targetDate, cutoverSha, evidence) {
  const failures = [];
  if (evidence?.commit?.sha !== receipt.commitSha) {
    failures.push(`repository commit: expected ${receipt.commitSha}, received ${evidence?.commit?.sha ?? 'missing'}`);
  }
  if (!['ahead', 'identical'].includes(evidence?.comparison?.status)) {
    failures.push(`receipt commit is not the GitHub run SHA or its descendant (${evidence?.comparison?.status ?? 'missing'})`);
  }
  if (!['ahead', 'identical'].includes(evidence?.cutoverComparison?.status)) {
    failures.push(`receipt commit does not contain cutover SHA ${cutoverSha} (${evidence?.cutoverComparison?.status ?? 'missing'})`);
  }
  if (typeof evidence?.workflowSource !== 'string') {
    failures.push('scheduled workflow source is missing at the GitHub run SHA');
  } else {
    if (!evidence.workflowSource.includes('- cron: "0 0 * * *"')) {
      failures.push('scheduled workflow source does not declare the 00:00 UTC boundary');
    }
    if (!evidence.workflowSource.includes('- name: Resolve explicit UTC target')
      || !evidence.workflowSource.includes('echo "TARGET_DATE=$(date -u +%F)" >> "$GITHUB_ENV"')) {
      failures.push('scheduled workflow source does not derive TARGET_DATE from UTC in the observed step');
    }
  }
  const files = evidence?.files ?? {};
  for (const [name, path] of Object.entries(REPOSITORY_EVIDENCE_PATHS)) {
    if (typeof files[name] !== 'string') failures.push(`${path} is missing at receipt commit`);
  }
  if (failures.some((failure) => failure.endsWith('is missing at receipt commit'))) return failures;

  const manifest = parseEvidenceJson(files, 'manifest', failures);
  const facts = parseEvidenceJson(files, 'facts', failures);
  const publication = parseEvidenceJson(files, 'publication', failures);
  const horoscopeProgram = parseEvidenceJson(files, 'horoscopeProgram', failures);
  if (!manifest || !facts || !publication || !horoscopeProgram) return failures;

  const exactDate = (label, value) => {
    if (value !== targetDate) failures.push(`${label}: expected ${targetDate}, received ${value ?? 'missing'}`);
  };
  exactDate('repository manifest date', manifest.date);
  exactDate('repository facts date', facts.date);
  exactDate('repository publication date', publication.date);
  exactDate('repository horoscope program anchorDate', horoscopeProgram.anchorDate);

  const factsCanonicalSha256 = canonicalSha256(facts);
  const publicationCanonicalSha256 = canonicalSha256(publication);
  const horoscopeProgramSha256 = canonicalSha256(horoscopeProgram);
  const factsFileSha256 = bytesSha256(files.facts);
  const hashChecks = [
    ['manifest facts canonical hash', manifest.facts?.canonicalSha256, factsCanonicalSha256],
    ['manifest facts file hash', manifest.facts?.fileSha256, factsFileSha256],
    ['manifest publication canonical hash', manifest.publication?.canonicalSha256, publicationCanonicalSha256],
    ['receipt facts canonical hash', receipt.factsCanonicalSha256, factsCanonicalSha256],
    ['receipt publication canonical hash', receipt.publicationCanonicalSha256, publicationCanonicalSha256],
    ['receipt horoscope program hash', receipt.horoscopeProgramSha256, horoscopeProgramSha256],
  ];
  for (const [label, actual, expected] of hashChecks) {
    if (actual !== expected) failures.push(`${label}: expected ${expected}, received ${actual ?? 'missing'}`);
  }
  return failures;
}

async function downloadOperationReceipt(repo, artifact) {
  const response = await githubResponse(repo, `/actions/artifacts/${artifact.id}/zip`, 'application/octet-stream');
  return extractJsonFromZip(await response.arrayBuffer());
}

async function repositoryFileAtCommit(repo, path, commitSha) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const payload = await githubJson(repo, `/contents/${encodedPath}?ref=${encodeURIComponent(commitSha)}`);
  if (payload?.type !== 'file' || payload.encoding !== 'base64' || typeof payload.content !== 'string') {
    throw new Error(`${path} did not resolve to an inline GitHub file at ${commitSha}`);
  }
  return Buffer.from(payload.content.replaceAll('\n', ''), 'base64').toString('utf8');
}

async function downloadRepositoryEvidence(repo, run, commitSha, cutoverSha) {
  if (!/^\.github\/workflows\/[^/]+\.ya?ml$/.test(run.path ?? '')) {
    throw new Error(`GitHub run has an invalid workflow path: ${run.path ?? 'missing'}`);
  }
  const [commit, comparison, cutoverComparison, workflowSource, entries] = await Promise.all([
    githubJson(repo, `/commits/${encodeURIComponent(commitSha)}`),
    githubJson(repo, `/compare/${encodeURIComponent(run.head_sha)}...${encodeURIComponent(commitSha)}`),
    githubJson(repo, `/compare/${encodeURIComponent(cutoverSha)}...${encodeURIComponent(commitSha)}`),
    repositoryFileAtCommit(repo, run.path, run.head_sha),
    Promise.all(Object.entries(REPOSITORY_EVIDENCE_PATHS).map(async ([name, path]) => (
      [name, await repositoryFileAtCommit(repo, path, commitSha)]
    ))),
  ]);
  return { commit, comparison, cutoverComparison, workflowSource, files: Object.fromEntries(entries) };
}

async function inspectRun(repo, run, cutoverSha) {
  if (run.status !== 'completed' || run.conclusion !== 'success') {
    return {
      valid: false,
      createdAt: run.created_at,
      runId: run.id,
      runNumber: run.run_number,
      runUrl: run.html_url,
      targetDate: run.created_at.slice(0, 10),
      failures: [`run concluded ${run.status}/${run.conclusion ?? 'pending'}`],
    };
  }

  const [jobsPayload, artifactsPayload] = await Promise.all([
    githubJson(repo, `/actions/runs/${run.id}/jobs?filter=all&per_page=100`),
    githubJson(repo, `/actions/runs/${run.id}/artifacts?per_page=100`),
  ]);
  const steps = new Map(
    jobsPayload.jobs.flatMap((job) => job.steps ?? []).map((step) => [step.name, step.conclusion]),
  );
  const failures = REQUIRED_STEPS
    .filter((name) => steps.get(name) !== 'success')
    .map((name) => `${name}: ${steps.get(name) ?? 'missing'}`);
  let targetDate = run.created_at.slice(0, 10);
  try {
    targetDate = scheduledTargetDate(run, jobsPayload);
  } catch (error) {
    failures.push(`trusted target date: ${error instanceof Error ? error.message : String(error)}`);
  }
  const expectedArtifactName = `daily-publication-${targetDate}-${run.id}`;
  const receiptArtifacts = artifactsPayload.artifacts.filter((artifact) => (
    !artifact.expired && artifact.name === expectedArtifactName
  ));
  const receiptArtifact = receiptArtifacts.length === 1 ? receiptArtifacts[0] : null;
  if (!receiptArtifact) {
    failures.push(`immutable operation receipt artifact: expected exactly one ${expectedArtifactName}, found ${receiptArtifacts.length}`);
  }
  let receiptPayload = null;
  if (receiptArtifact) {
    try {
      receiptPayload = await downloadOperationReceipt(repo, receiptArtifact);
      failures.push(...operationReceiptFailures(receiptPayload, run, targetDate));
    } catch (error) {
      failures.push(`immutable operation receipt artifact: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (receiptPayload && /^[a-f0-9]{40}$/.test(receiptPayload.commitSha ?? '')) {
    try {
      const repositoryEvidence = await downloadRepositoryEvidence(repo, run, receiptPayload.commitSha, cutoverSha);
      failures.push(...repositoryEvidenceFailures(receiptPayload, run, targetDate, cutoverSha, repositoryEvidence));
    } catch (error) {
      failures.push(`repository evidence at receipt commit: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    valid: failures.length === 0,
    createdAt: run.created_at,
    runId: run.id,
    runNumber: run.run_number,
    runUrl: run.html_url,
    targetDate,
    headSha: run.head_sha,
    receiptArtifactId: receiptArtifact?.id ?? null,
    failures,
  };
}

async function main() {
  const repo = option('--repo', 'ZodiacsOfficial/site');
  const workflow = option('--workflow', 'daily-horoscopes.yml');
  const after = option('--after', '');
  const cutoverSha = option('--cutover-sha', '');
  const required = Number(option('--min-runs', '3'));
  validateCutoverOptions(after, cutoverSha);
  if (!Number.isInteger(required) || required < 1 || required > 30) {
    throw new Error('--min-runs must be an integer from 1 to 30');
  }

  const payload = await githubJson(
    repo,
    `/actions/workflows/${encodeURIComponent(workflow)}/runs?event=schedule&per_page=100`,
  );
  const runs = payload.workflow_runs
    .filter((run) => run.event === 'schedule' && Date.parse(run.created_at) > Date.parse(after))
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
  const evidence = [];
  for (const run of runs) evidence.push(await inspectRun(repo, run, cutoverSha));
  const streak = latestConsecutiveEvidence(evidence);

  if (streak.length < required) {
    const lastFailure = [...evidence].reverse().find((entry) => !entry.valid);
    const detail = lastFailure ? ` Last failure: ${lastFailure.runUrl} — ${lastFailure.failures.join('; ')}` : '';
    throw new Error(`Phase 1 operations: ${streak.length}/${required} consecutive scheduled publications proven.${detail}`);
  }

  const accepted = streak.slice(-required);
  console.log(`verify-phase1-operations: PASS — ${required} consecutive scheduled publications`);
  for (const entry of accepted) {
    console.log(`  ${entry.targetDate} · run ${entry.runNumber} · ${entry.runUrl} · receipt ${entry.receiptArtifactId}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
