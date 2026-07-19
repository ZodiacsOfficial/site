/**
 * Prove the Phase 1 operational gate from GitHub's immutable run history.
 * Only schedule-triggered runs after the supplied cutover can count, and a
 * run counts only when every publishing/live/discovery step plus its receipt
 * artifact succeeded.
 */
import { inflateRawSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const REQUIRED_STEPS = Object.freeze([
  'Compute today',
  'Verify publication package',
  'Replay 30 publication days',
  'Commit if changed',
  'Require exact edition in production',
  'Notify IndexNow',
  'Write immutable operation receipt',
  'Upload operation receipt',
]);

const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
};

function nextUtcDate(date) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
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
  exact('schema', 'zodiacs.daily-operation-receipt.v1');
  exact('targetDate', targetDate);
  exact('event', 'schedule');
  exact('runId', run.id);
  exact('runUrl', run.html_url);
  exact('liveVerification', 'exact-match');
  exact('indexNow', 'accepted');
  if (!Number.isInteger(receipt.runAttempt) || receipt.runAttempt < 1) failures.push('receipt runAttempt must be a positive integer');
  if (!/^[a-f0-9]{40}$/.test(receipt.commitSha ?? '')) failures.push('receipt commitSha must be a full Git SHA');
  for (const field of ['publicationCanonicalSha256', 'factsCanonicalSha256']) {
    if (!/^[a-f0-9]{64}$/.test(receipt[field] ?? '')) failures.push(`receipt ${field} must be SHA-256`);
  }
  const completedAt = Date.parse(receipt.completedAt ?? '');
  if (!Number.isFinite(completedAt) || completedAt < Date.parse(run.created_at)) {
    failures.push('receipt completedAt must be a valid instant after the run started');
  }
  return failures;
}

async function downloadOperationReceipt(repo, artifact) {
  const response = await githubResponse(repo, `/actions/artifacts/${artifact.id}/zip`, 'application/octet-stream');
  return extractJsonFromZip(await response.arrayBuffer());
}

async function inspectRun(repo, run) {
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
    githubJson(repo, `/actions/runs/${run.id}/jobs?per_page=100`),
    githubJson(repo, `/actions/runs/${run.id}/artifacts?per_page=100`),
  ]);
  const steps = new Map(
    jobsPayload.jobs.flatMap((job) => job.steps ?? []).map((step) => [step.name, step.conclusion]),
  );
  const failures = REQUIRED_STEPS
    .filter((name) => steps.get(name) !== 'success')
    .map((name) => `${name}: ${steps.get(name) ?? 'missing'}`);
  const receipt = artifactsPayload.artifacts.find((artifact) => (
    !artifact.expired
    && new RegExp(`^daily-publication-\\d{4}-\\d{2}-\\d{2}-${run.id}$`).test(artifact.name)
  ));
  if (!receipt) failures.push('immutable operation receipt artifact: missing');
  const targetDate = receipt?.name.match(/^daily-publication-(\d{4}-\d{2}-\d{2})-/)?.[1]
    ?? run.created_at.slice(0, 10);
  if (receipt) {
    try {
      const payload = await downloadOperationReceipt(repo, receipt);
      failures.push(...operationReceiptFailures(payload, run, targetDate));
    } catch (error) {
      failures.push(`immutable operation receipt artifact: ${error instanceof Error ? error.message : String(error)}`);
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
    receiptArtifactId: receipt?.id ?? null,
    failures,
  };
}

async function main() {
  const repo = option('--repo', 'ZodiacsOfficial/site');
  const workflow = option('--workflow', 'daily-horoscopes.yml');
  const after = option('--after', '');
  const required = Number(option('--min-runs', '3'));
  if (!after || Number.isNaN(Date.parse(after))) {
    throw new Error('--after must be the Phase 1 workflow cutover as an ISO instant');
  }
  if (!Number.isInteger(required) || required < 1 || required > 30) {
    throw new Error('--min-runs must be an integer from 1 to 30');
  }

  const payload = await githubJson(
    repo,
    `/actions/workflows/${encodeURIComponent(workflow)}/runs?event=schedule&per_page=100`,
  );
  const runs = payload.workflow_runs
    .filter((run) => run.event === 'schedule' && Date.parse(run.created_at) >= Date.parse(after))
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
  const evidence = [];
  for (const run of runs) evidence.push(await inspectRun(repo, run));
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
