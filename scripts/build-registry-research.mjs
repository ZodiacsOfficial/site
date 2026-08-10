import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REGISTRY_RESEARCH_LEDGER_SCHEMA,
  buildRegistryResearchLedger,
  canonicalRegistryResearchJson,
  immutableRegistryResearchItem,
  publishRegistryResearch,
  registryResearchSha256,
} from './registry-research-lib.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const paths = {
  daily: resolve(repositoryRoot, 'src/data/daily.json'),
  dailyManifest: resolve(repositoryRoot, 'src/data/daily-publication-manifest.json'),
  outlook: resolve(repositoryRoot, 'public/assets/registry-outlook.json'),
  marketHistory: resolve(repositoryRoot, 'public/assets/data/registry-market-history.v1.json'),
  approvals: resolve(repositoryRoot, 'src/data/registry-research/approval-manifest.json'),
  drafts: resolve(repositoryRoot, 'src/data/registry-research/drafts.json'),
  publication: resolve(repositoryRoot, 'src/data/registry-research/publication.json'),
  publicFeed: resolve(repositoryRoot, 'public/assets/registry-research-feed.json'),
  publicIndex: resolve(repositoryRoot, 'public/assets/data/registry-research/index.json'),
  publicItems: resolve(repositoryRoot, 'public/assets/data/registry-research/items'),
};

async function json(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function optionalJson(path) {
  try {
    await access(path, constants.F_OK);
    return await json(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function monthKeys(startDate, futureDays) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(start.getTime() + (futureDays * 86_400_000));
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const keys = [];
  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function pretty(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeImmutableItem(item) {
  const path = resolve(paths.publicItems, `${item.id}.json`);
  const immutableItem = immutableRegistryResearchItem(item);
  const existing = await optionalJson(path);
  if (existing && canonicalRegistryResearchJson(existing) !== canonicalRegistryResearchJson(immutableItem)) {
    throw new Error(`Refusing to rewrite immutable Registry Research item ${item.id}`);
  }
  if (!existing) await writeFile(path, pretty(immutableItem), 'utf8');
}

async function requireExactJson(path, expected, label) {
  const actual = await optionalJson(path);
  if (!actual || canonicalRegistryResearchJson(actual) !== canonicalRegistryResearchJson(expected)) {
    throw new Error(`${label} is stale; run npm run registry:research:build`);
  }
}

const [dailyRaw, dailyManifest, outlook, marketHistory, approvalManifest, existingLedger] = await Promise.all([
  readFile(paths.daily, 'utf8'),
  json(paths.dailyManifest),
  json(paths.outlook),
  json(paths.marketHistory),
  json(paths.approvals),
  optionalJson(paths.drafts),
]);
const daily = JSON.parse(dailyRaw);

if (dailyManifest.schema !== 'zodiacs.daily-publication-manifest.v2'
  || dailyManifest.status !== 'verified'
  || dailyManifest.date !== daily.date
  || dailyManifest.snapshotAt !== daily.snapshotAt
  || dailyManifest.facts?.fileSha256 !== registryResearchSha256(dailyRaw)) {
  throw new Error('Registry Research requires the exact verified Daily Sky fact artifact and manifest');
}

if (existingLedger && existingLedger.schema !== REGISTRY_RESEARCH_LEDGER_SCHEMA) {
  throw new Error(`Existing Registry Research draft ledger uses unsupported schema ${existingLedger.schema ?? 'unknown'}`);
}

const transitMonths = await Promise.all(
  monthKeys(daily.date, 8).map((month) => json(resolve(repositoryRoot, `src/data/transits-${month}.json`))),
);
const ledger = buildRegistryResearchLedger({
  daily,
  outlook,
  transitMonths,
  marketHistory,
  existingLedger,
  approvalManifest,
});
const { publication, feed } = publishRegistryResearch({ ledger, approvalManifest });

if (checkOnly) {
  await Promise.all([
    requireExactJson(paths.drafts, ledger, 'Registry Research draft ledger'),
    requireExactJson(paths.publication, publication, 'Registry Research publication'),
    requireExactJson(paths.publicFeed, feed, 'Registry Research compact feed'),
    requireExactJson(paths.publicIndex, publication, 'Registry Research public archive index'),
    ...publication.items.map((item) => requireExactJson(
      resolve(paths.publicItems, `${item.id}.json`),
      immutableRegistryResearchItem(item),
      `Registry Research immutable item ${item.id}`,
    )),
  ]);
} else {
  await Promise.all([
    mkdir(dirname(paths.drafts), { recursive: true }),
    mkdir(paths.publicItems, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(paths.drafts, pretty(ledger), 'utf8'),
    writeFile(paths.publication, pretty(publication), 'utf8'),
    writeFile(paths.publicFeed, pretty(feed), 'utf8'),
    writeFile(paths.publicIndex, pretty(publication), 'utf8'),
    ...publication.items.map(writeImmutableItem),
  ]);
}

console.log(`Registry Research ${daily.date}${checkOnly ? ' verified' : ''}`);
console.log(`  ${ledger.items.length} deterministic drafts`);
console.log(`  ${publication.items.length} approved rolling items`);
console.log(`  ${publication.items.filter((item) => item.status === 'scheduled').length} approved scheduled items`);
