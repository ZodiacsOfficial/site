import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  DAILY_EDITORIAL_CONSTITUTION,
  DAILY_RENDERER_VERSION,
  buildDailyPublication,
  validateDailyPublication,
  type DailyPublication,
  type EditorialViolation,
} from '../src/lib/daily-publication';
import type { Daily } from '../src/lib/daily';
import { computeDailySnapshot } from './daily-snapshot-lib.mjs';
import { auditDailyAstronomy } from './daily-fact-audit.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DAILY_PATH = resolve(REPO_ROOT, 'src/data/daily.json');
export const PUBLICATION_PATH = resolve(REPO_ROOT, 'src/data/daily-publication.json');
export const MANIFEST_PATH = resolve(REPO_ROOT, 'src/data/daily-publication-manifest.json');
export const POLICY_PATH = resolve(REPO_ROOT, 'src/lib/editorial-policy/constitution.v1.json');

export interface DailyPublicationManifest {
  schema: 'zodiacs.daily-publication-manifest.v1';
  date: string;
  snapshotAt: string;
  status: 'verified';
  policy: {
    id: string;
    version: string;
    sha256: string;
  };
  facts: {
    path: 'src/data/daily.json';
    fileSha256: string;
    canonicalSha256: string;
    factCount: number;
    eventsCoverage: 'complete' | 'unavailable';
    eventsSource: string | null;
    eventsSourceSha256: string | null;
    eventsSourceCanonicalSha256: string | null;
    engine: { name: 'astronomy-engine'; version: string };
  };
  publication: {
    path: 'src/data/daily-publication.json';
    canonicalSha256: string;
    signCount: 12;
    outputCount: number;
  };
  generation: {
    mode: DailyPublication['generation']['mode'];
    generatorId: string;
    generatorSha256: string;
    model: DailyPublication['generation']['model'];
    freeformModelOutput: false;
  };
  verification: {
    verifierId: 'zodiacs.daily-verifier.v2';
    verifierSha256: string;
    independentFromGenerator: false;
    astronomyAudit: {
      implementation: 'zodiacs.daily-fact-audit.v1';
      independentFromSnapshotBuilder: true;
      status: 'passed';
    };
    rendererCheck: {
      kind: 'deterministic-regeneration-and-policy';
      independentImplementation: false;
      status: 'passed';
    };
    deterministicStatus: 'passed';
    aiReview: {
      required: false;
      status: 'not-run';
      reason: string;
    };
  };
  checks: {
    signCount: 12;
    factAudit: 'independent-recomputation-passed';
    exactRender: 'passed';
    distinctness: 'passed';
    voiceAndSafety: 'passed';
  };
  fallback: {
    missingEvents: 'positions-only-with-disclosure';
    factsFailure: 'hold-current-dated-edition';
    staleContentMayBeRelabeled: false;
  };
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, nested]) => [key, canonicalValue(nested)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

async function readJson<T>(path: string): Promise<{ raw: string; value: T }> {
  const raw = await readFile(path, 'utf8');
  return { raw, value: JSON.parse(raw) as T };
}

async function engineVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(resolve(REPO_ROOT, 'node_modules/astronomy-engine/package.json'), 'utf8')) as {
    version?: string;
  };
  if (!pkg.version) throw new Error('astronomy-engine package version is unavailable');
  return pkg.version;
}

async function generatorSha256(): Promise<string> {
  const sources = await Promise.all([
    readFile(resolve(REPO_ROOT, 'scripts/daily-snapshot-lib.mjs'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'scripts/build-transits.mjs'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'src/lib/daily.ts'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'src/lib/daily-publication.ts'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'src/lib/signs.ts'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'package-lock.json'), 'utf8'),
  ]);
  return sha256(sources.join('\n-- zodiacs generator boundary --\n'));
}

async function verifierSha256(): Promise<string> {
  const sources = await Promise.all([
    readFile(resolve(REPO_ROOT, 'scripts/daily-fact-audit.mjs'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'scripts/daily-publication-files.ts'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'scripts/verify-daily-publication.ts'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'scripts/verify-transits.mjs'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'src/lib/daily-publication.ts'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'src/lib/editorial-policy/constitution.v1.json'), 'utf8'),
    readFile(resolve(REPO_ROOT, 'package-lock.json'), 'utf8'),
  ]);
  return sha256(sources.join('\n-- zodiacs verifier boundary --\n'));
}

export function formatViolations(violations: EditorialViolation[]): string {
  return violations
    .map((failure) => `  ${failure.ruleId} ${failure.path}: ${failure.message}`)
    .join('\n');
}

