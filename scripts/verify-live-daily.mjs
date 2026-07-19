/**
 * Confirm production exposes the exact committed daily package before any
 * indexing or notification side effect. Retries are only enabled explicitly.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}
const endpoint = option('--url', 'https://zodiacs.org/data/daily-publication.json');
const timeoutSeconds = Number(option('--timeout', '0'));
if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 0 || timeoutSeconds > 900) {
  throw new Error(`--timeout must be an integer from 0 to 900, received ${timeoutSeconds}`);
}

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const canonicalJson = (value) => JSON.stringify(canonical(value));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const localManifest = JSON.parse(await readFile(new URL('../src/data/daily-publication-manifest.json', import.meta.url), 'utf8'));
const localPublication = JSON.parse(await readFile(new URL('../src/data/daily-publication.json', import.meta.url), 'utf8'));

async function check() {
  const response = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}proof=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`production record returned HTTP ${response.status}`);
  const remote = await response.json();
  if (canonicalJson(remote.manifest) !== canonicalJson(localManifest)) {
    throw new Error(`production manifest is not the committed ${localManifest.date} manifest`);
  }
  if (canonicalJson(remote.publication) !== canonicalJson(localPublication)) {
    throw new Error('production publication is not the committed publication');
  }
  const publicationHash = sha256(canonicalJson(remote.publication));
  if (publicationHash !== localManifest.publication.canonicalSha256) {
    throw new Error('production publication hash disagrees with the committed manifest');
  }
  if (sha256(canonicalJson(remote.inputs?.dailyFacts)) !== localManifest.facts.canonicalSha256) {
    throw new Error('production daily input hash disagrees with the committed manifest');
  }
  if (localManifest.facts.eventsSourceCanonicalSha256
    && sha256(canonicalJson(remote.inputs?.transitSource)) !== localManifest.facts.eventsSourceCanonicalSha256) {
    throw new Error('production transit input hash disagrees with the committed manifest');
  }
}

const deadline = Date.now() + timeoutSeconds * 1000;
let lastError;
do {
  try {
    await check();
    console.log(`verify-live-daily: PASS — production serves ${localManifest.date} with matching inputs and hashes`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (Date.now() >= deadline) break;
    console.log(`verify-live-daily: waiting for deployment — ${error instanceof Error ? error.message : String(error)}`);
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
} while (Date.now() <= deadline);

throw lastError;