export async function expectedDailyPackage(): Promise<{
  daily: Daily;
  dailyRaw: string;
  publication: DailyPublication;
  manifest: DailyPublicationManifest;
  violations: EditorialViolation[];
}> {
  const { raw: dailyRaw, value: daily } = await readJson<Daily>(DAILY_PATH);
  const publication = buildDailyPublication(daily);
  const recomputed = await computeDailySnapshot(daily.date, REPO_ROOT) as Daily;
  const violations = [
    ...validateDailyPublication(daily, publication),
    ...await auditDailyAstronomy(daily, REPO_ROOT),
  ];
  if (canonicalJson(daily) !== canonicalJson(recomputed)) {
    violations.push({
      ruleId: 'ASTRO-SNAPSHOT-RECOMPUTE',
      path: 'src/data/daily.json',
      message: 'committed facts differ from an explicit-date snapshot recomputation',
    });
  }
  const policyRaw = await readFile(POLICY_PATH, 'utf8');
  const eventsSourceRaw = daily.eventsCoverage === 'complete' && daily.eventsSource
    ? await readFile(resolve(REPO_ROOT, daily.eventsSource), 'utf8')
    : null;
  const eventsSourceSha256 = eventsSourceRaw ? sha256(eventsSourceRaw) : null;
  const eventsSourceCanonicalSha256 = eventsSourceRaw
    ? sha256(canonicalJson(JSON.parse(eventsSourceRaw)))
    : null;

  const manifest: DailyPublicationManifest = {
    schema: 'zodiacs.daily-publication-manifest.v1',
    date: daily.date,
    snapshotAt: daily.snapshotAt ?? `${daily.date}T12:00:00.000Z`,
    status: 'verified',
    policy: {
      id: DAILY_EDITORIAL_CONSTITUTION.id,
      version: DAILY_EDITORIAL_CONSTITUTION.version,
      sha256: sha256(policyRaw),
    },
    facts: {
      path: 'src/data/daily.json',
      fileSha256: sha256(dailyRaw),
      canonicalSha256: sha256(canonicalJson(daily)),
      factCount: publication.facts.length,
      eventsCoverage: daily.eventsCoverage ?? 'unavailable',
      eventsSource: daily.eventsSource ?? null,
      eventsSourceSha256,
      eventsSourceCanonicalSha256,
      engine: { name: 'astronomy-engine', version: await engineVersion() },
    },
    publication: {
      path: 'src/data/daily-publication.json',
      canonicalSha256: sha256(canonicalJson(publication)),
      signCount: 12,
      outputCount: publication.signs.reduce((count, entry) => count + entry.lines.length + 2, 0),
    },
    generation: {
      mode: publication.generation.mode,
      generatorId: DAILY_RENDERER_VERSION,
      generatorSha256: await generatorSha256(),
      model: publication.generation.model,
      freeformModelOutput: false,
    },
    verification: {
      verifierId: 'zodiacs.daily-verifier.v2',
      verifierSha256: await verifierSha256(),
      // Exact copy reproduction currently reuses the renderer. This is kept
      // false deliberately; only the astronomy implementation is independent.
      independentFromGenerator: false,
      astronomyAudit: {
        implementation: 'zodiacs.daily-fact-audit.v1',
        independentFromSnapshotBuilder: true,
        status: 'passed',
      },
      rendererCheck: {
        kind: 'deterministic-regeneration-and-policy',
        independentImplementation: false,
        status: 'passed',
      },
      deterministicStatus: 'passed',
      aiReview: {
        required: false,
        status: 'not-run',
        reason: 'The edition is reproduced byte-for-byte from versioned local templates; model-authored free text is not publishable.',
      },
    },
    checks: {
      signCount: 12,
      factAudit: 'independent-recomputation-passed',
      exactRender: 'passed',
      distinctness: 'passed',
      voiceAndSafety: 'passed',
    },
    fallback: {
      missingEvents: 'positions-only-with-disclosure',
      factsFailure: 'hold-current-dated-edition',
      staleContentMayBeRelabeled: false,
    },
  };

  return { daily, dailyRaw, publication, manifest, violations };
}

export async function readActualPackage(): Promise<{
  publicationRaw: string;
  publication: DailyPublication;
  manifestRaw: string;
  manifest: DailyPublicationManifest;
}> {
  const [{ raw: publicationRaw, value: publication }, { raw: manifestRaw, value: manifest }] = await Promise.all([
    readJson<DailyPublication>(PUBLICATION_PATH),
    readJson<DailyPublicationManifest>(MANIFEST_PATH),
  ]);
  return { publicationRaw, publication, manifestRaw, manifest };
}
